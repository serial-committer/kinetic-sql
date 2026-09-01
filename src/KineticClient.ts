import {KineticError} from './utils/KineticError.js';
import type {IDriver} from './drivers/DriverInterface.js';
import {SQLiteDriver} from './drivers/sqlite/SQLiteDriver.js';
import {MysqlDriver} from './drivers/mysql/MySQLDriver.js';
import {PostgresDriver} from './drivers/postgres/PostgresDriver.js';
import type {KineticMiddleware, QueryContext} from "./typings/middleware-interfaces.js";
import type {ITransactionAdapter, TransactionInfo, TransactionOptions} from './typings/transaction-interfaces.js';
import {KineticLogger} from './utils/KineticLogger.js';
import {createTransactionAdapter} from './transactions/adapters/index.js';
import {getActiveTransaction} from './transactions/TransactionContext.js';
import type {MiddlewareRunner} from './transactions/KineticTransaction.js';
import {KineticTransaction} from './transactions/KineticTransaction.js';
import type {TransactionCallback} from './transactions/TransactionManager.js';
import {TransactionManager} from './transactions/TransactionManager.js';
import {registerDefaultClient} from './transactions/registry.js';

/*--- TYPE SYSTEM RE-CONNECTION --*/

/* Global Registry (The "Slot" for the generator) */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Register {
}

/* Base Schema */
export interface KineticSchema {
    tables: Record<string, any>;
    functions: Record<string, { args: any; returns: any }>;
}

/* The Magic Resolver */
export type ResolvedDB = Register extends { schema: infer S } ? S : KineticSchema;

/* The Flexible Config */
export type KineticConfig = |
    { type: 'pg'; debug?: boolean; connectionString: string; poolSize?: number; realtimeEnabled?: boolean }
    |
    {
        type: 'pg'; debug?: boolean; host: string; port: number; user: string; password?: string;
        database: string; ssl?: boolean; poolSize?: number; realtimeEnabled?: boolean
    }
    |
    {
        type: 'mysql'; debug?: boolean; host: string; user: string; password?: string;
        database: string; port?: number; poolSize?: number; realtimeEnabled?: boolean;
    }
    |
    {
        type: 'sqlite'; debug?: boolean; connectionString?: string; filename?: string; options?: any
    };

/* Default the Generic to ResolvedDB */
export class KineticClient<Schema extends KineticSchema = ResolvedDB> {
    private readonly driver: IDriver;
    private middlewares: KineticMiddleware[] = [];
    private readonly logger: KineticLogger;

    /* Built on first use, because it needs a driver that has finished connecting. */
    private txAdapter?: ITransactionAdapter;
    private txManager?: TransactionManager;

    /* Factory defaults to ResolvedDB */
    static async create<S extends KineticSchema = ResolvedDB>(config: KineticConfig): Promise<KineticClient<S>> {
        const client = new KineticClient<S>(config);
        await client.init();

        /* Lets @Transactional() find a client without one being passed in. */
        registerDefaultClient(client);
        return client;
    }

    private constructor(private config: KineticConfig) {
        /* FACTORY LOGIC: Pick the driver based on config */
        if (config.type === 'pg') {
            this.driver = new PostgresDriver(config);
        } else if (config.type === 'mysql') {
            this.driver = new MysqlDriver(config);
        } else if (config.type === 'sqlite') {
            this.driver = new SQLiteDriver(config);
        } else {
            throw new KineticError('CONFIG_ERROR', `Unsupported DB type: ${(config as any).type}`);
        }

        this.logger = new KineticLogger(config.debug, 'Kinetic:Tx');
    }

    private async init() {
        await this.driver.init();
    }

    /* -- MIDDLEWARE REGISTRATION -- */
    public use(middleware: KineticMiddleware): this {
        this.middlewares.push(middleware);
        return this;
    }

    /* -- CENTRAL EXECUTION ENGINE -- */
    private async executeWithMiddleware<T>(
        operation: 'raw' | 'rpc' | 'prepare',
        sqlOrName: string,
        params: any,
        executor: () => Promise<T>
    ): Promise<T> {
        /* Bypass for zero overhead when no plugins are used */
        if (this.middlewares.length === 0) return executor();

        const active = getActiveTransaction();

        const ctx: QueryContext = {
            operation,
            sqlOrName,
            params,
            meta: {},
            startTime: process.hrtime.bigint(),
            txId: active?.id
        };

        try {
            /* Standard for-loop is vastly more performant in V8 than array map/reduce */
            for (let i = 0; i < this.middlewares.length; i++) {
                if (this.middlewares[i].beforeQuery) await this.middlewares[i].beforeQuery!(ctx);
            }

            const result = await executor();

            for (let i = 0; i < this.middlewares.length; i++) {
                if (this.middlewares[i].afterQuery) await this.middlewares[i].afterQuery!(ctx, result);
            }

            return result;
        } catch (error) {
            for (let i = 0; i < this.middlewares.length; i++) {
                if (this.middlewares[i].onError) await this.middlewares[i].onError!(ctx, error as Error);
            }
            throw error;
        }
    }

    /* -- TRANSACTIONS -- */

    /* Set up lazily so a client that never opens a transaction pays nothing for it. */
    private get transactions(): TransactionManager {
        if (!this.txManager) {
            this.txAdapter = createTransactionAdapter(this.config.type, this.driver.native);

            const runner: MiddlewareRunner = (operation, sqlOrName, params, executor) =>
                this.executeWithMiddleware(operation, sqlOrName, params, executor);

            this.txManager = new TransactionManager(
                this.txAdapter,
                this.driver,
                runner,
                {
                    begin: info => this.notify('onTransactionBegin', info),
                    commit: info => this.notify('onTransactionCommit', info),
                    rollback: (info, error) => this.notify('onTransactionRollback', info, error)
                },
                this.logger
            );
        }
        return this.txManager;
    }

    private async notify(
        hook: 'onTransactionBegin' | 'onTransactionCommit' | 'onTransactionRollback',
        info: TransactionInfo,
        error?: Error
    ): Promise<void> {
        for (let i = 0; i < this.middlewares.length; i++) {
            const handler = this.middlewares[i][hook];
            if (handler) await handler(info, error as any);
        }
    }

    /**
     * Runs a block inside a transaction. It commits when the block returns and
     * rolls back when it throws. Queries issued anywhere inside the block join
     * it automatically, so the handle does not have to be passed around.
     */
    transaction<T>(callback: TransactionCallback<T>): Promise<T>;
    transaction<T>(options: TransactionOptions, callback: TransactionCallback<T>): Promise<T>;
    transaction<T>(
        optionsOrCallback: TransactionOptions | TransactionCallback<T>,
        maybeCallback?: TransactionCallback<T>
    ): Promise<T> {
        const isCallbackFirst = typeof optionsOrCallback === 'function';
        const options = isCallbackFirst ? {} : optionsOrCallback;
        const callback = isCallbackFirst ? optionsOrCallback : maybeCallback;

        if (!callback) {
            return Promise.reject(
                new KineticError('TRANSACTION_ERROR', 'transaction() was called without a block to run.')
            );
        }

        return this.transactions.run(options, callback);
    }

    /**
     * Opens a transaction the caller has to finish themselves.
     * Prefer transaction() unless the boundary cannot fit in a single block.
     */
    async beginTransaction(options: TransactionOptions = {}): Promise<KineticTransaction> {
        return this.transactions.begin(options);
    }

    /* -- PROXY METHODS -- */
    async rpc<FnName extends keyof Schema['functions'] & string>(
        functionName: FnName,
        params: Schema['functions'][FnName]['args']
    ) {
        return this.executeWithMiddleware('rpc', functionName, params, async () => {
            const active = getActiveTransaction();
            if (!active) return this.driver.rpc(functionName, params);

            try {
                const {sql, values} = this.transactions.adapter.buildRpc(functionName, params);
                const data = await active.conn.raw(sql, values);
                return {data, error: null};
            } catch (err) {
                /* A swallowed RPC error must not leave the transaction able to commit. */
                active.rollbackOnly = true;
                return {
                    data: null,
                    error: new KineticError('RPC_ERROR', `Failed to execute function: ${functionName}`, err)
                };
            }
        });
    }

    async subscribe<TableName extends keyof Schema['tables'] & string>(
        tableName: TableName,
        callback: (payload: { action: 'INSERT' | 'UPDATE' | 'DELETE', data: Schema['tables'][TableName] }) => void
    ) {
        return this.driver.subscribe(tableName, callback);
    }

    async raw(sql: string, params?: any[]) {
        return this.executeWithMiddleware('raw', sql, params, () => {
            const active = getActiveTransaction();
            return active ? active.conn.raw(sql, params) : this.driver.raw(sql, params);
        });
    }

    prepare(sql: string) {
        const preparedNode = this.driver.prepare(sql);

        return {
            execute: async (params?: any[]) => {
                return this.executeWithMiddleware('prepare', sql, params, () => {
                    /* Inside a transaction the statement has to run on the pinned connection. */
                    const active = getActiveTransaction();
                    return active ? active.conn.raw(sql, params) : preparedNode.execute(params);
                });
            }
        };
    }

    public get native() {
        return this.driver.native;
    }

    /* Closes the pool and stops any realtime watchers. */
    public async end(): Promise<void> {
        await this.driver.end();
    }

}

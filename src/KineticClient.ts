import {KineticError} from './utils/KineticError.js';
import type {IDriver} from './drivers/DriverInterface.js';
import {SQLiteDriver} from './drivers/sqlite/SQLiteDriver.js';
import {MysqlDriver} from './drivers/mysql/MySQLDriver.js';
import {PostgresDriver} from './drivers/postgres/PostgresDriver.js';
import type {KineticMiddleware, QueryContext} from "./typings/middleware-interfaces.js";

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

    /* Factory defaults to ResolvedDB */
    static async create<S extends KineticSchema = ResolvedDB>(config: KineticConfig): Promise<KineticClient<S>> {
        const client = new KineticClient<S>(config);
        await client.init();
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

        const ctx: QueryContext = {
            operation,
            sqlOrName,
            params,
            meta: {},
            startTime: process.hrtime.bigint()
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

    /* -- PROXY METHODS -- */
    async rpc<FnName extends keyof Schema['functions'] & string>(
        functionName: FnName,
        params: Schema['functions'][FnName]['args']
    ) {
        return this.executeWithMiddleware('rpc', functionName, params, () =>
            this.driver.rpc(functionName, params)
        );
    }

    async subscribe<TableName extends keyof Schema['tables'] & string>(
        tableName: TableName,
        callback: (payload: { action: 'INSERT' | 'UPDATE' | 'DELETE', data: Schema['tables'][TableName] }) => void
    ) {
        return this.driver.subscribe(tableName, callback);
    }

    async raw(sql: string, params?: any[]) {
        return this.executeWithMiddleware('raw', sql, params, () =>
            this.driver.raw(sql, params)
        );
    }

    prepare(sql: string) {
        const preparedNode = this.driver.prepare(sql);

        return {
            execute: async (params?: any[]) => {
                return this.executeWithMiddleware('prepare', sql, params, () =>
                    preparedNode.execute(params)
                );
            }
        };
    }

    public get native() {
        return this.driver.native;
    }

}

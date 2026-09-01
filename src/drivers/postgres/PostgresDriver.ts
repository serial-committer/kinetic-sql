import postgres from 'postgres';
import type {IDriver} from '../DriverInterface.js';
import {KineticError} from '../../utils/KineticError.js';
import {BROADCAST_FUNC_SQL, createTriggerSql} from './adapter.js';
import {KineticLogger} from "../../utils/KineticLogger.js";

export class PostgresDriver implements IDriver {
    private logger: KineticLogger;
    public sql: postgres.Sql;
    private readonly config: any;
    public realtimeEnabled: boolean;

    /**
     * Every subscription shares one listening connection.
     * Listeners block their connection, so opening one per table would burn
     * a pooled connection for each table being watched.
     */
    private subscribers: Map<string, ((payload: any) => void)[]> = new Map();
    private listener: postgres.Sql | null = null;
    private listenerSetup: Promise<void> | null = null;

    constructor(config: any) {
        this.config = config;
        this.realtimeEnabled = config.realtimeEnabled || false;

        /* Initializing Main Connection Pool */
        if (typeof config.connectionString === 'string') {
            this.sql = postgres(config.connectionString, {max: config.poolSize || 10});
        } else {
            /* Removing 'type' and internal flags before passing to postgres.js to avoid "unknown option" warnings */
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {type, realtimeEnabled, poolSize, ...pgOptions} = config;
            this.sql = postgres({ ...pgOptions, max: poolSize || 10 });
        }
        this.logger = new KineticLogger(config.debug, 'Kinetic:Postgres');
    }

    public async raw(sql: string, params: any[] = []): Promise<any> {
        try {
            return await this.sql.unsafe(sql, params);
        } catch (err: any) {
            this.logger.error(`Raw query failed: ${sql}`, err);
            throw new KineticError('QUERY_FAILED', 'Failed to execute raw Postgres query', err);
        }
    }

    public prepare(sql: string) {
        return {
            execute: async (params: any[] = []) => {
                try {
                    return await this.sql.unsafe(sql, params);
                } catch (err: any) {
                    this.logger.error(`Prepared query failed: ${sql}`, err);
                    throw new KineticError('QUERY_FAILED', 'Failed to execute prepared Postgres query', err);
                }
            }
        };
    }

    public get native(): any {
        return this.sql
    }

    async init() {
        if (this.realtimeEnabled) {
            try {
                await this.sql.unsafe(BROADCAST_FUNC_SQL);
                this.logger.info('Setup for realtime Broadcast of changes ready 🔔');
            } catch (e) {
                this.logger.warn('⚠️ Kinetic Driver: Failed to install generic broadcast function.', e);
            }
        }
    }

    /**
     * RPC EXECUTION
     * Note: No generics here. The wrapper ensures types are correct before calling this.
     */
    async rpc(
        functionName: string,
        params: Record<string, any>
    ): Promise<{ data: any; error: any }> {
        try {
            const args = Object.values(params || {});

            /* Dynamic Parameter Mapping: function(param1 := $1, param2 := $2) */
            const paramKeys = Object.keys(params || {});
            const paramStr = paramKeys.map((k, i) => `${k} := $${i + 1}`).join(', ');
            const query = `SELECT * FROM "${functionName}"(${paramStr})`;
            const result = await this.sql.unsafe(query, args);

            this.logger.info(`Calling RPC: ${functionName} with params: (${paramStr})`);

            return {data: result, error: null};
        } catch (err) {
            return {
                data: null,
                error: new KineticError('RPC_ERROR', `Failed to execute function: ${functionName}`, err)
            };
        }
    }

    /**
     * DEDICATED LISTENING CONNECTION
     * Cloned from the config but forced to max: 1, because a listener blocks
     * whichever connection it runs on.
     */
    private createListenerConnection(): postgres.Sql {
        if (typeof this.config.connectionString === 'string') {
            return postgres(this.config.connectionString, {max: 1});
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {type, realtimeEnabled, poolSize, ...pgOptions} = this.config;
        return postgres({...pgOptions, max: 1});
    }

    /* Opens the shared listener once, and hands every later caller the same setup. */
    private ensureListener(): Promise<void> {
        if (this.listenerSetup) return this.listenerSetup;

        this.listenerSetup = (async () => {
            const listener = this.createListenerConnection();
            this.listener = listener;

            await listener.listen('table_events', (payload) => {
                let event: any;

                try {
                    event = JSON.parse(payload);
                } catch (err) {
                    this.logger.error('Received a realtime payload that was not valid JSON', err);
                    return;
                }

                const callbacks = this.subscribers.get(event.table);
                if (!callbacks || callbacks.length === 0) return;

                /* A throwing listener must not stop the others being notified */
                for (const callback of callbacks) {
                    try {
                        callback(event);
                    } catch (err) {
                        this.logger.error(`A subscriber for ${event.table} threw`, err);
                    }
                }
            });
        })();

        /* A failed setup must not be cached, or every later subscribe would reuse it. */
        this.listenerSetup.catch(() => {
            this.listenerSetup = null;
            this.listener = null;
        });

        return this.listenerSetup;
    }

    private async closeListener(): Promise<void> {
        const listener = this.listener;
        this.listener = null;
        this.listenerSetup = null;

        if (listener) await listener.end();
    }

    /**
     * REALTIME SUBSCRIPTIONS
     */
    async subscribe(
        tableName: string,
        callback: (payload: any) => void
    ): Promise<{ unsubscribe: () => void }> {
        if (!this.realtimeEnabled) {
            this.logger.error(`Cannot add table ${tableName} to realtime subscriptions. Set { realtimeEnabled: true } in config. ❌`);
            throw new KineticError('CONFIG_ERROR', "Realtime is disabled in config.");
        }

        /* Ensure the specific table trigger exists */
        try {
            await this.sql.unsafe(createTriggerSql(tableName));
            this.logger.info(`Table: ${tableName} configured for broadcasting changes in realtime 🔔`);
        } catch (err) {
            this.logger.error(`Failed to attach trigger to ${tableName}`, err);
        }

        /* Awaited, so events fired right after this resolves are not missed. */
        await this.ensureListener();

        const callbacks = this.subscribers.get(tableName) ?? [];
        callbacks.push(callback);
        this.subscribers.set(tableName, callbacks);

        return {
            unsubscribe: async () => {
                const list = this.subscribers.get(tableName);
                if (list) {
                    const index = list.indexOf(callback);
                    if (index > -1) list.splice(index, 1);
                    if (list.length === 0) this.subscribers.delete(tableName);
                }

                /* Nobody left watching, so the connection can go back. */
                if (this.subscribers.size === 0) await this.closeListener();
            }
        };
    }

    async end() {
        await this.closeListener();
        await this.sql.end();
    }
}

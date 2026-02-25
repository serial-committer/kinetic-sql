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

    constructor(config: any) {
        this.config = config;
        this.realtimeEnabled = config.realtimeEnabled || false;

        /* Initializing Main Connection Pool */
        if (typeof config.connectionString === 'string') {
            this.sql = postgres(config.connectionString, {max: config.poolSize || 10});
        } else {
            /* Removing 'type' and internal flags before passing to postgres.js to avoid "unknown option" warnings */
            const {type, realtimeEnabled, poolSize, ...pgOptions} = config;
            this.sql = postgres({ ...pgOptions, max: poolSize || 10 });
        }
        this.logger = new KineticLogger(config.debug, 'Kinetic:Postgres');
    }

    get raw(): any {
        return this.sql;
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

        /**
         * Create a DEDICATED connection for listening
         * Clone the config but force max: 1 because listeners block the connection
         */
        let listener: postgres.Sql;

        if (typeof this.config.connectionString === 'string') {
            listener = postgres(this.config.connectionString, {max: 1});
        } else {
            const {type, realtimeEnabled, poolSize, ...pgOptions} = this.config;
            listener = postgres({
                ...pgOptions,
                max: 1
            });
        }

        /**
         * Start Listening
         * Don't await this - .listen() keeps the promise open forever. Start and return the unsubscribed handle
         */
        listener.listen('table_events', (payload) => {
            const event = JSON.parse(payload);
            /* Client-side filtering */
            if (event.table === tableName) {
                callback(event);
            }
        }).catch(err => this.logger.error("Listener error:", err));

        return {
            unsubscribe: async () => {
                await listener.end();
            }
        };
    }

    async end() {
        await this.sql.end();
    }
}

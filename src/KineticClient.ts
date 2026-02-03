import {drizzle, PostgresJsDatabase} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {BROADCAST_FUNC_SQL, createTriggerSql} from './internal/sql-templates.js';

/* 1. Global Registry (The "Slot" for the generator to fill) */
export interface Register {
}

/* 2. Base Schema Shape */
export type KineticSchema = {
    tables: Record<string, any>;
    functions: Record<string, { args: any; returns: any }>;
};

/* 3. The Magic Type Resolver
   Did the user generate types?
   Yes -> Use them.
   No  -> Fallback to generic KineticSchema.
*/
export type ResolvedDB = Register extends { schema: infer S }
    ? S
    : KineticSchema;

export interface KineticConfig {
    connectionString: string;
    realtimeEnabled?: boolean;
    poolSize?: number;
}

/* 4. The Class: Default Schema is 'ResolvedDB */
export class KineticClient<Schema extends KineticSchema = ResolvedDB> {
    private readonly sql: postgres.Sql;
    public orm: PostgresJsDatabase;
    private config: KineticConfig;

    /* Factory defaults to ResolvedDB so the user gets types automatically */
    static async create<S extends KineticSchema = ResolvedDB>(config: KineticConfig): Promise<KineticClient<S>> {
        const client = new KineticClient<S>(config);
        if (config.realtimeEnabled) {
            await client.initializeRealtimeSystem();
        }
        return client;
    }

    private constructor(config: KineticConfig) {
        this.config = config;
        this.sql = postgres(config.connectionString, {max: config.poolSize || 10});
        this.orm = drizzle(this.sql);
    }

    private async initializeRealtimeSystem() {
        try {
            await this.sql.unsafe(BROADCAST_FUNC_SQL);
        } catch (err) {
            console.warn('⚠️ Kinetic SQL: Failed to install Realtime system.', err);
        }
    }

    /**
     * RPC WRAPPER
     */
    async rpc<FnName extends keyof Schema['functions'] & string>(
        functionName: FnName,
        params: Schema['functions'][FnName]['args']
    ): Promise<{ data: Schema['functions'][FnName]['returns'] | null; error: any }> {
        try {
            const args = Object.values(params as object || {});
            const paramKeys = Object.keys(params as object || {});
            const paramStr = paramKeys.map((k, i) => `${k} := $${i + 1}`).join(', ');

            const query = `SELECT * FROM "${functionName}"(${paramStr})`;
            const result = await this.sql.unsafe(query, args as any[]);

            /* Handle void returns or single rows vs arrays */
            return {data: result as any, error: null};
        } catch (err) {
            return {data: null, error: err};
        }
    }

    /**
     * REALTIME SUBSCRIPTIONS
     */
    async subscribe<TableName extends keyof Schema['tables'] & string>(
        tableName: TableName,
        callback: (payload: { action: 'INSERT' | 'UPDATE' | 'DELETE', data: Schema['tables'][TableName] }) => void
    ) {
        if (!this.config.realtimeEnabled) throw new Error("Realtime disabled");

        try {
            await this.sql.unsafe(createTriggerSql(tableName));
        } catch (err) {
            console.error(`Failed to attach trigger to ${tableName}`, err);
        }

        const listener = postgres(this.config.connectionString, {max: 1});

        await listener.listen('table_events', (payload) => {
            const event = JSON.parse(payload);
            if (event.table === tableName) {
                callback(event);
            }
        });

        return {unsubscribe: () => listener.end()};
    }

    async end() {
        await this.sql.end();
    }
}

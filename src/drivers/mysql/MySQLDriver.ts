import mysql from 'mysql2/promise';
import MySQLEvents from '@rodrigogs/mysql-events';
import type {IDriver} from '../DriverInterface.js';
import {KineticError} from '../../utils/KineticError.js';
import {KineticLogger} from "../../utils/KineticLogger.js";

export class MysqlDriver implements IDriver {
    private logger: KineticLogger;
    private readonly pool: mysql.Pool;
    private instance: MySQLEvents | null = null;
    private subscribers: Map<string, (data: any) => void> = new Map();
    private config: any;

    constructor(config: any) {
        this.config = config;
        this.pool = mysql.createPool({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            port: config.port || 3306,
            waitForConnections: true,
            connectionLimit: config.poolSize || 10,
            queueLimit: 0
        });
        this.logger = new KineticLogger(config.debug, 'Kinetic:MySQL');
    }

    async raw(sql: string, params: any[] = []): Promise<any> {
        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (err: any) {
            this.logger.error(`Raw query failed: ${sql}`, err);
            throw new KineticError('QUERY_FAILED', 'Failed to execute raw MySQL query', err);
        }
    }

    public prepare(sql: string) {
        return {
            execute: async (params: any[] = []) => {
                try {
                    const [rows] = await this.pool.execute(sql, params);
                    return rows;
                } catch (err: any) {
                    this.logger.error(`Prepared query failed: ${sql}`, err);
                    throw new Error(`Failed to execute prepared MySQL query: ${err.message}`);
                }
            }
        };
    }

    get native(): any {
        return this.pool;
    }

    async init() {
        /* Only start Binlog watcher if explicitly enabled */
        if (!this.config.realtimeEnabled) {
            return;
        }

        const dsn = {
            host: this.config.host,
            user: this.config.user,
            password: this.config.password,
            port: this.config.port || 3306,
        };

        this.instance = new MySQLEvents(dsn, {
            startAtEnd: true,
            excludedSchemas: {
                mysql: true,
                sys: true,
                information_schema: true,
                performance_schema: true
            }
        });

        await this.instance.start();

        /* We listen to everything (`*`) within this DB */
        /* MySQL Binlog sends us the whole stream (Filtering in JS is faster than restarting the watcher) */
        this.instance.addTrigger({
            name: 'KINETIC_EVENTS',
            expression: '*',
            statement: MySQLEvents.STATEMENTS.ALL,
            onEvent: (event: any) => {
                /* Security: Ensure the event belongs to the database */
                if (event.schema !== this.config.database) return;

                /* Route to subscriber*/
                if (this.subscribers.has(event.table)) {
                    const callback = this.subscribers.get(event.table);
                    if (callback) {
                        event.rows.forEach((row: any) => {
                            callback({action: event.type, data: row});
                        });
                    }
                }
            }
        });

        this.logger.info('Setup for realtime Broadcast of changes ready 🔔');
        this.instance.on('error', (err: any) => this.logger.error('MySQL Realtime Error:', err));
    }

    async subscribe(tableName: string, callback: (payload: any) => void): Promise<{ unsubscribe: () => void }> {
        if (!this.config.realtimeEnabled) {
            this.logger.error(`Cannot add table ${tableName} to realtime subscriptions. Set { realtimeEnabled: true } in config. ❌`);
            throw new KineticError('CONFIG_ERROR', 'Realtime is disabled. Set { realtimeEnabled: true } in config.');
        }

        this.subscribers.set(tableName, callback);
        this.logger.info(`Table: ${tableName} configured for broadcasting changes in realtime 🔔`);
        return {
            unsubscribe: () => {
                this.subscribers.delete(tableName);
            }
        };
    }

    async rpc(functionName: string, params: Record<string, any>): Promise<{ data: any; error: any }> {
        try {
            const args = Object.values(params || {});
            const placeholders = args.map(() => '?').join(', ');
            const [rows] = await this.pool.execute(`CALL ${functionName}(${placeholders})`, args);

            this.logger.info(`Calling RPC: ${functionName}(${args.join(', ')})`);

            return {data: rows, error: null};
        } catch (err) {
            return {data: null, error: new KineticError('RPC_ERROR', `MySQL RPC Failed: ${functionName}`, err)};
        }
    }

    async end() {
        if (this.instance) await this.instance.stop();
        await this.pool.end();
    }
}

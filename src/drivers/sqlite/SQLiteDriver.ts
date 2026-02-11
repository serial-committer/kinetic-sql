import Database from 'better-sqlite3';
import type {IDriver} from '../DriverInterface.js';

export class SQLiteDriver implements IDriver {
    public db: Database.Database;
    private subscribers: Map<string, Function[]> = new Map();

    constructor(config: any) {
        /* 1. Handle Connection String (sqlite://file.db) or Config Object */
        let filename = ':memory:';
        if (typeof config.connectionString === 'string') {
            filename = config.connectionString.replace(/^sqlite:\/\//, '');
        } else if (config.filename) {
            filename = config.filename;
        }

        this.db = new Database(filename, config.options || {});
    }

    get raw(): any {
        return this.db;
    }

    async init() {
        /**
         * 2. REGISTER THE BRIDGE
         * This allows SQL Triggers to call back into our Node.js process.
         */
        this.db.function('kinetic_bridge', (table: string, action: string, rowid: number | bigint) => {
            this.handleEvent(table, action, rowid);
        });
    }

    /**
     * 3. INTERNAL EVENT HANDLER
     * Fetches the full row data to mimic Postgres "payload" behavior.
     */
    private handleEvent(table: string, action: string, rowid: number | bigint) {
        const cbs = this.subscribers.get(table);
        if (!cbs || cbs.length === 0) return;

        try {
            /* For DELETE, the row is gone, so data is null. */
            if (action === 'DELETE') {
                const payload = {action, data: {rowid}};
                cbs.forEach(cb => cb(payload));
                return;
            }

            /* In case of INSERT/UPDATE, we fetch the fresh row */
            setImmediate(() => {
                try {
                    const row = this.db.prepare(`SELECT * FROM ${table} WHERE rowid = ?`).get(rowid);
                    /* If a row was found (it wasn't deleted immediately after), emit it */
                    if (row) {
                        const payload = {action, data: row};
                        cbs.forEach(cb => cb(payload));
                    }
                } catch (err) {
                    console.error(`⚠️ Kinetic SQLite: Async fetch failed for ${table}`, err);
                }
            });
        } catch (err) {
            console.error(`⚠️ Kinetic SQLite: Failed to bridge event for ${table}`, err);
        }
    }

    /**
     * 4. REALTIME SUBSCRIPTION
     * Dynamically attaches triggers to the requested table.
     */
    async subscribe(table: string, cb: (data: any) => void): Promise<{ unsubscribe: () => void }> {
        if (!this.subscribers.has(table)) {
            this.subscribers.set(table, []);
            this.attachTriggers(table);
        }
        this.subscribers.get(table)!.push(cb);

        return {
            unsubscribe: () => {
                const list = this.subscribers.get(table);
                if (list) {
                    const idx = list.indexOf(cb);
                    if (idx > -1) list.splice(idx, 1);
                }
            }
        };
    }

    private attachTriggers(table: string) {
        try {
            /* SQLite triggers: Capture the exact moment a change happens */
            this.db.exec(`
                CREATE TRIGGER IF NOT EXISTS kinetic_${table}_insert AFTER INSERT ON ${table}
                BEGIN
                    SELECT kinetic_bridge('${table}', 'INSERT', NEW.rowid);
                END;
                
                CREATE TRIGGER IF NOT EXISTS kinetic_${table}_update AFTER UPDATE ON ${table}
                BEGIN
                    SELECT kinetic_bridge('${table}', 'UPDATE', NEW.rowid);
                END;

                CREATE TRIGGER IF NOT EXISTS kinetic_${table}_delete AFTER DELETE ON ${table}
                BEGIN
                    SELECT kinetic_bridge('${table}', 'DELETE', OLD.rowid);
                END;
            `);
        } catch (err) {
            console.warn(`⚠️ Kinetic SQLite: Could not attach triggers to ${table}. Ensure table exists.`, err);
        }
    }

    /**
     * 5. RPC (Stored Procedures)
     * Maps to a User Defined Function (UDF) call: SELECT funcName(?, ?)
     */
    async rpc(name: string, params: any): Promise<{ data: any; error: any }> {
        try {
            const keys = Object.keys(params || {});
            const placeholders = keys.map(() => '?').join(',');
            const values = Object.values(params || {});

            /* Executes: SELECT my_function(?, ?) */
            const stmt = this.db.prepare(`SELECT ${name}(${placeholders})`);

            /* Using  use .all() to be safe, though UDFs usually return scalars */
            const result = stmt.all(...values);

            return {data: result, error: null};
        } catch (err) {
            return {data: null, error: err};
        }
    }

    async end() {
        this.db.close();
    }
}

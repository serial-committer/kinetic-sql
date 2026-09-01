import Database from 'better-sqlite3';
import type {IPinnedConnection, ITransactionAdapter} from '../../typings/transaction-interfaces.js';
import {Isolation, RETRYABLE_CODES} from '../constants.js';
import {KineticError} from '../../utils/KineticError.js';
import {AsyncMutex, matchesRetryableCode, sanitizeIdentifier} from './shared.js';

/* Handles that cannot be reopened by a second connection. */
const UNSHAREABLE = [':memory:', ''];

/* Milliseconds a second handle waits on a write lock before giving up. */
const BUSY_TIMEOUT_MS = 5000;

class SQLitePinnedConnection implements IPinnedConnection {
    private readOnlyApplied = false;

    constructor(
        public readonly id: string,
        private readonly db: Database.Database,
        private readonly releaseLock: () => void,
        /* Standalone handles are opened for one transaction and closed after it. */
        private readonly ownsHandle: boolean
    ) {
    }

    public get native(): any {
        return this.db;
    }

    async begin(options: { isolation?: Isolation; readOnly?: boolean; timeout?: number }): Promise<void> {
        if (options.readOnly) {
            this.db.pragma('query_only = 1');
            this.readOnlyApplied = true;
        }

        /* IMMEDIATE takes the write lock up front rather than risking an upgrade mid-block. */
        this.db.exec(options.readOnly ? 'BEGIN DEFERRED' : 'BEGIN IMMEDIATE');
    }

    async commit(): Promise<void> {
        if (this.db.inTransaction) this.db.exec('COMMIT');
    }

    async rollback(): Promise<void> {
        if (this.db.inTransaction) this.db.exec('ROLLBACK');
    }

    async savepoint(name: string): Promise<void> {
        this.db.exec(`SAVEPOINT ${sanitizeIdentifier(name)}`);
    }

    async rollbackToSavepoint(name: string): Promise<void> {
        this.db.exec(`ROLLBACK TO ${sanitizeIdentifier(name)}`);
    }

    async releaseSavepoint(name: string): Promise<void> {
        this.db.exec(`RELEASE ${sanitizeIdentifier(name)}`);
    }

    async raw(sql: string, params: any[] = []): Promise<any> {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.reader ? stmt.all(...params) : stmt.run(...params);
        } catch (err) {
            throw new KineticError('QUERY_FAILED', 'Failed to execute SQLite query in a transaction', err);
        }
    }

    async release(): Promise<void> {
        try {
            if (this.readOnlyApplied) this.db.pragma('query_only = 0');
            if (this.ownsHandle) this.db.close();
        } finally {
            this.releaseLock();
        }
    }
}

export class SQLiteTxAdapter implements ITransactionAdapter {
    public readonly dialect = 'sqlite' as const;

    /**
     * better-sqlite3 exposes one synchronous handle, so overlapping transactions
     * would interleave their statements. They are queued instead.
     */
    private readonly mutex = new AsyncMutex();

    constructor(private readonly db: Database.Database) {
    }

    async acquire(): Promise<IPinnedConnection> {
        const releaseLock = await this.mutex.acquire();
        return new SQLitePinnedConnection(`sqlite_${Date.now().toString(36)}`, this.db, releaseLock, false);
    }

    /**
     * Opens a second handle to the same file, which is the only way to run a
     * transaction that is genuinely independent of the one already open.
     */
    async acquireIndependent(): Promise<IPinnedConnection> {
        const filename = this.db.name;

        if (UNSHAREABLE.includes(filename)) {
            throw new KineticError(
                'TRANSACTION_ERROR',
                'REQUIRES_NEW needs a second connection, which an in-memory SQLite database cannot provide. ' +
                'Use a file-backed database, or switch this block to NESTED for savepoint isolation.'
            );
        }

        const handle = new Database(filename);
        handle.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);

        /* A private handle needs no queueing, so the lock is a no-op. */
        return new SQLitePinnedConnection(`sqlite_new_${Date.now().toString(36)}`, handle, () => {
        }, true);
    }

    buildRpc(name: string, params: Record<string, any>): { sql: string; values: any[] } {
        const values = Object.values(params || {});
        const placeholders = values.map(() => '?').join(', ');

        return {sql: `SELECT ${name}(${placeholders})`, values};
    }

    isRetryable(error: any): boolean {
        return matchesRetryableCode(error, RETRYABLE_CODES.sqlite);
    }
}

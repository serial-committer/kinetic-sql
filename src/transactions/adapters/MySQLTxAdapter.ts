import type {IPinnedConnection, ITransactionAdapter} from '../../typings/transaction-interfaces.js';
import {Isolation, RETRYABLE_CODES} from '../constants.js';
import {KineticError} from '../../utils/KineticError.js';
import {matchesRetryableCode, sanitizeIdentifier} from './shared.js';

/* Minimal shape of a mysql2 pooled connection. */
interface PoolConnection {
    query(sql: string, params?: any[]): Promise<any>;

    execute(sql: string, params?: any[]): Promise<any>;

    release(): void;
}

class MySQLPinnedConnection implements IPinnedConnection {
    /* Session variables must be undone before the connection returns to the pool. */
    private timeoutApplied = false;

    constructor(
        public readonly id: string,
        private readonly conn: PoolConnection
    ) {
    }

    public get native(): any {
        return this.conn;
    }

    async begin(options: { isolation?: Isolation; readOnly?: boolean; timeout?: number }): Promise<void> {
        /* Applies to the next transaction only, so it has to come first. */
        if (options.isolation && options.isolation !== Isolation.DEFAULT) {
            await this.conn.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolation}`);
        }

        if (options.timeout && options.timeout > 0) {
            await this.conn.query(`SET SESSION max_execution_time = ${Number(options.timeout)}`);
            this.timeoutApplied = true;
        }

        await this.conn.query(`START TRANSACTION${options.readOnly ? ' READ ONLY' : ''}`);
    }

    async commit(): Promise<void> {
        await this.conn.query('COMMIT');
    }

    async rollback(): Promise<void> {
        await this.conn.query('ROLLBACK');
    }

    async savepoint(name: string): Promise<void> {
        await this.conn.query(`SAVEPOINT ${sanitizeIdentifier(name)}`);
    }

    async rollbackToSavepoint(name: string): Promise<void> {
        await this.conn.query(`ROLLBACK TO SAVEPOINT ${sanitizeIdentifier(name)}`);
    }

    async releaseSavepoint(name: string): Promise<void> {
        await this.conn.query(`RELEASE SAVEPOINT ${sanitizeIdentifier(name)}`);
    }

    async raw(sql: string, params: any[] = []): Promise<any> {
        try {
            const [rows] = await this.conn.execute(sql, params);
            return rows;
        } catch (err) {
            throw new KineticError('QUERY_FAILED', 'Failed to execute MySQL query in a transaction', err);
        }
    }

    async release(): Promise<void> {
        if (this.timeoutApplied) {
            /* Left in place, this would follow the connection to its next user. */
            try {
                await this.conn.query('SET SESSION max_execution_time = 0');
            } catch {
                /* A dead connection is being discarded anyway. */
            }
        }
        this.conn.release();
    }
}

export class MySQLTxAdapter implements ITransactionAdapter {
    public readonly dialect = 'mysql' as const;

    constructor(private readonly pool: any) {
    }

    async acquire(): Promise<IPinnedConnection> {
        const conn = await this.pool.getConnection();
        return new MySQLPinnedConnection(`mysql_${Date.now().toString(36)}`, conn);
    }

    /* Each pooled connection carries its own session, so this is independent. */
    async acquireIndependent(): Promise<IPinnedConnection> {
        return this.acquire();
    }

    buildRpc(name: string, params: Record<string, any>): { sql: string; values: any[] } {
        const values = Object.values(params || {});
        const placeholders = values.map(() => '?').join(', ');

        return {sql: `CALL ${name}(${placeholders})`, values};
    }

    isRetryable(error: any): boolean {
        return matchesRetryableCode(error, RETRYABLE_CODES.mysql);
    }
}

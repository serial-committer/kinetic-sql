import type {IPinnedConnection, ITransactionAdapter} from '../../typings/transaction-interfaces.js';
import {Isolation} from '../constants.js';
import {RETRYABLE_CODES} from '../constants.js';
import {KineticError} from '../../utils/KineticError.js';
import {matchesRetryableCode, sanitizeIdentifier} from './shared.js';

/* Minimal shape of a reserved postgres.js connection. */
interface ReservedSql {
    unsafe(sql: string, params?: any[]): Promise<any>;

    release(): void;
}

class PostgresPinnedConnection implements IPinnedConnection {
    constructor(
        public readonly id: string,
        private readonly reserved: ReservedSql
    ) {
    }

    public get native(): any {
        return this.reserved;
    }

    async begin(options: { isolation?: Isolation; readOnly?: boolean; timeout?: number }): Promise<void> {
        const modes: string[] = [];

        if (options.isolation && options.isolation !== Isolation.DEFAULT) {
            modes.push(`ISOLATION LEVEL ${options.isolation}`);
        }
        if (options.readOnly) modes.push('READ ONLY');

        await this.reserved.unsafe(`BEGIN${modes.length ? ' ' + modes.join(' ') : ''}`);

        /* Server-side cap so a stalled statement cannot outlive the block. */
        if (options.timeout && options.timeout > 0) {
            await this.reserved.unsafe(`SET LOCAL statement_timeout = ${Number(options.timeout)}`);
        }
    }

    async commit(): Promise<void> {
        await this.reserved.unsafe('COMMIT');
    }

    async rollback(): Promise<void> {
        await this.reserved.unsafe('ROLLBACK');
    }

    async savepoint(name: string): Promise<void> {
        await this.reserved.unsafe(`SAVEPOINT ${sanitizeIdentifier(name)}`);
    }

    async rollbackToSavepoint(name: string): Promise<void> {
        await this.reserved.unsafe(`ROLLBACK TO SAVEPOINT ${sanitizeIdentifier(name)}`);
    }

    async releaseSavepoint(name: string): Promise<void> {
        await this.reserved.unsafe(`RELEASE SAVEPOINT ${sanitizeIdentifier(name)}`);
    }

    async raw(sql: string, params: any[] = []): Promise<any> {
        try {
            return await this.reserved.unsafe(sql, params);
        } catch (err) {
            throw new KineticError('QUERY_FAILED', 'Failed to execute Postgres query in a transaction', err);
        }
    }

    async release(): Promise<void> {
        this.reserved.release();
    }
}

export class PostgresTxAdapter implements ITransactionAdapter {
    public readonly dialect = 'pg' as const;

    constructor(private readonly sql: any) {
    }

    async acquire(): Promise<IPinnedConnection> {
        if (typeof this.sql.reserve !== 'function') {
            throw new KineticError(
                'TRANSACTION_ERROR',
                'Transactions need postgres@3.4 or newer for connection reservation.'
            );
        }

        const reserved = await this.sql.reserve();
        return new PostgresPinnedConnection(`pg_${Date.now().toString(36)}`, reserved);
    }

    /* A second reservation from the same pool is already fully independent. */
    async acquireIndependent(): Promise<IPinnedConnection> {
        return this.acquire();
    }

    buildRpc(name: string, params: Record<string, any>): { sql: string; values: any[] } {
        const keys = Object.keys(params || {});
        const values = Object.values(params || {});
        const args = keys.map((key, index) => `${key} := $${index + 1}`).join(', ');

        return {sql: `SELECT * FROM "${name}"(${args})`, values};
    }

    isRetryable(error: any): boolean {
        return matchesRetryableCode(error, RETRYABLE_CODES.pg);
    }
}

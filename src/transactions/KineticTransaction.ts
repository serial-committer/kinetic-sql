import type {IDriver} from '../drivers/DriverInterface.js';
import type {ITransactionAdapter} from '../typings/transaction-interfaces.js';
import type {QueryContext} from '../typings/middleware-interfaces.js';
import type {ActiveTransaction} from './TransactionContext.js';
import {KineticError} from '../utils/KineticError.js';

/* Runs an operation through the client's middleware pipeline. */
export type MiddlewareRunner = <T>(
    operation: QueryContext['operation'],
    sqlOrName: string,
    params: any,
    executor: () => Promise<T>
) => Promise<T>;

export interface TransactionHandleDeps {
    /* Null for propagations that deliberately run outside a transaction. */
    active: ActiveTransaction | null;
    adapter: ITransactionAdapter;
    driver: IDriver;
    execute: MiddlewareRunner;

    /* Managed handles are committed by their block, not by the caller. */
    managed: boolean;
    settle?: (action: 'commit' | 'rollback') => Promise<void>;
    nested?: <T>(fn: (tx: KineticTransaction) => Promise<T>) => Promise<T>;
}

/**
 * The handle passed into a transaction block. Queries issued through it always
 * run on the transaction's pinned connection.
 */
export class KineticTransaction {
    constructor(private readonly deps: TransactionHandleDeps) {
    }

    /* Identifier shared with the middleware hooks, for correlating logs. */
    public get id(): string {
        return this.deps.active?.id ?? 'no-transaction';
    }

    /* How many blocks are participating in this transaction. */
    public get depth(): number {
        return this.deps.active?.depth ?? 0;
    }

    /* True when this block runs outside any transaction. */
    public get detached(): boolean {
        return this.deps.active === null;
    }

    public get isRollbackOnly(): boolean {
        return this.deps.active?.rollbackOnly ?? false;
    }

    /* The pinned connection, for handing off to a query builder mid-transaction. */
    public get native(): any {
        return this.deps.active ? this.deps.active.conn.native : this.deps.driver.native;
    }

    /**
     * Blocks the commit without throwing. The block still runs to completion,
     * but the owning transaction rolls back when it ends.
     */
    public setRollbackOnly(): void {
        if (this.deps.active) this.deps.active.rollbackOnly = true;
    }

    async raw(sql: string, params?: any[]): Promise<any> {
        return this.deps.execute('raw', sql, params, () => this.runRaw(sql, params));
    }

    /**
     * Calls a stored procedure on this transaction's connection.
     * A failure marks the transaction rollback-only so a swallowed error
     * cannot leave it committing partial work.
     */
    async rpc(functionName: string, params: Record<string, any>): Promise<{ data: any; error: any }> {
        return this.deps.execute('rpc', functionName, params, async () => {
            if (!this.deps.active) return this.deps.driver.rpc(functionName, params);

            try {
                const {sql, values} = this.deps.adapter.buildRpc(functionName, params);
                const data = await this.deps.active.conn.raw(sql, values);
                return {data, error: null};
            } catch (err) {
                this.setRollbackOnly();
                return {
                    data: null,
                    error: new KineticError('RPC_ERROR', `Failed to execute function: ${functionName}`, err)
                };
            }
        });
    }

    prepare(sql: string) {
        return {
            execute: async (params?: any[]) => {
                return this.deps.execute('prepare', sql, params, () => this.runRaw(sql, params));
            }
        };
    }

    /**
     * Runs a block inside a SAVEPOINT. A failure rolls back only this block,
     * leaving the surrounding transaction intact.
     */
    async savepoint<T>(fn: (tx: KineticTransaction) => Promise<T>): Promise<T> {
        if (!this.deps.nested) {
            throw new KineticError('TRANSACTION_ERROR', 'Savepoints are unavailable outside a transaction block.');
        }
        return this.deps.nested(fn);
    }

    /* -- MANUAL CONTROL -- */

    async commit(): Promise<void> {
        this.assertManual('commit');
        await this.deps.settle!('commit');
    }

    async rollback(): Promise<void> {
        this.assertManual('rollback');
        await this.deps.settle!('rollback');
    }

    private assertManual(action: string) {
        if (this.deps.managed) {
            throw new KineticError(
                'TRANSACTION_ERROR',
                `Cannot ${action} a managed transaction. The block commits when it returns and rolls back when it throws.`
            );
        }
    }

    private runRaw(sql: string, params?: any[]): Promise<any> {
        if (!this.deps.active) return this.deps.driver.raw(sql, params);
        return this.deps.active.conn.raw(sql, params);
    }
}

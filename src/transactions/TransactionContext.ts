import {AsyncLocalStorage} from 'node:async_hooks';
import type {IPinnedConnection} from '../typings/transaction-interfaces.js';
import type {Isolation, Propagation} from './constants.js';

/**
 * The physical transaction. One of these exists per pinned connection and is
 * shared by reference with every block that joins it.
 */
export interface ActiveTransaction {
    id: string;
    conn: IPinnedConnection;
    propagation: Propagation;
    isolation: Isolation;
    readOnly: boolean;
    startTime: bigint;
    attempt: number;

    /* How many blocks are currently participating. The creator sits at 0. */
    depth: number;

    /* Counter behind the generated SAVEPOINT names. */
    savepointSeq: number;

    /**
     * Set when a participant fails but its error is swallowed higher up.
     * The owner refuses to commit a transaction marked this way.
     */
    rollbackOnly: boolean;

    /* Committed or rolled back. Queries stop routing here once it is set. */
    finished: boolean;
}

interface TransactionStore {
    active: ActiveTransaction | null;
}

/**
 * Binds the running transaction to the async call stack, so queries issued by
 * code further down join it without the handle being passed around.
 */
const storage = new AsyncLocalStorage<TransactionStore>();

let sequence = 0;

export function nextTransactionId(): string {
    sequence += 1;
    return `tx_${sequence.toString(36)}`;
}

/**
 * Returns the transaction covering the current async scope.
 * A finished transaction is treated as absent so late queries fall back to the pool.
 */
export function getActiveTransaction(): ActiveTransaction | null {
    const active = storage.getStore()?.active ?? null;
    return active && !active.finished ? active : null;
}

/* Runs a block with the given transaction bound to its async scope. */
export function runInTransaction<T>(active: ActiveTransaction, fn: () => Promise<T>): Promise<T> {
    return storage.run({active}, fn);
}

/* Runs a block with any active transaction hidden from it. */
export function runSuspended<T>(fn: () => Promise<T>): Promise<T> {
    return storage.run({active: null}, fn);
}

/**
 * Binds a transaction to the current scope without wrapping a callback.
 * Used by the manual API, where there is no block to wrap.
 */
export function bindTransaction(active: ActiveTransaction): void {
    storage.enterWith({active});
}

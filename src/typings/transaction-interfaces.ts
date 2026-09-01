import type {Isolation, Propagation} from '../transactions/constants.js';

/* -- PUBLIC OPTIONS -- */

/**
 * Matches an error either by its constructor, by its `code`, or by a predicate.
 * Used to decide whether a thrown error should roll the transaction back.
 */
export type ErrorMatcher =
    | (new (...args: any[]) => Error)
    | string
    | ((error: any) => boolean);

export interface TransactionOptions {
    /* How to behave when a transaction is already running. Defaults to REQUIRED. */
    propagation?: Propagation;

    /* Isolation level requested from the engine. Defaults to the engine's own setting. */
    isolation?: Isolation;

    /* Opens the transaction in read-only mode so the engine can optimise it. */
    readOnly?: boolean;

    /* Abort and roll back if the block runs longer than this many milliseconds. */
    timeout?: number;

    /**
     * Opts out of the automatic replay on deadlock and serialization failures.
     * Set this when the block has side effects that must not run twice.
     */
    noRetry?: boolean;

    /* Attempts made before a transient failure is surfaced. Defaults to 3. */
    maxRetries?: number;

    /* Errors that should roll back. Everything rolls back by default. */
    rollbackFor?: ErrorMatcher[];

    /* Errors that should commit anyway and still be re-thrown to the caller. */
    noRollbackFor?: ErrorMatcher[];
}

/* -- MIDDLEWARE VISIBILITY -- */

/* Snapshot handed to the transaction lifecycle hooks. */
export interface TransactionInfo {
    id: string;
    propagation: Propagation;
    isolation: Isolation;
    readOnly: boolean;
    depth: number;
    attempt: number;
    startTime: bigint;
}

/* -- DRIVER LAYER -- */

/**
 * A single connection held for the lifetime of one transaction.
 * Every statement in that transaction runs through this handle.
 */
export interface IPinnedConnection {
    readonly id: string;
    readonly native: any;

    begin(options: { isolation?: Isolation; readOnly?: boolean; timeout?: number }): Promise<void>;

    commit(): Promise<void>;

    rollback(): Promise<void>;

    savepoint(name: string): Promise<void>;

    rollbackToSavepoint(name: string): Promise<void>;

    releaseSavepoint(name: string): Promise<void>;

    raw(sql: string, params?: any[]): Promise<any>;

    /* Returns the connection to the pool, or closes it if it was opened standalone. */
    release(): Promise<void>;
}

/**
 * Per-engine transaction behaviour. Each adapter knows how to pin a connection
 * and how to spell the transaction statements for its dialect.
 */
export interface ITransactionAdapter {
    readonly dialect: 'pg' | 'mysql' | 'sqlite';

    /* Pins a connection from the pool for a transaction. */
    acquire(): Promise<IPinnedConnection>;

    /**
     * Pins a connection that is genuinely independent of any running transaction.
     * Used by REQUIRES_NEW.
     */
    acquireIndependent(): Promise<IPinnedConnection>;

    /* Builds the dialect-specific call for a stored procedure or function. */
    buildRpc(name: string, params: Record<string, any>): { sql: string; values: any[] };

    /* True when the engine aborted the transaction and a replay is safe. */
    isRetryable(error: any): boolean;
}

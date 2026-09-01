/* -- TRANSACTION PROPAGATION -- */

/**
 * Controls how a transaction block behaves when another one is already running.
 * Mirrors the propagation model used by Spring's transaction manager.
 */
export const Propagation = {
    /* Join the active transaction, or start one if there is none. */
    REQUIRED: 'REQUIRED',

    /* Always run in its own transaction on a separate connection. */
    REQUIRES_NEW: 'REQUIRES_NEW',

    /* Run inside a SAVEPOINT so a failure here does not kill the outer transaction. */
    NESTED: 'NESTED',

    /* Join the active transaction, or throw if there is none. */
    MANDATORY: 'MANDATORY',

    /* Throw if a transaction is already active. */
    NEVER: 'NEVER',

    /* Join the active transaction, or run without one. */
    SUPPORTS: 'SUPPORTS',

    /* Suspend the active transaction and run without one. */
    NOT_SUPPORTED: 'NOT_SUPPORTED'
} as const;

export type Propagation = typeof Propagation[keyof typeof Propagation];

/* -- ISOLATION LEVELS -- */

/**
 * Standard SQL isolation levels. Engines that cannot honour a level fall back
 * to their closest equivalent rather than failing.
 */
export const Isolation = {
    /* Use whatever the database is configured to use. */
    DEFAULT: 'DEFAULT',
    READ_UNCOMMITTED: 'READ UNCOMMITTED',
    READ_COMMITTED: 'READ COMMITTED',
    REPEATABLE_READ: 'REPEATABLE READ',
    SERIALIZABLE: 'SERIALIZABLE'
} as const;

export type Isolation = typeof Isolation[keyof typeof Isolation];

/* -- RETRY DEFAULTS -- */

/* Attempts made before a transient failure is surfaced to the caller. */
export const DEFAULT_MAX_RETRIES = 3;

/* Base delay for the exponential backoff between retries, in milliseconds. */
export const RETRY_BASE_DELAY_MS = 50;

/* Upper bound so a backoff never stalls a request. */
export const RETRY_MAX_DELAY_MS = 500;

/**
 * Error codes that mean the database aborted and rolled back the transaction
 * on its own. These are safe to replay because no work survived the failure.
 */
export const RETRYABLE_CODES: Readonly<Record<string, readonly string[]>> = {
    /* serialization_failure, deadlock_detected */
    pg: ['40001', '40P01'],

    /* ER_LOCK_DEADLOCK, ER_LOCK_WAIT_TIMEOUT */
    mysql: ['1213', '1205', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'],

    /* Write lock contention between connections. */
    sqlite: ['SQLITE_BUSY', 'SQLITE_BUSY_SNAPSHOT', 'SQLITE_LOCKED', 'SQLITE_PROTOCOL']
};

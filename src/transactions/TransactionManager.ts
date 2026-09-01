import type {IDriver} from '../drivers/DriverInterface.js';
import type {
    ErrorMatcher,
    IPinnedConnection,
    ITransactionAdapter,
    TransactionInfo,
    TransactionOptions
} from '../typings/transaction-interfaces.js';
import {
    DEFAULT_MAX_RETRIES,
    Isolation,
    Propagation,
    RETRY_BASE_DELAY_MS,
    RETRY_MAX_DELAY_MS
} from './constants.js';
import {KineticError} from '../utils/KineticError.js';
import type {KineticLogger} from '../utils/KineticLogger.js';
import type {ActiveTransaction} from './TransactionContext.js';
import {
    bindTransaction,
    getActiveTransaction,
    nextTransactionId,
    runInTransaction,
    runSuspended
} from './TransactionContext.js';
import type {MiddlewareRunner} from './KineticTransaction.js';
import {KineticTransaction} from './KineticTransaction.js';

/* Notifies registered middleware about the transaction lifecycle. */
export interface TransactionHooks {
    begin(info: TransactionInfo): Promise<void>;

    commit(info: TransactionInfo): Promise<void>;

    rollback(info: TransactionInfo, error?: Error): Promise<void>;
}

export type TransactionCallback<T> = (tx: KineticTransaction) => Promise<T>;

/* -- HELPERS -- */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/* Exponential backoff with jitter, so retrying peers do not collide again. */
function backoffDelay(attempt: number): number {
    const base = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
    return base + Math.floor(Math.random() * RETRY_BASE_DELAY_MS);
}

function matches(error: any, matchers?: ErrorMatcher[]): boolean {
    if (!matchers || matchers.length === 0) return false;

    return matchers.some(matcher => {
        if (typeof matcher === 'string') {
            return error?.code === matcher || error?.name === matcher;
        }
        /* A class has a prototype; a plain predicate does not. */
        if (typeof matcher === 'function' && matcher.prototype) {
            return error instanceof (matcher as new (...args: any[]) => Error);
        }
        if (typeof matcher === 'function') {
            return Boolean((matcher as (e: any) => boolean)(error));
        }
        return false;
    });
}

/* Everything rolls back by default, and rollbackFor overrides noRollbackFor. */
function shouldRollback(error: any, options: TransactionOptions): boolean {
    if (matches(error, options.rollbackFor)) return true;
    if (matches(error, options.noRollbackFor)) return false;
    return true;
}

function isTimeout(error: any): boolean {
    return error instanceof KineticError && error.code === 'TRANSACTION_TIMEOUT';
}

function withTimeout<T>(promise: Promise<T>, ms: number | undefined, id: string): Promise<T> {
    if (!ms || ms <= 0) return promise;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
            () => reject(new KineticError('TRANSACTION_TIMEOUT', `Transaction ${id} exceeded its ${ms}ms timeout.`)),
            ms
        );
    });

    return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

/* -- MANAGER -- */

export class TransactionManager {
    constructor(
        public readonly adapter: ITransactionAdapter,
        private readonly driver: IDriver,
        private readonly execute: MiddlewareRunner,
        private readonly hooks: TransactionHooks,
        private readonly logger: KineticLogger
    ) {
    }

    /* -- ENTRY POINT -- */

    async run<T>(options: TransactionOptions, callback: TransactionCallback<T>): Promise<T> {
        const propagation = options.propagation ?? Propagation.REQUIRED;
        const current = getActiveTransaction();

        switch (propagation) {
            case Propagation.NEVER:
                if (current) {
                    throw new KineticError(
                        'TRANSACTION_ERROR',
                        'Propagation NEVER was used inside an active transaction.'
                    );
                }
                return this.runDetached(callback);

            case Propagation.NOT_SUPPORTED:
                return this.runDetached(callback);

            case Propagation.MANDATORY:
                if (!current) {
                    throw new KineticError(
                        'TRANSACTION_ERROR',
                        'Propagation MANDATORY requires an active transaction, but none was found.'
                    );
                }
                return this.join(current, options, callback);

            case Propagation.SUPPORTS:
                return current ? this.join(current, options, callback) : this.runDetached(callback);

            case Propagation.NESTED:
                return current
                    ? this.runNested(current, callback)
                    : this.runPhysical(options, callback, false);

            case Propagation.REQUIRES_NEW:
                return this.runPhysical(options, callback, true);

            case Propagation.REQUIRED:
            default:
                return current
                    ? this.join(current, options, callback)
                    : this.runPhysical(options, callback, false);
        }
    }

    /* -- MANUAL API -- */

    async begin(options: TransactionOptions): Promise<KineticTransaction> {
        const conn = await this.adapter.acquire();
        const active = this.createActive(conn, options, 1);

        try {
            await conn.begin({
                isolation: active.isolation,
                readOnly: active.readOnly,
                timeout: options.timeout
            });
        } catch (err) {
            await conn.release();
            throw err;
        }

        await this.notifyBegin(active);

        /* Binds the transaction to the caller scope so client queries join it. */
        bindTransaction(active);

        const settle = async (action: 'commit' | 'rollback') => {
            if (active.finished) {
                throw new KineticError('TRANSACTION_ERROR', `Transaction ${active.id} has already been settled.`);
            }

            try {
                if (action === 'commit' && active.rollbackOnly) {
                    await this.safeRollback(conn, active);
                    throw new KineticError(
                        'TRANSACTION_ROLLBACK',
                        `Transaction ${active.id} was marked rollback-only and could not be committed.`
                    );
                }

                if (action === 'commit') {
                    await conn.commit();
                    await this.notifyCommit(active);
                } else {
                    await this.safeRollback(conn, active);
                }
            } finally {
                active.finished = true;
                await conn.release();
            }
        };

        return new KineticTransaction({
            active,
            adapter: this.adapter,
            driver: this.driver,
            execute: this.execute,
            managed: false,
            settle,
            nested: fn => this.runNested(active, fn)
        });
    }

    /* -- PROPAGATION STRATEGIES -- */

    /* Owns a real transaction: begins it, commits it, and replays it on contention. */
    private async runPhysical<T>(
        options: TransactionOptions,
        callback: TransactionCallback<T>,
        independent: boolean
    ): Promise<T> {
        const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
        const id = nextTransactionId();
        let attempt = 0;

        while (true) {
            attempt += 1;

            const conn = independent
                ? await this.adapter.acquireIndependent()
                : await this.adapter.acquire();

            const active = this.createActive(conn, options, attempt, id);

            try {
                await conn.begin({
                    isolation: active.isolation,
                    readOnly: active.readOnly,
                    timeout: options.timeout
                });
                await this.notifyBegin(active);

                const handle = new KineticTransaction({
                    active,
                    adapter: this.adapter,
                    driver: this.driver,
                    execute: this.execute,
                    managed: true,
                    nested: fn => this.runNested(active, fn)
                });

                const result = await runInTransaction(active, () =>
                    withTimeout(callback(handle), options.timeout, active.id)
                );

                if (active.rollbackOnly) {
                    await this.safeRollback(conn, active);
                    throw new KineticError(
                        'TRANSACTION_ROLLBACK',
                        `Transaction ${active.id} was marked rollback-only, so nothing was committed.`
                    );
                }

                await conn.commit();
                await this.notifyCommit(active);
                return result;
            } catch (err) {
                /* noRollbackFor: keep the work, but still surface the error. */
                if (!active.rollbackOnly && !shouldRollback(err, options)) {
                    try {
                        await conn.commit();
                        await this.notifyCommit(active);
                    } catch (commitErr) {
                        this.logger.error(`Commit failed for ${active.id} after a non-rollback error`, commitErr);
                    }
                    throw err;
                }

                await this.safeRollback(conn, active, err as Error);

                if (this.canRetry(err, options, attempt, maxRetries)) {
                    const delay = backoffDelay(attempt);
                    this.logger.warn(
                        `Transaction ${active.id} hit contention. Retrying in ${delay}ms (attempt ${attempt + 1} of ${maxRetries}).`
                    );
                    await sleep(delay);
                    continue;
                }

                throw err;
            } finally {
                active.finished = true;
                await conn.release().catch(releaseErr =>
                    this.logger.error(`Failed to release the connection for ${active.id}`, releaseErr)
                );
            }
        }
    }

    /* Participates in an existing transaction. The owner still decides the outcome. */
    private async join<T>(
        current: ActiveTransaction,
        options: TransactionOptions,
        callback: TransactionCallback<T>
    ): Promise<T> {
        if (options.isolation && options.isolation !== current.isolation) {
            this.logger.warn(
                `Ignoring isolation ${options.isolation} for ${current.id}: it already runs at ${current.isolation}.`
            );
        }

        current.depth += 1;

        const handle = new KineticTransaction({
            active: current,
            adapter: this.adapter,
            driver: this.driver,
            execute: this.execute,
            managed: true,
            nested: fn => this.runNested(current, fn)
        });

        try {
            return await callback(handle);
        } catch (err) {
            /* Stops the owner committing work a failed participant left behind. */
            if (shouldRollback(err, options)) current.rollbackOnly = true;
            throw err;
        } finally {
            current.depth -= 1;
        }
    }

    /* Runs inside a SAVEPOINT so a failure here does not sink the outer transaction. */
    private async runNested<T>(current: ActiveTransaction, callback: TransactionCallback<T>): Promise<T> {
        current.savepointSeq += 1;
        const name = `kinetic_sp_${current.savepointSeq}`;

        await current.conn.savepoint(name);
        current.depth += 1;

        const handle = new KineticTransaction({
            active: current,
            adapter: this.adapter,
            driver: this.driver,
            execute: this.execute,
            managed: true,
            nested: fn => this.runNested(current, fn)
        });

        try {
            const result = await callback(handle);
            await current.conn.releaseSavepoint(name);
            return result;
        } catch (err) {
            try {
                await current.conn.rollbackToSavepoint(name);
            } catch (rollbackErr) {
                /* The savepoint is unusable, so the whole transaction has to go. */
                current.rollbackOnly = true;
                this.logger.error(`Failed to roll back to ${name} on ${current.id}`, rollbackErr);
            }
            throw err;
        } finally {
            current.depth -= 1;
        }
    }

    /* Runs the block with no transaction bound to it. */
    private runDetached<T>(callback: TransactionCallback<T>): Promise<T> {
        const handle = new KineticTransaction({
            active: null,
            adapter: this.adapter,
            driver: this.driver,
            execute: this.execute,
            managed: true
        });

        return runSuspended(() => callback(handle));
    }

    /* -- INTERNALS -- */

    private createActive(
        conn: IPinnedConnection,
        options: TransactionOptions,
        attempt: number,
        id?: string
    ): ActiveTransaction {
        return {
            id: id ?? nextTransactionId(),
            conn,
            propagation: options.propagation ?? Propagation.REQUIRED,
            isolation: options.isolation ?? Isolation.DEFAULT,
            readOnly: options.readOnly ?? false,
            startTime: process.hrtime.bigint(),
            attempt,
            depth: 0,
            savepointSeq: 0,
            rollbackOnly: false,
            finished: false
        };
    }

    private canRetry(error: any, options: TransactionOptions, attempt: number, maxRetries: number): boolean {
        if (options.noRetry) return false;
        if (attempt >= maxRetries) return false;
        if (isTimeout(error)) return false;

        /* A rollback-only outcome is deterministic, so replaying it changes nothing. */
        if (error instanceof KineticError && error.code === 'TRANSACTION_ROLLBACK') return false;

        return this.adapter.isRetryable(error);
    }

    private async safeRollback(conn: IPinnedConnection, active: ActiveTransaction, error?: Error): Promise<void> {
        try {
            await conn.rollback();
        } catch (err) {
            this.logger.error(`Rollback failed for ${active.id}`, err);
        }
        await this.notifyRollback(active, error);
    }

    private toInfo(active: ActiveTransaction): TransactionInfo {
        return {
            id: active.id,
            propagation: active.propagation,
            isolation: active.isolation,
            readOnly: active.readOnly,
            depth: active.depth,
            attempt: active.attempt,
            startTime: active.startTime
        };
    }

    /* Hook failures are logged, never allowed to break the transaction. */
    private async notifyBegin(active: ActiveTransaction) {
        try {
            await this.hooks.begin(this.toInfo(active));
        } catch (err) {
            this.logger.error('A middleware onTransactionBegin hook threw', err);
        }
    }

    private async notifyCommit(active: ActiveTransaction) {
        try {
            await this.hooks.commit(this.toInfo(active));
        } catch (err) {
            this.logger.error('A middleware onTransactionCommit hook threw', err);
        }
    }

    private async notifyRollback(active: ActiveTransaction, error?: Error) {
        try {
            await this.hooks.rollback(this.toInfo(active), error);
        } catch (err) {
            this.logger.error('A middleware onTransactionRollback hook threw', err);
        }
    }
}

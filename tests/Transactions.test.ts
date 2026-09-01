import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {KineticClient} from '../src/KineticClient.js';
import {Isolation, Propagation} from '../src/transactions/constants.js';
import type {KineticMiddleware} from '../src/typings/middleware-interfaces.js';

async function makeClient(filename = ':memory:') {
    const client = await KineticClient.create({type: 'sqlite', filename});
    await client.raw('CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT, balance INTEGER)');
    return client;
}

const countRows = async (client: any) => {
    const rows = await client.raw('SELECT COUNT(*) as total FROM accounts');
    return rows[0].total as number;
};

describe('Transactions: commit and rollback', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    it('commits the work when the block returns', async () => {
        const result = await client.transaction(async () => {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['kapil', 100]);
            return 'done';
        });

        expect(result).toBe('done');
        expect(await countRows(client)).toBe(1);
    });

    it('rolls the work back when the block throws', async () => {
        await expect(
            client.transaction(async () => {
                await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['kapil', 100]);
                throw new Error('something broke');
            })
        ).rejects.toThrow('something broke');

        expect(await countRows(client)).toBe(0);
    });

    it('routes queries made through the client into the active transaction', async () => {
        /* Nothing is passed down, so this only works if the context is ambient. */
        const insertViaHelper = async () => {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['helper', 1]);
        };

        await expect(
            client.transaction(async () => {
                await insertViaHelper();
                expect(await countRows(client)).toBe(1);
                throw new Error('abort');
            })
        ).rejects.toThrow('abort');

        expect(await countRows(client)).toBe(0);
    });

    it('runs queries outside the transaction again once it has finished', async () => {
        await client.transaction(async () => {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['a', 1]);
        });

        await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['b', 2]);
        expect(await countRows(client)).toBe(2);
    });

    it('hands the block a working explicit handle as well', async () => {
        await client.transaction(async (tx: any) => {
            await tx.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['explicit', 5]);
            expect(tx.id).toMatch(/^tx_/);
            expect(tx.detached).toBe(false);
        });

        expect(await countRows(client)).toBe(1);
    });
});

describe('Transactions: savepoints', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    it('contains a nested failure without losing the outer work', async () => {
        await client.transaction(async (tx: any) => {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['outer', 1]);

            /* The inner block fails, but only its own work is undone. */
            await expect(
                tx.savepoint(async () => {
                    await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['inner', 2]);
                    throw new Error('inner failed');
                })
            ).rejects.toThrow('inner failed');
        });

        const rows = await client.raw('SELECT name FROM accounts');
        expect(rows.map((r: any) => r.name)).toEqual(['outer']);
    });

    it('keeps nested work when the nested block succeeds', async () => {
        await client.transaction(async (tx: any) => {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['outer', 1]);
            await tx.savepoint(async () => {
                await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['inner', 2]);
            });
        });

        expect(await countRows(client)).toBe(2);
    });

    it('supports savepoints nested inside savepoints', async () => {
        await client.transaction(async (tx: any) => {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['level0', 0]);

            await tx.savepoint(async (inner: any) => {
                await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['level1', 1]);

                await expect(
                    inner.savepoint(async () => {
                        await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['level2', 2]);
                        throw new Error('deepest failed');
                    })
                ).rejects.toThrow('deepest failed');
            });
        });

        const rows = await client.raw('SELECT name FROM accounts ORDER BY id');
        expect(rows.map((r: any) => r.name)).toEqual(['level0', 'level1']);
    });
});

describe('Transactions: rollback rules', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    class ValidationError extends Error {
    }

    it('commits anyway for an error listed in noRollbackFor, and still throws it', async () => {
        await expect(
            client.transaction({noRollbackFor: [ValidationError]}, async () => {
                await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['kept', 1]);
                throw new ValidationError('not fatal');
            })
        ).rejects.toThrow('not fatal');

        expect(await countRows(client)).toBe(1);
    });

    it('lets rollbackFor override noRollbackFor', async () => {
        class FatalError extends ValidationError {
        }

        await expect(
            client.transaction(
                {noRollbackFor: [ValidationError], rollbackFor: [FatalError]},
                async () => {
                    await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['dropped', 1]);
                    throw new FatalError('fatal');
                }
            )
        ).rejects.toThrow('fatal');

        expect(await countRows(client)).toBe(0);
    });

    it('refuses to commit a transaction marked rollback-only', async () => {
        await expect(
            client.transaction(async (tx: any) => {
                await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['doomed', 1]);
                tx.setRollbackOnly();
            })
        ).rejects.toMatchObject({code: 'TRANSACTION_ROLLBACK'});

        expect(await countRows(client)).toBe(0);
    });
});

describe('Transactions: retry', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    const busy = () => Object.assign(new Error('database is locked'), {code: 'SQLITE_BUSY'});

    it('replays a block that hit contention, without being asked to', async () => {
        let attempts = 0;

        const result = await client.transaction(async () => {
            attempts += 1;
            if (attempts < 3) throw busy();
            return 'recovered';
        });

        expect(result).toBe('recovered');
        expect(attempts).toBe(3);
    });

    it('gives up after maxRetries and surfaces the error', async () => {
        let attempts = 0;

        await expect(
            client.transaction({maxRetries: 2}, async () => {
                attempts += 1;
                throw busy();
            })
        ).rejects.toThrow('database is locked');

        expect(attempts).toBe(2);
    });

    it('does not replay when noRetry is set', async () => {
        let attempts = 0;

        await expect(
            client.transaction({noRetry: true}, async () => {
                attempts += 1;
                throw busy();
            })
        ).rejects.toThrow('database is locked');

        expect(attempts).toBe(1);
    });

    it('never replays an ordinary application error', async () => {
        let attempts = 0;

        await expect(
            client.transaction(async () => {
                attempts += 1;
                throw new Error('bad input');
            })
        ).rejects.toThrow('bad input');

        expect(attempts).toBe(1);
    });
});

describe('Transactions: timeout', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    it('aborts and rolls back a block that overruns', async () => {
        await expect(
            client.transaction({timeout: 40}, async () => {
                await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['slow', 1]);
                await new Promise(resolve => setTimeout(resolve, 200));
            })
        ).rejects.toMatchObject({code: 'TRANSACTION_TIMEOUT'});

        expect(await countRows(client)).toBe(0);
    });

    it('leaves a block that finishes in time alone', async () => {
        await client.transaction({timeout: 500}, async () => {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['quick', 1]);
        });

        expect(await countRows(client)).toBe(1);
    });
});

describe('Transactions: middleware', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    it('reports begin and commit, and tags queries with the transaction id', async () => {
        const begun = vi.fn();
        const committed = vi.fn();
        const seen: (string | undefined)[] = [];

        const plugin: KineticMiddleware = {
            name: 'TxSpy',
            beforeQuery: ctx => {
                seen.push(ctx.txId);
            },
            onTransactionBegin: begun,
            onTransactionCommit: committed
        };
        client.use(plugin);

        await client.raw('SELECT 1');
        await client.transaction(async () => {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['x', 1]);
        });

        expect(begun).toHaveBeenCalledOnce();
        expect(committed).toHaveBeenCalledOnce();
        expect(begun.mock.calls[0][0]).toMatchObject({propagation: Propagation.REQUIRED, attempt: 1});

        /* The first query ran outside a transaction, the second inside one. */
        expect(seen[0]).toBeUndefined();
        expect(seen[1]).toMatch(/^tx_/);
    });

    it('reports a rollback with the error that caused it', async () => {
        const rolledBack = vi.fn();
        client.use({name: 'TxSpy', onTransactionRollback: rolledBack});

        await expect(
            client.transaction(async () => {
                throw new Error('nope');
            })
        ).rejects.toThrow('nope');

        expect(rolledBack).toHaveBeenCalledOnce();
        expect(rolledBack.mock.calls[0][1]).toBeInstanceOf(Error);
    });

    it('does not let a throwing hook break the transaction', async () => {
        client.use({
            name: 'BadPlugin',
            onTransactionCommit: () => {
                throw new Error('plugin exploded');
            }
        });

        await expect(
            client.transaction(async () => {
                await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['safe', 1]);
            })
        ).resolves.toBeUndefined();

        expect(await countRows(client)).toBe(1);
    });
});

describe('Transactions: manual control', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    it('commits when told to', async () => {
        const tx = await client.beginTransaction();
        await tx.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['manual', 1]);
        await tx.commit();

        expect(await countRows(client)).toBe(1);
    });

    it('rolls back when told to', async () => {
        const tx = await client.beginTransaction();
        await tx.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['manual', 1]);
        await tx.rollback();

        expect(await countRows(client)).toBe(0);
    });

    it('refuses to be settled twice', async () => {
        const tx = await client.beginTransaction();
        await tx.commit();

        await expect(tx.commit()).rejects.toMatchObject({code: 'TRANSACTION_ERROR'});
    });

    it('refuses manual control on a managed transaction', async () => {
        await client.transaction(async (tx: any) => {
            await expect(tx.commit()).rejects.toMatchObject({code: 'TRANSACTION_ERROR'});
        });
    });
});

describe('Transactions: SQLite concurrency', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    it('queues overlapping transactions instead of interleaving them', async () => {
        await client.raw('INSERT INTO accounts (id, name, balance) VALUES (1, ?, ?)', ['shared', 0]);

        /* A read-modify-write race would lose updates if these overlapped. */
        const bump = () =>
            client.transaction(async () => {
                const rows = await client.raw('SELECT balance FROM accounts WHERE id = 1');
                const next = rows[0].balance + 1;
                await new Promise(resolve => setImmediate(resolve));
                await client.raw('UPDATE accounts SET balance = ? WHERE id = 1', [next]);
            });

        await Promise.all([bump(), bump(), bump(), bump(), bump()]);

        const rows = await client.raw('SELECT balance FROM accounts WHERE id = 1');
        expect(rows[0].balance).toBe(5);
    });
});

describe('Transactions: configuration', () => {
    it('accepts an isolation level without failing on SQLite', async () => {
        const client = await makeClient();

        await client.transaction({isolation: Isolation.SERIALIZABLE}, async () => {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['iso', 1]);
        });

        expect(await countRows(client)).toBe(1);
        await client.end();
    });

    it('blocks writes in a read-only transaction', async () => {
        const client = await makeClient();

        await expect(
            client.transaction({readOnly: true}, async () => {
                await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['nope', 1]);
            })
        ).rejects.toThrow();

        await client.end();
    });

    it('explains why REQUIRES_NEW cannot work on an in-memory database', async () => {
        const client = await makeClient();

        await expect(
            client.transaction({propagation: Propagation.REQUIRES_NEW}, async () => 'never')
        ).rejects.toMatchObject({code: 'TRANSACTION_ERROR'});

        await client.end();
    });

    it('rejects a transaction call with no block', async () => {
        const client = await makeClient();

        await expect(client.transaction({} as any)).rejects.toMatchObject({code: 'TRANSACTION_ERROR'});
        await client.end();
    });
});

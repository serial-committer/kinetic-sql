import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {KineticClient} from '../src/KineticClient.js';
import {Propagation} from '../src/transactions/constants.js';

async function makeClient(filename = ':memory:') {
    const client = await KineticClient.create({type: 'sqlite', filename});
    await client.raw('CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT, balance INTEGER)');
    return client;
}

const names = async (client: any): Promise<string[]> => {
    const rows = await client.raw('SELECT name FROM accounts ORDER BY id');
    return rows.map((r: any) => r.name);
};

const insert = (client: any, name: string) =>
    client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', [name, 1]);

describe('Propagation: REQUIRED', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    it('joins the transaction that is already running', async () => {
        let outerId = '';
        let innerId = '';

        await client.transaction(async (outer: any) => {
            outerId = outer.id;
            await client.transaction(async (inner: any) => {
                innerId = inner.id;
                await insert(client, 'joined');
            });
        });

        expect(innerId).toBe(outerId);
        expect(await names(client)).toEqual(['joined']);
    });

    it('starts a transaction when none is running', async () => {
        await client.transaction(async (tx: any) => {
            expect(tx.detached).toBe(false);
            await insert(client, 'fresh');
        });

        expect(await names(client)).toEqual(['fresh']);
    });

    it('stops the outer block committing after a participant fails', async () => {
        /* The inner error is swallowed, so only the rollback-only mark prevents a bad commit. */
        await expect(
            client.transaction(async () => {
                await insert(client, 'outer');

                try {
                    await client.transaction(async () => {
                        await insert(client, 'inner');
                        throw new Error('participant failed');
                    });
                } catch {
                    /* deliberately ignored */
                }
            })
        ).rejects.toMatchObject({code: 'TRANSACTION_ROLLBACK'});

        expect(await names(client)).toEqual([]);
    });
});

describe('Propagation: NESTED', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    it('lets the outer block survive a nested failure', async () => {
        await client.transaction(async () => {
            await insert(client, 'outer');

            try {
                await client.transaction({propagation: Propagation.NESTED}, async () => {
                    await insert(client, 'nested');
                    throw new Error('nested failed');
                });
            } catch {
                /* the savepoint is gone, the outer transaction is fine */
            }
        });

        expect(await names(client)).toEqual(['outer']);
    });

    it('behaves like a plain transaction when nothing is running', async () => {
        await client.transaction({propagation: Propagation.NESTED}, async () => {
            await insert(client, 'standalone');
        });

        expect(await names(client)).toEqual(['standalone']);
    });
});

describe('Propagation: MANDATORY and NEVER', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    it('MANDATORY throws when nothing is running', async () => {
        await expect(
            client.transaction({propagation: Propagation.MANDATORY}, async () => 'x')
        ).rejects.toMatchObject({code: 'TRANSACTION_ERROR'});
    });

    it('MANDATORY joins when something is running', async () => {
        await client.transaction(async (outer: any) => {
            await client.transaction({propagation: Propagation.MANDATORY}, async (inner: any) => {
                expect(inner.id).toBe(outer.id);
            });
        });
    });

    it('NEVER throws inside a transaction', async () => {
        await client.transaction(async () => {
            await expect(
                client.transaction({propagation: Propagation.NEVER}, async () => 'x')
            ).rejects.toMatchObject({code: 'TRANSACTION_ERROR'});
        });
    });

    it('NEVER runs normally outside a transaction', async () => {
        const result = await client.transaction({propagation: Propagation.NEVER}, async (tx: any) => {
            expect(tx.detached).toBe(true);
            return 'ran';
        });

        expect(result).toBe('ran');
    });
});

describe('Propagation: SUPPORTS and NOT_SUPPORTED', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
    });

    afterEach(async () => {
        await client.end();
    });

    it('SUPPORTS joins an active transaction', async () => {
        await client.transaction(async (outer: any) => {
            await client.transaction({propagation: Propagation.SUPPORTS}, async (inner: any) => {
                expect(inner.id).toBe(outer.id);
                expect(inner.detached).toBe(false);
            });
        });
    });

    it('SUPPORTS runs without one when none is active', async () => {
        await client.transaction({propagation: Propagation.SUPPORTS}, async (tx: any) => {
            expect(tx.detached).toBe(true);
        });
    });

    it('NOT_SUPPORTED hides the active transaction from the block', async () => {
        await client.transaction(async () => {
            await client.transaction({propagation: Propagation.NOT_SUPPORTED}, async (tx: any) => {
                expect(tx.detached).toBe(true);
            });
        });
    });
});

describe('Propagation: REQUIRES_NEW', () => {
    let client: any;
    let file: string;

    beforeEach(async () => {
        file = path.join(os.tmpdir(), `kinetic-tx-${process.pid}-${Date.now()}.db`);
        client = await makeClient(file);

        /* Readers stop blocking the second connection under WAL. */
        client.native.pragma('journal_mode = WAL');
    });

    afterEach(async () => {
        await client.end();
        for (const suffix of ['', '-wal', '-shm']) {
            try {
                fs.unlinkSync(file + suffix);
            } catch {
                /* already gone */
            }
        }
    });

    it('commits independently of the transaction that started it', async () => {
        await expect(
            client.transaction({readOnly: true}, async () => {
                await client.transaction({propagation: Propagation.REQUIRES_NEW}, async () => {
                    await insert(client, 'independent');
                });

                throw new Error('outer failed');
            })
        ).rejects.toThrow('outer failed');

        /* The inner transaction had its own connection, so its work survived. */
        expect(await names(client)).toEqual(['independent']);
    });

    it('runs on a different connection from the outer transaction', async () => {
        await client.transaction({readOnly: true}, async (outer: any) => {
            await client.transaction({propagation: Propagation.REQUIRES_NEW}, async (inner: any) => {
                expect(inner.id).not.toBe(outer.id);
                expect(inner.native).not.toBe(outer.native);
            });
        });
    });
});

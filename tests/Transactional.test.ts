import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {KineticClient} from '../src/KineticClient.js';
import {Transactional} from '../src/transactions/Transactional.js';
import {setDefaultClient} from '../src/transactions/registry.js';
import {Propagation} from '../src/transactions/constants.js';

async function makeClient() {
    const client = await KineticClient.create({type: 'sqlite', filename: ':memory:'});
    await client.raw('CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT, balance INTEGER)');
    return client;
}

const countRows = async (client: any) => {
    const rows = await client.raw('SELECT COUNT(*) as total FROM accounts');
    return rows[0].total as number;
};

describe('@Transactional', () => {
    let client: any;

    beforeEach(async () => {
        client = await makeClient();
        setDefaultClient(client);
    });

    afterEach(async () => {
        setDefaultClient(null);
        await client.end();
    });

    /* Applied by hand so the test does not depend on which decorator syntax is enabled. */
    const applyLegacy = (fn: (...args: any[]) => any, options = {}) => {
        const descriptor: PropertyDescriptor = {value: fn, writable: true, configurable: true};
        Transactional(options)({}, 'method', descriptor);
        return descriptor.value;
    };

    const applyStandard = (fn: (...args: any[]) => any, options = {}) =>
        Transactional(options)(fn, {kind: 'method', name: 'method'});

    it('wraps a method declared with legacy decorators', async () => {
        const save = applyLegacy(async function (this: any, name: string) {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', [name, 1]);
            return name;
        });

        expect(await save('legacy')).toBe('legacy');
        expect(await countRows(client)).toBe(1);
    });

    it('wraps a method declared with standard decorators', async () => {
        const save = applyStandard(async function (this: any, name: string) {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', [name, 1]);
            return name;
        });

        expect(await save('standard')).toBe('standard');
        expect(await countRows(client)).toBe(1);
    });

    it('rolls back when the decorated method throws', async () => {
        const save = applyLegacy(async function () {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['doomed', 1]);
            throw new Error('service failed');
        });

        await expect(save()).rejects.toThrow('service failed');
        expect(await countRows(client)).toBe(0);
    });

    it('keeps the original receiver so the method can use its own fields', async () => {
        class AccountService {
            public prefix = 'svc';

            async create(name: string) {
                await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', [`${this.prefix}:${name}`, 1]);
            }
        }

        const service = new AccountService();
        service.create = applyLegacy(service.create);
        await service.create('kapil');

        const rows = await client.raw('SELECT name FROM accounts');
        expect(rows[0].name).toBe('svc:kapil');
    });

    it('passes its options through to the transaction', async () => {
        const run = applyLegacy(
            async function () {
                return 'x';
            },
            {propagation: Propagation.MANDATORY}
        );

        await expect(run()).rejects.toMatchObject({code: 'TRANSACTION_ERROR'});
    });

    it('joins a transaction that is already running', async () => {
        const inner = applyLegacy(async function () {
            await client.raw('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['inner', 1]);
        });

        await expect(
            client.transaction(async () => {
                await inner();
                throw new Error('outer failed');
            })
        ).rejects.toThrow('outer failed');

        /* Joining means the outer rollback takes the decorated work with it. */
        expect(await countRows(client)).toBe(0);
    });

    it('explains itself when no client has been registered', async () => {
        setDefaultClient(null);
        const run = applyLegacy(async function () {
            return 'x';
        });

        await expect(run()).rejects.toMatchObject({code: 'TRANSACTION_ERROR'});
    });

    it('refuses to decorate anything that is not a method', () => {
        expect(() => Transactional()({}, 'field', undefined)).toThrow(/only be placed on a method/);
    });
});

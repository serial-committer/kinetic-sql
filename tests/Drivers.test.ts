import {describe, expect, it, vi} from 'vitest';
import {KineticClient} from '../src/KineticClient.js';
import {MysqlDriver} from '../src/drivers/mysql/MySQLDriver.js';
import {PostgresDriver} from '../src/drivers/postgres/PostgresDriver.js';

/* Neither pool connects until a query runs, so these can be built without a server. */
const mysqlConfig = {
    type: 'mysql',
    host: 'localhost',
    user: 'root',
    database: 'test_db',
    realtimeEnabled: true
};

const pgConfig = {
    type: 'pg',
    connectionString: 'postgres://user:pass@localhost:5432/test_db',
    realtimeEnabled: true
};

describe('MySQLDriver: multiple subscribers per table', () => {
    it('keeps every listener instead of replacing the previous one', async () => {
        const driver = new MysqlDriver(mysqlConfig);

        const first = vi.fn();
        const second = vi.fn();

        await driver.subscribe('users', first);
        await driver.subscribe('users', second);

        expect(driver['subscribers'].get('users')).toHaveLength(2);
    });

    it('removes only the listener that unsubscribed', async () => {
        const driver = new MysqlDriver(mysqlConfig);

        const first = vi.fn();
        const second = vi.fn();

        const subOne = await driver.subscribe('users', first);
        await driver.subscribe('users', second);

        subOne.unsubscribe();

        const remaining = driver['subscribers'].get('users');
        expect(remaining).toHaveLength(1);
        expect(remaining![0]).toBe(second);
    });

    it('drops the table entry once the last listener leaves', async () => {
        const driver = new MysqlDriver(mysqlConfig);

        const sub = await driver.subscribe('users', vi.fn());
        sub.unsubscribe();

        expect(driver['subscribers'].has('users')).toBe(false);
    });

    it('keeps tables independent of each other', async () => {
        const driver = new MysqlDriver(mysqlConfig);

        await driver.subscribe('users', vi.fn());
        await driver.subscribe('orders', vi.fn());

        expect(driver['subscribers'].get('users')).toHaveLength(1);
        expect(driver['subscribers'].get('orders')).toHaveLength(1);
    });
});

describe('PostgresDriver: one shared listening connection', () => {
    /* Stands in for the dedicated postgres.js connection the driver would open. */
    function stubDriver() {
        const driver = new PostgresDriver(pgConfig);

        let notify: ((payload: string) => void) | null = null;
        const end = vi.fn().mockResolvedValue(undefined);
        const listen = vi.fn(async (_channel: string, handler: (payload: string) => void) => {
            notify = handler;
            return {unlisten: vi.fn()};
        });
        const created = vi.fn(() => ({listen, end}));

        (driver as any).createListenerConnection = created;
        /* Trigger creation would otherwise need a real server. */
        (driver.sql as any).unsafe = vi.fn().mockResolvedValue([]);

        return {driver, created, listen, end, emit: (payload: any) => notify!(JSON.stringify(payload))};
    }

    it('opens a single connection no matter how many tables are watched', async () => {
        const {driver, created} = stubDriver();

        await driver.subscribe('users', vi.fn());
        await driver.subscribe('orders', vi.fn());
        await driver.subscribe('payments', vi.fn());

        expect(created).toHaveBeenCalledTimes(1);
    });

    it('delivers an event to every subscriber of that table', async () => {
        const {driver, emit} = stubDriver();

        const first = vi.fn();
        const second = vi.fn();
        await driver.subscribe('users', first);
        await driver.subscribe('users', second);

        emit({table: 'users', action: 'INSERT', data: {id: 1}});

        expect(first).toHaveBeenCalledOnce();
        expect(second).toHaveBeenCalledOnce();
        expect(first.mock.calls[0][0]).toMatchObject({action: 'INSERT'});
    });

    it('does not deliver events meant for another table', async () => {
        const {driver, emit} = stubDriver();

        const users = vi.fn();
        await driver.subscribe('users', users);

        emit({table: 'orders', action: 'INSERT', data: {id: 1}});

        expect(users).not.toHaveBeenCalled();
    });

    it('keeps notifying the others when one subscriber throws', async () => {
        const {driver, emit} = stubDriver();

        const broken = vi.fn(() => {
            throw new Error('listener exploded');
        });
        const healthy = vi.fn();

        await driver.subscribe('users', broken);
        await driver.subscribe('users', healthy);

        expect(() => emit({table: 'users', action: 'INSERT', data: {}})).not.toThrow();
        expect(healthy).toHaveBeenCalledOnce();
    });

    it('survives a payload that is not valid JSON', async () => {
        const {driver} = stubDriver();
        const listener = vi.fn();
        await driver.subscribe('users', listener);

        const notify: (payload: string) => void =
            (driver as any).createListenerConnection.mock.results[0].value.listen.mock.calls[0][1];

        expect(() => notify('not json at all')).not.toThrow();
        expect(listener).not.toHaveBeenCalled();
    });

    it('holds the connection open while any subscriber remains', async () => {
        const {driver, end} = stubDriver();

        const subOne = await driver.subscribe('users', vi.fn());
        await driver.subscribe('orders', vi.fn());

        await subOne.unsubscribe();

        expect(end).not.toHaveBeenCalled();
    });

    it('closes the connection once the last subscriber leaves', async () => {
        const {driver, end} = stubDriver();

        const subOne = await driver.subscribe('users', vi.fn());
        const subTwo = await driver.subscribe('orders', vi.fn());

        await subOne.unsubscribe();
        await subTwo.unsubscribe();

        expect(end).toHaveBeenCalledOnce();
    });

    it('opens a fresh connection after everything was closed', async () => {
        const {driver, created} = stubDriver();

        const sub = await driver.subscribe('users', vi.fn());
        await sub.unsubscribe();
        await driver.subscribe('users', vi.fn());

        expect(created).toHaveBeenCalledTimes(2);
    });
});

describe('prepare(): consistent error reporting', () => {
    it('wraps a SQLite prepare failure in a KineticError', async () => {
        const client = await KineticClient.create({type: 'sqlite', filename: ':memory:'});

        expect(() => client.prepare('SELECT * FROM table_that_does_not_exist'))
            .toThrowError(expect.objectContaining({name: 'KineticError', code: 'QUERY_FAILED'}));

        await client.end();
    });

    it('wraps a SQLite execution failure in a KineticError', async () => {
        const client = await KineticClient.create({type: 'sqlite', filename: ':memory:'});
        await client.raw('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT NOT NULL)');

        const stmt = client.prepare('INSERT INTO t (v) VALUES (?)');

        await expect(stmt.execute([null])).rejects.toMatchObject({
            name: 'KineticError',
            code: 'QUERY_FAILED'
        });

        await client.end();
    });

    it('keeps the original driver error attached for diagnosis', async () => {
        const client = await KineticClient.create({type: 'sqlite', filename: ':memory:'});

        try {
            client.prepare('THIS IS NOT SQL');
            expect.unreachable('prepare should have thrown');
        } catch (err: any) {
            expect(err.code).toBe('QUERY_FAILED');
            expect(err.details).toBeDefined();
        }

        await client.end();
    });

    it('wraps a MySQL prepared execution failure in a KineticError', async () => {
        const driver = new MysqlDriver(mysqlConfig);
        (driver.native as any).execute = vi.fn().mockRejectedValue(
            Object.assign(new Error('Unknown column'), {code: 'ER_BAD_FIELD_ERROR'})
        );

        await expect(driver.prepare('SELECT nope FROM users').execute()).rejects.toMatchObject({
            name: 'KineticError',
            code: 'QUERY_FAILED'
        });
    });

    it('wraps a Postgres prepared execution failure in a KineticError', async () => {
        const driver = new PostgresDriver(pgConfig);
        (driver.sql as any).unsafe = vi.fn().mockRejectedValue(
            Object.assign(new Error('relation does not exist'), {code: '42P01'})
        );

        await expect(driver.prepare('SELECT * FROM nope').execute()).rejects.toMatchObject({
            name: 'KineticError',
            code: 'QUERY_FAILED'
        });
    });
});

describe('SQLiteDriver: multiple subscribers per table', () => {
    it('notifies every listener watching the same table', async () => {
        const client = await KineticClient.create({type: 'sqlite', filename: ':memory:'});
        await client.raw('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');

        const first = vi.fn();
        const second = vi.fn();
        await client.subscribe('t' as never, first);
        await client.subscribe('t' as never, second);

        await client.raw('INSERT INTO t (v) VALUES (?)', ['hello']);
        await new Promise(resolve => setImmediate(resolve));

        expect(first).toHaveBeenCalledOnce();
        expect(second).toHaveBeenCalledOnce();

        await client.end();
    });
});

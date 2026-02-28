// noinspection ES6PreferShortImport

import {describe, it, expect, vi} from 'vitest';
import {KineticClient} from '../src/KineticClient.js';
import type {KineticMiddleware} from '../src/typings/middleware-interfaces.js';

describe('KineticClient Middleware Engine', () => {
    it('should execute middleware hooks in the correct order', async () => {
        const client = await KineticClient.create({
            type: 'sqlite',
            filename: ':memory:'
        });

        const beforeMock = vi.fn();
        const afterMock = vi.fn();
        const testPlugin: KineticMiddleware = {
            name: 'TestPlugin',
            beforeQuery: beforeMock,
            afterQuery: afterMock,
        };

        client.use(testPlugin);

        vi.spyOn(client['driver'], 'raw').mockResolvedValue([{id: 1}]);

        await client.raw('SELECT * FROM users');

        expect(beforeMock).toHaveBeenCalledOnce();
        expect(afterMock).toHaveBeenCalledOnce();

        const ctxArg = beforeMock.mock.calls[0][0];
        expect(ctxArg.operation).toBe('raw');
        expect(ctxArg.sqlOrName).toBe('SELECT * FROM users');
        expect(typeof ctxArg.startTime).toBe('bigint');
    });
});

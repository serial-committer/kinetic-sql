import {describe, it, expect} from 'vitest';
import {KineticError} from '../src/utils/KineticError.js';

describe('KineticError', () => {
    it('should correctly set standard error properties', () => {
        const error = new KineticError('CONFIG_ERROR', 'Invalid connection string');

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(KineticError);

        expect(error.name).toBe('KineticError');
        expect(error.code).toBe('CONFIG_ERROR');
        expect(error.message).toBe('Invalid connection string');
        expect(error.details).toBeUndefined();
    });

    it('should properly store original error details', () => {
        const originalError = new TypeError('Cannot read properties of undefined');
        const error = new KineticError('QUERY_FAILED', 'Failed to execute raw query', originalError);

        expect(error.code).toBe('QUERY_FAILED');
        expect(error.details).toBe(originalError);
        expect(error.details.message).toBe('Cannot read properties of undefined');
    });
});

export type KineticErrorCode =
    | 'CONFIG_ERROR'
    | 'CONNECTION_FAILED'
    | 'QUERY_FAILED'
    | 'RPC_ERROR'
    | 'REALTIME_ERROR'
    | 'INTERNAL_ERROR';

export class KineticError extends Error {
    public readonly code: KineticErrorCode;
    public readonly details?: any;

    constructor(code: KineticErrorCode, message: string, originalError?: any) {
        super(message);
        this.name = 'KineticError';
        this.code = code;
        this.details = originalError;

        // Fix for extending built-in Error class in TypeScript
        Object.setPrototypeOf(this, KineticError.prototype);
    }
}

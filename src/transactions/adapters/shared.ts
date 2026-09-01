import {KineticError} from '../../utils/KineticError.js';

/* SAVEPOINT names cannot be parameterised, so identifiers are validated instead. */
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function sanitizeIdentifier(name: string): string {
    if (!SAFE_IDENTIFIER.test(name)) {
        throw new KineticError(
            'TRANSACTION_ERROR',
            `Invalid savepoint name "${name}". Use letters, digits and underscores only.`
        );
    }
    return name;
}

/* Pulls a comparable code off a driver error, whatever shape it arrives in. */
export function extractErrorCode(error: any): string[] {
    if (!error) return [];

    const codes: string[] = [];
    if (typeof error.code === 'string') codes.push(error.code);
    if (typeof error.errno === 'number') codes.push(String(error.errno));
    if (typeof error.sqlState === 'string') codes.push(error.sqlState);

    /* Driver errors wrapped by KineticError keep the original underneath. */
    if (error.details) codes.push(...extractErrorCode(error.details));

    return codes;
}

/* True when any code carried by the error appears in the retryable list. */
export function matchesRetryableCode(error: any, retryable: readonly string[]): boolean {
    const codes = extractErrorCode(error);
    return codes.some(code => retryable.includes(code));
}

/**
 * Serialises access to a resource that cannot be shared concurrently.
 * Callers await a ticket and invoke it once they are finished.
 */
export class AsyncMutex {
    private tail: Promise<void> = Promise.resolve();

    async acquire(): Promise<() => void> {
        let releaseFn!: () => void;
        const held = new Promise<void>(resolve => {
            releaseFn = resolve;
        });

        const previous = this.tail;
        this.tail = previous.then(() => held);

        await previous;
        return releaseFn;
    }
}

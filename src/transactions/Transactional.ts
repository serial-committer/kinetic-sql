import type {TransactionOptions} from '../typings/transaction-interfaces.js';
import {KineticError} from '../utils/KineticError.js';
import {getDefaultClient} from './registry.js';

/* Wraps a method so every call runs inside a transaction. */
function wrap(original: (...args: any[]) => any, options: TransactionOptions) {
    /* Async so a setup failure arrives as a rejection rather than a synchronous throw. */
    return async function (this: any, ...args: any[]) {
        return getDefaultClient().transaction(options, async () => original.apply(this, args));
    };
}

/**
 * Runs the decorated method inside a transaction, the way Spring's @Transactional
 * does. Queries made by the method join it automatically, so nothing has to be
 * passed in. Works with both legacy and standard TypeScript decorators.
 */
export function Transactional(options: TransactionOptions = {}): any {
    return function (...args: any[]) {
        const [first, second, third] = args;

        /* Standard decorators: (value, context) */
        if (typeof first === 'function' && second && typeof second === 'object' && 'kind' in second) {
            if (second.kind !== 'method') {
                throw new KineticError('TRANSACTION_ERROR', '@Transactional() can only be placed on a method.');
            }
            return wrap(first, options);
        }

        /* Legacy decorators: (target, propertyKey, descriptor) */
        if (third && typeof third.value === 'function') {
            third.value = wrap(third.value, options);
            return third;
        }

        throw new KineticError('TRANSACTION_ERROR', '@Transactional() can only be placed on a method.');
    };
}

import type {TransactionOptions} from '../typings/transaction-interfaces.js';
import {KineticError} from '../utils/KineticError.js';

/* Structural type, so the registry never has to import the client itself. */
export interface TransactionCapableClient {
    transaction<T>(options: TransactionOptions, callback: (tx: any) => Promise<T>): Promise<T>;
}

let defaultClient: TransactionCapableClient | null = null;

/**
 * Records the client the decorator should use. The first client created claims
 * the slot, which covers the single-database setup almost every app has.
 */
export function registerDefaultClient(client: TransactionCapableClient): void {
    if (!defaultClient) defaultClient = client;
}

/* Points the decorator at a specific client when an app runs more than one. */
export function setDefaultClient(client: TransactionCapableClient | null): void {
    defaultClient = client;
}

export function getDefaultClient(): TransactionCapableClient {
    if (!defaultClient) {
        throw new KineticError(
            'TRANSACTION_ERROR',
            'No Kinetic client is registered. Create one with KineticClient.create() before a decorated method runs, ' +
            'or select one explicitly with setDefaultClient().'
        );
    }
    return defaultClient;
}

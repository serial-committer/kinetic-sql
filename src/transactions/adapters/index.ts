import type {ITransactionAdapter} from '../../typings/transaction-interfaces.js';
import {KineticError} from '../../utils/KineticError.js';
import {PostgresTxAdapter} from './PostgresTxAdapter.js';
import {MySQLTxAdapter} from './MySQLTxAdapter.js';
import {SQLiteTxAdapter} from './SQLiteTxAdapter.js';

/**
 * Builds the transaction adapter for a driver.
 * The native handle is the same pool the driver already runs its queries on.
 */
export function createTransactionAdapter(type: string, native: any): ITransactionAdapter {
    switch (type) {
        case 'pg':
            return new PostgresTxAdapter(native);
        case 'mysql':
            return new MySQLTxAdapter(native);
        case 'sqlite':
            return new SQLiteTxAdapter(native);
        default:
            throw new KineticError('TRANSACTION_ERROR', `Transactions are not supported for type: ${type}`);
    }
}

export {PostgresTxAdapter, MySQLTxAdapter, SQLiteTxAdapter};

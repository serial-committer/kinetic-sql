import type {TransactionInfo} from './transaction-interfaces.js';

/* -- MIDDLEWARE INTERFACES -- */
export interface QueryContext {
    operation: 'raw' | 'rpc' | 'prepare';
    sqlOrName: string;
    params: any;
    meta: Record<string, any>;
    startTime: bigint;

    /* Set when the query runs inside a transaction, for grouping related queries. */
    txId?: string;
}

export interface KineticMiddleware {
    name: string;
    beforeQuery?: (ctx: QueryContext) => void | Promise<void>;
    afterQuery?: (ctx: QueryContext, result: any) => void | Promise<void>;
    onError?: (ctx: QueryContext, error: Error) => void | Promise<void>;

    /* -- TRANSACTION LIFECYCLE -- */
    onTransactionBegin?: (info: TransactionInfo) => void | Promise<void>;
    onTransactionCommit?: (info: TransactionInfo) => void | Promise<void>;
    onTransactionRollback?: (info: TransactionInfo, error?: Error) => void | Promise<void>;
}

export {KineticClient} from './KineticClient.js';
export type {KineticConfig, KineticSchema, Register} from './KineticClient.js';
export type { KineticMiddleware } from './typings/middleware-interfaces.js'
export {sql, eq, desc, asc, and, or} from 'drizzle-orm';

/* -- TRANSACTIONS -- */
export {Propagation, Isolation} from './transactions/constants.js';
export {KineticTransaction} from './transactions/KineticTransaction.js';
export {KineticError} from './utils/KineticError.js';
export type {KineticErrorCode} from './utils/KineticError.js';
export type {ErrorMatcher, TransactionInfo, TransactionOptions} from './typings/transaction-interfaces.js';
export {Transactional} from './transactions/Transactional.js';
export {setDefaultClient} from './transactions/registry.js';

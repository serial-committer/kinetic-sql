/* -- MIDDLEWARE INTERFACES -- */
export interface QueryContext {
    operation: 'raw' | 'rpc' | 'prepare';
    sqlOrName: string;
    params: any;
    meta: Record<string, any>;
    startTime: bigint;
}

export interface KineticMiddleware {
    name: string;
    beforeQuery?: (ctx: QueryContext) => void | Promise<void>;
    afterQuery?: (ctx: QueryContext, result: any) => void | Promise<void>;
    onError?: (ctx: QueryContext, error: Error) => void | Promise<void>;
}

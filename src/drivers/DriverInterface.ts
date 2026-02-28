export interface IDriver {
    init(): Promise<void>;

    rpc(name: string, params: any): Promise<{ data: any; error: any }>;

    subscribe(table: string, cb: (data: any) => void): Promise<{ unsubscribe: () => void }>;

    end(): Promise<void>;

    raw(sql: string, params?: any[]): Promise<any>;

    readonly native: any;

    prepare(sql: string): { execute: (params?: any[]) => Promise<any> };
}

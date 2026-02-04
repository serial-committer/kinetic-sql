export interface IDriver {
    rpc(name: string, params: any): Promise<{ data: any; error: any }>;

    subscribe(table: string, cb: (data: any) => void): Promise<{ unsubscribe: () => void }>;

    end(): Promise<void>;

    raw: any;
}

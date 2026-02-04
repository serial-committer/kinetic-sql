declare module '@rodrigogs/mysql-events' {
    import {EventEmitter} from 'events';

    export default class MySQLEvents extends EventEmitter {
        static STATEMENTS: {
            ALL: number;
            INSERT: number;
            UPDATE: number;
            DELETE: number;
        };

        constructor(dsn: any, options?: any);

        start(): Promise<void>;

        stop(): Promise<void>;

        addTrigger(options: {
            name: string;
            expression: string;
            statement: any;
            onEvent: (event: any) => void;
        }): void;
    }
}

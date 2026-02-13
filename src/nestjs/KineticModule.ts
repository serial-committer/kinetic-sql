import {type DynamicModule, Global, Module, type Provider} from '@nestjs/common';
import {Inject} from '@nestjs/common';
import {KineticClient, type KineticConfig} from '../KineticClient.js';

/* Constants for Injection Tokens */
export const KINETIC_DB = 'KINETIC_DB';
export const KINETIC_OPTIONS = 'KINETIC_OPTIONS';

@Global()
@Module({})
export class KineticModule {
    static forRoot(config: KineticConfig): DynamicModule {
        /* The Configuration Provider (Optional) */
        const optionsProvider: Provider = {
            provide: KINETIC_OPTIONS,
            useValue: config,
        };

        /* The Database Connection Provider */
        const dbProvider: Provider = {
            provide: KINETIC_DB,
            useFactory: async () => {
                return await KineticClient.create(config);
            },
        };

        return {
            module: KineticModule,
            providers: [optionsProvider, dbProvider],
            exports: [dbProvider],
        };
    }
}

export const InjectDB = () => Inject(KINETIC_DB);

import {type DynamicModule, Global, Inject, Logger, Module, type OnModuleInit, type Provider} from '@nestjs/common';
import {KineticClient, type KineticConfig} from '../KineticClient.js';
import path from "path";
import fs from "fs";
import {MISSING_SCHEMA_ERROR} from "../utils/constants.js";

/* Constants for Injection Tokens */
export const KINETIC_DB = 'KINETIC_DB';
export const KINETIC_OPTIONS = 'KINETIC_OPTIONS';

@Global()
@Module({})
export class KineticModule implements OnModuleInit {
    private readonly logger = new Logger('KineticSQL');

    onModuleInit() {
        this.checkGen();
    }

    private checkGen() {
        const manifestPath = path.resolve(process.cwd(), 'kinetic-schema', 'manifest.json');

        if (!fs.existsSync(manifestPath)) {
            this.logger.error(MISSING_SCHEMA_ERROR);
            process.exit(1);
        }
    }

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

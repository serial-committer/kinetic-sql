import {type DynamicModule, Global, Inject, Logger, Module, type OnModuleInit, type Provider} from '@nestjs/common';
import {KineticClient, type KineticConfig} from '../KineticClient.js';
import path from "path";
import fs from "fs";
import {MISSING_SCHEMA_ERROR} from "../utils/constants.js";
import type {KineticMiddleware} from "../typings/middleware-interfaces.js";

/* Constants for Injection Tokens */
export const KINETIC_DB = 'KINETIC_DB';
export const KINETIC_OPTIONS = 'KINETIC_OPTIONS';

/* Interface for Enterprise Async Configuration */
export interface KineticModuleAsyncOptions {
    imports?: any[];
    inject?: any[];
    useFactory: (
        ...args: any[]
    ) => Promise<{ config: KineticConfig; middlewares?: KineticMiddleware[] }> | { config: KineticConfig; middlewares?: KineticMiddleware[] };
}

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
        /* The Configuration Provider (Synchronous) */
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

    static forRootAsync(options: KineticModuleAsyncOptions): DynamicModule {
        /* The Configuration Provider (Asynchronous) */
        const optionsProvider: Provider = {
            provide: KINETIC_OPTIONS,
            useFactory: options.useFactory,
            inject: options.inject || [],
        };

        /* The Database Connection Provider (Resolves Config + Middlewares) */
        const dbProvider: Provider = {
            provide: KINETIC_DB,
            inject: [KINETIC_OPTIONS],
            useFactory: async (resolvedOptions: { config: KineticConfig; middlewares?: KineticMiddleware[] }) => {
                const client = await KineticClient.create(resolvedOptions.config);

                /* Register any plugins provided in the async factory */
                if (resolvedOptions.middlewares && resolvedOptions.middlewares.length > 0) {
                    for (const mw of resolvedOptions.middlewares) {
                        client.use(mw);
                    }
                }

                return client;
            },
        };

        return {
            module: KineticModule,
            imports: options.imports || [],
            providers: [optionsProvider, dbProvider],
            exports: [dbProvider],
        };
    }
}

export const InjectDB = () => Inject(KINETIC_DB);

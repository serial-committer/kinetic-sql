import {defineConfig} from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/cli/generate.ts', 'src/nestjs/KineticModule.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: false,
    clean: true,
    minify: true,
    shims: true,
    treeshake: true,
    /* External deps (User has to install them) */
    external: [
        'postgres',
        'drizzle-orm',
        'mysql2',
        '@rodrigogs/mysql-events',
        'better-sqlite3',
        '@nestjs/common',
        '@nestjs/core',
        'rxjs'
    ],
});

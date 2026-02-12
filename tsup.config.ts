import {defineConfig} from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/cli/generate.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: false,
    clean: true,
    minify: true,
    shims: true,
    treeshake: true,
    /* External deps (Don't bundle these, let the user install them) */
    external: [
        'postgres',
        'drizzle-orm',
        'mysql2',
        '@rodrigogs/mysql-events',
        'better-sqlite3'
    ],
});

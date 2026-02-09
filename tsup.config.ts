import {defineConfig} from 'tsup';

export default defineConfig({
    // 1. Entry Points: Library + CLI
    entry: ['src/index.ts', 'src/cli/generate.ts'],

    // 2. Output Formats
    format: ['cjs', 'esm'], // Support CommonJS (require) and ESM (import)

    // 3. Declaration Files (The "Signature Only" view)
    dts: true,

    // 4. Code Hiding (Minification)
    minify: true, // This obfuscates the code (vars become a, b, c)
    clean: true,  // Clean dist folder before build

    // 5. Splitting
    splitting: false, // Keep it in one file for simplicity
    sourcemap: false, // Don't ship source maps (prevents "Go to Source")

    // 6. Enable shims for Node.js built-ins
    shims: true,

    // 7. External deps (Don't bundle these, let the user install them)
    external: [
        'postgres',
        'drizzle-orm',
        'mysql2',
        '@rodrigogs/mysql-events',
        'better-sqlite3'
    ],
});

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'scripts/**', 'test-kinetic.ts'],
    },
    {
        rules: {
            // Allows Kinetic-SQL to be flexible with schemas and DB row returns
            '@typescript-eslint/no-explicit-any': 'off',

            // Allows usage of @ts-ignore in unit tests to mock private methods
            '@typescript-eslint/ban-ts-comment': 'off',
        }
    }
];

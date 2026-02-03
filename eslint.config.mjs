import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import perfectionist from 'eslint-plugin-perfectionist';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig( [
    ...nextVitals,
    ...nextTs,
    eslint.configs.recommended,
    tseslint.configs.recommended,
    tseslint.configs.stylistic,
    prettier,
    perfectionist.configs[ 'recommended-natural' ],
    {
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            '@stylistic/block-spacing': ['error', 'always'],
            '@stylistic/comma-dangle': ['error', 'always-multiline'],
            '@stylistic/indent': ['error', 4],
            '@stylistic/jsx-curly-spacing': [
                'error',
                { children: true, when: 'always' },
            ],
            '@stylistic/object-curly-spacing': ['error', 'always'],
            '@stylistic/quotes': ['error', 'single'],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/space-in-parens': ['error', 'always'],
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['**/*.{ts,tsx,js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: {
                    ecmaVersion: 'latest',
                    jsx: true,
                },
                projectService: true,
            },
            sourceType: 'module',
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin,
        },
    },
    {
        rules: {
            '@typescript-eslint/ban-ts-comment': [
                'warn',
                {
                    minimumDescriptionLength: 3,
                    'ts-check': false,
                    'ts-expect-error': 'allow-with-description',
                    'ts-ignore': true,
                    'ts-nocheck': true,
                },
            ],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    disallowTypeAnnotations: false,
                    fixStyle: 'inline-type-imports',
                    prefer: 'type-imports',
                },
            ],
            '@typescript-eslint/no-empty-object-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^(_|ignore)',
                    destructuredArrayIgnorePattern: '^_',
                    ignoreRestSiblings: false,
                    vars: 'all',
                    varsIgnorePattern: '^_',
                },
            ],
            'no-unused-vars': 'off',
            'perfectionist/sort-enums': [
                'error',
                {
                    fallbackSort: { type: 'unsorted' },
                    forceNumericSort: false,
                    ignoreCase: true,
                    newlinesBetween: 'ignore',
                    order: 'asc',
                    partitionByComment: false,
                    partitionByNewLine: false,
                    sortByValue: false,
                    specialCharacters: 'keep',
                    type: 'alphabetical',
                },
            ],
            'perfectionist/sort-exports': [
                'error',
                {
                    fallbackSort: { type: 'unsorted' },
                    groupKind: 'mixed',
                    ignoreCase: true,
                    newlinesBetween: 'ignore',
                    order: 'asc',
                    partitionByComment: false,
                    partitionByNewLine: false,
                    specialCharacters: 'keep',
                    type: 'alphabetical',
                },
            ],
            'perfectionist/sort-imports': [
                'error',
                {
                    fallbackSort: { order: 'asc', type: 'natural' },
                    ignoreCase: true,
                    internalPattern: ['^~/.+', '^@/.+'],
                    newlinesBetween: 1,
                    order: 'asc',
                    partitionByComment: false,
                    partitionByNewLine: false,
                    specialCharacters: 'keep',
                    type: 'natural',
                },
            ],
            'perfectionist/sort-jsx-props': [
                'error',
                {
                    type: 'unsorted',
                    /*
                        customGroups: {
                            accessibility: [
                                'alt',
                                'title',
                                'aria-label',
                                'aria-labelledby',
                                'aria-describedby',
                                'aria-controls',
                                'aria-expanded',
                                'aria-pressed',
                            ],
                            events: [
                                'onClick',
                                'onFocus',
                                'onBlur',
                                'onKeyDown',
                                'onKeyUp',
                                'onMouseEnter',
                                'onMouseLeave',
                                'onLoad',
                                'onError',
                            ],
                            form: ['type', 'name', 'value', 'role'],
                            identity: ['key', 'ref', 'id'],
                            last: ['children'],
                            layout: ['width', 'height', 'fill'],
                            performance: ['loading', 'priority', 'placeholder', 'blurDataURL', 'quality'],
                            source: ['src', 'srcSet', 'sizes'],
                            state: ['disabled', 'tabIndex', 'autoFocus'],
                            visuals: ['className', 'variant', 'size', 'style', 'data-*'],
                        },
                        groups: [
                            'identity',
                            'form',
                            'source',
                            'accessibility',
                            'layout',
                            'performance',
                            'state',
                            'events',
                            'visuals',
                            'multiline',
                            'unknown',
                            'shorthand',
                            'last',
                        ],
                        order: 'asc',
                    */
                },
            ],
            'perfectionist/sort-named-imports': [
                'error',
                {
                    fallbackSort: { type: 'unsorted' },
                    groupKind: 'mixed',
                    ignoreAlias: false,
                    ignoreCase: true,
                    newlinesBetween: 'ignore',
                    order: 'asc',
                    partitionByComment: false,
                    partitionByNewLine: false,
                    specialCharacters: 'keep',
                    type: 'alphabetical',
                },
            ],
            'perfectionist/sort-objects': [
                'error',
                {
                    type: 'unsorted',
                    /*
                        destructuredObjects: true,
                        fallbackSort: { type: 'unsorted' },
                        ignoreCase: true,
                        newlinesBetween: 'ignore',
                        objectDeclarations: true,
                        order: 'asc',
                        partitionByComment: false,
                        partitionByNewLine: false,
                        specialCharacters: 'keep',
                        styledComponents: true,
                        type: 'alphabetical',
                    */
                },
            ],
            'perfectionist/sort-interfaces': [
                'error',
                {
                    type: 'unsorted',
                },
            ],
        },
        /*'perfectionist/sort-interfaces': 'off',*/
    },
    {
        ignores: ['.next/', 'next-env.d.ts', 'payload/payload-types.ts', 'app/**/importMap.js'],
    },
] );

export default eslintConfig;

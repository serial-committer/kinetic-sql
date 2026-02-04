#!/usr/bin/env node
import postgres from 'postgres';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);

/*  -- TYPE MAPPINGS -- */
const PG_TYPE_MAP: Record<string, string> = {
    text: 'string', varchar: 'string', char: 'string', uuid: 'string',
    int2: 'number', int4: 'number', int8: 'number', float4: 'number', float8: 'number', numeric: 'number',
    bool: 'boolean', json: 'any', jsonb: 'any',
    date: 'string', timestamp: 'string', timestamptz: 'string',
    bytea: 'Buffer', _text: 'string[]', _int4: 'number[]'
};

const MYSQL_TYPE_MAP: Record<string, string> = {
    varchar: 'string', char: 'string', text: 'string', longtext: 'string',
    int: 'number', tinyint: 'number', smallint: 'number', mediumint: 'number', bigint: 'number',
    float: 'number', double: 'number', decimal: 'number',
    datetime: 'string', date: 'string', timestamp: 'string',
    json: 'any', blob: 'Buffer', longblob: 'Buffer',
    /*  Common MySQL boolean convention */
    tinyint1: 'boolean'
};

/*  -- ARGUMENT PARSING -- */
function parseArgs() {
    const args = process.argv.slice(2);
    /*  Default to pg */
    const config: Record<string, string> = {type: 'pg'};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.replace(/^--/, '');
            if (key.includes('=')) {
                const [k, v] = key.split('=');
                config[k] = v;
            } else if (args[i + 1] && !args[i + 1].startsWith('--')) {
                config[key] = args[i + 1];
                i++;
            }
        }
    }
    return config;
}

function findProjectRoot(startDir: string): string {
    let currentDir = startDir;
    while (currentDir !== path.parse(currentDir).root) {
        if (fs.existsSync(path.join(currentDir, 'package.json'))) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }
    return startDir;
}

/*  -- GENERATORS -- */
async function generatePostgres(config: any) {
    let sql: postgres.Sql;
    if (config.connection) {
        sql = postgres(config.connection, {max: 1});
    } else {
        sql = postgres({
            host: config.host || 'localhost',
            port: Number(config.port) || 5432,
            user: config.user || 'postgres',
            password: config.password || '',
            database: config.db || 'postgres',
            max: 1
        });
    }

    try {
        const columns = await sql`
            SELECT table_name, column_name, udt_name, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;`;

        const functions = await sql`
            SELECT p.proname                        as function_name,
                   pg_get_function_arguments(p.oid) as args_raw,
                   t.typname                        as return_type
            FROM pg_proc p
                     JOIN pg_type t ON p.prorettype = t.oid
                     JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public';`;

        return {columns, functions, typeMap: PG_TYPE_MAP};
    } finally {
        await sql.end();
    }
}

async function generateMysql(config: any) {
    const conn = await mysql.createConnection({
        host: config.host || 'localhost',
        user: config.user || 'root',
        password: config.password || '',
        database: config.db,
        port: Number(config.port) || 3306
    });

    try {
        const [columns]: any = await conn.execute(`
            SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name, DATA_TYPE as udt_name, IS_NULLABLE as is_nullable
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME, ORDINAL_POSITION`,
            [config.db]);

        /*  MySQL Procedures (Simple version: we just get names for now) */
        const [routines]: any = await conn.execute(`
            SELECT ROUTINE_NAME as function_name
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_SCHEMA = ?
              AND ROUTINE_TYPE = 'PROCEDURE'`,
            [config.db]);

        return {columns, functions: routines, typeMap: MYSQL_TYPE_MAP};
    } finally {
        await conn.end();
    }
}

/*  -- MAIN -- */
async function main() {
    const args = parseArgs();
    console.log(`🔮 Kinetic SQL: Introspecting ${args.type === 'mysql' ? 'MySQL' : 'PostgreSQL'}...`);

    try {
        let result;
        if (args.type === 'mysql') {
            result = await generateMysql(args);
        } else {
            result = await generatePostgres(args);
        }

        const {columns, functions, typeMap} = result;
        const tables: Record<string, string[]> = {};

        for (const col of columns) {
            if (!tables[col.table_name]) tables[col.table_name] = [];

            /*  Special handling for MySQL tinyint(1) -> boolean */
            let tsType = typeMap[col.udt_name] || 'any';
            if (args.type === 'mysql' && col.udt_name === 'tinyint') {
                /* In MySQL, tinyint is often used as boolean, but we can default to number to be safe or check column type string like "tinyint(1)" if we had it.*/
                tsType = 'number';
            }

            const nullable = col.is_nullable === 'YES' ? '| null' : '';
            tables[col.table_name].push(`                ${col.column_name}: ${tsType}${nullable};`);
        }

        let content = `// Auto-generated by Kinetic SQL ⚠️ Do NOT import this file manually.\n\nimport 'kinetic-sql';\n\ndeclare module 'kinetic-sql' {\n    export interface Register {\n        schema: {\n            tables: {\n`;

        for (const [tableName, cols] of Object.entries(tables)) {
            content += `            ${tableName}: {\n${cols.join('\n')}\n            };\n`;
        }

        content += `            };\n            functions: {\n`;

        for (const fn of functions) {
            content += `                ${fn.function_name}: {\n                    args: Record<string, any>;\n                    returns: any;\n                };\n`;
        }

        content += `            };\n        };\n    }\n}\n`;

        const projectRoot = findProjectRoot(process.cwd());
        const outputPath = path.resolve(projectRoot, 'kinetic-schema', 'kinetic-env.d.ts');

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});

        fs.writeFileSync(outputPath, content);
        console.log(`✅ Generated types at: ${outputPath}`);

    } catch (err) {
        console.error("❌ Generation failed:", err);
        process.exit(1);
    }
}

main().then(() => console.log(`Auto-complete types generated successfully ✨`));

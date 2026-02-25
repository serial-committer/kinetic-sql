#!/usr/bin/env node
import postgres from 'postgres';
import mysql from 'mysql2/promise';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {showBanner} from "../utils/constants.js";

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

const SQLITE_TYPE_MAP: Record<string, string> = {
    integer: 'number', int: 'number', smallint: 'number', bigint: 'number',
    text: 'string', varchar: 'string', char: 'string', clob: 'string',
    blob: 'Buffer',
    real: 'number', double: 'number', float: 'number', numeric: 'number',
    boolean: 'boolean', bool: 'boolean'
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

        /*  MySQL Procedures (Simple version: get names - will be upgraded in future releases) */
        const [routines]: any = await conn.execute(`
            SELECT ROUTINE_NAME as function_name
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_SCHEMA = ?
              AND ROUTINE_TYPE = 'PROCEDURE'`,
            [config.db]);

        return {columns, functions: routines, typeMap: MYSQL_TYPE_MAP};
    } finally {
        conn.end();
    }
}

async function generateSqlite(config: any) {
    // Resolve DB path (support --db, --filename, or --connection)
    const dbPath = config.db || config.filename || config.connection;
    if (!dbPath) {
        throw new Error('❌ Missing SQLite file path. Usage: k-sql gen --type=sqlite --db=./dev.db');
    }

    const db = new Database(dbPath, {readonly: true});

    try {
        // Get Tables
        const tables: any[] = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all();

        const allColumns = [];

        // Loop tables and get columns via PRAGMA
        for (const tbl of tables) {
            const tableInfo: any[] = db.prepare(`PRAGMA table_info('${tbl.name}')`).all();

            for (const col of tableInfo) {
                // clean type (e.g. "VARCHAR(255)" -> "varchar")
                let cleanType = (col.type || 'text').split('(')[0].toLowerCase().trim();

                allColumns.push({
                    table_name: tbl.name,
                    column_name: col.name,
                    udt_name: cleanType,
                    is_nullable: col.notnull === 1 ? 'NO' : 'YES' // SQLite: 1=NOT NULL
                });
            }
        }

        return {columns: allColumns, functions: [], typeMap: SQLITE_TYPE_MAP};
    } finally {
        db.close();
    }
}

function generateMarkerFile() {
    const schemaDir = path.resolve(process.cwd(), 'kinetic-schema');
    if (!fs.existsSync(schemaDir)) fs.mkdirSync(schemaDir, {recursive: true});

    fs.writeFileSync(
        path.join(schemaDir, 'manifest.json'),
        JSON.stringify({generatedAt: new Date().toISOString(), version: '1.0.0'})
    );
}

/*  -- MAIN -- */
async function main() {
    const args = parseArgs();
    console.log(`🔮 Kinetic SQL: Introspecting ${args.type || 'pg'}...`);

    try {
        let result;
        if (args.type === 'mysql') {
            result = await generateMysql(args);
        } else if (args.type === 'sqlite') {
            result = await generateSqlite(args);
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
                /* In MySQL, tinyint is used as boolean, default to number to be safe */
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
        const manifestPath = path.resolve(projectRoot, 'kinetic-schema', 'manifest.json');

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});

        fs.writeFileSync(outputPath, content);
        console.log(`✅ Generated types at: ${outputPath}`);
        generateMarkerFile();
        console.log(`✅ Generated manifest at: ${manifestPath}`);

        try {
            showBanner();
        } catch (e) {
            console.info("⚠️ Banner generation failed, but required files generated ✔️");
            console.info("---- 🚀 You can continue using Kinetic SQL ✨ ----");
        }

    } catch (err) {
        console.error("❌ Generation failed:", err);
        process.exit(1);
    }
}

main().then(() => console.log(`Setup completed successfully ✨`));

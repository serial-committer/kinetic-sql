import {ACCENT, ACTION, ALERT, ARROW, BOLD, DIM, DOT, LINK, TICK, charge, header, paint, rule} from './terminal.js';

export const ISSUES_URL = 'https://github.com/serial-committer/kinetic-sql/issues';
export const REPO_URL = 'https://github.com/serial-committer/kinetic-sql';

const GEN_EXAMPLES = [
    ['Postgres (default)', 'npx k-sql gen --connection "postgres://user:pass@localhost:5432/mydb"'],
    ['MySQL', 'npx k-sql gen --type mysql --host localhost --user root --db mydb'],
    ['SQLite', 'npx k-sql gen --type sqlite --db ./dev.db']
];

const examples = GEN_EXAMPLES
    .map(([label, cmd]) => `  ${paint(label, DIM)}\n     ${paint(cmd, ACTION)}`)
    .join('\n');

/**
 * Printed when the client starts without a generated schema.
 *
 * This reaches exactly the people who skipped setup, which makes it the most
 * valuable place in the library to be clear rather than loud.
 */
export const MISSING_SCHEMA_ERROR = `
${header('SETUP INCOMPLETE')}

  ${paint('No generated schema found, so there are no types to load.', BOLD)}

  Kinetic SQL reads your database once and writes the types it finds.
  That has not happened yet in this project.

     ${paint(ARROW, ACCENT)} ${paint('npx k-sql gen', BOLD + ACTION)}

${examples}

  ${paint(`This writes kinetic-schema/, which the client loads on startup.`, DIM)}
  ${paint(LINK, ACCENT)} ${paint(ISSUES_URL, DIM)}
`;

export interface GenerationSummary {
    tables: number;
    functions: number;
    outputPath: string;

    /* One of their own table names, so the example proves the types are real. */
    sampleTable?: string;
}

/**
 * Printed after the generator succeeds.
 *
 * The user already knows to run this command, so the job here is to confirm
 * what landed and surface a wrong connection immediately.
 */
export const showBanner = (summary?: GenerationSummary) => {
    const version = process.env.npm_package_version ?? '';

    console.log('');
    console.log(header(version));
    console.log('');

    if (!summary) {
        console.log(`  ${paint(TICK, ACTION)} ${paint('Types generated.', BOLD)}`);
        console.log('');
        console.log(`  ${paint(LINK, ACCENT)} ${paint(ISSUES_URL, DIM)}`);
        console.log('');
        return;
    }

    const {tables, functions, outputPath, sampleTable} = summary;
    const counts = `${tables} ${tables === 1 ? 'table' : 'tables'} ${DOT} ${functions} ${functions === 1 ? 'function' : 'functions'}`;
    const found = tables > 0;

    /* An empty schema is a warning, not a success, so it must not wear a tick. */
    console.log(
        `  ${paint(found ? TICK : '!', found ? ACTION : ALERT)} ` +
        `${paint(found ? 'Types generated.' : 'Nothing to generate.', BOLD)}  ${paint(counts, DIM)}`
    );
    console.log(`  ${paint(LINK, ACCENT)} ${paint(outputPath, DIM)}`);
    console.log('');

    if (!found) {
        /* Almost always a wrong database rather than a genuinely empty one. */
        console.log(`  ${paint('No tables were found in that database.', ALERT)}`);
        console.log(`  ${paint('A wrong --db or --connection produces an empty schema like this,', DIM)}`);
        console.log(`  ${paint('so check the target before wiring the client up.', DIM)}`);
    } else {
        console.log(`  ${paint('Your tables and procedures autocomplete from here:', DIM)}`);
        console.log('');
        const example = sampleTable ?? 'your_table';
        console.log(`     ${paint(ARROW, ACCENT)} ${paint(`await client.subscribe('${example}', handler)`, ACTION)}`);
    }

    console.log('');
    console.log(`  ${paint(LINK, ACCENT)} ${paint(ISSUES_URL, DIM)}`);
    console.log('');
};

/* Retained so the rule stays available to anything that renders its own block. */
export {rule, charge};

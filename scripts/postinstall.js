#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BOX_WIDTH = 80;
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const ITALIC = "\x1b[3m";
const BRIGHT = "\x1b[1m";
const WHITE = "\x1b[37m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const RESET_ITALIC = "\x1b[23m";
const RED = "\x1b[38;2;204;9;5m"
const BRIGHT_YELLOW = "\x1b[93m";
const CYAN = "\x1b[38;2;0;149;238m";
const BRIGHT_WHITE_ONLY = "\x1b[97m";
const BRIGHT_WHITE = "\x1b[97m\x1b[40m";
const STYLE = "\x1b[38;2;5;200;120m\x1b[40m";
const DIM_WHITE = "\x1b[38;2;192;192;192m\x1b[40m";

const banner = `
${ CYAN }${ BOLD }
  _  __ _            _   _      
 | |/ /(_)          | | (_)     
 | ' /  _ _ __   ___| |_ _  ___ 
 |  <  | | '_ \\ / _ \\ __| |/ __|
 | . \\ | | | | |  __/ |_| | (__ 
 |_|\\_\\|_|_| |_|\\___|\\__|_|\\___|
${ RESET }
${ GREEN }${ BRIGHT }✨  SQL Real-Time Engine Installed! 🚀${ RESET }`;

process.stdout.write(banner);

/* process.stdout.write(`${ GREEN }${ BRIGHT } Package successfully Installed ✨${ RESET }\n`); */
process.stdout.write("")
process.stdout.write(`${ BRIGHT_YELLOW }📚  Refer to the Package Manger for docs & examples:${ RESET } https://www.npmjs.com/package/kinetic-sql`);
process.stdout.write("")

process.stdout.write(`ℹ️ ${ RED } Please don't forget to run ${RESET}${BRIGHT_WHITE_ONLY}${ITALIC}npx k-sql gen${RESET_ITALIC}${RED} to enable auto-complete and type-safety!`)
process.stdout.write(`${ CYAN }# PostgreSQL (Default)${ RESET }`);
process.stdout.write(`  ${ ITALIC }npx k-sql gen --connection "{CONNECTION_URL}"${ RESET }`);
process.stdout.write(`  ${ ITALIC }OR${ RESET }`);
process.stdout.write(`  ${ ITALIC }npx k-sql gen --type pg --host localhost --user postgres --db mydb${ RESET }\n`);

process.stdout.write(`${ CYAN }# MySQL${ RESET }`);
process.stdout.write(`  ${ ITALIC }npx k-sql gen --type mysql --host localhost --user root --db mydb${ RESET }\n`);

process.stdout.write(`${ CYAN }# SQLite${ RESET }`);
process.stdout.write(`  ${ ITALIC }npx k-sql gen --type sqlite --db ./dev.db${ RESET }\n`);

/*
    process.stdout.write(`${ ITALIC }-----------------------------------------------------------${ RESET }`);
    process.stdout.write(`${ CYAN }Thanks for installing Kinetic-SQL \x1b[33m\u26A1\x1b[0m ${ RESET }`);
    process.stdout.write(`${ BRIGHT_WHITE }Please consider donating to our open collective to: ${ RESET }`);
    process.stdout.write(`- help me maintain this package ${ RESET }`);
    process.stdout.write(` ${ CYAN } AND ${ RESET }`);
    process.stdout.write(`- other projects I am working on constantly to make life easier for the developers.${ RESET }`)
    process.stdout.write(`${ MAGENTA }🍺  Donate: https://opencollective.com/kinetic-ai ${ RESET }`);
    process.stdout.write(`${ ITALIC }-----------------------------------------------------------${ RESET }\n`);
*/


function getVisualWidth(text) {
    const cleanText = text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-m]/g, "");
    let width = 0;
    for ( const char of cleanText ) {
        if ( char === '✨' || char === '❤️' ){
            width += 0;
        } else {
            width += 1;
        }
    }
    return width;
}

/**
 * Helper to log a line inside the box
 * @param {string} text - The text to display
 * @param {string} textColor - The color variable to use for the text
 */
function logBoxLine(text, textColor = WHITE) {
    const currentWidth = getVisualWidth(text);
    const paddingCount = BOX_WIDTH - 4 - currentWidth;
    const padding = " ".repeat(Math.max(0, paddingCount));
    process.stdout.write(`${ STYLE }│ ${ textColor }${ text }${ STYLE }${ padding } │${ RESET }`);
}

process.stdout.write(`${ STYLE }┌${ "─".repeat(BOX_WIDTH - 2) }┐${ RESET }`);
logBoxLine(``);
logBoxLine(`Thanks for installing Kinetic-SQL ❤️  ✨ `, CYAN);
logBoxLine(``);
logBoxLine(`Please consider donating to our open collective to:`, BRIGHT_WHITE);
logBoxLine(`-help me maintain this package`, DIM_WHITE);
logBoxLine(` &`, CYAN);
logBoxLine(`-other projects I am working on constantly`, DIM_WHITE);
logBoxLine(``);
logBoxLine(`🍺  Donate: https://opencollective.com/kinetic-ai`, MAGENTA);
logBoxLine(``);
process.stdout.write(`${ STYLE }└${ "─".repeat(BOX_WIDTH - 2) }┘${ RESET }`);

process.stdout.write("");
process.stdout.write(`${YELLOW}Please submit any feature requests and bug reports @ https://github.com/serial-committer/Kinetic-SQL--Issue-Tracker/issues ${RESET}`);

try {
    const logPath = path.join(process.cwd(), 'kinetic-install.log');
    fs.writeFileSync(logPath, 'Kinetic SQL Post-install Ran Successfully! 🚀\n');
} catch (e) {
    // ignore errors
}

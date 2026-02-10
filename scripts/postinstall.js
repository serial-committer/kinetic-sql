#!/usr/bin/env node

// ANSI Color Codes for the "Bling"
const RESET = "\x1b[0m";
const BRIGHT = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const WHITE = "\x1b[37m";

const banner = `
${ CYAN }${ BRIGHT }
  _  __ _            _   _        ${ MAGENTA } ____   ___  _     
${ CYAN } | |/ /(_)          | | (_)       ${ MAGENTA }/ ___| / _ \\| |    
${ CYAN } | ' /  _ _ __   ___| |_ _  ___   ${ MAGENTA }\\___ \\| | | | |    
${ CYAN } |  <  | | '_ \\ / _ \\ __| |/ __|   ${ MAGENTA }___) | |_| | |___ 
${ CYAN } | . \\ | | | | |  __/ |_| | (__   ${ MAGENTA }|____/ \\__\\_\\_____|
${ CYAN } |_|\\_\\|_|_| |_|\\___|\\__|_|\\___|  ${ RESET }
`;

console.log(banner);
console.log(`${ GREEN }${ BRIGHT } Package successfully Installed ✨${ RESET }\n`);

console.log(`${ WHITE }Please auto generate the schema using the following commands:${ RESET }\n`);

console.log(`${ YELLOW }# PostgreSQL (Default)${ RESET }`);
console.log(`  ${ DIM }npx k-sql gen --connection "{CONNECTION_URL}"${ RESET }`);
console.log(`  ${ DIM }OR${ RESET }`);
console.log(`  ${ DIM }npx k-sql gen --type pg --host localhost --user postgres --db mydb${ RESET }\n`);

console.log(`${ YELLOW }# MySQL${ RESET }`);
console.log(`  ${ DIM }npx k-sql gen --type mysql --host localhost --user root --db mydb${ RESET }\n`);

console.log(`${ YELLOW }# SQLite${ RESET }`);
console.log(`  ${ DIM }npx k-sql gen --type sqlite --db ./dev.db${ RESET }\n`);

console.log(`${ DIM }-----------------------------------------------------------${ RESET }`);
console.log(`${ CYAN }Thanks for installing Kinetic-SQL 🙏${ RESET }`);
console.log(`${ WHITE }Please consider donating to our open collective to help me`);
console.log(`maintain this package and others that I am working on constantly.${ RESET }`);
console.log(`${ MAGENTA }🍻 Donate: https://opencollective.com/kinetic-ai ${ RESET }`);
console.log(`${ DIM }-----------------------------------------------------------${ RESET }\n`);

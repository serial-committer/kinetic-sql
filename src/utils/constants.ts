const BOX_WIDTH = 80;
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const ITALIC = "\x1b[3m";
const BRIGHT = "\x1b[1m";
const WHITE = "\x1b[37m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CONSOLE = "\u203A_"
const MAGENTA = "\x1b[35m";
const RESET_ITALIC = "\x1b[23m";
const RED = "\x1b[38;2;204;9;5m"
const BRIGHT_YELLOW = "\x1b[93m";
const CYAN = "\x1b[38;2;0;149;238m";
const BRIGHT_WHITE_ONLY = "\x1b[97m";
const BRIGHT_WHITE = "\x1b[97m\x1b[40m";
const STYLE = "\x1b[38;2;5;200;120m\x1b[40m";
const DIM_WHITE = "\x1b[38;2;192;192;192m\x1b[40m";

export const MISSING_SCHEMA_ERROR = `
  ❌ ${RED}CRITICAL ERROR: Kinetic SQL Schema not found.${RESET}
      
  ✅ To fix this, please run the generator command: ${BRIGHT_WHITE_ONLY}${ITALIC}${BOLD}${CONSOLE} npx k-sql gen${RESET_ITALIC}
  ${GREEN}${BRIGHT}This will generate the necessary type definitions and runtime schema ✨${RESET}
      
  Here are a few examples to help you get started:
   ${CYAN}${BRIGHT}# PostgreSQL (Default)${RESET}
    ${ITALIC}npx k-sql gen --connection "postgresql://username:password@localhost:5433/mydatabase"${RESET}
    ${ITALIC}OR${RESET}
    ${ITALIC}npx k-sql gen --type pg --host localhost --user username --password pass --port 5433 --db mydatabase${RESET}
   ${CYAN}${BRIGHT}# MySQL${RESET}
    ${ITALIC}npx k-sql gen --type mysql --host localhost --user root --password pass --db mydatabase${RESET}
   ${CYAN}${BRIGHT}# SQLite${RESET}
    ${ITALIC}npx k-sql gen --type sqlite --db ./dev.db${RESET}
        
  ${CYAN}${BRIGHT}Note: ${RESET}There are a lot of optional arguments you can pass to the config when using the library (Not needed for the generator command)
  ${GREEN}${BRIGHT}Please check out the Documentation: ${RESET}https://github.com/serial-committer/Kinetic-SQL--Documentation-and-Issue-Tracker
      
  For any issues with installation or usage: 
  ${RED}Please report them here: ${RESET}https://github.com/serial-committer/Kinetic-SQL--Documentation-and-Issue-Tracker/issues`;

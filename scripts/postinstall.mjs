/**
 * Shown once, after the package is installed as a dependency.
 *
 * Kinetic SQL needs one setup step before its types exist, so this points at
 * that step and then gets out of the way. It degrades to plain text in CI and
 * anywhere colour is unwelcome, and it must never fail an install.
 */

const env = process.env;

/* -- BRAND -- */
const CURRENT_FROM = [0, 149, 238];   /* cyan */
const CURRENT_TO = [5, 200, 120];     /* green */

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

/* -- CAPABILITIES -- */
const noColor = 'NO_COLOR' in env && env.NO_COLOR !== '';
const forceColor = Boolean(env.FORCE_COLOR) && env.FORCE_COLOR !== '0';
const isTTY = Boolean(process.stdout.isTTY);
const isCI = Boolean(env.CI);

const colour = !noColor && (forceColor || (isTTY && !isCI));
const trueColour = colour && /truecolor|24bit/i.test(env.COLORTERM ?? '');

/* Legacy Windows consoles render box drawing and emoji as noise. */
const unicode = isTTY && (
    process.platform !== 'win32' ||
    Boolean(env.WT_SESSION) ||
    env.TERM_PROGRAM === 'vscode' ||
    Boolean(env.ConEmuTask)
);

const version = env.npm_package_version || '';

/* -- COLOUR HELPERS -- */
const paint = (text, open) => (colour ? `${open}${text}${RESET}` : text);

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

/**
 * Runs a colour along a string so the wordmark and rule read as one current
 * moving left to right. Falls back to a flat colour without truecolor support.
 */
function charge(text) {
    if (!colour) return text;
    if (!trueColour) return `\x1b[36m${text}${RESET}`;

    const chars = [...text];
    const last = chars.length - 1 || 1;

    return chars
        .map((ch, i) => {
            const t = i / last;
            const r = lerp(CURRENT_FROM[0], CURRENT_TO[0], t);
            const g = lerp(CURRENT_FROM[1], CURRENT_TO[1], t);
            const b = lerp(CURRENT_FROM[2], CURRENT_TO[2], t);
            return `\x1b[38;2;${r};${g};${b}m${ch}`;
        })
        .join('') + RESET;
}

const out = (line = '') => process.stdout.write(`${line}\n`);

/* -- RENDERERS -- */

/* CI and piped output get the facts and nothing else. */
function renderPlain() {
    out(`kinetic-sql${version ? ` ${version}` : ''} installed.`);
    out('Next step: npx k-sql gen   (reads your schema and generates the types)');
    out('Docs: https://github.com/serial-committer/kinetic-sql');
}

function renderBanner() {
    const bolt = unicode ? '⚡ ' : '';
    const rule = (unicode ? '━' : '-').repeat(52);
    const arrow = unicode ? '❯' : '>';
    const link = unicode ? '→' : '->';

    const wordmark = `${bolt}KINETIC SQL`;

    /* The bolt occupies two columns but counts as one character. */
    const width = wordmark.length + (bolt ? 1 : 0);
    const pad = Math.max(1, 52 - width - version.length);

    out();
    out(`  ${paint(charge(wordmark), BOLD)}${' '.repeat(pad)}${paint(version, DIM)}`);
    out(`  ${charge(rule)}`);
    out();
    out(`  ${paint('One step left.', BOLD)} Point it at your database:`);
    out();
    out(`     ${paint(arrow, '\x1b[38;5;39m')} ${paint('npx k-sql gen', BOLD + '\x1b[38;5;48m')}`);
    out();
    out(paint('  It reads your live schema and writes the types, so every table,', DIM));
    out(paint('  column and stored procedure autocompletes as you write it.', DIM));
    out();
    out(paint('  Postgres by default. Add --type mysql or --type sqlite', DIM));
    out(`  ${paint(link, '\x1b[38;5;39m')} ${paint('github.com/serial-committer/kinetic-sql', DIM)}`);
    out();
}

/* -- ENTRY -- */
try {
    /* Only greet the people installing it, not the people building it. */
    const isDependency = import.meta.url.includes('node_modules');
    const forced = Boolean(env.KINETIC_BANNER);

    if (isDependency || forced) {
        if (colour || isTTY) renderBanner();
        else renderPlain();
    }
} catch {
    /* A greeting is never worth breaking someone's install over. */
}

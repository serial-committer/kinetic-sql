/**
 * Shared terminal styling.
 *
 * Everything the library prints goes through here, so the CLI, the setup error
 * and the install banner all read as the same product. Degrades to plain text
 * wherever colour is unwelcome.
 */

const env = process.env;

/* -- BRAND -- */
const CURRENT_FROM = [0, 149, 238];   /* cyan */
const CURRENT_TO = [5, 200, 120];     /* green */

export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const DIM = '\x1b[2m';
export const ACCENT = '\x1b[38;5;39m';
export const ACTION = '\x1b[38;5;48m';
export const ALERT = '\x1b[38;5;203m';

/* -- CAPABILITIES -- */
const noColor = 'NO_COLOR' in env && env.NO_COLOR !== '';
const forceColor = Boolean(env.FORCE_COLOR) && env.FORCE_COLOR !== '0';

export const isTTY = Boolean(process.stdout.isTTY);
export const colour = !noColor && (forceColor || isTTY);

const trueColour = colour && /truecolor|24bit/i.test(env.COLORTERM ?? '');

/* Legacy Windows consoles render box drawing and emoji as noise. */
export const unicode = isTTY && (
    process.platform !== 'win32' ||
    Boolean(env.WT_SESSION) ||
    env.TERM_PROGRAM === 'vscode' ||
    Boolean(env.ConEmuTask)
);

/* -- GLYPHS -- */
export const ARROW = unicode ? '❯' : '>';
export const LINK = unicode ? '→' : '->';
export const BOLT = unicode ? '⚡ ' : '';
export const DOT = unicode ? '·' : '-';
export const TICK = unicode ? '✓' : 'OK';
export const CROSS = unicode ? '✕' : 'X';

export const paint = (text: string, open: string) => (colour ? `${open}${text}${RESET}` : text);

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/**
 * Runs a colour along a string so the wordmark and rule read as one current
 * moving left to right. Falls back to flat cyan without truecolor support.
 */
export function charge(text: string): string {
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

export const rule = (width = 52) => charge((unicode ? '━' : '-').repeat(width));

/* The wordmark, with an optional right-aligned tag such as a version. */
export function header(tag = ''): string {
    const mark = `${BOLT}KINETIC SQL`;

    /* The bolt occupies two columns but counts as one character. */
    const width = mark.length + (BOLT ? 1 : 0);
    const pad = Math.max(1, 52 - width - tag.length);

    return `  ${paint(charge(mark), BOLD)}${' '.repeat(pad)}${paint(tag, DIM)}\n  ${rule()}`;
}

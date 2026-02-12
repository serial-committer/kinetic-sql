export class KineticLogger {
    private debug: boolean;
    private prefix: string;

    constructor(debug: boolean = false, driverName: string = 'Kinetic') {
        this.debug = debug;
        this.prefix = driverName;
    }

    info(message: string, ...args: any[]) {
        if (!this.debug) return;
        console.log(`\x1b[34m[${this.prefix}]\x1b[0m ${message}`, ...args);
    }

    warn(message: string, ...args: any[]) {
        if (!this.debug) return;
        console.warn(`\x1b[33m[${this.prefix}]\x1b[0m ⚠️ ${message}`, ...args);
    }

    error(message: string, ...args: any[]) {
        console.error(`\x1b[31m[${this.prefix}]\x1b[0m ❌ ${message}`, ...args);
    }
}

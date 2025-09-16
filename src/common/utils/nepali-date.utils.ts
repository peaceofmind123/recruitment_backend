export type NepaliDiff = {
    years: number;
    months: number;
    days: number;
};

/**
 * Compute years, months, days difference between two BS dates using nepali-date-library.
 * Accepts Date (AD) or string (BS YYYY-MM-DD) inputs.
 * Loads the ESM package via native dynamic import to work in CJS.
 */
export async function diffNepaliYMD(from: Date | string, to: Date | string = new Date()): Promise<NepaliDiff> {
    const lib: any = await (eval('import("nepali-date-library")'));
    const NepaliDate = lib.NepaliDate || (lib.default && lib.default.NepaliDate);

    const start = typeof from === 'string' ? new NepaliDate(from) : new NepaliDate(from);
    const end = typeof to === 'string' ? new NepaliDate(to) : new NepaliDate(to);

    const totalMonths = end.diff(start, 'month');
    const totalDays = end.diff(start, 'day');

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths - years * 12;
    const days = totalDays - years * 365 - months * 30;

    return {
        years,
        months,
        days
    };
}

/**
 * Compute years, months, days and total number of days between two BS dates.
 * Normalizes BS strings with '/' or '-' and uses nepali-date-library's diff.
 */
export async function diffNepaliYMDWithTotalDays(from: Date | string, to: Date | string): Promise<NepaliDiff & { totalNumDays: number; }> {
    const lib: any = await (eval('import("nepali-date-library")'));
    const NepaliDate = lib.NepaliDate || (lib.default && lib.default.NepaliDate);

    const normalize = (s: Date | string) => typeof s === 'string' ? s.replace(/\//g, '-') : s;

    const startInput = normalize(from);
    const endInput = normalize(to);

    const start = typeof startInput === 'string' ? new NepaliDate(startInput) : new NepaliDate(startInput);
    const end = typeof endInput === 'string' ? new NepaliDate(endInput) : new NepaliDate(endInput);

    const totalMonths = end.diff(start, 'month');
    const totalDays = end.diff(start, 'day');

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths - years * 12;
    const days = totalDays - years * 365 - months * 30;

    return { years, months, days, totalNumDays: totalDays };
}

export async function formatBS(input: Date | string): Promise<string> {
    const lib: any = await (eval('import("nepali-date-library")'));
    const NepaliDate = lib.NepaliDate || (lib.default && lib.default.NepaliDate);
    const d = typeof input === 'string' ? new NepaliDate(input) : new NepaliDate(input);
    return d.format('YYYY-MM-DD');
}


export type BreakDatePosition = 'before' | 'between' | 'after';

/**
 * Determine whether breakDateBS lies before, between (inclusive), or after the [startDateBS, endDateBS] range.
 * Dates are in BS (YYYY-MM-DD or YYYY/MM/DD). Uses nepali-date-library comparisons.
 */
export async function classifyBreakDateBS(startDateBS: string, endDateBS: string, breakDateBS: string): Promise<BreakDatePosition> {
    const lib: any = await (eval('import("nepali-date-library")'));
    const NepaliDate = lib.NepaliDate || (lib.default && lib.default.NepaliDate);

    const normalize = (s: string) => (s || '').replace(/\//g, '-');

    try {
        const start = new NepaliDate(normalize(startDateBS));
        const end = new NepaliDate(normalize(endDateBS));
        const mid = new NepaliDate(normalize(breakDateBS));

        if (mid.isBefore(start)) return 'before';
        if (mid.isAfter(end)) return 'after';
        return 'between';
    } catch (err) {
        throw new Error('Invalid BS date input to classifyBreakDateBS');
    }
}

/**
 * Return number of days before and after the breakDate within [startDateBS, endDateBS].
 * If breakDateBS < startDateBS: before=0, after=diff(end,start)
 * If breakDateBS > endDateBS: before=diff(end,start), after=0
 * If start <= break <= end: before=diff(break,start), after=diff(end,break)
 */
export async function splitDaysByBreakBS(startDateBS: string, endDateBS: string, breakDateBS: string): Promise<{ numDaysBeforeBreak: number; numDaysAfterBreak: number; totalNumDays: number; }> {
    const lib: any = await (eval('import("nepali-date-library")'));
    const NepaliDate = lib.NepaliDate || (lib.default && lib.default.NepaliDate);

    const normalize = (s: string) => (s || '').replace(/\//g, '-');

    try {
        const start = new NepaliDate(normalize(startDateBS));
        const end = new NepaliDate(normalize(endDateBS));
        const brk = new NepaliDate(normalize(breakDateBS));

        // Guard invalid range
        if (end.isBefore(start)) {
            return { numDaysBeforeBreak: 0, numDaysAfterBreak: 0, totalNumDays: 0 };
        }

        const totalNumDays = end.diff(start, 'day');

        if (brk.isBefore(start)) {
            return { numDaysBeforeBreak: 0, numDaysAfterBreak: totalNumDays, totalNumDays };
        }
        if (brk.isAfter(end)) {
            return { numDaysBeforeBreak: totalNumDays, numDaysAfterBreak: 0, totalNumDays };
        }

        // brk is between [start, end] inclusive
        const numDaysBeforeBreak = brk.diff(start, 'day');
        const numDaysAfterBreak = end.diff(brk, 'day');
        return { numDaysBeforeBreak, numDaysAfterBreak, totalNumDays };
    } catch (err) {
        throw new Error('Invalid BS date input to splitDaysByBreakBS');
    }
}


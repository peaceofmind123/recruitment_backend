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

export async function formatBS(input: Date | string): Promise<string> {
    const lib: any = await (eval('import("nepali-date-library")'));
    const NepaliDate = lib.NepaliDate || (lib.default && lib.default.NepaliDate);
    const d = typeof input === 'string' ? new NepaliDate(input) : new NepaliDate(input);
    return d.format('YYYY-MM-DD');
}



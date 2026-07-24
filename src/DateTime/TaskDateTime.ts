import * as chrono from 'chrono-node';

/** Canonical Markdown representation for every task date field. */
export const taskDateTimeStorageFormat = 'YYYY-MM-DD HH:mm:ss';

/** Matches a task-date value accepted from legacy and current Markdown. */
export const taskDateValuePattern = '\\d{4}-\\d{2}-\\d{2}(?: \\d{2}:\\d{2}:\\d{2})?';

export const taskDateTimeValuePattern = '\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}';

/** Task date-field symbols supported by both Markdown formats. */
export const taskDateSymbolsPattern = '(?:➕|🛫|⏳|⌛|📅|📆|🗓|✅|❌)\\uFE0F?';

const exactTaskDateTimeValueRegex = new RegExp(`^${taskDateTimeValuePattern}$`, 'u');
const timeInValueRegex = /\d{1,2}:\d{2}/u;

/** Returns the canonical seconds-precision value written to Markdown. */
export function formatTaskDateForStorage(date: moment.Moment | null): string {
    return date ? date.format(taskDateTimeStorageFormat) : '';
}

/** Applies the current time and returns the canonical value written by date suggestions. */
export function formatTaskDateForStorageWithCurrentTime(date: moment.Moment): string {
    applyCurrentTime(date);
    return formatTaskDateForStorage(date);
}

/** Whether a Markdown date value already has a complete time. */
export function isCompleteTaskDateTime(value: string): boolean {
    return exactTaskDateTimeValueRegex.test(value);
}

/** Upgrades a legacy date-only value without changing an already complete value. */
export function upgradeTaskDateTime(value: string): string {
    return isCompleteTaskDateTime(value) ? value : `${value} 00:00:00`;
}

/** Parses an edit value and supplies the current time when the user supplied only a date. */
export function parseTaskDateForSaving(typedDate: string, forwardDate: boolean): moment.Moment | null {
    const parsedDate = chrono.parseDate(typedDate, new Date(), { forwardDate });
    if (parsedDate === null) {
        return null;
    }

    const date = window.moment(parsedDate);
    if (!timeInValueRegex.test(typedDate)) {
        applyCurrentTime(date);
    }
    return date;
}

export function applyCurrentTime(date: moment.Moment): void {
    const now = window.moment();
    date.hour(now.hour()).minute(now.minute()).second(now.second()).millisecond(0);
}

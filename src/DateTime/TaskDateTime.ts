import * as chrono from 'chrono-node';
import { getSettings } from '../Config/Settings';
import type { AllTaskDateFields } from './DateFieldTypes';

/** Canonical Markdown representation for every task date field. */
export const taskDateTimeStorageFormat = 'YYYY-MM-DD HH:mm:ss';

/** Matches a task-date value accepted from legacy and current Markdown. */
export const taskDateValuePattern = '\\d{4}-\\d{2}-\\d{2}(?: \\d{2}:\\d{2}:\\d{2})?';

export const taskDateTimeValuePattern = '\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}';

/** Task date-field symbols supported by both Markdown formats. */
export const taskDateSymbolsPattern = '(?:➕|🛫|⏳|⌛|📅|📆|🗓|✅|❌)\\uFE0F?';

const exactTaskDateTimeValueRegex = new RegExp(`^${taskDateTimeValuePattern}$`, 'u');
const timeInValueRegex = /\d{1,2}:\d{2}/u;
const configuredTimeRegex = /^(?<hour>[01]\d|2[0-3]):(?<minute>[0-5]\d)$/u;

export type DefaultDateTimeField = 'start' | 'scheduled' | 'due';
type DateEditorField = DefaultDateTimeField | 'created' | 'done' | 'cancelled';

/** Returns the canonical seconds-precision value written to Markdown. */
export function formatTaskDateForStorage(date: moment.Moment | null): string {
    return date ? date.format(taskDateTimeStorageFormat) : '';
}

/** Applies the current time and returns the canonical value written by lifecycle date suggestions. */
export function formatTaskDateForStorageWithCurrentTime(date: moment.Moment): string {
    return formatTaskDateForStorage(applyTaskDateTime(date));
}

/** Applies a configured default time for task planning fields, or the current time for lifecycle fields. */
export function formatTaskDateForStorageWithDefaultTime(
    date: moment.Moment,
    field: DefaultDateTimeField | AllTaskDateFields | DateEditorField,
): string {
    return formatTaskDateForStorage(applyTaskDateTime(date, field));
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
export function parseTaskDateForSaving(
    typedDate: string,
    forwardDate: boolean,
    field?: DefaultDateTimeField | AllTaskDateFields | DateEditorField,
): moment.Moment | null {
    const parsedDate = chrono.parseDate(typedDate, new Date(), { forwardDate });
    if (parsedDate === null) {
        return null;
    }

    const date = window.moment(parsedDate);
    if (!timeInValueRegex.test(typedDate)) {
        return applyTaskDateTime(date, field);
    }
    return date;
}

export function defaultTimeForField(field: DefaultDateTimeField | AllTaskDateFields | DateEditorField): string | null {
    const normalizedField = field.replace('Date', '') as DefaultDateTimeField;
    if (!['start', 'scheduled', 'due'].includes(normalizedField)) {
        return null;
    }

    const configuredTime = getSettings().defaultDateTimes[normalizedField];
    return configuredTimeRegex.test(configuredTime) ? configuredTime : null;
}

/**
 * Return a copy of a date with the default time for its field applied.
 * Lifecycle fields deliberately use the current time.
 */
export function applyTaskDateTime(
    date: moment.Moment,
    field?: DefaultDateTimeField | AllTaskDateFields | DateEditorField,
): moment.Moment {
    const dateWithTime = date.clone();
    const configuredTime = field ? defaultTimeForField(field) : null;
    if (configuredTime === null) {
        return applyCurrentTime(dateWithTime);
    }

    const [hour, minute] = configuredTime.split(':').map(Number);
    return dateWithTime.hour(hour).minute(minute).second(0).millisecond(0);
}

function applyCurrentTime(date: moment.Moment): moment.Moment {
    const now = window.moment();
    return date.hour(now.hour()).minute(now.minute()).second(now.second()).millisecond(0);
}

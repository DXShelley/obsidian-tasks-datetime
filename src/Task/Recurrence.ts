import { Frequency, RRule } from 'rrule';
import type { Occurrence } from './Occurrence';

export class Recurrence {
    private readonly rrule: RRule;
    private readonly baseOnToday: boolean;
    private readonly displayText: string;
    readonly occurrence: Occurrence;

    constructor({
        rrule,
        baseOnToday,
        displayText,
        occurrence,
    }: {
        rrule: RRule;
        baseOnToday: boolean;
        displayText: string;
        occurrence: Occurrence;
    }) {
        this.rrule = rrule;
        this.baseOnToday = baseOnToday;
        this.displayText = displayText;
        this.occurrence = occurrence;
    }

    public static fromText({
        recurrenceRuleText,
        occurrence,
    }: {
        recurrenceRuleText: string;
        occurrence: Occurrence;
    }): Recurrence | null {
        try {
            const parsedText = Recurrence.parseText(recurrenceRuleText);
            if (parsedText === null) {
                return null;
            }

            const match = parsedText.ruleText.match(/^([a-zA-Z0-9, !]+?)$/i);
            if (match == null) {
                return null;
            }

            const isolatedRuleText = match[1].trim();
            const { baseOnToday } = parsedText;

            const options = RRule.parseText(isolatedRuleText);
            if (options !== null) {
                const referenceDate = occurrence.referenceDate;

                if (!baseOnToday && referenceDate !== null) {
                    options.dtstart = window.moment(referenceDate).utc(true).toDate();
                } else {
                    options.dtstart = window.moment().utc(true).toDate();
                }

                const rrule = new RRule(options);
                return new Recurrence({
                    rrule,
                    baseOnToday,
                    displayText: parsedText.isChinese
                        ? `${parsedText.displayRuleText}${baseOnToday ? ' 完成后计算' : ''}`
                        : `${rrule.toText()}${baseOnToday ? ' when done' : ''}`,
                    occurrence,
                });
            }
        } catch {
            // Could not read recurrence rule. User possibly not done typing.
            return null;
        }

        return null;
    }

    public toText(): string {
        return this.displayText;
    }

    /**
     * Returns the text for a standard recurrence preset in the requested UI language.
     * English remains the fallback for all languages other than Simplified Chinese.
     */
    public static localizePreset(ruleText: string, language: 'en' | 'zh'): string {
        const parsedText = Recurrence.parseText(ruleText);
        if (parsedText === null) {
            return ruleText;
        }

        const chineseRule = Recurrence.chineseRules.find((rule) => rule.english === parsedText.ruleText);
        if (language === 'zh' && chineseRule !== undefined) {
            return chineseRule.chinese;
        }

        return parsedText.ruleText;
    }

    public static isWhenDone(ruleText: string): boolean {
        return Recurrence.parseText(ruleText)?.baseOnToday ?? false;
    }

    private static readonly chineseRules = [
        { chinese: '每 30 分钟', english: 'every 30 minutes' },
        { chinese: '每小时', english: 'every hour' },
        { chinese: '每天', english: 'every day' },
        { chinese: '每周', english: 'every week' },
        { chinese: '每月', english: 'every month' },
    ];

    private static parseText(
        recurrenceRuleText: string,
    ): { ruleText: string; displayRuleText: string; baseOnToday: boolean; isChinese: boolean } | null {
        const trimmedText = recurrenceRuleText.trim();
        const chineseMatch = trimmedText.match(/^(每 30 分钟|每小时|每天|每周|每月)( 完成后计算)?$/u);
        if (chineseMatch !== null) {
            const chineseRule = Recurrence.chineseRules.find((rule) => rule.chinese === chineseMatch[1]);
            return {
                ruleText: chineseRule!.english,
                displayRuleText: chineseRule!.chinese,
                baseOnToday: chineseMatch[2] !== undefined,
                isChinese: true,
            };
        }

        const englishMatch = trimmedText.match(/^([a-zA-Z0-9, !]+?)( when done)?$/i);
        if (englishMatch === null) {
            return null;
        }

        return {
            ruleText: englishMatch[1].trim(),
            displayRuleText: englishMatch[1].trim(),
            baseOnToday: englishMatch[2] !== undefined,
            isChinese: false,
        };
    }

    /**
     * Returns the dates of the next occurrence or null if there is no next occurrence.
     *
     * @param today - Optional date representing the completion date. Defaults to today.
     */
    public next(today = window.moment()): Occurrence | null {
        const nextReferenceDate = this.nextReferenceDate(today);

        if (nextReferenceDate === null) {
            return null;
        }

        const isSubDaily = (this.rrule.origOptions.freq ?? Frequency.DAILY) >= Frequency.HOURLY;
        return this.occurrence.next(nextReferenceDate, isSubDaily);
    }

    public identicalTo(other: Recurrence) {
        if (this.baseOnToday !== other.baseOnToday) {
            return false;
        }

        if (!this.occurrence.isIdenticalTo(other.occurrence)) {
            return false;
        }

        return this.rrule.toText() === other.rrule.toText();
    }

    private nextReferenceDate(today: Moment): Moment {
        if (this.baseOnToday) {
            // The next occurrence should happen based off the current date.
            return this.nextReferenceDateFromToday(today.clone());
        } else {
            return this.nextReferenceDateFromOriginalReferenceDate();
        }
    }

    private nextReferenceDateFromToday(today: Moment): Moment {
        const ruleBasedOnToday = new RRule({
            ...this.rrule.origOptions,
            dtstart: today.clone().utc(true).toDate(),
        });

        return this.nextAfter(today.clone(), ruleBasedOnToday);
    }

    private nextReferenceDateFromOriginalReferenceDate(): Moment {
        // The next occurrence should happen based on the original reference
        // date if possible. Otherwise, base it on today if we do not have a
        // reference date.
        const after = window
            // Reference date can be `undefined` to mean "today".
            // Moment only accepts `undefined`, not `null`.
            .moment(this.occurrence.referenceDate ?? undefined);

        return this.nextAfter(after, this.rrule);
    }

    /**
     * nextAfter returns the next occurrence's date after `after`, based on the given rrule.
     *
     * The common case is that `rrule.after` calculates the next date and it
     * can be used as is.
     *
     * In the special cases of monthly and yearly recurrences, there exists an
     * edge case where an occurrence after the given number of months or years
     * is not possible. For example: A task is due on 2022-01-31 and has a
     * recurrence of `every month`. When marking the task as done, the next
     * occurrence will happen on 2022-03-31. The reason being that February
     * does not have 31 days, yet RRule sets `bymonthday` to `31` for lack of
     * having a better alternative.
     *
     * In order to fix this, `after` will move into the past day by day. Each
     * day, the next occurrence is checked to be after the given number of
     * months or years. By moving `after` into the past day by day, it will
     * eventually calculate the next occurrence based on `2022-01-28`, ending up
     * in February as the user would expect.
     */
    private nextAfter(after: Moment, rrule: RRule): Moment {
        // We need to remove the timezone, as rrule does not regard timezones and always
        // calculates in UTC.
        // The timezone is added again before returning the next date.
        after.utc(true);
        let next = window.moment.utc(rrule.after(after.toDate()));

        // If this is a monthly recurrence, treat it special.
        const asText = this.rrule.toText();
        const monthMatch = asText.match(/every( \d+)? month(s)?(.*)?/);
        if (monthMatch !== null) {
            // ... unless the rule fixes the date, such as 'every month on the 31st'
            if (!asText.includes(' on ')) {
                next = Recurrence.nextAfterMonths(after, next, rrule, monthMatch[1]);
            }
        }

        // If this is a yearly recurrence, treat it special.
        const yearMatch = asText.match(/every( \d+)? year(s)?(.*)?/);
        if (yearMatch !== null) {
            next = Recurrence.nextAfterYears(after, next, rrule, yearMatch[1]);
        }

        // Here we add the timezone again that we removed in the beginning of this method.
        return Recurrence.addTimezone(next);
    }

    /**
     * nextAfterMonths calculates the next date after `skippingMonths` months.
     *
     * `skippingMonths` defaults to `1` if undefined.
     */
    private static nextAfterMonths(
        after: Moment,
        next: Moment,
        rrule: RRule,
        skippingMonths: string | undefined,
    ): Moment {
        // Parse `skippingMonths`, if it exists.
        let parsedSkippingMonths: number = 1;
        if (skippingMonths !== undefined) {
            parsedSkippingMonths = Number.parseInt(skippingMonths.trim(), 10);
        }

        // While we skip the wrong number of months, move `after` one day into the past.
        while (Recurrence.isSkippingTooManyMonths(after, next, parsedSkippingMonths)) {
            // The next line alters `after` to be one day earlier.
            // Then returns `next` based on that.
            next = Recurrence.fromOneDayEarlier(after, rrule);
        }

        return next;
    }

    /**
     * isSkippingTooManyMonths returns true if `next` is more than `skippingMonths` months after `after`.
     */
    private static isSkippingTooManyMonths(after: Moment, next: Moment, skippingMonths: number): boolean {
        let diffMonths = next.month() - after.month();

        // Maybe some years have passed?
        const diffYears = next.year() - after.year();
        diffMonths += diffYears * 12;

        return diffMonths > skippingMonths;
    }

    /**
     * nextAfterYears calculates the next date after `skippingYears` years.
     *
     * `skippingYears` defaults to `1` if undefined.
     */
    private static nextAfterYears(
        after: Moment,
        next: Moment,
        rrule: RRule,
        skippingYears: string | undefined,
    ): Moment {
        // Parse `skippingYears`, if it exists.
        let parsedSkippingYears: number = 1;
        if (skippingYears !== undefined) {
            parsedSkippingYears = Number.parseInt(skippingYears.trim(), 10);
        }

        // While we skip the wrong number of years, move `after` one day into the past.
        while (Recurrence.isSkippingTooManyYears(after, next, parsedSkippingYears)) {
            // The next line alters `after` to be one day earlier.
            // Then returns `next` based on that.
            next = Recurrence.fromOneDayEarlier(after, rrule);
        }

        return next;
    }

    /**
     * isSkippingTooManyYears returns true if `next` is more than `skippingYears` years after `after`.
     */
    private static isSkippingTooManyYears(after: Moment, next: Moment, skippingYears: number): boolean {
        const diff = next.year() - after.year();

        return diff > skippingYears;
    }

    /**
     * fromOneDayEarlier returns the next occurrence after moving `after` one day into the past.
     *
     * WARNING: This method manipulates the given instance of `after`.
     */
    private static fromOneDayEarlier(after: Moment, rrule: RRule): Moment {
        after.subtract(1, 'days').endOf('day');

        const options = rrule.origOptions;
        options.dtstart = after.startOf('day').toDate();
        rrule = new RRule(options);

        return window.moment.utc(rrule.after(after.toDate()));
    }

    private static addTimezone(date: Moment): Moment {
        // Moment's local(true) method has a bug where it returns incorrect result if the input is of
        // the day of the year when DST kicks in and the time of day is before DST actually kicks in
        // (typically between midnight and very early morning, varying across geographies).
        // We workaround the bug by setting the time of day to noon before calling local(true)
        const timeOfDay = {
            hour: date.hour(),
            minute: date.minute(),
            second: date.second(),
            millisecond: date.millisecond(),
        };
        const localTimeZone = window.moment
            .utc(date)
            .set({
                hour: 12,
                minute: 0,
                second: 0,
                millisecond: 0,
            })
            .local(true);

        return localTimeZone.set(timeOfDay);
    }
}

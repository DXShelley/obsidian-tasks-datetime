/**
 * Represent an inclusive span of time between two dates.
 */
export class DateRange {
    start: Moment;
    end: Moment;
    private readonly preserveTime: boolean;

    /**
     * Builds the date range. If start is after the end, the dates will be automatically reversed.
     * Date-only ranges start at 00:00 local time and end at 23:59:59.999.
     * Explicit datetime queries can preserve their supplied time.
     * The stored values of are mutable.
     * Note that there is no validation of the start and end moment. They can be checked with start.isValid() and end.isValid().
     * @param start
     * @param end
     */
    constructor(start: Moment, end: Moment, preserveTime: boolean = false) {
        this.start = start;
        this.end = end;
        this.preserveTime = preserveTime && !(isMidnight(start) && isMidnight(end));

        if (end.isBefore(start)) {
            this.start = end;
            this.end = start;
        }

        if (!this.preserveTime) {
            this.start = this.start.startOf('day');
            this.end = this.end.endOf('day');
        }
    }

    /**
     * Builds a date range relative to today like this week/month/quarter/year.
     * @example <caption> construct a date range containing the current month.</caption>
     * const thisMonth = DateRange.buildRelative('month');
     * @param range one of 'week', 'month', 'quarter', 'year'
     * @returns
     */
    public static buildRelative(range: moment.unitOfTime.StartOf) {
        // Treat all weeks as ISO 8601 weeks
        const unitOfTime = range === 'week' ? 'isoWeek' : range;

        return new DateRange(window.moment().startOf(unitOfTime).startOf('day'), window.moment().endOf(unitOfTime));
    }

    /** Returns whether this range represents one date rather than a date span. */
    public isSingleDate(): boolean {
        return this.start.isSame(this.end) || (!this.preserveTime && this.start.isSame(this.end, 'day'));
    }

    /**
     * Builds an invalid date range with invalid momentks objects (https://momentjscom.readthedocs.io/en/latest/moment/09-utilities/02-invalid/).
     * For example if the parsing has gone wrong.
     * @returns
     */
    public static buildInvalid(): DateRange {
        return new DateRange(window.moment.invalid(), window.moment.invalid());
    }

    /**
     * Check if the both dates of the date range are valid in terms of momentjs.
     * @returns true if both dates are valid
     */
    public isValid(): boolean {
        return this.start.isValid() && this.end.isValid();
    }

    /**
     * Move the date range to the previous week/month/quarter/year.
     * Make sure that the duration in the parameters matches the range size, for example subtracting a month from a week long range was not tested.
     * @param duration one of 'week'/'month'/'quarter'/'year'
     */
    public moveToPrevious(duration: moment.unitOfTime.DurationConstructor) {
        const delta = window.moment.duration(1, duration);
        this.start.subtract(delta);
        this.end.subtract(delta);

        if (duration === 'month' || duration === 'quarter') {
            // Month and quarter durations in days may differ (28/30/31 days).
            // We will need to adjust the end.
            this.end = this.end.endOf(duration);
        }
    }

    /**
     * Move the date range to the next week/month/quarter/year.
     * Make sure that the duration in the parameters matches the range size, for example subtracting a month from a week long range was not tested.
     * @param duration one of 'week'/'month'/'quarter'/'year'
     */
    public moveToNext(duration: moment.unitOfTime.DurationConstructor) {
        const delta = window.moment.duration(1, duration);
        this.start.add(delta);
        this.end.add(delta);

        if (duration === 'month' || duration === 'quarter') {
            // Month and quarter durations in days may differ (28/30/31 days).
            // We will need to adjust the end.
            this.end = this.end.endOf(duration);
        }
    }
}

function isMidnight(date: Moment): boolean {
    return date.hour() === 0 && date.minute() === 0 && date.second() === 0 && date.millisecond() === 0;
}

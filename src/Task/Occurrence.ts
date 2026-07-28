import type { Moment } from 'moment/moment';
import { compareByDate } from '../DateTime/DateTools';
import { getSettings } from '../Config/Settings';

/**
 * A set of dates on a single instance of {@link Recurrence}.
 *
 * It is responsible for calculating the set of dates for the next occurrence.
 */
export class Occurrence {
    public readonly startDate: Moment | null;
    public readonly scheduledDate: Moment | null;
    public readonly dueDate: Moment | null;

    constructor({
        startDate = null,
        scheduledDate = null,
        dueDate = null,
    }: {
        startDate?: Moment | null;
        scheduledDate?: Moment | null;
        dueDate?: Moment | null;
    }) {
        this.startDate = startDate ?? null;
        this.scheduledDate = scheduledDate ?? null;
        this.dueDate = dueDate ?? null;
    }

    /**
     * The reference date is used to calculate future occurrences.
     *
     * Future occurrences will recur based on the reference date.
     * The reference date is the due date, if it is given.
     * Otherwise the scheduled date, if it is given. And so on.
     *
     * Recurrence of all dates will be kept relative to the reference date.
     * For example: if the due date and the start date are given, the due date
     * is the reference date. Future occurrences will have a start date with the
     * same relative distance to the due date as the original task. For example
     * "starts one week before it is due".
     */
    public get referenceDate(): moment.Moment | null {
        return this.getReferenceDate();
    }

    /**
     *  Pick the reference date for occurrence based on importance.
     *  Assuming due date has the highest priority, then scheduled date,
     *  then start date, by default.
     *  The order differs if removeScheduledDateOnRecurrence is enabled.
     *  See [Priority of Dates](https://publish.obsidian.md/tasks/Getting+Started/Recurring+Tasks#Priority%20of%20Dates).
     *
     *  The Moment objects are cloned.
     *
     * @private
     */
    private getReferenceDate(): Moment | null {
        const datesInPriorityOrder = this.getDatePriorityOrder();

        for (const date of datesInPriorityOrder) {
            if (date) {
                return window.moment(date);
            }
        }

        return null;
    }

    private getDatePriorityOrder(): (Moment | null)[] {
        const { removeScheduledDateOnRecurrence } = getSettings();
        if (removeScheduledDateOnRecurrence) {
            // If the `removeScheduledDateOnRecurrence` setting is enabled, it does
            // not make sense to pick the scheduled date over the start date because
            // the scheduled date will be deleted in the newly created task. So if
            // this setting is enabled, we favour start date over scheduled date:
            return [this.dueDate, this.startDate, this.scheduledDate];
        } else {
            return [this.dueDate, this.scheduledDate, this.startDate];
        }
    }

    public isIdenticalTo(other: Occurrence): boolean {
        // Compare Date fields
        if (compareByDate(this.startDate, other.startDate) !== 0) {
            return false;
        }
        if (compareByDate(this.scheduledDate, other.scheduledDate) !== 0) {
            return false;
        }
        if (compareByDate(this.dueDate, other.dueDate) !== 0) {
            return false;
        }

        return true;
    }

    /**
     * Provides an {@link Occurrence} with the dates calculated relative to a new reference date.
     *
     * If the occurrence has no reference date, an empty {@link Occurrence} will be returned.
     *
     * @param nextReferenceDate
     * @param isSubDaily Whether the recurrence frequency is hourly or smaller.
     */
    public next(nextReferenceDate: Moment, isSubDaily: boolean): Occurrence {
        // Only if a reference date is given. A reference date will exist if at
        // least one of the other dates is set.
        if (this.referenceDate === null) {
            return new Occurrence({
                startDate: null,
                scheduledDate: null,
                dueDate: null,
            });
        }

        const hasStartDate = this.startDate !== null;
        const hasDueDate = this.dueDate !== null;
        const canRemoveScheduledDate = hasStartDate || hasDueDate;

        const { removeScheduledDateOnRecurrence } = getSettings();
        const shouldRemoveScheduledDate = removeScheduledDateOnRecurrence && canRemoveScheduledDate;

        const startDate = this.nextOccurrenceDate(this.startDate, nextReferenceDate, isSubDaily);
        const scheduledDate = shouldRemoveScheduledDate
            ? null
            : this.nextOccurrenceDate(this.scheduledDate, nextReferenceDate, isSubDaily);
        const dueDate = this.nextOccurrenceDate(this.dueDate, nextReferenceDate, isSubDaily);

        return new Occurrence({
            startDate,
            scheduledDate,
            dueDate,
        });
    }

    /**
     * Gets a next occurrence field while preserving its time of day.
     *
     * For daily-or-larger intervals, keep the calendar-day distance from the
     * reference date. For hourly-or-smaller intervals, preserve the exact elapsed
     * duration instead.
     *
     * @param nextReferenceDate
     * @param currentOccurrenceDate start/scheduled/due date
     * @param isSubDaily Whether the recurrence frequency is hourly or smaller.
     * @private
     */
    private nextOccurrenceDate(
        currentOccurrenceDate: Moment | null,
        nextReferenceDate: Moment,
        isSubDaily: boolean,
    ): Moment | null {
        if (currentOccurrenceDate === null) {
            return null;
        }

        const referenceDate = this.referenceDate;
        if (referenceDate === null) {
            return null;
        }

        if (isSubDaily) {
            return nextReferenceDate.clone().add(currentOccurrenceDate.diff(referenceDate), 'milliseconds');
        }

        const dayDifference = currentOccurrenceDate
            .clone()
            .startOf('day')
            .diff(referenceDate.clone().startOf('day'), 'days');

        return nextReferenceDate.clone().startOf('day').add(dayDifference, 'days').set({
            hour: currentOccurrenceDate.hour(),
            minute: currentOccurrenceDate.minute(),
            second: currentOccurrenceDate.second(),
            millisecond: currentOccurrenceDate.millisecond(),
        });
    }
}

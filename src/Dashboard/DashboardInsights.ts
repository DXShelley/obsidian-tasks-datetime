import type { Moment } from 'moment';
import { StatusType } from '../Statuses/StatusConfiguration';
import type { Task } from '../Task/Task';

export type DashboardRangeDays = 7 | 30;
export type PlanView = 'day' | 'week';

export interface DailyProgress {
    date: string;
    completed: number;
    planned: number;
    overdue: number;
    netAdded: number;
}

export type ProgressMetric = 'completed' | 'planned' | 'overdue' | 'netAdded';

export interface PlannedTask {
    task: Task;
    date: Moment;
}

export interface DashboardCompletionRate {
    completed: number;
    percentage: number;
    planned: number;
    tasks: Task[];
}

function isCancelled(task: Task): boolean {
    return task.cancelledDate !== null || task.status.type === StatusType.CANCELLED;
}

function isOpen(task: Task): boolean {
    return !task.isDone && !isCancelled(task);
}

function isOverdueAt(task: Task, end: Moment): boolean {
    if (!isOpen(task) || task.dueDate === null || !task.dueDate.isBefore(end)) {
        return false;
    }
    return task.doneDate === null || task.doneDate.isAfter(end);
}

/** Returns the union of tasks represented by a day in the progress chart. */
export function progressDayTasks(tasks: Task[], day: Moment): Task[] {
    const end = day.clone().endOf('day');
    return tasks.filter(
        (task) =>
            !isCancelled(task) &&
            (task.doneDate?.isSame(day, 'day') || task.dueDate?.isSame(day, 'day') || isOverdueAt(task, end)),
    );
}

export function progressTrend(tasks: Task[], rangeDays: DashboardRangeDays, now = window.moment()): DailyProgress[] {
    return Array.from({ length: rangeDays }, (_, index) => {
        const day = now
            .clone()
            .startOf('day')
            .subtract(rangeDays - index - 1, 'day');
        const completed = tasks.filter((task) => !isCancelled(task) && task.doneDate?.isSame(day, 'day')).length;
        const planned = tasks.filter((task) => !isCancelled(task) && task.dueDate?.isSame(day, 'day')).length;
        const added = tasks.filter((task) => task.createdDate?.isSame(day, 'day')).length;

        return {
            date: day.format('YYYY-MM-DD'),
            completed,
            planned,
            overdue: progressDayTasks(tasks, day).filter((task) => isOverdueAt(task, day.clone().endOf('day'))).length,
            netAdded: added - completed,
        };
    });
}

/** Formats the full set of values represented by a progress-chart day. */
export function formatProgressDayTooltip(day: DailyProgress, labels: Record<ProgressMetric, string>): string {
    const netAdded = `${day.netAdded >= 0 ? '+' : ''}${day.netAdded}`;
    return [
        day.date,
        `${labels.completed}: ${day.completed}`,
        `${labels.planned}: ${day.planned}`,
        `${labels.overdue}: ${day.overdue}`,
        `${labels.netAdded}: ${netAdded}`,
    ].join('\n');
}

export function averageCompletionDays(tasks: Task[]): number | null {
    const durations = tasks.flatMap((task) => {
        if (isCancelled(task) || task.createdDate === null || task.doneDate === null) {
            return [];
        }
        return [task.doneDate.diff(task.createdDate, 'days', true)];
    });
    if (durations.length === 0) {
        return null;
    }
    return Math.round((durations.reduce((sum, duration) => sum + duration, 0) / durations.length) * 10) / 10;
}

/** Calculates completion from tasks due within the selected dashboard range. */
export function completionRateForRange(
    tasks: Task[],
    rangeDays: DashboardRangeDays,
    now = window.moment(),
): DashboardCompletionRate {
    const start = now
        .clone()
        .startOf('day')
        .subtract(rangeDays - 1, 'day');
    const end = now.clone().endOf('day');
    const plannedTasks = tasks.filter(
        (task) => !isCancelled(task) && task.dueDate?.isBetween(start, end, undefined, '[]'),
    );
    const completed = plannedTasks.filter((task) => task.isDone).length;
    return {
        completed,
        percentage: plannedTasks.length === 0 ? 0 : Math.round((completed / plannedTasks.length) * 100),
        planned: plannedTasks.length,
        tasks: plannedTasks,
    };
}

export function plannedTasks(tasks: Task[], view: PlanView, now = window.moment()): PlannedTask[] {
    const start = now.clone().startOf('day');
    const end = view === 'day' ? start.clone().endOf('day') : start.clone().endOf('isoWeek');
    return tasks
        .filter(isOpen)
        .flatMap((task) => {
            const date = task.dueDate ?? task.scheduledDate ?? task.startDate;
            return date?.isBetween(start, end, undefined, '[]') ? [{ task, date }] : [];
        })
        .sort((a, b) => a.date.valueOf() - b.date.valueOf() || a.task.priorityNumber - b.task.priorityNumber);
}

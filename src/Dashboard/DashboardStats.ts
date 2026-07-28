import type { Moment } from 'moment';
import { getSettings } from '../Config/Settings';
import { Priority } from '../Task/Priority';
import type { Task } from '../Task/Task';

export type CompletionPeriod = 'Today' | 'This week' | 'This month';
export type DashboardActionGroup = 'overdue' | 'dueToday' | 'highPriority';

export interface CompletionStat {
    label: CompletionPeriod;
    completed: number;
    planned: number;
    percentage: number;
}

export interface DashboardAction {
    group: DashboardActionGroup;
    tasks: Task[];
}

export interface TodayOverview {
    completed: number;
    dueToday: number;
    overdue: number;
    completionPercentage: number;
}

function startOf(period: CompletionPeriod, now: Moment): Moment {
    switch (period) {
        case 'Today':
            return now.clone().startOf('day');
        case 'This week':
            return now.clone().startOf('isoWeek');
        case 'This month':
            return now.clone().startOf('month');
    }
}

function endOf(period: CompletionPeriod, now: Moment): Moment {
    switch (period) {
        case 'Today':
            return now.clone().endOf('day');
        case 'This week':
            return now.clone().endOf('isoWeek');
        case 'This month':
            return now.clone().endOf('month');
    }
}

function isCancelled(task: Task): boolean {
    return task.cancelledDate !== null;
}

function isOpen(task: Task): boolean {
    return !task.isDone && !isCancelled(task);
}

function isOverdue(task: Task, now: Moment): boolean {
    if (task.dueDate === null) {
        return false;
    }

    return getSettings().enableDateTime
        ? task.dueDate.isBefore(now)
        : task.dueDate.isBefore(now.clone().startOf('day'));
}

function isDueToday(task: Task, now: Moment): boolean {
    return task.dueDate?.isSame(now, 'day') === true && !isOverdue(task, now);
}

function compareByDueDateAndPriority(a: Task, b: Task): number {
    const dueDateComparison =
        (a.dueDate?.valueOf() ?? Number.MAX_SAFE_INTEGER) - (b.dueDate?.valueOf() ?? Number.MAX_SAFE_INTEGER);
    return dueDateComparison || a.priorityNumber - b.priorityNumber || a.description.localeCompare(b.description);
}

function compareByPriorityAndDueDate(a: Task, b: Task): number {
    return a.priorityNumber - b.priorityNumber || compareByDueDateAndPriority(a, b);
}

/**
 * Calculates completion against tasks due in the selected period. Completed tasks
 * from a different due-date period therefore cannot inflate this percentage.
 */
export function completionStats(tasks: Task[], now = window.moment()): CompletionStat[] {
    return (['Today', 'This week', 'This month'] as const).map((label) => {
        const start = startOf(label, now);
        const end = endOf(label, now);
        const plannedTasks = tasks.filter(
            (task) => !isCancelled(task) && task.dueDate?.isBetween(start, end, undefined, '[]'),
        );
        const completed = plannedTasks.filter((task) => task.isDone).length;
        const planned = plannedTasks.length;
        return { label, completed, planned, percentage: planned === 0 ? 0 : Math.round((completed / planned) * 100) };
    });
}

export function todayOverview(tasks: Task[], now = window.moment()): TodayOverview {
    const today = completionStats(tasks, now)[0];
    const start = now.clone().startOf('day');

    return {
        completed: tasks.filter((task) => !isCancelled(task) && task.doneDate?.isBetween(start, now, undefined, '[]'))
            .length,
        dueToday: tasks.filter((task) => isOpen(task) && isDueToday(task, now)).length,
        overdue: tasks.filter((task) => isOpen(task) && isOverdue(task, now)).length,
        completionPercentage: today.percentage,
    };
}

export function dashboardActions(tasks: Task[], now = window.moment()): DashboardAction[] {
    const openTasks = tasks.filter(isOpen);

    return [
        {
            group: 'overdue',
            tasks: openTasks.filter((task) => isOverdue(task, now)).sort(compareByDueDateAndPriority),
        },
        {
            group: 'dueToday',
            tasks: openTasks.filter((task) => isDueToday(task, now)).sort(compareByDueDateAndPriority),
        },
        {
            group: 'highPriority',
            tasks: openTasks
                .filter(
                    (task) =>
                        task.priorityNumber <= Number(Priority.High) &&
                        (task.dueDate === null || task.dueDate.isAfter(now.clone().endOf('day'))),
                )
                .sort(compareByPriorityAndDueDate),
        },
    ];
}

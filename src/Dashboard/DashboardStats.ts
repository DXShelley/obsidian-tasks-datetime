import type { Task } from '../Task/Task';

export type CompletionPeriod = 'Today' | 'This week' | 'This month';

export interface CompletionStat {
    label: CompletionPeriod;
    completed: number;
    planned: number;
    percentage: number;
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

export function completionStats(tasks: Task[], now = window.moment()): CompletionStat[] {
    return (['Today', 'This week', 'This month'] as const).map((label) => {
        const start = startOf(label, now);
        const completed = tasks.filter((task) => task.doneDate?.isBetween(start, now, undefined, '[]')).length;
        const planned = tasks.filter((task) => task.dueDate?.isBetween(start, now, undefined, '[]')).length;
        return { label, completed, planned, percentage: planned === 0 ? 0 : Math.round((completed / planned) * 100) };
    });
}

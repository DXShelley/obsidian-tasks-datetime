import moment from 'moment';
import {
    averageCompletionDays,
    completionRateForRange,
    formatProgressDayTooltip,
    plannedTasks,
    progressDayTasks,
    progressTrend,
} from '../../src/Dashboard/DashboardInsights';
import { Priority } from '../../src/Task/Priority';
import { Status } from '../../src/Statuses/Status';
import { TaskBuilder } from '../TestingTools/TaskBuilder';

describe('dashboard insights', () => {
    beforeEach(() => {
        window.moment = moment;
    });

    it('calculates daily progress, net added work and average completion duration', () => {
        const now = moment('2026-07-28 12:00');
        const tasks = [
            new TaskBuilder()
                .createdDate('2026-07-27')
                .dueDate('2026-07-28')
                .doneDate('2026-07-28')
                .status(Status.DONE)
                .build(),
            new TaskBuilder().createdDate('2026-07-28').dueDate('2026-07-27').build(),
        ];

        expect(progressTrend(tasks, 7, now).at(-1)).toEqual({
            date: '2026-07-28',
            completed: 1,
            planned: 1,
            overdue: 1,
            netAdded: 0,
        });
        expect(averageCompletionDays(tasks)).toBe(1);
    });

    it('returns every task represented by a progress day, including carried-over overdue work', () => {
        const day = moment('2026-07-28');
        const completed = new TaskBuilder().description('Completed').doneDate('2026-07-28').status(Status.DONE).build();
        const planned = new TaskBuilder().description('Planned').dueDate('2026-07-28').build();
        const overdue = new TaskBuilder().description('Overdue').dueDate('2026-07-20').build();

        expect(progressDayTasks([completed, planned, overdue], day).map((task) => task.description)).toEqual([
            'Completed',
            'Planned',
            'Overdue',
        ]);
    });

    it('calculates planned completion rates for the selected dashboard range', () => {
        const now = moment('2026-07-28 12:00');
        const completed = new TaskBuilder().dueDate('2026-07-25').status(Status.DONE).build();
        const open = new TaskBuilder().dueDate('2026-07-26').build();
        const olderCompleted = new TaskBuilder().dueDate('2026-07-10').status(Status.DONE).build();

        expect(completionRateForRange([completed, open, olderCompleted], 7, now)).toMatchObject({
            completed: 1,
            planned: 2,
            percentage: 50,
        });
        expect(completionRateForRange([completed, open, olderCompleted], 30, now)).toMatchObject({
            completed: 2,
            planned: 3,
            percentage: 67,
        });
    });

    it('formats every progress metric for a chart-day tooltip', () => {
        expect(
            formatProgressDayTooltip(
                { date: '2026-07-28', completed: 3, planned: 5, overdue: 2, netAdded: -1 },
                { completed: 'Completed', planned: 'Planned', overdue: 'Overdue', netAdded: 'Net added' },
            ),
        ).toBe('2026-07-28\nCompleted: 3\nPlanned: 5\nOverdue: 2\nNet added: -1');
    });

    it('builds day and week plans from due, scheduled and start dates', () => {
        const now = moment('2026-07-28 12:00');
        const tasks = [
            new TaskBuilder().description('Due').dueDate('2026-07-28 16:00').build(),
            new TaskBuilder()
                .description('Scheduled')
                .scheduledDate('2026-07-29 09:00')
                .priority(Priority.High)
                .build(),
            new TaskBuilder().description('Later').startDate('2026-08-02 09:00').build(),
        ];

        expect(plannedTasks(tasks, 'day', now).map(({ task }) => task.description)).toEqual(['Due']);
        expect(plannedTasks(tasks, 'week', now).map(({ task }) => task.description)).toEqual([
            'Due',
            'Scheduled',
            'Later',
        ]);
    });
});

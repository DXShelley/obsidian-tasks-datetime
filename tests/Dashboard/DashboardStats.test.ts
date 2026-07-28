import moment from 'moment';
import { resetSettings, updateSettings } from '../../src/Config/Settings';
import { completionStats, dashboardActions, todayOverview } from '../../src/Dashboard/DashboardStats';
import { Priority } from '../../src/Task/Priority';
import { Status } from '../../src/Statuses/Status';
import { TaskBuilder } from '../TestingTools/TaskBuilder';

describe('dashboard statistics', () => {
    beforeEach(() => {
        window.moment = moment;
        resetSettings();
    });

    it('calculates completion from the same due-date cohort, including tasks due later today', () => {
        const now = moment('2026-07-23 12:00:00');
        const tasks = [
            new TaskBuilder()
                .dueDate('2026-07-23 09:00:00')
                .status(Status.DONE)
                .doneDate('2026-07-23 10:00:00')
                .build(),
            new TaskBuilder().dueDate('2026-07-23 18:00:00').build(),
            new TaskBuilder()
                .dueDate('2026-07-20 09:00:00')
                .status(Status.DONE)
                .doneDate('2026-07-23 10:00:00')
                .build(),
        ];

        expect(completionStats(tasks, now)).toEqual([
            { label: 'Today', completed: 1, planned: 2, percentage: 50 },
            { label: 'This week', completed: 2, planned: 3, percentage: 67 },
            { label: 'This month', completed: 2, planned: 3, percentage: 67 },
        ]);
    });

    it('excludes cancelled tasks from planning and today counts', () => {
        const now = moment('2026-07-23 12:00:00');
        const cancelledTask = new TaskBuilder()
            .dueDate('2026-07-23 09:00:00')
            .status(Status.CANCELLED)
            .cancelledDate('2026-07-23 10:00:00')
            .build();

        expect(completionStats([cancelledTask], now)[0]).toEqual({
            label: 'Today',
            completed: 0,
            planned: 0,
            percentage: 0,
        });
        expect(todayOverview([cancelledTask], now)).toEqual({
            completed: 0,
            dueToday: 0,
            overdue: 0,
            completionPercentage: 0,
        });
    });

    it('groups open work into overdue, due today and high-priority future actions', () => {
        const now = moment('2026-07-23 12:00:00');
        const tasks = [
            new TaskBuilder().description('Later overdue').dueDate('2026-07-22 18:00:00').build(),
            new TaskBuilder().description('Earlier overdue').dueDate('2026-07-21 18:00:00').build(),
            new TaskBuilder().description('Today').dueDate('2026-07-23 18:00:00').build(),
            new TaskBuilder().description('Future high').dueDate('2026-07-24 18:00:00').priority(Priority.High).build(),
            new TaskBuilder().description('High').priority(Priority.High).build(),
            new TaskBuilder().description('Highest').priority(Priority.Highest).build(),
            new TaskBuilder().description('Medium').priority(Priority.Medium).build(),
            new TaskBuilder().description('Completed').dueDate('2026-07-22').status(Status.DONE).build(),
        ];

        const actions = dashboardActions(tasks, now);

        expect(actions.map(({ group, tasks }) => [group, tasks.map((task) => task.description)])).toEqual([
            ['overdue', ['Earlier overdue', 'Later overdue']],
            ['dueToday', ['Today']],
            ['highPriority', ['Highest', 'Future high', 'High']],
        ]);
    });

    it('uses the time of day for dashboard actions when date-time mode is enabled', () => {
        updateSettings({ enableDateTime: true });
        const now = moment('2026-07-23 12:00:00');
        const tasks = [
            new TaskBuilder().description('Earlier today').dueDate('2026-07-23 09:00:00').build(),
            new TaskBuilder().description('Later today').dueDate('2026-07-23 18:00:00').build(),
        ];

        expect(todayOverview(tasks, now)).toMatchObject({ overdue: 1, dueToday: 1 });
        expect(
            dashboardActions(tasks, now).map(({ group, tasks }) => [group, tasks.map((task) => task.description)]),
        ).toEqual([
            ['overdue', ['Earlier today']],
            ['dueToday', ['Later today']],
            ['highPriority', []],
        ]);
    });
});

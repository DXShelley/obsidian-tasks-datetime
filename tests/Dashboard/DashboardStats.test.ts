import moment from 'moment';
import { completionStats } from '../../src/Dashboard/DashboardStats';
import { TaskBuilder } from '../TestingTools/TaskBuilder';

describe('completionStats', () => {
    beforeEach(() => {
        window.moment = moment;
    });

    it('counts completed and due tasks in each period independently', () => {
        const now = moment('2026-07-23 12:00:00');
        const tasks = [
            new TaskBuilder().dueDate('2026-07-23 09:00:00').doneDate('2026-07-23 10:00:00').build(),
            new TaskBuilder().dueDate('2026-07-24 09:00:00').build(),
        ];

        expect(completionStats(tasks, now)).toEqual([
            { label: 'Today', completed: 1, planned: 1, percentage: 100 },
            { label: 'This week', completed: 1, planned: 1, percentage: 100 },
            { label: 'This month', completed: 1, planned: 1, percentage: 100 },
        ]);
    });
});

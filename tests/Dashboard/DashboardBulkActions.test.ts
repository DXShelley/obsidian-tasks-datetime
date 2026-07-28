import moment from 'moment';
import {
    changeTasksStatus,
    postponeTasks,
    reprioritiseTasks,
    reprioritiseTasksByQuadrant,
    saveTaskReplacements,
    updateTaskListAfterBulkEdit,
} from '../../src/Dashboard/DashboardBulkActions';
import { Priority } from '../../src/Task/Priority';
import { Status } from '../../src/Statuses/Status';
import { TaskBuilder } from '../TestingTools/TaskBuilder';

describe('dashboard bulk actions', () => {
    beforeEach(() => {
        window.moment = moment;
    });

    it('postpones only tasks that have due dates and leaves originals untouched', () => {
        const dated = new TaskBuilder().dueDate('2026-07-28 09:00').build();
        const undated = new TaskBuilder().build();

        const replacements = postponeTasks([dated, undated], 2);

        expect(replacements).toHaveLength(1);
        expect(replacements[0].newTasks[0].dueDate?.format('YYYY-MM-DD HH:mm')).toBe('2026-07-30 09:00');
        expect(dated.dueDate?.format('YYYY-MM-DD HH:mm')).toBe('2026-07-28 09:00');
    });

    it('changes priority for every selected task', () => {
        const tasks = [new TaskBuilder().build(), new TaskBuilder().build()];

        const replacements = reprioritiseTasks(tasks, Priority.Highest);

        expect(replacements.map(({ newTasks }) => newTasks[0].priority)).toEqual([Priority.Highest, Priority.Highest]);
        expect(tasks.map((task) => task.priority)).toEqual([Priority.None, Priority.None]);
    });

    it('changes selected tasks to the requested priority quadrant', () => {
        const task = new TaskBuilder().description('Plan work 🔥').priority(Priority.Highest).build();

        const replacements = reprioritiseTasksByQuadrant([task], 'IN');

        expect(replacements[0].newTasks[0].description).toBe('Plan work 🎯');
        expect(replacements[0].newTasks[0].priority).toBe(Priority.High);
    });

    it('changes status using the task recurrence-aware status operation', () => {
        const task = new TaskBuilder().build();

        const replacements = changeTasksStatus([task], Status.DONE, moment('2026-07-28'));

        expect(replacements[0].newTasks[0].status).toBe(Status.DONE);
        expect(replacements[0].newTasks[0].doneDate?.format('YYYY-MM-DD')).toBe('2026-07-28');
    });

    it('updates only edited rows immediately while preserving the drill-down order', () => {
        const first = new TaskBuilder().description('First').build();
        const second = new TaskBuilder().description('Second').build();
        const currentSecond = new TaskBuilder().description('Second').build();
        const updatedSecond = new TaskBuilder().description('Second updated').build();

        const updated = updateTaskListAfterBulkEdit(
            [first, second],
            [second],
            [currentSecond],
            [{ originalTask: currentSecond, newTasks: [updatedSecond] }],
        );

        expect(updated).toEqual([first, updatedSecond]);
    });

    it('keeps a selected row unchanged when its bulk action has no replacement', () => {
        const dated = new TaskBuilder().description('Dated').dueDate('2026-07-28').build();
        const undated = new TaskBuilder().description('Undated').build();

        const updated = updateTaskListAfterBulkEdit([dated, undated], [undated], [undated], []);

        expect(updated).toEqual([dated, undated]);
    });

    it('returns only replacements whose serial writes succeeded', async () => {
        const first = new TaskBuilder().description('First').build();
        const second = new TaskBuilder().description('Second').build();
        const firstReplacement = {
            originalTask: first,
            newTasks: [new TaskBuilder().description('First updated').build()],
        };
        const secondReplacement = {
            originalTask: second,
            newTasks: [new TaskBuilder().description('Second updated').build()],
        };
        const save = jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);

        const saved = await saveTaskReplacements([firstReplacement, secondReplacement], save);

        expect(saved).toEqual([firstReplacement]);
        expect(save).toHaveBeenCalledTimes(2);
        expect(save.mock.calls).toEqual([[firstReplacement], [secondReplacement]]);
    });
});

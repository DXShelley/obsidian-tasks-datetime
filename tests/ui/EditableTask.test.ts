/**
 * @jest-environment jsdom
 */
import moment from 'moment';
import type { Task } from 'Task/Task';
import { GlobalFilter } from '../../src/Config/GlobalFilter';
import { updateSettings } from '../../src/Config/Settings';
import { Status } from '../../src/Statuses/Status';
import { OnCompletion } from '../../src/Task/OnCompletion';
import { Priority } from '../../src/Task/Priority';
import { EditableTask } from '../../src/ui/EditableTask';
import { TaskBuilder } from '../TestingTools/TaskBuilder';

window.moment = moment;

function testEditableTaskDescriptionAndGlobalFilterOnSave({
    globalFilter,
    taskDescription,
    expectedEditableTaskDescription,
}: {
    globalFilter: string;
    taskDescription: string;
    expectedEditableTaskDescription: string;
}) {
    GlobalFilter.getInstance().set(globalFilter);
    const taskWithoutGlobalFilter = new TaskBuilder().description(taskDescription).build();

    const editableTask = EditableTask.fromTask(taskWithoutGlobalFilter, [taskWithoutGlobalFilter]);

    expect(editableTask.description).toEqual(expectedEditableTaskDescription);
}

describe('EditableTask tests', () => {
    beforeEach(() => {
        GlobalFilter.getInstance().reset();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-05-01T13:14:15'));
    });

    afterEach(() => {
        jest.useRealTimers();
        updateSettings({ taskFormat: 'tasksPluginEmoji' });
    });

    it('should create an editable task without dependencies', () => {
        const taskToEdit = TaskBuilder.createFullyPopulatedTask();

        const editableTask = EditableTask.fromTask(taskToEdit, [taskToEdit]);

        expect(editableTask).toMatchInlineSnapshot(`
            EditableTask {
              "addGlobalFilterOnSave": false,
              "blockedBy": [],
              "blocking": [],
              "cancelledDate": "2023-07-06",
              "createdDate": "2023-07-01",
              "description": "Do exercises #todo #health",
              "doneDate": "2023-07-05",
              "dueDate": "2023-07-04",
              "forwardOnly": true,
              "importance": "normal",
              "onCompletion": "delete",
              "originalBlocking": [],
              "priority": "medium",
              "priorityDimensionsEnabled": false,
              "recurrenceRule": "every day when done",
              "scheduledDate": "2023-07-03",
              "startDate": "2023-07-02",
              "status": Status {
                "configuration": StatusConfiguration {
                  "availableAsCommand": true,
                  "name": "Todo",
                  "nextStatusSymbol": "x",
                  "symbol": " ",
                  "type": "TODO",
                },
              },
              "urgency": "normal",
            }
        `);
    });

    it('should create an editable task with dependencies', () => {
        const taskToEdit = TaskBuilder.createFullyPopulatedTask();
        const blockingTask = new TaskBuilder().description('I am blocking the task to edit').id('123456').build();
        const blockedTask = new TaskBuilder()
            .description('I am blocked by the task to edit')
            .dependsOn(['abcdef'])
            .build();
        const allTasks = [taskToEdit, blockingTask, blockedTask];

        const editableTask = EditableTask.fromTask(taskToEdit, allTasks);

        expect(editableTask.blocking).toEqual([blockedTask]);
        expect(editableTask.blockedBy).toEqual([blockingTask]);
    });

    it('should remember to add global filter when it is absent in task description', () => {
        testEditableTaskDescriptionAndGlobalFilterOnSave({
            globalFilter: '#todo',
            taskDescription: 'global filter is absent',
            expectedEditableTaskDescription: 'global filter is absent',
        });
    });

    it('should remember to add global filter when it is present in task description and remove it from the description', () => {
        testEditableTaskDescriptionAndGlobalFilterOnSave({
            globalFilter: '#important',
            taskDescription: '#important is the global filter',
            expectedEditableTaskDescription: 'is the global filter',
        });
    });

    it('should not add global filter by default (global filter was not set)', () => {
        testEditableTaskDescriptionAndGlobalFilterOnSave({
            globalFilter: GlobalFilter.empty,
            taskDescription: 'global filter has not been set',
            expectedEditableTaskDescription: 'global filter has not been set',
        });
    });

    it('should apply no edits to an empty task', async () => {
        const task = new TaskBuilder().build();
        const allTasks = [task];

        const editableTask = EditableTask.fromTask(task, allTasks);
        const appliedEdits = await editableTask.applyEdits(task, [task]);

        expect(appliedEdits).toEqual([task]);
    });

    it('preserves a legacy priority above normal when saving', async () => {
        const task = new TaskBuilder().description('Keep my existing priority').priority(Priority.High).build();
        const editableTask = EditableTask.fromTask(task, [task]);

        editableTask.description = 'Edited description';
        const [editedTask] = await editableTask.applyEdits(task, [task]);

        expect(editedTask.description).toBe('Edited description');
        expect(editedTask.priority).toBe(Priority.High);
        expect(editedTask.toFileLineString()).toBe('- [ ] Edited description ⏫');
    });

    it('preserves a legacy priority below normal when saving', async () => {
        const task = new TaskBuilder().description('Keep my existing priority').priority(Priority.Low).build();
        const editableTask = EditableTask.fromTask(task, [task]);
        const [editedTask] = await editableTask.applyEdits(task, [task]);

        expect(editedTask.description).toBe('Keep my existing priority');
        expect(editedTask.priority).toBe(Priority.Low);
        expect(editedTask.toFileLineString()).toBe('- [ ] Keep my existing priority 🔽');
    });

    it('stores non-default importance and urgency as a quadrant icon and uses their ordering priority', async () => {
        const task = new TaskBuilder().build();
        const editableTask = EditableTask.fromTask(task, [task]);

        editableTask.importance = 'heavy';
        editableTask.urgency = 'urgent';
        editableTask.priorityDimensionsEnabled = true;
        const [editedTask] = await editableTask.applyEdits(task, [task]);

        expect(editedTask.description).toContain('🔥');
        expect(editedTask.description).not.toMatch(/#(?:IU|IN|NU|NN)\b/u);
        expect(editedTask.priority).toBe(Priority.Highest);
    });

    it('preserves a quadrant icon used in the task body', async () => {
        const task = new TaskBuilder().description('Discuss the 🔥 launch').build();
        const editableTask = EditableTask.fromTask(task, [task]);

        editableTask.importance = 'light';
        editableTask.urgency = 'slow';
        editableTask.priorityDimensionsEnabled = true;
        const [editedTask] = await editableTask.applyEdits(task, [task]);

        expect(editedTask.description).toBe('Discuss the 🔥 launch 💤');
    });

    it('replaces an existing quadrant icon without duplicating it', async () => {
        const task = new TaskBuilder().description('Prioritised task 🔥').priority(Priority.Highest).build();
        const editableTask = EditableTask.fromTask(task, [task]);

        editableTask.importance = 'light';
        editableTask.urgency = 'slow';
        const [editedTask] = await editableTask.applyEdits(task, [task]);

        expect(editedTask.description).toBe('Prioritised task 💤');
        expect(editedTask.priority).toBe(Priority.Lowest);
    });

    it('loads priority dimensions from a quadrant icon', () => {
        const task = new TaskBuilder().description('Prioritised task 🎯').build();
        const editableTask = EditableTask.fromTask(task, [task]);

        expect(editableTask.priorityDimensionsEnabled).toBe(true);
        expect(editableTask.importance).toBe('heavy');
        expect(editableTask.urgency).toBe('slow');
    });

    it('removes a priority-dimension icon when the matrix is cleared', async () => {
        const task = new TaskBuilder().description('Prioritised task 🔥').build();
        const editableTask = EditableTask.fromTask(task, [task]);

        editableTask.importance = 'normal';
        editableTask.urgency = 'normal';
        editableTask.priorityDimensionsEnabled = false;
        const [editedTask] = await editableTask.applyEdits(task, [task]);

        expect(editedTask.description).toBe('Prioritised task');
    });

    it('preserves user tags resembling legacy priority-dimension tags', async () => {
        const task = new TaskBuilder()
            .description('Prioritised task #tasks-importance-heavy #tasks-urgency-urgent')
            .build();
        const editableTask = EditableTask.fromTask(task, [task]);
        const [editedTask] = await editableTask.applyEdits(task, [task]);

        expect(editedTask.description).toBe('Prioritised task #tasks-importance-heavy #tasks-urgency-urgent');
    });

    it('preserves a Dataview priority field when saving an existing task', async () => {
        updateSettings({ taskFormat: 'dataview' });
        const task = new TaskBuilder().description('Prioritised task').priority(Priority.High).build();
        const editableTask = EditableTask.fromTask(task, [task]);

        const [editedTask] = await editableTask.applyEdits(task, [task]);

        expect(editedTask.description).toBe('Prioritised task');
        expect(editedTask.priority).toBe(Priority.High);
        expect(editedTask.toFileLineString()).toContain('[priority:: high]');
    });

    it.failing('should apply no edits to a fully populated task', async () => {
        const task = TaskBuilder.createFullyPopulatedTask();
        const allTasks = [task];

        const editableTask = EditableTask.fromTask(task, allTasks);
        const appliedEdits = await editableTask.applyEdits(task, [task]);

        expect(appliedEdits).toEqual([task]);
    });

    it('should apply edit all fields in a fully populated task', async () => {
        const task = TaskBuilder.createFullyPopulatedTask();
        const allTasks = [task];

        const editableTask = EditableTask.fromTask(task, allTasks);

        editableTask.description = '';
        editableTask.status = Status.TODO;
        editableTask.priority = 'none';
        editableTask.onCompletion = OnCompletion.Ignore;
        editableTask.recurrenceRule = '';
        editableTask.createdDate = '';
        editableTask.startDate = '';
        editableTask.scheduledDate = '';
        editableTask.dueDate = '';
        editableTask.doneDate = '';
        editableTask.cancelledDate = '';
        editableTask.forwardOnly = true;
        editableTask.blockedBy = [];
        editableTask.blocking = [];

        const appliedEdits = await editableTask.applyEdits(task, allTasks);

        expect(appliedEdits.length).toEqual(1);
        expect(appliedEdits[0]).toMatchInlineSnapshot(`
            Task {
              "_cancelledDate": null,
              "_createdDate": null,
              "_doneDate": null,
              "_dueDate": null,
              "_scheduledDate": null,
              "_startDate": null,
              "_urgency": null,
              "blockLink": " ^dcf64c",
              "children": [],
              "dependsOn": [],
              "description": "",
              "id": "abcdef",
              "indentation": "  ",
              "listMarker": "-",
              "onCompletion": "",
              "originalMarkdown": "  - [ ] Do exercises #todo #health 🆔 abcdef ⛔ 123456,abc123 🔼 🔁 every day when done 🏁 delete ➕ 2023-07-01 00:00:00 🛫 2023-07-02 00:00:00 ⏳ 2023-07-03 00:00:00 📅 2023-07-04 00:00:00 ❌ 2023-07-06 00:00:00 ✅ 2023-07-05 00:00:00 ^dcf64c",
              "parent": null,
              "priority": "2",
              "recurrence": null,
              "scheduledDateIsInferred": false,
              "status": Status {
                "configuration": StatusConfiguration {
                  "availableAsCommand": true,
                  "name": "Todo",
                  "nextStatusSymbol": "x",
                  "symbol": " ",
                  "type": "TODO",
                },
              },
              "statusCharacter": " ",
              "tags": [
                "#todo",
                "#health",
              ],
              "taskLocation": TaskLocation {
                "_lineNumber": 17,
                "_precedingHeader": "My Header",
                "_sectionIndex": 3,
                "_sectionStart": 5,
                "_tasksFile": TasksFile {
                  "_cachedMetadata": {},
                  "_frontmatter": {
                    "tags": [],
                  },
                  "_outlinksInBody": [],
                  "_outlinksInProperties": [],
                  "_path": "some/folder/fileName.md",
                  "_tags": [],
                  "tFile": undefined,
                },
              },
            }
        `);
    });

    it('should set a date in YYYY-MM-DD format', async () => {
        const task = new TaskBuilder().build();
        const allTasks: Task[] = [];
        const editableTask = EditableTask.fromTask(task, allTasks);

        editableTask.dueDate = '2024-07-13';

        const editedTasks = await editableTask.applyEdits(task, allTasks);
        expect(editedTasks[0].dueDate).toEqualMoment(moment('2024-07-13T13:14:15.000Z'));
    });

    it('preserves a hidden time when editing an existing task', async () => {
        updateSettings({ enableDateTime: false });
        const task = new TaskBuilder().dueDate('2024-07-13 13:14:15').build();
        const editableTask = EditableTask.fromTask(task, [task]);

        const [editedTask] = await editableTask.applyEdits(task, [task]);

        expect(editedTask.dueDate?.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-07-13 13:14:15');
    });

    it('upgrades a legacy midnight date to the current time when saving', async () => {
        updateSettings({ enableDateTime: false });
        const task = new TaskBuilder().dueDate('2024-07-13 00:00:00').build();
        const editableTask = EditableTask.fromTask(task, [task]);

        const [editedTask] = await editableTask.applyEdits(task, [task]);

        expect(editedTask.dueDate?.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-07-13 13:14:15');
        expect(editedTask.toFileLineString()).toContain('📅 2024-07-13 13:14:15');
    });

    it('should honour the forwardOnly value', async () => {
        const task = new TaskBuilder().build();
        const allTasks: Task[] = [];
        const editableTask = EditableTask.fromTask(task, allTasks);

        jest.setSystemTime(new Date('2024-05-22')); // Wednesday 22nd May

        editableTask.dueDate = 'tuesday';
        const tuesdayBefore = moment('2024-05-28T00:00:00.000Z');
        const tuesdayAfter = moment('2024-05-21T00:00:00.000Z');

        editableTask.forwardOnly = true;
        const tasksFutureDay = await editableTask.applyEdits(task, allTasks);
        expect(tasksFutureDay[0].dueDate).toEqualMoment(tuesdayBefore);

        editableTask.forwardOnly = false;
        const tasksClosestDay = await editableTask.applyEdits(task, allTasks);
        expect(tasksClosestDay[0].dueDate).toEqualMoment(tuesdayAfter);
    });
});

describe('parseAndValidateRecurrence() tests', () => {
    const emptyTask = new TaskBuilder().description('').build();

    const noRecurrenceRule = (editableTask: EditableTask) => {
        editableTask.recurrenceRule = '';
        return editableTask;
    };
    const invalidRecurrenceRule = (editableTask: EditableTask) => {
        editableTask.recurrenceRule = 'thisIsWrong';
        return editableTask;
    };
    const withRecurrenceRuleButNoHappensDate = (editableTask: EditableTask) => {
        editableTask.recurrenceRule = 'every day';
        return editableTask;
    };
    const withRecurrenceRuleAndHappensDate = (editableTask: EditableTask) => {
        editableTask.recurrenceRule = 'every 1 months when done'; // confirm that recurrence text is standardised
        editableTask.startDate = '2024-05-20';
        return editableTask;
    };

    it.each([
        // editable task, expected parsed recurrence, expected recurrence validity
        [noRecurrenceRule, '<i>not recurring</>', true],
        [invalidRecurrenceRule, '<i>invalid recurrence rule</i>', false],
        [withRecurrenceRuleButNoHappensDate, '<i>due, scheduled or start date required</i>', false],
        [withRecurrenceRuleAndHappensDate, 'every month when done', true],
    ])(
        "editable task with '%s' fields should have '%s' parsed recurrence and its validity is %s",
        (
            taskEditor: (editableTask: EditableTask) => EditableTask,
            expectedParsedRecurrence: string,
            expectedRecurrenceValidity: boolean,
        ) => {
            const editableTask = EditableTask.fromTask(emptyTask, [emptyTask]);
            const editedTask = taskEditor(editableTask);

            const { parsedRecurrence, isRecurrenceValid } = editedTask.parseAndValidateRecurrence();
            expect(parsedRecurrence).toEqual(expectedParsedRecurrence);
            expect(isRecurrenceValid).toEqual(expectedRecurrenceValidity);
        },
    );
});

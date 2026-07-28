import type { Moment } from 'moment';
import type { Status } from '../Statuses/Status';
import type { Priority } from '../Task/Priority';
import {
    type PriorityQuadrant,
    priorityForPriorityQuadrant,
    priorityQuadrantIcons,
    removePriorityQuadrantMarkers,
} from '../Task/PriorityQuadrant';
import { Task } from '../Task/Task';

export interface TaskReplacement {
    originalTask: Task;
    newTasks: Task[];
}

/** Saves task replacements serially and returns only the rows that were written successfully. */
export async function saveTaskReplacements(
    replacements: TaskReplacement[],
    save: (replacement: TaskReplacement) => Promise<boolean>,
): Promise<TaskReplacement[]> {
    const saved: TaskReplacement[] = [];
    for (const replacement of replacements) {
        if (await save(replacement)) saved.push(replacement);
    }
    return saved;
}

/**
 * Replaces the selected source rows with their freshly edited task instances,
 * without waiting for Obsidian's task cache to update.
 */
export function updateTaskListAfterBulkEdit(
    displayedTasks: Task[],
    selectedTasks: Task[],
    currentTasks: Task[],
    replacements: TaskReplacement[],
): Task[] {
    const selectedTaskByCurrentTask = new Map(currentTasks.map((task, index) => [task, selectedTasks[index]]));
    const replacementsBySelectedTask = new Map<Task, Task[]>();

    for (const replacement of replacements) {
        const selectedTask = selectedTaskByCurrentTask.get(replacement.originalTask);
        if (selectedTask !== undefined) replacementsBySelectedTask.set(selectedTask, replacement.newTasks);
    }

    return displayedTasks.flatMap((task) => replacementsBySelectedTask.get(task) ?? [task]);
}

export function postponeTasks(tasks: Task[], days: number): TaskReplacement[] {
    return tasks.flatMap((task) => {
        if (task.dueDate === null) {
            return [];
        }
        return [
            { originalTask: task, newTasks: [new Task({ ...task, dueDate: task.dueDate.clone().add(days, 'days') })] },
        ];
    });
}

export function reprioritiseTasks(tasks: Task[], priority: Priority): TaskReplacement[] {
    return tasks.map((task) => ({ originalTask: task, newTasks: [new Task({ ...task, priority })] }));
}

export function reprioritiseTasksByQuadrant(tasks: Task[], quadrant: PriorityQuadrant): TaskReplacement[] {
    return tasks.map((task) => ({
        originalTask: task,
        newTasks: [
            new Task({
                ...task,
                description: `${removePriorityQuadrantMarkers(task.description).trim()} ${
                    priorityQuadrantIcons[quadrant]
                }`,
                priority: priorityForPriorityQuadrant(quadrant),
            }),
        ],
    }));
}

export function changeTasksStatus(tasks: Task[], status: Status, now: Moment): TaskReplacement[] {
    return tasks.map((task) => ({
        originalTask: task,
        newTasks: task.handleNewStatusWithRecurrenceInUsersOrder(status, now),
    }));
}

import type { ListItemCache } from 'obsidian';

import { getUserSelectedTaskFormat } from '../Config/Settings';
import { TaskRegularExpressions } from '../Task/TaskRegularExpressions';
import { generateTaskId } from './TaskIdGenerator';

const taskIdRegex = /(?:^|\s)🆔\uFE0F?\s*([a-zA-Z0-9_-]+)(?=\s|$)/u;
const firstDateTimeFieldRegex = /\s(?:➕|🛫|⏳|⌛|📅|📆|🗓|✅|❌)\uFE0F?\s*\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?/u;
const tagCandidateRegex = /(^|\s)#[^ !@#$%^&*(),.?":{}|<>]+/u;

export type TaskIdEditResult = {
    content: string;
    added: number;
    missing: number;
    additions: TaskIdAddition[];
};

export type TaskIdAddition = {
    lineNumber: number;
    cursorColumn: number;
    line: string;
};

export type TaskIdCompletionOptions = {
    requireTagAndDescription?: boolean;
    requireTrailingSpace?: boolean;
};

function taskLineNumbers(listItems: ListItemCache[]): number[] {
    return listItems.filter((listItem) => listItem.task !== undefined).map((listItem) => listItem.position.start.line);
}

function addIdToTaskLine(line: string, id: string): { line: string; cursorColumn: number } {
    const firstDateTimeField = firstDateTimeFieldRegex.exec(line);
    if (firstDateTimeField?.index !== undefined) {
        const prefix = `${line.slice(0, firstDateTimeField.index).trimEnd()} 🆔 ${id} `;
        return { line: prefix + line.slice(firstDateTimeField.index).trimStart(), cursorColumn: prefix.length };
    }

    const lineWithId = `${line.trimEnd()} 🆔 ${id} `;
    return { line: lineWithId, cursorColumn: lineWithId.length };
}

function hasTagAndDescription(line: string): boolean {
    // Avoid deserializing common task lines that cannot qualify for automatic ID creation.
    if (!tagCandidateRegex.test(line)) return false;

    const taskMatch = TaskRegularExpressions.taskRegex.exec(line);
    if (taskMatch === null) return false;

    const taskDetails = getUserSelectedTaskFormat().taskSerializer.deserialize(taskMatch[4]);
    return (
        taskDetails.tags.length > 0 &&
        taskDetails.description.replace(TaskRegularExpressions.hashTags, '').trim() !== ''
    );
}

function isMissingIdTask(line: string, options: TaskIdCompletionOptions): boolean {
    if (!TaskRegularExpressions.taskRegex.test(line) || taskIdRegex.test(line)) return false;
    if (options.requireTrailingSpace && !/[ \t]$/u.test(line)) return false;
    return !options.requireTagAndDescription || hasTagAndDescription(line);
}

/**
 * Adds IDs only to task lines supplied by Obsidian's current metadata cache.
 * Existing IDs, including duplicates, are intentionally left unchanged.
 */
export function addMissingTaskIds(
    content: string,
    listItems: ListItemCache[],
    options: TaskIdCompletionOptions = {},
): TaskIdEditResult {
    const lines = content.split('\n');
    let added = 0;
    let missing = 0;
    const additions: TaskIdAddition[] = [];

    for (const lineNumber of taskLineNumbers(listItems)) {
        const line = lines[lineNumber];
        if (line === undefined || !isMissingIdTask(line, options)) {
            continue;
        }

        missing++;
        const taskLineWithId = addIdToTaskLine(line, generateTaskId());
        lines[lineNumber] = taskLineWithId.line;
        additions.push({ lineNumber, cursorColumn: taskLineWithId.cursorColumn, line: taskLineWithId.line });
        added++;
    }

    return { content: lines.join('\n'), added, missing, additions };
}

/** Reports missing IDs without generating or modifying anything. */
export function previewMissingTaskIds(
    content: string,
    listItems: ListItemCache[],
    options: TaskIdCompletionOptions = {},
): number {
    const lines = content.split('\n');

    return taskLineNumbers(listItems).filter((lineNumber) => {
        const line = lines[lineNumber];
        return line !== undefined && isMissingIdTask(line, options);
    }).length;
}

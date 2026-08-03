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

function taskLineNumbersFromSource(content: string): number[] {
    const lineNumbers: number[] = [];
    let fence: { marker: '`' | '~'; length: number } | null = null;

    for (const [lineNumber, line] of content.split('\n').entries()) {
        if (fence !== null) {
            const closingFence = new RegExp(`^ {0,3}${fence.marker}{${fence.length},}\\s*$`, 'u');
            if (closingFence.test(line)) {
                fence = null;
            }
            continue;
        }

        const openingFence = /^( {0,3})(`{3,}|~{3,})(.*)$/u.exec(line);
        if (openingFence !== null) {
            const marker = openingFence[2][0] as '`' | '~';
            if (marker === '~' || !openingFence[3].includes('`')) {
                fence = { marker, length: openingFence[2].length };
                continue;
            }
        }

        if (TaskRegularExpressions.taskRegex.test(line)) {
            lineNumbers.push(lineNumber);
        }
    }

    return lineNumbers;
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
    return addMissingTaskIdsOnLines(content, taskLineNumbers(listItems), options);
}

function addMissingTaskIdsOnLines(
    content: string,
    lineNumbers: readonly number[],
    options: TaskIdCompletionOptions,
): TaskIdEditResult {
    const lines = content.split('\n');
    let added = 0;
    let missing = 0;
    const additions: TaskIdAddition[] = [];

    for (const lineNumber of lineNumbers) {
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

/** Adds IDs by scanning task lines in the original Markdown source. */
export function addMissingTaskIdsInSource(content: string, options: TaskIdCompletionOptions = {}): TaskIdEditResult {
    return addMissingTaskIdsOnLines(content, taskLineNumbersFromSource(content), options);
}

/** Reports missing IDs without generating or modifying anything. */
export function previewMissingTaskIds(
    content: string,
    listItems: ListItemCache[],
    options: TaskIdCompletionOptions = {},
): number {
    return previewMissingTaskIdsOnLines(content, taskLineNumbers(listItems), options);
}

function previewMissingTaskIdsOnLines(
    content: string,
    lineNumbers: readonly number[],
    options: TaskIdCompletionOptions,
): number {
    const lines = content.split('\n');

    return lineNumbers.filter((lineNumber) => {
        const line = lines[lineNumber];
        return line !== undefined && isMissingIdTask(line, options);
    }).length;
}

/** Reports missing IDs by scanning task lines in the original Markdown source. */
export function previewMissingTaskIdsInSource(content: string, options: TaskIdCompletionOptions = {}): number {
    return previewMissingTaskIdsOnLines(content, taskLineNumbersFromSource(content), options);
}

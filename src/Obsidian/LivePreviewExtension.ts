import { EditorState, RangeSetBuilder, type Text, type Transaction } from '@codemirror/state';
import type { DecorationSet, PluginValue, ViewUpdate } from '@codemirror/view';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import { type App, editorLivePreviewField } from 'obsidian';
import { TasksFile } from '../Scripting/TasksFile';

import { Task } from '../Task/Task';
import { TaskLocation } from '../Task/TaskLocation';
import { TaskRegularExpressions } from '../Task/TaskRegularExpressions';
import { taskDateSymbolsPattern } from '../DateTime/TaskDateTime';
import { type SettingsSaver, showDismissibleNotice } from '../Config/DismissibleNotices';
import { getSettings } from '../Config/Settings';
import { i18n } from '../i18n/i18n';
import { getToggleTaskDoneCommandName } from '../Commands';
import { StatusRegistry } from '../Statuses/StatusRegistry';
import { StatusMenu } from '../ui/Menus/StatusMenu';
import { showMenu } from '../ui/Menus/TaskEditingMenu';
import { TaskModal } from './TaskModal';

interface LivePreviewPlugin extends SettingsSaver {
    app: App;
    getTasks(): Task[];
}

// CodeMirror constructs view plugins with only the EditorView, so capture the Tasks plugin here
// to enable us to ask the plugin to save settings.
export const newLivePreviewExtension = (plugin: LivePreviewPlugin) => {
    return [
        EditorState.changeFilter.of(taskInternalReferenceChangeFilter),
        ViewPlugin.fromClass(
            class extends LivePreviewExtension {
                constructor(view: EditorView) {
                    super(view, plugin);
                }
            },
            {
                decorations: (extension) => extension.dateTimeDecorations,
                provide: (extension) =>
                    EditorView.atomicRanges.of((view) => view.plugin(extension)?.atomicRanges ?? Decoration.none),
            },
        ),
    ];
};

const livePreviewExtensions = new Set<LivePreviewExtension>();
const taskDateTimeRegex = new RegExp(
    `${taskDateSymbolsPattern}\\s*\\d{4}-\\d{2}-\\d{2}(\\s+\\d{2}:\\d{2}:\\d{2})`,
    'gu',
);
export type TaskDecorationKind = 'internalReference' | 'dateTime';

export interface TaskDecorationRange {
    from: number;
    to: number;
    kind: TaskDecorationKind;
}

/** Refreshes the visible task date format after the time-display setting changes. */
export function refreshLivePreviewTaskDateDisplay(): void {
    livePreviewExtensions.forEach((extension) => extension.refreshDateTimeDecorations());
}

export function taskDateTimeRangesInLine(line: string, lineStart: number): { from: number; to: number }[] {
    const ranges: { from: number; to: number }[] = [];
    for (const match of line.matchAll(taskDateTimeRegex)) {
        const time = match[1];
        const matchStart = match.index;
        if (matchStart === undefined || time === undefined) {
            continue;
        }
        const from = lineStart + matchStart + match[0].length - time.length;
        ranges.push({ from, to: from + time.length });
    }
    return ranges;
}

/** Returns task ID and dependency fields, including their preceding separator when present. */
export function taskInternalReferenceRangesInLine(line: string, lineStart: number): { from: number; to: number }[] {
    const ranges: { from: number; to: number }[] = [];
    for (const match of line.matchAll(TaskRegularExpressions.taskInternalReferenceRegex)) {
        const matchStart = match.index;
        if (matchStart === undefined) {
            continue;
        }
        let to = lineStart + matchStart + match[0].length;

        // Generated IDs always have a trailing space. Keep that space in the
        // hidden/atomic range so deleting it removes the complete ID instead
        // of leaving an ID with an invalid delimiter. Do not claim the space
        // before another internal reference, because that reference owns its
        // leading separator and the decoration ranges must not overlap.
        if (match[0].includes('🆔')) {
            const nextText = line.slice(to - lineStart);
            const nextNonWhitespace = nextText.trimStart();
            if (nextText.length > 0 && !nextNonWhitespace.startsWith('🆔') && !nextNonWhitespace.startsWith('⛔')) {
                to += 1;
            }
        }

        ranges.push({ from: lineStart + matchStart, to });
    }
    return ranges;
}

/**
 * Returns all Live Preview decoration ranges in document order.
 * CodeMirror's RangeSetBuilder rejects ranges that are added out of order, so
 * internal references and date-time ranges must be merged before decoration.
 */
export function taskDecorationRangesInLine(
    line: string,
    lineStart: number,
    hideDateTime: boolean,
): TaskDecorationRange[] {
    const ranges: TaskDecorationRange[] = taskInternalReferenceRangesInLine(line, lineStart).map((range) => ({
        ...range,
        kind: 'internalReference',
    }));

    if (hideDateTime) {
        ranges.push(
            ...taskDateTimeRangesInLine(line, lineStart).map((range) => ({
                ...range,
                kind: 'dateTime' as const,
            })),
        );
    }

    return ranges.sort((a, b) => a.from - b.from || a.to - b.to);
}

function taskInternalReferenceRangesInDocument(doc: Text): { from: number; to: number }[] {
    const ranges: { from: number; to: number }[] = [];
    for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber++) {
        const line = doc.line(lineNumber);
        if (!TaskRegularExpressions.taskRegex.test(line.text)) {
            continue;
        }
        ranges.push(...taskInternalReferenceRangesInLine(line.text, line.from));
    }
    return ranges;
}

function changeTouchesRange(from: number, to: number, range: { from: number; to: number }): boolean {
    if (from === to) {
        return from > range.from && from < range.to;
    }
    return from < range.to && to > range.from;
}

function deletesWholeTaskLine(
    doc: Text,
    from: number,
    to: number,
    inserted: Text,
    range: { from: number; to: number },
): boolean {
    if (inserted.length !== 0) {
        return false;
    }
    const line = doc.lineAt(range.from);
    return from <= line.from && to >= line.to;
}

function internalReferenceWasChanged(transaction: Transaction, range: { from: number; to: number }): boolean {
    const line = transaction.startState.doc.lineAt(range.from);
    const mappedFrom = transaction.changes.mapPos(range.from, 1);
    const mappedTo = transaction.changes.mapPos(range.to, -1);
    const oldField = line.text.slice(range.from - line.from, range.to - line.from);
    const markerOffset = Math.max(oldField.indexOf('🆔'), oldField.indexOf('⛔'));
    const idMarkerOffset = oldField.indexOf('🆔');
    const atomicStart = range.from + markerOffset;
    const referenceCoreLength =
        markerOffset >= 0
            ? oldField
                  .slice(markerOffset)
                  .match(/(?:🆔\uFE0F?\s*[a-zA-Z0-9_-]+|⛔\uFE0F?\s*[a-zA-Z0-9_-]+(?:\s*,\s*[a-zA-Z0-9_-]+)*)/u)?.[0]
                  .length ?? 0
            : 0;
    const referenceCoreEnd = atomicStart + referenceCoreLength;
    const idValueEnd =
        idMarkerOffset >= 0
            ? range.from +
              idMarkerOffset +
              (oldField.slice(idMarkerOffset).match(/🆔\uFE0F?\s*[a-zA-Z0-9_-]+/u)?.[0].length ?? 0)
            : -1;

    // A task checkbox click and the task modal rewrite the complete line. In that case
    // CodeMirror maps the old range to the replacement boundary, so compare the old
    // internal field with the inserted line text directly.
    let fullLineReplacement: string | undefined;
    transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
        if (fromA <= line.from && toA >= line.to && inserted.length > 0) {
            fullLineReplacement = inserted.toString();
        }
    });

    // Typing a date after an ID is allowed, including for legacy lines that
    // were saved without the canonical trailing space. The inserted delimiter
    // becomes the ID's required separator and does not edit the ID value.
    if (idValueEnd >= 0) {
        let insertedDelimiterAfterId = false;
        transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
            if (fromA === idValueEnd && toA === idValueEnd && inserted.length > 0 && /^\s/u.test(inserted.toString())) {
                insertedDelimiterAfterId = true;
            }
        });
        if (insertedDelimiterAfterId) {
            return false;
        }
    }

    // Replacing or deleting the complete internal field is an atomic edit.
    // Partial edits remain blocked below.
    let replacedWholeReference = false;
    transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
        const coversWholeReference =
            (fromA === range.from || fromA === atomicStart) && (toA === range.to || toA === referenceCoreEnd);
        if (!coversWholeReference) {
            return;
        }
        if (inserted.length === 0) {
            replacedWholeReference = true;
            return;
        }

        const replacement = inserted.toString();
        const matches = [...replacement.matchAll(TaskRegularExpressions.taskInternalReferenceRegex)];
        replacedWholeReference =
            matches.length === 1 &&
            matches[0][0] === replacement.trimEnd() &&
            (fromA !== range.from || !/^\s/u.test(oldField) || /^\s/u.test(replacement)) &&
            (!matches[0][0].includes('🆔') || /\s$/u.test(replacement) || /\s$/u.test(oldField));
    });
    if (replacedWholeReference) {
        return false;
    }

    if (fullLineReplacement !== undefined) {
        const oldRanges = taskInternalReferenceRangesInLine(line.text, line.from);
        const oldIndex = oldRanges.findIndex((candidate) => candidate.from === range.from && candidate.to === range.to);
        const replacementLine = fullLineReplacement.split(/\r?\n/u, 1)[0] ?? '';
        const newRanges = taskInternalReferenceRangesInLine(replacementLine, 0);
        if (oldIndex < 0 || oldIndex >= newRanges.length || oldRanges.length !== newRanges.length) {
            return true;
        }

        const before = line.text.slice(range.from - line.from, range.to - line.from);
        const after = replacementLine.slice(newRanges[oldIndex].from, newRanges[oldIndex].to);
        return before !== after;
    }

    if (mappedTo < mappedFrom) {
        return true;
    }

    const before = transaction.startState.doc.sliceString(range.from, range.to);
    const after = transaction.newDoc.sliceString(mappedFrom, mappedTo);
    return before !== after;
}

/**
 * Prevents changing internal task references in either editing mode.
 * Deleting the complete task line remains allowed so a newly created task can receive a new ID.
 */
export function taskInternalReferenceChangeFilter(transaction: Transaction): boolean | readonly number[] {
    if (!transaction.docChanged) {
        return true;
    }

    const internalReferenceRanges = taskInternalReferenceRangesInDocument(transaction.startState.doc);
    for (const range of internalReferenceRanges) {
        let blocked = false;
        const oldField = transaction.startState.doc.sliceString(range.from, range.to);
        const hasTrailingDelimiter = /\s$/u.test(oldField);
        transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
            // An ID or dependency value without a trailing space is still an
            // atomic field. Appending a non-whitespace character would mutate
            // it; appending the delimiter is the one allowed boundary edit.
            if (
                fromA === range.to &&
                toA === range.to &&
                !hasTrailingDelimiter &&
                inserted.length > 0 &&
                !/^\s/u.test(inserted.toString())
            ) {
                blocked = true;
                return;
            }
            if (
                changeTouchesRange(fromA, toA, range) &&
                !deletesWholeTaskLine(transaction.startState.doc, fromA, toA, inserted, range) &&
                internalReferenceWasChanged(transaction, range)
            ) {
                blocked = true;
            }
        });
        if (blocked) {
            return false;
        }
    }

    return true;
}

/** Returns whether a DOM line is currently rendered as Markdown source. */
export function taskLineDisplaysMarkdownSource(lineElement: Element | null): boolean {
    return /^\s*(?:[-+*]|\d+[.)])\s+\[[^\]]\]/u.test(lineElement?.textContent ?? '');
}

export function isTaskLineActive(lineFrom: number, activeLineFrom: number): boolean {
    return lineFrom === activeLineFrom;
}

/**
 * Integrate custom handling of checkbox clicks in the Obsidian editor's Live Preview mode.
 *
 * This class is primarily designed for checkbox-driven task management in the Obsidian plugin, overriding the default handling behavior.
 * It listens for click events, detects checkbox interactions, and updates the document state accordingly.
 *
 * Bug reports associated with this code: (label:"display: live preview")
 * https://github.com/obsidian-tasks-group/obsidian-tasks/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22display%3A%20live%20preview%22%20label%3A%22type%3A%20bug%22
 *
 * See also {@link InlineRenderer} which handles Markdown task lines in Obsidian's Reading mode.
 */
class LivePreviewExtension implements PluginValue {
    private readonly view: EditorView;
    private readonly plugin: LivePreviewPlugin;
    public dateTimeDecorations: DecorationSet;
    public atomicRanges: DecorationSet;
    private dateTimeDecorationsNeedRefresh = false;
    private dateTimeDecorationRefreshFrame: number | undefined;

    constructor(view: EditorView, plugin: LivePreviewPlugin) {
        this.view = view;
        this.plugin = plugin;
        this.dateTimeDecorations = this.buildDateTimeDecorations();
        this.atomicRanges = this.buildAtomicRanges();
        livePreviewExtensions.add(this);

        this.view.dom.addEventListener('click', this.handleClickEvent);
        this.view.dom.addEventListener('contextmenu', this.handleContextMenuEvent);
    }

    public destroy(): void {
        livePreviewExtensions.delete(this);
        this.view.dom.removeEventListener('click', this.handleClickEvent);
        this.view.dom.removeEventListener('contextmenu', this.handleContextMenuEvent);
        if (this.dateTimeDecorationRefreshFrame !== undefined) {
            cancelAnimationFrame(this.dateTimeDecorationRefreshFrame);
        }
    }

    public update(update: ViewUpdate): void {
        const livePreviewModeChanged =
            update.startState.field(editorLivePreviewField, false) !==
            update.state.field(editorLivePreviewField, false);

        if (update.docChanged || update.selectionSet || livePreviewModeChanged || this.dateTimeDecorationsNeedRefresh) {
            this.dateTimeDecorationsNeedRefresh = false;
            this.dateTimeDecorations = this.buildDateTimeDecorations();
        }
        if (update.docChanged || livePreviewModeChanged) {
            this.atomicRanges = this.buildAtomicRanges();
        }
        if (update.selectionSet || livePreviewModeChanged) {
            this.refreshDateTimeDecorationsAfterDomUpdate();
        }
    }

    public refreshDateTimeDecorations(): void {
        this.dateTimeDecorationsNeedRefresh = true;
        this.view.dispatch({});
    }

    private buildDateTimeDecorations(): DecorationSet {
        if (this.view.state.field(editorLivePreviewField, false) !== true) {
            return Decoration.none;
        }

        const builder = new RangeSetBuilder<Decoration>();
        for (let lineNumber = 1; lineNumber <= this.view.state.doc.lines; lineNumber++) {
            const line = this.view.state.doc.line(lineNumber);
            if (!TaskRegularExpressions.taskRegex.test(line.text)) {
                continue;
            }
            const hideDateTime = !getSettings().enableDateTime && !this.taskLineDisplaysMarkdownSource(line.from);
            for (const range of taskDecorationRangesInLine(line.text, line.from, hideDateTime)) {
                if (range.kind === 'internalReference') {
                    // A mark is retained when Obsidian turns the active task row back into source text.
                    builder.add(range.from, range.to, Decoration.mark({ class: 'tasks-task-internal-reference' }));
                } else {
                    builder.add(range.from, range.to, Decoration.replace({}));
                }
            }
        }
        return builder.finish();
    }

    /** Makes internal fields atomic in both Live Preview and Source mode. */
    private buildAtomicRanges(): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        for (let lineNumber = 1; lineNumber <= this.view.state.doc.lines; lineNumber++) {
            const line = this.view.state.doc.line(lineNumber);
            if (!TaskRegularExpressions.taskRegex.test(line.text)) {
                continue;
            }
            for (const range of taskInternalReferenceRangesInLine(line.text, line.from)) {
                builder.add(range.from, range.to, Decoration.mark({}));
            }
        }
        return builder.finish();
    }

    private taskLineDisplaysMarkdownSource(lineFrom: number): boolean {
        const activeLineFrom = this.view.state.doc.lineAt(this.view.state.selection.main.head).from;
        if (!isTaskLineActive(lineFrom, activeLineFrom)) {
            return false;
        }

        const domPosition = this.view.domAtPos(lineFrom);
        const element =
            domPosition.node.nodeType === Node.ELEMENT_NODE
                ? (domPosition.node as Element)
                : domPosition.node.parentElement;
        return taskLineDisplaysMarkdownSource(element?.closest('.cm-line') ?? null);
    }

    private refreshDateTimeDecorationsAfterDomUpdate(): void {
        if (this.dateTimeDecorationRefreshFrame !== undefined) {
            return;
        }
        this.dateTimeDecorationRefreshFrame = window.requestAnimationFrame(() => {
            this.dateTimeDecorationRefreshFrame = undefined;
            this.refreshDateTimeDecorations();
        });
    }

    private readonly handleClickEvent = (event: MouseEvent): boolean => {
        const { target } = event;

        const taskAndLine = this.getTaskAndLine(target);
        if (taskAndLine === null) {
            return false;
        }

        const { checkbox, line, task } = taskAndLine;

        // We need to prevent default so that the checkbox is only handled by us and not obsidian.
        event.preventDefault();

        const toggled = task.toggleWithRecurrenceInUsersOrder();
        this.replaceTaskLine(line, toggled);

        // Dirty workaround.
        // While the code in this method properly updates the `checked` state
        // of the target checkbox, some Obsidian internals revert the state.
        // This means that the checkbox would remain in its original `checked`
        // state (`true` or `false`), even though the underlying document
        // updates correctly.
        // As a "fix", we set the checkbox's `checked` state *explicitly* after a
        // timeout in case we need to revert Obsidian's possibly wrongful reversal.
        const needToForceCheckedProperty = toggled.length === 1;
        if (needToForceCheckedProperty) {
            // The smoke tests show the workaround is only needed when the event replaces
            // a single task line.
            // (When one task line becomes two because of recurrence, both the
            // edited task lines are rendered correctly by this code)
            // Since the advent of 'on completion: delete', we cannot rely on the
            // event target's opinion of the new status, as that facility means
            // that the new status *may* be different from that in the event.
            const desiredCheckedStatus = toggled[0].status.symbol !== ' ';
            window.setTimeout(() => {
                checkbox.checked = desiredCheckedStatus;
            }, 1);
        }

        return true;
    };

    private readonly handleContextMenuEvent = (event: MouseEvent): boolean => {
        const taskAndLine = this.getTaskAndLine(event.target);
        if (taskAndLine === null) {
            return false;
        }

        const { line, task } = taskAndLine;
        const menu = new StatusMenu(StatusRegistry.getInstance(), task, async (_originalTask, newTasks) => {
            this.replaceTaskLine(line, Array.isArray(newTasks) ? newTasks : [newTasks]);
        });
        menu.addSeparator();
        menu.addItem((item) =>
            item.setTitle(i18n.t('ui.taskEditor.edit')).onClick(() => {
                const taskModal = new TaskModal({
                    app: this.plugin.app,
                    task,
                    onSaveSettings: () => this.plugin.saveSettings(),
                    onSubmit: (updatedTasks) => this.replaceTaskLine(line, updatedTasks),
                    allTasks: this.plugin.getTasks(),
                });
                taskModal.open();
            }),
        );
        showMenu(event, menu);
        return true;
    };

    private getTaskAndLine(
        target: EventTarget | null,
    ): { checkbox: HTMLInputElement; line: ReturnType<EditorView['state']['doc']['lineAt']>; task: Task } | null {
        // Only handle task checkboxes.
        if (!target || !(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
            return null;
        }

        /* Right now Obsidian API does not give us a way to handle checkbox clicks inside rendered-widgets-in-LP such as
         * callouts, tables, and transclusions because `this.view.posAtDOM` will return the beginning of the widget
         * as the position for any click inside the widget.
         * For callouts, this means that the task will never be found, since the `lineAt` will be the beginning of the callout.
         * Therefore, produce an error message pop-up using Obsidian's "Notice" feature, log a console warning, then return.
         */

        // Tasks from "task" query codeblocks handle themselves thanks to `toLi`, so be specific about error messaging, but still return.
        const ancestor = target.closest('ul.plugin-tasks-query-result, div.callout-content');
        if (ancestor) {
            if (ancestor.matches('div.callout-content')) {
                const dontShowAgainKey = 'live-preview-callout-warning';
                const msg =
                    i18n.t('notices.live-preview-callout-warning.line1') +
                    '\n\n' +
                    i18n.t('notices.live-preview-callout-warning.line2') +
                    '\n\n' +
                    i18n.t('notices.live-preview-callout-warning.line3') +
                    '\n\n' +
                    i18n.t('notices.live-preview-callout-warning.line4') +
                    '\n' +
                    i18n.t('notices.live-preview-callout-warning.line5') +
                    '\n' +
                    i18n.t('notices.live-preview-callout-warning.line6', {
                        commandName: getToggleTaskDoneCommandName(),
                    });
                showDismissibleNotice(dontShowAgainKey, msg, this.plugin);
            }
            return null;
        }

        const { state } = this.view;
        const position = this.view.posAtDOM(target);
        const line = state.doc.lineAt(position);
        const task = Task.fromLine({
            line: line.text,
            // None of this data is relevant here.
            // The task is created, toggled, and written back to the CM6 document,
            // replacing the old task in-place.
            taskLocation: TaskLocation.fromUnknownPosition(new TasksFile('')),
            fallbackDate: null,
        });

        // Temporary edit - See https://github.com/obsidian-tasks-group/obsidian-tasks/issues/2160
        // console.debug(`Live Preview Extension: toggle called. Position: ${position} Line: ${line.text}`);

        // Only handle checkboxes of tasks.
        if (task === null) {
            return null;
        }

        return { checkbox: target, line, task };
    }

    private replaceTaskLine(line: ReturnType<EditorView['state']['doc']['lineAt']>, newTasks: Task[]) {
        const { state } = this.view;
        const newTaskString = newTasks.map((task) => task.toFileLineString()).join(state.lineBreak);

        let to = line.to;

        if (newTaskString === '') {
            // We also need to remove any line break at the end of the line.
            const nextLine = line.number < state.doc.lines ? state.doc.line(line.number + 1) : null;
            if (nextLine) {
                // If not the last line, delete up to the start of the next line, including the line break
                to = nextLine.from;
            }
        }

        // Creates a CodeMirror transaction in order to update the document.
        const transaction = state.update({
            changes: {
                from: line.from,
                to,
                insert: newTaskString,
            },
        });
        this.view.dispatch(transaction);
    }
}

import { RangeSetBuilder } from '@codemirror/state';
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
    return ViewPlugin.fromClass(
        class extends LivePreviewExtension {
            constructor(view: EditorView) {
                super(view, plugin);
            }
        },
        {
            decorations: (extension) => extension.dateTimeDecorations,
        },
    );
};

const livePreviewExtensions = new Set<LivePreviewExtension>();
const taskDateTimeRegex = new RegExp(
    `${taskDateSymbolsPattern}\\s*\\d{4}-\\d{2}-\\d{2}(\\s+\\d{2}:\\d{2}:\\d{2})`,
    'gu',
);

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

/**
 * Returns whether a line is the sole Markdown source line currently being edited in Live Preview.
 * Only the main selection head is relevant: a cross-line selection must not reveal time on every
 * selected task line.
 */
export function taskLineDisplaysMarkdownSource(lineElement: Element | null): boolean {
    return /^\s*(?:[-+*]|\d+[.)])\s+\[[^\]]\]/u.test(lineElement?.textContent ?? '');
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
    private dateTimeDecorationsNeedRefresh = false;
    private dateTimeDecorationRefreshFrame: number | undefined;

    constructor(view: EditorView, plugin: LivePreviewPlugin) {
        this.view = view;
        this.plugin = plugin;
        this.dateTimeDecorations = this.buildDateTimeDecorations();
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
        if (update.selectionSet || livePreviewModeChanged) {
            this.refreshDateTimeDecorationsAfterDomUpdate();
        }
    }

    public refreshDateTimeDecorations(): void {
        this.dateTimeDecorationsNeedRefresh = true;
        this.view.dispatch({});
    }

    private buildDateTimeDecorations(): DecorationSet {
        if (getSettings().enableDateTime || this.view.state.field(editorLivePreviewField, false) !== true) {
            return Decoration.none;
        }

        const builder = new RangeSetBuilder<Decoration>();
        for (let lineNumber = 1; lineNumber <= this.view.state.doc.lines; lineNumber++) {
            const line = this.view.state.doc.line(lineNumber);
            if (!TaskRegularExpressions.taskRegex.test(line.text) || this.taskLineDisplaysMarkdownSource(line.from)) {
                continue;
            }
            for (const range of taskDateTimeRangesInLine(line.text, line.from)) {
                builder.add(range.from, range.to, Decoration.replace({}));
            }
        }
        return builder.finish();
    }

    private taskLineDisplaysMarkdownSource(lineFrom: number): boolean {
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

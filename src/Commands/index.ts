import {
    type App,
    type Command,
    type Editor,
    type MarkdownFileInfo,
    MarkdownView,
    type TFile,
    type View,
} from 'obsidian';
import { i18n } from '../i18n/i18n';
import type TasksPlugin from '../main';
import { StatusRegistry } from '../Statuses/StatusRegistry';
import { TaskRegularExpressions } from '../Task/TaskRegularExpressions';
import type { TaskIdManager } from '../TaskId/TaskIdManager';
import { createOrEdit } from './CreateOrEdit';

import { toggleDone } from './ToggleDone';
import { ensureQueryFileDefaultsInFrontmatter } from './AddQueryFileDefaultsProperties';
import { createSetStatusCommands } from './ChangeStatusCommands';
import { updateHistoricalTaskDataInFile, updateHistoricalTaskDataInVault } from './UpdateHistoricalTaskData';

export const getToggleTaskDoneCommandName = () => i18n.t('commands.toggleTaskDone');

export class Commands {
    private readonly plugin: TasksPlugin;
    private readonly taskIdManager: TaskIdManager;
    private readonly registeredCommands: { localId: string; command: Command }[] = [];

    private get app(): App {
        return this.plugin.app;
    }

    constructor({ plugin, taskIdManager }: { plugin: TasksPlugin; taskIdManager: TaskIdManager }) {
        this.plugin = plugin;
        this.taskIdManager = taskIdManager;

        this.registerCommand({
            id: 'edit-task',
            name: i18n.t('commands.createOrEditTask'),
            icon: 'pencil',
            editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
                // TODO Need to explore what happens if a tasks code block is rendered before the Cache has been created.
                return createOrEdit(
                    checking,
                    editor,
                    view as View,
                    this.app,
                    this.plugin.getTasks(),
                    async () => await this.plugin.saveSettings(),
                );
            },
        });

        plugin.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor, view) => {
                if (!(view instanceof MarkdownView)) {
                    return;
                }

                const { line } = editor.getCursor();
                if (!TaskRegularExpressions.taskRegex.test(editor.getLine(line))) {
                    return;
                }

                menu.addItem((item) =>
                    item
                        .setTitle(i18n.t('ui.taskEditor.edit'))
                        .setIcon('pencil')
                        .onClick(() => {
                            createOrEdit(
                                false,
                                editor,
                                view,
                                this.app,
                                this.plugin.getTasks(),
                                async () => await this.plugin.saveSettings(),
                            );
                        }),
                );
            }),
        );

        this.registerCommand({
            id: 'open-task-dashboard',
            name: i18n.t('commands.openTaskDashboard'),
            icon: 'chart-no-axes-combined',
            callback: () => this.plugin.openDashboard(),
        });

        this.registerCommand({
            id: 'toggle-done',
            name: getToggleTaskDoneCommandName(),
            icon: 'check-in-circle',
            editorCheckCallback: toggleDone,
        });

        this.registerCommand({
            id: 'add-query-file-defaults-properties',
            name: i18n.t('commands.addQueryFileDefaultsProperties'),
            icon: 'settings',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    return false;
                }
                if (activeFile.extension !== 'md') {
                    return false;
                }

                if (!checking) {
                    this.ensureQueryFileDefaultsFrontmatter(activeFile).catch(console.error);
                }
                return true;
            },
        });

        this.registerCommand({
            id: 'update-historical-task-data',
            name: i18n.t('commands.updateHistoricalTaskDataInCurrentFile'),
            icon: 'history',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile || activeFile.extension !== 'md') {
                    return false;
                }

                if (!checking) {
                    updateHistoricalTaskDataInFile(this.app.vault, activeFile).catch(console.error);
                }
                return true;
            },
        });

        this.registerCommand({
            id: 'update-all-historical-task-data',
            name: i18n.t('commands.updateHistoricalTaskDataInVault'),
            icon: 'database-zap',
            callback: () => updateHistoricalTaskDataInVault(this.app.vault).catch(console.error),
        });

        this.registerCommand({
            id: 'preview-current-file-task-ids',
            name: i18n.t('commands.previewCurrentFileTaskIds'),
            icon: 'scan-search',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile || activeFile.extension !== 'md') return false;
                if (!checking) void this.taskIdManager.previewCurrentFile();
                return true;
            },
        });

        this.registerCommand({
            id: 'add-missing-task-ids-in-current-file',
            name: i18n.t('commands.addMissingTaskIdsInCurrentFile'),
            icon: 'fingerprint',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile || activeFile.extension !== 'md') return false;
                if (!checking) void this.taskIdManager.addIdsToCurrentFile();
                return true;
            },
        });

        // Register set-status commands for each registered status
        const setStatusCommands = createSetStatusCommands(StatusRegistry.getInstance());
        for (const command of setStatusCommands) {
            this.registerCommand(command);
        }
    }

    async ensureQueryFileDefaultsFrontmatter(file: TFile): Promise<void> {
        const { app } = this;
        await ensureQueryFileDefaultsInFrontmatter(app, file);
    }

    public refreshLanguage(): void {
        const translatedNames: Record<string, string> = {
            'edit-task': i18n.t('commands.createOrEditTask'),
            'open-task-dashboard': i18n.t('commands.openTaskDashboard'),
            'toggle-done': getToggleTaskDoneCommandName(),
            'add-query-file-defaults-properties': i18n.t('commands.addQueryFileDefaultsProperties'),
            'update-historical-task-data': i18n.t('commands.updateHistoricalTaskDataInCurrentFile'),
            'update-all-historical-task-data': i18n.t('commands.updateHistoricalTaskDataInVault'),
            'preview-current-file-task-ids': i18n.t('commands.previewCurrentFileTaskIds'),
            'add-missing-task-ids-in-current-file': i18n.t('commands.addMissingTaskIdsInCurrentFile'),
        };
        for (const { localId, command } of this.registeredCommands) {
            if (localId in translatedNames) {
                command.name = translatedNames[localId];
            } else if (localId.startsWith('set-status-symbol-to-')) {
                const commandSymbol = localId.replace('set-status-symbol-to-', '');
                const status = StatusRegistry.getInstance().registeredStatuses.find(
                    (registeredStatus) =>
                        (registeredStatus.symbol === ' ' ? 'space' : registeredStatus.symbol) === commandSymbol,
                );
                if (status) {
                    command.name = i18n.t('ui.menus.changeStatusTo', { symbol: status.symbol, name: status.name });
                }
            }
        }
    }

    private registerCommand(command: Command): void {
        this.registeredCommands.push({ localId: command.id, command: this.plugin.addCommand(command) });
    }
}

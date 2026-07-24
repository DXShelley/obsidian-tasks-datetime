import type { App, Editor, MarkdownFileInfo, MarkdownView, TFile, View } from 'obsidian';
import type TasksPlugin from '../main';
import { TaskDashboardModal } from '../Obsidian/TaskDashboardModal';
import { StatusRegistry } from '../Statuses/StatusRegistry';
import { createOrEdit } from './CreateOrEdit';

import { toggleDone } from './ToggleDone';
import { ensureQueryFileDefaultsInFrontmatter } from './AddQueryFileDefaultsProperties';
import { createSetStatusCommands } from './ChangeStatusCommands';
import { updateHistoricalTaskDataInFile, updateHistoricalTaskDataInVault } from './UpdateHistoricalTaskData';

export const ToggleTaskDoneCommandName = 'Toggle task done';

export class Commands {
    private readonly plugin: TasksPlugin;

    private get app(): App {
        return this.plugin.app;
    }

    constructor({ plugin }: { plugin: TasksPlugin }) {
        this.plugin = plugin;

        plugin.addCommand({
            id: 'edit-task',
            name: 'Create or edit task',
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

        plugin.addCommand({
            id: 'open-task-dashboard',
            name: 'Open task dashboard',
            icon: 'chart-no-axes-combined',
            callback: () => new TaskDashboardModal(this.app, this.plugin.getTasks()).open(),
        });

        plugin.addCommand({
            id: 'toggle-done',
            name: ToggleTaskDoneCommandName,
            icon: 'check-in-circle',
            editorCheckCallback: toggleDone,
        });

        plugin.addCommand({
            id: 'add-query-file-defaults-properties',
            name: 'Add all Query File Defaults properties',
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

        plugin.addCommand({
            id: 'update-historical-task-data',
            name: 'Update historical task data in current file',
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

        plugin.addCommand({
            id: 'update-all-historical-task-data',
            name: 'Update historical task data in entire vault',
            icon: 'database-zap',
            callback: () => updateHistoricalTaskDataInVault(this.app.vault).catch(console.error),
        });

        // Register set-status commands for each registered status
        const setStatusCommands = createSetStatusCommands(StatusRegistry.getInstance());
        for (const command of setStatusCommands) {
            plugin.addCommand(command);
        }
    }

    async ensureQueryFileDefaultsFrontmatter(file: TFile): Promise<void> {
        const { app } = this;
        await ensureQueryFileDefaultsInFrontmatter(app, file);
    }
}

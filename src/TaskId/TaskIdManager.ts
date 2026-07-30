import { type CachedMetadata, MarkdownView, Notice, type TFile } from 'obsidian';

import type TasksPlugin from '../main';
import { i18n } from '../i18n/i18n';
import { type TaskIdEditResult, addMissingTaskIds, previewMissingTaskIds } from './TaskIdSourceEditor';

const DEBOUNCE_MS = 400;
const CURSOR_SYNC_RETRY_MS = 25;
const MAX_CURSOR_SYNC_RETRIES = 12;

/** Keeps automatic task ID completion ordered per file after metadata updates. */
export class TaskIdManager {
    private readonly pendingFiles = new Map<string, TFile>();
    private readonly timers = new Map<string, number>();
    private readonly runningPaths = new Set<string>();

    constructor(private readonly plugin: TasksPlugin) {
        plugin.registerEvent(
            plugin.app.metadataCache.on('changed', (file, _data, cache) => this.queueForIdCompletion(file, cache)),
        );
    }

    public unload(): void {
        for (const timer of this.timers.values()) {
            window.clearTimeout(timer);
        }
        this.timers.clear();
        this.pendingFiles.clear();
    }

    public queueForIdCompletion(file: TFile, cache: CachedMetadata): void {
        if (file.extension !== 'md' || !cache.listItems?.some((listItem) => listItem.task !== undefined)) {
            return;
        }

        this.pendingFiles.set(file.path, file);

        const timer = this.timers.get(file.path);
        if (timer !== undefined) {
            window.clearTimeout(timer);
        }

        this.timers.set(
            file.path,
            window.setTimeout(() => void this.drain(file.path), DEBOUNCE_MS),
        );
    }

    public async previewCurrentFile(): Promise<void> {
        const file = this.currentMarkdownFile();
        if (!file) return;

        const missing = await this.countMissingIds(file, true, true);
        new Notice(i18n.t('ui.notices.taskIdPreview', { count: missing }));
    }

    public async addIdsToCurrentFile(): Promise<void> {
        const file = this.currentMarkdownFile();
        if (!file) return;

        const result = await this.completeFile(file, true, true);
        new Notice(i18n.t('ui.notices.taskIdsAdded', { count: result.added }));
    }

    private currentMarkdownFile(): TFile | null {
        const file = this.plugin.app.workspace.getActiveFile();
        return file?.extension === 'md' ? file : null;
    }

    private async drain(path: string): Promise<void> {
        if (this.runningPaths.has(path)) return;

        const file = this.pendingFiles.get(path);
        if (!file) return;

        this.pendingFiles.delete(path);
        this.timers.delete(path);
        this.runningPaths.add(path);

        try {
            const result = await this.completeFile(file, true, true);
            this.moveCursorAfterNewId(file, result);
        } finally {
            this.runningPaths.delete(path);
            if (this.pendingFiles.has(path)) {
                void this.drain(path);
            }
        }
    }

    private async countMissingIds(
        file: TFile,
        requireTagAndDescription = false,
        requireTrailingSpace = false,
    ): Promise<number> {
        const cache = this.plugin.app.metadataCache.getFileCache(file);
        if (!cache?.listItems) return 0;

        const content = await this.plugin.app.vault.read(file);
        return previewMissingTaskIds(content, cache.listItems, { requireTagAndDescription, requireTrailingSpace });
    }

    private async completeFile(
        file: TFile,
        requireTagAndDescription = false,
        requireTrailingSpace = false,
    ): Promise<TaskIdEditResult> {
        const noChanges = (content: string): TaskIdEditResult => ({ content, added: 0, missing: 0, additions: [] });
        const cache = this.plugin.app.metadataCache.getFileCache(file);
        if (!cache?.listItems) return noChanges('');

        const currentContent = await this.plugin.app.vault.read(file);
        const options = { requireTagAndDescription, requireTrailingSpace };
        if (previewMissingTaskIds(currentContent, cache.listItems, options) === 0) return noChanges(currentContent);

        let result = noChanges(currentContent);

        await this.plugin.app.vault.process(file, (content) => {
            const currentCache = this.plugin.app.metadataCache.getFileCache(file);
            if (!currentCache?.listItems) return content;

            result = addMissingTaskIds(content, currentCache.listItems, options);
            return result.content;
        });

        return result;
    }

    private moveCursorAfterNewId(file: TFile, result: TaskIdEditResult, retryCount = 0): void {
        if (result.additions.length !== 1) return;

        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        const addition = result.additions[0];
        if (!view || view.file?.path !== file.path || view.editor.getCursor().line !== addition.lineNumber) return;

        if (view.editor.getLine(addition.lineNumber) !== addition.line) {
            if (retryCount < MAX_CURSOR_SYNC_RETRIES) {
                window.setTimeout(() => this.moveCursorAfterNewId(file, result, retryCount + 1), CURSOR_SYNC_RETRY_MS);
            }
            return;
        }

        view.editor.setCursor({ line: addition.lineNumber, ch: addition.cursorColumn });
    }
}

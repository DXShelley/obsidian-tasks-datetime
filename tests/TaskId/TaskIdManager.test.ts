import type { MarkdownView, TFile, Vault } from 'obsidian';

import type TasksPlugin from '../../src/main';
import { TaskIdManager } from '../../src/TaskId/TaskIdManager';

jest.mock('obsidian', () => ({
    MarkdownView: class MarkdownView {},
    Notice: jest.fn(),
}));

describe('TaskIdManager', () => {
    function createManager({ editorContent, diskContent }: { editorContent: string; diskContent: string }) {
        const file: TFile = {
            vault: {} as Vault,
            path: 'tasks.md',
            name: 'tasks.md',
            parent: null,
            stat: { ctime: 0, mtime: 0, size: 0 },
            basename: 'tasks',
            extension: 'md',
        };
        let currentEditorContent = editorContent;
        const view = {
            file,
            getViewData: () => currentEditorContent,
            setViewData: jest.fn((content: string) => {
                currentEditorContent = content;
            }),
            editor: {},
        } as unknown as MarkdownView;
        const process = jest.fn(async (_file: TFile, updater: (content: string) => string) => updater(diskContent));
        const plugin = {
            registerEvent: jest.fn(),
            app: {
                metadataCache: { on: jest.fn() },
                workspace: {
                    getActiveFile: () => file,
                    getActiveViewOfType: jest.fn(() => view),
                },
                vault: {
                    read: jest.fn(async () => diskContent),
                    process,
                } as unknown as Vault,
            },
        } as unknown as TasksPlugin;

        return { manager: new TaskIdManager(plugin), process, view, getEditorContent: () => currentEditorContent };
    }

    it('keeps the current-file command conservative until the task line is complete', async () => {
        const { manager, view } = createManager({
            editorContent: '- [ ] #task Draft',
            diskContent: '- [ ] #task Draft',
        });

        await manager.addIdsToCurrentFile();

        expect(view.setViewData).not.toHaveBeenCalled();
    });

    it('updates unsaved editor content without processing the stale disk version', async () => {
        const { manager, process, view, getEditorContent } = createManager({
            editorContent: '- [ ] #task Draft ',
            diskContent: '- [ ] #task Old draft ',
        });

        await manager.addIdsToCurrentFile();

        expect(process).not.toHaveBeenCalled();
        expect(view.setViewData).toHaveBeenCalledWith(expect.stringContaining('Draft 🆔 t-'), false);
        expect(getEditorContent()).toMatch(/^- \[ \] #task Draft 🆔 t-[0-9abcdefghjkmnpqrstvwxyz]{12} $/u);
    });
});

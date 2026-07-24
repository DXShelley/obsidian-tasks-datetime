import type { TFile, Vault } from 'obsidian';
import { updateHistoricalTaskData, updateHistoricalTaskDataInVault } from '../../src/Commands/UpdateHistoricalTaskData';

describe('update historical task data', () => {
    it('upgrades only task dates to midnight', () => {
        const result =
            updateHistoricalTaskData(`- [ ] Legacy task 🔺 #tasks-importance-heavy #tasks-urgency-urgent 📅 2026-07-23 ⏳ 2026-07-22
- [ ] Existing datetime ⏫ 📅 2026-07-23 14:15:16
An ordinary date 📅 2026-07-23 must not change`);

        expect(result).toEqual({
            content: `- [ ] Legacy task 🔺 #tasks-importance-heavy #tasks-urgency-urgent 📅 2026-07-23 00:00:00 ⏳ 2026-07-22 00:00:00
- [ ] Existing datetime ⏫ 📅 2026-07-23 14:15:16
An ordinary date 📅 2026-07-23 must not change`,
            updatedTaskCount: 1,
        });
    });

    it('leaves already-updated tasks unchanged', () => {
        const result = updateHistoricalTaskData('- [ ] Current task 📅 2026-07-23 00:00:00');

        expect(result).toEqual({
            content: '- [ ] Current task 📅 2026-07-23 00:00:00',
            updatedTaskCount: 0,
        });
    });

    it('preserves a stored time when updating historical data', () => {
        const result = updateHistoricalTaskData('- [ ] Current task 📅 2026-07-23 14:15:16');

        expect(result).toEqual({
            content: '- [ ] Current task 📅 2026-07-23 14:15:16',
            updatedTaskCount: 0,
        });
    });

    it('does not change non-date task data', () => {
        const task = '- [ ] Task 🔺 #tasks-importance-heavy #tasks-urgency-urgent';

        expect(updateHistoricalTaskData(task)).toEqual({ content: task, updatedTaskCount: 0 });
    });

    it('does not rewrite a date-like sequence in a task description', () => {
        const task = '- [ ] Discuss 📅 2026-07-23 release';

        expect(updateHistoricalTaskData(task)).toEqual({ content: task, updatedTaskCount: 0 });
    });

    it('updates every Markdown file in the vault', async () => {
        const files = [{ path: 'one.md' }, { path: 'two.md' }] as TFile[];
        const contents = new Map([
            ['one.md', '- [ ] High 🔼 📅 2026-07-23'],
            ['two.md', '- [ ] No priority 📅 2026-07-24 08:00:00'],
        ]);
        const processedPaths: string[] = [];
        const vault = {
            getMarkdownFiles: () => files,
            process: async (file: TFile, updater: (content: string) => string) => {
                processedPaths.push(file.path);
                const updatedContent = updater(contents.get(file.path)!);
                contents.set(file.path, updatedContent);
                return updatedContent;
            },
        } as unknown as Vault;

        await expect(updateHistoricalTaskDataInVault(vault)).resolves.toEqual({
            updatedFileCount: 1,
            updatedTaskCount: 1,
        });
        expect(processedPaths).toEqual(['one.md', 'two.md']);
        expect(contents.get('one.md')).toBe('- [ ] High 🔼 📅 2026-07-23 00:00:00');
        expect(contents.get('two.md')).toBe('- [ ] No priority 📅 2026-07-24 08:00:00');
    });
});

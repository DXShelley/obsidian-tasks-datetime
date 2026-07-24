import { taskDateTimeRangesInLine, taskLineDisplaysMarkdownSource } from '../../src/Obsidian/LivePreviewExtension';

describe('Live Preview task date display', () => {
    it('finds only the time portions of task date fields', () => {
        const line = '- [ ] Task 📅 2026-07-23 14:15:16 ✅ 2026-07-24 00:00:00';
        const lineStart = 100;

        const ranges = taskDateTimeRangesInLine(line, lineStart);

        expect(ranges.map((range) => line.slice(range.from - lineStart, range.to - lineStart))).toEqual([
            ' 14:15:16',
            ' 00:00:00',
        ]);
    });

    it('does not hide dates without a seconds-precision time', () => {
        expect(taskDateTimeRangesInLine('- [ ] Task 📅 2026-07-23', 0)).toEqual([]);
    });

    it('does not treat ordinary text as a task date field', () => {
        expect(taskDateTimeRangesInLine('- [ ] Task mentions 2026-07-23 14:15:16', 0)).toEqual([]);
    });

    it('reveals time only when the task line is visibly rendered as Markdown source', () => {
        const sourceLine = document.createElement('div');
        sourceLine.className = 'cm-line';
        sourceLine.textContent = '- [ ] Task 📅 2026-07-23 14:15:16';

        const renderedLine = document.createElement('div');
        renderedLine.className = 'cm-line';
        renderedLine.textContent = 'Task 📅 2026-07-23 14:15:16';

        expect(taskLineDisplaysMarkdownSource(sourceLine)).toBe(true);
        expect(taskLineDisplaysMarkdownSource(renderedLine)).toBe(false);
    });
});

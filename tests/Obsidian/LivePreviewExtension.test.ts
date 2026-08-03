import { RangeSetBuilder } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import {
    isTaskLineActive,
    taskDateTimeRangesInLine,
    taskDecorationRangesInLine,
    taskInternalReferenceRangesInLine,
    taskLineDisplaysMarkdownSource,
} from '../../src/Obsidian/LivePreviewExtension';

describe('Live Preview task date display', () => {
    it('finds task ID and dependency fields including their leading separators', () => {
        const line =
            '- [ ] #task Review ticket 🆔 t-k4iq21a2b3c4 ⛔ t-k4iq21a2b3c4, t-9abcde123456 📅 2026-07-30 14:30:00';
        const lineStart = 100;

        const ranges = taskInternalReferenceRangesInLine(line, lineStart);

        expect(ranges.map((range) => line.slice(range.from - lineStart, range.to - lineStart))).toEqual([
            ' 🆔 t-k4iq21a2b3c4',
            ' ⛔ t-k4iq21a2b3c4, t-9abcde123456',
        ]);
    });

    it('recognises an ID without a space after the ID symbol', () => {
        const line = '- [ ] Write about 🆔note';

        expect(taskInternalReferenceRangesInLine(line, 0)).toEqual([{ from: 17, to: 24 }]);
    });

    it('finds an ID at the end of an active task source line', () => {
        const line = '- [ ] #task Review ticket 🛫 2026-08-03 09:00:00 📅 2026-08-03 22:00:00 🆔 t-948c3afyb8ct';

        expect(taskInternalReferenceRangesInLine(line, 0)).toEqual([{ from: line.indexOf(' 🆔'), to: line.length }]);
    });

    it('finds only the time portions of task date fields', () => {
        const line = '- [ ] Task 📅 2026-07-23 14:15:16 ✅ 2026-07-24 00:00:00';
        const lineStart = 100;

        const ranges = taskDateTimeRangesInLine(line, lineStart);

        expect(ranges.map((range) => line.slice(range.from - lineStart, range.to - lineStart))).toEqual([
            ' 14:15:16',
            ' 00:00:00',
        ]);
    });

    it('returns mixed ID and date ranges in document order', () => {
        const line = '- [ ] Task 📅 2026-07-23 14:15:16 🆔 t-k4iq21a2b3c4';

        expect(taskDecorationRangesInLine(line, 0, true)).toEqual([
            { from: line.indexOf(' 14:15:16'), to: line.indexOf(' 14:15:16') + 9, kind: 'dateTime' },
            { from: line.indexOf(' 🆔'), to: line.length, kind: 'internalReference' },
        ]);
    });

    it('builds CodeMirror decorations when a date precedes an ID', () => {
        const line = '- [ ] Task 📅 2026-07-23 14:15:16 🆔 t-k4iq21a2b3c4';
        const builder = new RangeSetBuilder<Decoration>();

        for (const range of taskDecorationRangesInLine(line, 0, true)) {
            builder.add(
                range.from,
                range.to,
                range.kind === 'internalReference'
                    ? Decoration.mark({ class: 'tasks-task-internal-reference' })
                    : Decoration.replace({}),
            );
        }

        expect(() => builder.finish()).not.toThrow();
    });

    it('keeps ID ranges while leaving the complete time visible on the active row', () => {
        const line = '- [ ] Task 📅 2026-07-23 14:15:16 🆔 t-k4iq21a2b3c4';

        expect(taskDecorationRangesInLine(line, 0, false)).toEqual([
            { from: line.indexOf(' 🆔'), to: line.length, kind: 'internalReference' },
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

    it('limits source-row time handling to the active task line', () => {
        expect(isTaskLineActive(10, 10)).toBe(true);
        expect(isTaskLineActive(10, 20)).toBe(false);
    });
});

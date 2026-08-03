import type { ListItemCache } from 'obsidian';

import {
    addMissingTaskIds,
    addMissingTaskIdsInSource,
    previewMissingTaskIds,
    previewMissingTaskIdsInSource,
} from '../../src/TaskId/TaskIdSourceEditor';

function taskAt(line: number): ListItemCache {
    return {
        task: ' ',
        parent: -line,
        position: { start: { line, col: 0, offset: 0 }, end: { line, col: 0, offset: 0 } },
    };
}

describe('TaskIdSourceEditor', () => {
    it('places a generated ID after the description and before date-time metadata', () => {
        const content = '- [ ] #task #personal Review ticket 📅 2026-07-30 14:30:00';

        const result = addMissingTaskIds(content, [taskAt(0)]);

        expect(result.added).toBe(1);
        expect(result.content).toMatch(
            /^- \[ \] #task #personal Review ticket 🆔 t-[0-9abcdefghjkmnpqrstvwxyz]{12} 📅 2026-07-30 14:30:00$/,
        );
        expect(result.additions[0]?.lineNumber).toBe(0);
        expect(result.additions[0]?.cursorColumn).toBe(result.content.indexOf('📅'));
        expect(result.additions[0]?.line).toBe(result.content);
    });

    it('adds an ID to the end when a task has no date-time metadata', () => {
        const result = addMissingTaskIds('- [ ] Review ticket', [taskAt(0)]);

        expect(result.content).toMatch(/^- \[ \] Review ticket 🆔 t-[0-9abcdefghjkmnpqrstvwxyz]{12} $/);
    });

    it('adds IDs to tagged tasks with a description without requiring a trailing space', () => {
        const content = `- [ ] Untagged task
- [ ] #tag
- [ ] #tag Write release notes`;

        const result = addMissingTaskIds(content, [taskAt(0), taskAt(1), taskAt(2)], {
            requireTagAndDescription: true,
        });

        expect(result.added).toBe(1);
        expect(result.content.split('\n')[0]).toBe('- [ ] Untagged task');
        expect(result.content.split('\n')[1]).toBe('- [ ] #tag');
        expect(result.content).toMatch(/\n- \[ \] #tag Write release notes 🆔 t-.* $/);
    });

    it('does not rewrite an existing ID', () => {
        const content = '- [ ] Review ticket 🆔 k4iq21 📅 2026-07-30';

        expect(addMissingTaskIds(content, [taskAt(0)])).toEqual({ content, added: 0, missing: 0, additions: [] });
        expect(previewMissingTaskIds(content, [taskAt(0)])).toBe(0);
    });

    it('only changes task rows selected by the metadata cache', () => {
        const content = `- [ ] First task
An ordinary line
- [ ] Second task`;

        const result = addMissingTaskIds(content, [taskAt(0)]);

        expect(result.added).toBe(1);
        expect(result.content.split('\n')[2]).toBe('- [ ] Second task');
    });

    it('finds eligible task rows directly from Markdown source', () => {
        const content = `- [ ] #tag Write release notes
Not a task
> - [ ] #tag Review pull request
- [ ] #tag`;
        const options = { requireTagAndDescription: true };

        expect(previewMissingTaskIdsInSource(content, options)).toBe(2);
        expect(addMissingTaskIdsInSource(content, options).added).toBe(2);
    });

    it('skips task-looking lines inside fenced code blocks', () => {
        const content = ['```markdown', '- [ ] #tag Example in documentation', '```', '- [ ] #tag Real task'].join(
            '\n',
        );
        const options = { requireTagAndDescription: true };

        expect(previewMissingTaskIdsInSource(content, options)).toBe(1);
        const result = addMissingTaskIdsInSource(content, options);

        expect(result.added).toBe(1);
        expect(result.content).toContain('- [ ] #tag Example in documentation\n```');
        expect(result.content).toMatch(/- \[ \] #tag Real task 🆔 t-/);
    });

    it('requires both a tag and task description when automatic completion is requested', () => {
        const content = `- [ ] #task
- [ ] Write release notes
- [ ] #task Write release notes`;

        const result = addMissingTaskIds(content, [taskAt(0), taskAt(1), taskAt(2)], {
            requireTagAndDescription: true,
        });

        expect(result.added).toBe(1);
        expect(result.content.split('\n')[0]).toBe('- [ ] #task');
        expect(result.content.split('\n')[1]).toBe('- [ ] Write release notes');
        expect(result.content.split('\n')[2]).toMatch(/^- \[ \] #task Write release notes 🆔 t-/);
    });

    it('requires a trailing space for automatic completion of a newly written task', () => {
        const withoutTrailingSpace = '- [ ] #task Write release notes';
        const withTrailingSpace = `${withoutTrailingSpace} `;
        const options = { requireTagAndDescription: true, requireTrailingSpace: true };

        expect(addMissingTaskIds(withoutTrailingSpace, [taskAt(0)], options).added).toBe(0);
        expect(addMissingTaskIds(withTrailingSpace, [taskAt(0)], options).content).toMatch(
            /^- \[ \] #task Write release notes 🆔 t-[0-9abcdefghjkmnpqrstvwxyz]{12} $/,
        );
    });
});

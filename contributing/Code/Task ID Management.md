# Task ID Management

This document records the display and completion contract for automatically managed task IDs. Preserve these rules when changing task rendering, CodeMirror decorations, or time display settings.

## Source format

Automatic IDs are written as `🆔 t-<12 ULID-random-characters>`. They are inserted after the task description and before the first task date field. Completion is deliberately conservative: the task must have a tag, non-tag description text, and a trailing space. Existing IDs and duplicates are not rewritten.

`⛔ depends on` values are internal references too. They use the same visibility rules as `🆔 id`.

## Rendering invariant

The following is a user-visible invariant:

| Surface | Internal ID fields |
| --- | --- |
| Source mode | Visible |
| Live Preview | Hidden |
| Reading view | Hidden |
| Tasks query results | Hidden |

The invariant applies to both `🆔 id` and `⛔ depends on id[, id]`.

In Live Preview, the ID decoration is independent of all time-display logic. In particular, it must be added whenever `editorLivePreviewField` is enabled, before checking `enableDateTime` or whether a line is temporarily rendered as Markdown source. Those checks apply only to time decorations.

## Implementation boundaries

- `src/TaskId/TaskIdSourceEditor.ts` owns ID syntax, eligibility, insertion, and cursor placement.
- `src/TaskId/TaskIdManager.ts` owns metadata-cache scheduling and the two active-file commands.
- `src/Obsidian/LivePreviewExtension.ts` hides internal ID fields with CodeMirror replacements in Live Preview.
- `src/Obsidian/InlineRenderer.ts` provides the Reading View fallback for task rows that Tasks does not replace.
- `src/Renderer/Renderer.scss` hides the rendered `task-id` and `task-dependsOn` components in Tasks output.

Do not use CSS alone for Live Preview: CodeMirror content is not rendered as Tasks field components there.

## Regression checks

Run these tests after changing this behaviour:

```bash
npm test -- --runTestsByPath tests/TaskId/TaskIdSourceEditor.test.ts tests/Obsidian/LivePreviewExtension.test.ts tests/Obsidian/InlineRenderer.test.ts
```

Manual verification must cover both values of **Include time in task dates**. In each case, `🆔` and `⛔` remain hidden in Live Preview, Reading view, and query results, while they remain visible in Source mode.

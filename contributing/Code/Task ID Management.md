# Task ID Management

This document records the display and completion contract for automatically managed task IDs. Preserve these rules when changing task rendering, CodeMirror decorations, or time display settings.

## Source format

Automatic IDs are written as `🆔 t-<12 ULID-random-characters>`. They are inserted after the task description and before the first task date field. Completion is deliberately conservative: the task must have a tag, non-tag description text, and a trailing space. Existing IDs and duplicates are not rewritten.

`⛔ depends on` values are internal references too. They use the same visibility rules as `🆔 id`.

## Obsidian views and editing modes

Obsidian's official terminology separates the **view** from the **editing mode** ([Views and editing mode](https://help.obsidian.md/edit-and-read)):

- **Reading view** is a view that renders the note without Markdown syntax for reading.
- **Editing view** is the view in which the note can be changed. It has two editing modes:
  - **Live Preview** renders formatted text inline and hides most Markdown syntax. When the cursor enters formatted content, Obsidian reveals the underlying syntax for editing.
  - **Source mode** displays all Markdown syntax exactly as written.

The view-switcher icon identifies the current/target view, but it does not by
itself distinguish **Live Preview** from **Source mode**. In the screenshots,
the pencil tooltip identifies the first tab as **Reading view**, while the view
menu in the second tab has **Source mode** checked. The editing mode must be
checked in the view menu, status-bar mode control, or **Settings → Editor →
Default editing mode**.

For task rendering, Live Preview consequently has two relevant row states. An inactive row is rendered inline; when the cursor enters the row, Obsidian temporarily reveals its Markdown source. The latter is still **Live Preview**, not a third view or editing mode.

The plugin-specific field contract is:

| Obsidian state | ID / dependency fields | Complete task time |
| --- | --- | --- |
| Reading view | Hidden | Follows **Include time in task dates** |
| Editing view + Live Preview, inactive row | Hidden | Follows **Include time in task dates** |
| Editing view + Live Preview, active row with source revealed | Hidden | Always shown |
| Editing view + Source mode | Visible | Shown |

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

---
publish: true
---

# Task IDs

Tasks Datetime can add a stable ID to a task. IDs support dependency links and reminders without changing the task description that you read every day.

## Automatic IDs

An automatically generated ID has the form `t-` followed by 12 characters from the random part of a ULID, for example `t-k4iq21a2b3c4`.

The plugin adds an ID only when all of these conditions are met:

- the line is a task;
- the task has at least one tag;
- it has description text in addition to its tags; and
- the line ends with a space, which marks the task text as complete.

The ID is inserted after the description and before the first task date field. Existing IDs, including duplicate IDs, are not changed automatically.

After an ID is generated, it is treated as an atomic metadata field in the
editor. Editing the task description, status, dates, or other fields cannot
partially change the ID or dependency IDs. The complete ID field may be added,
replaced, or deleted in one operation. Generated IDs always include a trailing
space, allowing a date to be typed immediately after the ID; removing only that
space is blocked together with other partial edits.

Use these commands to review or complete IDs in the active Markdown file. They apply the same eligibility rules as automatic completion:

- **Tasks: Preview current file task IDs**
- **Tasks: Add missing task IDs in current file**

The historical task data command also adds missing IDs to eligible tasks across
the vault while upgrading legacy date fields. Markdown fenced code blocks are
excluded, so task examples in documentation are never modified.

## Visibility

Task IDs and dependency IDs are source metadata. They are stored in Markdown and remain available to searches, dependencies, reminders, and automations, but they are not shown in normal task rendering.

| View | `🆔 id` and `⛔ depends on` |
| --- | --- |
| Source mode | Shown |
| Live Preview | Hidden |
| Reading view | Hidden |
| Tasks query results | Hidden |

These rows describe visible display states for convenience. Conceptually,
**Live Preview** and **Source mode** are editing modes inside **Editing view**;
they are not separate top-level views. See [[About Editing#Obsidian views and editing modes]]
for the complete hierarchy and the task-time rules for an active Live Preview row.

This visibility rule is independent of the **Include time in task dates** setting. Changing whether task times are displayed must never reveal or hide task IDs.

## Dependencies

An ID can be referenced by another task with `⛔`:

```text
- [ ] Prepare the brief 🆔 t-k4iq21a2b3c4
- [ ] Review the brief ⛔ t-k4iq21a2b3c4
```

See [[Task Dependencies]] for dependency behaviour, filtering, sorting, and editing.

---
publish: true
---

# About Editing

<span class="related-pages">#index-pages</span>

Tasks has a growing number of ways to conveniently add data to your task lines.

## Obsidian views and editing modes

Obsidian separates the **view** (whether you are reading or editing) from the
**editing mode** (how Markdown is displayed while editing). The official
terminology is:

- **Reading view** renders the note without Markdown syntax.
- **Editing view** lets you change the note. It contains two editing modes:
  - **Live Preview** renders formatted text inline and hides most Markdown syntax.
    When the cursor enters formatted content, the underlying syntax is revealed
    for that row while it is being edited.
  - **Source mode** displays all Markdown syntax exactly as written.

The task field display contract in this plugin is:

| Obsidian state | Task row | ID | Complete time |
| --- | --- | --- | --- |
| Reading view | Rendered | Hidden | Follows **Include time in task dates** |
| Editing view + Live Preview | Inactive row, rendered | Hidden | Follows **Include time in task dates** |
| Editing view + Live Preview | Active row, source temporarily revealed | Hidden | Always shown |
| Editing view + Source mode | Full Markdown source | Shown | Shown |

Revealing the Markdown of the row under the cursor in Live Preview does not
switch the note to Source mode. The ID remains hidden, while the complete time
is shown so the date can be edited precisely.

The first issue screenshot shows the pencil view-switcher tooltip for the
current **Reading view**, where task IDs are hidden. The second screenshot opens
the view menu with **Source mode** checked, where the task's full Markdown,
including its ID and complete time, is visible. The official description is in
[Views and editing mode](https://help.obsidian.md/Editing+and+formatting/Views+and+editing+mode).

## General editing techniques

- [[Auto-Suggest]]
  - Intelligent auto-suggest facility does a lot of your typing of task data for you.
- [[Create or edit Task]]
  - Helpful dialog/modal for easy adding and editing of task data.

## Editing specific task properties

- [[Toggling and Editing Statuses]]
  - All the ways to edit task statuses.
- [[Editing Dates]]
  - All the ways to edit dates on tasks.
- [[Postponing]]
  - Easy deferring or snoozing of due, scheduled and start dates.

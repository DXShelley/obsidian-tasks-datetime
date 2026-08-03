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

- **Reading view（阅读视图）** renders the note without Markdown syntax.
- **Editing view（编辑视图）** lets you change the note. It contains two editing modes:
  - **Live Preview（实时预览）** renders formatted text inline and hides most Markdown syntax.
    When the cursor enters formatted content, the underlying syntax is revealed
    for that row while it is being edited.
  - **Source mode（源码模式）** displays all Markdown syntax exactly as written.

The Chinese help page uses the heading **编辑模式** for the editable part of a
note, while the view switcher calls that top-level state **编辑视图**. In this
document, **编辑视图** means the top-level view, and **实时预览** or **源码模式**
means the editing mode selected inside it.

The task field display contract in this plugin is:

For day-to-day use there are three visible task display states: **Reading
view**, **Editing view + Live Preview**, and **Editing view + Source mode**. The
last two are both inside **Editing view**; they are not two additional views.

| Obsidian state | Task row | ID | Complete time |
| --- | --- | --- | --- |
| Reading view | Rendered | Hidden | Follows **Include time in task dates** |
| Editing view + Live Preview | Inactive row, rendered | Hidden | Follows **Include time in task dates** |
| Editing view + Live Preview | Active row, source temporarily revealed | Hidden | Always shown |
| Editing view + Source mode | Full Markdown source | Shown | Shown |

Revealing the Markdown of the row under the cursor in Live Preview does not
switch the note to Source mode. The ID remains hidden, while the complete time
is shown so the date can be edited precisely.

Generated task IDs and dependency IDs are hidden atomic fields in both Live
Preview and Source mode. Rewriting a task line is allowed when its existing
internal fields are preserved (for example, changing the status). An ID may
also be added, replaced, or deleted as one complete field, but partial edits
are blocked. IDs keep a trailing space so a date can be entered immediately
after them; deleting that delimiter is treated as an attempt to edit the
atomic field rather than leaving a malformed ID.

The first issue screenshot shows the pencil view-switcher tooltip for the
current **Reading view**, where task IDs are hidden. The second screenshot opens
the view menu with **Source mode** checked, where the task's full Markdown,
including its ID and complete time, is visible. The official description is in
[编辑与预览笔记](https://obsidian.md/zh/help/edit-and-read).

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

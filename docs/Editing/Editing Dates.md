---
publish: true
---

# Editing Dates

<span class="related-pages">#feature/dates</span>

## Summary

Tasks supports a range of date properties for managing your tasks: see [[Dates]].

This page describes ways to add, edit and remove date values on tasks.

There is a [[#Date-picker on task dates]] and a [[#Context menu on task dates]], or you can use various [[#other date-editing options]].

## Date-picker on task dates

> [!released]
> Introduced in Tasks 7.14.0.

**Left-click on any task date field** in **Reading mode** and **Tasks query search results** to use a date-picker and calendar to edit or remove a date.

![Hover over a date in Read mode or Tasks query search results](../images/date-picker-1.png)
<span class="caption">Hover over a date in Read mode or Tasks query search results</span>

![In the date-picker, you can easily select a new date, or clear the current one](../images/date-picker-2.png)
<span class="caption">In the date-picker, you can easily select a new date, or clear the current one</span>

| Where                         | Viewing Mode | Works? |
| ----------------------------- | ------------ | ------ |
| Task lines in markdown files  | Source mode  | ❌     |
| Task lines in markdown files  | Live Preview | ❌     |
| Task lines in markdown files  | Reading mode | ✅     |
| In Tasks query search results | Live Preview | ✅     |
| In Tasks query search results | Reading mode | ✅     |

On iPhone, and probably iPad too, this date-picker hard-codes the start of the week to Monday, instead of respecting the user's settings. We are tracking this in [issue #3239](https://github.com/obsidian-tasks-group/obsidian-tasks/issues/3239).

## Context menu on task dates

> [!released]
> Introduced in Tasks 7.10.0.

**Right-click on any task date field** in **Reading mode** and **Tasks query search results** to:

- postpone Start, Scheduled and Due dates
- advance Created, Cancelled and Done dates

![Hover over a date in Read mode or Tasks query search results](../images/date-context-menu-1.png)
<span class="caption">Hover over a date in Read mode or Tasks query search results</span>

![Chose an option from the context menu](../images/date-context-menu-2.png)
<span class="caption">Chose an option from the context menu</span>

| Where                         | Viewing Mode | Works? |
| ----------------------------- | ------------ | ------ |
| Task lines in markdown files  | Source mode  | ❌     |
| Task lines in markdown files  | Live Preview | ❌     |
| Task lines in markdown files  | Reading mode | ✅     |
| In Tasks query search results | Live Preview | ✅     |
| In Tasks query search results | Reading mode | ✅     |

## Other date-editing options

In **Editing mode** (both Source mode and Live Preview) the options are:

- Type the dates yourself.
- Use [[Auto-Suggest]] to add emojis and a range of convenient dates.
- Using the `Create or edit Task` command to access the [[Create or edit Task]] modal/dialog.

In **Reading mode** and **Tasks query search results** the options are:

- Click or right-click ⏩ to use the [[Postponing|Postpone]] button.
- Click the Pencil icon  (📝) to use the [[Create or edit Task]] modal/dialog.

## Datetime storage and migration

Task Markdown is the source of truth for task dates. Tasks Datetime always writes a modified task date in the canonical seconds-precision format:

```text
YYYY-MM-DD HH:mm:ss
```

The **Include time in task dates** setting controls presentation only. When it is disabled, time is hidden in supported views and date pickers can remain date-only, but the complete value in the Markdown file is retained. Turning the setting on and off does not discard, truncate, or reset stored time values.

This rule applies to every task-date update path, including editing a task in a Markdown file, editing a task opened from a query result, date pickers and context-menu actions, status changes, and recurring tasks. When an edit supplies only a date, Tasks Datetime supplies the current hour, minute, and second before writing the task.

Date query values may include a time, for example `2026-07-23 16:30:00`. A query value without a time continues to represent the whole calendar day.

### Updating historical task dates

Use either of these commands to upgrade legacy date-only task fields:

- `Tasks: Update historical task data in current file`
- `Tasks: Update historical task data in entire vault`

The updater changes only incomplete task dates, adding `00:00:00` to preserve their original calendar date. It does not change values that already include a complete time. The commands are therefore idempotent: after a successful update, running either command again is safe and makes no further date changes.

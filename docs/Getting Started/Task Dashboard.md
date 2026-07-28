---
publish: true
---

# Task Dashboard

The Task Dashboard is a workspace for reviewing the tasks in your vault and acting on the tasks that need attention.

> [!released]
> The Task Dashboard was introduced in Tasks 8.3.13.

Open it in either of these ways:

- Select the chart icon in the Tasks ribbon.
- Run **Tasks: Open task dashboard** from the Command Palette.

The dashboard reads tasks from the open vault. It does not create a separate task database.

## Filter tasks

Open **Filters** at the top left to narrow every dashboard section at once. You can combine the available filters:

- **Time range**: all tasks, today, this week, or this month.
- **Folders**, **tags**, **statuses**, and **priorities**.
- **Task property**: any task, dated, undated, recurring, or blocked.
- **Property** and **Property value**: match a file frontmatter property and, optionally, text in its value.

The priority list includes both legacy priority values and the four importance-and-urgency quadrants. Status labels use the language selected for the plugin.

Select **Reset** to clear all filters.

## Save a view

Set the filters you use regularly, then enter a name in the view-name field below the filters and press Enter or move focus away from the field. The current filter combination is saved as a dashboard view.

- Select a saved view from the **Saved views** list to apply it.
- Entering an existing view name updates that view.
- Select a saved view and use the trash icon to delete it.

Saved views contain dashboard filters only. They do not change task files or query results.

## Read the dashboard

The top-right **Progress** chart shows the last 7 or 30 days. Its legend separates completed tasks, planned due dates, tasks that were overdue at the end of each day, and the net number of tasks added after completions. Hover over a day to see its net-added value. Use the day buttons beneath the chart to switch the range.

The KPI row summarizes:

- tasks completed today;
- tasks due today;
- overdue tasks;
- the selected 7- or 30-day planned completion rate; and
- the average completion time for completed tasks with both a created date and a done date.

Select a KPI or a date in the progress chart to open its matching task list.

## Work with risk tasks and plans

**Risks** groups open tasks into overdue, due today, and high-priority categories. Groups are collapsed when the dashboard opens; select a group heading to expand or collapse it.

**Plan** lists open tasks with a due, scheduled, or start date in the current day or week. Use **Day** and **Week** to change the planning range. Select a task description to open its source note at the task line, or select its checkbox to complete it.

## Edit a drilled-down task list

Task lists opened from a KPI or the progress chart support bulk actions. The selection checkbox at the left of each row is for bulk editing; it is different from a task completion checkbox.

1. Select one or more tasks in the list.
2. Choose a new value from **Postpone**, **Priorities**, or **Statuses**.

You can postpone tasks by 1, 2, 3, 5, 7, or 10 days. Postponing does not change tasks that have no due date. Priority updates use the four importance-and-urgency quadrants and write the selected priority marker to the task line. Status updates use your configured task statuses.

After a successful update, the selected rows refresh immediately and the dashboard schedules a refresh from the vault task cache.

## Refresh behaviour

When a task file is modified while the dashboard is open, the dashboard refreshes after a short delay. The timestamp at the bottom shows when the dashboard was last refreshed.

The dashboard uses the plugin's configured language and current task status configuration. It makes no network requests and stores saved views in the plugin settings.

## Future direction: a complete task operations dashboard

> [!Info] Not implemented
>
> This section records the intended "complete" version of the dashboard. It is product direction for contributors and discussion, not a promise of current or scheduled functionality.

The complete dashboard should answer one practical question: **how can I complete my goals more reliably?** It should be a configurable personal task operations system, rather than a read-only statistics page.

### Dashboard system and components

- Provide ready-to-use templates for daily execution, weekly review, project progress, habits, and recurring tasks.
- Let users create, duplicate, and share dashboard configurations as Markdown.
- Provide configurable KPI, query-list, calendar, burndown, trend, project-matrix, priority-matrix, and dependency/blocker components.
- Let users arrange components by drag and drop, and configure each component's query and visual dimensions.

### Planning, prediction, and recommendations

- Estimate a task's completion probability from local history, identify projects at risk, and recommend postponing or splitting work.
- Show the evidence for every recommendation, allow each recommendation to be dismissed, and never modify tasks automatically.
- Support daily and weekly capacity planning, task-effort estimates, scheduling suggestions, conflict detection, dependency chains, and critical-path analysis.

### Review and continuous improvement

- Support weekly and monthly goals, actual outcomes, and reasons for unfinished work.
- Generate a review draft from local task data.
- Allow review conclusions to become tasks or planning rules for the next period, creating a review-and-adjustment loop.

### Interoperability, accessibility, and reliability

- Offer a public, stable Dashboard API so plugins such as Dataview, Kanban, and Calendar can provide component data or consume it.
- Support complete keyboard operation, screen-reader semantics, light and dark themes, offline use, import and export, configuration-version migration, and recovery from failed migrations.

### Data governance

- Allow users to exclude sensitive folders from dashboard data.
- Perform aggregation and prediction locally by default.
- State the data range and calculation rules used by every statistic and prediction clearly.

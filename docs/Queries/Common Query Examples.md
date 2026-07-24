---
publish: true
aliases:
  - Common Query Examples
---

# Common Query Examples

This page collects the most useful `tasks` query patterns. Put the instructions between a `tasks` code fence.

## Work due now

```tasks
not done
due before tomorrow
sort by due
```

- `not done` keeps actionable tasks.
- `due before tomorrow` includes overdue tasks and tasks due today.
- `sort by due` puts the nearest deadline first.

## Today, this week and this month

```tasks
not done
happens today
```

```tasks
not done
happens this week
```

```tasks
not done
happens this month
```

`happens` looks at start, scheduled and due dates, so it is usually the best instruction for a daily plan.

## Find by words or tags

```tasks
not done
description includes review
tags include #work
```

Both lines must match. Use `or` when either condition is sufficient:

```tasks
(description includes review) OR (tags include #work)
```

## Group a weekly review

```tasks
done this week
group by heading
sort by done reverse
```

`group by heading` clusters results under the Markdown heading that contains each task. `reverse` changes newest-first ordering.

## Use a precise time

When time support is enabled, task dates use `YYYY-MM-DD HH:mm:ss`:

```text
- [ ] Release notes 📅 2026-07-23 16:30:00
```

Date-only task lines remain valid. Date query instructions without a time keep their day-based meaning; use `filter by function` with `task.due.moment` for custom second-level comparisons.

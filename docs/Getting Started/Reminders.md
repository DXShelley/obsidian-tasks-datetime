---
publish: true
---

# Reminders

Tasks Datetime can remind you about a task's start, scheduled, and due times.
Reminders are optional and are disabled by default.

## Enable reminders

1. In Obsidian, open **Settings** → **Tasks Datetime**.
2. Enable **Enable reminders**.
3. Optionally set **Reminder advance (minutes)**.
4. Keep **Show reminders in Obsidian** enabled to receive quiet in-app notices.

For example, with a 15-minute advance, a task due at `2026-08-01 14:30:00` is shown at `14:15`.

```markdown
- [ ] Send the report 📅 2026-08-01 14:30:00
```

## What is reminded

Tasks Datetime creates one reminder for each start, scheduled, and due time on an unfinished task.
The time must include a time of day. A date at exactly `00:00:00` is treated as a date-only value and does not create a reminder.

To make reminders reliable, each task must have a unique task ID. Tasks with a missing or duplicated ID are skipped. You can use the task ID commands to find and add missing IDs.

## Quiet Obsidian notices

When **Show reminders in Obsidian** is enabled, due reminders appear as a brief Obsidian notice. The plugin does not request operating-system notification permission, play a sound, or open the source note.

To reduce interruptions:

- The plugin checks for due reminders every 30 seconds.
- Reminders due in the same check are combined into one notice.
- A notice shows at most three tasks and a count for the remainder.
- Each reminder is shown at most once.
- Reminders that were already due when Obsidian opened, or while the in-app notice setting was disabled, are not replayed later.

Obsidian must be running for an in-app notice to appear. For delivery outside Obsidian, the plugin also maintains its reminder snapshot for an automation to consume.

## Reminder settings

| Setting | Effect |
| --- | --- |
| **Enable reminders** | Enables reminder generation. This also updates the reminder snapshot used by automations. |
| **Reminder advance (minutes)** | Moves every reminder earlier by `0` to `60` whole minutes. Use `0` to remind at the task time. |
| **Show reminders in Obsidian** | Controls the quiet, grouped notices shown while Obsidian is open. Turning it off does not disable the automation snapshot. |

The snapshot is stored as `reminder-plan.v1.json` in the plugin's data directory and is refreshed when Tasks updates its cache. It is intended for local automation integrations; the in-app notices do not depend on an automation being configured.

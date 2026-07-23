# Tasks Datetime

<p align="center">
  <img src="docs/images/tasks-datetime-logo.svg" width="128" alt="Tasks Datetime logo">
</p>

<p align="center">Tasks with date and time support down to seconds</p>

Tasks Datetime is an Obsidian task-management plugin with optional date and time support down to seconds. It keeps date-only task workflows compact while allowing precise task planning when time support is enabled.

## Highlights

- Optional `YYYY-MM-DD HH:mm:ss` task dates, with date-only display when disabled.
- A combined date and time picker for task editing.
- Recurrence presets and four-quadrant importance/urgency editing.
- Task dashboard for today, this week, and this month.
- Query support for date and time values, plus documented query examples.

## Installation

Until Tasks Datetime is accepted into the Obsidian Community Plugins directory, install it manually:

1. Download `main.js`, `manifest.json`, and `styles.css` from a release.
2. Create `.obsidian/plugins/obsidian-tasks-datetime/` in your vault.
3. Copy the three files into that directory and enable **Tasks Datetime** in Obsidian.

## Development

This project uses Node.js `22.23.1` and Yarn Classic:

```bash
fnm exec --using=22.23.1 corepack yarn install --frozen-lockfile
fnm exec --using=22.23.1 corepack yarn test --runInBand
fnm exec --using=22.23.1 corepack yarn build
```

## Upstream Attribution

Tasks Datetime is a modified derivative of [obsidian-tasks-group/obsidian-tasks](https://github.com/obsidian-tasks-group/obsidian-tasks). It retains the upstream MIT license and its required copyright notice in [LICENSE](LICENSE).

## License

MIT. See [LICENSE](LICENSE).

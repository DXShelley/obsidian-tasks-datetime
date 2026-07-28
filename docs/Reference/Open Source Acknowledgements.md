---
publish: true
aliases:
  - Reference/Open Source Acknowledgements
---

# Open Source Acknowledgements

Tasks Datetime is an independently maintained derivative of
[obsidian-tasks-group/obsidian-tasks](https://github.com/obsidian-tasks-group/obsidian-tasks).
We gratefully acknowledge the upstream maintainers, contributors, and the
authors of the open-source components listed below.

This page is a human-readable inventory of the project's direct dependencies
and documented tooling. It is not a replacement for the license notices that
accompany a release: see [NOTICE](../../NOTICE) and [LICENSE](../../LICENSE).

## Upstream project

| Project | How this project uses it | License / notice |
| --- | --- | --- |
| [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) | Source and date-only workflow compatibility baseline | MIT; the upstream copyright and permission notice are retained in [LICENSE](../../LICENSE). |

Tasks Datetime is not affiliated with, endorsed by, or supported by the
upstream project or its maintainers.

## Bundled runtime components

The following direct dependencies are bundled into the release `main.js`. The
versions are resolved by [yarn.lock](../../yarn.lock), and their applicable
notices are embedded in the generated bundle.

| Component | Locked version | Purpose in Tasks Datetime | License |
| --- | --- | --- |
| [@floating-ui/dom](https://floating-ui.com/) | 1.7.6 | Positions the task-dependency editor popover | MIT |
| [boon-js](https://github.com/jakec-github/boon-js) | 2.0.5 | Parses boolean query expressions | MIT |
| [chrono-node](https://github.com/wanasit/chrono) | 2.3.9 | Parses natural-language dates and times | MIT |
| [eventemitter2](https://github.com/hij1nx/EventEmitter2) | 6.4.7 | Provides internal event handling | MIT |
| [flatpickr](https://flatpickr.js.org/) | 4.6.13 | Provides the date and time picker | MIT |
| [i18next](https://www.i18next.com/) | 24.2.1 | Provides internationalisation support | MIT |
| [mustache.js](https://github.com/janl/mustache.js) | 4.2.0 | Expands query placeholders | MIT |
| [mustache-validator](https://github.com/eliasm307/mustache-validator) | 0.2.0 | Safely validates placeholder data access | MIT |
| [rrule.js](https://github.com/jakubroztocil/rrule) | 2.8.1 | Evaluates recurring-task rules | BSD-3-Clause; includes python-dateutil-derived material, as noted in the release bundle |
| [safe-regex2](https://github.com/fastify/safe-regex2) | 5.1.1 | Detects unsafe regular expressions before use | MIT |

## Host APIs and editor components

These components are required at runtime but are marked external by the build;
they are supplied by Obsidian rather than bundled in `main.js`.

| Component | Purpose in Tasks Datetime |
| --- | --- |
| [Obsidian API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin) | Plugin lifecycle, vault access, commands, settings, rendering, and editor integration |
| [CodeMirror](https://codemirror.net/) (`@codemirror/state`, `@codemirror/view`) | Live Preview decorations for task lines |
| [Moment.js](https://momentjs.com/) | Obsidian date values; also used by the test suite |

## Optional ecosystem integrations

The following community plugins are documented integrations or prerequisites
for optional workflows. They are neither runtime dependencies nor bundled with
Tasks Datetime; users install and configure them independently.

| Plugin | Documented use |
| --- | --- |
| [Dataview](https://github.com/blacksmithgu/obsidian-dataview) | Reading compatible task metadata and presenting task-query results |
| [Kanban](https://github.com/mgmeyers/obsidian-kanban) | Finding and editing tasks in Markdown-backed Kanban boards |
| [Meta Bind](https://github.com/mProjectsCode/obsidian-meta-bind-plugin) | Building interactive controls for Tasks queries |
| [QuickAdd](https://github.com/chhoumann/quickadd) | Creating tasks through Capture choices and inline scripts |
| [Natural Language Dates](https://github.com/argenos/nldates-obsidian) | Optional QuickAdd prerequisite for natural-language date capture |

## Development, quality, and documentation tools

The following are direct `devDependencies` in [package.json](../../package.json).
They support development and verification and are not shipped as part of the
plugin runtime.

| Area | Components |
| --- | --- |
| Build and UI | [esbuild](https://esbuild.github.io/), `esbuild-sass-plugin`, `esbuild-svelte`, [Svelte](https://svelte.dev/), `svelte-preprocess`, `@tsconfig/svelte`, `svelte-check`, `tslib` |
| Language and types | [TypeScript](https://www.typescriptlang.org/), `typescript-eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `obsidian-typings`, `@codemirror/state`, `@codemirror/view`, `@types/jest`, `@types/mustache`, `@types/prettier` |
| Linting and formatting | [ESLint](https://eslint.org/), `@eslint/js`, `@eslint/json`, `eslint-config-prettier`, `eslint-plugin-obsidianmd`, `eslint-plugin-prettier`, `eslint-plugin-svelte`, `globals`, [Prettier](https://prettier.io/), `prettier-plugin-svelte`, [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) |
| Testing | [Jest](https://jestjs.io/), `jest-environment-jsdom`, `jest-sorted`, `ts-jest`, `svelte-jester`, `@testing-library/jest-dom`, `@testing-library/svelte`, [Approvals](https://github.com/approvals/Approvals.NodeJS), `async-mutex` |
| Maintenance and documentation | [Lefthook](https://github.com/evilmartians/lefthook), [i18next-parser](https://github.com/i18next/i18next-parser), [Madge](https://github.com/pahen/madge), [TypeDoc](https://typedoc.org/), `typedoc-plugin-mdn-links`, `typedoc-umlclass` |

## Documentation-vault plugins

The `docs` vault contains the following community plugins to help maintain and
publish this documentation. They are not loaded by Tasks Datetime and are not
included in its release artifact. Versions below are the versions recorded in
each plugin's `manifest.json`.

| Plugin | Version | Documentation-maintenance role |
| --- | --- | --- |
| Advanced Tables | 0.22.1 | Editing and formatting Markdown tables |
| Auto Link Title | 1.5.5 | Fetching titles for pasted links |
| Broken Links | 1.2.2 | Finding links that no longer resolve |
| Commander | 0.5.4 | Adding commands and macros to the workspace |
| Publish and GitHub URL | 0.4.5 | Opening or copying published and GitHub URLs |
| Plugin Update Tracker | 1.7.0 | Tracking updates to installed documentation plugins |
| Reveal Active File Button | 2.0.3 | Revealing the active documentation note in the file explorer |
| Tag Wrangler | 0.6.4 | Managing documentation tags |
| Templater | 2.16.2 | Applying documentation-note templates |
| Vault name in status bar | 1.1.1 | Identifying the active documentation vault |
| Vault Nickname | 1.1.7 | Distinguishing documentation vaults with the same folder name |

## Keeping this inventory current

When adding, removing, or upgrading a dependency or documentation-vault plugin:

1. Update the dependency declaration and lockfile, or the relevant plugin
   manifest.
2. Update this page with its role and the appropriate acknowledgement.
3. For bundled runtime changes, update [NOTICE](../../NOTICE) and verify the
   generated `main.js` contains all required license notices.
4. Before release, generate the exact dependency-license inventory with:

   ```bash
   fnm exec --using=22.23.1 corepack yarn licenses list
   ```

# Privacy and Permissions

Status: reviewed 2026-07-23 for the source and production bundle generated
from this repository.

## Data handling

Tasks Datetime processes task Markdown, plugin settings, and related metadata
inside the currently open Obsidian vault. This is necessary to render queries,
create and edit tasks, update task status, and calculate dashboard statistics.

The reviewed source and generated `main.js` contain no implementation of:

- telemetry, analytics, crash reporting, or advertising;
- HTTP, WebSocket, or other network requests;
- automatic update checks, external code downloads, or self-installation;
- user accounts, payments, or remote synchronization; or
- child-process execution or direct operating-system commands.

## File access

The plugin reads and modifies files through Obsidian's Vault APIs. It is
designed to operate on task files in the open vault and plugin settings managed
by Obsidian. It does not intentionally access files outside that vault.

## Scope and verification

This statement applies to release artifacts built from the reviewed commit.
Before every release, maintainers must re-run the source and bundle scan in the
[independent fork compliance audit](docs/Compliance/Independent%20Fork%20Compliance%20Audit.md).

For a suspected privacy or security issue, follow [SECURITY.md](SECURITY.md).

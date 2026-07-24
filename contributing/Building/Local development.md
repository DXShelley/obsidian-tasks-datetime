# Local development

First follow [[Setting up build environment]].

## Quick start

Whenever you get the latest code or change `package.json`, sync dependencies first:

```bash
yarn
```

Then build and deploy to the Tasks Demo vault (`resources/sample_vaults/Tasks-Demo/`):

```bash
yarn build:dev && yarn deploy:local
```

On Windows, run the two commands separately:

```bash
yarn build:dev
yarn deploy:local
```

> [!Tip]
> `deploy:local` copies all three plugin files (`main.js`, `manifest.json`, `styles.css`).
>
> Because the Hot Reload plugin is installed and configured in that vault, the Tasks plugin will reload automatically after each deploy.
>
> If testing callbacks in Tasks rendering code, use the **Reload app without saving** command instead, for safety.

> [!Warning]
> Please do not commit local plugin builds. We only commit released plugin versions. Thank you.

## Required workflow for local Obsidian testing

After every source-code change that is to be tested in Obsidian, build and deploy the plugin before checking the result in the UI. Unit tests run against source files, whereas Obsidian runs the generated `main.js` in the vault.

1. Build the production bundle:

```bash
yarn build
```

1. Deploy `main.js`, `manifest.json` and `styles.css` to the plugin directory of the test vault. The directory name must be the name of the enabled plugin folder, which may differ from the plugin id:

```bash
cp -f main.js manifest.json styles.css "/path/to/vault/.obsidian/plugins/<enabled-plugin-folder>/"
```

1. Reload the plugin or restart Obsidian before testing. If the vault has no `.hotreload` marker configured, copying files alone does not reload the already-running plugin.

1. Confirm that the deployed bundle is the bundle just built:

```bash
shasum -a 256 main.js "/path/to/vault/.obsidian/plugins/<enabled-plugin-folder>/main.js"
```

This build-and-deploy sequence is required for every iterative local test. Do not diagnose a UI result from a stale plugin bundle.

## Deploying to a different vault

Pass your vault path as an argument:

```bash
yarn deploy:local /path/to/your/vault
```

Make sure [Hot Reload](https://github.com/pjeby/hot-reload) is set up for the Tasks plugin in that vault.

## Watching for changes

To rebuild automatically on every file save (useful for catching compile errors during development):

```bash
yarn dev
```

Note that `yarn dev` does not deploy to a vault — use `build:dev` + `deploy:local` when you want to test in Obsidian.

PowerShell users can use `yarn deploy:local:pwsh` instead, which creates symbolic links rather than copying.

import { EnableJsInTasksQueries } from '../src/Config/EnableJsInTasksQueries';
import { InMemoryLocalStorageProvider } from '../src/Config/InMemoryLocalStorageProvider';
import { initializeI18n } from '../src/i18n/i18n';

if (HTMLElement.prototype.createEl === undefined) {
    HTMLElement.prototype.createEl = function <K extends keyof HTMLElementTagNameMap>(
        tagName: K,
    ): HTMLElementTagNameMap[K] {
        const element = document.createElement(tagName);
        this.append(element);
        return element;
    };
}

// Tests should default to allowing JavaScript in Tasks queries.
// Production code initialises this singleton separately in main.ts, using Obsidian local storage.
EnableJsInTasksQueries.initialise(new InMemoryLocalStorageProvider());
EnableJsInTasksQueries.getInstance().set(true);

beforeAll(async () => {
    await initializeI18n();
});

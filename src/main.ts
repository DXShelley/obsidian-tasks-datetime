import { Plugin, type Reference, getLinkpath } from 'obsidian';

import type { Task } from 'Task/Task';
import { i18n, initializeI18n, setPluginLanguage } from './i18n/i18n';
import { Cache, State } from './Obsidian/Cache';
import { Commands } from './Commands';
import { GlobalQuery } from './Config/GlobalQuery';
import { TasksEvents } from './Obsidian/TasksEvents';
import { initializeFile } from './Obsidian/File';
import { InlineRenderer } from './Obsidian/InlineRenderer';
import { newLivePreviewExtension } from './Obsidian/LivePreviewExtension';
import { QueryRenderer } from './Renderer/QueryRenderer';
import { getSettings, updateSettings } from './Config/Settings';
import { SettingsTab } from './Config/SettingsTab';
import { StatusRegistry } from './Statuses/StatusRegistry';
import { log, logging } from './lib/logging';
import { EditorSuggestor } from './Suggestor/EditorSuggestorPopup';
import { StatusSettings } from './Config/StatusSettings';
import { tasksApiV1 } from './Api';
import { GlobalFilter } from './Config/GlobalFilter';
import { QueryFileDefaults } from './Query/QueryFileDefaults';
import { LinkResolver } from './Task/LinkResolver';
import { ObsidianLocalStorageProvider } from './Config/ObsidianLocalStorageProvider';
import { EnableJsInTasksQueries } from './Config/EnableJsInTasksQueries';
import { TaskDashboardModal } from './Obsidian/TaskDashboardModal';
import { DashboardViewStore } from './Dashboard/DashboardFilters';
import { TaskIdManager } from './TaskId/TaskIdManager';
import { ReminderPlanPublisher } from './Reminder/ReminderPlanPublisher';
import { reminderPlanFilename } from './Reminder/ReminderPlanWriter';
import { ReminderNoticeScheduler } from './Reminder/ReminderNoticeScheduler';

export default class TasksPlugin extends Plugin {
    private cache: Cache | undefined;
    public inlineRenderer: InlineRenderer | undefined;
    public queryRenderer: QueryRenderer | undefined;
    private commands: Commands | undefined;
    private taskIdManager: TaskIdManager | undefined;
    private reminderPlanPublisher: ReminderPlanPublisher | undefined;
    private reminderNoticeScheduler: ReminderNoticeScheduler | undefined;

    get apiV1() {
        return tasksApiV1(this);
    }

    async onload() {
        await initializeI18n();

        logging.registerConsoleLogger();
        log('info', i18n.t('main.loadingPlugin', { name: this.manifest.name, version: this.manifest.version }));

        await this.loadSettings();

        EnableJsInTasksQueries.initialise(new ObsidianLocalStorageProvider(this.app));

        // Configure logging.
        const { loggingOptions } = getSettings();
        logging.configure(loggingOptions);

        // Configure LinkResolver.getInstance().resolve(), to ensure that links know where Obsidian will resolve them to:
        LinkResolver.getInstance().setGetFirstLinkpathDestFn((link: Reference, sourcePath: string) => {
            const linkpath = getLinkpath(link.link);
            const tFile = this.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
            return tFile ? tFile.path : null;
        });

        const events = new TasksEvents({ obsidianEvents: this.app.workspace });

        this.addSettingTab(new SettingsTab({ plugin: this, events }));

        initializeFile({
            metadataCache: this.app.metadataCache,
            vault: this.app.vault,
            workspace: this.app.workspace,
        });

        // Load configured status types.
        await this.loadTaskStatuses();

        this.cache = new Cache({
            metadataCache: this.app.metadataCache,
            vault: this.app.vault,
            workspace: this.app.workspace,
            events,
        });
        this.reminderNoticeScheduler = new ReminderNoticeScheduler({
            isEnabled: () => getSettings().reminderSettings.enabled && getSettings().reminderSettings.showInObsidian,
        });
        this.reminderNoticeScheduler.start();
        this.reminderPlanPublisher = new ReminderPlanPublisher({
            events,
            storage: this.app.vault.adapter,
            getAdvanceMinutes: () => getSettings().reminderSettings.advanceMinutes,
            isEnabled: () => getSettings().reminderSettings.enabled,
            getLanguage: () => getSettings().language,
            planPath: `${this.manifest.dir ?? '.obsidian/plugins/tasks-datetime'}/${reminderPlanFilename}`,
            producerVersion: this.manifest.version,
            onPlanBuilt: (plan) => this.reminderNoticeScheduler?.update(plan),
        });
        this.reminderPlanPublisher.start();

        this.inlineRenderer = new InlineRenderer({ plugin: this, app: this.app });
        this.queryRenderer = new QueryRenderer({ plugin: this, events });

        // Update types.json.
        this.setObsidianPropertiesTypes();

        this.registerEditorExtension(newLivePreviewExtension(this));
        this.registerEditorSuggest(new EditorSuggestor(this.app, getSettings(), this));
        this.addRibbonIcon('chart-no-axes-combined', i18n.t('ui.dashboard.open'), () => this.openDashboard());
        this.taskIdManager = new TaskIdManager(this);
        this.commands = new Commands({ plugin: this, taskIdManager: this.taskIdManager });
    }

    async loadTaskStatuses() {
        const { statusSettings } = getSettings();
        StatusSettings.applyToStatusRegistry(statusSettings, StatusRegistry.getInstance());
    }

    onunload() {
        log('info', i18n.t('main.unloadingPlugin', { name: this.manifest.name, version: this.manifest.version }));
        this.cache?.unload();
        this.taskIdManager?.unload();
        this.reminderPlanPublisher?.unload();
        this.reminderNoticeScheduler?.unload();
    }

    async loadSettings() {
        let newSettings = await this.loadData();
        updateSettings(newSettings);

        await setPluginLanguage(getSettings().language);

        // Fetch the updated settings, in case the user has not yet edited the settings,
        // in which case newSettings is currently empty.
        newSettings = getSettings();
        GlobalFilter.getInstance().set(newSettings.globalFilter);
        GlobalFilter.getInstance().setRemoveGlobalFilter(newSettings.removeGlobalFilter);
        GlobalQuery.getInstance().set(newSettings.globalQuery);

        await this.loadTaskStatuses();
    }

    async saveSettings() {
        await this.saveData(getSettings());
    }

    public refreshCommandsLanguage(): void {
        this.commands?.refreshLanguage();
    }

    public getTasks(): Task[] {
        if (this.cache === undefined) {
            return [] as Task[];
        } else {
            return this.cache.getTasks();
        }
    }

    public refreshReminderPlan(): void {
        if (this.getState() !== State.Warm) return;
        this.reminderPlanPublisher?.publishSafely(this.getTasks());
    }

    public openDashboard(): void {
        const savedViews = getSettings().dashboardViews;
        const viewStore = new DashboardViewStore(savedViews, async (views) => {
            updateSettings({ dashboardViews: views });
            await this.saveSettings();
        });
        new TaskDashboardModal(this.app, () => this.getTasks(), viewStore).open();
    }

    public getState(): State {
        if (this.cache === undefined) {
            return State.Cold;
        }
        return this.cache.getState();
    }

    /**
     * Add {@link QueryFileDefaults} properties to the Obsidian vault's types.json file,
     * so that they are available via auto-complete in the File Properties panel.
     */
    private setObsidianPropertiesTypes() {
        // Credit: this code based on ideas...
        // by:
        //      @SkepticMystic
        // in:
        //      https://github.com/SkepticMystic/breadcrumbs/blob/d380407678ce64f5668550d270b1035bc1a767f8/src/main.ts#L47-L64
        try {
            // @ts-expect-error TS2339: Property metadataTypeManager does not exist on type App
            const metadataTypeManager = this.app.metadataTypeManager;
            const all_properties = metadataTypeManager.getAllProperties();

            const defaults = new QueryFileDefaults();
            for (const field of defaults.allPropertyNamesSorted()) {
                const property_type = defaults.propertyType(field);
                if (all_properties[field]?.type === property_type) {
                    continue;
                }
                metadataTypeManager.setType(field, property_type);
            }
        } catch (error) {
            console.error('setObsidianPropertiesTypes error', error);
        }
    }
}

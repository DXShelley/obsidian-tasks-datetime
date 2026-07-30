import type { EventRef } from 'obsidian';
import { State } from '../Obsidian/Cache';
import type { TasksEvents } from '../Obsidian/TasksEvents';
import type { Task } from '../Task/Task';
import type { PluginLanguage } from '../i18n/i18n';
import { logging } from '../lib/logging';
import { type ReminderPlan, buildReminderPlan } from './ReminderPlan';
import { type ReminderPlanStorage, ReminderPlanWriter } from './ReminderPlanWriter';

export interface ReminderPlanPublisherOptions {
    events: TasksEvents;
    storage: ReminderPlanStorage;
    getAdvanceMinutes: () => number;
    getLanguage?: () => PluginLanguage;
    isEnabled?: () => boolean;
    planPath?: string;
    producerVersion?: string;
    now?: () => string;
    timezone?: () => string;
    onPlanBuilt?: (plan: ReminderPlan) => void;
}

/** Connects the Tasks cache to the agent-readable reminder plan file. */
export class ReminderPlanPublisher {
    private readonly writer: ReminderPlanWriter;
    private readonly now: () => string;
    private readonly timezone: () => string;
    private cacheUpdateEventRef: EventRef | undefined;
    private publishQueue: Promise<void> = Promise.resolve();
    private lifecycleGeneration = 0;
    private snapshotSequence = 0;
    private readonly logger = logging.getLogger('tasks.Reminder');

    constructor(private readonly options: ReminderPlanPublisherOptions) {
        this.writer = new ReminderPlanWriter(options.storage, options.planPath);
        this.now = options.now ?? (() => new Date().toISOString());
        this.timezone = options.timezone ?? (() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    }

    public start(): void {
        this.lifecycleGeneration++;
        this.cacheUpdateEventRef = this.options.events.onCacheUpdate(({ tasks, state }) => {
            if (state !== State.Warm) return;
            this.publishSafely(tasks);
        });
    }

    public unload(): void {
        this.lifecycleGeneration++;
        if (this.cacheUpdateEventRef !== undefined) {
            this.options.events.off(this.cacheUpdateEventRef);
            this.cacheUpdateEventRef = undefined;
        }
    }

    public publish(tasks: readonly Task[]): Promise<void> {
        const lifecycleGeneration = this.lifecycleGeneration;
        const generatedAt = this.now();
        const plan = buildReminderPlan(this.options.isEnabled?.() === false ? [] : tasks, {
            advanceMinutes: this.options.getAdvanceMinutes(),
            language: this.options.getLanguage?.(),
            generatedAt,
            timezone: this.timezone(),
            producerVersion: this.options.producerVersion,
            snapshotId: `${generatedAt}:${++this.snapshotSequence}`,
        });
        this.options.onPlanBuilt?.(plan);
        const writePlan = () =>
            lifecycleGeneration === this.lifecycleGeneration ? this.writer.write(plan) : Promise.resolve();
        this.publishQueue = this.publishQueue.then(writePlan, writePlan);
        return this.publishQueue;
    }

    public publishSafely(tasks: readonly Task[]): void {
        void this.publish(tasks).catch((error) => this.logger.error('Unable to publish reminder plan', error));
    }
}

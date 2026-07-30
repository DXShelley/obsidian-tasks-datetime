import { Notice } from 'obsidian';
import type { ReminderPlan, ReminderPlanEvent } from './ReminderPlan';

const pollingIntervalMilliseconds = 30_000;
const maximumItemsInNotice = 3;
const noticeDurationMilliseconds = 10_000;

export interface ReminderNoticeSchedulerOptions {
    isEnabled: () => boolean;
    now?: () => Date;
    showNotice?: (message: string) => void;
    setInterval?: (callback: () => void, milliseconds: number) => number;
    clearInterval?: (intervalId: number) => void;
}

/**
 * Presents due reminder-plan events as brief, grouped Obsidian notices.
 *
 * The scheduler deliberately does not replay events that were already due when
 * a plan first reaches it. This keeps opening Obsidian from producing a burst
 * of stale notifications.
 */
export class ReminderNoticeScheduler {
    private events = new Map<string, ReminderPlanEvent>();
    private notifiedEventIds = new Set<string>();
    private intervalId: number | undefined;
    private readonly now: () => Date;
    private readonly showNotice: (message: string) => void;
    private readonly setInterval: (callback: () => void, milliseconds: number) => number;
    private readonly clearInterval: (intervalId: number) => void;

    constructor(private readonly options: ReminderNoticeSchedulerOptions) {
        this.now = options.now ?? (() => new Date());
        this.showNotice = options.showNotice ?? ((message) => new Notice(message, noticeDurationMilliseconds));
        this.setInterval =
            options.setInterval ?? ((callback, milliseconds) => window.setInterval(callback, milliseconds));
        this.clearInterval = options.clearInterval ?? ((intervalId) => window.clearInterval(intervalId));
    }

    public start(): void {
        if (this.intervalId !== undefined) return;
        this.intervalId = this.setInterval(() => this.deliverDueReminders(), pollingIntervalMilliseconds);
    }

    public update(plan: ReminderPlan): void {
        const now = this.now().getTime();
        const nextEvents = new Map(plan.events.map((event) => [event.id, event]));

        // A task added or edited with a past trigger must not cause an
        // unexpected catch-up notice. Existing events remain eligible, as the
        // normal polling cycle may simply not have reached their due time yet.
        for (const event of nextEvents.values()) {
            if (!this.events.has(event.id) && Date.parse(event.triggerAt) <= now) {
                this.notifiedEventIds.add(event.id);
            }
        }

        this.events = nextEvents;
        this.notifiedEventIds = new Set([...this.notifiedEventIds].filter((id) => nextEvents.has(id)));
        this.deliverDueReminders();
    }

    public unload(): void {
        if (this.intervalId !== undefined) this.clearInterval(this.intervalId);
        this.intervalId = undefined;
        this.events.clear();
        this.notifiedEventIds.clear();
    }

    private deliverDueReminders(): void {
        const now = this.now().getTime();
        const dueEvents = [...this.events.values()].filter(
            (event) => !this.notifiedEventIds.has(event.id) && Date.parse(event.triggerAt) <= now,
        );
        if (dueEvents.length === 0) return;

        dueEvents.forEach((event) => this.notifiedEventIds.add(event.id));
        if (!this.options.isEnabled()) return;
        this.showNotice(formatReminderNotice(dueEvents));
    }
}

function formatReminderNotice(events: readonly ReminderPlanEvent[]): string {
    const displayedItems = events.slice(0, maximumItemsInNotice).map((event) => {
        return `${event.notification.presentation.label}: ${event.title}`;
    });
    const remainingCount = events.length - displayedItems.length;
    return [...displayedItems, ...(remainingCount > 0 ? [`+${remainingCount}`] : [])].join('\n');
}

import type { ReminderPlan } from './ReminderPlan';

export const reminderPlanFilename = 'reminder-plan.v1.json';
export const reminderPlanPath = `plugins/tasks-datetime/${reminderPlanFilename}`;

export interface ReminderPlanStorage {
    exists(path: string): Promise<boolean>;
    process(path: string, callback: (data: string) => string): Promise<string | void>;
    write(path: string, data: string): Promise<void>;
}

/** Publishes the complete reminder snapshot consumed by the Agent automation. */
export class ReminderPlanWriter {
    constructor(private readonly storage: ReminderPlanStorage, private readonly path = reminderPlanPath) {}

    public async write(plan: ReminderPlan): Promise<void> {
        const serializedPlan = JSON.stringify(plan, null, 2) + '\n';
        if (!(await this.storage.exists(this.path))) {
            await this.storage.write(this.path, serializedPlan);
            return;
        }
        await this.storage.process(this.path, () => serializedPlan);
    }
}

import type { Moment } from 'moment';
import type { PluginLanguage } from '../i18n/i18n';
import type { Task } from '../Task/Task';
import { Priority } from '../Task/Priority';
import { normaliseReminderAdvanceMinutes } from './ReminderSettings';

export const REMINDER_PLAN_SCHEMA_VERSION = 1;

export type ReminderKind = 'task.start' | 'task.scheduled' | 'task.due';

export interface ReminderPlanEvent {
    id: string;
    kind: ReminderKind;
    triggerAt: string;
    sourceAt: string;
    displayTime: string;
    timezone: string;
    title: string;
    task: {
        id: string;
        path: string;
        line: number;
        status: string;
        tags: string[];
    };
    notification: {
        title: string;
        body: string;
        priority: 'normal' | 'high';
        /**
         * Presentation data for notification senders. Keep this structured so a
         * sender can lay out the message without extracting information from text.
         */
        presentation: {
            tone: 'routine' | 'attention' | 'critical';
            label: string;
            timeLabel: string;
            time: string;
            advanceLabel: string | null;
            priorityLabel: string;
            statusLabel: string;
            tags: string[];
            source: {
                path: string;
                line: number;
            };
        };
    };
}

export interface ReminderPlan {
    schemaVersion: typeof REMINDER_PLAN_SCHEMA_VERSION;
    snapshotId: string;
    generatedAt: string;
    timezone: string;
    producer: {
        name: 'tasks-datetime';
        version: string;
    };
    advanceMinutes: number;
    events: ReminderPlanEvent[];
    summary: {
        activeEventCount: number;
        skippedMidnightDateCount: number;
        invalidTaskIdCount: number;
        duplicateTaskIdCount: number;
    };
    diagnostics: ReminderPlanDiagnostic[];
}

export interface ReminderPlanDiagnostic {
    code: 'MISSING_TASK_ID' | 'DUPLICATE_TASK_ID' | 'MIDNIGHT_DATE_SKIPPED';
    taskId?: string;
    path: string;
    message: string;
}

export interface BuildReminderPlanOptions {
    advanceMinutes: number;
    generatedAt: string;
    timezone: string;
    language?: PluginLanguage;
    producerVersion?: string;
    snapshotId?: string;
}

type DateReminderDefinition = {
    kind: ReminderKind;
    fieldName: 'startDate' | 'scheduledDate' | 'dueDate';
    idPrefix: 'task-start' | 'task-scheduled' | 'task-due';
    textKey: 'start' | 'scheduled' | 'due';
    priority: 'normal' | 'high';
};

const dateReminderDefinitions: readonly DateReminderDefinition[] = [
    {
        kind: 'task.start',
        fieldName: 'startDate',
        idPrefix: 'task-start',
        textKey: 'start',
        priority: 'normal',
    },
    {
        kind: 'task.scheduled',
        fieldName: 'scheduledDate',
        idPrefix: 'task-scheduled',
        textKey: 'scheduled',
        priority: 'normal',
    },
    {
        kind: 'task.due',
        fieldName: 'dueDate',
        idPrefix: 'task-due',
        textKey: 'due',
        priority: 'high',
    },
];

const reminderTexts: Record<
    PluginLanguage,
    Record<DateReminderDefinition['textKey'], { label: string; timeLabel: string }>
> = {
    en: {
        start: { label: 'Start reminder', timeLabel: 'Start time' },
        scheduled: { label: 'Scheduled reminder', timeLabel: 'Scheduled time' },
        due: { label: 'Due reminder', timeLabel: 'Due time' },
    },
    zh: {
        start: { label: '开始提醒', timeLabel: '开始时间' },
        scheduled: { label: '计划时间提醒', timeLabel: '计划时间' },
        due: { label: '截止时间提醒', timeLabel: '截止时间' },
    },
};

/** Builds the complete, agent-readable reminder snapshot from the task cache. */
export function buildReminderPlan(tasks: readonly Task[], options: BuildReminderPlanOptions): ReminderPlan {
    const advanceMinutes = normaliseReminderAdvanceMinutes(options.advanceMinutes);
    const duplicateIds = duplicateTaskIds(tasks);
    const diagnostics: ReminderPlanDiagnostic[] = [];
    const events: ReminderPlanEvent[] = [];
    let skippedMidnightDateCount = 0;
    let invalidTaskIdCount = 0;
    let duplicateTaskIdCount = 0;

    for (const task of tasks) {
        if (task.isDone) continue;

        for (const definition of dateReminderDefinitions) {
            const sourceAt = task[definition.fieldName];
            if (sourceAt?.isValid() && isMidnight(sourceAt)) {
                skippedMidnightDateCount++;
            }
        }

        if (!hasEligibleReminderDate(task)) continue;

        if (task.id === '') {
            invalidTaskIdCount++;
            diagnostics.push({
                code: 'MISSING_TASK_ID',
                path: task.path,
                message: 'Task has a reminder date but no stable task ID.',
            });
            continue;
        }

        if (duplicateIds.has(task.id)) {
            duplicateTaskIdCount++;
            diagnostics.push({
                code: 'DUPLICATE_TASK_ID',
                taskId: task.id,
                path: task.path,
                message: 'Task ID is duplicated and cannot be used for reliable reminders.',
            });
            continue;
        }

        for (const definition of dateReminderDefinitions) {
            const sourceAt = task[definition.fieldName];
            if (sourceAt === null || !sourceAt.isValid()) continue;

            if (isMidnight(sourceAt)) continue;

            events.push(
                createEvent(task, definition, sourceAt, advanceMinutes, options.timezone, options.language ?? 'en'),
            );
        }
    }

    events.sort((left, right) => left.triggerAt.localeCompare(right.triggerAt) || left.id.localeCompare(right.id));
    return {
        schemaVersion: REMINDER_PLAN_SCHEMA_VERSION,
        snapshotId: options.snapshotId ?? `${options.generatedAt}:${events.length}`,
        generatedAt: options.generatedAt,
        timezone: options.timezone,
        producer: { name: 'tasks-datetime', version: options.producerVersion ?? 'unknown' },
        advanceMinutes,
        events,
        summary: {
            activeEventCount: events.length,
            skippedMidnightDateCount,
            invalidTaskIdCount,
            duplicateTaskIdCount,
        },
        diagnostics,
    };
}

function duplicateTaskIds(tasks: readonly Task[]): Set<string> {
    const counts = new Map<string, number>();
    for (const task of tasks) {
        if (!task.isDone && task.id !== '') {
            counts.set(task.id, (counts.get(task.id) ?? 0) + 1);
        }
    }
    return new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id));
}

function hasEligibleReminderDate(task: Task): boolean {
    return dateReminderDefinitions.some((definition) => {
        const date = task[definition.fieldName];
        return date?.isValid() && !isMidnight(date);
    });
}

function createEvent(
    task: Task,
    definition: DateReminderDefinition,
    sourceAt: Moment,
    advanceMinutes: number,
    timezone: string,
    language: PluginLanguage,
): ReminderPlanEvent {
    const triggerAt = sourceAt.clone().subtract(advanceMinutes, 'minutes');
    const displayTime = sourceAt.format('YYYY-MM-DD HH:mm:ss');
    const title = task.descriptionWithoutTags;
    const text = reminderTexts[language][definition.textKey];
    return {
        id: `${definition.idPrefix}:${task.id}:${triggerAt.toISOString()}`,
        kind: definition.kind,
        triggerAt: triggerAt.toISOString(),
        sourceAt: sourceAt.toISOString(),
        displayTime,
        timezone,
        title,
        task: {
            id: task.id,
            path: task.path,
            line: task.taskLocation.lineNumber + 1,
            status: task.status.type,
            tags: [...task.tags],
        },
        notification: {
            title,
            body: notificationBody(text.timeLabel, displayTime, advanceMinutes, language),
            priority: definition.priority,
            presentation: {
                tone: notificationTone(definition, task),
                label: text.label,
                timeLabel: text.timeLabel,
                time: displayTime,
                advanceLabel: advanceMinutes > 0 ? advanceLabel(advanceMinutes, language) : null,
                priorityLabel: notificationPriorityLabel(task.priority, language),
                statusLabel: task.status.type,
                tags: [...task.tags],
                source: {
                    path: task.path,
                    line: task.taskLocation.lineNumber + 1,
                },
            },
        },
    };
}

function notificationBody(
    timeLabel: string,
    displayTime: string,
    advanceMinutes: number,
    language: PluginLanguage,
): string {
    if (language === 'zh') {
        const advance = advanceMinutes > 0 ? `，${advanceLabel(advanceMinutes, language)}提醒` : '';
        return `${timeLabel}：${displayTime}${advance}`;
    }
    const advance = advanceMinutes > 0 ? ` (${advanceLabel(advanceMinutes, language)})` : '';
    return `${timeLabel}: ${displayTime}${advance}`;
}

function advanceLabel(advanceMinutes: number, language: PluginLanguage): string {
    return language === 'zh' ? `提前 ${advanceMinutes} 分钟` : `${advanceMinutes} minutes early`;
}

function notificationTone(definition: DateReminderDefinition, task: Task): 'routine' | 'attention' | 'critical' {
    if (definition.kind === 'task.due' && task.priority <= Priority.High) return 'critical';
    if (definition.kind === 'task.due' || task.priority <= Priority.High) return 'attention';
    return 'routine';
}

function notificationPriorityLabel(priority: Priority, language: PluginLanguage): string {
    const labels: Record<PluginLanguage, Record<Priority, string>> = {
        en: {
            [Priority.Highest]: 'Highest priority',
            [Priority.High]: 'High priority',
            [Priority.Medium]: 'Medium priority',
            [Priority.None]: 'Normal priority',
            [Priority.Low]: 'Low priority',
            [Priority.Lowest]: 'Lowest priority',
        },
        zh: {
            [Priority.Highest]: '最高优先级',
            [Priority.High]: '高优先级',
            [Priority.Medium]: '中优先级',
            [Priority.None]: '普通优先级',
            [Priority.Low]: '低优先级',
            [Priority.Lowest]: '最低优先级',
        },
    };
    return labels[language][priority];
}

function isMidnight(date: Moment): boolean {
    return date.hour() === 0 && date.minute() === 0 && date.second() === 0;
}

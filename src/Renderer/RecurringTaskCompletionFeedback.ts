import { Notice } from 'obsidian';
import { formatTaskDate } from '../DateTime/DateTools';
import { i18n } from '../i18n/i18n';
import { undoTaskReplacement } from '../Obsidian/File';
import { StatusRegistry } from '../Statuses/StatusRegistry';
import type { Task } from '../Task/Task';

const recentlyCreatedOccurrences = new Map<string, number>();
const occurrenceHighlightDuration = 2200;

export function createsNextRecurringOccurrence(task: Task, replacementTasks: Task[]): boolean {
    if (task.recurrence === null || task.status.isCompleted()) return false;

    const nextStatus = StatusRegistry.getInstance().getNextStatusOrCreate(task.status);
    return nextStatus.isCompleted() && replacementTasks.some((replacement) => !replacement.status.isCompleted());
}

export function markRecentlyCreatedOccurrence(task: Task): void {
    recentlyCreatedOccurrences.set(task.toFileLineString(), Date.now() + occurrenceHighlightDuration);
}

export function isRecentlyCreatedOccurrence(task: Task): boolean {
    const key = task.toFileLineString();
    const expiresAt = recentlyCreatedOccurrences.get(key);
    if (expiresAt === undefined) return false;
    if (expiresAt < Date.now()) {
        recentlyCreatedOccurrences.delete(key);
        return false;
    }
    recentlyCreatedOccurrences.delete(key);
    return true;
}

export function showRecurringTaskCompletionFeedback(originalTask: Task, replacementTasks: Task[]): void {
    const nextOccurrence = replacementTasks.find((task) => !task.status.isCompleted());
    if (!nextOccurrence) return;

    markRecentlyCreatedOccurrence(nextOccurrence);

    const nextDate = nextOccurrence.startDate ?? nextOccurrence.scheduledDate ?? nextOccurrence.dueDate;
    const suffix = nextDate ? i18n.t('ui.notices.recurringTaskNextDate', { date: formatTaskDate(nextDate) }) : '';
    const fragment = createFragment();
    fragment.appendText(
        i18n.t('ui.notices.recurringTaskCompleted', {
            description: originalTask.descriptionWithoutTags,
            nextDate: suffix,
        }),
    );

    const undoButton = createEl('button', {
        cls: 'tasks-recurring-task-undo',
        text: i18n.t('ui.notices.undo'),
    });
    undoButton.type = 'button';
    undoButton.addEventListener('click', async () => {
        undoButton.disabled = true;
        const undone = await undoTaskReplacement({ originalTask, replacementTasks });
        if (undone) {
            notice.hide();
            new Notice(i18n.t('ui.notices.recurringTaskUndone'), 3000);
        } else {
            undoButton.disabled = false;
        }
    });
    fragment.appendChild(undoButton);

    const notice = new Notice(fragment, 5000);
}

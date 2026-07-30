/**
 * @jest-environment jsdom
 */

import type { ReminderPlan } from '../../src/Reminder/ReminderPlan';
import { ReminderNoticeScheduler } from '../../src/Reminder/ReminderNoticeScheduler';

function plan(events: ReminderPlan['events']): ReminderPlan {
    return {
        schemaVersion: 1,
        snapshotId: 'snapshot',
        generatedAt: '2026-07-30T10:00:00.000Z',
        timezone: 'Asia/Shanghai',
        producer: { name: 'tasks-datetime', version: 'test' },
        advanceMinutes: 0,
        events,
        summary: {
            activeEventCount: events.length,
            skippedMidnightDateCount: 0,
            invalidTaskIdCount: 0,
            duplicateTaskIdCount: 0,
        },
        diagnostics: [],
    };
}

function event(id: string, triggerAt: string, title = id): ReminderPlan['events'][number] {
    return {
        id,
        kind: 'task.due',
        triggerAt,
        sourceAt: triggerAt,
        displayTime: triggerAt,
        timezone: 'Asia/Shanghai',
        title,
        task: { id, path: 'Tasks.md', line: 1, status: 'TODO', tags: [] },
        notification: {
            title,
            body: '',
            priority: 'high',
            presentation: {
                tone: 'attention',
                label: 'Due reminder',
                timeLabel: 'Due time',
                time: triggerAt,
                advanceLabel: null,
                priorityLabel: 'Normal priority',
                statusLabel: 'TODO',
                tags: [],
                source: { path: 'Tasks.md', line: 1 },
            },
        },
    };
}

describe('ReminderNoticeScheduler', () => {
    it('does not replay reminders that were already due when Obsidian opened', () => {
        const showNotice = jest.fn();
        const scheduler = new ReminderNoticeScheduler({
            isEnabled: () => true,
            now: () => new Date('2026-07-30T10:00:00.000Z'),
            showNotice,
        });

        scheduler.update(plan([event('past', '2026-07-30T09:59:00.000Z')]));

        expect(showNotice).not.toHaveBeenCalled();
    });

    it('does not replay a reminder that was already due when reminders are enabled later', () => {
        const showNotice = jest.fn();
        const scheduler = new ReminderNoticeScheduler({
            isEnabled: () => true,
            now: () => new Date('2026-07-30T10:00:00.000Z'),
            showNotice,
        });

        scheduler.update(plan([]));
        scheduler.update(plan([event('past', '2026-07-30T09:59:00.000Z')]));

        expect(showNotice).not.toHaveBeenCalled();
    });

    it('groups newly due reminders and only presents each event once', () => {
        let now = new Date('2026-07-30T10:00:00.000Z');
        const showNotice = jest.fn();
        const scheduler = new ReminderNoticeScheduler({ isEnabled: () => true, now: () => now, showNotice });
        const reminderPlan = plan([
            event('one', '2026-07-30T10:01:00.000Z', 'First task'),
            event('two', '2026-07-30T10:01:00.000Z', 'Second task'),
        ]);

        scheduler.update(reminderPlan);
        now = new Date('2026-07-30T10:01:00.000Z');
        scheduler.update(reminderPlan);
        scheduler.update(reminderPlan);

        expect(showNotice).toHaveBeenCalledTimes(1);
        expect(showNotice).toHaveBeenCalledWith('Due reminder: First task\nDue reminder: Second task');
    });

    it('shows a language-neutral count when more than three reminders are due together', () => {
        let now = new Date('2026-07-30T10:00:00.000Z');
        const showNotice = jest.fn();
        const scheduler = new ReminderNoticeScheduler({ isEnabled: () => true, now: () => now, showNotice });
        const reminderPlan = plan([
            event('one', '2026-07-30T10:01:00.000Z'),
            event('two', '2026-07-30T10:01:00.000Z'),
            event('three', '2026-07-30T10:01:00.000Z'),
            event('four', '2026-07-30T10:01:00.000Z'),
        ]);

        scheduler.update(reminderPlan);
        now = new Date('2026-07-30T10:01:00.000Z');
        scheduler.update(reminderPlan);

        expect(showNotice).toHaveBeenCalledWith('Due reminder: one\nDue reminder: two\nDue reminder: three\n+1');
    });

    it('does not show notices while the Obsidian reminder channel is disabled', () => {
        let enabled = false;
        let now = new Date('2026-07-30T10:00:00.000Z');
        const showNotice = jest.fn();
        const scheduler = new ReminderNoticeScheduler({ isEnabled: () => enabled, now: () => now, showNotice });
        const reminderPlan = plan([event('one', '2026-07-30T10:01:00.000Z')]);

        scheduler.update(reminderPlan);
        now = new Date('2026-07-30T10:01:00.000Z');
        scheduler.update(reminderPlan);
        enabled = true;
        scheduler.update(reminderPlan);

        expect(showNotice).not.toHaveBeenCalled();
    });
});

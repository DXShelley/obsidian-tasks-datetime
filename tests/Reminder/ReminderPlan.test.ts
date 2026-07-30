/**
 * @jest-environment jsdom
 */

import moment from 'moment';
import { buildReminderPlan } from '../../src/Reminder/ReminderPlan';
import { Status } from '../../src/Statuses/Status';
import { Priority } from '../../src/Task/Priority';
import { TaskBuilder } from '../TestingTools/TaskBuilder';

window.moment = moment;

describe('buildReminderPlan', () => {
    const generatedAt = '2026-07-29T10:00:00.000Z';

    it('creates independent start, scheduled and due events with an advance offset', () => {
        const task = new TaskBuilder()
            .id('ticket-check')
            .description('Check ticket availability')
            .path('Personal/Plan.md')
            .lineNumber(17)
            .startDate('2026-07-30 13:30:00')
            .scheduledDate('2026-07-30 14:00:00')
            .dueDate('2026-07-30 14:30:00')
            .build();

        const plan = buildReminderPlan([task], {
            advanceMinutes: 15,
            generatedAt,
            timezone: 'Asia/Shanghai',
            language: 'zh',
        });

        expect(plan.events).toEqual([
            expect.objectContaining({
                id: 'task-start:ticket-check:2026-07-30T13:15:00.000Z',
                kind: 'task.start',
                triggerAt: '2026-07-30T13:15:00.000Z',
                sourceAt: '2026-07-30T13:30:00.000Z',
            }),
            expect.objectContaining({
                id: 'task-scheduled:ticket-check:2026-07-30T13:45:00.000Z',
                kind: 'task.scheduled',
                triggerAt: '2026-07-30T13:45:00.000Z',
                sourceAt: '2026-07-30T14:00:00.000Z',
            }),
            expect.objectContaining({
                id: 'task-due:ticket-check:2026-07-30T14:15:00.000Z',
                kind: 'task.due',
                triggerAt: '2026-07-30T14:15:00.000Z',
                sourceAt: '2026-07-30T14:30:00.000Z',
            }),
        ]);
    });

    it('does not create events for dates at exactly midnight', () => {
        const task = new TaskBuilder()
            .id('midnight-task')
            .startDate('2026-07-30 00:00:00')
            .scheduledDate('2026-07-30 00:00:00')
            .dueDate('2026-07-30 00:00:00')
            .build();

        const plan = buildReminderPlan([task], { advanceMinutes: 0, generatedAt, timezone: 'Asia/Shanghai' });

        expect(plan.events).toEqual([]);
        expect(plan.summary.skippedMidnightDateCount).toBe(3);
    });

    it('provides structured notification content for the delivery UI', () => {
        const task = new TaskBuilder()
            .id('release-check')
            .description('检查发布清单')
            .path('项目/发布.md')
            .lineNumber(11)
            .tags(['#发布', '#本周'])
            .priority(Priority.Highest)
            .dueDate('2026-07-30 14:30:00')
            .build();

        const plan = buildReminderPlan([task], {
            advanceMinutes: 15,
            generatedAt,
            timezone: 'Asia/Shanghai',
            language: 'zh',
        });

        expect(plan.events[0].notification).toEqual({
            title: '检查发布清单',
            body: '截止时间：2026-07-30 14:30:00，提前 15 分钟提醒',
            priority: 'high',
            presentation: {
                tone: 'critical',
                label: '截止时间提醒',
                timeLabel: '截止时间',
                time: '2026-07-30 14:30:00',
                advanceLabel: '提前 15 分钟',
                priorityLabel: '最高优先级',
                statusLabel: 'TODO',
                tags: ['#发布', '#本周'],
                source: { path: '项目/发布.md', line: 12 },
            },
        });
    });

    it('uses English notification text by default', () => {
        const task = new TaskBuilder().id('release-check').dueDate('2026-07-30 14:30:00').build();

        const plan = buildReminderPlan([task], { advanceMinutes: 15, generatedAt, timezone: 'Asia/Shanghai' });

        expect(plan.events[0].notification).toMatchObject({
            body: 'Due time: 2026-07-30 14:30:00 (15 minutes early)',
            presentation: {
                label: 'Due reminder',
                timeLabel: 'Due time',
                advanceLabel: '15 minutes early',
                priorityLabel: 'Normal priority',
            },
        });
    });

    it('limits programmatic reminder advance to 60 minutes', () => {
        const task = new TaskBuilder().id('release-check').dueDate('2026-07-30 14:30:00').build();

        const plan = buildReminderPlan([task], { advanceMinutes: 120, generatedAt, timezone: 'Asia/Shanghai' });

        expect(plan.advanceMinutes).toBe(60);
        expect(plan.events[0].triggerAt).toBe('2026-07-30T13:30:00.000Z');
    });

    it('excludes completed tasks and tasks without an ID', () => {
        const completed = new TaskBuilder().id('done').startDate('2026-07-30 13:30:00').status(Status.DONE).build();
        const missingId = new TaskBuilder().startDate('2026-07-30 13:30:00').build();

        const plan = buildReminderPlan([completed, missingId], {
            advanceMinutes: 0,
            generatedAt,
            timezone: 'Asia/Shanghai',
        });

        expect(plan.events).toEqual([]);
        expect(plan.summary.invalidTaskIdCount).toBe(1);
    });

    it('excludes every task sharing a duplicate ID', () => {
        const first = new TaskBuilder().id('duplicate').startDate('2026-07-30 13:30:00').build();
        const second = new TaskBuilder().id('duplicate').dueDate('2026-07-30 14:30:00').build();

        const plan = buildReminderPlan([first, second], { advanceMinutes: 0, generatedAt, timezone: 'Asia/Shanghai' });

        expect(plan.events).toEqual([]);
        expect(plan.summary.duplicateTaskIdCount).toBe(2);
    });

    it('excludes a reminder task when any unfinished task reuses its ID', () => {
        const dated = new TaskBuilder().id('shared-id').startDate('2026-07-30 13:30:00').build();
        const undated = new TaskBuilder().id('shared-id').build();

        const plan = buildReminderPlan([dated, undated], { advanceMinutes: 0, generatedAt, timezone: 'Asia/Shanghai' });

        expect(plan.events).toHaveLength(0);
        expect(plan.summary.duplicateTaskIdCount).toBe(1);
    });
});

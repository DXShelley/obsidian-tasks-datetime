/**
 * @jest-environment jsdom
 */

import moment from 'moment';
import { State } from '../../src/Obsidian/Cache';
import { ReminderPlanPublisher } from '../../src/Reminder/ReminderPlanPublisher';
import { TaskBuilder } from '../TestingTools/TaskBuilder';

window.moment = moment;

async function waitForQueuedWrite(): Promise<void> {
    await new Promise((resolve) => window.setTimeout(resolve));
}

describe('ReminderPlanPublisher', () => {
    it('publishes only warm cache updates using the configured advance minutes', async () => {
        const process = jest.fn().mockResolvedValue(undefined);
        const onCacheUpdate = jest.fn();
        const events = {
            onCacheUpdate: onCacheUpdate.mockImplementation((handler) => {
                events.handler = handler;
                return 'cache-event';
            }),
            off: jest.fn(),
            handler: undefined as any,
        };
        const publisher = new ReminderPlanPublisher({
            events: events as any,
            storage: { exists: jest.fn().mockResolvedValue(true), process, write: jest.fn() },
            getAdvanceMinutes: () => 10,
            now: () => '2026-07-29T10:00:00.000Z',
            timezone: () => 'Asia/Shanghai',
        });
        const task = new TaskBuilder().id('task-id').startDate('2026-07-30 13:30:00').build();

        publisher.start();
        events.handler({ tasks: [task], state: State.Initializing });
        await Promise.resolve();
        expect(process).not.toHaveBeenCalled();

        events.handler({ tasks: [task], state: State.Warm });
        await waitForQueuedWrite();

        expect(process).toHaveBeenCalledWith('plugins/tasks-datetime/reminder-plan.v1.json', expect.any(Function));
        expect(process.mock.calls[0][1]('{}')).toContain('2026-07-30T13:20:00.000Z');
        publisher.unload();
        expect(events.off).toHaveBeenCalledWith('cache-event');
    });

    it('publishes an empty snapshot when reminders are disabled', async () => {
        const process = jest.fn().mockResolvedValue(undefined);
        const publisher = new ReminderPlanPublisher({
            events: {} as any,
            storage: { exists: jest.fn().mockResolvedValue(true), process, write: jest.fn() },
            getAdvanceMinutes: () => 10,
            isEnabled: () => false,
            now: () => '2026-07-29T10:00:00.000Z',
            timezone: () => 'Asia/Shanghai',
        });
        const task = new TaskBuilder().id('task-id').startDate('2026-07-30 13:30:00').build();

        await publisher.publish([task]);

        expect(process).toHaveBeenCalledWith('plugins/tasks-datetime/reminder-plan.v1.json', expect.any(Function));
        expect(process.mock.calls[0][1]('{}')).toContain('"activeEventCount": 0');
    });

    it('does not create a reminder snapshot from cache updates while reminders are disabled', async () => {
        const process = jest.fn().mockResolvedValue(undefined);
        const onCacheUpdate = jest.fn();
        const events = {
            onCacheUpdate: onCacheUpdate.mockImplementation((handler) => {
                events.handler = handler;
                return 'cache-event';
            }),
            off: jest.fn(),
            handler: undefined as any,
        };
        const publisher = new ReminderPlanPublisher({
            events: events as any,
            storage: { exists: jest.fn().mockResolvedValue(true), process, write: jest.fn() },
            getAdvanceMinutes: () => 0,
            isEnabled: () => false,
        });

        publisher.start();
        events.handler({ tasks: [], state: State.Warm });
        await waitForQueuedWrite();

        expect(process).not.toHaveBeenCalled();
    });

    it('logs and absorbs write failures from safe publication', async () => {
        const error = new Error('storage unavailable');
        const publisher = new ReminderPlanPublisher({
            events: {} as any,
            storage: {
                exists: jest.fn().mockResolvedValue(true),
                process: jest.fn().mockRejectedValue(error),
                write: jest.fn(),
            },
            getAdvanceMinutes: () => 0,
        });
        const logger = (publisher as any).logger;
        const logError = jest.spyOn(logger, 'error');

        publisher.publishSafely([new TaskBuilder().id('task-id').startDate('2026-07-30 13:30:00').build()]);
        await waitForQueuedWrite();

        expect(logError).toHaveBeenCalledWith('Unable to publish reminder plan', error);
    });

    it('serialises writes so a newer plan cannot be overwritten by an older one', async () => {
        const callbacks: Array<(content: string) => string> = [];
        const resolvers: Array<() => void> = [];
        const process = jest.fn(
            (_path: string, callback: (content: string) => string) =>
                new Promise<void>((resolve) => {
                    callbacks.push(callback);
                    resolvers.push(resolve);
                }),
        );
        const publisher = new ReminderPlanPublisher({
            events: {} as any,
            storage: { exists: jest.fn().mockResolvedValue(true), process, write: jest.fn() },
            getAdvanceMinutes: () => 0,
            now: () => '2026-07-29T10:00:00.000Z',
            timezone: () => 'Asia/Shanghai',
        });
        const earlier = new TaskBuilder().id('earlier').startDate('2026-07-30 13:30:00').build();
        const later = new TaskBuilder().id('later').startDate('2026-07-30 14:30:00').build();

        const firstPublish = publisher.publish([earlier]);
        const secondPublish = publisher.publish([later]);
        await waitForQueuedWrite();
        expect(process).toHaveBeenCalledTimes(1);

        expect(callbacks[0]('{}')).toContain('"id": "task-start:earlier');
        resolvers[0]();
        await firstPublish;
        await waitForQueuedWrite();
        expect(process).toHaveBeenCalledTimes(2);
        expect(callbacks[1]('{}')).toContain('"id": "task-start:later');
        resolvers[1]();
        await Promise.all([firstPublish, secondPublish]);
    });

    it('does not write a queued plan after unload', async () => {
        const resolvers: Array<() => void> = [];
        const process = jest.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolvers.push(resolve);
                }),
        );
        const publisher = new ReminderPlanPublisher({
            events: { off: jest.fn() } as any,
            storage: { exists: jest.fn().mockResolvedValue(true), process, write: jest.fn() },
            getAdvanceMinutes: () => 0,
        });
        const first = publisher.publish([new TaskBuilder().id('first').startDate('2026-07-30 13:30:00').build()]);
        const queued = publisher.publish([new TaskBuilder().id('queued').startDate('2026-07-30 14:30:00').build()]);
        await waitForQueuedWrite();

        publisher.unload();
        resolvers[0]();
        await Promise.all([first, queued]);

        expect(process).toHaveBeenCalledTimes(1);
    });

    it('assigns a new snapshot ID to plans generated in the same millisecond', async () => {
        const callbacks: Array<(content: string) => string> = [];
        const process = jest.fn().mockImplementation((_path, callback) => {
            callbacks.push(callback);
            return Promise.resolve();
        });
        const publisher = new ReminderPlanPublisher({
            events: {} as any,
            storage: { exists: jest.fn().mockResolvedValue(true), process, write: jest.fn() },
            getAdvanceMinutes: () => 0,
            now: () => '2026-07-29T10:00:00.000Z',
        });

        await publisher.publish([new TaskBuilder().id('first').startDate('2026-07-30 13:30:00').build()]);
        await publisher.publish([new TaskBuilder().id('later').startDate('2026-07-30 14:30:00').build()]);

        expect(JSON.parse(callbacks[0]('{}')).snapshotId).not.toBe(JSON.parse(callbacks[1]('{}')).snapshotId);
    });
});

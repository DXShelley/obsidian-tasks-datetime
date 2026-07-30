/**
 * @jest-environment jsdom
 */

import { ReminderPlanWriter } from '../../src/Reminder/ReminderPlanWriter';
import type { ReminderPlan } from '../../src/Reminder/ReminderPlan';

const plan: ReminderPlan = {
    schemaVersion: 1,
    snapshotId: 'snapshot-1',
    generatedAt: '2026-07-30T05:30:00.000Z',
    timezone: 'Asia/Shanghai',
    producer: { name: 'tasks-datetime', version: '8.3.13' },
    advanceMinutes: 10,
    events: [],
    summary: {
        activeEventCount: 0,
        skippedMidnightDateCount: 0,
        invalidTaskIdCount: 0,
        duplicateTaskIdCount: 0,
    },
    diagnostics: [],
};

describe('ReminderPlanWriter', () => {
    it('writes an agent-readable JSON snapshot to the configured plan path', async () => {
        const exists = jest.fn().mockResolvedValue(true);
        const process = jest.fn().mockResolvedValue(undefined);
        const writer = new ReminderPlanWriter({ exists, process, write: jest.fn() });

        await writer.write(plan);

        expect(process).toHaveBeenCalledWith('plugins/tasks-datetime/reminder-plan.v1.json', expect.any(Function));
        expect(process.mock.calls[0][1]('{}')).toBe(JSON.stringify(plan, null, 2) + '\n');
    });

    it('creates the plan file when it does not exist yet', async () => {
        const exists = jest.fn().mockResolvedValue(false);
        const process = jest.fn();
        const write = jest.fn().mockResolvedValue(undefined);
        const writer = new ReminderPlanWriter({ exists, process, write });

        await writer.write(plan);

        expect(write).toHaveBeenCalledWith(
            'plugins/tasks-datetime/reminder-plan.v1.json',
            JSON.stringify(plan, null, 2) + '\n',
        );
        expect(process).not.toHaveBeenCalled();
    });
});

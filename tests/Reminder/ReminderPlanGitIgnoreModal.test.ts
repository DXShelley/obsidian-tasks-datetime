/**
 * @jest-environment jsdom
 */

import type { App } from 'obsidian';
import { ReminderPlanGitIgnoreModal } from '../../src/Reminder/ReminderPlanGitIgnoreModal';
import type { ReminderPlanGitIgnoreStorage } from '../../src/Reminder/ReminderPlanGitIgnore';

jest.mock('obsidian');

function createModal(storage: ReminderPlanGitIgnoreStorage) {
    const onAccepted = jest.fn();
    const onCancelled = jest.fn();
    const modal = new ReminderPlanGitIgnoreModal({} as App, storage, 'reminder-plan.v1.json', onAccepted, onCancelled);
    (modal as any).contentEl = { empty: jest.fn() };
    return { modal, onAccepted, onCancelled };
}

describe('ReminderPlanGitIgnoreModal', () => {
    it('does not enable reminders when the dialog is cancelled', () => {
        const storage: ReminderPlanGitIgnoreStorage = {
            exists: jest.fn(),
            process: jest.fn(),
            create: jest.fn(),
        };
        const { modal, onAccepted, onCancelled } = createModal(storage);

        modal.onClose();

        expect(onAccepted).not.toHaveBeenCalled();
        expect(onCancelled).toHaveBeenCalledTimes(1);
        expect(storage.exists).not.toHaveBeenCalled();
        expect(storage.process).not.toHaveBeenCalled();
        expect(storage.create).not.toHaveBeenCalled();
    });

    it('enables reminders only after adding the ignore rule', async () => {
        const { modal, onAccepted, onCancelled } = createModal({
            exists: jest.fn(async (path: string) => path === '.git'),
            process: jest.fn(),
            create: jest.fn().mockResolvedValue(undefined),
        });

        await (modal as any).confirm();
        modal.onClose();

        expect(onAccepted).toHaveBeenCalledTimes(1);
        expect(onCancelled).not.toHaveBeenCalled();
    });

    it('does not enable reminders when adding the ignore rule fails', async () => {
        const { modal, onAccepted, onCancelled } = createModal({
            exists: jest.fn().mockRejectedValue(new Error('storage unavailable')),
            process: jest.fn(),
            create: jest.fn(),
        });

        await (modal as any).confirm();
        modal.onClose();

        expect(onAccepted).not.toHaveBeenCalled();
        expect(onCancelled).toHaveBeenCalledTimes(1);
    });

    it('does not accept the dialog when saving the reminder setting fails', async () => {
        const enableReminders = jest.fn().mockRejectedValue(new Error('settings unavailable'));
        const onCancelled = jest.fn();
        const modal = new ReminderPlanGitIgnoreModal(
            {} as App,
            {
                exists: jest.fn(async (path: string) => path === '.git'),
                process: jest.fn(),
                create: jest.fn().mockResolvedValue(undefined),
            },
            'reminder-plan.v1.json',
            enableReminders,
            onCancelled,
        );
        (modal as any).contentEl = { empty: jest.fn() };

        await (modal as any).confirm();
        modal.onClose();

        expect(enableReminders).toHaveBeenCalledTimes(1);
        expect(onCancelled).toHaveBeenCalledTimes(1);
    });
});

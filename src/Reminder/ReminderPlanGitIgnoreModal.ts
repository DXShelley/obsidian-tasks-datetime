import { type App, Modal, Notice, Setting } from 'obsidian';
import { i18n } from '../i18n/i18n';
import { logging } from '../lib/logging';
import { type ReminderPlanGitIgnoreStorage, ensureReminderPlanIsGitIgnored } from './ReminderPlanGitIgnore';

export class ReminderPlanGitIgnoreModal extends Modal {
    private accepted = false;

    constructor(
        app: App,
        private readonly storage: ReminderPlanGitIgnoreStorage,
        private readonly reminderPlanPath: string,
        private readonly onAccepted: () => void | Promise<void>,
        private readonly onCancelled: () => void,
    ) {
        super(app);
    }

    public onOpen(): void {
        this.titleEl.setText(i18n.t('settings.reminders.gitIgnore.confirmation.title'));
        this.contentEl.createEl('p', {
            text: i18n.t('settings.reminders.gitIgnore.confirmation.description'),
        });

        new Setting(this.contentEl)
            .addButton((button) => {
                button
                    .setButtonText(i18n.t('settings.reminders.gitIgnore.button'))
                    .setCta()
                    .onClick(() => void this.confirm());
            })
            .addButton((button) => {
                button.setButtonText(i18n.t('ui.common.cancel')).onClick(() => this.close());
            });
    }

    public onClose(): void {
        this.contentEl.empty();
        if (this.accepted) {
            return;
        } else {
            this.onCancelled();
        }
    }

    private async confirm(): Promise<void> {
        try {
            const result = await ensureReminderPlanIsGitIgnored(this.storage, this.reminderPlanPath);
            if (result === 'unavailable') {
                new Notice(i18n.t('settings.reminders.gitIgnore.notices.unavailable'));
                return;
            }

            await this.onAccepted();
            this.accepted = true;
            new Notice(i18n.t(`settings.reminders.gitIgnore.notices.${result}`));
        } catch (error) {
            logging.getLogger('tasks.Reminder').error('Unable to enable reminders with a local Git ignore rule', error);
            new Notice(i18n.t('settings.reminders.gitIgnore.notices.enableFailed'));
        } finally {
            this.close();
        }
    }
}

import { type App, Modal } from 'obsidian';
import type { Task } from '../Task/Task';
import { completionStats } from '../Dashboard/DashboardStats';
import { i18n } from '../i18n/i18n';

export class TaskDashboardModal extends Modal {
    constructor(app: App, private readonly tasks: Task[]) {
        super(app);
    }

    onOpen() {
        this.modalEl.addClass('tasks-dashboard-modal');
        this.titleEl.setText(i18n.t('ui.dashboard.title'));
        const stats = completionStats(this.tasks);
        const grid = this.contentEl.createDiv({ cls: 'tasks-dashboard-grid' });
        for (const stat of stats) {
            const card = grid.createDiv({ cls: 'tasks-dashboard-period' });
            card.createEl('h3', { text: i18n.t(`ui.dashboard.periods.${stat.label}`) });
            const ring = card.createDiv({ cls: 'tasks-dashboard-ring' });
            ring.setCssProps({ '--tasks-completion': `${stat.percentage}%` });
            ring.setText(`${stat.percentage}%`);
            card.createDiv({
                text: i18n.t('ui.dashboard.caption', { completed: stat.completed, planned: stat.planned }),
                cls: 'tasks-dashboard-caption',
            });
        }
    }
}

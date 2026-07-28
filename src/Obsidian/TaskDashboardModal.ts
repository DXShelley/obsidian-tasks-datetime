import { type App, Modal, TFile } from 'obsidian';
import { type DashboardAction, completionStats, dashboardActions, todayOverview } from '../Dashboard/DashboardStats';
import { formatTaskDate } from '../DateTime/DateTools';
import type { Task } from '../Task/Task';
import { i18n } from '../i18n/i18n';
import { replaceTaskWithTasks } from './File';

export class TaskDashboardModal extends Modal {
    constructor(app: App, private tasks: Task[]) {
        super(app);
    }

    onOpen() {
        this.modalEl.addClass('tasks-dashboard-modal');
        this.titleEl.setText(i18n.t('ui.dashboard.title'));
        this.render();
    }

    private render() {
        this.contentEl.empty();
        this.renderOverview();
        this.renderPeriods();
        this.renderActions();
    }

    private renderOverview() {
        const overview = todayOverview(this.tasks);
        const overviewEl = this.contentEl.createDiv({ cls: 'tasks-dashboard-overview' });
        const values = [
            ['completed', overview.completed],
            ['dueToday', overview.dueToday],
            ['overdue', overview.overdue],
            ['completionRate', `${overview.completionPercentage}%`],
        ] as const;
        for (const [label, value] of values) {
            const metric = overviewEl.createDiv({ cls: 'tasks-dashboard-metric' });
            metric.createDiv({ text: String(value), cls: 'tasks-dashboard-metric-value' });
            metric.createDiv({ text: i18n.t(`ui.dashboard.metrics.${label}`), cls: 'tasks-dashboard-metric-label' });
        }
    }

    private renderPeriods() {
        const grid = this.contentEl.createDiv({ cls: 'tasks-dashboard-grid' });
        for (const stat of completionStats(this.tasks)) {
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

    private renderActions() {
        const actions = this.contentEl.createDiv({ cls: 'tasks-dashboard-actions' });
        for (const action of dashboardActions(this.tasks)) {
            const section = actions.createDiv({ cls: 'tasks-dashboard-action-group' });
            section.createEl('h3', { text: i18n.t(`ui.dashboard.actions.${action.group}`) });
            const list = section.createEl('ul', { cls: 'tasks-dashboard-action-list' });
            if (action.tasks.length === 0) {
                list.createEl('li', { text: i18n.t('ui.dashboard.empty'), cls: 'tasks-dashboard-empty' });
                continue;
            }
            for (const task of action.tasks) {
                this.renderActionTask(list, task, action);
            }
        }
    }

    private renderActionTask(list: HTMLUListElement, task: Task, action: DashboardAction) {
        const item = list.createEl('li', { cls: 'tasks-dashboard-task' });
        const checkbox = item.createEl('input', { type: 'checkbox', cls: 'task-list-item-checkbox' });
        checkbox.setAttribute(
            'aria-label',
            i18n.t('ui.dashboard.completeTask', { description: task.descriptionWithoutTags }),
        );
        checkbox.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            checkbox.disabled = true;
            const replacements = task.toggleWithRecurrenceInUsersOrder();
            try {
                const saved = await replaceTaskWithTasks({ originalTask: task, newTasks: replacements });
                if (!saved) {
                    return;
                }
                this.tasks = [...this.tasks.filter((existingTask) => existingTask !== task), ...replacements];
                this.render();
            } finally {
                checkbox.disabled = false;
            }
        });

        const button = item.createEl('button', { text: task.descriptionWithoutTags, cls: 'tasks-dashboard-task-link' });
        button.addEventListener('click', async () => await this.openTask(task));
        const metadata = item.createSpan({ cls: 'tasks-dashboard-task-metadata' });
        if (task.dueDate) {
            metadata.setText(formatTaskDate(task.dueDate));
        } else if (action.group === 'highPriority') {
            metadata.setText(task.priorityName);
        }
    }

    private async openTask(task: Task) {
        const file = this.app.vault.getAbstractFileByPath(task.path);
        if (file instanceof TFile) {
            await this.app.workspace.getLeaf(false).openFile(file, { eState: { line: task.taskLocation.lineNumber } });
            this.close();
        }
    }
}

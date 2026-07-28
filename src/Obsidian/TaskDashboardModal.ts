import { type App, type EventRef, Modal, TFile, setIcon } from 'obsidian';
import {
    type TaskReplacement,
    changeTasksStatus,
    postponeTasks,
    reprioritiseTasksByQuadrant,
    saveTaskReplacements,
    updateTaskListAfterBulkEdit,
} from '../Dashboard/DashboardBulkActions';
import {
    type DashboardFilter,
    DashboardViewStore,
    defaultDashboardFilter,
    filterDashboardTasks,
} from '../Dashboard/DashboardFilters';
import {
    type DashboardRangeDays,
    type PlanView,
    averageCompletionDays,
    completionRateForRange,
    formatProgressDayTooltip,
    plannedTasks,
    progressDayTasks,
    progressTrend,
} from '../Dashboard/DashboardInsights';
import { dashboardActions, todayOverview } from '../Dashboard/DashboardStats';
import { formatTaskDate } from '../DateTime/DateTools';
import { Status } from '../Statuses/Status';
import { Priority } from '../Task/Priority';
import { type PriorityQuadrant, priorityQuadrantFromText, priorityQuadrantIcons } from '../Task/PriorityQuadrant';
import { Task } from '../Task/Task';
import { i18n } from '../i18n/i18n';
import { replaceTaskWithTasks } from './File';

export class TaskDashboardModal extends Modal {
    private filter: DashboardFilter = defaultDashboardFilter();
    private rangeDays: DashboardRangeDays = 7;
    private planView: PlanView = 'day';
    private filtersOpen = false;
    private activeSavedViewId: string | null = null;
    private expandedTaskGroups = new Set<string>();
    private drilldown: { title: string; tasks: Task[] } | null = null;
    private selectedTasks = new Set<Task>();
    private refreshTimer: number | undefined;
    private initialRenderTimer: number | undefined;
    private vaultEvents: EventRef[] = [];
    private refreshedAt = window.moment();

    constructor(app: App, private readonly getTasks: () => Task[], private readonly viewStore: DashboardViewStore) {
        super(app);
    }

    onOpen() {
        this.modalEl.addClass('tasks-dashboard-modal');
        this.titleEl.setText(i18n.t('ui.dashboard.title'));
        this.vaultEvents = [
            this.app.vault.on('modify', () => this.scheduleRefresh()),
            this.app.vault.on('create', () => this.scheduleRefresh()),
            this.app.vault.on('delete', () => this.scheduleRefresh()),
            this.app.vault.on('rename', () => this.scheduleRefresh()),
        ];
        this.renderLoading();
        this.initialRenderTimer = window.setTimeout(() => {
            this.initialRenderTimer = undefined;
            this.render();
        }, 0);
    }

    onClose() {
        if (this.refreshTimer !== undefined) {
            window.clearTimeout(this.refreshTimer);
        }
        if (this.initialRenderTimer !== undefined) {
            window.clearTimeout(this.initialRenderTimer);
        }
        this.vaultEvents.forEach((event) => this.app.vault.offref(event));
        this.vaultEvents = [];
        this.contentEl.empty();
    }

    private scheduleRefresh() {
        if (this.refreshTimer !== undefined) {
            window.clearTimeout(this.refreshTimer);
        }
        this.refreshTimer = window.setTimeout(() => {
            this.refreshedAt = window.moment();
            this.selectedTasks.clear();
            this.render();
        }, 150);
    }

    private render() {
        this.contentEl.empty();
        const allTasks = this.getTasks();
        const tasks = filterDashboardTasks(allTasks, this.filter);
        const top = this.contentEl.createDiv({ cls: 'tasks-dashboard-top' });
        this.renderToolbar(top, allTasks);
        this.renderAnalysisColumn(top, tasks);
        this.renderKpis(tasks);
        this.renderRiskColumn(this.contentEl, tasks);
        this.renderPlan(tasks);
        this.renderDrilldown();
        this.contentEl.createDiv({
            text: i18n.t('ui.dashboard.refreshed', { time: this.refreshedAt.format('HH:mm:ss') }),
            cls: 'tasks-dashboard-refreshed',
        });
    }

    private renderLoading() {
        this.contentEl.empty();
        this.contentEl.createDiv({ cls: 'tasks-dashboard-loading', text: i18n.t('ui.dashboardLoading') });
    }

    private renderToolbar(parent: HTMLElement, allTasks: Task[]) {
        const toolbar = parent.createDiv({ cls: 'tasks-dashboard-toolbar' });
        const filters = toolbar.createEl('details', { cls: 'tasks-dashboard-filter-menu' });
        filters.open = this.filtersOpen;
        filters.addEventListener('toggle', () => {
            this.filtersOpen = filters.open;
        });
        filters.createEl('summary', { text: i18n.t('ui.dashboard.filters.title') });
        const fields = filters.createDiv({ cls: 'tasks-dashboard-filter-fields' });
        this.createSelect(fields, 'timeRange', ['all', 'today', 'week', 'month'], this.filter.timeRange, (value) => {
            this.filter.timeRange = value as DashboardFilter['timeRange'];
        });
        this.createFilterSelect(
            fields,
            'folders',
            [...new Set(allTasks.map((task) => task.path.split('/')[0]))],
            this.filter.folders,
        );
        this.createFilterSelect(fields, 'tags', [...new Set(allTasks.flatMap((task) => task.tags))], this.filter.tags);
        this.createFilterSelect(
            fields,
            'statuses',
            [...new Set(allTasks.map((task) => task.status.type))],
            this.filter.statuses,
            (value) => this.statusLabel(value),
        );
        this.createPrioritySelect(fields);
        this.createSelect(
            fields,
            'taskProperty',
            ['any', 'dated', 'undated', 'recurring', 'blocked'],
            this.filter.taskProperty,
            (value) => {
                this.filter.taskProperty = value as DashboardFilter['taskProperty'];
            },
        );
        this.createInput(fields, 'frontmatterProperty', this.filter.frontmatterProperty);
        this.createInput(fields, 'frontmatterValue', this.filter.frontmatterValue);
        const actions = filters.createDiv({ cls: 'tasks-dashboard-toolbar-actions' });
        actions.createEl('button', { text: i18n.t('ui.dashboard.resetFilters') }).addEventListener('click', () => {
            this.filter = defaultDashboardFilter();
            this.drilldown = null;
            this.render();
        });

        const saved = actions.createEl('select', { attr: { 'aria-label': i18n.t('ui.dashboard.savedViews') } });
        saved.createEl('option', { text: i18n.t('ui.dashboard.savedViews'), value: '' });
        for (const view of this.viewStore.all()) {
            saved.createEl('option', { text: view.name, value: view.id });
        }
        saved.value = this.activeSavedViewId ?? '';
        const removeSaved = actions.createEl('button', {
            cls: 'clickable-icon',
            attr: { 'aria-label': i18n.t('ui.common.delete'), title: i18n.t('ui.common.delete') },
        });
        setIcon(removeSaved, 'trash-2');
        removeSaved.disabled = saved.value === '';
        saved.addEventListener('change', () => {
            const view = this.viewStore.all().find((item) => item.id === saved.value);
            if (view) {
                this.activeSavedViewId = view.id;
                this.filter = { ...view.filter };
                this.render();
            } else {
                this.activeSavedViewId = null;
                removeSaved.disabled = true;
            }
        });
        removeSaved.addEventListener('click', async () => {
            const view = this.viewStore.all().find((item) => item.id === saved.value);
            if (view === undefined) return;
            await this.viewStore.remove(view.id);
            this.activeSavedViewId = null;
            this.render();
        });
        const viewName = actions.createEl('input', {
            type: 'text',
            attr: { placeholder: i18n.t('ui.dashboard.viewName'), 'aria-label': i18n.t('ui.dashboard.viewName') },
        });
        let isSavingView = false;
        const saveView = async () => {
            const name = viewName.value.trim();
            if (name === '' || isSavingView) return;
            isSavingView = true;
            viewName.disabled = true;
            const existing = this.viewStore.all().find((view) => view.name === name);
            const id = existing?.id ?? `${Date.now()}`;
            await this.viewStore.save({ id, name, filter: { ...this.filter } });
            this.activeSavedViewId = id;
            this.render();
        };
        viewName.addEventListener('change', () => void saveView());
        viewName.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                void saveView();
            }
        });
    }

    private createSelect(
        parent: HTMLElement,
        label: string,
        values: string[],
        selected: string,
        onChange: (value: string) => void,
    ) {
        const field = parent.createEl('label', { cls: 'tasks-dashboard-filter-field' });
        field.createSpan({ text: i18n.t(`ui.dashboard.filters.${label}`) });
        const select = field.createEl('select', { attr: { 'aria-label': i18n.t(`ui.dashboard.filters.${label}`) } });
        values.forEach((value) =>
            select.createEl('option', { value, text: i18n.t(`ui.dashboard.filterOptions.${value}`) }),
        );
        select.value = selected;
        select.addEventListener('change', () => {
            onChange(select.value);
            this.render();
        });
    }

    private createFilterSelect(
        parent: HTMLElement,
        field: 'folders' | 'tags' | 'statuses' | 'priorities',
        values: string[],
        selected: string[],
        displayValue: (value: string) => string = (value) => value,
    ) {
        const filterField = parent.createEl('label', { cls: 'tasks-dashboard-filter-field' });
        filterField.createSpan({ text: i18n.t(`ui.dashboard.filters.${field}`) });
        const select = filterField.createEl('select', {
            attr: { 'aria-label': i18n.t(`ui.dashboard.filters.${field}`) },
        });
        select.createEl('option', { value: '', text: i18n.t('ui.dashboard.filterOptions.all') });
        values.sort().forEach((value) => {
            select.createEl('option', { value, text: displayValue(value) });
        });
        select.value = selected[0] ?? '';
        select.addEventListener('change', () => {
            this.filter[field] = (select.value === '' ? [] : [select.value]) as never;
            this.render();
        });
    }

    private createPrioritySelect(parent: HTMLElement) {
        const field = parent.createEl('label', { cls: 'tasks-dashboard-filter-field' });
        field.createSpan({ text: i18n.t('ui.dashboard.filters.priorities') });
        const select = field.createEl('select', { attr: { 'aria-label': i18n.t('ui.dashboard.filters.priorities') } });
        select.createEl('option', { value: '', text: i18n.t('ui.dashboard.filterOptions.all') });
        const legacy = select.createEl('optgroup', { attr: { label: i18n.t('ui.dashboard.priorityGroups.legacy') } });
        Object.values(Priority).forEach((priority) => {
            legacy.createEl('option', { value: priority, text: i18n.t(`ui.dashboard.priorities.${priority}`) });
        });
        const quadrants = select.createEl('optgroup', {
            attr: { label: i18n.t('ui.dashboard.priorityGroups.quadrants') },
        });
        (['IU', 'IN', 'NU', 'NN'] as const).forEach((quadrant) => {
            quadrants.createEl('option', {
                value: `quadrant:${quadrant}`,
                text: this.priorityQuadrantLabel(quadrant),
            });
        });
        select.value = this.filter.priorities[0] ?? '';
        select.addEventListener('change', () => {
            this.filter.priorities = select.value === '' ? [] : [select.value as DashboardFilter['priorities'][number]];
            this.render();
        });
    }

    private statusLabel(statusType: string): string {
        const key = `ui.dashboard.statuses.${statusType}`;
        return i18n.exists(key) ? i18n.t(key) : statusType;
    }

    private createInput(parent: HTMLElement, field: 'frontmatterProperty' | 'frontmatterValue', value: string) {
        const filterField = parent.createEl('label', { cls: 'tasks-dashboard-filter-field' });
        filterField.createSpan({ text: i18n.t(`ui.dashboard.filters.${field}`) });
        const input = filterField.createEl('input', {
            attr: {
                'aria-label': i18n.t(`ui.dashboard.filters.${field}`),
                placeholder: i18n.t(`ui.dashboard.filters.${field}`),
            },
            type: 'search',
            value,
        });
        input.addEventListener('change', () => {
            this.filter[field] = input.value;
            this.render();
        });
    }

    private renderKpis(tasks: Task[]) {
        const overview = todayOverview(tasks);
        const completionRate = completionRateForRange(tasks, this.rangeDays);
        const kpis = this.contentEl.createDiv({ cls: 'tasks-dashboard-kpis' });
        const metrics: Array<[string | number, Task[], string]> = [
            [
                overview.completed,
                tasks.filter((task) => task.doneDate?.isSame(window.moment(), 'day')),
                i18n.t('ui.dashboard.metrics.completed'),
            ],
            [
                overview.dueToday,
                tasks.filter((task) => task.dueDate?.isSame(window.moment(), 'day') && !task.isDone),
                i18n.t('ui.dashboard.metrics.dueToday'),
            ],
            [overview.overdue, dashboardActions(tasks)[0].tasks, i18n.t('ui.dashboard.metrics.overdue')],
            [
                `${completionRate.percentage}%`,
                completionRate.tasks,
                i18n.t('ui.dashboardCompletionRateRange', { days: this.rangeDays }),
            ],
            [
                averageCompletionDays(tasks) ?? '-',
                tasks.filter((task) => task.doneDate !== null),
                i18n.t('ui.dashboard.metrics.averageCycle'),
            ],
        ];
        for (const [value, metricTasks, labelText] of metrics) {
            const button = kpis.createEl('button', { cls: 'tasks-dashboard-kpi' });
            button.createDiv({ text: String(value), cls: 'tasks-dashboard-kpi-value' });
            button.createDiv({ text: labelText, cls: 'tasks-dashboard-kpi-label' });
            button.addEventListener('click', () => this.showDrill(labelText, metricTasks));
        }
    }

    private renderRiskColumn(parent: HTMLElement, tasks: Task[]) {
        const column = parent.createDiv({ cls: 'tasks-dashboard-risk' });
        column.createEl('h3', { text: i18n.t('ui.dashboard.risks') });
        for (const action of dashboardActions(tasks)) {
            this.renderTaskGroup(column, i18n.t(`ui.dashboard.actions.${action.group}`), action.tasks);
        }
    }

    private renderAnalysisColumn(parent: HTMLElement, tasks: Task[]) {
        const column = parent.createDiv({ cls: 'tasks-dashboard-analysis' });
        const header = column.createDiv({ cls: 'tasks-dashboard-panel-header' });
        header.createEl('h3', { text: i18n.t('ui.dashboard.progress') });
        for (const range of [7, 30] as const) {
            const button = header.createEl('button', {
                text: i18n.t('ui.dashboard.trendRange', { days: range }),
                cls: this.rangeDays === range ? 'is-active' : '',
            });
            button.addEventListener('click', () => {
                this.rangeDays = range;
                this.render();
            });
        }
        const trend = progressTrend(tasks, this.rangeDays);
        const maximum = Math.max(
            1,
            ...trend.flatMap((day) => [day.completed, day.planned, day.overdue, Math.abs(day.netAdded)]),
        );
        const legend = column.createDiv({ cls: 'tasks-dashboard-trend-legend' });
        for (const key of ['completed', 'planned', 'overdue', 'netAdded'] as const) {
            const item = legend.createSpan({ cls: 'tasks-dashboard-trend-legend-item' });
            item.createSpan({
                cls: `tasks-dashboard-trend-legend-swatch tasks-dashboard-bar-${key}`,
            });
            item.createSpan({
                text: key === 'netAdded' ? i18n.t('ui.dashboardNetAdded') : i18n.t(`ui.dashboard.trendLegend.${key}`),
            });
        }
        const chartScroller = column.createDiv({ cls: 'tasks-dashboard-trend-scroll' });
        const chart = chartScroller.createDiv({
            cls: 'tasks-dashboard-trend',
            attr: { role: 'img', 'aria-label': i18n.t('ui.dashboard.progress') },
        });
        const tooltip = this.contentEl.createDiv({
            cls: 'tasks-dashboard-trend-tooltip',
            attr: { 'aria-hidden': 'true', id: 'tasks-dashboard-trend-tooltip', role: 'tooltip' },
        });
        chart.setCssProps({
            '--tasks-dashboard-days': String(this.rangeDays),
            '--tasks-dashboard-min-width': `${this.rangeDays * 26}px`,
        });
        for (const day of trend) {
            const tooltipText = formatProgressDayTooltip(day, {
                completed: i18n.t('ui.dashboard.trendLegend.completed'),
                planned: i18n.t('ui.dashboard.trendLegend.planned'),
                overdue: i18n.t('ui.dashboard.trendLegend.overdue'),
                netAdded: i18n.t('ui.dashboardNetAdded'),
            });
            const dayButton = chart.createEl('button', {
                cls: 'tasks-dashboard-trend-day',
                attr: {
                    'aria-describedby': tooltip.id,
                },
            });
            dayButton.removeAttribute('title');
            for (const [key, value] of Object.entries({
                completed: day.completed,
                planned: day.planned,
                overdue: day.overdue,
                netAdded: day.netAdded,
            })) {
                dayButton.createDiv({
                    cls: `tasks-dashboard-bar tasks-dashboard-bar-${key}${value < 0 ? ' is-negative' : ''}`,
                    attr: { style: `height: ${Math.max(3, (Math.abs(value) / maximum) * 100)}%` },
                });
            }
            const label = this.rangeDays === 30 ? String(Number.parseInt(day.date.slice(-2))) : day.date.slice(5);
            dayButton.createSpan({ text: label, cls: 'tasks-dashboard-trend-label' });
            dayButton.addEventListener('mouseenter', (event) => {
                this.showTrendTooltip(tooltip, tooltipText, { x: event.clientX, y: event.clientY });
            });
            dayButton.addEventListener('mousemove', (event) => {
                this.showTrendTooltip(tooltip, tooltipText, { x: event.clientX, y: event.clientY });
            });
            dayButton.addEventListener('mouseleave', () => this.hideTrendTooltip(tooltip));
            dayButton.addEventListener('focus', () => {
                const bounds = dayButton.getBoundingClientRect();
                this.showTrendTooltip(tooltip, tooltipText, { x: bounds.left + bounds.width / 2, y: bounds.top });
            });
            dayButton.addEventListener('blur', () => this.hideTrendTooltip(tooltip));
            dayButton.addEventListener('click', () => {
                this.showDrill(day.date, progressDayTasks(tasks, window.moment(day.date)));
            });
        }
    }

    private showTrendTooltip(tooltip: HTMLElement, text: string, position: { x: number; y: number }) {
        tooltip.textContent = text;
        tooltip.classList.add('is-visible');
        tooltip.setAttribute('aria-hidden', 'false');
        tooltip.style.left = `${Math.max(8, Math.min(position.x + 14, window.innerWidth - 264))}px`;
        tooltip.style.top = `${Math.max(8, Math.min(position.y + 14, window.innerHeight - 132))}px`;
    }

    private hideTrendTooltip(tooltip: HTMLElement) {
        tooltip.classList.remove('is-visible');
        tooltip.setAttribute('aria-hidden', 'true');
    }

    private renderPlan(tasks: Task[]) {
        const section = this.contentEl.createDiv({ cls: 'tasks-dashboard-plan' });
        const header = section.createDiv({ cls: 'tasks-dashboard-panel-header' });
        header.createEl('h3', { text: i18n.t('ui.dashboard.plan') });
        for (const view of ['day', 'week'] as const) {
            const button = header.createEl('button', {
                text: i18n.t(`ui.dashboard.planViews.${view}`),
                cls: this.planView === view ? 'is-active' : '',
            });
            button.addEventListener('click', () => {
                this.planView = view;
                this.render();
            });
        }
        const grouped = new Map<string, Task[]>();
        for (const item of plannedTasks(tasks, this.planView)) {
            const key = item.date.format('YYYY-MM-DD');
            grouped.set(key, [...(grouped.get(key) ?? []), item.task]);
        }
        for (const [date, planTasks] of grouped) {
            this.renderTaskGroup(section, date, planTasks);
        }
        if (grouped.size === 0) section.createDiv({ text: i18n.t('ui.dashboard.empty'), cls: 'tasks-dashboard-empty' });
    }

    private renderTaskGroup(parent: HTMLElement, title: string, tasks: Task[]) {
        const group = parent.createEl('details', { cls: 'tasks-dashboard-task-group' });
        group.open = this.expandedTaskGroups.has(title);
        group.addEventListener('toggle', () => {
            if (group.open) this.expandedTaskGroups.add(title);
            else this.expandedTaskGroups.delete(title);
        });
        group.createEl('summary', {
            text: `${title} (${tasks.length})`,
            cls: 'tasks-dashboard-group-heading',
        });
        const list = group.createEl('ul', { cls: 'tasks-dashboard-action-list' });
        for (const task of tasks) this.renderTask(list, task);
    }

    private renderTask(list: HTMLUListElement, task: Task) {
        const item = list.createEl('li', { cls: 'tasks-dashboard-task' });
        const complete = item.createEl('input', { type: 'checkbox', cls: 'task-list-item-checkbox' });
        complete.setAttribute(
            'aria-label',
            i18n.t('ui.dashboard.completeTask', { description: task.descriptionWithoutTags }),
        );
        complete.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            complete.disabled = true;
            await replaceTaskWithTasks({ originalTask: task, newTasks: task.toggleWithRecurrenceInUsersOrder() });
            this.scheduleRefresh();
        });
        const button = item.createEl('button', { text: task.descriptionWithoutTags, cls: 'tasks-dashboard-task-link' });
        button.addEventListener('click', async () => await this.openTask(task));
        const metadata = item.createSpan({ cls: 'tasks-dashboard-task-metadata' });
        metadata.setText(task.dueDate ? formatTaskDate(task.dueDate) : this.priorityLabel(task));
    }

    private showDrill(title: string, tasks: Task[]) {
        this.drilldown = { title, tasks };
        this.selectedTasks.clear();
        this.render();
    }

    private renderDrilldown() {
        if (this.drilldown === null) return;
        const section = this.contentEl.createDiv({ cls: 'tasks-dashboard-drilldown' });
        const header = section.createDiv({ cls: 'tasks-dashboard-panel-header' });
        header.createEl('h3', { text: `${this.drilldown.title} (${this.drilldown.tasks.length})` });
        header.createEl('button', { text: i18n.t('ui.dashboard.closeDrill') }).addEventListener('click', () => {
            this.drilldown = null;
            this.render();
        });
        this.renderBulkControls(section);
        const list = section.createEl('ul', { cls: 'tasks-dashboard-drill-list' });
        for (const task of this.drilldown.tasks) {
            const item = list.createEl('li', { cls: 'tasks-dashboard-drill-task' });
            const selected = item.createEl('input', {
                type: 'checkbox',
                cls: 'tasks-dashboard-select-checkbox',
                attr: { 'aria-label': i18n.t('ui.dashboard.selected', { count: 1 }) },
            });
            selected.checked = this.selectedTasks.has(task);
            item.toggleClass('is-selected', selected.checked);
            selected.addEventListener('change', () => {
                if (selected.checked) this.selectedTasks.add(task);
                else this.selectedTasks.delete(task);
                item.toggleClass('is-selected', selected.checked);
                this.renderBulkControls(section);
            });
            const button = item.createEl('button', {
                text: task.descriptionWithoutTags,
                cls: 'tasks-dashboard-task-link',
            });
            button.addEventListener('click', async () => await this.openTask(task));
            item.createSpan({
                text: task.dueDate ? formatTaskDate(task.dueDate) : this.priorityLabel(task),
                cls: 'tasks-dashboard-task-metadata',
            });
        }
    }

    private renderBulkControls(section: HTMLElement) {
        section.querySelector('.tasks-dashboard-bulk')?.remove();
        const controls = section.createDiv({ cls: 'tasks-dashboard-bulk' });
        const list = section.querySelector('.tasks-dashboard-drill-list');
        if (list) section.insertBefore(controls, list);
        const selected = [...this.selectedTasks];
        controls.createSpan({ text: i18n.t('ui.dashboard.selected', { count: selected.length }) });
        const postponeDays = controls.createEl('select', { attr: { 'aria-label': i18n.t('ui.dashboard.postpone') } });
        postponeDays.createEl('option', { value: '', text: i18n.t('ui.dashboard.postpone') });
        for (const days of [1, 2, 3, 5, 7, 10]) {
            postponeDays.createEl('option', {
                value: String(days),
                text: i18n.t('ui.dashboard.postponeDays', { days }),
            });
        }
        postponeDays.disabled = selected.length === 0;
        postponeDays.addEventListener('change', async () => {
            if (postponeDays.value === '') return;
            postponeDays.disabled = true;
            await this.applySelectedTasks((tasks) => postponeTasks(tasks, Number.parseInt(postponeDays.value)));
        });
        const priority = controls.createEl('select', {
            attr: { 'aria-label': i18n.t('ui.dashboard.filters.priorities') },
        });
        priority.createEl('option', { value: '', text: i18n.t('ui.dashboard.filters.priorities') });
        (['IU', 'IN', 'NU', 'NN'] as const).forEach((quadrant) =>
            priority.createEl('option', {
                value: quadrant,
                text: `${priorityQuadrantIcons[quadrant]} ${this.priorityQuadrantLabel(quadrant)}`,
            }),
        );
        priority.disabled = selected.length === 0;
        priority.addEventListener('change', async () => {
            if (priority.value === '') return;
            priority.disabled = true;
            await this.applySelectedTasks((tasks) =>
                reprioritiseTasksByQuadrant(tasks, priority.value as PriorityQuadrant),
            );
        });
        const statuses = [...new Map(this.getTasks().map((task) => [task.status.name, task.status])).values()];
        const status = controls.createEl('select', { attr: { 'aria-label': i18n.t('ui.dashboard.filters.statuses') } });
        status.createEl('option', { value: '', text: i18n.t('ui.dashboard.filters.statuses') });
        statuses.forEach((value) =>
            status.createEl('option', { value: value.name, text: this.statusLabel(value.type) }),
        );
        status.disabled = selected.length === 0;
        status.addEventListener('change', async () => {
            if (status.value === '') return;
            status.disabled = true;
            const nextStatus = statuses.find((candidate) => candidate.name === status.value) ?? Status.DONE;
            await this.applySelectedTasks((tasks) => changeTasksStatus(tasks, nextStatus, window.moment()));
        });
    }

    private async applySelectedTasks(createReplacements: (tasks: Task[]) => TaskReplacement[]) {
        const selectedTasks = [...this.selectedTasks];
        const currentTasks = await Promise.all(selectedTasks.map((task) => this.readCurrentTask(task)));
        const replacements = createReplacements(currentTasks);
        const savedReplacements = await saveTaskReplacements(replacements, replaceTaskWithTasks);
        if (this.drilldown !== null) {
            this.drilldown = {
                ...this.drilldown,
                tasks: updateTaskListAfterBulkEdit(
                    this.drilldown.tasks,
                    selectedTasks,
                    currentTasks,
                    savedReplacements,
                ),
            };
        }
        const savedCurrentTasks = new Set(savedReplacements.map((replacement) => replacement.originalTask));
        this.selectedTasks = new Set(
            selectedTasks.filter((_task, index) => !savedCurrentTasks.has(currentTasks[index])),
        );
        this.refreshedAt = window.moment();
        this.render();
        this.scheduleRefresh();
    }

    private async readCurrentTask(task: Task): Promise<Task> {
        const file = this.app.vault.getAbstractFileByPath(task.path);
        if (!(file instanceof TFile)) return task;

        const lines = (await this.app.vault.read(file)).split('\n');
        const fallbackDate = task.scheduledDateIsInferred ? task.scheduledDate : null;
        const parse = (line: string | undefined) =>
            line === undefined ? null : Task.fromLine({ line, taskLocation: task.taskLocation, fallbackDate });
        const atOriginalLine = parse(lines[task.taskLocation.lineNumber]);
        if (atOriginalLine !== null && this.isSameTask(atOriginalLine, task)) return atOriginalLine;

        const matches = lines
            .map((line) => parse(line))
            .filter((candidate): candidate is Task => candidate !== null && this.isSameTask(candidate, task));
        return matches.length === 1 ? matches[0] : task;
    }

    private isSameTask(candidate: Task, task: Task): boolean {
        if (task.id !== '') return candidate.id === task.id;
        return candidate.description === task.description && candidate.status.type === task.status.type;
    }

    private priorityLabel(task: Task): string {
        const quadrant = priorityQuadrantFromText(task.description);
        return quadrant ? this.priorityQuadrantLabel(quadrant) : i18n.t(`ui.dashboard.priorities.${task.priority}`);
    }

    private priorityQuadrantLabel(quadrant: PriorityQuadrant): string {
        const labelKeys: Record<PriorityQuadrant, string> = {
            IU: 'importantUrgent',
            IN: 'importantNotUrgent',
            NU: 'notImportantUrgent',
            NN: 'notImportantNotUrgent',
        };
        return i18n.t(`ui.priority.${labelKeys[quadrant]}`);
    }

    private async openTask(task: Task) {
        const file = this.app.vault.getAbstractFileByPath(task.path);
        if (file instanceof TFile) {
            await this.app.workspace.getLeaf(false).openFile(file, { eState: { line: task.taskLocation.lineNumber } });
            this.close();
        }
    }
}

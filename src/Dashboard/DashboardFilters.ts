import type { Moment } from 'moment';
import type { Priority } from '../Task/Priority';
import { type PriorityQuadrant, priorityQuadrantFromText } from '../Task/PriorityQuadrant';
import type { Task } from '../Task/Task';

export type DashboardTimeRange = 'all' | 'today' | 'week' | 'month';
export type DashboardTaskProperty = 'any' | 'dated' | 'undated' | 'recurring' | 'blocked';
export type DashboardPriorityFilter = Priority | `quadrant:${PriorityQuadrant}`;

export interface DashboardFilter {
    timeRange: DashboardTimeRange;
    folders: string[];
    tags: string[];
    statuses: string[];
    priorities: DashboardPriorityFilter[];
    taskProperty: DashboardTaskProperty;
    frontmatterProperty: string;
    frontmatterValue: string;
}

export interface DashboardSavedView {
    id: string;
    name: string;
    filter: DashboardFilter;
}

function cloneDashboardFilter(filter: DashboardFilter): DashboardFilter {
    return {
        ...filter,
        folders: [...filter.folders],
        tags: [...filter.tags],
        statuses: [...filter.statuses],
        priorities: [...filter.priorities],
    };
}

function cloneDashboardView(view: DashboardSavedView): DashboardSavedView {
    return { ...view, filter: cloneDashboardFilter(view.filter) };
}

export const defaultDashboardFilter = (): DashboardFilter => ({
    timeRange: 'all',
    folders: [],
    tags: [],
    statuses: [],
    priorities: [],
    taskProperty: 'any',
    frontmatterProperty: '',
    frontmatterValue: '',
});

function taskDate(task: Task) {
    return task.dueDate ?? task.scheduledDate ?? task.startDate;
}

function matchesTimeRange(task: Task, range: DashboardTimeRange, now: Moment): boolean {
    if (range === 'all') {
        return true;
    }
    const date = taskDate(task);
    if (date === null) {
        return false;
    }
    switch (range) {
        case 'today':
            return date.isSame(now, 'day');
        case 'week':
            return date.isBetween(now.clone().startOf('isoWeek'), now.clone().endOf('isoWeek'), undefined, '[]');
        case 'month':
            return date.isSame(now, 'month');
    }
}

function matchesProperty(task: Task, property: DashboardTaskProperty, allTasks: Task[]): boolean {
    switch (property) {
        case 'any':
            return true;
        case 'dated':
            return taskDate(task) !== null;
        case 'undated':
            return taskDate(task) === null;
        case 'recurring':
            return task.isRecurring;
        case 'blocked':
            return task.isBlocked(allTasks);
    }
}

function matchesFrontmatter(task: Task, property: string, expectedValue: string): boolean {
    if (property.trim() === '') {
        return true;
    }
    const value = task.file.frontmatter[property];
    if (value === undefined) {
        return false;
    }
    if (expectedValue.trim() === '') {
        return true;
    }
    const values = Array.isArray(value) ? value : [value];
    return values.some((candidate) =>
        String(candidate).toLocaleLowerCase().includes(expectedValue.toLocaleLowerCase()),
    );
}

function matchesPriority(task: Task, priorities: DashboardPriorityFilter[]): boolean {
    if (priorities.length === 0) {
        return true;
    }
    return priorities.some((priority) => {
        if (priority.startsWith('quadrant:')) {
            return priorityQuadrantFromText(task.description) === priority.slice('quadrant:'.length);
        }
        return task.priority === priority;
    });
}

export function filterDashboardTasks(tasks: Task[], filter: DashboardFilter, now = window.moment()): Task[] {
    return tasks.filter((task) => {
        const inFolder =
            filter.folders.length === 0 ||
            filter.folders.some((folder) => {
                const normalizedFolder = folder.replace(/\/+$/, '');
                return task.path === normalizedFolder || task.path.startsWith(`${normalizedFolder}/`);
            });
        const hasTag = filter.tags.length === 0 || filter.tags.some((tag) => task.tags.includes(tag));
        const hasStatus = filter.statuses.length === 0 || filter.statuses.includes(task.status.type);
        const hasPriority = matchesPriority(task, filter.priorities);
        return (
            inFolder &&
            hasTag &&
            hasStatus &&
            hasPriority &&
            matchesTimeRange(task, filter.timeRange, now) &&
            matchesProperty(task, filter.taskProperty, tasks) &&
            matchesFrontmatter(task, filter.frontmatterProperty, filter.frontmatterValue)
        );
    });
}

export class DashboardViewStore {
    private views: DashboardSavedView[];

    constructor(
        savedViews: DashboardSavedView[],
        private readonly persist: (views: DashboardSavedView[]) => Promise<void> | void,
    ) {
        this.views = savedViews.map(cloneDashboardView);
    }

    public all(): DashboardSavedView[] {
        return this.views.map(cloneDashboardView);
    }

    public async save(view: DashboardSavedView): Promise<void> {
        const index = this.views.findIndex((existingView) => existingView.id === view.id);
        if (index === -1) {
            this.views.push(cloneDashboardView(view));
        } else {
            this.views[index] = cloneDashboardView(view);
        }
        await this.persist(this.all());
    }

    public async remove(id: string): Promise<void> {
        this.views = this.views.filter((view) => view.id !== id);
        await this.persist(this.all());
    }
}

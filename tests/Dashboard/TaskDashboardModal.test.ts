/**
 * @jest-environment jsdom
 */
import moment from 'moment';
import type { App, EventRef } from 'obsidian';
import { TaskDashboardModal } from '../../src/Obsidian/TaskDashboardModal';
import { DashboardViewStore } from '../../src/Dashboard/DashboardFilters';
import { i18n } from '../../src/i18n/i18n';
import { TaskBuilder } from '../TestingTools/TaskBuilder';

jest.mock('obsidian');

describe('task dashboard modal lifecycle', () => {
    beforeEach(() => {
        window.moment = moment;
    });

    it('refreshes for every task-file lifecycle event and unregisters them on close', () => {
        const eventRefs = [{}, {}, {}, {}] as EventRef[];
        const vault = {
            offref: jest.fn(),
            on: jest.fn((_event: string) => eventRefs.shift() as EventRef),
        };
        const app = { vault } as unknown as App;
        const modal = new TaskDashboardModal(app, () => [], new DashboardViewStore([], () => {}));
        const contentEl = document.createElement('div');
        Object.assign(contentEl, { createDiv: jest.fn(), empty: jest.fn() });
        Object.assign(modal, {
            app,
            contentEl,
            modalEl: { addClass: jest.fn() },
            titleEl: { setText: jest.fn() },
        });
        jest.spyOn(modal as unknown as { render: () => void }, 'render').mockImplementation(() => {});

        modal.onOpen();
        modal.onClose();

        expect(vault.on.mock.calls.map(([event]) => event)).toEqual(['modify', 'create', 'delete', 'rename']);
        expect(vault.offref).toHaveBeenCalledTimes(4);
    });

    it('renders every task in an expanded risk or plan group', () => {
        const modal = new TaskDashboardModal({} as App, () => [], new DashboardViewStore([], () => {}));
        const renderTask = jest.fn();
        Object.assign(modal, { renderTask });
        const tasks = Array.from({ length: 7 }, (_, index) => new TaskBuilder().description(`Task ${index}`).build());

        (
            modal as unknown as {
                renderTaskGroup: (parent: HTMLElement, title: string, groupTasks: typeof tasks) => void;
            }
        ).renderTaskGroup(document.createElement('div'), 'Overdue', tasks);

        expect(renderTask).toHaveBeenCalledTimes(7);
    });

    it('shows a loading state before the first full render', () => {
        jest.useFakeTimers();
        const vault = { offref: jest.fn(), on: jest.fn(() => ({} as EventRef)) };
        const app = { vault } as unknown as App;
        const modal = new TaskDashboardModal(app, () => [], new DashboardViewStore([], () => {}));
        const contentEl = document.createElement('div');
        const createDiv = jest.fn();
        Object.assign(contentEl, { createDiv, empty: jest.fn() });
        const render = jest.spyOn(modal as unknown as { render: () => void }, 'render').mockImplementation(() => {});
        Object.assign(modal, {
            app,
            contentEl,
            modalEl: { addClass: jest.fn() },
            titleEl: { setText: jest.fn() },
        });

        modal.onOpen();

        expect(createDiv).toHaveBeenCalledWith({ cls: 'tasks-dashboard-loading', text: i18n.t('ui.dashboardLoading') });
        expect(render).not.toHaveBeenCalled();
        jest.runOnlyPendingTimers();
        expect(render).toHaveBeenCalledTimes(1);
        modal.onClose();
        jest.useRealTimers();
    });

    it('shows and repositions the trend tooltip immediately', () => {
        const modal = new TaskDashboardModal({} as App, () => [], new DashboardViewStore([], () => {}));
        const tooltip = document.createElement('div');
        const tooltipControls = modal as unknown as {
            hideTrendTooltip: (tooltip: HTMLElement) => void;
            showTrendTooltip: (tooltip: HTMLElement, text: string, position: { x: number; y: number }) => void;
        };

        tooltipControls.showTrendTooltip(tooltip, '2026-07-28\nCompleted: 3', { x: 120, y: 60 });

        expect(tooltip.textContent).toBe('2026-07-28\nCompleted: 3');
        expect(tooltip.classList.contains('is-visible')).toBe(true);
        expect(tooltip.getAttribute('aria-hidden')).toBe('false');
        expect(tooltip.style.left).toBe('134px');
        expect(tooltip.style.top).toBe('74px');

        tooltipControls.hideTrendTooltip(tooltip);

        expect(tooltip.classList.contains('is-visible')).toBe(false);
        expect(tooltip.getAttribute('aria-hidden')).toBe('true');
    });

    it('uses only the custom tooltip for progress-day buttons', () => {
        const modal = new TaskDashboardModal({} as App, () => [], new DashboardViewStore([], () => {}));
        const attachObsidianElementHelpers = (parent: HTMLElement) => {
            parent.createDiv = (options = {}) => {
                const elementOptions = options as { cls?: string; text?: string; attr?: Record<string, string> };
                const child = document.createElement('div');
                if (elementOptions.cls) child.className = elementOptions.cls;
                if (elementOptions.text) child.textContent = elementOptions.text;
                if (elementOptions.attr) {
                    Object.entries(elementOptions.attr).forEach(([name, value]) =>
                        child.setAttribute(name, String(value)),
                    );
                }
                attachObsidianElementHelpers(child);
                parent.append(child);
                return child;
            };
            parent.createEl = (tagName, options = {}) => {
                const elementOptions = options as { cls?: string; text?: string; attr?: Record<string, string> };
                const child = document.createElement(tagName);
                if (elementOptions.cls) child.className = elementOptions.cls;
                if (elementOptions.text) child.textContent = elementOptions.text;
                if (elementOptions.attr) {
                    Object.entries(elementOptions.attr).forEach(([name, value]) =>
                        child.setAttribute(name, String(value)),
                    );
                }
                attachObsidianElementHelpers(child);
                parent.append(child);
                return child;
            };
            parent.createSpan = (options = {}) => parent.createEl('span', options);
            parent.setCssProps = (properties) => {
                Object.entries(properties).forEach(([name, value]) => parent.style.setProperty(name, String(value)));
            };
        };
        const contentEl = document.createElement('div');
        const parent = document.createElement('div');
        attachObsidianElementHelpers(contentEl);
        attachObsidianElementHelpers(parent);
        Object.assign(modal, { contentEl });

        (modal as unknown as { renderAnalysisColumn: (parent: HTMLElement, tasks: []) => void }).renderAnalysisColumn(
            parent,
            [],
        );

        const tooltip = contentEl.querySelector<HTMLElement>('.tasks-dashboard-trend-tooltip');
        const dayButton = parent.querySelector<HTMLButtonElement>('.tasks-dashboard-trend-day');
        expect(tooltip).not.toBeNull();
        expect(dayButton).not.toBeNull();
        expect(dayButton?.getAttribute('aria-label')).toBeNull();
        expect(dayButton?.getAttribute('title')).toBeNull();
        expect(dayButton?.getAttribute('aria-describedby')).toBe(tooltip?.id);
    });
});

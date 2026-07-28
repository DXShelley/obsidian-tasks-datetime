import moment from 'moment';
import { DashboardViewStore, defaultDashboardFilter, filterDashboardTasks } from '../../src/Dashboard/DashboardFilters';
import { Priority } from '../../src/Task/Priority';
import { Status } from '../../src/Statuses/Status';
import { TaskBuilder } from '../TestingTools/TaskBuilder';

describe('dashboard filters and saved views', () => {
    beforeEach(() => {
        window.moment = moment;
    });

    it('filters tasks across time, folder, tag, status, priority and properties', () => {
        const matching = new TaskBuilder()
            .path('Work/Plan.md')
            .tags(['#focus'])
            .priority(Priority.High)
            .dueDate('2026-07-28')
            .build();
        const done = new TaskBuilder().path('Work/Done.md').tags(['#focus']).status(Status.DONE).build();
        const personal = new TaskBuilder().path('Personal.md').tags(['#focus']).priority(Priority.High).build();
        const filter = {
            ...defaultDashboardFilter(),
            timeRange: 'today' as const,
            folders: ['Work/'],
            tags: ['#focus'],
            statuses: ['TODO'],
            priorities: [Priority.High],
            taskProperty: 'dated' as const,
        };

        expect(filterDashboardTasks([matching, done, personal], filter, moment('2026-07-28'))).toEqual([matching]);
    });

    it('filters frontmatter properties when cached metadata is available', () => {
        const task = new TaskBuilder().mockData('yaml_custom_number_property').build();
        const propertyName = Object.keys(task.file.frontmatter)[0];
        const result = filterDashboardTasks(
            [task],
            { ...defaultDashboardFilter(), frontmatterProperty: propertyName },
            moment('2026-07-28'),
        );

        expect(result).toEqual([task]);
    });

    it('matches folder filters on a path boundary rather than a shared prefix', () => {
        const work = new TaskBuilder().path('Work/Plan.md').build();
        const workflows = new TaskBuilder().path('Workflows/Process.md').build();

        expect(filterDashboardTasks([work, workflows], { ...defaultDashboardFilter(), folders: ['Work'] })).toEqual([
            work,
        ]);
    });

    it('distinguishes new importance-and-urgency quadrants from legacy priority values', () => {
        const importantUrgent = new TaskBuilder().description('Act now 🔥').priority(Priority.Highest).build();
        const legacyHighest = new TaskBuilder().description('Legacy highest').priority(Priority.Highest).build();
        const filter = { ...defaultDashboardFilter(), priorities: ['quadrant:IU' as const] };

        expect(filterDashboardTasks([importantUrgent, legacyHighest], filter, moment('2026-07-28'))).toEqual([
            importantUrgent,
        ]);
    });

    it('persists saved view changes without mutating caller-owned data', async () => {
        const persist = jest.fn();
        const store = new DashboardViewStore([], persist);
        const view = { id: 'today', name: 'Today', filter: { ...defaultDashboardFilter(), tags: ['#focus'] } };

        await store.save(view);
        view.filter.tags.push('#later');
        const retrieved = store.all();
        retrieved[0].filter.tags.push('#mutated');
        await store.remove('today');

        expect(persist).toHaveBeenNthCalledWith(1, [
            { id: 'today', name: 'Today', filter: { ...defaultDashboardFilter(), tags: ['#focus'] } },
        ]);
        expect(persist).toHaveBeenNthCalledWith(2, []);
        expect(retrieved[0].filter.tags).toEqual(['#focus', '#mutated']);
        expect(store.all()).toEqual([]);
    });

    it('isolates saved view filters from caller and reader mutations', async () => {
        const store = new DashboardViewStore([], () => {});
        const view = { id: 'today', name: 'Today', filter: { ...defaultDashboardFilter(), tags: ['#focus'] } };

        await store.save(view);
        view.filter.tags.push('#caller-change');
        const returned = store.all();
        returned[0].filter.tags.push('#reader-change');

        expect(store.all()[0].filter.tags).toEqual(['#focus']);
    });
});

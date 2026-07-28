import { i18n, setPluginLanguage } from '../../src/i18n/i18n';

describe('dashboard localization', () => {
    afterEach(async () => {
        await setPluginLanguage('en');
    });

    it('uses the configured language for dashboard priority and trend controls', async () => {
        await setPluginLanguage('zh');

        expect(i18n.t('ui.dashboard.trendRange', { days: 30 })).toBe('30 天');
        expect(i18n.t('ui.dashboard.priorities.0')).toBe('最高');
        expect(i18n.t('ui.dashboard.priorityGroups.quadrants')).toBe('重要性与紧急性');
        expect(i18n.t('ui.priority.importantUrgent')).toBe('重要 / 紧急');
        expect(i18n.t('ui.dashboard.postponeOneDay')).toBe('延期一天');
        expect(i18n.t('ui.dashboard.statuses.CANCELLED')).toBe('已取消');
        expect(i18n.t('ui.dashboard.statuses.DONE')).toBe('已完成');
        expect(i18n.t('ui.dashboard.trendLegend.planned')).toBe('计划到期');
        expect(i18n.t('ui.dashboard.postponeDays', { days: 7 })).toBe('延期 7 天');
        expect(i18n.t('ui.dashboardLoading')).toBe('正在加载任务面板...');
        expect(i18n.t('ui.dashboardNetAdded')).toBe('任务净新增量');
        expect(i18n.t('ui.dashboardCompletionRateRange', { days: 30 })).toBe('近 30 天计划完成率');
    });
});

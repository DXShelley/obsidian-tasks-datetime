import { getPluginLanguage, setPluginLanguage } from '../../src/i18n/i18n';
import zh_cn from '../../src/i18n/locales/zh_cn.json';

describe('plugin language', () => {
    afterEach(async () => {
        await setPluginLanguage('en');
    });

    it('switches between the supported plugin languages', async () => {
        await setPluginLanguage('zh');
        expect(getPluginLanguage()).toBe('zh');

        await setPluginLanguage('en');
        expect(getPluginLanguage()).toBe('en');
    });

    it('has no empty Chinese translations', () => {
        const values = JSON.stringify(zh_cn).match(/"([^"]*)"/g) ?? [];
        expect(values).not.toContain('""');
    });
});

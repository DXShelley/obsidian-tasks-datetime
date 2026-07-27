import { type App, Notice, type TFile } from 'obsidian';
import { i18n } from '../i18n/i18n';
import { QueryFileDefaults } from '../Query/QueryFileDefaults';

export async function ensureQueryFileDefaultsInFrontmatter(app: App, file: TFile) {
    await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
        const requiredKeys = new QueryFileDefaults().allPropertyNamesSorted();
        let updated = false;
        requiredKeys.forEach((key) => {
            if (!(key in frontmatter)) {
                frontmatter[key] = null;
                updated = true;
            }
        });

        if (!updated) {
            new Notice(i18n.t('ui.notices.allPropertiesPresent'));
        } else {
            new Notice(i18n.t('ui.notices.propertiesUpdated'));
        }
    });
}

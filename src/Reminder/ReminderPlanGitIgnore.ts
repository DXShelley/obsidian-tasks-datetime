import type { Vault } from 'obsidian';

export const reminderPlanGitIgnoreComment = '# Tasks Datetime reminder snapshot';
export type ReminderPlanGitIgnoreResult = 'added' | 'already-ignored' | 'unavailable';

export interface ReminderPlanGitIgnoreStorage {
    exists(path: string): Promise<boolean>;
    process(path: string, callback: (data: string) => string): Promise<string | void>;
    create(path: string, data: string): Promise<void>;
}

export function reminderPlanGitIgnoreStorage(vault: Vault): ReminderPlanGitIgnoreStorage {
    return {
        exists: (path) => vault.adapter.exists(path),
        process: (path, callback) => vault.adapter.process(path, callback),
        create: async (path, data) => {
            await vault.create(path, data);
        },
    };
}

/**
 * Adds the generated reminder snapshot to a Git-managed vault's .gitignore
 * after an explicit user action. This deliberately does not otherwise manage
 * a user's Git configuration.
 */
export async function ensureReminderPlanIsGitIgnored(
    storage: ReminderPlanGitIgnoreStorage,
    reminderPlanPath: string,
): Promise<ReminderPlanGitIgnoreResult> {
    if (!(await storage.exists('.git'))) return 'unavailable';

    const ignoreRule = `/${reminderPlanPath.replace(/^\/+/, '')}`;
    const newFileContents = `${reminderPlanGitIgnoreComment}\n${ignoreRule}\n`;
    if (!(await storage.exists('.gitignore'))) {
        try {
            await storage.create('.gitignore', newFileContents);
            return 'added';
        } catch (error) {
            // A concurrent Git tool may have created the file after the exists() check.
            if (!(await storage.exists('.gitignore'))) throw error;
        }
    }

    let result: ReminderPlanGitIgnoreResult = 'added';
    await storage.process('.gitignore', (contents) => {
        if (containsIgnoreRule(contents, ignoreRule)) {
            result = 'already-ignored';
            return contents;
        }

        const separator = contents.length === 0 || contents.endsWith('\n') ? '' : '\n';
        return `${contents}${separator}${reminderPlanGitIgnoreComment}\n${ignoreRule}\n`;
    });
    return result;
}

function containsIgnoreRule(contents: string, ignoreRule: string): boolean {
    const ruleWithoutLeadingSlash = ignoreRule.slice(1);
    return contents.split(/\r?\n/u).some((line) => {
        const trimmedLine = line.trim();
        return trimmedLine === ignoreRule || trimmedLine === ruleWithoutLeadingSlash;
    });
}

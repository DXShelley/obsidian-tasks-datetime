import { ensureReminderPlanIsGitIgnored, reminderPlanGitIgnoreComment } from '../../src/Reminder/ReminderPlanGitIgnore';

const reminderPlanPath = '.obsidian/plugins/tasks-datetime/reminder-plan.v1.json';

function storageWith(files: Record<string, string>) {
    return {
        exists: jest.fn(async (path: string) => path in files),
        process: jest.fn(async (path: string, callback: (contents: string) => string) => {
            files[path] = callback(files[path]);
            return files[path];
        }),
        create: jest.fn(async (path: string, contents: string) => {
            if (path in files) throw new Error('File already exists');
            files[path] = contents;
        }),
    };
}

describe('ensureReminderPlanIsGitIgnored', () => {
    it('adds the reminder snapshot rule to an existing Git vault ignore file', async () => {
        const files = { '.git': '', '.gitignore': 'node_modules\n' };
        const storage = storageWith(files);

        const result = await ensureReminderPlanIsGitIgnored(storage, reminderPlanPath);

        expect(result).toBe('added');
        expect(files['.gitignore']).toBe(`node_modules\n${reminderPlanGitIgnoreComment}\n/${reminderPlanPath}\n`);
    });

    it('does not alter a non-Git vault', async () => {
        const withoutGit = storageWith({ '.gitignore': '' });

        await expect(ensureReminderPlanIsGitIgnored(withoutGit, reminderPlanPath)).resolves.toBe('unavailable');
        expect(withoutGit.process).not.toHaveBeenCalled();
        expect(withoutGit.create).not.toHaveBeenCalled();
    });

    it('creates .gitignore when a Git vault does not have one', async () => {
        const files: Record<string, string> = { '.git': '' };
        const storage = storageWith(files);

        await expect(ensureReminderPlanIsGitIgnored(storage, reminderPlanPath)).resolves.toBe('added');
        expect(storage.create).toHaveBeenCalledWith(
            '.gitignore',
            `${reminderPlanGitIgnoreComment}\n/${reminderPlanPath}\n`,
        );
        expect(storage.process).not.toHaveBeenCalled();
    });

    it('preserves a .gitignore created concurrently', async () => {
        const files: Record<string, string> = { '.git': '' };
        const storage = storageWith(files);
        storage.create.mockImplementationOnce(async () => {
            files['.gitignore'] = 'external-rule\n';
            throw new Error('File already exists');
        });

        await expect(ensureReminderPlanIsGitIgnored(storage, reminderPlanPath)).resolves.toBe('added');
        expect(files['.gitignore']).toBe(`external-rule\n${reminderPlanGitIgnoreComment}\n/${reminderPlanPath}\n`);
    });

    it('does not add a duplicate when the exact rule is already present', async () => {
        const files = { '.git': '', '.gitignore': `/${reminderPlanPath}\n` };
        const storage = storageWith(files);

        await expect(ensureReminderPlanIsGitIgnored(storage, reminderPlanPath)).resolves.toBe('already-ignored');
        expect(storage.process).toHaveBeenCalledTimes(1);
        expect(files['.gitignore']).toBe(`/${reminderPlanPath}\n`);
    });
});

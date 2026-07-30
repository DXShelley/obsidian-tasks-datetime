import { hideTaskIdsInReadingView } from '../../src/Obsidian/InlineRenderer';

describe('InlineRenderer task ID hiding', () => {
    it('hides ID and dependency fields without changing the task text', () => {
        const taskElement = document.createElement('li');
        taskElement.textContent = 'Review ticket 🆔 t-k4iq21a2b3c4 ⛔ t-9abcde123456, t-k4iq21a2b3c4 📅 2026-07-30';

        hideTaskIdsInReadingView(taskElement);

        expect(Array.from(taskElement.querySelectorAll('.task-id')).map((element) => element.textContent)).toEqual([
            ' 🆔 t-k4iq21a2b3c4',
            ' ⛔ t-9abcde123456, t-k4iq21a2b3c4',
        ]);
        expect(taskElement.textContent).toBe(
            'Review ticket 🆔 t-k4iq21a2b3c4 ⛔ t-9abcde123456, t-k4iq21a2b3c4 📅 2026-07-30',
        );
        expect(taskElement.querySelector('.task-id')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('does not touch text that has no task ID field', () => {
        const taskElement = document.createElement('li');
        taskElement.textContent = 'Write about the ID marker';

        hideTaskIdsInReadingView(taskElement);

        expect(taskElement.innerHTML).toBe('Write about the ID marker');
    });

    it('does not hide an ID marker embedded in ordinary text', () => {
        const taskElement = document.createElement('li');
        taskElement.textContent = 'Keep project🆔note visible';

        hideTaskIdsInReadingView(taskElement);

        expect(taskElement.innerHTML).toBe('Keep project🆔note visible');
    });
});

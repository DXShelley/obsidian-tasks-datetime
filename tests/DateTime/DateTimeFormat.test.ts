/** @jest-environment jsdom */
import moment from 'moment';
import { resetSettings, updateSettings } from '../../src/Config/Settings';
import { formatTaskDate, parseTypedDateForSaving } from '../../src/DateTime/DateTools';
import { DEFAULT_SYMBOLS, DefaultTaskSerializer } from '../../src/TaskSerializer/DefaultTaskSerializer';

window.moment = moment;

describe('task datetime format', () => {
    afterEach(() => resetSettings());

    it('round-trips a seconds-precision task date when time support is enabled', () => {
        updateSettings({ enableDateTime: true });
        const serializer = new DefaultTaskSerializer(DEFAULT_SYMBOLS);
        const parsed = serializer.deserialize('Prepare release 📅 2026-07-23 16:30:05');

        expect(parsed.dueDate?.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-07-23 16:30:05');
        expect(formatTaskDate(parsed.dueDate)).toBe('2026-07-23 16:30:05');
    });

    it('keeps date-only values compatible and hides time when disabled', () => {
        updateSettings({ enableDateTime: false });
        const serializer = new DefaultTaskSerializer(DEFAULT_SYMBOLS);
        const parsed = serializer.deserialize('Prepare release 📅 2026-07-23');

        expect(parsed.dueDate?.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-07-23 00:00:00');
        expect(formatTaskDate(parsed.dueDate)).toBe('2026-07-23');
    });

    it('adds the current time to a date-only edit when time support is enabled', () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-07-23 11:12:13'));
        updateSettings({ enableDateTime: true });
        expect(parseTypedDateForSaving('2026-08-01', false)?.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-08-01 11:12:13');
        jest.useRealTimers();
    });
});

/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/svelte';
import moment from 'moment/moment';
import { resetSettings, updateSettings } from '../../src/Config/Settings';
import { createDateTimePicker } from '../../src/ui/DateTimePicker';
import DateEditorWrapper from './DateEditorWrapper.svelte';
import { getAndCheckRenderedElement } from './RenderingTestHelpers';

jest.mock('../../src/ui/DateTimePicker', () => ({
    createDateTimePicker: jest.fn(({ input, onDateSelected }) => {
        input.addEventListener('tasks-date-selected', (event: Event) => {
            onDateSelected(new Date((event as CustomEvent<string>).detail));
        });
        return { clear: jest.fn(), destroy: jest.fn(), open: jest.fn() };
    }),
}));

window.moment = moment;

function renderDateEditorWrapper(componentOptions: { forwardOnly: boolean }) {
    const { container } = render(DateEditorWrapper, componentOptions);
    return container;
}

function testInputValue(container: HTMLElement, inputId: string, expectedText: string) {
    const input = getAndCheckRenderedElement<HTMLInputElement>(container, inputId);
    expect(input.value).toEqual(expectedText);
}

async function selectDate(container: HTMLElement, value: string) {
    const datePicker = getAndCheckRenderedElement<HTMLInputElement>(container, 'date-editor-picker-due');
    await fireEvent(datePicker, new CustomEvent('tasks-date-selected', { detail: value }));
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-04-20T13:14:15'));
    updateSettings({ enableDateTime: false });
});

afterEach(() => {
    jest.useRealTimers();
    resetSettings();
});

describe('date editor wrapper tests', () => {
    it('should initialise as an empty date picker', () => {
        const container = renderDateEditorWrapper({ forwardOnly: true });

        expect(getAndCheckRenderedElement<HTMLButtonElement>(container, 'due').textContent).toContain('Choose date');
        testInputValue(container, 'dueDateFromDateEditor', '');
        testInputValue(container, 'parsedDateFromDateEditor', '<i>no due date</i>');
        testInputValue(container, 'parsedDateValidFromDateEditor', 'true');
    });

    it('should set a date selected from the picker', async () => {
        const container = renderDateEditorWrapper({ forwardOnly: false });

        await selectDate(container, '2024-11-03');

        expect(getAndCheckRenderedElement<HTMLButtonElement>(container, 'due').textContent).toContain('2024-11-03');
        testInputValue(container, 'dueDateFromDateEditor', '2024-11-03 22:00:00');
        testInputValue(container, 'parsedDateFromDateEditor', '2024-11-03');
        testInputValue(container, 'parsedDateValidFromDateEditor', 'true');
    });

    it('should clear a selected date', async () => {
        const container = renderDateEditorWrapper({ forwardOnly: true });
        await selectDate(container, '2024-10-01');

        const clearButton = container.querySelector<HTMLButtonElement>('[aria-label="Clear due date"]');
        expect(clearButton).not.toBeNull();
        await fireEvent.click(clearButton!);

        expect(getAndCheckRenderedElement<HTMLButtonElement>(container, 'due').textContent).toContain('Choose date');
        testInputValue(container, 'dueDateFromDateEditor', '');
    });

    it('should show the datetime placeholder when time selection is enabled', () => {
        updateSettings({ enableDateTime: true });
        const container = renderDateEditorWrapper({ forwardOnly: true });

        expect(getAndCheckRenderedElement<HTMLButtonElement>(container, 'due').textContent).toContain(
            'Choose date and time',
        );
    });

    it.each([false, true])('should configure time selection from enableDateTime=%s', (enableDateTime) => {
        updateSettings({ enableDateTime });
        renderDateEditorWrapper({ forwardOnly: true });

        expect(createDateTimePicker).toHaveBeenLastCalledWith(expect.objectContaining({ enableTime: enableDateTime }));
    });
});

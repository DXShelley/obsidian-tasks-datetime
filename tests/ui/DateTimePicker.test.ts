/** @jest-environment jsdom */
import flatpickr from 'flatpickr';
import moment from 'moment';
import { createDateTimePicker } from '../../src/ui/DateTimePicker';

jest.mock('flatpickr', () => jest.fn());

window.moment = moment;

describe('DateTimePicker', () => {
    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-07-24 11:12:13'));
    });

    afterEach(() => jest.useRealTimers());

    it('uses the current time as the default when time selection is enabled', () => {
        const input = document.createElement('input');
        const trigger = document.createElement('button');

        createDateTimePicker({ input, positionElement: trigger, enableTime: true, onDateSelected: jest.fn() });

        expect(flatpickr).toHaveBeenCalledWith(
            input,
            expect.objectContaining({
                allowInput: true,
                defaultHour: 11,
                defaultMinute: 12,
                defaultSeconds: 13,
                enableSeconds: true,
                enableTime: true,
            }),
        );
    });

    it('keeps the picker date-only when time selection is disabled', () => {
        const input = document.createElement('input');
        const trigger = document.createElement('button');

        createDateTimePicker({ input, positionElement: trigger, enableTime: false, onDateSelected: jest.fn() });

        expect(flatpickr).toHaveBeenCalledWith(
            input,
            expect.objectContaining({ enableSeconds: false, enableTime: false }),
        );
    });

    it('mounts the picker in the modal instead of its clipped content area', () => {
        const modal = document.createElement('div');
        modal.classList.add('tasks-edit-modal-container');
        const form = document.createElement('form');
        const input = document.createElement('input');
        const trigger = document.createElement('button');
        form.append(input, trigger);
        modal.append(form);

        createDateTimePicker({ input, positionElement: trigger, enableTime: false, onDateSelected: jest.fn() });

        expect(flatpickr).toHaveBeenLastCalledWith(input, expect.objectContaining({ appendTo: modal }));
    });

    it('positions the picker above the input when it would overlap the modal footer', () => {
        const modal = document.createElement('div');
        modal.classList.add('tasks-edit-modal-container');
        const form = document.createElement('form');
        const input = document.createElement('input');
        const trigger = document.createElement('button');
        form.append(input, trigger);
        modal.append(form);
        jest.spyOn(modal, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 700 } as DOMRect);
        jest.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ top: 500, bottom: 530 } as DOMRect);

        createDateTimePicker({ input, positionElement: trigger, enableTime: true, onDateSelected: jest.fn() });

        const options = (flatpickr as unknown as jest.Mock).mock.calls.at(-1)![1];
        const calendarContainer = document.createElement('div');
        calendarContainer.setCssProps = (props) => Object.assign(calendarContainer.style, props);
        Object.defineProperty(calendarContainer, 'offsetHeight', { value: 300 });
        options.position({ calendarContainer });

        expect(calendarContainer.style.top).toBe('98px');
    });

    it('focuses the picker when opened', () => {
        const input = document.createElement('input');
        const trigger = document.createElement('button');
        const calendarContainer = document.createElement('div');
        const hourInput = document.createElement('input');
        hourInput.classList.add('flatpickr-hour');
        calendarContainer.append(hourInput);
        const focus = jest.spyOn(hourInput, 'focus');

        createDateTimePicker({ input, positionElement: trigger, enableTime: false, onDateSelected: jest.fn() });

        const options = (flatpickr as unknown as jest.Mock).mock.calls.at(-1)![1];
        options.onOpen([], '', { calendarContainer });

        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('adds clear, today, and confirm buttons', () => {
        const input = document.createElement('input');
        const trigger = document.createElement('button');
        const calendarContainer = document.createElement('div');
        calendarContainer.createDiv = (cls) => {
            const element = document.createElement('div');
            if (typeof cls === 'string') {
                element.classList.add(cls);
            }
            element.createEl = function <K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] {
                const child = document.createElement(tagName);
                this.append(child);
                return child;
            };
            calendarContainer.append(element);
            return element;
        };
        const clear = jest.fn();
        const setDate = jest.fn();
        const close = jest.fn();

        createDateTimePicker({ input, positionElement: trigger, enableTime: true, onDateSelected: jest.fn() });

        const options = (flatpickr as unknown as jest.Mock).mock.calls.at(-1)![1];
        options.onReady([], '', { calendarContainer, clear, setDate, close });

        const buttons = Array.from(calendarContainer.querySelectorAll<HTMLButtonElement>('.flatpickr-button'));
        expect(buttons.map((button) => button.textContent)).toEqual(['Clear', 'Today', 'Confirm']);

        buttons[0].click();
        buttons[1].click();
        buttons[2].click();

        expect(clear).toHaveBeenCalledTimes(1);
        expect(setDate).toHaveBeenCalledWith(expect.any(Date), true);
        expect(close).toHaveBeenCalledTimes(1);
    });
});

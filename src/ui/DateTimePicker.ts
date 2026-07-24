import flatpickr from 'flatpickr';
import { addFlatpickrPickerControls } from './FlatpickrPickerControls';

export interface DateTimePickerInstance {
    destroy(): void;
    open(): void;
    clear(): void;
}

export function createDateTimePicker({
    input,
    positionElement,
    enableTime,
    onDateSelected,
}: {
    input: HTMLInputElement;
    positionElement: HTMLElement;
    enableTime: boolean;
    onDateSelected: (date: Date | undefined) => void;
}): DateTimePickerInstance {
    const now = window.moment();
    const modal = input.closest<HTMLElement>('.tasks-edit-modal-container');
    return flatpickr(input, {
        allowInput: true,
        ...(modal
            ? {
                  appendTo: modal,
                  position: (instance) => {
                      const inputBounds = positionElement.getBoundingClientRect();
                      const modalBounds = modal.getBoundingClientRect();
                      const calendar = instance.calendarContainer;
                      const calendarHeight = calendar.offsetHeight;
                      const top =
                          inputBounds.bottom + calendarHeight + 2 > modalBounds.bottom
                              ? Math.max(modalBounds.top + 8, inputBounds.top - calendarHeight - 2)
                              : inputBounds.bottom + 2;

                      calendar.style.position = 'absolute';
                      calendar.style.top = `${top - modalBounds.top}px`;
                      calendar.style.left = `${Math.max(0, inputBounds.left - modalBounds.left)}px`;
                      calendar.style.right = 'auto';
                  },
              }
            : {}),
        clickOpens: false,
        positionElement,
        enableTime,
        enableSeconds: enableTime,
        defaultHour: now.hour(),
        defaultMinute: now.minute(),
        defaultSeconds: now.second(),
        time_24hr: true,
        dateFormat: enableTime ? 'Y-m-d H:i:S' : 'Y-m-d',
        onOpen: (_selectedDates, _dateStr, instance) => {
            const focusTarget = instance.calendarContainer.querySelector<HTMLElement>(
                '.flatpickr-hour, .flatpickr-day:not(.flatpickr-disabled)',
            );
            focusTarget?.focus({ preventScroll: true });
        },
        onReady: (_selectedDates, _dateStr, instance) => {
            addFlatpickrPickerControls(instance, {
                clear: () => instance.clear(),
                today: () => instance.setDate(new Date(), true),
                confirm: () => instance.close(),
            });
        },
        onChange: (selectedDates) => {
            onDateSelected(selectedDates[0]);
        },
    });
}

import flatpickr from 'flatpickr';

export interface DateTimePickerInstance {
    destroy(): void;
}

export function createDateTimePicker({
    input,
    enableTime,
    onDateSelected,
}: {
    input: HTMLInputElement;
    enableTime: boolean;
    onDateSelected: (date: Date) => void;
}): DateTimePickerInstance {
    return flatpickr(input, {
        allowInput: true,
        enableTime,
        enableSeconds: enableTime,
        time_24hr: true,
        dateFormat: enableTime ? 'Y-m-d H:i:S' : 'Y-m-d',
        onChange: (selectedDates) => {
            if (selectedDates[0]) {
                onDateSelected(selectedDates[0]);
            }
        },
    });
}

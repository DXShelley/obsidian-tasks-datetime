import type flatpickr from 'flatpickr';

export interface FlatpickrPickerActions {
    clear: () => void;
    today: () => void;
    confirm: () => void;
}

export function addFlatpickrPickerControls(instance: flatpickr.Instance, actions: FlatpickrPickerActions) {
    const buttonContainer = instance.calendarContainer.createDiv('tasks-date-picker-buttons');
    addPickerButton(buttonContainer, 'Clear', actions.clear);
    addPickerButton(buttonContainer, 'Today', actions.today);
    addPickerButton(buttonContainer, 'Confirm', actions.confirm);
}

function addPickerButton(buttonContainer: HTMLDivElement, label: string, action: () => void) {
    const button = buttonContainer.createEl('button');
    button.type = 'button';
    button.textContent = label;
    button.classList.add('flatpickr-button');
    button.addEventListener('click', action);
}

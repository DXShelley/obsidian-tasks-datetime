import type flatpickr from 'flatpickr';

export interface FlatpickrPickerActions {
    clear: () => void;
    today: () => void;
    confirm: () => void;
}

export function addFlatpickrPickerControls(instance: flatpickr.Instance, actions: FlatpickrPickerActions) {
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('tasks-date-picker-buttons');

    addPickerButton(buttonContainer, 'Clear', actions.clear);
    addPickerButton(buttonContainer, 'Today', actions.today);
    addPickerButton(buttonContainer, 'Confirm', actions.confirm);

    instance.calendarContainer.append(buttonContainer);
}

function addPickerButton(buttonContainer: HTMLDivElement, label: string, action: () => void) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.classList.add('flatpickr-button');
    button.addEventListener('click', action);
    buttonContainer.append(button);
}

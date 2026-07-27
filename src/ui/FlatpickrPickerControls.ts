import type flatpickr from 'flatpickr';
import { i18n } from '../i18n/i18n';

export interface FlatpickrPickerActions {
    clear: () => void;
    today: () => void;
    confirm: () => void;
}

export function addFlatpickrPickerControls(instance: flatpickr.Instance, actions: FlatpickrPickerActions) {
    const buttonContainer = instance.calendarContainer.createDiv('tasks-date-picker-buttons');
    addPickerButton(buttonContainer, i18n.t('ui.datePicker.clear'), actions.clear);
    addPickerButton(buttonContainer, i18n.t('ui.datePicker.today'), actions.today);
    addPickerButton(buttonContainer, i18n.t('ui.datePicker.confirm'), actions.confirm);
}

function addPickerButton(buttonContainer: HTMLDivElement, label: string, action: () => void) {
    const button = buttonContainer.createEl('button');
    button.type = 'button';
    button.textContent = label;
    button.classList.add('flatpickr-button');
    button.addEventListener('click', action);
}

<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { getSettings } from '../Config/Settings';
    import {
        formatTaskDateForStorage,
        parseTypedDateForDisplayUsingFutureDate,
        taskDateFormat,
    } from '../DateTime/DateTools';
    import { labelContentWithAccessKey } from './EditTaskHelpers';
    import { createDateTimePicker, type DateTimePickerInstance } from './DateTimePicker';
    import { i18n } from '../i18n/i18n';
    import { applyTaskDateTime, defaultTimeForField } from '../DateTime/TaskDateTime';

    export let id: 'start' | 'scheduled' | 'due' | 'done' | 'created' | 'cancelled';
    export let dateSymbol: string;
    export let date: string;
    export let isDateValid: boolean;
    export let forwardOnly: boolean;
    export let accesskey: string | null;

    // Use this for testing purposes only
    export let parsedDate: string = '';

    let pickedDate = '';
    let pickerInput: HTMLInputElement;
    let pickerTrigger: HTMLButtonElement;
    let picker: DateTimePickerInstance | undefined;
    let emptyPickerLabel: string;

    $: {
        emptyPickerLabel = getSettings().enableDateTime
            ? i18n.t('ui.datePicker.chooseDateTime')
            : i18n.t('ui.datePicker.chooseDate');
        parsedDate = parseTypedDateForDisplayUsingFutureDate(id, date, forwardOnly);
        isDateValid = !parsedDate.includes('invalid');
        if (isDateValid && !parsedDate.startsWith('<')) {
            pickedDate = parsedDate;
        } else if (!date) {
            pickedDate = '';
        }
    }

    function openPicker() {
        picker?.open();
    }

    function clearDate() {
        picker?.clear();
        pickedDate = '';
        date = '';
    }

    onMount(() => {
        if (!pickerInput) {
            return;
        }
        picker = createDateTimePicker({
            input: pickerInput,
            positionElement: pickerTrigger,
            enableTime: getSettings().enableDateTime,
            defaultTime: defaultTimeForField(id),
            onDateSelected: (selectedDate) => {
                if (!selectedDate) {
                    pickedDate = '';
                    date = '';
                    return;
                }

                const selectedMoment = window.moment(selectedDate);
                if (!getSettings().enableDateTime) {
                    const dateWithTime = applyTaskDateTime(selectedMoment, id);
                    date = formatTaskDateForStorage(dateWithTime);
                    pickedDate = dateWithTime.format(taskDateFormat());
                } else {
                    date = formatTaskDateForStorage(selectedMoment);
                    pickedDate = selectedMoment.format(taskDateFormat());
                }
            },
        });
    });

    onDestroy(() => picker?.destroy());

</script>

<label for={id}>{@html labelContentWithAccessKey(i18n.t(`ui.taskEditor.dates.${id}`), accesskey)}</label>
<!-- svelte-ignore a11y-accesskey -->
<div class="tasks-modal-date-control">
    <button
        bind:this={pickerTrigger}
        {id}
        type="button"
        class:tasks-modal-error={!isDateValid}
        class="tasks-modal-date-picker"
        {accesskey}
        on:click={openPicker}
    >
        <span>{dateSymbol} {pickedDate || emptyPickerLabel}</span>
    </button>
    {#if pickedDate}
        <button type="button" class="tasks-modal-date-clear clickable-icon" aria-label={i18n.t('ui.datePicker.clearDate', { date: i18n.t(`ui.taskEditor.dates.${id}`).toLowerCase() })} on:click={clearDate}>×</button>
    {/if}
</div>
<input
    id={`date-editor-picker-${id}`}
    class="tasks-modal-date-picker-input"
    bind:value={pickedDate}
    bind:this={pickerInput}
    tabindex="-1"
    aria-hidden="true"
/>
{#if !isDateValid}
    <code class="tasks-modal-parsed-date">{dateSymbol} {@html parsedDate}</code>
{/if}

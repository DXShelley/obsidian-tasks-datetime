<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { getSettings } from '../Config/Settings';
    import {
        formatTaskDateForStorage,
        formatTaskDateForStorageWithCurrentTime,
        parseTypedDateForDisplayUsingFutureDate,
        taskDateFormat,
    } from '../DateTime/DateTools';
    import { labelContentWithAccessKey } from './EditTaskHelpers';
    import { createDateTimePicker, type DateTimePickerInstance } from './DateTimePicker';

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
        emptyPickerLabel = getSettings().enableDateTime ? 'Choose date and time' : 'Choose date';
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
            onDateSelected: (selectedDate) => {
                if (!selectedDate) {
                    pickedDate = '';
                    date = '';
                    return;
                }

                const selectedMoment = window.moment(selectedDate);
                if (!getSettings().enableDateTime) {
                    date = formatTaskDateForStorageWithCurrentTime(selectedMoment);
                } else {
                    date = formatTaskDateForStorage(selectedMoment);
                }
                pickedDate = selectedMoment.format(taskDateFormat());
            },
        });
    });

    onDestroy(() => picker?.destroy());

</script>

<label for={id}>{@html labelContentWithAccessKey(id, accesskey)}</label>
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
        <button type="button" class="tasks-modal-date-clear clickable-icon" aria-label={`Clear ${id} date`} on:click={clearDate}>×</button>
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

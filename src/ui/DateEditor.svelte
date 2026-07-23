<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { getSettings } from '../Config/Settings';
    import { doAutocomplete } from '../DateTime/DateAbbreviations';
    import { parseTypedDateForDisplayUsingFutureDate, taskDateFormat } from '../DateTime/DateTools';
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
    let picker: DateTimePickerInstance | undefined;

    $: {
        date = doAutocomplete(date);
        parsedDate = parseTypedDateForDisplayUsingFutureDate(id, date, forwardOnly);
        isDateValid = !parsedDate.includes('invalid');
        if (isDateValid && !parsedDate.startsWith('<')) {
            pickedDate = parsedDate;
        } else if (!date) {
            pickedDate = '';
        }
    }

    function onDatePicked(e: Event) {
        if (e.target === null) {
            return;
        }
        date = pickedDate;
    }

    onMount(() => {
        if (!pickerInput) {
            return;
        }
        picker = createDateTimePicker({
            input: pickerInput,
            enableTime: getSettings().enableDateTime,
            onDateSelected: (selectedDate) => {
                pickedDate = window.moment(selectedDate).format(taskDateFormat());
                date = pickedDate;
            },
        });
    });

    onDestroy(() => picker?.destroy());

    // 'weekend' abbreviation omitted due to lack of space.
    const datePlaceholder = "Try 'Mon' or 'tm' then space";
</script>

<label for={id}>{@html labelContentWithAccessKey(id, accesskey)}</label>
<!-- svelte-ignore a11y-accesskey -->
<input
    bind:value={date}
    {id}
    type="text"
    class:tasks-modal-error={!isDateValid}
    class="tasks-modal-date-input"
    placeholder={datePlaceholder}
    {accesskey}
/>

<div class="tasks-modal-parsed-date">
    {dateSymbol}<input
        class="tasks-modal-date-editor-picker"
        type="text"
        bind:value={pickedDate}
        bind:this={pickerInput}
        id="date-editor-picker"
        on:input={onDatePicked}
        tabindex="-1"
    />
</div>
{#if !isDateValid}
    <code class="tasks-modal-parsed-date">{dateSymbol} {@html parsedDate}</code>
{/if}

<style>
</style>

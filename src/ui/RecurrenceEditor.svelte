<script lang="ts">
    import type { EditableTask } from './EditableTask';
    import { labelContentWithAccessKey } from './EditTaskHelpers';

    export let editableTask: EditableTask;
    export let isRecurrenceValid: boolean;
    export let accesskey: string | null;

    let hasCustomRecurrence: boolean;
    let recurrenceInterval: string;
    let recurrenceWhenDone: boolean;

    const recurrencePresets = [
        { label: 'Does not recur', value: '' },
        { label: 'Every 30 minutes', value: 'every 30 minutes' },
        { label: 'Every hour', value: 'every hour' },
        { label: 'Every day', value: 'every day' },
        { label: 'Every week', value: 'every week' },
        { label: 'Every month', value: 'every month' },
    ];

    function setRecurrence(rule: string, whenDone: boolean) {
        editableTask.recurrenceRule = rule ? `${rule}${whenDone ? ' when done' : ''}` : '';
    }

    function onIntervalChange(event: Event) {
        setRecurrence((event.target as HTMLSelectElement).value, recurrenceWhenDone);
    }

    function onWhenDoneChange(event: Event) {
        setRecurrence(recurrenceInterval, (event.target as HTMLInputElement).checked);
    }

    $: ({ isRecurrenceValid } = editableTask.parseAndValidateRecurrence());
    $: recurrenceInterval = editableTask.recurrenceRule.replace(/ when done$/u, '');
    $: recurrenceWhenDone = editableTask.recurrenceRule.endsWith(' when done');
    $: hasCustomRecurrence = !recurrencePresets.some((preset) => preset.value === recurrenceInterval);

</script>

<label for="recurrence">{@html labelContentWithAccessKey('Recurs', accesskey)}</label>
<!-- svelte-ignore a11y-accesskey -->
<select
    value={recurrenceInterval}
    id="recurrence"
    class:tasks-modal-error={!isRecurrenceValid}
    class="tasks-modal-recurrence-select"
    {accesskey}
    on:change={onIntervalChange}
>
    {#each recurrencePresets as preset}
        <option value={preset.value}>{preset.label}</option>
    {/each}
    {#if hasCustomRecurrence}
        <option value={recurrenceInterval}>{recurrenceInterval}</option>
    {/if}
</select>
<label class="tasks-modal-recurrence-when-done" for="recurrence-when-done">
    <input
        id="recurrence-when-done"
        type="checkbox"
        checked={recurrenceWhenDone}
        disabled={!recurrenceInterval}
        on:change={onWhenDoneChange}
    />
    When done
</label>

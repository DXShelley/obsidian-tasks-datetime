<script lang="ts">
    import { TASK_FORMATS } from '../Config/Settings';
    import type { EditableTask } from './EditableTask';
    import { labelContentWithAccessKey } from './EditTaskHelpers';

    export let editableTask: EditableTask;
    export let isRecurrenceValid: boolean;
    export let accesskey: string | null;

    let parsedRecurrence: string;

    const recurrencePresets = [
        { label: 'Choose interval...', value: '' },
        { label: 'Every 30 minutes', value: 'every 30 minutes' },
        { label: 'Every hour', value: 'every hour' },
        { label: 'Every day', value: 'every day' },
        { label: 'Every week', value: 'every week' },
        { label: 'Every month', value: 'every month' },
    ];

    function applyPreset(event: Event) {
        const value = (event.target as HTMLSelectElement).value;
        if (value) editableTask.recurrenceRule = value;
    }

    $: ({ parsedRecurrence, isRecurrenceValid } = editableTask.parseAndValidateRecurrence());

    const { recurrenceSymbol } = TASK_FORMATS.tasksPluginEmoji.taskSerializer.symbols;
</script>

<label for="recurrence">{@html labelContentWithAccessKey('Recurs', accesskey)}</label>
<!-- svelte-ignore a11y-accesskey -->
<input
    bind:value={editableTask.recurrenceRule}
    id="recurrence"
    type="text"
    class:tasks-modal-error={!isRecurrenceValid}
    class="tasks-modal-date-input"
    placeholder="Try 'every day when done'"
    {accesskey}
/>
<select class="tasks-modal-recurrence-preset" aria-label="Common recurrence intervals" on:change={applyPreset}>
    {#each recurrencePresets as preset}
        <option value={preset.value}>{preset.label}</option>
    {/each}
</select>
<code class="tasks-modal-parsed-date">{recurrenceSymbol} {@html parsedRecurrence}</code>

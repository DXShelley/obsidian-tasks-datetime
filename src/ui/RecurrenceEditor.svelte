<script lang="ts">
    import type { EditableTask } from './EditableTask';
    import { labelContentWithAccessKey } from './EditTaskHelpers';
    import { i18n } from '../i18n/i18n';

    export let editableTask: EditableTask;
    export let isRecurrenceValid: boolean;
    export let accesskey: string | null;

    let hasCustomRecurrence: boolean;
    let recurrenceInterval: string;
    let recurrenceWhenDone: boolean;

    const recurrencePresets = [
        { label: i18n.t('ui.recurrence.doesNotRecur'), value: '' },
        { label: i18n.t('ui.recurrence.every30Minutes'), value: 'every 30 minutes' },
        { label: i18n.t('ui.recurrence.everyHour'), value: 'every hour' },
        { label: i18n.t('ui.recurrence.everyDay'), value: 'every day' },
        { label: i18n.t('ui.recurrence.everyWeek'), value: 'every week' },
        { label: i18n.t('ui.recurrence.everyMonth'), value: 'every month' },
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

<label for="recurrence">{@html labelContentWithAccessKey(i18n.t('ui.taskEditor.recurs'), accesskey)}</label>
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
    {i18n.t('ui.recurrence.whenDone')}
</label>

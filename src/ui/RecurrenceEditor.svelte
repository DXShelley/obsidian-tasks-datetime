<script lang="ts">
    import type { EditableTask } from './EditableTask';
    import { labelContentWithAccessKey } from './EditTaskHelpers';
    import { getPluginLanguage, i18n } from '../i18n/i18n';
    import { Recurrence } from '../Task/Recurrence';

    export let editableTask: EditableTask;
    export let isRecurrenceValid: boolean;
    export let accesskey: string | null;

    let hasCustomRecurrence: boolean;
    let recurrenceInterval: string;
    let recurrenceWhenDone: boolean;

    const language = getPluginLanguage();
    const recurrencePresets = [
        { label: i18n.t('ui.recurrence.doesNotRecur'), value: '' },
        {
            label: i18n.t('ui.recurrence.every30Minutes'),
            value: Recurrence.localizePreset('every 30 minutes', language),
        },
        { label: i18n.t('ui.recurrence.everyHour'), value: Recurrence.localizePreset('every hour', language) },
        { label: i18n.t('ui.recurrence.everyDay'), value: Recurrence.localizePreset('every day', language) },
        { label: i18n.t('ui.recurrence.everyWeek'), value: Recurrence.localizePreset('every week', language) },
        { label: i18n.t('ui.recurrence.everyMonth'), value: Recurrence.localizePreset('every month', language) },
    ];

    function setRecurrence(rule: string, whenDone: boolean) {
        const whenDoneText = language === 'zh' ? ' 完成后计算' : ' when done';
        editableTask.recurrenceRule = rule ? `${rule}${whenDone ? whenDoneText : ''}` : '';
    }

    function onIntervalChange(event: Event) {
        setRecurrence((event.target as HTMLSelectElement).value, recurrenceWhenDone);
    }

    function onWhenDoneChange(event: Event) {
        setRecurrence(recurrenceInterval, (event.target as HTMLInputElement).checked);
    }

    $: ({ isRecurrenceValid } = editableTask.parseAndValidateRecurrence());
    $: recurrenceInterval = Recurrence.localizePreset(editableTask.recurrenceRule, language);
    $: recurrenceWhenDone = Recurrence.isWhenDone(editableTask.recurrenceRule);
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

<script lang="ts">
    import { i18n } from '../i18n/i18n';
    export let importance: 'light' | 'normal' | 'heavy';
    export let urgency: 'slow' | 'normal' | 'urgent';
    export let enabled: boolean;

    const quadrants = [
        { importance: 'heavy', urgency: 'urgent', label: i18n.t('ui.priority.importantUrgent') },
        { importance: 'heavy', urgency: 'slow', label: i18n.t('ui.priority.importantNotUrgent') },
        { importance: 'light', urgency: 'urgent', label: i18n.t('ui.priority.notImportantUrgent') },
        { importance: 'light', urgency: 'slow', label: i18n.t('ui.priority.notImportantNotUrgent') },
    ] as const;

    function choose(nextImportance: typeof importance, nextUrgency: typeof urgency) {
        importance = nextImportance;
        urgency = nextUrgency;
        enabled = true;
    }

    function clear() {
        importance = 'normal';
        urgency = 'normal';
        enabled = false;
    }
</script>

<div id="priority" class="tasks-priority-matrix" role="group" aria-label={i18n.t('ui.priority.ariaLabel')}>
    <div class="tasks-priority-heading">
        <span>{i18n.t('ui.priority.title')}</span>
        {#if enabled}
            <button type="button" class="tasks-priority-clear clickable-icon" aria-label={i18n.t('ui.priority.clear')} on:click={clear}>×</button>
        {/if}
    </div>
    <div class="tasks-priority-quadrants">
        {#each quadrants as quadrant}
            <button
                type="button"
                class:tasks-priority-selected={enabled && importance === quadrant.importance && urgency === quadrant.urgency}
                aria-pressed={enabled && importance === quadrant.importance && urgency === quadrant.urgency}
                on:click={() => choose(quadrant.importance, quadrant.urgency)}
            >{quadrant.label}</button>
        {/each}
    </div>
</div>

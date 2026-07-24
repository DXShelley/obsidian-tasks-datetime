<script lang="ts">
    export let importance: 'light' | 'normal' | 'heavy';
    export let urgency: 'slow' | 'normal' | 'urgent';
    export let enabled: boolean;

    const quadrants = [
        { importance: 'heavy', urgency: 'urgent', label: 'Important / Urgent' },
        { importance: 'heavy', urgency: 'slow', label: 'Important / Not urgent' },
        { importance: 'light', urgency: 'urgent', label: 'Not important / Urgent' },
        { importance: 'light', urgency: 'slow', label: 'Not important / Not urgent' },
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

<div id="priority" class="tasks-priority-matrix" role="group" aria-label="Importance and urgency">
    <div class="tasks-priority-heading">
        <span>Priority</span>
        {#if enabled}
            <button type="button" class="tasks-priority-clear clickable-icon" aria-label="Clear priority" on:click={clear}>×</button>
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

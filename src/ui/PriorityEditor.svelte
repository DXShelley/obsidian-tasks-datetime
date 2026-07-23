<script lang="ts">
    export let importance: 'light' | 'normal' | 'heavy';
    export let urgency: 'slow' | 'normal' | 'urgent';
    const importanceLevels = [
        { value: 'light', label: 'Light' },
        { value: 'normal', label: 'Normal' },
        { value: 'heavy', label: 'Heavy' },
    ] as const;
    const urgencyLevels = [
        { value: 'slow', label: 'Slow' },
        { value: 'normal', label: 'Normal' },
        { value: 'urgent', label: 'Urgent' },
    ] as const;

    function choose(nextImportance: typeof importance, nextUrgency: typeof urgency) {
        importance = nextImportance;
        urgency = nextUrgency;
    }
</script>

<div id="priority" class="tasks-priority-matrix" role="group" aria-label="Importance and urgency">
    <div class="tasks-priority-title">Priority</div>
    <div class="tasks-priority-axis tasks-priority-axis-x">Urgency</div>
    <div class="tasks-priority-axis tasks-priority-axis-y">Importance</div>
    <div class="tasks-priority-grid">
        {#each importanceLevels as importanceLevel}
            {#each urgencyLevels as urgencyLevel}
                <button
                    type="button"
                    class:tasks-priority-selected={importance === importanceLevel.value && urgency === urgencyLevel.value}
                    aria-pressed={importance === importanceLevel.value && urgency === urgencyLevel.value}
                    on:click={() => choose(importanceLevel.value, urgencyLevel.value)}
                >{importanceLevel.label} / {urgencyLevel.label}</button>
            {/each}
        {/each}
    </div>
</div>

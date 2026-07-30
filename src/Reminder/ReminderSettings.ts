export const maximumReminderAdvanceMinutes = 60;

/** Normalises persisted and programmatic reminder advance values to the supported range. */
export function normaliseReminderAdvanceMinutes(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(maximumReminderAdvanceMinutes, Math.max(0, Math.floor(value)));
}

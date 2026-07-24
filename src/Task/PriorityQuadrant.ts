import { Priority } from './Priority';

export type PriorityQuadrant = 'IU' | 'IN' | 'NU' | 'NN';

export const priorityQuadrantIcons: Record<PriorityQuadrant, string> = {
    IU: '🔥',
    IN: '🎯',
    NU: '⚡',
    NN: '💤',
};

export function priorityForPriorityQuadrant(quadrant: PriorityQuadrant): Priority {
    const priorities: Record<PriorityQuadrant, Priority> = {
        IU: Priority.Highest,
        IN: Priority.High,
        NU: Priority.Medium,
        NN: Priority.Lowest,
    };
    return priorities[quadrant];
}

export function priorityQuadrantForDimensions(
    importance: 'light' | 'normal' | 'heavy',
    urgency: 'slow' | 'normal' | 'urgent',
): PriorityQuadrant {
    if (importance === 'heavy' && urgency === 'urgent') return 'IU';
    if (importance === 'heavy' && urgency === 'slow') return 'IN';
    if (importance === 'light' && urgency === 'urgent') return 'NU';
    return 'NN';
}

export function dimensionsForPriorityQuadrant(quadrant: PriorityQuadrant) {
    const dimensions = {
        IU: { importance: 'heavy', urgency: 'urgent' },
        IN: { importance: 'heavy', urgency: 'slow' },
        NU: { importance: 'light', urgency: 'urgent' },
        NN: { importance: 'light', urgency: 'slow' },
    } as const;
    return dimensions[quadrant];
}

export function priorityQuadrantFromText(text: string): PriorityQuadrant | null {
    const quadrant = (Object.keys(priorityQuadrantIcons) as PriorityQuadrant[]).find((key) =>
        new RegExp(`(?:^|\\s)${priorityQuadrantIcons[key]}$`, 'u').test(text),
    );
    return quadrant ?? null;
}

export function removePriorityQuadrantMarkers(text: string): string {
    return text.replace(/\s*(?:🔥|🎯|⚡|💤)$/gu, '');
}

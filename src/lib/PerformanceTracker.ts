import { getSettings } from '../Config/Settings';
import { logging } from './logging';

/**
 * Helper class for measuring performance of code, and adding labels for profiling.
 *
 * @summary
 * When the user has **edited their Tasks plugin settings to set 'recordTimings' to true**,
 * this class will:
 *  - measure the elapsed time taken in sections of performance critical code,
 *  - write the elapsed time to the console, similar to `console.time()` and `console.timeEnd()`,
 *  - add markings to the Timing section of performance flame charts.
 * @example
 *  // How to use PerformanceTracker:
 *  const tracker = new PerformanceTracker('some descriptive text');
 *  tracker.start();
 *  // ... some slow code
 *  tracker.finish();
 */
export class PerformanceTracker {
    private readonly label: string;

    constructor(labelForPerformance: string) {
        this.label = labelForPerformance;
        this.start();
    }

    public start() {
        if (!this.recordTimings()) {
            return;
        }

        performance.mark(this.labelForStart());
    }

    public finish() {
        if (!this.recordTimings()) {
            return;
        }

        performance.mark(this.labelForEnd());

        // Measure the time between the marks
        performance.measure(this.label, this.labelForStart(), this.labelForEnd());
        this.printDuration();
    }

    private printDuration() {
        // Get all entries matching the name this.label
        const entries = performance.getEntriesByName(this.label);

        // Get the last entry, in case the operation with this label has been run more than once this session.
        const lastEntry = entries[entries.length - 1];

        // recordTimings is an explicit user opt-in, so emit at the default visible level.
        if (lastEntry) {
            logging.getLogger('tasks.performance').info(`${this.label}: ${lastEntry.duration.toFixed(2)} milliseconds`);
        } else {
            logging.getLogger('tasks.performance').info(`Measurement for ${this.label} not found`);
        }
    }

    private labelForStart() {
        return `${this.label} - start`;
    }

    private labelForEnd() {
        return `${this.label} - end`;
    }

    private recordTimings() {
        const { debugSettings } = getSettings();
        return debugSettings.recordTimings;
    }
}

import { DebugSettings } from '../../src/Config/DebugSettings';
import { resetSettings, updateSettings } from '../../src/Config/Settings';
import { PerformanceTracker } from '../../src/lib/PerformanceTracker';
import { type LogEntry, logging } from '../../src/lib/logging';

describe('PerformanceTracker', () => {
    const originalPerformance = globalThis.performance;

    beforeEach(() => {
        Object.defineProperty(globalThis, 'performance', {
            configurable: true,
            value: {
                getEntriesByName: jest.fn(() => [{ duration: 12.34 }]),
                mark: jest.fn(),
                measure: jest.fn(),
            } as unknown as Performance,
        });
    });

    afterEach(() => {
        resetSettings();
        Object.defineProperty(globalThis, 'performance', {
            configurable: true,
            value: originalPerformance,
        });
    });

    it('writes timing output through the visible plugin log level when enabled', () => {
        updateSettings({ debugSettings: new DebugSettings(false, false, true) });
        const entries: LogEntry[] = [];
        const listener = (entry: LogEntry) => entries.push(entry);
        logging.onLogEntry(listener);

        try {
            new PerformanceTracker('test timing').finish();
        } finally {
            logging.off('log', listener);
        }

        expect(entries).toContainEqual(
            expect.objectContaining({
                level: 'info',
                module: 'tasks.performance',
                message: expect.stringContaining('test timing:'),
            }),
        );
    });
});

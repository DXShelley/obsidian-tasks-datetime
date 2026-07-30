import { readFileSync } from 'fs';
import { verify } from 'approvals/lib/Providers/Jest/JestApprovals';
import type { MetadataCache, TFile, Vault, Workspace } from 'obsidian';
import { findLineNumberOfTaskToToggle, initializeFile, undoTaskReplacement } from '../../src/Obsidian/File';
import type { ListItem } from '../../src/Task/ListItem';
import type { MockTogglingDataForTesting } from '../../src/lib/MockDataCreator';

/**
 * A function to help test File.findLineNumberOfTaskToToggle()
 *
 * It uses mock data to simulate user behaviour.
 *
 * This is a fragile method of testing, but right now is better than no automated
 * testing at all.
 *
 * Input files for {@link jsonFileName} are in `tests/__test_data__/MockDataForTogglingTasks`
 * They are created by:
 *   1. setting logDataForMocking to true in File.ts.
 *   2. Running a local build on the plugin
 *   3. Showing the console
 *   4. Setting up a small markdown file with the scenario to test
 *   5. Working the steps required to make the toggle operation fail
 *   6. Grabbing the console output
 *   7. Pasting it in to a new JSON file in `tests/__test_data__/MockDataForTogglingTasks`
 *   8. Auto-formatting the JSON so that it is readable.
 * @param jsonFileName
 * @param taskLineToToggle
 * @param expectedLineNumber
 * @param actualIncorrectLineFound - optional, only needed if the wrong line would be toggled.
 */
function testFindLineNumberOfTaskToToggle(
    jsonFileName: string,
    taskLineToToggle: string,
    expectedLineNumber: number | undefined,
    actualIncorrectLineFound?: string,
) {
    // Arrange
    const data = readFileSync('tests/__test_data__/MockDataForTogglingTasks/' + jsonFileName, 'utf-8');
    const everything: MockTogglingDataForTesting = JSON.parse(data);
    expect(everything.taskData.originalMarkdown).toEqual(taskLineToToggle);

    // Act
    const originalTask = everything.taskData;
    const fileLines = everything.fileData.fileLines;
    const listItemsCache = everything.cacheData.listItemsCache;

    let errorString: string | undefined;
    const captureError = (message: string) => {
        errorString = message;
    };

    const result = findLineNumberOfTaskToToggle(
        originalTask,
        fileLines,
        listItemsCache,
        captureError.bind(errorString),
    );

    // Assert
    let descriptionOfOutcome = '';
    if (errorString !== undefined) {
        descriptionOfOutcome = errorString;
    } else if (result === undefined) {
        descriptionOfOutcome = 'Could not find line for task';
    } else {
        descriptionOfOutcome = 'Success. Line found OK. No error reported.';
    }
    verify(descriptionOfOutcome);

    if (expectedLineNumber !== undefined) {
        expect(result).not.toBeUndefined();
        expect(result).toEqual(expectedLineNumber);

        const expectedLine = actualIncorrectLineFound ? actualIncorrectLineFound : everything.taskData.originalMarkdown;
        expect(everything.fileData.fileLines[result!]).toEqual(expectedLine);
    } else {
        expect(result).toBeUndefined();
    }
}

describe('replaceTaskWithTasks', () => {
    it('valid 2-task test', () => {
        const jsonFileName = 'single_task_valid_data.json';
        const taskLineToToggle = '- [ ] #task task 2';
        const expectedLineNumber = 5;
        testFindLineNumberOfTaskToToggle(jsonFileName, taskLineToToggle, expectedLineNumber);
    });

    // --------------------------------------------------------------------------------
    // Issue 688
    it('issue 688 - block referenced task', () => {
        const jsonFileName = '688_toggle_block_referenced_line_overwrites_wrong_line.json';
        const taskLineToToggle = '- [ ] #task task2b ^ca47c7';

        const expectedLineNumber = 8;
        testFindLineNumberOfTaskToToggle(jsonFileName, taskLineToToggle, expectedLineNumber);
    });

    // --------------------------------------------------------------------------------
    // Issue 1680
    it('issue 1680 - Cannot read properties of undefined', () => {
        const jsonFileName = '1680_task_line_number_past_end_of_file.json';
        const taskLineToToggle = '- [ ] #task Section 2/Task 2';

        const expectedLineNumber = 9;
        testFindLineNumberOfTaskToToggle(jsonFileName, taskLineToToggle, expectedLineNumber);
    });

    // --------------------------------------------------------------------------------
});

describe('undoTaskReplacement', () => {
    const file = { extension: 'md', path: 'tasks.md' } as unknown as TFile;
    const originalTask = {
        file: { tFile: file },
        path: 'tasks.md',
        toFileLineString: () => '- [ ] Read vocabulary 🔁 every day',
    } as unknown as ListItem;
    const completedTask = {
        toFileLineString: () => '- [x] Read vocabulary 🔁 every day',
    } as ListItem;
    const nextTask = {
        toFileLineString: () => '- [ ] Read vocabulary 🔁 every day',
    } as ListItem;

    it('restores the original task only when the generated replacement lines are unchanged', async () => {
        const modify = jest.fn();
        const vault = {
            getFileByPath: jest.fn(() => file),
            modify,
            read: jest.fn(async () =>
                ['# Habits', completedTask.toFileLineString(), nextTask.toFileLineString()].join('\n'),
            ),
        } as unknown as Vault;
        initializeFile({ vault, metadataCache: {} as MetadataCache, workspace: {} as Workspace });

        await expect(undoTaskReplacement({ originalTask, replacementTasks: [completedTask, nextTask] })).resolves.toBe(
            true,
        );
        expect(modify).toHaveBeenCalledWith(file, ['# Habits', originalTask.toFileLineString()].join('\n'));
    });

    it('does not overwrite a replacement that has been edited', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        const modify = jest.fn();
        const vault = {
            getFileByPath: jest.fn(() => file),
            modify,
            read: jest.fn(async () => ['# Habits', completedTask.toFileLineString(), '- [ ] Changed task'].join('\n')),
        } as unknown as Vault;
        initializeFile({ vault, metadataCache: {} as MetadataCache, workspace: {} as Workspace });

        await expect(undoTaskReplacement({ originalTask, replacementTasks: [completedTask, nextTask] })).resolves.toBe(
            false,
        );
        expect(modify).not.toHaveBeenCalled();
    });
});

import { Notice, type TFile, type Vault } from 'obsidian';
import { TaskRegularExpressions } from '../Task/TaskRegularExpressions';
import { taskDateSymbolsPattern, taskDateValuePattern, upgradeTaskDateTime } from '../DateTime/TaskDateTime';

const dateWithoutTimeRegex = new RegExp(
    `(${taskDateSymbolsPattern}\\s*)(${taskDateValuePattern})(?!\\s+\\d{2}:\\d{2}:\\d{2})`,
    'gu',
);

const trailingTaskMetadataRegex = new RegExp(
    `^(?:${[
        // These expressions mirror the fields DefaultTaskSerializer can strip from a task line's end.
        `(?:${taskDateSymbolsPattern}\\s*${taskDateValuePattern})`,
        '(?:🔺|⏫|🔼|🔽|⏬|🔥|🎯|⚡|💤)\\uFE0F?',
        '#[^ !@#$%^&*(),.?":{}|<>]+',
        '🔁\\uFE0F?\\s*(?:[a-zA-Z0-9, !]+|(?:每 30 分钟|每小时|每天|每周|每月)(?: 完成后计算)?)',
        '🏁\\uFE0F?\\s*[a-zA-Z]+',
        '🆔\\uFE0F?\\s*[a-zA-Z0-9-_]+',
        '⛔\\uFE0F?\\s*[a-zA-Z0-9-_, ]+',
    ]
        .map((pattern) => `\\s*${pattern}`)
        .join('|')})*\\s*$`,
    'u',
);

function isTaskMetadataTail(value: string): boolean {
    return value.length === 0 || trailingTaskMetadataRegex.test(value);
}

/**
 * Converts legacy task fields without changing ordinary Markdown text.
 * Date-only task fields are upgraded to the canonical seconds-precision value at midnight.
 */
export function updateHistoricalTaskData(content: string): { content: string; updatedTaskCount: number } {
    let updatedTaskCount = 0;
    const lines = content.split('\n').map((line) => {
        if (!TaskRegularExpressions.taskRegex.test(line)) {
            return line;
        }

        const updatedLine = line.replace(
            dateWithoutTimeRegex,
            (match: string, prefix: string, value: string, offset: number, wholeLine: string) => {
                const trailingText = wholeLine.slice(offset + match.length);
                return isTaskMetadataTail(trailingText) ? `${prefix}${upgradeTaskDateTime(value)}` : match;
            },
        );
        if (updatedLine !== line) {
            updatedTaskCount++;
        }
        return updatedLine;
    });

    return { content: lines.join('\n'), updatedTaskCount };
}

export async function updateHistoricalTaskDataInFile(vault: Vault, file: TFile): Promise<number> {
    const updatedTaskCount = await updateHistoricalTaskDataInSingleFile(vault, file);
    new Notice(
        updatedTaskCount === 0
            ? 'No historical task data needed updating.'
            : `Updated historical data in ${updatedTaskCount} task(s).`,
    );
    return updatedTaskCount;
}

/**
 * Updates every Markdown file in the vault. Each file is changed through Vault.process(),
 * so its read-modify-write operation is atomic with respect to other vault updates.
 */
export async function updateHistoricalTaskDataInVault(
    vault: Vault,
): Promise<{ updatedFileCount: number; updatedTaskCount: number }> {
    let updatedFileCount = 0;
    let updatedTaskCount = 0;

    for (const file of vault.getMarkdownFiles()) {
        const updatedTasksInFile = await updateHistoricalTaskDataInSingleFile(vault, file);
        if (updatedTasksInFile > 0) {
            updatedFileCount++;
            updatedTaskCount += updatedTasksInFile;
        }
    }

    new Notice(
        updatedTaskCount === 0
            ? 'No historical task data needed updating in the vault.'
            : `Updated historical data in ${updatedFileCount} file(s), affecting ${updatedTaskCount} task(s).`,
    );
    return { updatedFileCount, updatedTaskCount };
}

async function updateHistoricalTaskDataInSingleFile(vault: Vault, file: TFile): Promise<number> {
    let updatedTaskCount = 0;
    await vault.process(file, (content) => {
        const result = updateHistoricalTaskData(content);
        updatedTaskCount = result.updatedTaskCount;
        return result.content;
    });
    return updatedTaskCount;
}

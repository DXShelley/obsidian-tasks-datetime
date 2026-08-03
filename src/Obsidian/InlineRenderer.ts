import type { App, MarkdownPostProcessorContext, Plugin } from 'obsidian';
import { MarkdownRenderChild } from 'obsidian';
import { GlobalFilter } from '../Config/GlobalFilter';
import { TaskLayoutComponent, TaskLayoutOptions } from '../Layout/TaskLayoutOptions';
import { QueryLayoutOptions } from '../Layout/QueryLayoutOptions';
import { TasksFile } from '../Scripting/TasksFile';
import { Task } from '../Task/Task';
import { TaskLineRenderer, createAndAppendElement, reconcileReplacementTask } from '../Renderer/TaskLineRenderer';
import { TaskLocation } from '../Task/TaskLocation';

const taskInternalReferenceFieldRegex =
    /(?:^|[ \t]+)(?:🆔\uFE0F?\s*[a-zA-Z0-9_-]+|⛔\uFE0F?\s*[a-zA-Z0-9_-]+(?:\s*,\s*[a-zA-Z0-9_-]+)*)(?=\s|$)/gu;

/**
 * Hides task IDs and dependency IDs in Reading View even when the task row
 * cannot be replaced by {@link TaskLineRenderer}, for example when another renderer owns the block.
 */
export function hideTaskIdsInReadingView(taskElement: HTMLElement): void {
    const textNodes: Text[] = [];
    const collectTextNodes = (element: Element): void => {
        for (const child of Array.from(element.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                textNodes.push(child as Text);
            } else if (
                child.nodeType === Node.ELEMENT_NODE &&
                !['INPUT', 'OL', 'UL'].includes((child as Element).tagName)
            ) {
                collectTextNodes(child as Element);
            }
        }
    };
    collectTextNodes(taskElement);

    for (const textNode of textNodes) {
        const text = textNode.textContent ?? '';
        const matches = Array.from(text.matchAll(taskInternalReferenceFieldRegex));
        if (matches.length === 0 || !textNode.parentNode) continue;

        const fragment = textNode.ownerDocument.createDocumentFragment();
        let previousMatchEnd = 0;
        for (const match of matches) {
            const matchStart = match.index;
            if (matchStart === undefined) continue;

            fragment.append(text.slice(previousMatchEnd, matchStart));
            const idElement = textNode.ownerDocument.createElement('span');
            idElement.classList.add('task-id');
            idElement.setAttribute('aria-hidden', 'true');
            idElement.textContent = match[0];
            fragment.append(idElement);
            previousMatchEnd = matchStart + match[0].length;
        }
        fragment.append(text.slice(previousMatchEnd));
        textNode.parentNode.replaceChild(fragment, textNode);
    }
}

/**
 * An inline renderer for processing and rendering tasks in the Reading View of an Obsidian file.
 *
 * This class processes task lists using the same pipeline as the {@link QueryRenderer} while modifying specific components
 * like removing the global filter and handling task formatting.
 *
 * Bug reports associated with this code: (label:"display: reading mode")
 * https://github.com/obsidian-tasks-group/obsidian-tasks/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22display%3A%20reading%20mode%22%20label%3A%22type%3A%20bug%22
 *
 * And probably also: (label:"scope: rendering of tasks")
 * https://github.com/obsidian-tasks-group/obsidian-tasks/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22type%3A%20bug%22%20label%3A%22scope%3A%20rendering%20of%20tasks%22
 *
 * See also {@link LivePreviewExtension} which handles Markdown task lines in Obsidian's Live Preview mode.
 */
export class InlineRenderer {
    private readonly app: App;

    constructor({ plugin, app }: { plugin: Plugin; app: App }) {
        this.app = app;

        plugin.registerMarkdownPostProcessor((el, ctx) => {
            plugin.app.workspace.onLayoutReady(async () => {
                await this.markdownPostProcessor(el, ctx);
            });
        });
    }

    public markdownPostProcessor = this._markdownPostProcessor.bind(this);

    /**
     * This renders a file's task list when rendered in Reading View, using roughly the same pipeline
     * of QueryRenderer (e.g. it removes the global filter and handles other formatting).
     */
    private async _markdownPostProcessor(element: HTMLElement, context: MarkdownPostProcessorContext): Promise<void> {
        // As of Obsidian 1.3.0, it is required by Obsidian to create and/or pass a Component object
        // when using its Markdown rendering methods
        const childComponent = new MarkdownRenderChild(element);
        context.addChild(childComponent);

        const allRenderedTaskElements = element.findAll('.task-list-item');
        allRenderedTaskElements.forEach((taskItem) => hideTaskIdsInReadingView(taskItem));

        const renderedElements = allRenderedTaskElements.filter((taskItem) => {
            const linesText = taskItem.textContent?.split('\n');
            if (linesText === undefined) {
                return false;
            }

            // Only the first line. Can be multiple lines if an LI element contains an UL.
            // Want to match the top level LI independently from its children.
            // There was a false positive, when the LI wasn't a task itself, but contained the
            // global filter in child LIs.
            let firstLineText: string | null = null;

            // The first line is the first line that is not empty. Empty lines can exist when
            // the checklist in markdown includes blank lines (see #313).
            for (let i = 0; i < linesText.length; i = i + 1) {
                if (linesText[i] !== '') {
                    firstLineText = linesText[i];
                    break;
                }
            }

            if (firstLineText === null) {
                return false;
            }

            return GlobalFilter.getInstance().includedIn(firstLineText);
        });
        if (renderedElements.length === 0) {
            // No tasks means nothing to do.
            return;
        }

        const path = context.sourcePath;
        const file = this.app.vault.getFileByPath(path) || undefined;
        const tasksFile = new TasksFile(path, {}, file);

        const section = context.getSectionInfo(element);

        if (section === null) {
            // We cannot process the render without the section info.
            return;
        }

        const fileLines = section.text.split('\n');

        let sectionIndex = 0;
        const fileTasks: Task[] = [];
        for (let lineNumber = section.lineStart; lineNumber <= section.lineEnd; lineNumber++) {
            const line = fileLines[lineNumber];
            if (line === undefined) {
                // If we end up outside the range of the file,
                // we cannot process this task.
                continue;
            }

            const precedingHeader = null; // We don't need the preceding header for in-line rendering.
            const task = Task.fromLine({
                line,
                taskLocation: new TaskLocation(tasksFile, lineNumber, section.lineStart, sectionIndex, precedingHeader),
                fallbackDate: null, // We don't need the fallback date for in-line rendering
            });
            if (task !== null) {
                fileTasks.push(task);
                sectionIndex++;
            }
        }

        const taskLayoutOptions = new TaskLayoutOptions();
        taskLayoutOptions.hide(TaskLayoutComponent.Id);
        taskLayoutOptions.hide(TaskLayoutComponent.DependsOn);

        const taskLineRenderer = new TaskLineRenderer({
            obsidianApp: this.app,
            obsidianComponent: childComponent,
            taskLayoutOptions,
            queryLayoutOptions: new QueryLayoutOptions(),
        });

        // The section index is the nth task within this section.
        for (let sectionIndex = 0; sectionIndex < renderedElements.length; sectionIndex++) {
            const task = fileTasks[sectionIndex];

            const renderedElement = renderedElements[sectionIndex];
            if (task === undefined || renderedElement === undefined) {
                // Assuming match of tasks in file and render preview.
                // If there is a mis-match in the numbers, we still process
                // what we can.
                continue;
            }
            const dataLine: string = renderedElement.getAttr('data-line') ?? '0';
            const taskIndex: number = Number.parseInt(dataLine, 10);
            const taskElement = createAndAppendElement('li', element);
            await taskLineRenderer.renderTaskLine({
                li: taskElement,
                task,
                taskIndex,
                isTaskInQueryFile: true,
            });

            // If the rendered element contains a sub-list or sub-div (e.g. the
            // folding arrow), we need to keep it.
            const renderedChildren = renderedElement.childNodes;
            for (let i = 0; i < renderedChildren.length; i = i + 1) {
                const renderedChild = renderedChildren[i];
                const nodeName = renderedChild.nodeName.toLowerCase();
                if (nodeName === 'div') {
                    taskElement.prepend(renderedChild);
                } else if (nodeName === 'ul' || nodeName === 'ol') {
                    taskElement.append(renderedChild);
                }
            }

            // Re-set the original footnotes.
            // The newly rendered HTML won't have the correct indexes and links
            // from the original document.
            const originalFootnotes = renderedElement.querySelectorAll('[data-footnote-id]');
            const newFootnotes = taskElement.querySelectorAll('[data-footnote-id]');
            if (originalFootnotes.length === newFootnotes.length) {
                for (let i = 0; i < originalFootnotes.length; i++) {
                    newFootnotes[i].replaceWith(originalFootnotes[i]);
                }
            }

            reconcileReplacementTask(renderedElement, taskElement);
        }
    }
}

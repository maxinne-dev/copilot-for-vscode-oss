import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service for handling workspace file operations
 */
export class FileService {
    /**
     * Reads the content of a file from the workspace
     */
    async readFileContent(filePath: string): Promise<string> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            console.error(`Failed to read file: ${filePath}`, error);
            throw new Error(`Failed to read file: ${path.basename(filePath)}`);
        }
    }

    /**
     * Gets file metadata (size, type, etc.)
     */
    async getFileInfo(filePath: string): Promise<{
        name: string;
        path: string;
        size: number;
        extension: string;
    }> {
        try {
            const stats = await fs.promises.stat(filePath);
            return {
                name: path.basename(filePath),
                path: filePath,
                size: stats.size,
                extension: path.extname(filePath).slice(1)
            };
        } catch (error) {
            console.error(`Failed to get file info: ${filePath}`, error);
            throw new Error(`Failed to get file info: ${path.basename(filePath)}`);
        }
    }

    /**
     * Reads multiple files and returns their content
     */
    async readMultipleFiles(filePaths: string[]): Promise<Array<{
        path: string;
        name: string;
        content: string;
    }>> {
        const results = await Promise.allSettled(
            filePaths.map(async (filePath) => ({
                path: filePath,
                name: path.basename(filePath),
                content: await this.readFileContent(filePath)
            }))
        );

        return results
            .filter((result): result is PromiseFulfilledResult<{
                path: string;
                name: string;
                content: string;
            }> => result.status === 'fulfilled')
            .map(result => result.value);
    }

    /**
     * Gets the current active editor's file path
     */
    getActiveFilePath(): string | undefined {
        return vscode.window.activeTextEditor?.document.uri.fsPath;
    }

    /**
     * Gets the current selection from the active editor
     */
    getActiveSelection(): string | undefined {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return undefined;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            return undefined;
        }

        return editor.document.getText(selection);
    }

    /**
     * Opens a file in the editor
     */
    async openFile(filePath: string, lineNumber?: number): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);

            if (lineNumber !== undefined && lineNumber > 0) {
                const position = new vscode.Position(lineNumber - 1, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenter
                );
            }
        } catch (error) {
            console.error(`Failed to open file: ${filePath}`, error);
            throw new Error(`Failed to open file: ${path.basename(filePath)}`);
        }
    }

    /**
     * Inserts text at the current cursor position
     */
    async insertAtCursor(text: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active editor');
        }

        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, text);
        });
    }
}

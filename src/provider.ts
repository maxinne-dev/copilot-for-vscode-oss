import * as vscode from 'vscode';
import { CopilotService } from './services/copilot-service';
import { CliService } from './services/cli-service';
import { getNonce } from './utils/nonce';
import { ClientMessage, ServerMessage, ModelOption, SessionMetadata, FileAttachment } from './types/messages';

export class AIChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'copilot-oss.sidebar';

    private _view?: vscode.WebviewView;
    private readonly _cliService: CliService;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _copilotService: CopilotService
    ) {
        this._cliService = new CliService();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        this._view = webviewView;

        // Configure webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media'),
                vscode.Uri.joinPath(this._extensionUri, 'dist'),
                vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview'),
                vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'codicons', 'dist')
            ]
        };

        // Set HTML content
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Initialize Copilot service with this webview
        this._copilotService.setWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async (message: ClientMessage) => {
                await this._handleMessage(message);
            },
            undefined
        );

        // Handle visibility changes
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._sendMessage({ type: 'viewVisible' });
            }
        });

        // Handle disposal
        webviewView.onDidDispose(() => {
            this._view = undefined;
        });
    }

    private async _handleMessage(message: ClientMessage): Promise<void> {
        switch (message.type) {
            case 'ready':
                await this._onWebviewReady();
                break;

            case 'sendMessage':
                await this._handleUserMessage(
                    message.message,
                    message.modelId,
                    message.attachments
                );
                break;

            case 'stopGeneration':
                await this._copilotService.stopGeneration();
                break;

            case 'requestFileAttachment':
                await this._handleFileAttachmentRequest();
                break;

            case 'removeAttachment':
                // Handled in webview, but log for debugging
                console.log('Attachment removed:', message.path);
                break;

            case 'requestDirectoryAttachment':
                await this._handleDirectoryAttachmentRequest();
                break;

            case 'selectModel':
                await this._copilotService.selectModel(message.modelId);
                break;

            case 'requestModels':
                await this._handleRequestModels();
                break;

            case 'newChat':
                await this.newSession();
                break;

            case 'openSettings':
                await vscode.commands.executeCommand(
                    'workbench.action.openSettings',
                    'copilot-oss'
                );
                break;

            case 'requestSessions':
                await this._handleRequestSessions();
                break;

            case 'resumeSession':
                await this._handleResumeSession(message.sessionId);
                break;

            default:
                console.warn('Unknown message type:', (message as any).type);
        }
    }

    private async _onWebviewReady(): Promise<void> {
        // Initialize the Copilot service when webview is ready
        try {
            await this._copilotService.initialize();
        } catch (error) {
            console.warn('[Provider] Copilot service initialization failed:', error);
            // Continue anyway - the UI can still be shown
        }

        // Send initial data to the webview
        const config = vscode.workspace.getConfiguration('copilot-oss');
        const defaultModel = config.get<string>('defaultModel', 'gpt-4.1');

        this._sendMessage({
            type: 'init',
            models: this._getAvailableModels(),
            history: [], // Will be loaded from webview state
            defaultModel
        });
    }

    private async _handleUserMessage(
        content: string,
        modelId: string,
        attachments: FileAttachment[]
    ): Promise<void> {
        try {
            // Add user message to chat
            const userMessageId = this._generateMessageId();
            this._sendMessage({
                type: 'addMessage',
                id: userMessageId,
                role: 'user',
                content
            });

            // Send to Copilot service
            await this._copilotService.sendMessage(content, modelId, attachments);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this._sendMessage({
                type: 'error',
                message: errorMessage
            });
        }
    }

    private async _handleFileAttachmentRequest(): Promise<void> {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: 'Attach',
            filters: {
                'Code Files': ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'go', 'rs', 'rb', 'php'],
                'Text Files': ['txt', 'md', 'json', 'yaml', 'yml', 'xml', 'html', 'css', 'scss'],
                'All Files': ['*']
            }
        });

        if (uris && uris.length > 0) {
            const files: FileAttachment[] = uris.map(uri => ({
                name: uri.path.split('/').pop() || uri.fsPath,
                path: uri.fsPath,
                type: 'file' as const,
                size: undefined // Will be determined when reading
            }));

            this._sendMessage({
                type: 'attachmentSelected',
                files
            });
        }
    }

    private async _handleDirectoryAttachmentRequest(): Promise<void> {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: true,
            canSelectFolders: true,
            canSelectFiles: false,
            openLabel: 'Attach Folder'
        });

        if (uris && uris.length > 0) {
            const folders: FileAttachment[] = uris.map(uri => ({
                name: uri.path.split('/').pop() || uri.fsPath,
                path: uri.fsPath,
                type: 'directory' as const,
                size: undefined
            }));

            this._sendMessage({
                type: 'attachmentSelected',
                files: folders
            });
        }
    }

    private _getAvailableModels() {
        // Fallback hardcoded models (used for init only)
        return [
            {
                name: 'Available Models',
                models: [
                    { id: 'gpt-4.1', name: 'GPT-4.1', multiplier: '1.0x' }
                ]
            }
        ];
    }

    private async _handleRequestModels(): Promise<void> {
        try {
            const modelIds = await this._cliService.getAvailableModels();
            const models: ModelOption[] = modelIds.map(id => ({
                id,
                name: id, // Use raw model ID as display name
                multiplier: '' // Hide multiplier for now
            }));

            this._sendMessage({
                type: 'modelsLoaded',
                models
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load models';
            this._sendMessage({
                type: 'modelsError',
                message: errorMessage
            });
        }
    }

    private async _handleRequestSessions(): Promise<void> {
        try {
            const sessions = await this._copilotService.listSessions();

            // Group sessions: Recent (last 24h, max 7) and Other Conversations
            const now = Date.now();
            const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

            // Sort by modifiedTime descending (most recent first)
            const sortedSessions = sessions.sort((a: SessionMetadata, b: SessionMetadata) => {
                const aTime = new Date(a.modifiedTime).getTime();
                const bTime = new Date(b.modifiedTime).getTime();
                return bTime - aTime;
            });

            const recentSessions: SessionMetadata[] = [];
            const otherSessions: SessionMetadata[] = [];

            for (const session of sortedSessions) {
                const modifiedTime = new Date(session.modifiedTime).getTime();
                const isWithin24Hours = modifiedTime >= twentyFourHoursAgo;

                if (isWithin24Hours && recentSessions.length < 7) {
                    recentSessions.push(session);
                } else {
                    otherSessions.push(session);
                }
            }

            this._sendMessage({
                type: 'sessionsLoaded',
                recentSessions,
                otherSessions
            });
        } catch (error) {
            console.error('[Provider] Failed to load sessions:', error);
            // Send empty lists on error
            this._sendMessage({
                type: 'sessionsLoaded',
                recentSessions: [],
                otherSessions: []
            });
        }
    }

    private async _handleResumeSession(sessionId: string): Promise<void> {
        try {
            const messages = await this._copilotService.resumeSession(sessionId);
            this._sendMessage({
                type: 'sessionResumed',
                sessionId,
                messages
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to resume session';
            this._sendMessage({
                type: 'error',
                message: errorMessage
            });
        }
    }

    /**
     * Converts a model ID like 'gpt-4.1' or 'claude-sonnet-4.5' to a display name
     * like 'GPT-4.1' or 'Claude Sonnet 4.5'
     */
    private _formatModelName(modelId: string): string {
        return modelId
            .split('-')
            .map(part => {
                // Handle known prefixes that should be uppercase
                if (part.toLowerCase() === 'gpt') return 'GPT';
                if (part.toLowerCase() === 'codex') return 'Codex';
                // Capitalize first letter of other parts
                return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join(' ');
    }

    private _sendMessage(message: ServerMessage | { type: string;[key: string]: any }): void {
        this._view?.webview.postMessage(message);
    }

    private _generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get URIs for webview resources
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets', 'index.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets', 'index.css')
        );
        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <link href="${codiconsUri}" rel="stylesheet">
    <title>Copilot Chat</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
    }

    // Public methods for commands
    public newSession(): void {
        this._copilotService.newSession();
        this._sendMessage({ type: 'clearHistory' });
    }

    public clearHistory(): void {
        this._sendMessage({ type: 'clearHistory' });
    }
}

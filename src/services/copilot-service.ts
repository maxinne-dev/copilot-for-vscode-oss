import * as vscode from 'vscode';
import * as os from 'os';

// SDK types - loaded dynamically since the SDK is ESM-only
type CopilotClient = any;
type CopilotSession = any;
type SessionEvent = any;

// Import types
import type { FileAttachment, ChatMessage, ToolEvent, ModelOption } from '../types/messages';

/**
 * Structure for grouping session events into conversation turns
 */
interface ConversationTurn {
    userMessage: any | null;
    assistantMessages: any[];
    toolExecutions: Map<string, { start?: any; complete?: any }>;
    activeModel: string | null;  // Track which model was active during this turn
}

/**
 * Service wrapper for GitHub Copilot SDK integration.
 * Handles session management, streaming, and message routing.
 * 
 * Note: The @github/copilot-sdk is an ESM-only module, so we must use
 * dynamic import() to load it in the CommonJS VS Code extension environment.
 */
export class CopilotService {
    private client: CopilotClient | null = null;
    private session: CopilotSession | null = null;
    private webview: vscode.Webview | null = null;
    private currentMessageId: string | null = null;
    private currentModel: string | null = null;
    private isInitialized = false;
    private CopilotClientClass: any = null;
    // Track pending tool calls so completion events can access tool info
    private pendingToolCalls: Map<string, { toolName: string; arguments: any }> = new Map();

    /**
     * Sets the webview instance for sending messages
     */
    setWebview(webview: vscode.Webview): void {
        this.webview = webview;
    }

    /**
     * Initializes the Copilot client and logs connection state
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Dynamic import of the ESM-only SDK
            // Use Function constructor to prevent TypeScript from compiling import() to require()
            // This is necessary because @github/copilot-sdk is ESM-only ("type": "module")
            const importDynamic = new Function('specifier', 'return import(specifier)');
            const sdk = await importDynamic('@github/copilot-sdk');
            this.CopilotClientClass = sdk.CopilotClient;

            // Determine working directory: first workspace folder or user home
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const cwd = workspaceFolders && workspaceFolders.length > 0
                ? workspaceFolders[0].uri.fsPath
                : os.homedir();
            console.log('[CopilotService] Using working directory:', cwd);

            // Create the Copilot client with the working directory
            this.client = new this.CopilotClientClass({ cwd });

            // Log initial connection state
            const initialState = this.client.getState();
            console.log('[CopilotService] Initial connection state:', initialState);

            // Start the client (connects to Copilot CLI server)
            await this.client.start();

            // Log connection state after start
            const connectedState = this.client.getState();
            console.log('[CopilotService] Connection state after start:', connectedState);

            this.isInitialized = true;
            console.log('[CopilotService] Copilot SDK initialized successfully');
        } catch (error) {
            console.error('[CopilotService] Failed to initialize Copilot client:', error);
            throw new Error('Failed to initialize Copilot SDK. Ensure Copilot CLI is installed.');
        }
    }

    /**
     * Creates a new session with the specified model
     */
    async createSession(model: string): Promise<void> {
        if (!this.client) {
            await this.initialize();
        }

        // Close existing session if any
        if (this.session) {
            await this.session.destroy();
        }

        try {
            // Create session with the SDK
            this.session = await this.client!.createSession({
                model,
                streaming: true,
            });

            // Subscribe to session events
            this.session.on(this.handleEvent.bind(this));

            // Store current model
            this.currentModel = model;

            console.log(`[CopilotService] Session created with model: ${model}`);
        } catch (error) {
            console.error('[CopilotService] Failed to create session:', error);
            throw error;
        }
    }

    /**
     * Handles events from the Copilot session
     */
    private handleEvent(event: SessionEvent): void {
        if (!this.webview) {
            return;
        }

        // Log all events for debugging
        console.log('[CopilotService] Session event:', event.type, event.data);

        switch (event.type) {
            case 'assistant.message_delta':
                // Streaming chunk
                this.webview.postMessage({
                    type: 'streamChunk',
                    messageId: this.currentMessageId,
                    content: event.data.deltaContent
                });
                break;

            case 'assistant.message':
                // Complete message
                this.webview.postMessage({
                    type: 'streamEnd',
                    messageId: this.currentMessageId,
                    content: event.data.content
                });
                break;

            case 'session.idle':
                // Generation complete
                this.webview.postMessage({
                    type: 'generationComplete'
                });
                this.currentMessageId = null;
                break;

            case 'session.usage_info':
                // Context window usage info - forward to webview for display
                const { tokenLimit, currentTokens, messagesLength } = event.data;
                const percentage = tokenLimit > 0 ? Math.round((currentTokens / tokenLimit) * 100) : 0;
                this.webview.postMessage({
                    type: 'contextUsageUpdate',
                    usage: {
                        tokenLimit,
                        currentTokens,
                        messagesLength,
                        percentage
                    }
                });
                break;

            case 'tool.execution_start':
                // Skip internal SDK tools
                if (this.isInternalTool(event.data.toolName)) {
                    break;
                }
                // Cache tool info for completion event
                this.pendingToolCalls.set(event.data.toolCallId, {
                    toolName: event.data.toolName,
                    arguments: event.data.arguments || {}
                });
                this.webview.postMessage({
                    type: 'toolEvent',
                    messageId: this.currentMessageId,
                    event: this.createToolEvent(event.data, 'loading')
                });
                break;

            case 'tool.execution_complete':
                // Get cached tool info since completion events don't include toolName
                const cachedInfo = this.pendingToolCalls.get(event.data.toolCallId);
                if (!cachedInfo) {
                    // Skip if we don't have cached info (likely an internal tool)
                    break;
                }
                // Merge cached info with completion data
                const completeData = {
                    ...event.data,
                    toolName: cachedInfo.toolName,
                    arguments: cachedInfo.arguments
                };
                this.pendingToolCalls.delete(event.data.toolCallId);
                this.webview.postMessage({
                    type: 'toolEvent',
                    messageId: this.currentMessageId,
                    event: this.createToolEvent(completeData, event.data.success ? 'success' : 'error')
                });
                break;

            case 'session.error':
                // Session error - notify user and end generation
                console.error('[CopilotService] Session error:', event.data.message);
                this.webview.postMessage({
                    type: 'error',
                    message: event.data.message || 'An error occurred during AI processing'
                });
                // Also end generation so UI doesn't hang
                this.webview.postMessage({
                    type: 'generationComplete'
                });
                this.currentMessageId = null;
                break;
        }
    }

    /**
     * Checks if a tool is an internal SDK tool that shouldn't be displayed
     */
    private isInternalTool(toolName: string): boolean {
        const internalTools = ['report_intent', 'suggest_mode'];
        return internalTools.includes(toolName);
    }

    /**
     * Creates a ToolEvent with human-readable label and details
     */
    private createToolEvent(data: any, status: 'loading' | 'success' | 'error'): any {
        const toolCallId = data.toolCallId || `tool_${Date.now()}`;
        const toolName = data.toolName || 'unknown';
        const args = data.arguments || {};
        const result = data.result || {};

        // Log for debugging file path extraction
        // if (toolName.includes('edit') || toolName.includes('write') || toolName.includes('view')) {
        //     console.log(`[CopilotService] Tool: ${toolName}, Args:`, JSON.stringify(args, null, 2));
        // }

        // Extract human-readable label and details based on tool type
        let label = toolName;
        let details: string | undefined;

        switch (toolName) {
            case 'view':  // SDK uses 'view' for file reading
            case 'read_file':
            case 'view_file':
                const viewPath = this.extractFilePath(args);
                label = status === 'loading'
                    ? `Reading ${this.getFileName(viewPath)}`
                    : `Read ${this.getFileName(viewPath)}`;
                if (result.content) {
                    const lineCount = (result.content.match(/\n/g) || []).length + 1;
                    details = `${lineCount} lines`;
                }
                break;

            case 'write_file':
            case 'write_to_file':
            case 'create_file':
                const isCreate = toolName === 'create_file' || toolName === 'write_to_file';
                const writePath = this.extractFilePath(args);
                label = status === 'loading'
                    ? `${isCreate ? 'Creating' : 'Writing'} ${this.getFileName(writePath)}`
                    : `${isCreate ? 'Create' : 'Write'} ${this.getFileName(writePath)}`;
                if (args.content) {
                    const lineCount = (args.content.match(/\n/g) || []).length + 1;
                    details = `(+${lineCount})`;
                }
                break;

            case 'edit':  // Add 'edit' as a possible tool name
            case 'edit_file':
            case 'replace_file_content':
            case 'multi_replace_file_content':
                const editPath = this.extractFilePath(args);
                label = status === 'loading'
                    ? `Editing ${this.getFileName(editPath)}`
                    : `Edit ${this.getFileName(editPath)}`;
                // Try to extract line change details from result
                if (result.linesAdded !== undefined || result.linesRemoved !== undefined) {
                    const added = result.linesAdded || 0;
                    const removed = result.linesRemoved || 0;
                    if (removed > 0) {
                        details = `(+${added} -${removed})`;
                    } else if (added > 0) {
                        details = `(+${added})`;
                    }
                }
                break;

            case 'run_command':
            case 'execute_command':
                const cmd = args.command || args.CommandLine || '';
                const truncatedCmd = cmd.length > 40 ? cmd.substring(0, 40) + '...' : cmd;
                label = status === 'loading' ? 'Running command' : 'Ran command';
                details = truncatedCmd;
                break;

            case 'grep_search':
            case 'search':
            case 'find_by_name':
                label = status === 'loading' ? `Searching` : `Searched`;
                const query = args.query || args.pattern || args.Query || args.Pattern || '';
                details = query.length > 30 ? query.substring(0, 30) + '...' : query;
                break;

            case 'list_directory':
            case 'list_dir':
                const dirPath = this.extractFilePath(args) || args.DirectoryPath || args.directory || args.dir;
                label = status === 'loading'
                    ? `Listing ${this.getFileName(dirPath)}`
                    : `Listed ${this.getFileName(dirPath)}`;
                break;

            case 'web_search':
            case 'search_web':
                label = status === 'loading' ? 'Searching web' : 'Searched web';
                details = args.query;
                break;

            default:
                // Format unknown tool names nicely
                label = status === 'loading'
                    ? toolName.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) + '...'
                    : toolName.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase());
        }

        // Handle error details
        if (status === 'error' && data.error) {
            details = data.error.message || 'Error occurred';
        }

        return {
            id: `event_${toolCallId}_${Date.now()}`,
            toolCallId,
            toolName,
            status,
            label,
            details,
            timestamp: Date.now()
        };
    }

    /**
     * Extracts file path from various possible argument field names
     */
    private extractFilePath(args: any): string {
        // Try various common field names used by different tools
        return args.path ||
            args.AbsolutePath ||
            args.TargetFile ||
            args.file ||
            args.filePath ||
            args.File ||
            args.FilePath ||
            '';
    }

    /**
     * Extracts filename from a path
     */
    private getFileName(path: string): string {
        if (!path) return 'file';
        const parts = path.replace(/\\/g, '/').split('/');
        return parts[parts.length - 1] || path;
    }

    /**
     * Sends a message to the AI
     */
    async sendMessage(prompt: string, modelId: string, attachments: FileAttachment[]): Promise<void> {
        // Ensure session exists with correct model
        if (!this.session) {
            await this.createSession(modelId);
        }

        // Generate message ID for tracking
        this.currentMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Add assistant message placeholder
        this.webview?.postMessage({
            type: 'addMessage',
            id: this.currentMessageId,
            role: 'assistant',
            content: '',
            model: modelId
        });

        try {
            // Prepare attachments for SDK format
            const sdkAttachments = attachments.map(att => ({
                type: att.type,
                path: att.path,
                displayName: att.name
            }));

            // Send to session
            await this.session.send({
                prompt,
                attachments: sdkAttachments.length > 0 ? sdkAttachments : undefined
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            this.webview?.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to send message'
            });
        }
    }


    /**
     * Stops the current generation
     */
    async stopGeneration(): Promise<void> {
        try {
            await this.session?.abort();
            console.log('[CopilotService] Generation stopped');
            this.webview?.postMessage({
                type: 'generationComplete'
            });
        } catch (error) {
            console.error('[CopilotService] Failed to stop generation:', error);
        }
    }

    /**
     * Selects a new model
     */
    async selectModel(modelId: string): Promise<void> {
        await this.createSession(modelId);
        this.webview?.postMessage({
            type: 'modelChanged',
            modelId
        });
    }

    /**
     * Creates a new session (clears context)
     */
    newSession(): void {
        this.session = null;
        this.currentMessageId = null;
    }

    /**
     * Lists all available sessions from the Copilot SDK
     */
    async listSessions(): Promise<any[]> {
        if (!this.client) {
            await this.initialize();
        }

        try {
            const sessions = await this.client!.listSessions();
            console.log('[CopilotService] Listed sessions:', sessions.length);
            console.log('[CopilotService] Sessions:', sessions);
            return sessions;
        } catch (error) {
            console.error('[CopilotService] Failed to list sessions:', error);
            // Return empty array if SDK is not available or fails
            return [];
        }
    }

    /**
     * Lists all available models from the Copilot SDK
     * Returns models with properties for categorization and display
     */
    async listModels(): Promise<ModelOption[]> {
        if (!this.client) {
            await this.initialize();
        }

        try {
            const models = await this.client!.listModels();
            console.log('[CopilotService] Listed models:', models.length);

            // Transform SDK models to ModelOption format
            const modelOptions: ModelOption[] = models.map((model: any) => ({
                id: model.id,
                name: model.name || model.id,
                multiplier: model.billing?.multiplier ? `${model.billing.multiplier}x` : '',
                isPremium: model.billing?.is_premium ?? false,
                supportsVision: model.capabilities?.supports?.vision ?? false,
                isEnabled: model.policy?.state === 'enabled',
                restrictedTo: model.billing?.restricted_to
            }));

            // Sort: enabled models first, then alphabetically by name
            modelOptions.sort((a, b) => {
                // Enabled models come first
                if (a.isEnabled !== b.isEnabled) {
                    return a.isEnabled ? -1 : 1;
                }
                // Then sort alphabetically by name
                return a.name.localeCompare(b.name);
            });

            return modelOptions;
        } catch (error) {
            console.error('[CopilotService] Failed to list models:', error);
            throw error;
        }
    }

    /**
     * Resumes an existing session by ID and returns its messages with tool events
     */
    async resumeSession(sessionId: string, modelId?: string): Promise<ChatMessage[]> {
        if (!this.client) {
            await this.initialize();
        }

        // Close existing session if any
        if (this.session) {
            await this.session.destroy();
        }

        // DON'T set currentModel from parameter - we'll detect it from the session
        // The modelId parameter is now deprecated and will be ignored
        // Store original model to restore if session resume fails
        // const originalModel = this.currentModel;

        try {
            this.session = await this.client!.resumeSession(sessionId, {
                streaming: true,
            });
            this.session.on(this.handleEvent.bind(this));
            console.log(`[CopilotService] Resumed session: ${sessionId}`);

            const models = await this.client!.listModels();
            console.log('[CopilotService] Models:', JSON.stringify(models[0], null, 2));

            // Load all events from the session
            const events = await this.session.getMessages();
            console.log('[CopilotService] Session Model:', events[0].data.selectedModel);
            const originalModel = events[0].data.selectedModel;

            // Group events into conversation turns and track model changes
            const turns: ConversationTurn[] = [];
            let currentTurn: ConversationTurn | null = null;
            let currentSessionModel: string | null = originalModel || null;

            for (const event of events) {
                switch (event.type) {
                    case 'session.model_change':
                        // Track model changes throughout the session
                        currentSessionModel = event.data.newModel;
                        console.log(`[CopilotService] Model changed to: ${currentSessionModel}`);
                        break;

                    case 'user.message':
                        // Start new conversation turn
                        currentTurn = {
                            userMessage: event,
                            assistantMessages: [],
                            toolExecutions: new Map(),
                            activeModel: currentSessionModel
                        };
                        turns.push(currentTurn);
                        break;

                    case 'assistant.message':
                        if (!currentTurn) {
                            // Edge case: assistant without user message
                            currentTurn = {
                                userMessage: null,
                                assistantMessages: [],
                                toolExecutions: new Map(),
                                activeModel: currentSessionModel
                            };
                            turns.push(currentTurn);
                        }
                        currentTurn.assistantMessages.push(event);
                        break;

                    case 'assistant.usage':
                        // Update the active model from usage events (more reliable)
                        if (event.data.model && currentTurn) {
                            currentTurn.activeModel = event.data.model;
                        }
                        break;

                    case 'tool.execution_start':
                        if (currentTurn && !this.isInternalTool(event.data.toolName)) {
                            const toolCallId = event.data.toolCallId;
                            if (!currentTurn.toolExecutions.has(toolCallId)) {
                                currentTurn.toolExecutions.set(toolCallId, {});
                            }
                            currentTurn.toolExecutions.get(toolCallId)!.start = event;
                        }
                        break;

                    case 'tool.execution_complete':
                        if (currentTurn) {
                            const toolCallId = event.data.toolCallId;
                            if (!currentTurn.toolExecutions.has(toolCallId)) {
                                currentTurn.toolExecutions.set(toolCallId, {});
                            }
                            currentTurn.toolExecutions.get(toolCallId)!.complete = event;
                        }
                        break;
                }
            }

            // Build messages with tool events from turns
            const messages: ChatMessage[] = [];
            let lastUsedModel: string | null = null;

            for (const turn of turns) {
                // Add user message if present
                if (turn.userMessage) {
                    messages.push({
                        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        role: 'user',
                        content: turn.userMessage.data.content || '',
                        timestamp: Date.now()
                    });
                }

                // Process each assistant message with its tool events
                for (const assistantEvent of turn.assistantMessages) {
                    const toolEvents: ToolEvent[] = [];

                    // Build tool events from execution pairs
                    for (const [toolCallId, execution] of turn.toolExecutions) {
                        if (execution.start) {
                            // Merge start and complete data (same as live sessions)
                            const completeData = execution.complete ? {
                                ...execution.complete.data,
                                toolName: execution.start.data.toolName,
                                arguments: execution.start.data.arguments
                            } : execution.start.data;

                            // Determine status: success, error, or loading (incomplete)
                            const status = execution.complete
                                ? (execution.complete.data.success ? 'success' : 'error')
                                : 'loading';

                            // Reuse existing createToolEvent() method
                            const toolEvent = this.createToolEvent(completeData, status);
                            toolEvents.push(toolEvent);
                        }
                    }

                    // Use the model that was active during this turn
                    const messageModel = turn.activeModel || this.currentModel || undefined;
                    if (messageModel) {
                        lastUsedModel = messageModel;
                    }

                    messages.push({
                        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        role: 'assistant',
                        content: assistantEvent.data.content || '',
                        timestamp: Date.now(),
                        model: messageModel,
                        toolEvents: toolEvents.length > 0 ? toolEvents : undefined
                    });
                }
            }

            // Filter out messages with empty content
            const validMessages = messages.filter(msg => msg.content.trim() !== '');

            // Update the current model to match the session's last used model
            if (lastUsedModel) {
                this.currentModel = lastUsedModel;
                // Notify webview to update selected model
                if (this.webview) {
                    this.webview.postMessage({
                        type: 'modelChanged',
                        modelId: lastUsedModel
                    });
                }
            }

            console.log(`[CopilotService] Loaded ${validMessages.length} messages with tool events from session (last model: ${lastUsedModel})`);
            return validMessages;
        } catch (error) {
            console.error('[CopilotService] Failed to resume session:', error);
            throw error;
        }
    }

    /**
     * Cleans up resources
     */
    async dispose(): Promise<void> {
        try {
            if (this.session) {
                await this.session.destroy();
            }
            if (this.client) {
                await this.client.stop();
            }
        } catch (error) {
            console.error('Error disposing Copilot service:', error);
        }
    }
}

import * as vscode from 'vscode';

// SDK types - loaded dynamically since the SDK is ESM-only
type CopilotClient = any;
type CopilotSession = any;
type SessionEvent = any;

// Import FileAttachment type
import type { FileAttachment } from '../types/messages';

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
    private isInitialized = false;
    private CopilotClientClass: any = null;

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

            // Create the Copilot client
            this.client = new this.CopilotClientClass();

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
        console.log('[CopilotService] Session event:', event.type);

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

            case 'tool.execution_start':
                this.webview.postMessage({
                    type: 'statusUpdate',
                    messageId: this.currentMessageId,
                    step: {
                        id: event.data.toolCallId || `tool_${Date.now()}`,
                        label: event.data.toolName,
                        status: 'loading'
                    }
                });
                break;

            case 'tool.execution_end':
                this.webview.postMessage({
                    type: 'statusUpdate',
                    messageId: this.currentMessageId,
                    step: {
                        id: event.data.toolCallId || `tool_${Date.now()}`,
                        label: event.data.toolName,
                        status: event.data.error ? 'error' : 'success'
                    }
                });
                break;
        }
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
            content: ''
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
            return sessions;
        } catch (error) {
            console.error('[CopilotService] Failed to list sessions:', error);
            // Return empty array if SDK is not available or fails
            return [];
        }
    }

    /**
     * Resumes an existing session by ID and returns its messages
     */
    async resumeSession(sessionId: string): Promise<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }[]> {
        if (!this.client) {
            await this.initialize();
        }

        // Close existing session if any
        if (this.session) {
            await this.session.destroy();
        }

        try {
            this.session = await this.client!.resumeSession(sessionId, {
                streaming: true,
            });
            this.session.on(this.handleEvent.bind(this));
            console.log(`[CopilotService] Resumed session: ${sessionId}`);

            // Load messages from the session
            const events = await this.session.getMessages();
            const messages: { id: string; role: 'user' | 'assistant'; content: string; timestamp: number }[] = [];

            for (const event of events) {
                if (event.type === 'user.message') {
                    messages.push({
                        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        role: 'user',
                        content: event.data.content || '',
                        timestamp: Date.now()
                    });
                } else if (event.type === 'assistant.message') {
                    messages.push({
                        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        role: 'assistant',
                        content: event.data.content || '',
                        timestamp: Date.now()
                    });
                }
            }

            console.log(`[CopilotService] Loaded ${messages.length} messages from session`);
            return messages;
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

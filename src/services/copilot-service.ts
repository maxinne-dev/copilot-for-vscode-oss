import * as vscode from 'vscode';

// SDK types - loaded dynamically since the SDK is ESM-only
type CopilotClient = any;
type CopilotSession = any;
type SessionEvent = any;

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

            // TODO: Add tool execution event handling when SDK types are confirmed
            // The SDK may use different event names for tool execution
        }
    }

    /**
     * Sends a message to the AI
     */
    async sendMessage(prompt: string, modelId: string, attachmentPaths: string[]): Promise<void> {
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
            // Prepare attachments
            const attachments = attachmentPaths.map(path => ({
                type: 'file' as const,
                path,
                displayName: path.split(/[\\/]/).pop() || path
            }));

            // Send to session
            // await this.session.send({
            //     prompt,
            //     attachments: attachments.length > 0 ? attachments : undefined
            // });

            // Placeholder: simulate response
            this.simulateResponse(prompt);
        } catch (error) {
            console.error('Failed to send message:', error);
            this.webview?.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to send message'
            });
        }
    }

    /**
     * Simulates a response for development/testing
     * Remove this when SDK is integrated
     */
    private simulateResponse(prompt: string): void {
        const response = `This is a simulated response to: "${prompt}"\n\nThe GitHub Copilot SDK integration is not yet complete. Once the SDK is properly installed and configured, this will show actual AI responses.\n\n**Features to expect:**\n- Streaming responses\n- Tool execution tracking\n- Multi-model support`;

        // Simulate streaming
        let index = 0;
        const chunkSize = 10;

        const interval = setInterval(() => {
            if (index >= response.length) {
                clearInterval(interval);
                this.webview?.postMessage({
                    type: 'streamEnd',
                    messageId: this.currentMessageId
                });
                this.webview?.postMessage({
                    type: 'generationComplete'
                });
                return;
            }

            const chunk = response.slice(index, index + chunkSize);
            this.webview?.postMessage({
                type: 'streamChunk',
                messageId: this.currentMessageId,
                content: chunk
            });
            index += chunkSize;
        }, 50);
    }

    /**
     * Stops the current generation
     */
    async stopGeneration(): Promise<void> {
        try {
            // await this.session?.abort();
            console.log('Generation stopped');
            this.webview?.postMessage({
                type: 'generationComplete'
            });
        } catch (error) {
            console.error('Failed to stop generation:', error);
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

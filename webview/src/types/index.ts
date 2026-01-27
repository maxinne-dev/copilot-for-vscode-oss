/**
 * Shared types for the webview
 * These mirror the extension types for consistency
 */

export interface FileAttachment {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
}

export interface ContextUsageInfo {
    tokenLimit: number;
    currentTokens: number;
    messagesLength: number;
    percentage: number;
}

export interface ProgressStep {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'success' | 'error';
}

export interface ToolEvent {
    id: string;
    toolCallId: string;
    toolName: string;
    status: 'loading' | 'success' | 'error';
    label: string;           // Human-readable description
    details?: string;        // Additional info (line count, etc.)
    timestamp: number;
}

export interface ReasoningBlock {
    reasoningId: string;
    content: string;           // Full/accumulated reasoning text
    isComplete: boolean;       // True when reasoning is finished
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    model?: string;
    attachments?: FileAttachment[];
    steps?: ProgressStep[];
    toolEvents?: ToolEvent[];
    reasoning?: ReasoningBlock;
}

export interface ModelCategory {
    name: string;
    models: ModelOption[];
}

export interface ModelOption {
    id: string;
    name: string;
    multiplier: string;
    included?: boolean;
    isPremium?: boolean;         // From billing.is_premium
    supportsVision?: boolean;    // From capabilities.supports.vision
    isEnabled?: boolean;         // From policy.state === 'enabled'
    restrictedTo?: string[];     // From billing.restricted_to
}

export interface WebviewState {
    messages: ChatMessage[];
    selectedModelId: string;
    inputValue?: string;
}

/**
 * Session metadata from Copilot SDK
 */
export interface SessionMetadata {
    sessionId: string;
    startTime: Date;
    modifiedTime: Date;
    summary?: string;
    isRemote: boolean;
}

/**
 * VSCode API type
 */
export interface VSCodeAPI {
    postMessage: (message: any) => void;
    getState: () => WebviewState | undefined;
    setState: (state: Partial<WebviewState>) => void;
}

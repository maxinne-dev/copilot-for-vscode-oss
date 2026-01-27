/**
 * Message types sent from Webview to Extension Host
 */
export type ClientMessage =
    | { type: 'ready' }
    | { type: 'sendMessage'; message: string; modelId: string; attachments: FileAttachment[] }
    | { type: 'stopGeneration' }
    | { type: 'requestFileAttachment' }
    | { type: 'removeAttachment'; path: string }
    | { type: 'requestDirectoryAttachment' }
    | { type: 'selectModel'; modelId: string }
    | { type: 'requestModels' }
    | { type: 'newChat' }
    | { type: 'openSettings' }
    | { type: 'requestSessions' }
    | { type: 'resumeSession'; sessionId: string; modelId?: string };

/**
 * Message types sent from Extension Host to Webview
 */
export type ServerMessage =
    | { type: 'init'; models: ModelCategory[]; history: ChatMessage[]; defaultModel?: string }
    | { type: 'addMessage'; id: string; role: 'user' | 'assistant'; content: string; model?: string }
    | { type: 'streamChunk'; messageId: string; content: string }
    | { type: 'streamEnd'; messageId: string }
    | { type: 'statusUpdate'; messageId: string; step: ProgressStep }
    | { type: 'toolEvent'; messageId: string; event: ToolEvent }
    | { type: 'attachmentSelected'; files: FileAttachment[] }
    | { type: 'usageUpdate'; tokens: number; cost?: number }
    | { type: 'modelChanged'; modelId: string }
    | { type: 'modelsLoaded'; models: ModelOption[] }
    | { type: 'modelsError'; message: string }
    | { type: 'error'; message: string }
    | { type: 'generationComplete' }
    | { type: 'clearHistory' }
    | { type: 'viewVisible' }
    | { type: 'sessionsLoaded'; recentSessions: SessionMetadata[]; otherSessions: SessionMetadata[] }
    | { type: 'sessionResumed'; sessionId: string; messages: ChatMessage[] }
    | { type: 'accessDenied'; reason: string };

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
 * Chat message structure
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    model?: string;
    attachments?: FileAttachment[];
    steps?: ProgressStep[];
    toolEvents?: ToolEvent[];
}

/**
 * File attachment structure
 */
export interface FileAttachment {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
}

/**
 * Progress step for AI thinking visualization
 */
export interface ProgressStep {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'success' | 'error';
}

/**
 * Tool execution event for inline display
 */
export interface ToolEvent {
    id: string;
    toolCallId: string;
    toolName: string;
    status: 'loading' | 'success' | 'error';
    label: string;           // Human-readable description (e.g., "Read utils.ts")
    details?: string;        // Additional info (e.g., "45 lines read")
    timestamp: number;
}

/**
 * Model category for grouping in selector
 */
export interface ModelCategory {
    name: string;
    models: ModelOption[];
}

/**
 * Individual model option
 */
export interface ModelOption {
    id: string;
    name: string;
    multiplier: string;
    included?: boolean;
}

/**
 * Webview state for persistence
 */
export interface WebviewState {
    messages: ChatMessage[];
    selectedModelId: string;
    inputValue: string;
}

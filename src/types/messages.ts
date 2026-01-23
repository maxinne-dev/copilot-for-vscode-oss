/**
 * Message types sent from Webview to Extension Host
 */
export type ClientMessage =
    | { type: 'ready' }
    | { type: 'sendMessage'; message: string; modelId: string; attachments: string[] }
    | { type: 'stopGeneration' }
    | { type: 'requestFileAttachment' }
    | { type: 'removeAttachment'; path: string }
    | { type: 'selectModel'; modelId: string }
    | { type: 'newChat' }
    | { type: 'openSettings' };

/**
 * Message types sent from Extension Host to Webview
 */
export type ServerMessage =
    | { type: 'init'; models: ModelCategory[]; history: ChatMessage[]; defaultModel?: string }
    | { type: 'addMessage'; id: string; role: 'user' | 'assistant'; content: string }
    | { type: 'streamChunk'; messageId: string; content: string }
    | { type: 'streamEnd'; messageId: string }
    | { type: 'statusUpdate'; messageId: string; step: ProgressStep }
    | { type: 'attachmentSelected'; files: FileAttachment[] }
    | { type: 'usageUpdate'; tokens: number; cost?: number }
    | { type: 'modelChanged'; modelId: string }
    | { type: 'error'; message: string }
    | { type: 'generationComplete' }
    | { type: 'clearHistory' }
    | { type: 'viewVisible' };

/**
 * Chat message structure
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    attachments?: FileAttachment[];
    steps?: ProgressStep[];
}

/**
 * File attachment structure
 */
export interface FileAttachment {
    name: string;
    path: string;
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

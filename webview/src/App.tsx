import { useState, useEffect, useCallback } from 'react';
import ChatPanel from './components/ChatPanel';
import { useVSCode } from './hooks/useVSCode';
import { useExtensionMessage } from './hooks/useExtensionMessage';
import type { ChatMessage, ModelCategory, FileAttachment, ModelOption, SessionMetadata } from './types';

function App() {
    const vscode = useVSCode();

    // State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [models, setModels] = useState<ModelCategory[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>('gpt-4.1');
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);

    // Welcome screen state
    const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
    const [recentSessions, setRecentSessions] = useState<SessionMetadata[]>([]);
    const [otherSessions, setOtherSessions] = useState<SessionMetadata[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [shouldHonorClearHistory, setShouldHonorClearHistory] = useState(true);

    // Restore state from webview persistence
    useEffect(() => {
        const state = vscode.getState();
        if (state) {
            if (state.messages) setMessages(state.messages);
            if (state.selectedModelId) setSelectedModelId(state.selectedModelId);
        }

        // Signal ready to extension
        vscode.postMessage({ type: 'ready' });

        // Request sessions for welcome screen
        setSessionsLoading(true);
        vscode.postMessage({ type: 'requestSessions' });
    }, [vscode]);

    // Persist state on changes
    useEffect(() => {
        vscode.setState({ messages, selectedModelId });
    }, [messages, selectedModelId, vscode]);

    // Handle messages from extension
    const handleMessage = useCallback((message: any) => {
        switch (message.type) {
            case 'init':
                setModels(message.models);
                if (message.defaultModel) {
                    setSelectedModelId(message.defaultModel);
                }
                break;

            case 'addMessage':
                setMessages(prev => [...prev, {
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    timestamp: Date.now()
                }]);
                if (message.role === 'assistant') {
                    setIsGenerating(true);
                    setStreamingMessageId(message.id);
                }
                break;

            case 'streamChunk':
                setMessages(prev => prev.map(msg =>
                    msg.id === message.messageId
                        ? { ...msg, content: msg.content + message.content }
                        : msg
                ));
                break;

            case 'streamEnd':
                setStreamingMessageId(null);
                break;

            case 'generationComplete':
                setIsGenerating(false);
                setStreamingMessageId(null);
                break;

            case 'attachmentSelected':
                setAttachments(prev => [...prev, ...message.files]);
                break;

            case 'modelChanged':
                setSelectedModelId(message.modelId);
                break;

            case 'clearHistory':
                // Only clear if we should honor this response
                if (shouldHonorClearHistory) {
                    setMessages([]);
                    setAttachments([]);
                }
                // Reset the flag
                setShouldHonorClearHistory(true);
                break;

            case 'error':
                console.error('Extension error:', message.message);
                setIsGenerating(false);
                break;

            case 'modelsLoaded':
                // Create a single category with all loaded models
                setModels([{
                    name: 'Available Models',
                    models: message.models as ModelOption[]
                }]);
                setModelsLoading(false);
                setModelsError(null);
                break;

            case 'modelsError':
                setModelsError(message.message);
                setModelsLoading(false);
                break;

            case 'sessionsLoaded':
                setRecentSessions(message.recentSessions || []);
                setOtherSessions(message.otherSessions || []);
                setSessionsLoading(false);
                break;

            case 'sessionResumed':
                // Load messages from resumed session
                if (message.messages && message.messages.length > 0) {
                    setMessages(message.messages);
                }
                // Switch to chat view
                setShowWelcomeScreen(false);
                break;
        }
    }, []);

    useExtensionMessage(handleMessage);

    // Handlers
    const handleSend = (content: string) => {
        // If sending from welcome screen, start a new session
        if (showWelcomeScreen) {
            setMessages([]); // Clear messages locally first
            setShouldHonorClearHistory(false); // Ignore the clearHistory response
            vscode.postMessage({ type: 'newChat' });
            setShowWelcomeScreen(false);
        }

        // Store current attachments for this message
        const messageAttachments = [...attachments];

        // Add user message locally with attachments
        const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setMessages(prev => [...prev, {
            id: userMessageId,
            role: 'user',
            content,
            timestamp: Date.now(),
            attachments: messageAttachments.length > 0 ? messageAttachments : undefined
        }]);

        // Send to extension with full attachment objects
        vscode.postMessage({
            type: 'sendMessage',
            message: content,
            modelId: selectedModelId,
            attachments: messageAttachments
        });
        setAttachments([]);
    };

    const handleStop = () => {
        vscode.postMessage({ type: 'stopGeneration' });
    };

    const handleAttach = () => {
        vscode.postMessage({ type: 'requestFileAttachment' });
    };

    const handleAttachFolder = () => {
        vscode.postMessage({ type: 'requestDirectoryAttachment' });
    };

    const handleRemoveAttachment = (path: string) => {
        setAttachments(prev => prev.filter(a => a.path !== path));
        vscode.postMessage({ type: 'removeAttachment', path });
    };

    const handleModelChange = (modelId: string) => {
        setSelectedModelId(modelId);
        vscode.postMessage({ type: 'selectModel', modelId });
    };

    const handleRequestModels = () => {
        setModelsLoading(true);
        setModelsError(null);
        vscode.postMessage({ type: 'requestModels' });
    };

    const handleNewChat = () => {
        vscode.postMessage({ type: 'newChat' });
        setShowWelcomeScreen(false);
    };

    const handleShowHistory = () => {
        // Request fresh sessions and show welcome screen
        setSessionsLoading(true);
        vscode.postMessage({ type: 'requestSessions' });
        setShowWelcomeScreen(true);
    };

    const handleSelectSession = (sessionId: string) => {
        vscode.postMessage({ type: 'resumeSession', sessionId });
        // Will switch to chat view when sessionResumed message is received
    };

    return (
        <ChatPanel
            messages={messages}
            models={models}
            selectedModelId={selectedModelId}
            attachments={attachments}
            isGenerating={isGenerating}
            streamingMessageId={streamingMessageId}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
            showSessionList={showWelcomeScreen}
            recentSessions={recentSessions}
            otherSessions={otherSessions}
            sessionsLoading={sessionsLoading}
            onSend={handleSend}
            onStop={handleStop}
            onAttach={handleAttach}
            onAttachFolder={handleAttachFolder}
            onRemoveAttachment={handleRemoveAttachment}
            onModelChange={handleModelChange}
            onRequestModels={handleRequestModels}
            onNewChat={handleNewChat}
            onShowHistory={handleShowHistory}
            onSelectSession={handleSelectSession}
        />
    );
}

export default App;



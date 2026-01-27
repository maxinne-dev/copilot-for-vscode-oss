import { useState, useEffect, useCallback } from 'react';
import ChatPanel from './components/ChatPanel';
import { useVSCode } from './hooks/useVSCode';
import { useExtensionMessage } from './hooks/useExtensionMessage';
import type { ChatMessage, ModelCategory, FileAttachment, ModelOption, SessionMetadata } from './types';
import AccessDeniedScreen from './components/AccessDeniedScreen';

function App() {
    const vscode = useVSCode();

    const [isBlocked, setIsBlocked] = useState(false);

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
            case 'accessDenied':
                setIsBlocked(true);
                break;

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
                    timestamp: Date.now(),
                    model: message.model
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
                // Use pre-categorized models from backend if available
                if (message.categories && message.categories.length > 0) {
                    setModels(message.categories);
                } else {
                    // Fallback: create a single category with all models
                    setModels([{
                        name: 'Available Models',
                        models: message.models as ModelOption[]
                    }]);
                }
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

                    // Extract and apply the model from the last assistant message
                    // This ensures we show the correct model immediately, without waiting for modelChanged
                    for (let i = message.messages.length - 1; i >= 0; i--) {
                        const msg = message.messages[i];
                        if (msg.role === 'assistant' && msg.model) {
                            setSelectedModelId(msg.model);
                            console.log('[App] Restored session with model:', msg.model);
                            break;
                        }
                    }
                }
                // Switch to chat view
                setShowWelcomeScreen(false);
                break;

            case 'toolEvent':
                // Add or update tool event in the current message
                setMessages(prev => prev.map(msg => {
                    if (msg.id === message.messageId) {
                        const existingEvents = msg.toolEvents || [];
                        const eventIndex = existingEvents.findIndex(e => e.toolCallId === message.event.toolCallId);

                        if (eventIndex >= 0) {
                            // Update existing event (loading -> success/error)
                            const updatedEvents = [...existingEvents];
                            updatedEvents[eventIndex] = message.event;
                            return { ...msg, toolEvents: updatedEvents };
                        } else {
                            // Add new event
                            return { ...msg, toolEvents: [...existingEvents, message.event] };
                        }
                    }
                    return msg;
                }));
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
        // Don't send modelId - let the extension detect it from the session
        vscode.postMessage({ type: 'resumeSession', sessionId });
        // Will switch to chat view and model will be updated when sessionResumed message is received
    };

    if (isBlocked) {
        return <AccessDeniedScreen />;
    }

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



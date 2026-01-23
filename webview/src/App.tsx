import { useState, useEffect, useCallback } from 'react';
import ChatPanel from './components/ChatPanel';
import { useVSCode } from './hooks/useVSCode';
import { useExtensionMessage } from './hooks/useExtensionMessage';
import type { ChatMessage, ModelCategory, FileAttachment } from './types';

function App() {
    const vscode = useVSCode();

    // State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [models, setModels] = useState<ModelCategory[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>('gpt-4.1');
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

    // Restore state from webview persistence
    useEffect(() => {
        const state = vscode.getState();
        if (state) {
            if (state.messages) setMessages(state.messages);
            if (state.selectedModelId) setSelectedModelId(state.selectedModelId);
        }

        // Signal ready to extension
        vscode.postMessage({ type: 'ready' });
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
                setMessages([]);
                setAttachments([]);
                break;

            case 'error':
                console.error('Extension error:', message.message);
                setIsGenerating(false);
                break;
        }
    }, []);

    useExtensionMessage(handleMessage);

    // Handlers
    const handleSend = (content: string) => {
        const attachmentPaths = attachments.map(a => a.path);
        vscode.postMessage({
            type: 'sendMessage',
            message: content,
            modelId: selectedModelId,
            attachments: attachmentPaths
        });
        setAttachments([]);
    };

    const handleStop = () => {
        vscode.postMessage({ type: 'stopGeneration' });
    };

    const handleAttach = () => {
        vscode.postMessage({ type: 'requestFileAttachment' });
    };

    const handleRemoveAttachment = (path: string) => {
        setAttachments(prev => prev.filter(a => a.path !== path));
        vscode.postMessage({ type: 'removeAttachment', path });
    };

    const handleModelChange = (modelId: string) => {
        setSelectedModelId(modelId);
        vscode.postMessage({ type: 'selectModel', modelId });
    };

    const handleNewChat = () => {
        vscode.postMessage({ type: 'newChat' });
    };

    return (
        <ChatPanel
            messages={messages}
            models={models}
            selectedModelId={selectedModelId}
            attachments={attachments}
            isGenerating={isGenerating}
            streamingMessageId={streamingMessageId}
            onSend={handleSend}
            onStop={handleStop}
            onAttach={handleAttach}
            onRemoveAttachment={handleRemoveAttachment}
            onModelChange={handleModelChange}
            onNewChat={handleNewChat}
        />
    );
}

export default App;

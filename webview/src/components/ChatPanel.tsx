import { useRef, useEffect, useLayoutEffect } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import HeaderBar from './HeaderBar';
import BottomBar from './BottomBar';
import type { ChatMessage, ModelCategory, FileAttachment } from '../types';
import './ChatPanel.css';

interface ChatPanelProps {
    messages: ChatMessage[];
    models: ModelCategory[];
    selectedModelId: string;
    attachments: FileAttachment[];
    isGenerating: boolean;
    streamingMessageId: string | null;
    onSend: (content: string) => void;
    onStop: () => void;
    onAttach: () => void;
    onRemoveAttachment: (path: string) => void;
    onModelChange: (modelId: string) => void;
    onNewChat: () => void;
}

export default function ChatPanel({
    messages,
    models,
    selectedModelId,
    attachments,
    isGenerating,
    streamingMessageId,
    onSend,
    onStop,
    onAttach,
    onRemoveAttachment,
    onModelChange,
    onNewChat
}: ChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const userHasScrolled = useRef(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useLayoutEffect(() => {
        if (!userHasScrolled.current && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, streamingMessageId]);

    // Detect user scroll
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
            userHasScrolled.current = !isAtBottom;
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // Reset scroll flag when generation completes
    useEffect(() => {
        if (!isGenerating) {
            userHasScrolled.current = false;
        }
    }, [isGenerating]);

    return (
        <div className="chat-panel">
            <HeaderBar onNewChat={onNewChat} />

            <div className="messages-container" ref={messagesContainerRef}>
                {messages.length === 0 ? (
                    <div className="welcome-message">
                        <div className="welcome-icon">
                            <i className="codicon codicon-sparkle"></i>
                        </div>
                        <h2>How can I help you?</h2>
                        <p className="disclaimer">
                            I'm powered by AI, so surprises and mistakes are possible.
                            Make sure to verify any generated code or suggestions.
                        </p>
                    </div>
                ) : (
                    <MessageList
                        messages={messages}
                        streamingMessageId={streamingMessageId}
                    />
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
                <InputArea
                    attachments={attachments}
                    isGenerating={isGenerating}
                    onSend={onSend}
                    onStop={onStop}
                    onAttach={onAttach}
                    onRemoveAttachment={onRemoveAttachment}
                />

                <BottomBar
                    models={models}
                    selectedModelId={selectedModelId}
                    onModelChange={onModelChange}
                />
            </div>
        </div>
    );
}

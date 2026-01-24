import { useRef, useEffect, useLayoutEffect } from 'react';
import MessageList from './MessageList';
import SessionList from './SessionList';
import InputArea from './InputArea';
import HeaderBar from './HeaderBar';
import BottomBar from './BottomBar';
import type { ChatMessage, ModelCategory, FileAttachment, SessionMetadata } from '../types';
import './ChatPanel.css';

interface ChatPanelProps {
    messages: ChatMessage[];
    models: ModelCategory[];
    selectedModelId: string;
    attachments: FileAttachment[];
    isGenerating: boolean;
    streamingMessageId: string | null;
    modelsLoading: boolean;
    modelsError: string | null;
    showSessionList: boolean;
    recentSessions: SessionMetadata[];
    otherSessions: SessionMetadata[];
    sessionsLoading: boolean;
    onSend: (content: string) => void;
    onStop: () => void;
    onAttach: () => void;
    onAttachFolder: () => void;
    onRemoveAttachment: (path: string) => void;
    onModelChange: (modelId: string) => void;
    onRequestModels: () => void;
    onNewChat: () => void;
    onShowHistory: () => void;
    onSelectSession: (sessionId: string) => void;
}

export default function ChatPanel({
    messages,
    models,
    selectedModelId,
    attachments,
    isGenerating,
    streamingMessageId,
    modelsLoading,
    modelsError,
    showSessionList,
    recentSessions,
    otherSessions,
    sessionsLoading,
    onSend,
    onStop,
    onAttach,
    onRemoveAttachment,
    onModelChange,
    onRequestModels,
    onNewChat,
    onShowHistory,
    onSelectSession,
    onAttachFolder
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

    // Determine what to show in the messages container
    const renderMessagesContent = () => {
        // If showing session list, always show it (history mode)
        if (showSessionList) {
            return (
                <SessionList
                    recentSessions={recentSessions}
                    otherSessions={otherSessions}
                    isLoading={sessionsLoading}
                    onSelectSession={onSelectSession}
                    onNewChat={onNewChat}
                />
            );
        }

        // If no messages, show default welcome message
        if (messages.length === 0) {
            return (
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
            );
        }

        // Show messages
        return (
            <MessageList
                messages={messages}
                streamingMessageId={streamingMessageId}
            />
        );
    };

    return (
        <div className="chat-panel">
            <HeaderBar onNewChat={onNewChat} onShowHistory={onShowHistory} />

            <div className="messages-container" ref={messagesContainerRef}>
                {renderMessagesContent()}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
                <InputArea
                    attachments={attachments}
                    isGenerating={isGenerating}
                    onSend={onSend}
                    onStop={onStop}
                    onAttach={onAttach}
                    onAttachFolder={onAttachFolder}
                    onRemoveAttachment={onRemoveAttachment}
                />

                <BottomBar
                    models={models}
                    selectedModelId={selectedModelId}
                    modelsLoading={modelsLoading}
                    modelsError={modelsError}
                    onModelChange={onModelChange}
                    onRequestModels={onRequestModels}
                />
            </div>
        </div>
    );
}


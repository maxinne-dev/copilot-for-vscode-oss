import { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import type { FileAttachment } from '../types';
import './InputArea.css';

interface InputAreaProps {
    attachments: FileAttachment[];
    isGenerating: boolean;
    hasMessages: boolean;
    onSend: (content: string) => void;
    onStop: () => void;
    onAttach: () => void;
    onAttachFolder: () => void;
    onRemoveAttachment: (path: string) => void;
    onSystemMessageClick: () => void;
}

export default function InputArea({
    attachments,
    isGenerating,
    hasMessages,
    onSend,
    onStop,
    onAttach,
    onAttachFolder,
    onRemoveAttachment,
    onSystemMessageClick
}: InputAreaProps) {
    const [input, setInput] = useState('');
    const [showAttachDropdown, setShowAttachDropdown] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const attachDropdownRef = useRef<HTMLDivElement>(null);

    // Focus textarea on mount
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (attachDropdownRef.current && !attachDropdownRef.current.contains(event.target as Node)) {
                setShowAttachDropdown(false);
            }
        };

        if (showAttachDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAttachDropdown]);

    const handleSubmit = () => {
        const trimmed = input.trim();
        if (trimmed && !isGenerating) {
            onSend(trimmed);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleAttachDirectory = () => {
        setShowAttachDropdown(false);
        onAttachFolder();
    };

    const handleAttachFiles = () => {
        setShowAttachDropdown(false);
        onAttach();
    };

    const canSend = input.trim().length > 0 && !isGenerating;

    return (
        <div className="input-area">
            {attachments.length > 0 && (
                <div className="attachments-bar">
                    {attachments.map((file) => (
                        <div key={file.path} className="attachment-chip">
                            <i className={`codicon ${file.type === 'directory' ? 'codicon-folder' : 'codicon-file'}`}></i>
                            <span className="attachment-name">{file.name}</span>
                            <button
                                className="remove-attachment"
                                onClick={() => onRemoveAttachment(file.path)}
                                title="Remove attachment"
                            >
                                <i className="codicon codicon-close"></i>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className={`input-wrapper ${isGenerating ? 'generating' : ''}`}>
                <TextareaAutosize
                    ref={textareaRef}
                    className="message-input"
                    placeholder="Edit files in your workspace in agent mode"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    minRows={1}
                    maxRows={10}
                    disabled={isGenerating}
                />

                <div className="input-actions">
                    {/* System message button - only enabled for new sessions */}
                    <button
                        className="attach-button"
                        onClick={onSystemMessageClick}
                        title={hasMessages ? "System message can only be set before starting a chat" : "Custom system message"}
                        disabled={isGenerating || hasMessages}
                    >
                        <i className="codicon codicon-comment-discussion-sparkle"></i>
                    </button>

                    <div className="attach-dropdown-container" ref={attachDropdownRef}>
                        <button
                            className="attach-button"
                            onClick={() => setShowAttachDropdown(!showAttachDropdown)}
                            title="Attach"
                            disabled={isGenerating}
                        >
                            <i className="codicon codicon-attach"></i>
                        </button>

                        {showAttachDropdown && (
                            <div className="attach-dropdown">
                                <button className="attach-dropdown-item" onClick={handleAttachDirectory}>
                                    <i className="codicon codicon-folder"></i>
                                    <span>Directory</span>
                                </button>
                                <button className="attach-dropdown-item" onClick={handleAttachFiles}>
                                    <i className="codicon codicon-file"></i>
                                    <span>Files</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {isGenerating ? (
                        <button
                            className="send-button stop"
                            onClick={onStop}
                            title="Stop generation"
                        >
                            <i className="codicon codicon-primitive-square"></i>
                        </button>
                    ) : (
                        <button
                            className={`send-button ${canSend ? 'active' : ''}`}
                            onClick={handleSubmit}
                            disabled={!canSend}
                            title="Send message"
                        >
                            <i className="codicon codicon-send"></i>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

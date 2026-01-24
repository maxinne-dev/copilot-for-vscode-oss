import { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import type { FileAttachment } from '../types';
import './InputArea.css';

interface InputAreaProps {
    attachments: FileAttachment[];
    isGenerating: boolean;
    onSend: (content: string) => void;
    onStop: () => void;
    onAttach: () => void;
    onAttachFolder: () => void;
    onRemoveAttachment: (path: string) => void;
}

export default function InputArea({
    attachments,
    isGenerating,
    onSend,
    onStop,
    onAttach,
    onAttachFolder,
    onRemoveAttachment
}: InputAreaProps) {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus textarea on mount
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

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
                    <button
                        className="attach-button"
                        onClick={onAttachFolder}
                        title="Attach folder"
                        disabled={isGenerating}
                    >
                        <i className="codicon codicon-folder"></i>
                    </button>

                    <button
                        className="attach-button"
                        onClick={onAttach}
                        title="Attach file"
                        disabled={isGenerating}
                    >
                        <i className="codicon codicon-attach"></i>
                    </button>

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

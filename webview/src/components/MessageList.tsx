import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ToolEventIndicator from './ToolEventIndicator';
import ReasoningBlock from './ReasoningBlock';
import type { ChatMessage } from '../types';
import './MessageList.css';

interface MessageListProps {
    messages: ChatMessage[];
    streamingMessageId: string | null;
}

export default function MessageList({ messages, streamingMessageId }: MessageListProps) {
    return (
        <div className="message-list">
            {messages.map((message) => (
                <MessageItem
                    key={message.id}
                    message={message}
                    isStreaming={message.id === streamingMessageId}
                />
            ))}
        </div>
    );
}

interface MessageItemProps {
    message: ChatMessage;
    isStreaming: boolean;
}

function MessageItem({ message, isStreaming }: MessageItemProps) {
    const { t } = useTranslation();
    const isUser = message.role === 'user';

    return (
        <div className={`message ${isUser ? 'user-message' : 'assistant-message'}`}>
            {!isUser && (
                <div className="message-avatar">
                    <i className="codicon codicon-copilot"></i>
                    {message.model && <span className="model-name">{message.model}</span>}
                </div>
            )}
            <div className="message-content">
                {isUser ? (
                    <>
                        <div className="user-text">{message.content}</div>
                        {message.attachments && message.attachments.length > 0 && (
                            <div className="message-attachments">
                                {message.attachments.map((att) => (
                                    <div key={att.path} className="message-attachment-chip">
                                        <i className={`codicon ${att.type === 'directory' ? 'codicon-folder' : 'codicon-file'}`}></i>
                                        <span className="attachment-name">{att.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Reasoning block displayed before tool events */}
                        {message.reasoning && (
                            <ReasoningBlock reasoning={message.reasoning} />
                        )}
                        {/* Tool events displayed inline before content */}
                        {message.toolEvents && message.toolEvents.length > 0 && (
                            <div className="tool-events-container">
                                {message.toolEvents.map((event) => (
                                    <ToolEventIndicator key={event.id} event={event} />
                                ))}
                            </div>
                        )}
                        <ReactMarkdown
                            components={{
                                code({ node, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeString = String(children).replace(/\n$/, '');

                                    if (match) {
                                        return (
                                            <div className="code-block-wrapper">
                                                <div className="code-block-header">
                                                    <span className="code-language">{match[1]}</span>
                                                    <button
                                                        className="copy-button"
                                                        onClick={() => navigator.clipboard.writeText(codeString)}
                                                        title={t('message.copyCode')}
                                                    >
                                                        <i className="codicon codicon-copy"></i>
                                                    </button>
                                                </div>
                                                <SyntaxHighlighter
                                                    style={vscDarkPlus}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    customStyle={{
                                                        margin: 0,
                                                        borderRadius: '0 0 4px 4px',
                                                        background: 'var(--vscode-editor-background)'
                                                    }}
                                                >
                                                    {codeString}
                                                </SyntaxHighlighter>
                                            </div>
                                        );
                                    }

                                    return (
                                        <code className="inline-code" {...props}>
                                            {children}
                                        </code>
                                    );
                                }
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                        {isStreaming && (
                            <span className="streaming-cursor">▌</span>
                        )}
                    </>
                )}
            </div>
            {isUser && (
                <div className="message-avatar user-avatar">
                    <i className="codicon codicon-comment-discussion"></i>
                </div>
            )}
            {!isStreaming && !isUser && (
                <div className="message-actions">
                    <button className="action-button" title={t('message.copy')}>
                        <i className="codicon codicon-copy"></i>
                    </button>
                    {/*<button className="action-button" title="Good response">*/}
                    {/*    <i className="codicon codicon-thumbsup"></i>*/}
                    {/*</button>*/}
                    {/*<button className="action-button" title="Bad response">*/}
                    {/*    <i className="codicon codicon-thumbsdown"></i>*/}
                    {/*</button>*/}
                </div>
            )}
        </div>
    );
}

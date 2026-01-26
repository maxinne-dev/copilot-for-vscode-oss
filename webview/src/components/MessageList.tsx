import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
    const isUser = message.role === 'user';

    return (
        <div className={`message ${isUser ? 'user-message' : 'assistant-message'}`}>
            {!isUser && (
                <div className="message-avatar">
                    <i className="codicon codicon-copilot"></i>
                    {/*  TODO: Add model's name, like "gpt-4.1", so the user can now the model responsible for the response  */}
                </div>
            )}
            <div className="message-content">
                {isUser ? (
                    <>
                        {/* TODO: Add the icon "codicon-comment-discussion-quote" to the top right to represent the user's message */}
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
                                                        title="Copy code"
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
            {!isStreaming && (
                <div className="message-actions">
                    <button className="action-button" title="Copy">
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

import type { SessionMetadata } from '../types';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
    recentSessions: SessionMetadata[];
    otherSessions: SessionMetadata[];
    isLoading: boolean;
    onSelectSession: (sessionId: string) => void;
    onNewChat: () => void;
}

/**
 * Formats a date as a relative time string (e.g., "14 hrs ago", "3 wks ago")
 */
function formatRelativeTime(date: Date): string {
    const now = Date.now();
    const timestamp = new Date(date).getTime();
    const diffMs = now - timestamp;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMinutes < 1) {
        return 'just now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes} min${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return `${diffWeeks} wk${diffWeeks !== 1 ? 's' : ''} ago`;
    }
}

/**
 * Gets a display title for the session
 * Uses summary if available, otherwise falls back to session ID
 */
function getSessionTitle(session: SessionMetadata): string {
    if (session.summary && session.summary.trim()) {
        return session.summary;
    }
    // Fallback to a truncated session ID
    return `Session ${session.sessionId.substring(0, 8)}...`;
}

export default function WelcomeScreen({
    recentSessions,
    otherSessions,
    isLoading,
    onSelectSession,
    onNewChat
}: WelcomeScreenProps) {
    const hasAnySessions = recentSessions.length > 0 || otherSessions.length > 0;

    return (
        <div className="welcome-screen">
            <h2 className="welcome-header">Select a conversation</h2>

            {isLoading && (
                <div className="loading-indicator">
                    <i className="codicon codicon-loading codicon-spin"></i>
                    <span>Loading sessions...</span>
                </div>
            )}

            {!isLoading && !hasAnySessions && (
                <div className="empty-state">
                    <div className="empty-icon">
                        <i className="codicon codicon-comment-discussion"></i>
                    </div>
                    <p>No previous conversations</p>
                    <button className="new-chat-button" onClick={onNewChat}>
                        <i className="codicon codicon-add"></i>
                        Start a new chat
                    </button>
                </div>
            )}

            {!isLoading && hasAnySessions && (
                <>
                    {recentSessions.length > 0 && (
                        <div className="session-section">
                            <h3 className="section-header">Recent</h3>
                            <ul className="session-list">
                                {recentSessions.map((session) => (
                                    <li key={session.sessionId} className="session-item">
                                        <button
                                            className="session-button"
                                            onClick={() => onSelectSession(session.sessionId)}
                                        >
                                            <span className="session-title">
                                                {getSessionTitle(session)}
                                            </span>
                                            <span className="session-meta">
                                                <span className="session-time">
                                                    {formatRelativeTime(session.modifiedTime)}
                                                </span>
                                                <i className="codicon codicon-copy session-copy-icon" title="Copy"></i>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {otherSessions.length > 0 && (
                        <div className="session-section">
                            <h3 className="section-header">Other Conversations</h3>
                            <ul className="session-list">
                                {otherSessions.slice(0, 3).map((session) => (
                                    <li key={session.sessionId} className="session-item">
                                        <button
                                            className="session-button"
                                            onClick={() => onSelectSession(session.sessionId)}
                                        >
                                            <span className="session-title">
                                                {getSessionTitle(session)}
                                            </span>
                                            <span className="session-meta">
                                                <span className="session-time">
                                                    {formatRelativeTime(session.modifiedTime)}
                                                </span>
                                                <i className="codicon codicon-copy session-copy-icon" title="Copy"></i>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {otherSessions.length > 3 && (
                                <button className="show-more-button">
                                    Show {otherSessions.length - 3} more...
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

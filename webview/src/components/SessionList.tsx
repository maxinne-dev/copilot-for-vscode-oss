import { useTranslation } from 'react-i18next';
import type { SessionMetadata } from '../types';
import './SessionList.css';

interface SessionListProps {
    recentSessions: SessionMetadata[];
    otherSessions: SessionMetadata[];
    isLoading: boolean;
    onSelectSession: (sessionId: string) => void;
    onNewChat: () => void;
}

/**
 * Formats a date as a relative time string using i18n
 */
function useRelativeTimeFormatter() {
    const { t } = useTranslation();

    return (date: Date): string => {
        const now = Date.now();
        const timestamp = new Date(date).getTime();
        const diffMs = now - timestamp;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);

        if (diffMinutes < 1) {
            return t('time.justNow');
        } else if (diffMinutes < 60) {
            return t(diffMinutes === 1 ? 'time.minutesAgo' : 'time.minutesAgo_plural', { count: diffMinutes });
        } else if (diffHours < 24) {
            return t(diffHours === 1 ? 'time.hoursAgo' : 'time.hoursAgo_plural', { count: diffHours });
        } else if (diffDays < 7) {
            return t(diffDays === 1 ? 'time.daysAgo' : 'time.daysAgo_plural', { count: diffDays });
        } else {
            return t(diffWeeks === 1 ? 'time.weeksAgo' : 'time.weeksAgo_plural', { count: diffWeeks });
        }
    };
}

/**
 * Gets a display title for the session
 */
function useSessionTitle() {
    const { t } = useTranslation();

    return (session: SessionMetadata): string => {
        if (session.summary && session.summary.trim()) {
            return session.summary;
        }
        return t('welcome.session', { id: session.sessionId.substring(0, 8) });
    };
}

export default function SessionList({
    recentSessions,
    otherSessions,
    isLoading,
    onSelectSession,
    onNewChat
}: SessionListProps) {
    const { t } = useTranslation();
    const formatRelativeTime = useRelativeTimeFormatter();
    const getSessionTitle = useSessionTitle();
    const hasAnySessions = recentSessions.length > 0 || otherSessions.length > 0;

    return (
        <div className="session-list-container">
            <h2 className="session-list-header">{t('welcome.selectConversation')}</h2>

            {isLoading && (
                <div className="loading-indicator">
                    <i className="codicon codicon-loading codicon-spin"></i>
                    <span>{t('welcome.loadingSessions')}</span>
                </div>
            )}

            {!isLoading && !hasAnySessions && (
                <div className="empty-state">
                    <div className="empty-icon">
                        <i className="codicon codicon-comment-discussion"></i>
                    </div>
                    <p>{t('welcome.noPreviousConversations')}</p>
                    <button className="new-chat-button" onClick={onNewChat}>
                        <i className="codicon codicon-add"></i>
                        {t('welcome.startNewChat')}
                    </button>
                </div>
            )}

            {!isLoading && hasAnySessions && (
                <>
                    {recentSessions.length > 0 && (
                        <div className="session-section">
                            <h3 className="section-header">{t('welcome.recent')}</h3>
                            <ul className="session-items">
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
                                                <i className="codicon codicon-copy session-copy-icon" title={t('welcome.copy')}></i>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {otherSessions.length > 0 && (
                        <div className="session-section">
                            <h3 className="section-header">{t('welcome.otherConversations')}</h3>
                            <ul className="session-items">
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
                                                <i className="codicon codicon-copy session-copy-icon" title={t('welcome.copy')}></i>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {otherSessions.length > 3 && (
                                <button className="show-more-button">
                                    {t('welcome.showMore', { count: otherSessions.length - 3 })}
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

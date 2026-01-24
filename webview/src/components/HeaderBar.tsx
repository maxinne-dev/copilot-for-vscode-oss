import { useTranslation } from 'react-i18next';
import './HeaderBar.css';

interface HeaderBarProps {
    onNewChat: () => void;
    onShowHistory: () => void;
}

export default function HeaderBar({ onNewChat, onShowHistory }: HeaderBarProps) {
    const { t } = useTranslation();

    return (
        <div className="header-bar">
            <span className="session-title">{t('header.title')}</span>
            <div className="header-actions">
                {/* <button
                    className="icon-button"
                    title="Attach file"
                    aria-label="Attach file"
                >
                    <i className="codicon codicon-attach"></i>
                </button> */}
                <button
                    className="icon-button"
                    title={t('header.history')}
                    aria-label={t('header.history')}
                    onClick={onShowHistory}
                >
                    <i className="codicon codicon-history"></i>
                </button>
                <button
                    className="icon-button"
                    title={t('header.newChat')}
                    aria-label={t('header.newChat')}
                    onClick={onNewChat}
                >
                    <i className="codicon codicon-add"></i>
                </button>
            </div>
        </div>
    );
}

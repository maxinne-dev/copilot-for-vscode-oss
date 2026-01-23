import './HeaderBar.css';

interface HeaderBarProps {
    onNewChat: () => void;
}

export default function HeaderBar({ onNewChat }: HeaderBarProps) {
    return (
        <div className="header-bar">
            <span className="session-title">New Agent Session</span>
            <div className="header-actions">
                <button
                    className="icon-button"
                    title="Attach file"
                    aria-label="Attach file"
                >
                    <i className="codicon codicon-attach"></i>
                </button>
                <button
                    className="icon-button"
                    title="Chat history"
                    aria-label="Chat history"
                >
                    <i className="codicon codicon-history"></i>
                </button>
                <button
                    className="icon-button"
                    title="New chat"
                    aria-label="New chat"
                    onClick={onNewChat}
                >
                    <i className="codicon codicon-add"></i>
                </button>
            </div>
        </div>
    );
}

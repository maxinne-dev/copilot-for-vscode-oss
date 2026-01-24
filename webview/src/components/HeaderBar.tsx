import './HeaderBar.css';

interface HeaderBarProps {
    onNewChat: () => void;
    onShowHistory: () => void;
}

export default function HeaderBar({ onNewChat, onShowHistory }: HeaderBarProps) {
    return (
        <div className="header-bar">
            <span className="session-title">Copilot for OSS</span>
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
                    title="Chat history"
                    aria-label="Chat history"
                    onClick={onShowHistory}
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


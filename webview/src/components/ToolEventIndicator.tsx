import type { ToolEvent } from '../types';
import './ToolEventIndicator.css';

interface ToolEventIndicatorProps {
    event: ToolEvent;
}

export default function ToolEventIndicator({ event }: ToolEventIndicatorProps) {
    const getStatusIcon = () => {
        switch (event.status) {
            case 'loading':
                return <i className="codicon codicon-loading codicon-modifier-spin" />;
            case 'success':
                return <i className="codicon codicon-check status-success" />;
            case 'error':
                return <i className="codicon codicon-error status-error" />;
            default:
                return <i className="codicon codicon-circle-outline" />;
        }
    };

    return (
        <div className={`tool-event-indicator ${event.status}`}>
            <span className="tool-event-icon">{getStatusIcon()}</span>
            <span className="tool-event-label">{event.label}</span>
            {event.details && (
                <span className="tool-event-details">{event.details}</span>
            )}
        </div>
    );
}

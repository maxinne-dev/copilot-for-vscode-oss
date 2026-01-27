import './ContextUsageIndicator.css';

interface ContextUsageInfo {
    tokenLimit: number;
    currentTokens: number;
    messagesLength: number;
    percentage: number;
}

interface ContextUsageIndicatorProps {
    usage: ContextUsageInfo | null;
}

export default function ContextUsageIndicator({ usage }: ContextUsageIndicatorProps) {
    if (!usage) {
        return (
            <div className="context-usage-indicator no-data">
                <span className="context-usage-text">No context data</span>
            </div>
        );
    }

    const { percentage, currentTokens, tokenLimit, messagesLength } = usage;

    // Determine color class based on usage percentage
    const getColorClass = () => {
        if (percentage >= 80) return 'usage-critical';
        if (percentage >= 50) return 'usage-warning';
        return 'usage-normal';
    };

    // Format token numbers for display (e.g., 12345 -> "12.3k")
    const formatTokens = (num: number): string => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}k`;
        }
        return num.toString();
    };

    // SVG circle parameters for the mini chart
    const radius = 6;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const tooltipContent = `Context Usage: ${percentage}%\n${formatTokens(currentTokens)} / ${formatTokens(tokenLimit)} tokens\n${messagesLength} messages`;

    return (
        <div
            className={`context-usage-indicator ${getColorClass()}`}
            title={tooltipContent}
        >
            <svg className="context-usage-chart" width="16" height="16" viewBox="0 0 16 16">
                {/* Background circle */}
                <circle
                    className="chart-background"
                    cx="8"
                    cy="8"
                    r={radius}
                    fill="none"
                    strokeWidth="2.5"
                />
                {/* Progress circle */}
                <circle
                    className="chart-progress"
                    cx="8"
                    cy="8"
                    r={radius}
                    fill="none"
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 8 8)"
                />
            </svg>
            <span className="context-usage-text">{percentage}% used</span>
        </div>
    );
}

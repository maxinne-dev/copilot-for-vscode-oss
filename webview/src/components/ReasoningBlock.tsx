import { useRef, useEffect, useState } from 'react';
import type { ReasoningBlock as ReasoningBlockType } from '../types';
import './ReasoningBlock.css';

interface ReasoningBlockProps {
    reasoning: ReasoningBlockType;
}

export default function ReasoningBlock({ reasoning }: ReasoningBlockProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-scroll to bottom when streaming
    useEffect(() => {
        if (!reasoning.isComplete && contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [reasoning.content, reasoning.isComplete]);

    if (reasoning.isComplete) {
        // Collapsed state with expand/collapse toggle
        return (
            <div className="reasoning-block collapsed">
                <button
                    className="reasoning-toggle"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                >
                    <i className="codicon codicon-sparkle reasoning-icon" />
                    <span className="reasoning-label">Thought for a moment</span>
                    <i className={`codicon ${isExpanded ? 'codicon-chevron-up' : 'codicon-chevron-down'} reasoning-chevron`} />
                </button>
                {isExpanded && (
                    <div className="reasoning-content expanded">
                        {reasoning.content}
                    </div>
                )}
            </div>
        );
    }

    // Streaming state with max 5 visible lines
    return (
        <div className="reasoning-block streaming">
            <div className="reasoning-header">
                <i className="codicon codicon-loading codicon-modifier-spin reasoning-icon" />
                <span className="reasoning-label">Thinking...</span>
            </div>
            <div
                ref={contentRef}
                className="reasoning-content streaming-content"
            >
                {reasoning.content}
            </div>
        </div>
    );
}

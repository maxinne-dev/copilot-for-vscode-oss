import { useState, useRef, useEffect } from 'react';
import type { ModelCategory } from '../types';
import './ModelSelector.css';

interface ModelSelectorProps {
    models: ModelCategory[];
    selectedModelId: string;
    onModelChange: (modelId: string) => void;
}

export default function ModelSelector({
    models,
    selectedModelId,
    onModelChange
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Find selected model name
    const selectedModel = models
        .flatMap(cat => cat.models)
        .find(m => m.id === selectedModelId);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const handleSelect = (modelId: string) => {
        onModelChange(modelId);
        setIsOpen(false);
    };

    return (
        <div className="model-selector" ref={containerRef}>
            <button
                className="model-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span>{selectedModel?.name || selectedModelId}</span>
                <i className="codicon codicon-chevron-down"></i>
            </button>

            {isOpen && (
                <div className="model-dropdown" role="listbox">
                    {models.map((category) => (
                        <div key={category.name} className="model-category">
                            <div className="category-header">{category.name}</div>
                            {category.models.map((model) => (
                                <button
                                    key={model.id}
                                    className={`model-option ${model.id === selectedModelId ? 'selected' : ''}`}
                                    onClick={() => handleSelect(model.id)}
                                    role="option"
                                    aria-selected={model.id === selectedModelId}
                                >
                                    <span className="model-name">{model.name}</span>
                                    <span className={`model-multiplier ${model.included ? 'included' : ''}`}>
                                        {model.included ? 'included' : model.multiplier}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ))}

                    <div className="dropdown-footer">
                        <button className="manage-models-link">
                            Manage models...
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

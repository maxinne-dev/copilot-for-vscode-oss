import { useState, useRef, useEffect } from 'react';
import type { ModelCategory } from '../types';
import './ModelSelector.css';

interface ModelSelectorProps {
    models: ModelCategory[];
    selectedModelId: string;
    modelsLoading: boolean;
    modelsError: string | null;
    onModelChange: (modelId: string) => void;
    onRequestModels: () => void;
}

export default function ModelSelector({
    models,
    selectedModelId,
    modelsLoading,
    modelsError,
    onModelChange,
    onRequestModels
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasRequestedModels = useRef(false);

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

    const handleToggle = () => {
        const newIsOpen = !isOpen;
        setIsOpen(newIsOpen);

        // Request models when opening dropdown (on demand)
        if (newIsOpen && !hasRequestedModels.current) {
            hasRequestedModels.current = true;
            onRequestModels();
        }
    };

    const handleSelect = (modelId: string) => {
        onModelChange(modelId);
        setIsOpen(false);
    };

    const handleRetry = () => {
        onRequestModels();
    };

    return (
        <div className="model-selector" ref={containerRef}>
            <button
                className="model-trigger"
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span>{selectedModel?.name || selectedModelId}</span>
                <i className="codicon codicon-chevron-down"></i>
            </button>

            {isOpen && (
                <div className="model-dropdown" role="listbox">
                    {modelsLoading ? (
                        <div className="models-loading">
                            <i className="codicon codicon-loading codicon-modifier-spin"></i>
                            <span>Loading models...</span>
                        </div>
                    ) : modelsError ? (
                        <div className="models-error">
                            <i className="codicon codicon-error"></i>
                            <span>{modelsError}</span>
                            <button className="retry-button" onClick={handleRetry}>
                                <i className="codicon codicon-refresh"></i>
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
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
                                            {model.multiplier && (
                                                <span className={`model-multiplier ${model.included ? 'included' : ''}`}>
                                                    {model.included ? 'included' : model.multiplier}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

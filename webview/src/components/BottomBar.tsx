import ModelSelector from './ModelSelector';
import type { ModelCategory } from '../types';
import './BottomBar.css';

interface BottomBarProps {
    models: ModelCategory[];
    selectedModelId: string;
    onModelChange: (modelId: string) => void;
}

export default function BottomBar({
    models,
    selectedModelId,
    onModelChange
}: BottomBarProps) {
    return (
        <div className="bottom-bar">
            <div className="mode-selector">
                <button className="mode-button">
                    <span>Ask</span>
                    <i className="codicon codicon-chevron-down"></i>
                </button>
            </div>

            <ModelSelector
                models={models}
                selectedModelId={selectedModelId}
                onModelChange={onModelChange}
            />
        </div>
    );
}

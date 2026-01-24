import ModelSelector from './ModelSelector';
import type { ModelCategory } from '../types';
import './BottomBar.css';

interface BottomBarProps {
    models: ModelCategory[];
    selectedModelId: string;
    modelsLoading: boolean;
    modelsError: string | null;
    onModelChange: (modelId: string) => void;
    onRequestModels: () => void;
}

export default function BottomBar({
    models,
    selectedModelId,
    modelsLoading,
    modelsError,
    onModelChange,
    onRequestModels
}: BottomBarProps) {
    return (
        <div className="bottom-bar">
            {/* <div className="attach-button-container">
                <button className="attach-button" title="Attach files">
                    <i className="codicon codicon-attach"></i>
                </button>
            </div> */}

            <ModelSelector
                models={models}
                selectedModelId={selectedModelId}
                modelsLoading={modelsLoading}
                modelsError={modelsError}
                onModelChange={onModelChange}
                onRequestModels={onRequestModels}
            />
        </div>
    );
}

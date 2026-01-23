import { createContext, useContext, ReactNode, useMemo } from 'react';
import type { VSCodeAPI } from '../types';

// Declare the global acquireVsCodeApi function
declare function acquireVsCodeApi(): VSCodeAPI;

// Fallback for development outside VSCode
const mockVSCodeAPI: VSCodeAPI = {
    postMessage: (message) => console.log('VSCode postMessage:', message),
    getState: () => undefined,
    setState: (state) => console.log('VSCode setState:', state)
};

const VSCodeContext = createContext<VSCodeAPI | null>(null);

interface VSCodeProviderProps {
    children: ReactNode;
}

/**
 * Provider component that acquires and provides the VSCode API.
 * The API can only be acquired once, so this ensures it's safely managed.
 */
export function VSCodeProvider({ children }: VSCodeProviderProps) {
    const vscode = useMemo(() => {
        // Check if we're in a VSCode webview environment
        if (typeof acquireVsCodeApi !== 'undefined') {
            // Check if already acquired (for HMR in development)
            if ((window as any).__vscode) {
                return (window as any).__vscode as VSCodeAPI;
            }
            const api = acquireVsCodeApi();
            (window as any).__vscode = api;
            return api;
        }
        // Return mock for development outside VSCode
        console.warn('Running outside VSCode webview, using mock API');
        return mockVSCodeAPI;
    }, []);

    return (
        <VSCodeContext.Provider value={vscode}>
            {children}
        </VSCodeContext.Provider>
    );
}

/**
 * Hook to access the VSCode API from any component.
 */
export function useVSCode(): VSCodeAPI {
    const context = useContext(VSCodeContext);
    if (!context) {
        throw new Error('useVSCode must be used within a VSCodeProvider');
    }
    return context;
}

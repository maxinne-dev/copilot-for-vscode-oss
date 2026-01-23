import { useEffect, useCallback } from 'react';

/**
 * Hook to listen for messages from the extension host.
 * @param handler - Callback function to handle incoming messages
 */
export function useExtensionMessage(handler: (message: any) => void) {
    const stableHandler = useCallback(handler, [handler]);

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            stableHandler(event.data);
        };

        window.addEventListener('message', listener);

        return () => {
            window.removeEventListener('message', listener);
        };
    }, [stableHandler]);
}

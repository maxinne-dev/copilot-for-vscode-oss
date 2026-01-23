import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './', // Relative paths for webview
    build: {
        outDir: '../dist/webview',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                // No hash in filenames for predictable paths
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    }
});

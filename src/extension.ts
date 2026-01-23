import * as vscode from 'vscode';
import { AIChatViewProvider } from './provider';
import { CopilotService } from './services/copilot-service';

let copilotService: CopilotService | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Chat Plugin is now active');

    // Initialize the Copilot service
    copilotService = new CopilotService();

    // Create and register the webview provider
    const provider = new AIChatViewProvider(context.extensionUri, copilotService);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            AIChatViewProvider.viewType,
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: false // Use state serialization instead
                }
            }
        )
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('aiChat.newSession', () => {
            provider.newSession();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aiChat.clearHistory', () => {
            provider.clearHistory();
        })
    );

    console.log('AI Chat Plugin registered successfully');
}

export function deactivate() {
    copilotService?.dispose();
    console.log('AI Chat Plugin deactivated');
}

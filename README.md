# AI Chat Plugin for VSCode OSS

An AI chat plugin for Visual Studio Code OSS 1.104.0 that provides a sidebar-based conversational interface with AI models using the GitHub Copilot SDK.

## Features

- **Sidebar Integration**: Activity bar icon to open the chat panel
- **Chat Interface**: Full-featured message history with markdown rendering
- **Auto-expanding Input**: Smart textarea that grows with content
- **Model Selection**: Dropdown to switch between AI models
- **File Attachments**: Attach workspace files as context
- **Streaming Responses**: Real-time token streaming with visual feedback
- **Theme Support**: Automatic adaptation to VS Code themes

## Requirements

- Visual Studio Code OSS 1.104.0 or higher
- Node.js 18+
- GitHub Copilot subscription (for SDK integration)
- Copilot CLI installed (`copilot --version`)

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd copilot-for-vscode-oss
   ```

2. Install dependencies:
   ```bash
   npm install
   cd webview && npm install && cd ..
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

### Development

Run in development mode with hot reloading:

```bash
npm run dev
```

Press `F5` in VS Code to launch the Extension Development Host.

### Project Structure

```
copilot-for-vscode-oss/
├── .vscode/                    # VS Code configuration
│   ├── launch.json             # Debug configuration
│   └── tasks.json              # Build tasks
├── media/                      # Static assets
│   └── chat-icon.svg           # Activity bar icon
├── src/                        # Extension backend (TypeScript)
│   ├── extension.ts            # Activation entry point
│   ├── provider.ts             # WebviewViewProvider
│   ├── services/
│   │   ├── copilot-service.ts  # Copilot SDK wrapper
│   │   └── file-service.ts     # File operations
│   ├── types/
│   │   └── messages.ts         # Message protocol types
│   └── utils/
│       └── nonce.ts            # CSP nonce generator
├── webview/                    # React frontend
│   ├── src/
│   │   ├── App.tsx             # Main app component
│   │   ├── main.tsx            # Entry point
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── styles/             # Global CSS
│   │   └── types/              # TypeScript types
│   ├── vite.config.ts          # Vite configuration
│   └── package.json            # Frontend dependencies
├── package.json                # Extension manifest
├── tsconfig.json               # TypeScript config
└── README.md                   # This file
```

## Configuration

The extension provides the following settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `aiChat.defaultModel` | `gpt-4.1` | Default AI model for new sessions |
| `aiChat.apiProvider` | `copilot` | AI provider (copilot, openai, etc.) |

## Commands

| Command | Description |
|---------|-------------|
| `aiChat.newSession` | Start a new chat session |
| `aiChat.clearHistory` | Clear chat history |

## Architecture

The extension follows a multi-process architecture:

1. **Extension Host**: Runs TypeScript code, handles API calls
2. **Webview**: React app for UI rendering
3. **Communication**: Message-based IPC between processes

See the technical specification for detailed architecture documentation.

## License

MIT

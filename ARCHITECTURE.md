# AI Desktop Assistant - Architecture

## System Architecture

The AI Desktop Assistant consists of three main components that work together to provide remote AI-powered control of your desktop:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Mobile Device  │◄────►│  Web Server     │◄────►│  Desktop Client │
│  (Web Browser)  │      │  (Next.js)      │      │  (Node.js)      │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                 ▲
                                 │
                                 ▼
                         ┌─────────────────┐
                         │                 │
                         │   AI Providers  │
                         │ (Gemini/Ollama) │
                         │                 │
                         └─────────────────┘
```

### 1. Mobile Interface (Web Browser)

The user interacts with the system through a mobile-friendly web interface that:
- Provides a chat-like interface for sending prompts
- Allows selection between AI providers
- Displays responses from the AI
- Shows status of commands executed on the desktop

### 2. Web Server (Next.js)

The web server handles:
- Serving the web application to mobile devices
- Processing API requests from the mobile interface
- Communicating with AI providers (Gemini/Ollama)
- Sending commands to the desktop client via WebSockets
- Receiving and relaying command execution results

### 3. Desktop Client (Node.js)

The desktop client runs on the user's computer and:
- Listens for commands from the web server
- Executes actions on the desktop (file creation, app launching, etc.)
- Sends execution results back to the web server
- Provides a local control panel for monitoring and configuration

### 4. AI Providers

The system integrates with two AI providers:
- **Google Gemini API**: Cloud-based AI service from Google
- **Ollama API**: Local AI model that can run on the desktop

## Data Flow

1. User sends a prompt from their mobile device
2. Web server receives the prompt and forwards it to the selected AI provider
3. AI provider processes the prompt and generates a response
4. Web server analyzes the response to determine required desktop actions
5. Web server sends command(s) to the desktop client
6. Desktop client executes the command(s) on the user's computer
7. Desktop client sends execution results back to the web server
8. Web server relays the results to the mobile interface
9. User sees the AI response and status of desktop actions

## Security Model

- WebSocket communication between web server and desktop client
- Local authentication for desktop client control panel
- API keys for AI provider authentication
- Workspace isolation for file operations

## Extensibility

The system is designed to be extensible:
- New AI providers can be added by implementing the provider interface
- Additional desktop commands can be added to the command processor
- The mobile interface can be enhanced with new features and UI improvements

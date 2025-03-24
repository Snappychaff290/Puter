# AI Desktop Assistant - Installation and Usage Guide

## Overview

AI Desktop Assistant is an application that allows you to control your desktop computer remotely through AI prompts sent from a mobile device. The application consists of two main components:

1. **Web Application**: A mobile-friendly web interface where you can input prompts and select AI providers
2. **Desktop Client**: A Node.js application that runs on your desktop computer and executes commands

## System Requirements

### Web Application
- Node.js 16.x or higher
- Internet connection

### Desktop Client
- Node.js 16.x or higher
- Windows, macOS, or Linux operating system

## Installation Instructions

### 1. Web Application Setup

1. Extract the web application files to a directory of your choice
2. Open a terminal/command prompt and navigate to the web application directory
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```
5. For production deployment:
   ```
   npm run build
   npm start
   ```

### 2. Desktop Client Setup

1. Extract the desktop client files to a directory on your desktop computer
2. Open a terminal/command prompt and navigate to the desktop client directory
3. Install dependencies:
   ```
   npm install
   ```
4. Configure the client by editing the `app.js` file:
   - Update the `serverUrl` to point to your web application
   - Adjust other settings as needed
5. Start the desktop client:
   ```
   node app.js
   ```
6. The client will create a workspace directory at `~/AI_Assistant_Workspace` (or equivalent on Windows)

## Usage Instructions

### Mobile Interface

1. Open the web application URL on your mobile device
2. Select your preferred AI provider (Google Gemini or Ollama)
3. Enter a prompt describing what you want the AI to prepare on your desktop
4. Examples:
   - "Please create an outline for an article about renewable energy"
   - "Create a to-do list for my project meeting tomorrow"
   - "Prepare my workspace with research on machine learning"
5. Submit your prompt and wait for the AI to process it
6. The AI will send commands to your desktop client to execute the requested actions

### Desktop Client

The desktop client runs in the background on your computer and:

1. Listens for commands from the web application
2. Executes the requested actions on your desktop
3. Creates files, opens applications, and performs other tasks
4. Notifies you when actions are completed

You can access the desktop client control panel at `http://localhost:3001` to:
- View the status of the client
- Browse files created by the AI
- View logs and activity

## Features

The AI Desktop Assistant can perform the following actions on your desktop:

1. **Create Files**
   - Create text documents
   - Generate article outlines
   - Create daily plans and to-do lists

2. **Open Applications**
   - Launch applications on your desktop
   - Open specific files with associated applications

3. **Perform Web Searches**
   - Search for information on the web
   - Save search results to your desktop

4. **Set Reminders**
   - Create notifications for important tasks
   - Set up reminders for upcoming events

5. **Prepare Workspaces**
   - Create directories with multiple files
   - Set up project environments
   - Organize research materials

## AI Provider Configuration

### Google Gemini API

To use the Google Gemini API:

1. Sign up for a Google AI Studio account
2. Obtain an API key
3. Add your API key to the desktop client configuration:
   - Edit the `app.js` file
   - Update the `GEMINI_API_KEY` value

### Ollama API

To use the Ollama API:

1. Install Ollama on your desktop computer: https://ollama.ai/
2. Start the Ollama service
3. The desktop client will automatically connect to the local Ollama instance

## Troubleshooting

### Web Application Issues

- **Cannot access the web application**: Ensure the server is running and check your network connection
- **API errors**: Verify your AI provider configuration and API keys

### Desktop Client Issues

- **Client not connecting**: Check that the WebSocket server URL is correct
- **Commands not executing**: Ensure the desktop client is running and connected
- **File creation errors**: Verify that the workspace directory exists and is writable

## Security Considerations

- The desktop client allows remote control of your computer. Only use it on trusted networks.
- Consider setting up authentication for the web application in a production environment.
- API keys should be kept secure and not shared publicly.

## Support

For issues or questions, please refer to the project repository or contact the developer.

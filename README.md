# AI Desktop Assistant - README

## Project Overview

AI Desktop Assistant is a web application that allows you to control your desktop computer remotely through AI prompts sent from a mobile device. You can use either Google Gemini API or Ollama API to process your natural language requests and perform actions on your desktop computer.

## Key Features

- **Mobile-Friendly Interface**: Access the assistant from any mobile device with a web browser
- **AI Provider Options**: Choose between Google Gemini API or Ollama API
- **Desktop Control**: Execute commands on your desktop computer remotely
- **Natural Language Processing**: Simply describe what you want prepared on your desktop
- **File Creation**: Generate documents, outlines, and plans
- **Application Control**: Open applications and set up workspaces

## Project Structure

The project consists of two main components:

### 1. Web Application (Next.js)
- Located in the `web-app` directory
- Provides the mobile interface and API endpoints
- Handles communication with AI providers
- Sends commands to the desktop client

### 2. Desktop Client (Node.js)
- Located in the `desktop-client` directory
- Runs on your desktop computer
- Receives commands from the web application
- Executes actions on your desktop
- Provides a control panel for monitoring

## Quick Start

For detailed installation and usage instructions, please refer to the [INSTRUCTIONS.md](./INSTRUCTIONS.md) file.

## Use Cases

- **Article Preparation**: "Please create an outline for an article about renewable energy"
- **Daily Planning**: "Create a to-do list for my project meeting tomorrow"
- **Research Organization**: "Prepare my workspace with research on machine learning"
- **File Management**: "Create a document summarizing the key points from yesterday's meeting"

## Technologies Used

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API routes
- **Desktop Client**: Node.js, Express
- **Communication**: WebSockets
- **AI Integration**: Google Gemini API, Ollama API

## Security Considerations

This application allows remote control of your desktop computer. Please review the security considerations in the [INSTRUCTIONS.md](./INSTRUCTIONS.md) file before deployment.

## License

This project is provided as-is without any warranty. Use at your own risk.

## Acknowledgements

This project was created as a demonstration of AI-powered desktop control capabilities.

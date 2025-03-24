// index.js - Main entry point for the desktop client application
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const notifier = require('node-notifier');

// Create a directory for storing files created by the assistant
const WORKSPACE_DIR = path.join(process.env.HOME || process.env.USERPROFILE, 'AI_Assistant_Workspace');
fs.ensureDirSync(WORKSPACE_DIR);

// Initialize Express app for the control panel
const app = express();
const PORT = 3001;

// WebSocket server for communication with the web application
const wss = new WebSocket.Server({ port: 3002 });

// Command handlers
const commandHandlers = {
  // Create a file with the given content
  create_file: async (params) => {
    const { filename, content, type = 'text' } = params;
    const filePath = path.join(WORKSPACE_DIR, filename);
    
    try {
      await fs.writeFile(filePath, content);
      notifier.notify({
        title: 'AI Assistant',
        message: `Created file: ${filename}`,
        icon: path.join(__dirname, 'icon.png')
      });
      return { success: true, filePath };
    } catch (error) {
      console.error('Error creating file:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Open an application
  open_application: async (params) => {
    const { appName } = params;
    try {
      // This is a simplified version - in a real app, you'd map app names to actual paths
      // based on the operating system
      await open(appName);
      notifier.notify({
        title: 'AI Assistant',
        message: `Opened application: ${appName}`,
        icon: path.join(__dirname, 'icon.png')
      });
      return { success: true };
    } catch (error) {
      console.error('Error opening application:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Perform a web search and save results
  search_web: async (params) => {
    const { query, saveResults = true } = params;
    try {
      // In a real app, this would use a search API
      // For demo, we'll just open the browser with the search query
      await open(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
      
      if (saveResults) {
        const filePath = path.join(WORKSPACE_DIR, `search_results_${Date.now()}.txt`);
        await fs.writeFile(filePath, `Search results for: ${query}\n\nPlaceholder for actual search results.`);
      }
      
      notifier.notify({
        title: 'AI Assistant',
        message: `Performed search for: ${query}`,
        icon: path.join(__dirname, 'icon.png')
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error performing search:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Set a reminder
  set_reminder: async (params) => {
    const { title, time, message } = params;
    try {
      // In a real app, this would integrate with the system's calendar or reminder app
      // For demo, we'll just show a notification
      notifier.notify({
        title: `Reminder: ${title}`,
        message: message || title,
        icon: path.join(__dirname, 'icon.png')
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error setting reminder:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Prepare a workspace with multiple files and applications
  prepare_workspace: async (params) => {
    const { name, files = [], applications = [] } = params;
    
    try {
      // Create workspace directory
      const workspaceDir = path.join(WORKSPACE_DIR, name);
      await fs.ensureDir(workspaceDir);
      
      // Create files
      for (const file of files) {
        await fs.writeFile(path.join(workspaceDir, file.name), file.content);
      }
      
      // Open applications
      for (const app of applications) {
        await open(app);
      }
      
      notifier.notify({
        title: 'AI Assistant',
        message: `Prepared workspace: ${name}`,
        icon: path.join(__dirname, 'icon.png')
      });
      
      return { success: true, workspaceDir };
    } catch (error) {
      console.error('Error preparing workspace:', error);
      return { success: false, error: error.message };
    }
  }
};

// Process incoming commands
async function processCommand(command) {
  console.log('Received command:', command);
  
  try {
    const { type, params, taskId } = command;
    
    if (!type || !commandHandlers[type]) {
      return { success: false, error: 'Invalid command type', taskId };
    }
    
    const result = await commandHandlers[type](params);
    return { ...result, taskId };
  } catch (error) {
    console.error('Error processing command:', error);
    return { success: false, error: error.message, taskId: command.taskId };
  }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send initial status
  ws.send(JSON.stringify({ type: 'status', status: 'connected' }));
  
  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      const command = JSON.parse(message);
      const result = await processCommand(command);
      ws.send(JSON.stringify({ type: 'result', ...result }));
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Express routes for the control panel
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/status', (req, res) => {
  res.json({ status: 'running', workspace: WORKSPACE_DIR });
});

app.get('/files', async (req, res) => {
  try {
    const files = await fs.readdir(WORKSPACE_DIR);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Desktop client running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:3002`);
  console.log(`Workspace directory: ${WORKSPACE_DIR}`);
  
  // Show notification that the client is running
  notifier.notify({
    title: 'AI Desktop Assistant',
    message: 'Desktop client is now running',
    icon: path.join(__dirname, 'icon.png')
  });
});

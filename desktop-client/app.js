// Main application entry point for desktop client
const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const WebSocket = require("ws");
const http = require("http");
const CommandProcessor = require("./command-processor");
const cors = require("cors");
const { getAIProvider } = require("./ai-providers");

// Load configuration
const CONFIG = require("./config");

// Ensure workspace directory exists
fs.ensureDirSync(CONFIG.workspaceDir);

// AIService class to handle requests
class AIService {
  constructor(config) {
    this.config = config;
  }

  async generateResponse(prompt, provider = "gemini") {
    const aiProvider = getAIProvider(provider);
    return await aiProvider.generateResponse(prompt);
  }

  // Format prompt for file creation
  formatFileCreationPrompt(userRequest) {
    return `
    You are an AI assistant that helps users by creating files on their desktop.
    
    USER REQUEST: ${userRequest}
    
    Based on this request, please:
    1. Determine what kind of file to create (article, outline, plan, etc.)
    2. Generate appropriate content
    3. Suggest a suitable filename
    4. Format your response as follows:
    
    FILE_TYPE: [type of file]
    FILENAME: [suggested filename]
    CONTENT:
    [generated content]
    
    Keep your explanations brief and focus on delivering a high-quality file.
    `;
  }

  // Parse AI response to extract file information
  parseAIResponse(response) {
    try {
      // Extract file type
      const fileTypeMatch = response.match(/FILE_TYPE:\s*(.*?)(?:\n|$)/);
      const fileType = fileTypeMatch ? fileTypeMatch[1].trim() : "text";

      // Extract filename
      const filenameMatch = response.match(/FILENAME:\s*(.*?)(?:\n|$)/);
      let filename = filenameMatch
        ? filenameMatch[1].trim()
        : `document_${Date.now()}.txt`;

      // Make sure filename has an extension
      if (!filename.includes(".")) {
        filename += ".txt";
      }

      // Extract content (everything after CONTENT:)
      const contentMatch = response.match(/CONTENT:\s*([\s\S]*)/);
      const content = contentMatch ? contentMatch[1].trim() : response;

      return {
        fileType,
        filename,
        content,
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return {
        fileType: "text",
        filename: `document_${Date.now()}.txt`,
        content: response,
      };
    }
  }
}

// Initialize command processor
const commandProcessor = new CommandProcessor(CONFIG.workspaceDir);

// Initialize AI Service
const aiService = new AIService(CONFIG);

// Initialize Express app for the control panel
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Create HTTP server for Express
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({
  server: server, // Attach to the same HTTP server
});

// Track WebSocket connection status
let wsConnected = false;

// WebSocket server handlers
wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  wsConnected = true;

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "welcome",
      message: "Connected to AI Desktop Assistant. How can I help you today?",
    })
  );

  // Handle messages
  ws.on("message", async (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      console.log("Received message:", parsedMessage);

      if (parsedMessage.type === "chat") {
        // Send acknowledgment that we received the message
        ws.send(
          JSON.stringify({
            type: "typing",
            message: "Thinking...",
          })
        );

        try {
          // Get AI response
          const provider = parsedMessage.provider || "gemini";

          // First, get a direct response for the user
          const directResponse = await aiService.generateResponse(
            parsedMessage.message,
            provider
          );

          if (!directResponse.success) {
            throw new Error(directResponse.text);
          }

          // Send direct response to client
          ws.send(
            JSON.stringify({
              type: "chat_response",
              message: directResponse.text,
            })
          );

          // Now process the action part - format a prompt for file creation
          const prompt = aiService.formatFileCreationPrompt(
            parsedMessage.message
          );
          const aiResponse = await aiService.generateResponse(prompt, provider);

          if (!aiResponse.success) {
            throw new Error(aiResponse.text);
          }

          // Parse AI response
          const { fileType, filename, content } = aiService.parseAIResponse(
            aiResponse.text
          );

          // Create the file
          const filePath = path.join(CONFIG.workspaceDir, filename);
          await fs.writeFile(filePath, content);

          // Show notification
          const notifier = require("node-notifier");
          notifier.notify({
            title: "AI Desktop Assistant",
            message: `Created ${fileType} file: ${filename}\nLocation: ${filePath}`,
          });

          // Send file creation details to client
          ws.send(
            JSON.stringify({
              type: "file_created",
              message: `I've created a ${fileType} file called "${filename}" for you based on your request. The file is saved at: ${filePath}`,
              fileDetails: {
                type: fileType,
                name: filename,
                path: filePath,
                preview:
                  content.substring(0, 200) +
                  (content.length > 200 ? "..." : ""),
              },
            })
          );
        } catch (error) {
          console.error("Error processing chat request:", error);
          ws.send(
            JSON.stringify({
              type: "chat_response",
              message: `I'm sorry, I encountered an error while processing your request: ${error.message}. Please check if the API keys are configured correctly.`,
            })
          );
        }
      } else if (parsedMessage.type === "open_file") {
        // Open a file that was created
        try {
          const { filename } = parsedMessage;
          const filePath = path.join(CONFIG.workspaceDir, filename);
          const { default: open } = await import("open");
          await open(filePath);

          ws.send(
            JSON.stringify({
              type: "chat_response",
              message: `I've opened "${filename}" for you.`,
            })
          );
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: "chat_response",
              message: `I couldn't open the file: ${error.message}`,
            })
          );
        }
      }
      // Handle regular commands
      else if (parsedMessage.type === "command") {
        const result = await commandProcessor.processCommand(parsedMessage);

        // Add more details to the response
        ws.send(
          JSON.stringify({
            type: "command_result",
            ...result,
            workspace: CONFIG.workspaceDir,
            timestamp: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      console.error("Error handling message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          error: error.message,
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    wsConnected = false;
  });
});

// API routes
app.get("/status", (req, res) => {
  res.json({
    status: "running",
    connected: wsConnected,
    workspace: CONFIG.workspaceDir,
  });
});

// API configuration endpoint
app.get("/api/config", (req, res) => {
  res.json({
    gemini: {
      apiKey: CONFIG.aiProviders.gemini.apiKey
        ? "configured"
        : "not configured",
    },
    ollama: {
      apiUrl: CONFIG.aiProviders.ollama.apiUrl,
      model: CONFIG.aiProviders.ollama.model,
    },
  });
});

// Update API configuration
app.post("/api/config", express.json(), (req, res) => {
  try {
    if (req.body.gemini && req.body.gemini.apiKey) {
      CONFIG.aiProviders.gemini.apiKey = req.body.gemini.apiKey;
    }

    if (req.body.ollama) {
      if (req.body.ollama.apiUrl) {
        CONFIG.aiProviders.ollama.apiUrl = req.body.ollama.apiUrl;
      }
      if (req.body.ollama.model) {
        CONFIG.aiProviders.ollama.model = req.body.ollama.model;
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add endpoint to open workspace folder
app.get("/open-workspace", async (req, res) => {
  try {
    const { default: open } = await import("open");
    await open(CONFIG.workspaceDir);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to open a specific file
app.get("/open-file/:filename", async (req, res) => {
  try {
    const filePath = path.join(CONFIG.workspaceDir, req.params.filename);
    const { default: open } = await import("open");
    await open(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/files", async (req, res) => {
  try {
    const files = await fs.readdir(CONFIG.workspaceDir);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(CONFIG.workspaceDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          isDirectory: stats.isDirectory(),
          created: stats.birthtime,
          modified: stats.mtime,
        };
      })
    );
    res.json({ files: fileStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/file/:filename", async (req, res) => {
  try {
    const filePath = path.join(CONFIG.workspaceDir, req.params.filename);
    const content = await fs.readFile(filePath, "utf8");
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve control panel on root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "control-panel.html"));
});

// Start the server
server.listen(CONFIG.controlPanelPort, () => {
  console.log(`AI Desktop Assistant is running!`);
  console.log(`Control panel: http://localhost:${CONFIG.controlPanelPort}`);
  console.log(`WebSocket server is listening on the same port`);
  console.log(`Workspace directory: ${CONFIG.workspaceDir}`);

  // Show notification that the client is running
  const notifier = require("node-notifier");
  notifier.notify({
    title: "AI Desktop Assistant",
    message: "Desktop client is now running",
    icon: path.join(__dirname, "icon.png"),
  });
});

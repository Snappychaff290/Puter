// Main application entry point for desktop client
const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const WebSocket = require("ws");
const http = require("http");
const CommandProcessor = require("./command-processor");
const cors = require("cors");
const { getAIProvider } = require("./ai-providers");
const markdownViewerRouter = require("./markdown-viewer");
const markdownViewer = require("./simplified-markdown-viewer");
require("dotenv").config();

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
      } else if (parsedMessage.type === "research") {
        // Send acknowledgment that we received the message
        ws.send(
          JSON.stringify({
            type: "typing",
            message: "Researching this topic... This might take a moment.",
          })
        );

        try {
          // Process the research request
          const researchResult = await commandProcessor.research_topic({
            topic: parsedMessage.topic,
            saveResults: true,
          });

          if (!researchResult.success) {
            throw new Error(researchResult.error);
          }

          // Send research results to client
          ws.send(
            JSON.stringify({
              type: "research_completed",
              message: researchResult.message,
              fileDetails: {
                type: "research",
                name: path.basename(researchResult.filePath),
                path: researchResult.filePath,
                preview:
                  researchResult.researchContent.substring(0, 300) +
                  (researchResult.researchContent.length > 300 ? "..." : ""),
              },
            })
          );
        } catch (error) {
          console.error("Error processing research request:", error);
          ws.send(
            JSON.stringify({
              type: "chat_response",
              message: `I'm sorry, I encountered an error while researching this topic: ${error.message}. Please check if the Perplexity API key is configured correctly.`,
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

// Make workspace directory available to routes
app.locals.workspaceDir = CONFIG.workspaceDir;

app.use("/markdown", markdownViewerRouter);

// API routes

app.get("/api/open-file/:filename", async (req, res) => {
  try {
    const filePath = path.join(CONFIG.workspaceDir, req.params.filename);
    const { default: open } = await import("open");
    await open(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    perplexity: {
      apiKey: CONFIG.aiProviders.perplexity.apiKey
        ? "configured"
        : "not configured",
      model: CONFIG.aiProviders.perplexity.model,
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

    if (req.body.perplexity) {
      if (req.body.perplexity.apiKey) {
        CONFIG.aiProviders.perplexity.apiKey = req.body.perplexity.apiKey;
      }
      if (req.body.perplexity.model) {
        CONFIG.aiProviders.perplexity.model = req.body.perplexity.model;
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

app.get("/view/:filename", (req, res) => {
  const filename = req.params.filename;
  res.redirect(`/md-view?filename=${encodeURIComponent(filename)}`);
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

// List all markdown files
app.get("/md-files", async (req, res) => {
  try {
    const files = await fs.readdir(CONFIG.workspaceDir);
    const markdownFiles = files.filter(
      (file) => file.endsWith(".md") || file.endsWith(".markdown")
    );

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Markdown Files</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            ul { list-style-type: none; padding: 0; }
            li { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            a { color: #0066cc; text-decoration: none; word-break: break-all; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Markdown Files</h1>
          <ul>
    `;

    for (const file of markdownFiles) {
      html += `
        <li>
          <a href="/md-view?filename=${encodeURIComponent(file)}">${file}</a>
        </li>
      `;
    }

    html += `
          </ul>
        </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// View a markdown file
app.get("/md-view", async (req, res) => {
  try {
    const filename = req.query.filename;

    if (!filename) {
      return res.status(400).send("No filename provided");
    }

    const filePath = path.join(CONFIG.workspaceDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`File not found: ${filename}`);
    }

    // Set Content Security Policy header to allow font loading
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
        "font-src 'self' data: https://* *; " +
        "img-src 'self' data: https://*;"
    );

    const content = await fs.readFile(filePath, "utf8");

    // Check if marked is available
    let htmlContent;
    try {
      const marked = require("marked");
      htmlContent = marked.parse(content);
    } catch (error) {
      // If marked is not available, use simple HTML formatting
      htmlContent = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>");
      htmlContent = `<p>${htmlContent}</p>`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #eaecef;
            }
            .content {
              background: #fff;
              padding: 20px;
              border-radius: 5px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            h1, h2, h3, h4 { color: #333; }
            pre { 
              background: #f6f8fa; 
              padding: 16px; 
              border-radius: 3px;
              overflow: auto;
            }
            code { font-family: monospace; }
            blockquote {
              margin: 0;
              padding: 0 1em;
              color: #6a737d;
              border-left: 0.25em solid #dfe2e5;
            }
            a { color: #0366d6; }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            table, th, td {
              border: 1px solid #dfe2e5;
              padding: 8px;
            }
            th {
              background-color: #f6f8fa;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${filename}</h1>
            <div>
              <a href="/md-files">Back to list</a>
            </div>
          </div>
          <div class="content">
            ${htmlContent}
          </div>
        </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Redirect to the file list
app.get("/markdown", (req, res) => {
  res.redirect("/md-files");
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

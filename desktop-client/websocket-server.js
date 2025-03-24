const WebSocket = require("ws");
const http = require("http");
const express = require("express");

function createWebSocketServer(port = 3002) {
  // Create an Express app for HTTP endpoints
  const app = express();

  // Create HTTP server
  const server = http.createServer(app);

  // Create WebSocket server
  const wss = new WebSocket.Server({ server });

  // Connected clients
  const clients = new Set();

  // WebSocket connection handler
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    clients.add(ws);

    // Handle messages
    ws.on("message", (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        console.log("Received message:", parsedMessage);

        // Handle different message types
        if (parsedMessage.type === "register") {
          console.log("Client registered:", parsedMessage.clientId);
        }

        // Echo back the message to all clients
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "echo",
                message: parsedMessage,
              })
            );
          }
        });
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      clients.delete(ws);
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "welcome",
        message: "Connected to WebSocket server",
      })
    );
  });

  // Start the server
  server.listen(port, () => {
    console.log(`WebSocket server running on port ${port}`);
  });

  return {
    server,
    wss,
    clients,
  };
}

// If this file is run directly
if (require.main === module) {
  createWebSocketServer();
}

module.exports = { createWebSocketServer };

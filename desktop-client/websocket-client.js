// websocket-client.js
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

class WebSocketClient {
  constructor(serverUrl) {
    // Make sure the URL uses the WebSocket protocol
    this.serverUrl = serverUrl.startsWith("ws")
      ? serverUrl
      : `ws://${serverUrl.replace(/^https?:\/\//, "")}`;
    this.ws = null;
    this.reconnectInterval = 5000; // 5 seconds
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.clientId = uuidv4();
  }

  connect() {
    console.log(`Connecting to WebSocket server at ${this.serverUrl}...`);

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.on("open", () => {
        console.log("Connected to WebSocket server");
        this.isConnected = true;

        // Register this client with the server
        this.send({
          type: "register",
          clientId: this.clientId,
          clientType: "desktop",
        });
      });

      this.ws.on("message", (data) => {
        try {
          const message = JSON.parse(data);
          console.log("Received message:", message);

          // Handle message based on type
          if (message.type && this.messageHandlers.has(message.type)) {
            this.messageHandlers.get(message.type)(message);
          } else {
            console.log(`No handler for message type: ${message.type}`);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      });

      this.ws.on("close", () => {
        console.log("Disconnected from WebSocket server");
        this.isConnected = false;

        // Attempt to reconnect
        setTimeout(() => this.connect(), this.reconnectInterval);
      });

      this.ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        // Don't close the connection here, let the 'close' event handle reconnection
      });
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error("Cannot send message: not connected");
    }
  }

  registerHandler(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = WebSocketClient;

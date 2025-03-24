// web-app/src/pages/index.js
import { useState, useEffect, useRef } from "react";
import Head from "next/head";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const webSocketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Connect to WebSocket server
  useEffect(() => {
    // Replace with your desktop client's WebSocket URL
    const wsUrl = "ws://localhost:3001";
    webSocketRef.current = new WebSocket(wsUrl);

    webSocketRef.current.onopen = () => {
      console.log("Connected to desktop client");
      setIsConnected(true);
    };

    webSocketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received message:", data);

        if (data.type === "welcome") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.message,
              timestamp: new Date().toISOString(),
            },
          ]);
        } else if (data.type === "typing") {
          // Handle typing indicator if needed
          setIsLoading(true);
        } else if (data.type === "chat_response") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.message,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsLoading(false);
        } else if (data.type === "file_created") {
          const message = {
            role: "assistant",
            content: data.message,
            timestamp: new Date().toISOString(),
            fileDetails: data.fileDetails,
          };
          setMessages((prev) => [...prev, message]);
          setIsLoading(false);
        } else if (data.type === "error") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Error: ${data.error}`,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    webSocketRef.current.onclose = () => {
      console.log("Disconnected from desktop client");
      setIsConnected(false);
    };

    webSocketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // Cleanup
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!prompt.trim() || !isConnected) {
      return;
    }

    const message = {
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, message]);
    setIsLoading(true);

    // Send message to desktop client
    webSocketRef.current.send(
      JSON.stringify({
        type: "chat",
        message: prompt,
        provider: provider,
      })
    );

    setPrompt("");
  };

  const openFile = (filename) => {
    webSocketRef.current.send(
      JSON.stringify({
        type: "open_file",
        filename,
      })
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>AI Desktop Assistant</title>
        <meta name="description" content="Control your desktop with AI" />
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>

      <main className="max-w-md mx-auto p-4 flex flex-col h-screen">
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <h1 className="text-xl font-bold text-center">
            AI Desktop Assistant
          </h1>
          {!isConnected && (
            <p className="text-red-500 text-sm text-center mt-2">
              Not connected to desktop client. Please start the desktop client
              and refresh.
            </p>
          )}
        </div>

        <div className="flex-1 bg-white shadow rounded-lg p-4 mb-4 overflow-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-500 text-white ml-12"
                    : "bg-gray-200 mr-12"
                }`}
              >
                <p>{message.content}</p>
                {message.fileDetails && (
                  <div className="mt-2 p-2 bg-gray-100 rounded border border-gray-300">
                    <p className="text-sm font-semibold">
                      Created file: {message.fileDetails.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {message.fileDetails.preview}
                    </p>
                    <button
                      onClick={() => openFile(message.fileDetails.name)}
                      className="mt-2 text-xs bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      Open File
                    </button>
                  </div>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-500">AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow rounded-lg p-4"
        >
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={!isConnected}
            >
              <option value="gemini">Google Gemini</option>
              <option value="ollama">Ollama</option>
            </select>
          </div>

          <div className="flex">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What would you like me to do?"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
              disabled={!isConnected || isLoading}
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-r-md"
              disabled={!isConnected || !prompt.trim() || isLoading}
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

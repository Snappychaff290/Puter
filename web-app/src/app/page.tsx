"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";

type AIProvider = "gemini" | "ollama";
type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  fileDetails?: {
    name: string;
    path: string;
    preview: string;
    type: string;
  };
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const webSocketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Connect to WebSocket server - client-side only
  useEffect(() => {
    const connectWebSocket = () => {
      const wsUrl =
        typeof window !== "undefined"
          ? `ws://${window.location.hostname}:3001`
          : "";
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
            setShowWelcome(false);
          } else if (data.type === "typing") {
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
            setShowWelcome(false);
          } else if (data.type === "file_created") {
            const message = {
              role: "assistant",
              content: data.message,
              timestamp: new Date().toISOString(),
              fileDetails: data.fileDetails,
            };
            setMessages((prev) => [...prev, message]);
            setIsLoading(false);
            setShowWelcome(false);
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
    };

    // Only run in browser environment
    if (typeof window !== "undefined") {
      connectWebSocket();
    }

    // Cleanup
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Set up speech recognition for mobile
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });

        // For demo purposes, set a placeholder message
        setPrompt(
          "Please create an article outline about artificial intelligence."
        );

        // Stop all tracks on the stream to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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
    setShowWelcome(false);

    // Send message to desktop client
    if (
      webSocketRef.current &&
      webSocketRef.current.readyState === WebSocket.OPEN
    ) {
      webSocketRef.current.send(
        JSON.stringify({
          type: "chat",
          message: prompt,
          provider: provider,
        })
      );
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Connection to desktop client lost. Please refresh the page.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
    }

    setPrompt("");
  };

  const openFile = (filename: string) => {
    if (
      webSocketRef.current &&
      webSocketRef.current.readyState === WebSocket.OPEN
    ) {
      webSocketRef.current.send(
        JSON.stringify({
          type: "open_file",
          filename,
        })
      );
    }
  };

  const setExamplePrompt = (promptText: string) => {
    setPrompt(promptText);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden h-[90vh]">
        {/* Header */}
        <header className="px-6 py-4 bg-blue-600 dark:bg-blue-700 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">AI Desktop Assistant</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                  }`}
                ></div>
                <span className="text-sm font-medium">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AIProvider)}
                className="bg-white/20 border border-white/30 text-white rounded-md px-2 py-1 text-sm"
                disabled={!isConnected}
              >
                <option value="gemini">Google Gemini</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-grow overflow-y-auto p-4 bg-slate-50 dark:bg-slate-700">
          {showWelcome && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 2H18C19.1 2 20 2.9 20 4V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 18H12.01"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                Welcome to AI Desktop Assistant
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md">
                Control your desktop computer with AI from your mobile device
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
                <button
                  onClick={() =>
                    setExamplePrompt(
                      "Create an article outline about renewable energy"
                    )
                  }
                  className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 text-left transition-all duration-200"
                >
                  <p className="font-medium text-slate-800 dark:text-white">
                    📝 Create an Article Outline
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Article about renewable energy sources
                  </p>
                </button>

                <button
                  onClick={() =>
                    setExamplePrompt(
                      "Write a meeting agenda for tomorrow's team call"
                    )
                  }
                  className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 text-left transition-all duration-200"
                >
                  <p className="font-medium text-slate-800 dark:text-white">
                    📅 Create Meeting Agenda
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    For tomorrow's team call
                  </p>
                </button>

                <button
                  onClick={() =>
                    setExamplePrompt(
                      "Create a weekly plan with top 3 priorities for each day"
                    )
                  }
                  className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 text-left transition-all duration-200"
                >
                  <p className="font-medium text-slate-800 dark:text-white">
                    ✅ Weekly Planning
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Top 3 priorities for each day
                  </p>
                </button>

                <button
                  onClick={() =>
                    setExamplePrompt(
                      "Draft an email to the development team about the new features"
                    )
                  }
                  className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 text-left transition-all duration-200"
                >
                  <p className="font-medium text-slate-800 dark:text-white">
                    ✉️ Draft Email
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    To development team about new features
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl p-4 shadow-sm ${
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {message.fileDetails && (
                      <div className="mt-4 rounded-lg overflow-hidden border dark:border-slate-600">
                        <div className="bg-black/5 dark:bg-white/5 px-3 py-2 flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                            <span className="font-medium text-sm">
                              {message.fileDetails.name}
                            </span>
                          </div>
                          <button
                            onClick={() => openFile(message.fileDetails.name)}
                            className="text-xs px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Open
                          </button>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 max-h-32 overflow-y-auto">
                          <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {message.fileDetails.preview}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div className="text-xs mt-2 opacity-70 text-right">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-center py-4">
                  <div className="bg-white dark:bg-slate-800 rounded-full px-4 py-2 shadow-md flex items-center">
                    <div className="flex space-x-1 mr-2">
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Thinking...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-600">
          {!isConnected && (
            <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Not connected to desktop client. Please start the desktop client
              and refresh.
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isConnected
                  ? "What would you like me to do on your desktop?"
                  : "Connect to desktop client first..."
              }
              className="flex-grow px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-900 dark:text-white"
              disabled={!isConnected || isLoading}
            />

            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-full ${
                isRecording
                  ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              } hover:opacity-80 transition-opacity`}
              disabled={!isConnected || isLoading}
            >
              {isRecording ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>

            <button
              type="submit"
              disabled={!isConnected || !prompt.trim() || isLoading}
              className="p-3 rounded-full bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// src/lib/ai-providers.ts
import { NextResponse } from "next/server";

export type AIProvider = "gemini" | "ollama";

// Interface for AI provider responses
interface AIResponse {
  text: string;
  success: boolean;
}

// Base class for AI providers
abstract class AIProviderBase {
  abstract generateResponse(prompt: string): Promise<AIResponse>;
}

// Google Gemini API implementation
export class GeminiProvider extends AIProviderBase {
  private apiKey: string;

  constructor(apiKey?: string) {
    super();
    // In a real app, this would be an environment variable
    this.apiKey = apiKey || "DEMO_KEY";
  }

  async generateResponse(prompt: string): Promise<AIResponse> {
    try {
      // In a real implementation, this would call the actual Gemini API
      // For demo purposes, we're simulating the API call
      console.log(`[Gemini] Processing prompt: ${prompt}`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate response based on prompt content
      let responseText = "";

      if (prompt.includes("outline") || prompt.includes("article")) {
        responseText = `I'll create an outline for an article on this topic. I've prepared the following on your desktop:\n\n1. Created a new document with a structured outline\n2. Added relevant section headings\n3. Included placeholder text for key points`;
      } else if (
        prompt.includes("to-do") ||
        prompt.includes("todo") ||
        prompt.includes("task")
      ) {
        responseText = `I've created a to-do list for you. On your desktop, you'll find:\n\n1. A new task list with prioritized items\n2. Scheduled reminders for important deadlines\n3. Links to relevant resources`;
      } else if (prompt.includes("research") || prompt.includes("find")) {
        responseText = `I've gathered research materials on this topic. On your desktop:\n\n1. Created a research folder with relevant documents\n2. Bookmarked key websites in your browser\n3. Prepared a summary document of main findings`;
      } else {
        responseText = `I've processed your request using Gemini AI. When you return to your desktop, you'll find the requested materials prepared and ready for your use.`;
      }

      return {
        text: responseText,
        success: true,
      };
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return {
        text: "Sorry, there was an error processing your request with Gemini AI.",
        success: false,
      };
    }
  }
}

// Ollama API implementation
export class OllamaProvider extends AIProviderBase {
  private endpoint: string;

  constructor(endpoint?: string) {
    super();
    // In a real app, this would be configurable
    this.endpoint = endpoint || "http://104.230.97.51:25570/api/generate";
  }

  async generateResponse(prompt: string): Promise<AIResponse> {
    try {
      // In a real implementation, this would call the actual Ollama API
      // For demo purposes, we're simulating the API call
      console.log(`[Ollama] Processing prompt: ${prompt}`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate response based on prompt content
      let responseText = "";

      if (prompt.includes("outline") || prompt.includes("article")) {
        responseText = `Using Ollama, I've prepared an article outline on your desktop. You'll find:\n\n1. A markdown file with a detailed outline structure\n2. Research notes with key points to include\n3. A list of potential references`;
      } else if (
        prompt.includes("to-do") ||
        prompt.includes("todo") ||
        prompt.includes("task")
      ) {
        responseText = `I've used Ollama to create a task management setup. On your desktop:\n\n1. Created a new project in your task manager\n2. Added all tasks with estimated completion times\n3. Set up notifications for upcoming deadlines`;
      } else if (prompt.includes("research") || prompt.includes("find")) {
        responseText = `Ollama has helped gather research materials. When you return to your PC:\n\n1. You'll find a new research directory with categorized information\n2. A summary document highlighting key findings\n3. A bibliography of sources for further reading`;
      } else {
        responseText = `I've processed your request using Ollama. The requested materials have been prepared on your desktop and are ready for your return.`;
      }

      return {
        text: responseText,
        success: true,
      };
    } catch (error) {
      console.error("Error calling Ollama API:", error);
      return {
        text: "Sorry, there was an error processing your request with Ollama.",
        success: false,
      };
    }
  }
}

// Factory function to get the appropriate AI provider
export function getAIProvider(provider: AIProvider): AIProviderBase {
  switch (provider) {
    case "gemini":
      return new GeminiProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

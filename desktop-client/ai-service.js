// ai-service.js
const fetch = require("node-fetch");

class AIService {
  constructor(config) {
    this.config = config;
  }

  async generateResponse(prompt, provider = "gemini") {
    if (provider === "gemini") {
      return this.callGeminiAPI(prompt);
    } else if (provider === "ollama") {
      return this.callOllamaAPI(prompt);
    } else {
      throw new Error(`Unknown AI provider: ${provider}`);
    }
  }

  async callGeminiAPI(prompt) {
    const apiKey = this.config.aiProviders.gemini.apiKey;
    if (!apiKey) {
      throw new Error("Gemini API key not configured");
    }

    try {
      const response = await fetch(
        `${this.config.aiProviders.gemini.apiUrl}?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Error calling Gemini API");
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw error;
    }
  }

  async callOllamaAPI(prompt) {
    try {
      const response = await fetch(this.config.aiProviders.ollama.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.aiProviders.ollama.model,
          prompt: prompt,
          stream: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error calling Ollama API");
      }

      return data.response || "";
    } catch (error) {
      console.error("Error calling Ollama API:", error);
      throw error;
    }
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

module.exports = AIService;

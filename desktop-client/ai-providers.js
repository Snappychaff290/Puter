// desktop-client/ai-providers.js
const fetch = require("node-fetch");
const CONFIG = require("./config");

class GeminiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey || CONFIG.aiProviders.gemini.apiKey;
    this.apiUrl = CONFIG.aiProviders.gemini.apiUrl;
  }

  async generateResponse(prompt) {
    try {
      if (!this.apiKey) {
        return { success: false, text: "Gemini API key not configured" };
      }

      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
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
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Gemini API error:", data);
        return {
          success: false,
          text: data.error?.message || "Error calling Gemini API",
        };
      }

      const generatedText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { success: true, text: generatedText };
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return { success: false, text: error.message };
    }
  }
}

class OllamaProvider {
  constructor(apiUrl, model) {
    this.apiUrl = apiUrl || CONFIG.aiProviders.ollama.apiUrl;
    this.model = model || CONFIG.aiProviders.ollama.model;
  }

  async generateResponse(prompt) {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Ollama API error:", data);
        return {
          success: false,
          text: data.error || "Error calling Ollama API",
        };
      }

      return { success: true, text: data.response || "" };
    } catch (error) {
      console.error("Error calling Ollama API:", error);
      return { success: false, text: error.message };
    }
  }
}

function getAIProvider(provider) {
  switch (provider) {
    case "gemini":
      return new GeminiProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

module.exports = {
  GeminiProvider,
  OllamaProvider,
  getAIProvider,
};

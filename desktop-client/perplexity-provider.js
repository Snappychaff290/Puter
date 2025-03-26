// perplexity-provider.js
const fetch = require("node-fetch");
const CONFIG = require("./config");

class PerplexityProvider {
  constructor(apiKey) {
    this.apiKey = apiKey || CONFIG.aiProviders.perplexity.apiKey;
    this.apiUrl = CONFIG.aiProviders.perplexity.apiUrl;
    this.model = CONFIG.aiProviders.perplexity.model;
  }

  async researchTopic(query) {
    try {
      if (!this.apiKey) {
        return { success: false, text: "Perplexity API key not configured" };
      }

      console.log(`Researching topic: ${query} with model: ${this.model}`);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: query }],
          max_tokens: 1500,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Perplexity API error:", data);
        return {
          success: false,
          text: data.error?.message || "Error calling Perplexity API",
        };
      }

      const generatedText = data.choices?.[0]?.message?.content || "";
      return { success: true, text: generatedText };
    } catch (error) {
      console.error("Error calling Perplexity API:", error);
      return { success: false, text: error.message };
    }
  }
}

module.exports = PerplexityProvider;

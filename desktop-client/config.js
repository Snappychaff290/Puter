// desktop-client/config.js
// Load .env file
require("dotenv").config();

// Helper function to get env variable with fallback
const getEnv = (key, defaultValue) => {
  return process.env[key] || defaultValue;
};

module.exports = {
  // Web server URL (would be the deployed web app in production)
  serverUrl: getEnv("SERVER_URL", "http://localhost:3000"),

  // Local control panel port
  controlPanelPort: parseInt(getEnv("CONTROL_PANEL_PORT", "3001")),

  // Workspace directory
  workspaceDir: getEnv(
    "WORKSPACE_DIR",
    require("path").join(
      process.env.HOME || process.env.USERPROFILE,
      "AI_Assistant_Workspace"
    )
  ),

  // AI Providers
  aiProviders: {
    gemini: {
      apiKey: getEnv("GEMINI_API_KEY", ""),
      apiUrl: getEnv(
        "GEMINI_API_URL",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent"
      ),
    },

    ollama: {
      apiUrl: getEnv("OLLAMA_API_URL", "http://localhost:11434/api/generate"),
      model: getEnv("OLLAMA_MODEL", "llama2"),
    },

    perplexity: {
      apiKey: getEnv("PERPLEXITY_API_KEY", ""),
      apiUrl: getEnv(
        "PERPLEXITY_API_URL",
        "https://api.perplexity.ai/chat/completions"
      ),
      model: getEnv("PERPLEXITY_MODEL", "sonar-deep-research"),
    },
  },
};

// desktop-client/config.js
module.exports = {
  // Web server URL (would be the deployed web app in production)
  serverUrl: "http://localhost:3000",
  // Local control panel port
  controlPanelPort: 3001,
  // Workspace directory
  workspaceDir:
    process.env.WORKSPACE_DIR ||
    require("path").join(
      process.env.HOME || process.env.USERPROFILE,
      "AI_Assistant_Workspace"
    ),
  // AI Providers
  aiProviders: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || "",
      // Updated Gemini API URL with the correct model name and version
      apiUrl:
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
    },
    ollama: {
      apiUrl:
        process.env.OLLAMA_API_URL || "http://104.230.97.51:25570/api/generate",
      model: process.env.OLLAMA_MODEL || "llawizardlm-uncensored",
    },
  },
};

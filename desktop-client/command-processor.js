// Command processor for the desktop client
// This file handles the execution of commands received from the web application
const fs = require("fs-extra");
const path = require("path");
//const open = require("open");
const notifier = require("node-notifier");

// Default workspace directory
const DEFAULT_WORKSPACE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  "AI_Assistant_Workspace"
);

class CommandProcessor {
  constructor(workspaceDir = DEFAULT_WORKSPACE_DIR) {
    this.workspaceDir = workspaceDir;
    this.ensureWorkspaceExists();
  }

  // Ensure the workspace directory exists
  ensureWorkspaceExists() {
    fs.ensureDirSync(this.workspaceDir);
    console.log(`Workspace directory: ${this.workspaceDir}`);
  }

  // Process a command received from the web application
  async processCommand(command) {
    console.log("Processing command:", command);

    try {
      const { type, params, taskId } = command;

      if (!type || !this[type]) {
        return { success: false, error: "Invalid command type", taskId };
      }

      const result = await this[type](params);
      return { ...result, taskId };
    } catch (error) {
      console.error("Error processing command:", error);
      return { success: false, error: error.message, taskId: command.taskId };
    }
  }

  // Create a file with the given content
  // Create a file with the given content
  async create_file(params) {
    const { filename, content, type = "text" } = params;
    const filePath = path.join(this.workspaceDir, filename);

    try {
      await fs.writeFile(filePath, content);
      this.showNotification(
        "AI Assistant",
        `Created file: ${filename}\nLocation: ${filePath}`
      );
      return {
        success: true,
        filePath,
        message: `File created at ${filePath}`,
      };
    } catch (error) {
      console.error("Error creating file:", error);
      return { success: false, error: error.message };
    }
  }

  // Open an application
  async open_application(params) {
    const { appName } = params;
    try {
      // Get the open function from the promise
      const open = await import("open");

      // This is a simplified version - in a real app, you'd map app names to actual paths
      // based on the operating system
      await open.default(appName);
      this.showNotification("AI Assistant", `Opened application: ${appName}`);
      return { success: true };
    } catch (error) {
      console.error("Error opening application:", error);
      return { success: false, error: error.message };
    }
  }

  // Perform a web search and save results
  async search_web(params) {
    const { query, saveResults = true } = params;
    try {
      // Get the open function from the promise
      const open = await import("open");

      // In a real app, this would use a search API
      // For demo, we'll just open the browser with the search query
      await open.default(
        `https://www.google.com/search?q=${encodeURIComponent(query)}`
      );

      let filePath;
      if (saveResults) {
        filePath = path.join(
          this.workspaceDir,
          `search_results_${Date.now()}.txt`
        );
        await fs.writeFile(
          filePath,
          `Search results for: ${query}\n\nPlaceholder for actual search results.`
        );
      }

      this.showNotification(
        "AI Assistant",
        `Performed search for: ${query}${
          filePath ? `\nResults saved to: ${filePath}` : ""
        }`
      );
      return {
        success: true,
        filePath,
        message: `Search performed for "${query}"${
          filePath ? `. Results saved to ${filePath}` : ""
        }`,
      };
    } catch (error) {
      console.error("Error performing search:", error);
      return { success: false, error: error.message };
    }
  }

  // Set a reminder
  async set_reminder(params) {
    const { title, time, message } = params;
    try {
      // In a real app, this would integrate with the system's calendar or reminder app
      // For demo, we'll just show a notification
      this.showNotification(`Reminder: ${title}`, message || title);
      return {
        success: true,
        message: `Reminder set: ${title}`,
      };
    } catch (error) {
      console.error("Error setting reminder:", error);
      return { success: false, error: error.message };
    }
  }

  // Prepare a workspace with multiple files and applications
  async prepare_workspace(params) {
    const { name, files = [], applications = [] } = params;

    try {
      // Create workspace directory
      const workspaceDir = path.join(this.workspaceDir, name);
      await fs.ensureDir(workspaceDir);

      // Create files
      const createdFiles = [];
      for (const file of files) {
        const filePath = path.join(workspaceDir, file.name);
        await fs.writeFile(filePath, file.content);
        createdFiles.push(filePath);
      }

      // Open applications
      const open = await import("open");
      for (const app of applications) {
        await open.default(app);
      }

      this.showNotification(
        "AI Assistant",
        `Prepared workspace: ${name}\nLocation: ${workspaceDir}\nFiles: ${createdFiles.length}`
      );
      return {
        success: true,
        workspaceDir,
        files: createdFiles,
        message: `Workspace created at ${workspaceDir} with ${createdFiles.length} files`,
      };
    } catch (error) {
      console.error("Error preparing workspace:", error);
      return { success: false, error: error.message };
    }
  }

  // Create an outline for an article
  async create_article_outline(params) {
    const { topic, sections = 5 } = params;

    try {
      // Generate a simple outline (in a real app, this would use AI to generate content)
      let content = `# Article Outline: ${topic}\n\n`;
      content += `Created: ${new Date().toLocaleString()}\n\n`;

      content += `## Introduction\n- Overview of ${topic}\n- Importance of ${topic}\n- Thesis statement\n\n`;

      for (let i = 1; i <= sections; i++) {
        content += `## Section ${i}\n- Key point 1\n- Key point 2\n- Key point 3\n\n`;
      }

      content += `## Conclusion\n- Summary of key points\n- Final thoughts\n- Call to action\n\n`;

      // Save the outline
      const filename = `${topic
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_outline.md`;
      const filePath = path.join(this.workspaceDir, filename);
      await fs.writeFile(filePath, content);

      this.showNotification(
        "AI Assistant",
        `Created article outline for: ${topic}\nLocation: ${filePath}`
      );
      return {
        success: true,
        filePath,
        message: `Article outline created at ${filePath}`,
      };
    } catch (error) {
      console.error("Error creating article outline:", error);
      return { success: false, error: error.message };
    }
  }

  // Create a daily plan
  async create_daily_plan(params) {
    const { tasks = [], date = new Date().toISOString().split("T")[0] } =
      params;

    try {
      // Generate a daily plan
      let content = `# Daily Plan for ${date}\n\n`;
      content += `Created: ${new Date().toLocaleString()}\n\n`;

      content += `## Morning\n`;
      if (tasks.filter((t) => t.time === "morning").length > 0) {
        tasks
          .filter((t) => t.time === "morning")
          .forEach((task) => {
            content += `- ${task.description}\n`;
          });
      } else {
        content += `- No tasks scheduled\n`;
      }
      content += `\n`;

      content += `## Afternoon\n`;
      if (tasks.filter((t) => t.time === "afternoon").length > 0) {
        tasks
          .filter((t) => t.time === "afternoon")
          .forEach((task) => {
            content += `- ${task.description}\n`;
          });
      } else {
        content += `- No tasks scheduled\n`;
      }
      content += `\n`;

      content += `## Evening\n`;
      if (tasks.filter((t) => t.time === "evening").length > 0) {
        tasks
          .filter((t) => t.time === "evening")
          .forEach((task) => {
            content += `- ${task.description}\n`;
          });
      } else {
        content += `- No tasks scheduled\n`;
      }

      // Save the plan
      const filename = `daily_plan_${date}.md`;
      const filePath = path.join(this.workspaceDir, filename);
      await fs.writeFile(filePath, content);

      this.showNotification(
        "AI Assistant",
        `Created daily plan for: ${date}\nLocation: ${filePath}`
      );
      return {
        success: true,
        filePath,
        message: `Daily plan created at ${filePath}`,
      };
    } catch (error) {
      console.error("Error creating daily plan:", error);
      return { success: false, error: error.message };
    }
  }

  // Show a notification
  showNotification(title, message) {
    notifier.notify({
      title,
      message,
      icon: path.join(__dirname, "icon.png"),
    });
  }

  // Research a topic using Perplexity API
  async research_topic(params) {
    const { topic, saveResults = true } = params;

    try {
      const { getAIProvider } = require("./ai-providers");
      const perplexityProvider = getAIProvider("perplexity");

      // Send the research query to Perplexity
      const response = await perplexityProvider.researchTopic(topic);

      if (!response.success) {
        throw new Error(response.text);
      }

      const researchContent = response.text;

      // Create a sanitized filename
      const filename = `research_${topic
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_${Date.now()}.md`;
      const filePath = path.join(this.workspaceDir, filename);

      // Save the research results to a file
      if (saveResults) {
        const content = `# Research: ${topic}\n\n_Conducted on ${new Date().toLocaleString()}_\n\n${researchContent}`;
        await fs.writeFile(filePath, content);
      }

      this.showNotification(
        "AI Assistant",
        `Completed research on: ${topic}${
          filePath ? `\nResults saved to: ${filePath}` : ""
        }`
      );

      return {
        success: true,
        filePath,
        message: `Research completed on "${topic}"${
          filePath ? `. Results saved to ${filePath}` : ""
        }`,
        researchContent,
      };
    } catch (error) {
      console.error("Error researching topic:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CommandProcessor;

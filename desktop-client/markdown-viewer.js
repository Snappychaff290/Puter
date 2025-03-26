// markdown-viewer.js
const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const marked = require("marked");
const highlightjs = require("highlight.js");
const router = express.Router();

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && highlightjs.getLanguage(lang)) {
      return highlightjs.highlight(lang, code).value;
    }
    return highlightjs.highlightAuto(code).value;
  },
  gfm: true,
  breaks: true,
  sanitize: false,
});

// Middleware to set Content Security Policy headers
router.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
      "font-src 'self' data: https://cdnjs.cloudflare.com https://www.slant.co https://*; " +
      "img-src 'self' data: https://*;"
  );
  next();
});

// Main file listing page
router.get("/files", async (req, res) => {
  try {
    const workspaceDir = req.app.locals.workspaceDir;
    const files = await fs.readdir(workspaceDir);

    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(workspaceDir, file);
        const stats = await fs.stat(filePath);
        const ext = path.extname(file).toLowerCase();

        return {
          name: file,
          path: filePath,
          size: stats.size,
          isDirectory: stats.isDirectory(),
          modified: stats.mtime,
          isMarkdown: [".md", ".markdown"].includes(ext),
        };
      })
    );

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workspace Files</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }
          h1 {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eaecef;
          }
          .file-list {
            list-style: none;
            padding: 0;
          }
          .file-item {
            padding: 12px;
            border-bottom: 1px solid #eaecef;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
          }
          .file-icon {
            margin-right: 10px;
            font-size: 20px;
          }
          .file-name {
            flex: 1;
            font-weight: 500;
            word-break: break-all;
          }
          .file-info {
            color: #586069;
            font-size: 12px;
            margin-right: 20px;
          }
          .file-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .file-actions a {
            padding: 5px 10px;
            font-size: 12px;
            color: #0366d6;
            text-decoration: none;
            border: 1px solid #0366d6;
            border-radius: 3px;
            white-space: nowrap;
          }
          .file-actions a:hover {
            background-color: #0366d6;
            color: white;
          }
          .file-actions a.view {
            background-color: #0366d6;
            color: white;
          }
          .file-actions a.view:hover {
            background-color: #035cc1;
          }
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #0d1117;
              color: #c9d1d9;
            }
            h1 {
              border-bottom: 1px solid #21262d;
            }
            .file-item {
              border-bottom: 1px solid #21262d;
            }
            .file-info {
              color: #8b949e;
            }
            .file-actions a {
              color: #58a6ff;
              border: 1px solid #58a6ff;
            }
            .file-actions a:hover {
              background-color: #58a6ff;
              color: #0d1117;
            }
            .file-actions a.view {
              background-color: #1f6feb;
              color: white;
            }
            .file-actions a.view:hover {
              background-color: #388bfd;
            }
          }
        </style>
      </head>
      <body>
        <h1>Workspace Files</h1>
        <ul class="file-list">
          ${fileStats
            .map(
              (file) => `
            <li class="file-item">
              <div class="file-icon">${
                file.isDirectory ? "📁" : file.isMarkdown ? "📝" : "📄"
              }</div>
              <div class="file-name">${file.name}</div>
              <div class="file-info">
                ${formatBytes(file.size)} • Last modified: ${new Date(
                file.modified
              ).toLocaleString()}
              </div>
              <div class="file-actions">
                ${
                  file.isMarkdown
                    ? `<a href="/view-md?file=${encodeURIComponent(
                        file.name
                      )}" class="view">View</a>`
                    : ""
                }
                ${
                  file.isMarkdown
                    ? `<a href="/edit-md?file=${encodeURIComponent(
                        file.name
                      )}">Edit</a>`
                    : ""
                }
                <a href="/download?file=${encodeURIComponent(
                  file.name
                )}" download>Download</a>
                <a href="/open?file=${encodeURIComponent(
                  file.name
                )}" target="_blank">Open</a>
              </div>
            </li>
          `
            )
            .join("")}
        </ul>

        <script>
          function formatBytes(bytes, decimals = 2) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).send(`Error listing files: ${error.message}`);
  }
});

// View markdown file
router.get("/view-md", async (req, res) => {
  try {
    const filename = req.query.file;
    if (!filename) {
      return res.status(400).send("No filename provided");
    }

    const workspaceDir = req.app.locals.workspaceDir;
    const filePath = path.join(workspaceDir, filename);

    // Check if file exists and has .md extension
    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`File not found: ${filename}`);
    }

    // Read and render the markdown file
    const content = await fs.readFile(filePath, "utf8");
    const htmlContent = marked(content);

    // Render the markdown content with a nice template
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${filename} - Markdown Viewer</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.1.0/github-markdown.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
        <style>
          body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          }
          @media (max-width: 767px) {
            body {
              padding: 15px;
            }
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eaecef;
          }
          .file-info {
            font-size: 14px;
            color: #6a737d;
            word-break: break-all;
          }
          .actions a {
            display: inline-block;
            margin-left: 10px;
            padding: 5px 10px;
            font-size: 14px;
            color: #0366d6;
            text-decoration: none;
            border: 1px solid #0366d6;
            border-radius: 3px;
          }
          .actions a:hover {
            background-color: #0366d6;
            color: white;
          }
          .markdown-body {
            word-wrap: break-word;
          }
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #0d1117;
              color: #c9d1d9;
            }
            .markdown-body {
              color-scheme: dark;
              --color-prettylights-syntax-comment: #8b949e;
              --color-prettylights-syntax-constant: #79c0ff;
              --color-prettylights-syntax-entity: #d2a8ff;
              --color-prettylights-syntax-storage-modifier-import: #c9d1d9;
              --color-prettylights-syntax-entity-tag: #7ee787;
              --color-prettylights-syntax-keyword: #ff7b72;
              --color-prettylights-syntax-string: #a5d6ff;
              --color-prettylights-syntax-variable: #ffa657;
              --color-prettylights-syntax-brackethighlighter-unmatched: #f85149;
              --color-prettylights-syntax-invalid-illegal-text: #f0f6fc;
              --color-prettylights-syntax-invalid-illegal-bg: #8e1519;
              --color-prettylights-syntax-carriage-return-text: #f0f6fc;
              --color-prettylights-syntax-carriage-return-bg: #b62324;
              --color-prettylights-syntax-string-regexp: #7ee787;
              --color-prettylights-syntax-markup-list: #f2cc60;
              --color-prettylights-syntax-markup-heading: #1f6feb;
              --color-prettylights-syntax-markup-italic: #c9d1d9;
              --color-prettylights-syntax-markup-bold: #c9d1d9;
              --color-prettylights-syntax-markup-deleted-text: #ffdcd7;
              --color-prettylights-syntax-markup-deleted-bg: #67060c;
              --color-prettylights-syntax-markup-inserted-text: #aff5b4;
              --color-prettylights-syntax-markup-inserted-bg: #033a16;
              --color-prettylights-syntax-markup-changed-text: #ffdfb6;
              --color-prettylights-syntax-markup-changed-bg: #5a1e02;
              --color-prettylights-syntax-markup-ignored-text: #c9d1d9;
              --color-prettylights-syntax-markup-ignored-bg: #1158c7;
              --color-prettylights-syntax-meta-diff-range: #d2a8ff;
              --color-prettylights-syntax-brackethighlighter-angle: #8b949e;
              --color-prettylights-syntax-sublimelinter-gutter-mark: #484f58;
              --color-prettylights-syntax-constant-other-reference-link: #a5d6ff;
              --color-fg-default: #c9d1d9;
              --color-fg-muted: #8b949e;
              --color-fg-subtle: #6e7681;
              --color-canvas-default: #0d1117;
              --color-canvas-subtle: #161b22;
              --color-border-default: #30363d;
              --color-border-muted: #21262d;
              --color-neutral-muted: rgba(110, 118, 129, 0.4);
              --color-accent-fg: #58a6ff;
              --color-accent-emphasis: #1f6feb;
              --color-attention-subtle: rgba(187, 128, 9, 0.15);
              --color-danger-fg: #f85149;
            }
            .header {
              border-bottom: 1px solid #21262d;
            }
            .file-info {
              color: #8b949e;
            }
            .actions a {
              color: #58a6ff;
              border: 1px solid #58a6ff;
            }
            .actions a:hover {
              background-color: #58a6ff;
              color: #0d1117;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="file-info">
            <strong>${filename}</strong>
            <span>Last modified: ${new Date(
              fs.statSync(filePath).mtime
            ).toLocaleString()}</span>
          </div>
          <div class="actions">
            <a href="/edit-md?file=${encodeURIComponent(filename)}">Edit</a>
            <a href="/download?file=${encodeURIComponent(
              filename
            )}">Download</a>
            <a href="/files">All Files</a>
          </div>
        </div>
        <div class="markdown-body">
          ${htmlContent}
        </div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
        <script>
          document.addEventListener('DOMContentLoaded', (event) => {
            document.querySelectorAll('pre code').forEach((el) => {
              hljs.highlightElement(el);
            });
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error rendering markdown:", error);
    res.status(500).send(`Error rendering markdown: ${error.message}`);
  }
});

// Edit markdown file route
router.get("/edit-md", async (req, res) => {
  try {
    const filename = req.query.file;
    if (!filename) {
      return res.status(400).send("No filename provided");
    }

    const workspaceDir = req.app.locals.workspaceDir;
    const filePath = path.join(workspaceDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`File not found: ${filename}`);
    }

    const content = await fs.readFile(filePath, "utf8");

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Edit ${filename}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eaecef;
          }
          .file-name {
            font-weight: bold;
            word-break: break-all;
          }
          .actions button {
            margin-left: 10px;
            padding: 8px 16px;
            background: #0366d6;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
          }
          .actions a {
            margin-left: 10px;
            padding: 8px 16px;
            color: #0366d6;
            text-decoration: none;
            border: 1px solid #0366d6;
            border-radius: 3px;
          }
          #editor {
            width: 100%;
            height: calc(100vh - 120px);
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.5;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 3px;
            resize: vertical;
          }
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #0d1117;
              color: #c9d1d9;
            }
            .header {
              border-bottom: 1px solid #21262d;
            }
            .actions a {
              color: #58a6ff;
              border: 1px solid #58a6ff;
            }
            .actions button {
              background: #1f6feb;
            }
            #editor {
              background-color: #161b22;
              color: #c9d1d9;
              border: 1px solid #30363d;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="file-name">
            <h2>Editing ${filename}</h2>
          </div>
          <div class="actions">
            <button id="save-btn">Save</button>
            <a href="/view-md?file=${encodeURIComponent(filename)}">View</a>
            <a href="/files">All Files</a>
          </div>
        </div>
        <textarea id="editor">${content}</textarea>

        <script>
          document.getElementById('save-btn').addEventListener('click', async () => {
            const content = document.getElementById('editor').value;
            try {
              const response = await fetch('/api/save-file', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  filename: '${filename}',
                  content
                })
              });
              
              const result = await response.json();
              
              if (result.success) {
                alert('File saved successfully!');
                window.location.href = '/view-md?file=${encodeURIComponent(
                  filename
                )}';
              } else {
                alert('Error saving file: ' + result.error);
              }
            } catch (error) {
              alert('Error: ' + error.message);
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error loading editor:", error);
    res.status(500).send(`Error loading editor: ${error.message}`);
  }
});

// Download file route
router.get("/download", async (req, res) => {
  try {
    const filename = req.query.file;
    if (!filename) {
      return res.status(400).send("No filename provided");
    }

    const workspaceDir = req.app.locals.workspaceDir;
    const filePath = path.join(workspaceDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`File not found: ${filename}`);
    }

    res.download(filePath);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).send(`Error downloading file: ${error.message}`);
  }
});

// Open file route
router.get("/open", async (req, res) => {
  try {
    const filename = req.query.file;
    if (!filename) {
      return res.status(400).send("No filename provided");
    }

    const workspaceDir = req.app.locals.workspaceDir;
    const filePath = path.join(workspaceDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`File not found: ${filename}`);
    }

    const { default: open } = await import("open");
    await open(filePath);

    res.send(`Opening file: ${filename}`);
  } catch (error) {
    console.error("Error opening file:", error);
    res.status(500).send(`Error opening file: ${error.message}`);
  }
});

// API endpoint to save edited files
router.post("/api/save-file", express.json(), async (req, res) => {
  try {
    const { filename, content } = req.body;

    if (!filename || content === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "Missing filename or content" });
    }

    const workspaceDir = req.app.locals.workspaceDir;
    const filePath = path.join(workspaceDir, filename);

    // Simple security check - prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(workspaceDir)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    await fs.writeFile(filePath, content);

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving file:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to format bytes (used in templates)
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Add backward compatibility routes for old URL formats
router.get("/view/:filename", (req, res) => {
  const filename = req.params.filename;
  res.redirect(`/view-md?file=${encodeURIComponent(filename)}`);
});

router.get("/edit/:filename", (req, res) => {
  const filename = req.params.filename;
  res.redirect(`/edit-md?file=${encodeURIComponent(filename)}`);
});

module.exports = router;

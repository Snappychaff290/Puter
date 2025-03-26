// simplified-markdown-viewer.js
const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const marked = require("marked");
const router = express.Router();

// Set Content Security Policy to allow loading fonts
router.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
      "font-src 'self' data: https://* *; " +
      "img-src 'self' data: https://*;"
  );
  next();
});

// Main file listing
router.get("/markdown-files", (req, res) => {
  const workspaceDir = req.app.locals.workspaceDir;

  try {
    const files = fs.readdirSync(workspaceDir);
    const markdownFiles = files.filter(
      (file) => file.endsWith(".md") || file.endsWith(".markdown")
    );

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Markdown Files</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            ul { list-style-type: none; padding: 0; }
            li { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Markdown Files</h1>
          <ul>
    `;

    for (const file of markdownFiles) {
      html += `
        <li>
          <a href="/view-markdown?file=${encodeURIComponent(file)}">${file}</a>
        </li>
      `;
    }

    html += `
          </ul>
        </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// View markdown file
router.get("/view-markdown", (req, res) => {
  const workspaceDir = req.app.locals.workspaceDir;
  const filename = req.query.file;

  if (!filename) {
    return res.status(400).send("No filename provided");
  }

  try {
    const filePath = path.join(workspaceDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`File not found: ${filename}`);
    }

    const content = fs.readFileSync(filePath, "utf8");
    const htmlContent = marked.parse(content);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.1.0/github-markdown.min.css">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #eaecef;
            }
            .markdown-body {
              box-sizing: border-box;
              min-width: 200px;
              max-width: 980px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${filename}</h1>
            <div>
              <a href="/markdown-files">Back to list</a>
            </div>
          </div>
          <div class="markdown-body">
            ${htmlContent}
          </div>
        </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Redirect old view routes to the new format
router.get("/view/:filename", (req, res) => {
  const filename = req.params.filename;
  res.redirect(`/view-markdown?file=${encodeURIComponent(filename)}`);
});

// Redirect to our file listing
router.get("/", (req, res) => {
  res.redirect("/markdown-files");
});

module.exports = router;

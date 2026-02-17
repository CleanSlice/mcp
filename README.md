# CleanSlice MCP Server

MCP (Model Context Protocol) server that gives AI coding agents access to the CleanSlice architecture documentation. Connect it to Claude, Cursor, Windsurf, or any MCP-compatible client so the AI knows how to build apps using CleanSlice conventions.

## Installation

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project-level):

```json
{
  "mcpServers": {
    "cleanslice": {
      "url": "https://mcp.cleanslice.org/mcp/sse"
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "cleanslice": {
      "serverUrl": "https://mcp.cleanslice.org/mcp/sse"
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "cleanslice": {
      "url": "https://mcp.cleanslice.org/mcp/sse"
    }
  }
}
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cleanslice": {
      "url": "https://mcp.cleanslice.org/mcp/sse"
    }
  }
}
```

### Claude Code

```bash
claude mcp add cleanslice --transport sse https://mcp.cleanslice.org/mcp/sse
```

### Run Locally

```bash
git clone https://github.com/CleanSlice/mcp.git
cd mcp
npm install
npm run dev
```

Then point your MCP client to `http://localhost:8080/mcp/sse`.

## Available Tools

| Tool | Description |
|------|-------------|
| `get-started` | Returns the essential CleanSlice rules and conventions |
| `list-categories` | Lists all documentation categories |
| `search` | Search the docs by query, category, framework, phase, or tags |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `DOCS_PATH` | Auto-discover | Path to bundled docs directory |
| `GITHUB_REPO` | `CleanSlice/docs` | Fallback GitHub repo for docs |
| `GITHUB_TOKEN` | - | GitHub token (optional, for higher rate limits) |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s) |

## Docker

```bash
docker build -t cleanslice-mcp .
docker run -p 8080:8080 cleanslice-mcp
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /mcp/sse` | SSE transport (for Claude Desktop, Cursor) |
| `POST /mcp/messages` | SSE message handler |
| `POST /mcp/mcp` | Streamable HTTP transport |
| `GET /health` | Health check |
| `GET /api` | Swagger docs |

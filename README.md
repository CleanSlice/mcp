# CleanSlice MCP Server

MCP (Model Context Protocol) server that gives AI coding agents access to the CleanSlice architecture documentation. Connect it to Claude, Cursor, or any MCP-compatible client so the AI knows how to build apps using CleanSlice conventions.

## How to Install

### 1. Add to your AI client

Add this to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cleanslice": {
      "url": "https://your-server-url/mcp/sse"
    }
  }
}
```

### 2. Or run locally

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

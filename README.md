# CleanSlice MCP Server

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=cleanslice&config=eyJ1cmwiOiJodHRwczovL21jcC5jbGVhbnNsaWNlLm9yZy9tY3AifQ%3D%3D)

MCP (Model Context Protocol) server that gives AI coding agents access to the CleanSlice architecture documentation. Connect it to Claude, Cursor, Windsurf, or any MCP-compatible client so the AI knows how to build apps using CleanSlice conventions.

## Installation

<details>
<summary><b>Install in Claude Code</b></summary>

Run this command. See [Claude Code MCP docs](https://docs.anthropic.com/en/docs/claude-code/mcp) for more info.

```sh
claude mcp add --scope user --transport http cleanslice https://mcp.cleanslice.org/mcp
```

> Remove `--scope user` to install for the current project only.

**Tip: enforce MCP usage with a Stop hook**

To make sure Claude Code always consults the CleanSlice MCP before finishing a task, add the following to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "timeout": 180,
            "prompt": "You are a verification subagent. Your job: ensure the main Claude Code agent used the `cleanslice` MCP knowledge sufficiently and did not guess.\n\nContext JSON:\n$ARGUMENTS\n\nVerification requirements:\n1) Identify what the user asked for (deliverables + constraints) from the conversation/transcript in $ARGUMENTS.\n2) Verify the agent consulted the `cleanslice` MCP server for relevant knowledge BEFORE finalizing:\n   - Must call `cleanslice` \"get-started\" at least once (or equivalent) to confirm the server's purpose and usage.\n   - Must call \"list-categories\" to understand the available knowledge areas.\n   - Must call \"search\" with task-relevant queries (at least 2 searches) covering: (a) core implementation details, (b) edge cases / constraints.\n3) Validate coverage:\n   - If any required category is relevant but not checked, fail.\n   - If answers include specifics that are not supported by MCP results, fail.\n4) Output STRICT JSON only:\n   - If everything is verified: {\"ok\": true}\n   - If anything is missing/unsupported: {\"ok\": false, \"reason\": \"What is missing + exact MCP calls the main agent must run next (e.g., run list-categories, then search for X/Y, then update the solution).\"}\n\nImportant:\n- `cleanslice` tools will appear as MCP tools. Use whatever exact tool names are available in this environment (they follow the mcp__<server>__<tool> naming pattern).\n- Do not allow stopping until MCP-backed evidence is sufficient."
          }
        ]
      }
    ]
  }
}
```

This hook runs a verification agent every time Claude Code tries to stop, ensuring it actually consulted the CleanSlice docs rather than guessing.

</details>

<details>
<summary><b>Install in Cursor</b></summary>

Go to: `Settings` -> `Cursor Settings` -> `MCP` -> `Add new global MCP server`

Paste the following into your Cursor `~/.cursor/mcp.json` file. You may also install in a specific project by creating `.cursor/mcp.json` in your project folder. See [Cursor MCP docs](https://docs.cursor.com/context/model-context-protocol) for more info.

```json
{
  "mcpServers": {
    "cleanslice": {
      "type": "http",
      "url": "https://mcp.cleanslice.org/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>Install in Windsurf</b></summary>

Add to your Windsurf MCP config file. See [Windsurf MCP docs](https://docs.windsurf.com/windsurf/mcp) for more info.

```json
{
  "mcpServers": {
    "cleanslice": {
      "type": "http",
      "serverUrl": "https://mcp.cleanslice.org/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>Install in VS Code (Copilot)</b></summary>

Add to `.vscode/mcp.json` in your project. See [VS Code MCP docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) for more info.

```json
{
  "servers": {
    "cleanslice": {
      "type": "http",
      "url": "https://mcp.cleanslice.org/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>Install in Claude Desktop</b></summary>

Add to your `claude_desktop_config.json`. See [Claude Desktop MCP docs](https://modelcontextprotocol.io/quickstart/user) for more info.

```json
{
  "mcpServers": {
    "cleanslice": {
      "type": "http",
      "url": "https://mcp.cleanslice.org/mcp"
    }
  }
}
```

</details>

<details>
<summary><b>Install in Opencode</b></summary>

Add this to your Opencode configuration file. See [Opencode MCP docs](https://opencode.ai/docs/mcp-servers) for more info.

```json
{
  "mcp": {
    "cleanslice": {
      "type": "remote",
      "url": "https://mcp.cleanslice.org/mcp",
      "enabled": true
    }
  }
}
```

</details>

<details>
<summary><b>Run Locally</b></summary>

```bash
git clone https://github.com/CleanSlice/mcp.git
cd mcp
npm install
npm run dev
```

Then point your MCP client to `http://localhost:8080/mcp`.

</details>

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
| `GET /sse` | SSE transport (for Claude Desktop, Cursor) |
| `POST /messages` | SSE message handler |
| `POST /mcp` | Streamable HTTP transport |
| `GET /health` | Health check |
| `GET /api` | Swagger docs |

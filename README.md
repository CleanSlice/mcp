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

**Tip: enforce MCP usage with CLAUDE.md**

To make sure Claude Code always consults the CleanSlice MCP **before** writing any code, add the following to your project's `CLAUDE.md`:

```markdown
## CleanSlice MCP — Required

Before writing or modifying any code you MUST consult the CleanSlice MCP:

1. Call `get-started` to load the core architecture rules.
2. Call `list-categories` to see available documentation areas.
3. Call `search` with at least 2 task-relevant queries covering:
   (a) core implementation details for the feature you are building,
   (b) edge cases, constraints, or standards that apply.
4. Call `read-doc` to read the full document when search snippets aren't enough.

Do NOT guess conventions — always verify against MCP results first.
```

This ensures the agent reads CleanSlice docs at the start of every task, not after the fact.

**Optional: add a Stop hook as a safety net**

To catch cases where the agent skips the MCP despite the `CLAUDE.md` instruction, add this to `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "timeout": 180,
            "prompt": "You are a verification subagent. Your job: ensure the main Claude Code agent used the `cleanslice` MCP knowledge sufficiently and did not guess.\n\nContext JSON:\n$ARGUMENTS\n\nVerification requirements:\n1) Identify what the user asked for (deliverables + constraints) from the conversation/transcript in $ARGUMENTS.\n2) Verify the agent consulted the `cleanslice` MCP server for relevant knowledge BEFORE finalizing:\n   - Must call `cleanslice` \"get-started\" at least once (or equivalent) to confirm the server's purpose and usage.\n   - Must call \"list-categories\" to understand the available knowledge areas.\n   - Must call \"search\" with task-relevant queries (at least 2 searches) covering: (a) core implementation details, (b) edge cases / constraints.\n   - May call \"read-doc\" to get full document content when search snippets are insufficient.\n3) Validate coverage:\n   - If any required category is relevant but not checked, fail.\n   - If answers include specifics that are not supported by MCP results, fail.\n4) Output STRICT JSON only:\n   - If everything is verified: {\"ok\": true}\n   - If anything is missing/unsupported: {\"ok\": false, \"reason\": \"What is missing + exact MCP calls the main agent must run next (e.g., run list-categories, then search for X/Y, then update the solution).\"}\n\nImportant:\n- `cleanslice` tools will appear as MCP tools. Use whatever exact tool names are available in this environment (they follow the mcp__<server>__<tool> naming pattern).\n- Do not allow stopping until MCP-backed evidence is sufficient."
          }
        ]
      }
    ]
  }
}
```

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

**Tip: enforce MCP usage with a Cursor rule**

Create `.cursor/rules/cleanslice.mdc` in your project to make Cursor always consult the MCP before writing code:

```markdown
---
description: CleanSlice architecture rules
globs: **/*.{ts,vue,prisma}
alwaysApply: true
---

## CleanSlice MCP — Required

Before writing or modifying any code you MUST consult the CleanSlice MCP:

1. Call `get-started` to load the core architecture rules.
2. Call `list-categories` to see available documentation areas.
3. Call `search` with at least 2 task-relevant queries covering:
   (a) core implementation details for the feature you are building,
   (b) edge cases, constraints, or standards that apply.
4. Call `read-doc` to read the full document when search snippets aren't enough.

Do NOT guess conventions — always verify against MCP results first.
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

**Tip: enforce MCP usage with a Windsurf rule**

Create `.windsurf/rules/cleanslice.md` in your project to make Windsurf always consult the MCP before writing code:

```markdown
## CleanSlice MCP — Required

Before writing or modifying any code you MUST consult the CleanSlice MCP:

1. Call `get-started` to load the core architecture rules.
2. Call `list-categories` to see available documentation areas.
3. Call `search` with at least 2 task-relevant queries covering:
   (a) core implementation details for the feature you are building,
   (b) edge cases, constraints, or standards that apply.
4. Call `read-doc` to read the full document when search snippets aren't enough.

Do NOT guess conventions — always verify against MCP results first.
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

**Tip: enforce MCP usage with Copilot instructions**

Create `.github/copilot-instructions.md` in your project root to make Copilot always consult the MCP before writing code:

```markdown
## CleanSlice MCP — Required

Before writing or modifying any code you MUST consult the CleanSlice MCP:

1. Call `get-started` to load the core architecture rules.
2. Call `list-categories` to see available documentation areas.
3. Call `search` with at least 2 task-relevant queries covering:
   (a) core implementation details for the feature you are building,
   (b) edge cases, constraints, or standards that apply.
4. Call `read-doc` to read the full document when search snippets aren't enough.

Do NOT guess conventions — always verify against MCP results first.
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

**Tip: enforce MCP usage with AGENTS.md**

Create `AGENTS.md` in your project root to make Opencode always consult the MCP before writing code:

```markdown
## CleanSlice MCP — Required

Before writing or modifying any code you MUST consult the CleanSlice MCP:

1. Call `get-started` to load the core architecture rules.
2. Call `list-categories` to see available documentation areas.
3. Call `search` with at least 2 task-relevant queries covering:
   (a) core implementation details for the feature you are building,
   (b) edge cases, constraints, or standards that apply.
4. Call `read-doc` to read the full document when search snippets aren't enough.

Do NOT guess conventions — always verify against MCP results first.
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
| `get-started` | Returns the essential CleanSlice rules and conventions. **Call this first.** |
| `list-categories` | Lists all documentation categories available for search filtering |
| `search` | Search docs by query, category, framework, phase, or tags. Returns **snippets** (keyword-in-context excerpts) and document paths |
| `read-doc` | Read the full content of a specific document by path. Use after `search` to get complete docs |

### Recommended workflow

```
get-started            → learn the core rules
list-categories        → discover what's available
search(query: "...")   → find relevant docs (returns snippets)
read-doc(path: "...")  → read full document when snippets aren't enough
```

The `search` tool returns 1-3 keyword-in-context snippets per result instead of full document content. This keeps responses compact (~3-5K instead of ~95K) while showing the most relevant sections. Use `read-doc` with the `path` from search results to fetch the complete document when needed.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `NODE_ENV` | - | Set to `dev` for debug/verbose logging |
| `DOCS_PATH` | Auto-discover | Path to bundled docs directory |
| `GITHUB_REPO` | `CleanSlice/docs` | Fallback GitHub repo for docs |
| `GITHUB_BRANCH` | `main` | GitHub branch to fetch from |
| `GITHUB_TOKEN` | - | GitHub token (optional, for higher rate limits) |
| `GITHUB_CACHE_TTL` | `3600` | GitHub content cache TTL in seconds |
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

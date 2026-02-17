---
id: vscode
title: VSCode Setup
version: 1.0.0
last_updated: 2025-12-21

pattern: quickstart
complexity: fundamental
framework: full-stack
category: quickstart
applies_to: [api, app]

tags:
  - vscode
  - extensions
  - ide
  - setup
  - tooling

keywords:
  - vscode extensions
  - ide setup
  - developer tools
  - prisma
  - vue
  - typescript

deprecated: false
experimental: false
production_ready: true
---

# VSCode Setup

> **Essential extensions for CleanSlice development.** Install these extensions for the best development experience with NestJS API and Nuxt App.

---

## Required Extensions

### Core Development

| Extension | ID | Purpose |
|-----------|-----|---------|
| **TypeScript** | Built-in | TypeScript language support |
| **ESLint** | `dbaeumer.vscode-eslint` | Linting and code quality |
| **Prettier** | `esbenp.prettier-vscode` | Code formatting |
| **EditorConfig** | `editorconfig.editorconfig` | Consistent editor settings |

### Vue & Nuxt (Frontend)

| Extension | ID | Purpose |
|-----------|-----|---------|
| **Vue - Official** | `vue.volar` | Vue 3 language support |
| **TypeScript Vue Plugin** | `vue.vscode-typescript-vue-plugin` | TS support in Vue files |
| **Nuxt** | `nuxt.mdc` | Nuxt-specific features |

### NestJS (Backend)

| Extension | ID | Purpose |
|-----------|-----|---------|
| **NestJS Files** | `imgildev.vscode-nestjs-generator` | Generate NestJS files |
| **NestJS Snippets** | `ashinzekene.nestjs` | Code snippets |

### Database

| Extension | ID | Purpose |
|-----------|-----|---------|
| **Prisma** | `prisma.prisma` | Prisma schema support |

### AI Assistant

| Extension | ID | Purpose |
|-----------|-----|---------|
| **Claude Code** | `anthropic.claude-code` | AI coding assistant |

---

## Quick Install

Copy and run in terminal:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension editorconfig.editorconfig
code --install-extension vue.volar
code --install-extension vue.vscode-typescript-vue-plugin
code --install-extension nuxt.mdc
code --install-extension imgildev.vscode-nestjs-generator
code --install-extension ashinzekene.nestjs
code --install-extension prisma.prisma
code --install-extension anthropic.claude-code
```

Or install all at once:

```bash
code --install-extension dbaeumer.vscode-eslint \
  --install-extension esbenp.prettier-vscode \
  --install-extension editorconfig.editorconfig \
  --install-extension vue.volar \
  --install-extension vue.vscode-typescript-vue-plugin \
  --install-extension nuxt.mdc \
  --install-extension imgildev.vscode-nestjs-generator \
  --install-extension ashinzekene.nestjs \
  --install-extension prisma.prisma \
  --install-extension anthropic.claude-code
```

---

## Recommended Extensions

### Git & Collaboration

| Extension | ID | Purpose |
|-----------|-----|---------|
| **GitLens** | `eamodio.gitlens` | Git blame, history |
| **Git Graph** | `mhutchie.git-graph` | Visual git history |

### Productivity

| Extension | ID | Purpose |
|-----------|-----|---------|
| **Auto Rename Tag** | `formulahendry.auto-rename-tag` | Rename paired HTML/Vue tags |
| **Path Intellisense** | `christian-kohler.path-intellisense` | Autocomplete file paths |
| **Import Cost** | `wix.vscode-import-cost` | Show import sizes |
| **Todo Tree** | `gruntfuggly.todo-tree` | Track TODOs in code |
| **Error Lens** | `usernamehw.errorlens` | Inline error display |

### Testing

| Extension | ID | Purpose |
|-----------|-----|---------|
| **Vitest** | `vitest.explorer` | Vitest test runner |
| **Jest** | `orta.vscode-jest` | Jest test runner |

### API Development

| Extension | ID | Purpose |
|-----------|-----|---------|
| **REST Client** | `humao.rest-client` | Test HTTP requests |
| **Thunder Client** | `rangav.vscode-thunder-client` | API testing GUI |

---

## Workspace Settings

Create `.vscode/settings.json` in your project:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },

  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.suggest.autoImports": true,

  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  },

  "files.associations": {
    "*.css": "tailwindcss"
  },

  "eslint.workingDirectories": [
    { "directory": "api", "changeProcessCWD": true },
    { "directory": "app", "changeProcessCWD": true }
  ]
}
```

---

## Extensions.json

Create `.vscode/extensions.json` for team recommendations:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "editorconfig.editorconfig",
    "vue.volar",
    "vue.vscode-typescript-vue-plugin",
    "nuxt.mdc",
    "imgildev.vscode-nestjs-generator",
    "ashinzekene.nestjs",
    "prisma.prisma",
    "anthropic.claude-code",
    "eamodio.gitlens"
  ]
}
```

---

## Keyboard Shortcuts

| Action | Shortcut (Mac) | Shortcut (Win) |
|--------|----------------|----------------|
| Format document | `Shift+Option+F` | `Shift+Alt+F` |
| Go to definition | `F12` | `F12` |
| Find references | `Shift+F12` | `Shift+F12` |
| Rename symbol | `F2` | `F2` |
| Quick fix | `Cmd+.` | `Ctrl+.` |
| Open terminal | `Ctrl+`` ` | `Ctrl+`` ` |
| Search files | `Cmd+P` | `Ctrl+P` |
| Search in files | `Shift+Cmd+F` | `Ctrl+Shift+F` |
| Toggle sidebar | `Cmd+B` | `Ctrl+B` |

---

## Troubleshooting

### Vue/Volar Not Working

1. Disable Vetur if installed (conflicts with Volar)
2. Reload VSCode window: `Cmd+Shift+P` > "Reload Window"
3. Check TypeScript version matches project

### Prisma Formatting Issues

1. Ensure Prisma extension is installed
2. Set Prisma as default formatter for `.prisma` files
3. Run `npx prisma format` manually if needed

### ESLint Not Finding Config

1. Check `eslint.workingDirectories` in settings
2. Ensure ESLint config exists in project root
3. Restart ESLint server: `Cmd+Shift+P` > "ESLint: Restart ESLint Server"

### TypeScript Path Aliases Not Resolving

1. Ensure `tsconfig.json` has correct paths
2. Reload TypeScript: `Cmd+Shift+P` > "TypeScript: Restart TS Server"
3. Check `#` alias is configured:

```json
{
  "compilerOptions": {
    "paths": {
      "#": ["src/slices"],
      "#*": ["src/slices/*"]
    }
  }
}
```

---

## Related Documentation

- [New Project Setup](./new-project.md)
- [Setup API](./setup-api.md)
- [Setup App](./setup-app.md)

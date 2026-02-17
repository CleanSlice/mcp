---
id: new-project
title: New Project Setup - PLAN.md REQUIRED
version: 1.0.0
last_updated: 2025-12-21

pattern: quickstart
complexity: fundamental
framework: full-stack
category: quickstart
applies_to: [api, app]

tags:
  - project
  - setup
  - structure
  - architecture
  - nestjs
  - nuxt
  - plan

keywords:
  - new project
  - project structure
  - cleanslice
  - architecture
  - nestjs
  - nuxt
  - PLAN.md

deprecated: false
experimental: false
production_ready: true
---

# New Project Setup

> **CRITICAL: Create PLAN.md BEFORE setting up ANY project.** Document what will be created and get user approval first. No exceptions.

---

## 🛑 STEP 0: RUN CLEANSLICE MCP SEARCH FIRST (MANDATORY)

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   BEFORE WRITING ANY PLAN, SEARCH THE CLEANSLICE MCP:            ║
║                                                                 ║
║   Use the "search" tool from the CleanSlice MCP server:          ║
║   (The server name may be: cleanslice-dev, cleanslice-local, etc.)║
║                                                                 ║
║   search(query: "gateway pattern")                              ║
║   search(query: "slice structure")                              ║
║   search(query: "nestjs standards")                             ║
║   search(query: "nuxt standards")                               ║
║   search(query: "new project setup")                            ║
║                                                                 ║
║   READ THE RETURNED DOCS. They tell you:                        ║
║   - Gateway pattern (NOT Repository)                            ║
║   - domain/, data/, dtos/ folder structure                      ║
║   - Provider.vue component pattern                              ║
║   - Prisma IS the repository (no UserRepository)                ║
║                                                                 ║
║   🚫 If you skip this, your plan WILL be wrong.                 ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

### Mandatory Pre-Plan Checklist

**Before writing your plan, confirm you have learned:**

- [ ] **Gateway pattern** - abstract in `domain/`, concrete in `data/`
- [ ] **Slice structure** - `domain/`, `data/`, `dtos/` folders required
- [ ] **Prisma IS the repository** - no UserRepository, ChatRepository
- [ ] **Provider.vue pattern** - every component folder needs it
- [ ] **File naming** - `{entity}.gateway.ts`, `{entity}.mapper.ts`

**If you cannot check ALL boxes, go back and fetch the docs.**

---

## ⚠️ WORKFLOW: FETCH DOCS → PLAN → APPROVAL → CODE ⚠️

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   🛑 BEFORE CREATING ANY PROJECT:                               ║
║                                                                 ║
║   1. RUN the MCP commands above (Step 0)                        ║
║   2. READ the returned docs                                     ║
║   3. CREATE HIGH-LEVEL PLAN.md (slices + responsibilities)      ║
║      - List slices and what each is responsible for             ║
║      - NO file details yet                                      ║
║   4. PRESENT plan to user, get approval                         ║
║   5. CREATE DETAILED PLAN (after approval)                      ║
║      - Now list exact file paths                                ║
║   6. PRESENT detailed plan, get approval                        ║
║   7. Only then run setup commands                               ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

### Two-Phase Planning

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   PHASE 1: HIGH-LEVEL PLAN                                      ║
║   - List slices and responsibilities                            ║
║   - Describe what each slice does                               ║
║   - NO file names, NO component names                           ║
║   - Get user approval                                           ║
║                                                                 ║
║   PHASE 2: DETAILED PLAN (after Phase 1 approval)               ║
║   - List exact file paths                                       ║
║   - Define component names                                      ║
║   - Write database schema                                       ║
║   - Get user approval                                           ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

### What You'll Learn From Each Doc

| Doc | Critical Knowledge |
|-----|-------------------|
| `gateway.md` | Gateway pattern, NOT Repository for database |
| `nestjs-standards.md` | `domain/`, `data/`, `dtos/` folder structure |
| `nuxtjs-standards.md` | Provider.vue pattern, auto-imports |
| `new-project.md` | Project setup, slices/ folders |

---

## CleanSlice Architecture

> **CleanSlice architecture**: API (NestJS) + App (Nuxt) with vertical slice organization. Each slice is a self-contained feature module.

---

## ⚠️ FIXED Technology Stack - NO CHOICE ⚠️

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   THE TECHNOLOGY IS FIXED - DO NOT ASK USER WHAT TO USE         ║
║                                                                 ║
║   api/ folder → NestJS (ALWAYS)                                 ║
║   app/ folder → Nuxt/Vue 3 (ALWAYS)                             ║
║                                                                 ║
║   🚫 NEVER USE: React, Vite, Next.js, Express, Fastify          ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

**DO NOT ask the user "What technologies do you want to use?" - the stack is FIXED.**

### Forbidden Terms in Plans

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   🛑 IF YOUR PLAN CONTAINS ANY OF THESE, REWRITE IT:            ║
║                                                                 ║
║   WRONG FRAMEWORKS:                                             ║
║   ❌ "React"           → Use Vue/Nuxt instead                   ║
║   ❌ "Vite"            → Use Nuxt (has Vite built-in)           ║
║   ❌ "Next.js"         → Use Nuxt instead                       ║
║   ❌ "Express"         → Use NestJS instead                     ║
║   ❌ "TypeORM"         → Use Prisma instead                     ║
║   ❌ "InversifyJS"     → NestJS has built-in DI                 ║
║                                                                 ║
║   WRONG PATTERNS (CRITICAL):                                    ║
║   ❌ "chat.repository.ts" → Must be "chat.gateway.ts"           ║
║   ❌ "UserRepository"  → Prisma IS the repository, use Gateway  ║
║   ❌ "ChatRepository"  → Use ChatGateway instead                ║
║   ❌ ".repository.ts"  → Use ".gateway.ts" (Gateway pattern)    ║
║   ❌ "useChat.ts"      → Must be "stores/chat.ts" (Pinia)       ║
║   ❌ "composables/useXxx" → Must be "stores/xxx.ts"             ║
║   ❌ "Service interface" → Use abstract class instead           ║
║   ❌ "useState"        → Use ref() or Pinia instead             ║
║                                                                 ║
║   WRONG FOLDER/FILE NAMES:                                      ║
║   ❌ "features/"       → Use "slices/" instead                  ║
║   ❌ "hooks/"          → Use "stores/" instead                  ║
║   ❌ "shared/"         → Use "setup/" slices instead            ║
║   ❌ "src/app/"        → Use "api/src/slices/" instead          ║
║   ❌ "Presentation/"   → Use "components/" or controller        ║
║   ❌ "Domain/"         → Use "domain/" (lowercase)              ║
║   ❌ "Data/"           → Use "data/" (lowercase)                ║
║   ❌ "ChatWindow.vue"  → Use "chat/Provider.vue"                ║
║   ❌ "ChatInput.vue"   → Use "chat/Input.vue"                   ║
║   ❌ ".jsx/.tsx"       → Use ".vue" files instead               ║
║   ❌ "create-message.dto.ts" → Use "createMessage.dto.ts"       ║
║                                                                 ║
║   WRONG APP LAYER PATTERNS:                                     ║
║   ❌ "app/repository/"  → Use API SDK, no manual repository     ║
║                                                                 ║
║   WRONG STYLING:                                                ║
║   ❌ "Vanilla CSS"     → Use Tailwind + shadcn-vue              ║
║   ❌ "CSS-in-JS"       → Use Tailwind + shadcn-vue              ║
║   ❌ "TailwindCSS (if requested)" → Always use Tailwind         ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

### Common Mistakes to Avoid

| Wrong | Correct | Why |
|-------|---------|-----|
| `chat.repository.ts` | `chat.gateway.ts` | Gateway pattern, Prisma IS the repo |
| `composables/useChat.ts` | `stores/chat.ts` | Use Pinia stores for state |
| `create-message.dto.ts` | `createMessage.dto.ts` | camelCase for DTO files |
| `ChatWindow.vue` | `chat/Provider.vue` | Provider.vue pattern |
| `app/repository/` | Use API SDK from `#api` | No manual API clients |

---

## Step 1: Create Project Folders

```bash
# Create project root
mkdir my-project
cd my-project
```

## Step 2: Initialize API (NestJS)

```bash
# CORRECT - Use NestJS CLI
npx @nestjs/cli new api --package-manager npm --skip-git

# WRONG - DO NOT USE:
# npx create-vite api          ❌ WRONG
# npx create-react-app api     ❌ WRONG
# npm init express api         ❌ WRONG
```

## Step 3: Initialize App (Nuxt)

```bash
# CORRECT - Use Nuxt CLI
npx nuxi init app

# WRONG - DO NOT USE:
# npx create-vite app          ❌ WRONG
# npx create-next-app app      ❌ WRONG
# npx create-react-app app     ❌ WRONG
```

## Step 4: Create Slices Folders

```bash
# API slices folder
mkdir -p api/src/slices

# App slices folder
mkdir -p app/slices
```

---

## Project Structure

```
your-project/
├── api/                      # Backend (NestJS)
│   └── src/
│       └── slices/
│           ├── user/         # Feature slice
│           ├── project/      # Feature slice
│           ├── prisma/       # Setup slice
│           └── core/         # Setup slice
│
└── app/                      # Frontend (Nuxt)
    └── slices/
        ├── user/             # Feature slice
        ├── project/          # Feature slice
        └── setup/            # Setup slices
            ├── theme/
            ├── pinia/
            ├── api/
            ├── error/
            └── i18n/
```

---

## The Golden Rule: SINGULAR Names

```
CORRECT                    WRONG
slices/user/               slices/users/
slices/project/            slices/projects/
user.service.ts            users.service.ts

EXCEPTION: Controller routes are PLURAL
@Controller('users')       ✓
@Controller('user')        ✗
```

---

## API Slice Structure (NestJS)

```
api/src/slices/{entity}/
├── {entity}.module.ts            # Module definition
├── {entity}.controller.ts        # @Controller('{entities}') PLURAL route
├── domain/
│   ├── index.ts                  # Barrel exports
│   ├── {entity}.types.ts         # Interfaces: IEntityData, ICreateEntityData
│   ├── {entity}.gateway.ts       # Abstract class: IEntityGateway
│   └── {entity}.service.ts       # Optional service facade
├── data/
│   ├── {entity}.gateway.ts       # Concrete gateway implementation
│   └── {entity}.mapper.ts        # Data transformation
└── dtos/
    ├── index.ts                  # Barrel exports
    ├── {entity}.dto.ts           # Response DTO
    ├── create{Entity}.dto.ts     # Create request DTO
    ├── update{Entity}.dto.ts     # Update request DTO
    └── filter{Entity}.dto.ts     # Query params DTO
```

### API Layer Flow

```
Controller → Gateway (abstract) → Gateway (impl) → Mapper → Prisma
     ↓              ↓                    ↓            ↓
   HTTP         Contract            Business      Transform
  Request       Interface            Logic          Data
```

---

## App Slice Structure (Nuxt)

```
app/slices/{entity}/
├── nuxt.config.ts                # Slice config with #alias
├── pages/
│   ├── {entities}.vue            # List page (PLURAL route)
│   ├── {entities}/[id].vue       # Detail page
│   └── {entities}/create.vue     # Create page
├── components/
│   ├── {entity}/                 # ONE level only
│   │   ├── Provider.vue          # REQUIRED - Bootstrap/data fetching
│   │   ├── Item.vue              # Display component
│   │   └── Form.vue              # Edit form
│   └── {entity}List/             # Combined name (not nested)
│       ├── Provider.vue          # REQUIRED
│       └── Thumb.vue             # List item card
├── stores/
│   └── {entity}.ts               # Pinia store
└── locales/
    ├── en.json
    └── fr.json
```

### App Layer Flow

```
Page → Provider.vue → Item/Form.vue → Store → API SDK
  ↓         ↓              ↓           ↓        ↓
Route    Fetch         Display      State    Backend
         Data          Components   Mgmt     Calls
```

---

## Setup Slices

### API Setup Slices

| Slice | Purpose |
|-------|---------|
| `prisma/` | Database client (PrismaService) |
| `core/` | Guards, interceptors, decorators |
| `aws/` | AWS services (S3, Cognito, etc.) |

### App Setup Slices

| Slice | Purpose |
|-------|---------|
| `setup/theme/` | Tailwind, shadcn-ui components |
| `setup/pinia/` | Store configuration |
| `setup/api/` | API SDK generation |
| `setup/error/` | Error handling, toast notifications |
| `setup/i18n/` | Internationalization |

---

## Path Aliases

### API (tsconfig.json)

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

### App (nuxt.config.ts per slice)

```typescript
// slices/user/auth/nuxt.config.ts
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  alias: {
    '#auth': currentDir,
  },
});
```

### Usage

```typescript
// API
import { IUserGateway } from '#user/user/domain';
import { PrismaService } from '#prisma';

// App
import { AuthService, UserDto } from '#api';
```

---

## Quick Setup Checklist

### API Project (NestJS)

- [ ] Run `npx @nestjs/cli new api --package-manager npm --skip-git`
- [ ] Create `api/src/slices/` folder
- [ ] Configure Prisma ([api-prisma.md](../01-setup/api-prisma.md))
- [ ] Setup Swagger ([api-swagger.md](../01-setup/api-swagger.md))
- [ ] Configure tsconfig paths for `#` aliases
- [ ] Create first feature slice

### App Project (Nuxt)

- [ ] Run `npx nuxi init app`
- [ ] Create `app/slices/` folder
- [ ] Setup theme slice ([app-theme.md](../01-setup/app-theme.md))
- [ ] Setup Pinia store ([app-store.md](../01-setup/app-store.md))
- [ ] Setup API SDK generation ([app-api.md](../01-setup/app-api.md))
- [ ] Setup i18n ([app-i18n.md](../01-setup/app-i18n.md))
- [ ] Setup error handling ([app-error.md](../01-setup/app-error.md))
- [ ] Create first feature slice

---

## Creating Your First Slice

### 1. API Slice

```bash
# Create folder structure
mkdir -p api/src/slices/project/{domain,data,dtos}

# Create files
touch api/src/slices/project/project.module.ts
touch api/src/slices/project/project.controller.ts
touch api/src/slices/project/domain/{index.ts,project.types.ts,project.gateway.ts}
touch api/src/slices/project/data/{project.gateway.ts,project.mapper.ts}
touch api/src/slices/project/dtos/{index.ts,project.dto.ts,createProject.dto.ts}
```

### 2. App Slice

```bash
# Create folder structure
mkdir -p app/slices/project/{pages,components/project,components/projectList,stores,locales}

# Create files
touch app/slices/project/nuxt.config.ts
touch app/slices/project/pages/projects.vue
touch app/slices/project/components/project/{Provider.vue,Item.vue,Form.vue}
touch app/slices/project/components/projectList/{Provider.vue,Thumb.vue}
touch app/slices/project/stores/project.ts
touch app/slices/project/locales/en.json
```

---

## Naming Conventions

| What | Convention | Example |
|------|------------|---------|
| Slice folder | SINGULAR | `user/`, `project/` |
| File names | camelCase | `createUser.dto.ts` |
| Controller route | PLURAL | `@Controller('users')` |
| Class names | PascalCase SINGULAR | `UserService` |
| Interfaces | I prefix | `IUserData`, `IUserGateway` |
| Enums | Types suffix | `RoleTypes`, `StatusTypes` |
| Types | Data suffix | `IUserData`, `ICreateUserData` |

---

## Module Registration

### API (app.module.ts)

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserModule,
    ProjectModule,
  ],
})
export class AppModule {}
```

### App (nuxt.config.ts)

```typescript
export default defineNuxtConfig({
  extends: [
    './slices/setup/theme',
    './slices/setup/pinia',
    './slices/setup/api',
    './slices/setup/error',
    './slices/setup/i18n',
    './slices/user/auth',
    './slices/user/account',
    './slices/project',
  ],
});
```

---

## Standards Reference

| Document | Purpose |
|----------|---------|
| [ts-standards.md](../02-standards/ts-standards.md) | TypeScript conventions |
| [nestjs-standards.md](../02-standards/nestjs-standards.md) | NestJS patterns |
| [nuxtjs-standards.md](../02-standards/nuxtjs-standards.md) | Nuxt patterns |

---

## Setup Guides

| Guide | Purpose |
|-------|---------|
| [setup-api.md](./setup-api.md) | Full API project setup |
| [setup-app.md](./setup-app.md) | Full App project setup |
| [api-prisma.md](../01-setup/api-prisma.md) | Database setup |
| [api-swagger.md](../01-setup/api-swagger.md) | API documentation |
| [app-theme.md](../01-setup/app-theme.md) | UI components |
| [app-api.md](../01-setup/app-api.md) | SDK generation |
| [app-i18n.md](../01-setup/app-i18n.md) | Translations |
| [app-error.md](../01-setup/app-error.md) | Error handling |

---

## Critical Rules

### Slices Folder is MANDATORY

```
╔═════════════════════════════════════════════════════════════════╗
║  🚫 WRONG: api/src/chat/           → Missing slices/ folder     ║
║  ✅ RIGHT: api/src/slices/chat/    → Correct location           ║
║                                                                 ║
║  🚫 WRONG: app/components/         → Missing slices/ folder     ║
║  ✅ RIGHT: app/slices/chat/components/ → Correct location       ║
╚═════════════════════════════════════════════════════════════════╝
```

### Nuxt Auto-Imports (DO NOT import manually)

```
╔═════════════════════════════════════════════════════════════════╗
║  🚫 WRONG:                                                       ║
║  import { ref, computed } from 'vue'                             ║
║  import { useAsyncData } from '#imports'                         ║
║                                                                  ║
║  ✅ RIGHT:                                                       ║
║  // No imports needed - Nuxt auto-imports these                  ║
║  const items = ref([])                                           ║
║  const { data } = await useAsyncData(...)                        ║
╚═════════════════════════════════════════════════════════════════╝
```

### Provider.vue is REQUIRED

```
╔═════════════════════════════════════════════════════════════════╗
║  🚫 WRONG:                                                       ║
║  components/chat/Layout.vue        → No Provider.vue             ║
║                                                                  ║
║  ✅ RIGHT:                                                       ║
║  components/chat/Provider.vue      → Bootstrap + data fetching   ║
║  components/chat/Layout.vue        → Display component           ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Never Do

- **Start coding without creating PLAN.md first** - Always plan first!
- **Ask user "What technologies do you want to use?"** - Stack is FIXED
- **Use `create-vite`, `create-react-app`, `create-next-app`** - WRONG tools
- **Use React, Vite, Next.js, Express, Fastify** - WRONG frameworks
- **Put code in `api/src/` or `app/` directly** - ALWAYS use `slices/` folder
- **Put components in `app/components/`** - use `app/slices/{slice}/components/`
- Use plural slice names (`users/` instead of `user/`)
- Create component folders without `Provider.vue`
- Nest components more than one level
- Skip the Gateway pattern for data access
- Import Vue APIs or Nuxt composables (auto-imported)
- Use `~/composables/` imports - use `#` aliases instead
- Put business logic in controllers

---

## Always Do

- **Create PLAN.md BEFORE starting any project setup**
- **Get user approval before running any setup commands**
- **Use `npx @nestjs/cli new api` for backend** - NestJS only
- **Use `npx nuxi init app` for frontend** - Nuxt only
- **Put ALL code in `slices/` folders** (`api/src/slices/`, `app/slices/`)
- Create `domain/`, `data/`, `dtos/` folders in API slices
- Create `Provider.vue` in every component folder
- Use SINGULAR slice names
- Use abstract classes for DI tokens (not interfaces)
- Use mappers for data transformation
- Configure `#` aliases for imports
- Follow layer separation: Controller → Gateway → Mapper

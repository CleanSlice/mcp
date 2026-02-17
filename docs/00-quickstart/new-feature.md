---
id: new-feature
title: New Feature Workflow - PLAN.md REQUIRED
version: 1.0.0
last_updated: 2025-12-21

pattern: workflow
complexity: fundamental
framework: full-stack
category: quickstart
applies_to: [api, app]

tags:
  - workflow
  - planning
  - feature
  - implementation
  - plan

keywords:
  - new feature
  - feature request
  - planning
  - implementation workflow
  - PLAN.md

deprecated: false
experimental: false
production_ready: true
---

# New Feature Workflow

> **CRITICAL: Create PLAN.md file BEFORE writing ANY code.** Present plan to user and get explicit approval. No exceptions.

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
║   search(query: "controller pattern")                           ║
║   search(query: "nestjs standards")                             ║
║   search(query: "nuxt standards")                               ║
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
║   🛑 BEFORE IMPLEMENTING ANY FEATURE:                           ║
║                                                                 ║
║   1. RUN the MCP commands above (Step 0)                        ║
║                                                                 ║
║   2. READ the returned docs                                     ║
║                                                                 ║
║   3. CREATE PLAN.md based on what you read                      ║
║      - Use Gateway pattern (NOT Repository)                     ║
║      - Use domain/, data/, dtos/ structure                      ║
║      - NOT React, Vite, Repository, hooks/                      ║
║                                                                 ║
║   4. PRESENT plan to user                                       ║
║                                                                 ║
║   5. WAIT for explicit approval                                 ║
║                                                                 ║
║   6. Only then start writing code                               ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  1. UNDERSTAND                                                   │
│  ─────────────────────────────────────────────────────────────  │
│  Clarify requirements, ask questions                             │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. PLAN                                                         │
│  ─────────────────────────────────────────────────────────────  │
│  Create detailed plan with files and structure                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. CONFIRM                                                      │
│  ─────────────────────────────────────────────────────────────  │
│  Present plan to user, wait for approval                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. IMPLEMENT                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  Follow standards, implement layer by layer                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. VERIFY                                                       │
│  ─────────────────────────────────────────────────────────────  │
│  Test, validate, confirm with user                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Understand

**Ask clarifying questions before planning:**

- What is the feature's purpose?
- Who will use it? (roles, permissions)
- What data does it need? (existing or new entities)
- Does it need API endpoints?
- Does it need UI components?
- Are there similar features to reference?

**Example questions:**

```
Before I create a plan, I need to clarify:

1. Should this feature be accessible to all users or only admins?
2. Do we need to create a new database table, or use existing data?
3. Should this integrate with any external services?
4. Are there any existing slices I should extend vs creating new ones?
```

---

## Phase 2: Plan (High-Level)

**Create a HIGH-LEVEL plan first. Do NOT include detailed file lists yet.**

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   🛑 PHASE 2 IS HIGH-LEVEL ONLY:                                ║
║                                                                 ║
║   ✅ DO: List slices and their responsibilities                 ║
║   ✅ DO: Describe what each slice does                          ║
║   ✅ DO: Identify API endpoints (broad strokes)                 ║
║   ✅ DO: Identify pages needed                                  ║
║                                                                 ║
║   ❌ DON'T: List individual .vue files                          ║
║   ❌ DON'T: List individual .ts files                           ║
║   ❌ DON'T: Write out component names                           ║
║   ❌ DON'T: Detail folder structures                            ║
║                                                                 ║
║   File details come in Phase 2b (after approval)                ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

### High-Level Plan Template

```markdown
## Feature: [Feature Name]

### Overview
[Brief description of what the feature does]

### Slices

| Slice | Type | Responsibility |
|-------|------|----------------|
| `chat` | Feature | Manages chat conversations and messages |
| `ai` | Feature | Handles AI provider integration |
| `user` | Existing | Extend with chat preferences |

### API Endpoints (Broad Strokes)

| Slice | Endpoints | Purpose |
|-------|-----------|---------|
| `chat` | CRUD for chats, messages | Chat management |
| `ai` | POST /ai/complete | AI completions |

### Pages Needed

| Slice | Pages | Purpose |
|-------|-------|---------|
| `chat` | List, Detail | View and manage chats |
| `user` | Settings | User preferences |

### Database Changes
- New `Chat` model with messages
- New `Message` model linked to chats
- Add `preferences` field to User

### Technology Stack (FIXED)
- Backend: NestJS + Prisma
- Frontend: Nuxt 3 + Vue 3 + Pinia
- Styling: Tailwind CSS + shadcn-vue

---

**Do you approve this high-level plan?**
After approval, I will detail the file structure for each slice.
```

---

## Phase 2b: Detailed Plan (After Approval)

**Only after user approves the high-level plan, create detailed file lists.**

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   🛑 PHASE 2b: DETAIL EACH SLICE                                ║
║                                                                 ║
║   For each approved slice, now specify:                         ║
║   - Exact file paths                                            ║
║   - Component names                                             ║
║   - DTO names                                                   ║
║   - Database schema                                             ║
║                                                                 ║
║   Use the pattern docs to get correct naming!                   ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

### Detailed Plan Template (Per Slice)

```markdown
## Detailed Plan: chat slice

### Database Schema
```prisma
model Chat {
  id        String    @id @default(cuid())
  title     String
  messages  Message[]
  createdAt DateTime  @default(now())
}

model Message {
  id        String   @id @default(cuid())
  content   String
  role      String
  chatId    String
  chat      Chat     @relation(fields: [chatId], references: [id])
  createdAt DateTime @default(now())
}
```

### API Files
- `api/src/slices/chat/chat.module.ts`
- `api/src/slices/chat/chat.controller.ts`
- `api/src/slices/chat/domain/chat.types.ts`
- `api/src/slices/chat/domain/chat.gateway.ts` (abstract)
- `api/src/slices/chat/data/chat.gateway.ts` (concrete)
- `api/src/slices/chat/data/chat.mapper.ts`
- `api/src/slices/chat/dtos/chat.dto.ts`
- `api/src/slices/chat/dtos/createChat.dto.ts`

### App Files
- `app/slices/chat/nuxt.config.ts`
- `app/slices/chat/pages/chats.vue`
- `app/slices/chat/pages/chats/[id].vue`
- `app/slices/chat/components/chat/Provider.vue`
- `app/slices/chat/components/chat/Layout.vue`
- `app/slices/chat/components/chatList/Provider.vue`
- `app/slices/chat/components/chatList/Thumb.vue`
- `app/slices/chat/stores/chat.ts`

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chats` | List user's chats |
| GET | `/chats/:id` | Get chat with messages |
| POST | `/chats` | Create new chat |
| DELETE | `/chats/:id` | Delete chat |

---

**Do you approve this detailed plan for the chat slice?**
```

### ⚠️ VALIDATE YOUR DETAILED PLAN ⚠️

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   🛑 CHECK FOR FORBIDDEN TERMS IN DETAILED PLAN:                ║
║                                                                 ║
║   WRONG FRAMEWORKS:                                             ║
║   ❌ "React"           → Must use Vue/Nuxt                      ║
║   ❌ "Vite"            → Must use Nuxt (has Vite built-in)      ║
║   ❌ "Next.js"         → Must use Nuxt                          ║
║   ❌ "TypeORM"         → Must use Prisma                        ║
║                                                                 ║
║   WRONG PATTERNS (CRITICAL):                                    ║
║   ❌ "chat.repository.ts" → Must be "chat.gateway.ts"           ║
║   ❌ "UserRepository"  → Prisma IS the repository, use Gateway  ║
║   ❌ ".repository.ts"  → Use ".gateway.ts" (Gateway pattern)    ║
║   ❌ "useChat.ts"      → Must be "stores/chat.ts" (Pinia)       ║
║   ❌ "composables/useXxx" → Must be "stores/xxx.ts"             ║
║                                                                 ║
║   WRONG FILE NAMES:                                             ║
║   ❌ "ChatWindow.vue"  → Must be "chat/Provider.vue"            ║
║   ❌ "ChatInput.vue"   → Must be "chat/Input.vue"               ║
║   ❌ "ChatMessage.vue" → Must be "chatMessage/Bubble.vue"       ║
║   ❌ "create-message.dto.ts" → Must be "createMessage.dto.ts"   ║
║   ❌ "chat-response.dto.ts" → Must be "chat.dto.ts" (camelCase) ║
║                                                                 ║
║   WRONG FOLDER NAMES:                                           ║
║   ❌ "features/"       → Must use "slices/"                     ║
║   ❌ "hooks/"          → Must use "stores/"                     ║
║   ❌ "Domain/"         → Must use "domain/" (lowercase)         ║
║                                                                 ║
║   WRONG APP LAYER PATTERNS:                                     ║
║   ❌ "app/repository/"  → Use API SDK, no manual repository     ║
║   ❌ "Vanilla CSS"     → Must use Tailwind + shadcn-vue         ║
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

## Phase 3: Confirm

**Get approval at TWO stages:**

### Stage 1: Approve High-Level Plan (Phase 2)

```markdown
## High-Level Plan for [Feature Name]

[Include slices table and responsibilities from Phase 2]

---

**Do you approve this high-level approach?**
- [ ] The slices make sense
- [ ] The responsibilities are correct
- [ ] The database changes are acceptable

After approval, I will detail the file structure.
```

### Stage 2: Approve Detailed Plan (Phase 2b)

```markdown
## Detailed Plan for [Slice Name]

[Include file lists from Phase 2b]

---

**Do you approve this detailed plan?**
- [ ] The file structure follows CleanSlice patterns
- [ ] The API endpoints are complete
- [ ] The components follow Provider.vue pattern
```

**Wait for explicit approval at BOTH stages before implementing.**

---

## Phase 4: Implement

**Follow the implementation order from the plan.**

### API Implementation

1. **Schema** - Add Prisma model, run migration
2. **Types** - Create interfaces in `domain/{entity}.types.ts`
3. **Gateway Abstract** - Define contract in `domain/{entity}.gateway.ts`
4. **Gateway Concrete** - Implement in `data/{entity}.gateway.ts`
5. **Mapper** - Create in `data/{entity}.mapper.ts`
6. **DTOs** - Create all DTOs in `dtos/`
7. **Controller** - Create with Swagger decorators
8. **Module** - Register all providers and exports
9. **SDK** - Regenerate API SDK for frontend

### App Implementation

1. **Slice Config** - Create `nuxt.config.ts` with alias
2. **Store** - Create Pinia store if needed
3. **Components** - Create Provider → Item → Form
4. **Pages** - Create page files using Provider components
5. **Locales** - Add translation keys
6. **Menu** - Register in sidebar if needed

### Standards to Follow

| Layer | Standard Document |
|-------|-------------------|
| TypeScript | [ts-standards.md](../02-standards/ts-standards.md) |
| NestJS API | [nestjs-standards.md](../02-standards/nestjs-standards.md) |
| Nuxt App | [nuxtjs-standards.md](../02-standards/nuxtjs-standards.md) |
| Controller | [controller.md](../03-patterns/controller.md) |
| Gateway | [gateway.md](../03-patterns/gateway.md) |
| Repository | [repository.md](../03-patterns/repository.md) |
| Service | [service.md](../03-patterns/service.md) |
| Mapper | [mapper.md](../03-patterns/mapper.md) |
| Types | [types.md](../03-patterns/types.md) |
| DTO | [dto.md](../03-patterns/dto.md) |

---

## Phase 5: Verify

**After implementation, verify everything works:**

```markdown
## Implementation Complete

### Files Created
- [x] `api/src/slices/{slice}/...` (list all files)
- [x] `app/slices/{slice}/...` (list all files)

### Verification Checklist
- [ ] API endpoints respond correctly
- [ ] Swagger documentation is accurate
- [ ] Frontend components render
- [ ] Forms validate and submit
- [ ] Error handling works
- [ ] Translations display correctly

### Next Steps
1. Run `npm run build` to verify no errors
2. Test the feature manually
3. Add any additional functionality as needed

Is there anything else you'd like me to adjust?
```

---

## Example: Adding a "Project" Feature

### User Request
> "Add a project feature where users can create and manage projects"

### Phase 1: Understand
```
Before planning, I need to clarify:
1. What fields should a project have? (name, description, status?)
2. Should projects belong to a team or a user?
3. What permissions are needed? (create, edit, delete)
4. Do we need project listing, detail, and create pages?
```

### Phase 2: Plan
```markdown
## Feature: Projects

### Overview
Users can create, view, edit, and delete projects within their team.

### Slice Structure
- [x] New slice: `slices/project/`

### Database Schema
```prisma
model Project {
  id          String   @id
  name        String
  description String?
  status      String   @default("active")
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### API Files
- [ ] `api/src/slices/project/domain/project.types.ts`
- [ ] `api/src/slices/project/domain/project.gateway.ts`
- [ ] `api/src/slices/project/data/project.gateway.ts`
- [ ] `api/src/slices/project/data/project.mapper.ts`
- [ ] `api/src/slices/project/dtos/project.dto.ts`
- [ ] `api/src/slices/project/dtos/createProject.dto.ts`
- [ ] `api/src/slices/project/dtos/updateProject.dto.ts`
- [ ] `api/src/slices/project/dtos/filterProject.dto.ts`
- [ ] `api/src/slices/project/project.controller.ts`
- [ ] `api/src/slices/project/project.module.ts`

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List team projects |
| GET | `/projects/:id` | Get project details |
| POST | `/projects` | Create project |
| PUT | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |

### App Files
- [ ] `app/slices/project/nuxt.config.ts`
- [ ] `app/slices/project/pages/projects.vue`
- [ ] `app/slices/project/pages/projects/[id].vue`
- [ ] `app/slices/project/pages/projects/create.vue`
- [ ] `app/slices/project/components/project/Provider.vue`
- [ ] `app/slices/project/components/project/Item.vue`
- [ ] `app/slices/project/components/project/Form.vue`
- [ ] `app/slices/project/components/projectList/Provider.vue`
- [ ] `app/slices/project/components/projectList/Thumb.vue`
- [ ] `app/slices/project/components/projectCreate/Provider.vue`
- [ ] `app/slices/project/components/projectCreate/Form.vue`
- [ ] `app/slices/project/stores/project.ts`
- [ ] `app/slices/project/locales/en.json`
```

### Phase 3: Confirm
```
Do you approve this plan for the Projects feature?
- Slice structure correct?
- API endpoints sufficient?
- UI components match expectations?
- Any additional fields or functionality needed?
```

### Phase 4: Implement
[Implement each file following the standards]

### Phase 5: Verify
```
Implementation complete. All files created and tested.
Ready for your review.
```

---

## Quick Reference

| Phase | Action | Output |
|-------|--------|--------|
| 1. Understand | Ask questions | Clear requirements |
| 2. Plan | Create detailed plan | File list + structure |
| 3. Confirm | Present plan | User approval |
| 4. Implement | Follow standards | Working code |
| 5. Verify | Test + validate | Confirmed feature |

**Never skip Phase 3 (Confirm).** Always get user approval before implementing.

---

## Critical Rules

### Nuxt Auto-Imports (DO NOT import manually)

```
╔═════════════════════════════════════════════════════════════════╗
║  🚫 WRONG:                                                       ║
║  import { ref, computed } from 'vue'                             ║
║  import { useAsyncData } from '#imports'                         ║
║  import { useRoute } from 'vue-router'                           ║
║                                                                  ║
║  ✅ RIGHT:                                                       ║
║  // No imports needed - Nuxt auto-imports these                  ║
║  const items = ref([])                                           ║
║  const route = useRoute()                                        ║
║  const { data } = await useAsyncData(...)                        ║
╚═════════════════════════════════════════════════════════════════╝
```

### Provider.vue is REQUIRED

Every component folder MUST have a `Provider.vue` file:

```
╔═════════════════════════════════════════════════════════════════╗
║  🚫 WRONG:                                                       ║
║  components/chat/Layout.vue        → No Provider.vue             ║
║  components/chat/Input.vue         → Direct use in page          ║
║                                                                  ║
║  ✅ RIGHT:                                                       ║
║  components/chat/Provider.vue      → Bootstrap + data fetching   ║
║  components/chat/Layout.vue        → Display component           ║
║  components/chat/Input.vue         → UI component                ║
╚═════════════════════════════════════════════════════════════════╝
```

### Use # Aliases (NOT ~/)

```
╔═════════════════════════════════════════════════════════════════╗
║  🚫 WRONG:                                                       ║
║  import { useChat } from '~/composables/useChat'                 ║
║  import MyComponent from '../../components/MyComponent.vue'      ║
║                                                                  ║
║  ✅ RIGHT:                                                       ║
║  import { useChat } from '#chat/composables/useChat'             ║
║  // Or for stores: Nuxt auto-imports, no import needed           ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Related Documentation

- [TypeScript Standards](../02-standards/ts-standards.md)
- [NestJS Standards](../02-standards/nestjs-standards.md)
- [Nuxt.js Standards](../02-standards/nuxtjs-standards.md)

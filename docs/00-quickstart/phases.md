---
id: phases
title: Four Phase Workflow with Loop
version: 3.0.0
last_updated: 2025-12-21

pattern: workflow
complexity: fundamental
framework: full-stack
category: quickstart
applies_to: [api, app]

tags:
  - workflow
  - planning
  - phases
  - approval
  - review
  - loop

keywords:
  - phase 1
  - phase 2
  - phase 3
  - phase 4
  - high-level plan
  - detailed plan
  - implementation
  - review
  - approval workflow
  - iteration loop

deprecated: false
experimental: false
production_ready: true
---

# Four Phase Workflow with Loop

> **CRITICAL: Every task follows FOUR PHASES with a LOOP. All four are MANDATORY. Get user approval at EVERY phase. Loop continues until user says "STOP".**

---

## STOP! THE MOST IMPORTANT RULE

```
AFTER PRESENTING EACH PHASE, YOU MUST:
1. ASK the approval question
2. END YOUR MESSAGE IMMEDIATELY
3. WAIT for user response in the NEXT message

DO NOT continue in the same message after asking for approval.
```

---

## THE FOUR MANDATORY PHASES (WITH LOOP)

```
PHASE 1: HIGH-LEVEL PLAN
  - List slices and responsibilities
  - Identify pages needed
  - API endpoints (broad strokes)
  - Database changes (what, not schema)
  - State tech stack (FIXED)
  - NO file paths, component names, schemas, or folder structures
  -> "Do you approve this high-level plan?" -> WAIT
           |
           v
PHASE 2: DETAILED PLAN
  - Exact file paths for each slice
  - Database schema (Prisma)
  - Component names (Provider.vue)
  - DTO names (camelCase)
  - Exact API endpoints
  - DO NOT SKIP TO IMPLEMENTATION
  -> "Do you approve this detailed plan?" -> WAIT
           |
           v
PHASE 3: IMPLEMENTATION
  - Phase 1 and Phase 2 approved
  - Implement API FIRST, then App
  - Follow approved plan exactly
           |
           v
PHASE 4: REVIEW
  - Review what was implemented
  - Validate against MCP docs
  - Identify issues and corrections
  - Plan next iteration details
  -> "STOP to end, or YES to continue?" -> WAIT
           |
     STOP -> DONE
     YES  -> LOOP BACK TO PHASE 2 or 3
```

---

## Phase 1: High-Level Plan

**Goal: Get agreement on WHAT to build before detailing HOW.**

### What to Include

| Section | Content | Example |
|---------|---------|---------|
| Overview | 1-2 sentences describing the feature | "Real-time chat with AI integration" |
| Slices | Slice names and responsibilities | `chat` - manages conversations |
| Pages | What pages are needed | List page, Detail page |
| Endpoints | API operations (broad) | CRUD for chats, WebSocket |
| Database | New models or changes | New Chat and Message models |
| Tech Stack | State it's FIXED | NestJS + Nuxt + Prisma |

### What NOT to Include

- Individual file paths (`chat.gateway.ts`, etc.)
- Component names (`Provider.vue`, `Layout.vue`)
- Database schema (Prisma model definitions)
- DTO names (`createMessage.dto.ts`)
- Folder structure details, TypeScript interfaces, implementation details
- **ALL OF THESE BELONG IN PHASE 2**

### Phase 1 Template

```markdown
# High-Level Plan: [Feature Name]

## Overview
[1-2 sentences describing what will be built]

## Slices

| Slice | Responsibility |
|-------|----------------|
| `sliceName` | What this slice handles |

## Pages Needed

| Page | Purpose |
|------|---------|
| List page | Display all items |
| Detail page | Display single item |

## API Endpoints (Broad Strokes)

| Slice | Endpoints | Purpose |
|-------|-----------|---------|
| `sliceName` | CRUD | Basic operations |

## Database Changes
- Brief description of new models (NOT the schema)

## Tech Stack (FIXED)
- Backend: NestJS + Prisma
- Frontend: Nuxt + Vue 3 + Pinia
- Styling: Tailwind + shadcn-vue

---

**Do you approve this high-level plan?**
After approval, I will create the detailed plan with file paths and schemas.
```

### After Phase 1: STOP AND WAIT

- ASK: "Do you approve this high-level plan?"
- WAIT for user response
- ONLY proceed to Phase 2 if user says YES
- Do NOT add file paths, schemas, or component names yet
- Do NOT continue in the same message or assume approval

---

## Phase 2: Detailed Plan

**Goal: Define exact files, folders, and schemas AFTER Phase 1 approval.**

Phase 2 is MANDATORY. Do NOT skip from Phase 1 directly to coding.

### What to Include

| Section | Content | Example |
|---------|---------|---------|
| Database Schema | Prisma model definition | `model Chat { ... }` |
| API Files | Exact file paths | `api/src/slices/chat/...` |
| App Files | Exact file paths | `app/slices/chat/...` |
| Component Names | Using Provider.vue pattern | `chat/Provider.vue` |
| DTO Names | camelCase naming | `createChat.dto.ts` |
| API Endpoints | Exact paths and methods | `GET /chats/:id` |

### Phase 2 Template (Per Slice)

```markdown
# Detailed Plan: [slice] slice

## Database Schema
```prisma
model Entity {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}
```

## API Files
- `api/src/slices/{slice}/{slice}.module.ts`
- `api/src/slices/{slice}/{slice}.controller.ts`
- `api/src/slices/{slice}/domain/{slice}.types.ts`
- `api/src/slices/{slice}/domain/{slice}.gateway.ts` (abstract)
- `api/src/slices/{slice}/data/{slice}.gateway.ts` (concrete)
- `api/src/slices/{slice}/data/{slice}.mapper.ts`
- `api/src/slices/{slice}/dtos/{slice}.dto.ts`
- `api/src/slices/{slice}/dtos/create{Slice}.dto.ts`

## App Files
- `app/slices/{slice}/nuxt.config.ts`
- `app/slices/{slice}/pages/{slices}.vue`
- `app/slices/{slice}/pages/{slices}/[id].vue`
- `app/slices/{slice}/components/{slice}/Provider.vue`
- `app/slices/{slice}/components/{slice}/Layout.vue`
- `app/slices/{slice}/components/{slice}List/Provider.vue`
- `app/slices/{slice}/components/{slice}List/Thumb.vue`
- `app/slices/{slice}/stores/{slice}.ts`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/{slices}` | List all |
| GET | `/{slices}/:id` | Get one |
| POST | `/{slices}` | Create |
| PATCH | `/{slices}/:id` | Update |
| DELETE | `/{slices}/:id` | Delete |

---

**Do you approve this detailed plan?**
```

### Validation Before Presenting Phase 2

**Check for forbidden terms:**

| Wrong | Correct |
|-------|---------|
| `.repository.ts` | `.gateway.ts` |
| `UserRepository` | Gateway (Prisma IS the repo) |
| `ChatService` | No Service layer, use Gateway |
| `composables/useXxx` | `stores/xxx.ts` (Pinia) |
| `useChat.ts` | `stores/chat.ts` |
| `create-message.dto.ts` | `createMessage.dto.ts` |
| `ChatWindow.vue` | `chat/Provider.vue` |
| React / Next.js / Vite | Nuxt |
| Express | NestJS |
| Vanilla CSS | Tailwind + shadcn-vue |

If ANY appear, FIX BEFORE PRESENTING.

### After Phase 2: STOP AND WAIT

- ASK: "Do you approve this detailed plan?"
- WAIT for user response
- ONLY proceed to Phase 3 if user says YES
- Do NOT start writing code yet
- Do NOT continue in the same message or assume approval

---

## Phase 3: Implementation

**Goal: Write code following the approved plan exactly.**

Prerequisites:
- Phase 1 (High-Level Plan) is approved
- Phase 2 (Detailed Plan) is approved
- MCP docs have been fetched for patterns

If Phase 2 is NOT approved, STOP. Go back and do Phase 2.

### Implementation Order: API FIRST, THEN APP

**STEP 1: Implement API (Backend) FIRST**

1. `schema.prisma` (add model)
2. `prisma migrate`
3. `domain/{slice}.types.ts`
4. `domain/{slice}.gateway.ts` (abstract)
5. `data/{slice}.mapper.ts`
6. `data/{slice}.gateway.ts` (concrete)
7. `dtos/*.dto.ts`
8. `{slice}.controller.ts`
9. `{slice}.module.ts`

**STEP 2: Implement App (Frontend) SECOND**

1. `nuxt.config.ts` (slice config)
2. `stores/{slice}.ts` (Pinia)
3. `components/{slice}/Provider.vue`
4. `components/{slice}/Layout.vue`
5. `components/{slice}List/Provider.vue`
6. `components/{slice}List/Thumb.vue`
7. `pages/{slices}.vue`
8. `pages/{slices}/[id].vue`

Do NOT implement App before API is complete.

---

## Phase 4: Review

**Goal: Validate what was implemented, identify issues, and plan the next iteration.**

Phase 4 is MANDATORY. The loop continues until the user says "STOP".

### What to Do

| Step | Action | Details |
|------|--------|---------|
| 1 | **Review Implementation** | Check what was built vs. the plan |
| 2 | **Validate Against MCP** | Search MCP for patterns (gateway, controller, etc.) |
| 3 | **Identify Issues** | List deviations, bugs, or improvements |
| 4 | **Correct the Plan** | Update the detailed plan with fixes |
| 5 | **Plan Next Iteration** | What additional features or fixes are needed |

### Phase 4 Template

```markdown
# Review: [Feature Name] - Iteration [N]

## What Was Implemented
- [List what was built in this iteration]

## MCP Validation
Searched and validated against:
- `gateway.md` - Using Gateway pattern correctly
- `controller.md` - Controllers follow standards
- `nestjs-standards.md` - [issues found]

## Issues Found
| Issue | File | Correction Needed |
|-------|------|-------------------|
| [issue] | [file path] | [what to fix] |

## Next Iteration Plan
If approved to continue:
- [What will be added/fixed next]

---

**Do you approve? Say STOP to end, or YES to continue with more implementation.**
```

### The Review-Implement Loop

```
After Phase 4 Review:

USER SAYS "STOP"  ->  DONE (end task)

USER SAYS "YES"   ->  LOOP BACK:
  1. Update Phase 2 (add details)
  2. Get approval
  3. Phase 3 (implement more)
  4. Phase 4 (review again)
  5. Ask again: STOP or YES?

LOOP CONTINUES until user says "STOP"
```

### MCP Validation Checklist

| Document | What to Check |
|----------|---------------|
| `gateway.md` | Using Gateway pattern, not Repository |
| `controller.md` | Controller structure and decorators |
| `mapper.md` | Mapper implementation |
| `dto.md` | DTO naming (camelCase) and structure |
| `nestjs-standards.md` | API slice structure: domain/, data/, dtos/ |
| `nuxtjs-standards.md` | App slice structure, Provider.vue pattern |
| `ts-standards.md` | TypeScript conventions |

---

## Quick Decision Guide

### Which Phase Am I In?

| Question | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|----------|---------|---------|---------|---------|
| What slices do we need? | Yes | - | - | - |
| What pages do we need? | Yes | - | - | - |
| What endpoints (broadly)? | Yes | - | - | - |
| What are the file paths? | - | Yes | - | - |
| What is the database schema? | - | Yes | - | - |
| What are component names? | - | Yes | - | - |
| Time to write code? | - | - | Yes | - |
| Time to review and validate? | - | - | - | Yes |
| Is the implementation correct? | - | - | - | Yes |
| What's next? | - | - | - | Yes |

### When to Ask for Approval

| Situation | Action |
|-----------|--------|
| Finished listing slices and responsibilities | Ask: "Do you approve this high-level plan?" |
| Finished listing files and schemas | Ask: "Do you approve this detailed plan?" |
| Finished implementing and reviewing | Ask: "STOP to end, or YES to continue?" |
| User says "yes" to Phase 1 | Proceed to Phase 2 |
| User says "yes" to Phase 2 | Proceed to Phase 3 |
| User says "yes" to Phase 4 | Loop back to Phase 2/3 |
| User says "stop" to Phase 4 | End the task |
| User says "no" or has changes | Revise the current phase |

---

## Common Mistakes

### The Most Critical Mistake

Not waiting for user approval between phases. Present the phase, ask approval, END YOUR MESSAGE. Wait for the user to respond before continuing.

### Phase 1 Mistakes

| Mistake | Why It's Wrong |
|---------|----------------|
| Listing file paths in Phase 1 | Too detailed - save for Phase 2 |
| Writing Prisma schema in Phase 1 | Too detailed - save for Phase 2 |
| Naming components in Phase 1 | Too detailed - save for Phase 2 |
| Skipping to Phase 2 without approval | User hasn't agreed to the approach |
| Continuing in the same message | Must STOP and wait for user YES |
| Using React/Vite instead of Nuxt | Tech stack is FIXED |

### Phase 2 Mistakes

| Mistake | Correct Pattern |
|---------|-----------------|
| Skipping Phase 2 entirely | MUST do Phase 2 before coding |
| `chat.repository.ts` | `chat.gateway.ts` |
| `composables/useChat.ts` | `stores/chat.ts` |
| `create-message.dto.ts` | `createMessage.dto.ts` |
| `ChatWindow.vue` | `chat/Provider.vue` |

### Phase 3 Mistakes

| Mistake | Why It's Wrong |
|---------|----------------|
| Starting without Phase 2 approval | Plan isn't finalized |
| Deviating from approved plan | User approved specific structure |
| Implementing App before API | API must be done first |

### Phase 4 Mistakes

| Mistake | Why It's Wrong |
|---------|----------------|
| Skipping Phase 4 entirely | MUST review before ending or continuing |
| Not validating against MCP docs | May have used wrong patterns |
| Ending without asking STOP/YES | User must decide when to stop |
| Not planning next iteration | If continuing, need clear next steps |

---

## Example: Chat Feature

### Phase 1 Example (High-Level)

```markdown
# High-Level Plan: Chat Feature

## Overview
Real-time chat feature with AI integration using WebSockets.

## Slices

| Slice | Responsibility |
|-------|----------------|
| `chat` | Manages conversations and message history |
| `message` | Handles individual messages and WebSocket events |
| `ai` | AI provider integration for responses |

## Pages Needed

| Page | Purpose |
|------|---------|
| Chat list | Display all conversations |
| Chat detail | Active conversation view |

## API Endpoints (Broad Strokes)

| Slice | Endpoints | Purpose |
|-------|-----------|---------|
| `chat` | CRUD | Chat management |
| `message` | GET, POST, WebSocket | Message handling |
| `ai` | POST | AI completions |

## Database Changes
- New Chat model
- New Message model linked to chats

## Tech Stack (FIXED)
- Backend: NestJS + Prisma + WebSocket Gateway
- Frontend: Nuxt 3 + Vue 3 + Pinia
- Styling: Tailwind CSS + shadcn-vue

---

**Do you approve this high-level plan?**
```

### Phase 2 Example (After Phase 1 Approval)

```markdown
# Detailed Plan: chat slice

## Database Schema
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

## API Files
- `api/src/slices/chat/chat.module.ts`
- `api/src/slices/chat/chat.controller.ts`
- `api/src/slices/chat/domain/chat.types.ts`
- `api/src/slices/chat/domain/chat.gateway.ts` (abstract)
- `api/src/slices/chat/data/chat.gateway.ts` (concrete)
- `api/src/slices/chat/data/chat.mapper.ts`
- `api/src/slices/chat/dtos/chat.dto.ts`
- `api/src/slices/chat/dtos/createChat.dto.ts`

## App Files
- `app/slices/chat/nuxt.config.ts`
- `app/slices/chat/pages/chats.vue`
- `app/slices/chat/pages/chats/[id].vue`
- `app/slices/chat/components/chat/Provider.vue`
- `app/slices/chat/components/chat/Layout.vue`
- `app/slices/chat/components/chatList/Provider.vue`
- `app/slices/chat/components/chatList/Thumb.vue`
- `app/slices/chat/stores/chat.ts`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chats` | List user's chats |
| GET | `/chats/:id` | Get chat with messages |
| POST | `/chats` | Create new chat |
| DELETE | `/chats/:id` | Delete chat |

---

**Do you approve this detailed plan?**
```

### Phase 4 Example (After Implementation)

```markdown
# Review: Chat Feature - Iteration 1

## What Was Implemented
- Chat model in Prisma schema
- API: chat.gateway.ts, chat.controller.ts, chat.mapper.ts
- App: chat store, Provider.vue components, pages

## MCP Validation
- `gateway.md` - Using Gateway pattern correctly
- `controller.md` - Controller follows NestJS standards
- `nestjs-standards.md` - Slice structure: domain/, data/, dtos/
- `nuxtjs-standards.md` - Provider.vue pattern used

## Next Iteration Plan
- Add message slice (separate from chat)
- Implement WebSocket gateway for real-time
- Add AI integration slice

---

**Do you approve? Say STOP to end, or YES to continue with more implementation.**
```

---

## Summary

```
FOUR PHASES WITH LOOP. ALL MANDATORY. NO SKIPPING.

PHASE 1: High-Level Plan
  -> Slices, pages, endpoints (NO file paths)
  -> "Do you approve?" -> WAIT for YES

PHASE 2: Detailed Plan
  -> Files, schemas, components (ALL details)
  -> "Do you approve?" -> WAIT for YES
  -> DO NOT SKIP THIS PHASE

PHASE 3: Implementation
  -> Only after BOTH Phase 1 and Phase 2 approved
  -> Implement API FIRST, then App

PHASE 4: Review
  -> Validate against MCP docs
  -> Identify issues and corrections
  -> "STOP to end, or YES to continue?" -> WAIT
  -> LOOP back to Phase 2/3 if YES

THE LOOP CONTINUES UNTIL USER SAYS "STOP"
```

---

## Related Documentation

| Topic | Document |
|-------|----------|
| Get Started | [get-started.md](./get-started.md) |
| New Project | [new-project.md](./new-project.md) |
| New Feature | [new-feature.md](./new-feature.md) |
| Bug Fix | [fix-bug.md](./fix-bug.md) |
| Gateway Pattern | [gateway.md](../03-patterns/gateway.md) |

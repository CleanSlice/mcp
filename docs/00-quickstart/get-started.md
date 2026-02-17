---
id: get-started
title: Agent Quick Start
version: 4.0.0
last_updated: 2025-12-21

pattern: quickstart
complexity: fundamental
framework: full-stack
category: quickstart
applies_to: [api, app]

tags:
  - quickstart
  - agent
  - workflow
  - rules
  - overview
  - review
  - loop

keywords:
  - get started
  - agent rules
  - workflow
  - planning
  - overview
  - review phase
  - iteration loop

deprecated: false
experimental: false
production_ready: true
---

# Agent Quick Start

> **READ THIS FIRST. Then read the linked documents before any planning or coding.**

---

## ⛔ STOP! READ THIS BEFORE DOING ANYTHING

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   🚨 CRITICAL INSTRUCTION 🚨                                    ║
║                                                                 ║
║   When you finish Phase 1 (high-level plan):                    ║
║                                                                 ║
║   1. STOP IMMEDIATELY                                           ║
║   2. ASK: "Do you approve this high-level plan?"                ║
║   3. END YOUR MESSAGE - do not write anything else              ║
║   4. WAIT for the user to respond in the NEXT message           ║
║                                                                 ║
║   ❌ DO NOT write Phase 2 details in the same message           ║
║   ❌ DO NOT create any files yet                                ║
║   ❌ DO NOT assume approval                                     ║
║   ❌ DO NOT include file paths, schemas, or component names     ║
║                                                                 ║
║   WRONG EXAMPLE:                                                ║
║   "Here's the plan... Do you approve? Now here are the files..."║
║   ^^^^ THIS IS WRONG - you continued after asking               ║
║                                                                 ║
║   RIGHT EXAMPLE:                                                ║
║   "Here's the high-level plan... Do you approve?"               ║
║   [END OF MESSAGE - wait for user response]                     ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## 🛑 THE FOUR PHASES (WITH LOOP)

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   YOU MUST FOLLOW ALL FOUR PHASES. NO EXCEPTIONS.               ║
║   THE LOOP CONTINUES UNTIL USER SAYS "STOP"                     ║
║                                                                 ║
║   ┌─────────────────────────────────────────────────────────┐   ║
║   │  PHASE 1: HIGH-LEVEL PLAN                               │   ║
║   │  ─────────────────────────                              │   ║
║   │  • List slices and responsibilities                     │   ║
║   │  • Identify pages and endpoints (broad strokes)         │   ║
║   │  • NO file paths, NO schemas, NO component names        │   ║
║   │                                                         │   ║
║   │  → Ask: "Do you approve this high-level plan?"          │   ║
║   │  → STOP! WAIT for user to say YES                       │   ║
║   │  → DO NOT continue in the same message!                 │   ║
║   └─────────────────────────────────────────────────────────┘   ║
║                            │                                    ║
║                     (WAIT FOR YES)                              ║
║                            │                                    ║
║                            ▼                                    ║
║   ┌─────────────────────────────────────────────────────────┐   ║
║   │  PHASE 2: DETAILED PLAN                                 │   ║
║   │  ──────────────────────                                 │   ║
║   │  • List exact file paths for each slice                 │   ║
║   │  • Write database schema (Prisma)                       │   ║
║   │  • Name all components (Provider.vue pattern)           │   ║
║   │  • Define exact API endpoints                           │   ║
║   │                                                         │   ║
║   │  → Ask: "Do you approve this detailed plan?"            │   ║
║   │  → STOP! WAIT for user to say YES                       │   ║
║   │  → DO NOT continue in the same message!                 │   ║
║   └─────────────────────────────────────────────────────────┘   ║
║                            │                                    ║
║                     (WAIT FOR YES)                              ║
║                            │                                    ║
║                            ▼                                    ║
║   ┌─────────────────────────────────────────────────────────┐   ║
║   │  PHASE 3: IMPLEMENTATION                                │   ║
║   │  ───────────────────────                                │   ║
║   │  • ONLY after Phase 1 AND Phase 2 are approved          │   ║
║   │  • Implement API FIRST, then App                        │   ║
║   │  • Follow the approved plan exactly                     │   ║
║   └─────────────────────────────────────────────────────────┘   ║
║                            │                                    ║
║                            ▼                                    ║
║   ┌─────────────────────────────────────────────────────────┐   ║
║   │  PHASE 4: REVIEW                                        │   ║
║   │  ───────────────                                        │   ║
║   │  • Review what was implemented                          │   ║
║   │  • Validate against MCP docs (search for patterns)      │   ║
║   │  • Identify issues and corrections needed               │   ║
║   │  • Plan next iteration details                          │   ║
║   │                                                         │   ║
║   │  → Ask: "Do you approve? Say STOP to end, or YES        │   ║
║   │         to continue with more implementation."          │   ║
║   │  → WAIT for user response                               │   ║
║   └─────────────────────────────────────────────────────────┘   ║
║                            │                                    ║
║              ┌─────────────┴─────────────┐                      ║
║              │                           │                      ║
║           "STOP"                       "YES"                    ║
║              │                           │                      ║
║              ▼                           ▼                      ║
║         ┌────────┐              ┌────────────────┐              ║
║         │  DONE  │              │ LOOP BACK TO   │              ║
║         └────────┘              │ PHASE 2 or 3   │              ║
║                                 └────────────────┘              ║
║                                                                 ║
║   🚫 SKIPPING PHASE 2 = WRONG. You MUST do Phase 2.             ║
║   🔄 LOOP CONTINUES until user says "STOP"                      ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

**See [phases.md](./phases.md) for full details and templates.**

---

## 🛑 CRITICAL: STOP AND WAIT FOR APPROVAL

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   ⚠️ THE MOST COMMON MISTAKE:                                   ║
║   Agents continue to the next phase WITHOUT waiting for user    ║
║   approval. This is WRONG.                                      ║
║                                                                 ║
║   AFTER EACH PHASE, YOU MUST:                                   ║
║                                                                 ║
║   1. Present your plan/review to the user                       ║
║   2. Ask the approval question                                  ║
║   3. STOP. End your message.                                    ║
║   4. WAIT for the user to respond in the next message           ║
║   5. ONLY continue after user says YES                          ║
║                                                                 ║
║   ❌ WRONG: Present Phase 1, then immediately add Phase 2       ║
║   ❌ WRONG: Ask for approval but continue in same message       ║
║   ❌ WRONG: Assume the user will approve                        ║
║                                                                 ║
║   ✅ RIGHT: Present Phase 1, ask approval, STOP, wait           ║
║   ✅ RIGHT: User says YES, then you do Phase 2                  ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## The Golden Rules

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   1. FETCH DOCS FIRST                                           ║
║      Search the MCP before writing any plan                     ║
║                                                                 ║
║   2. FOUR PHASES WITH LOOP (ALL MANDATORY)                      ║
║      Phase 1 → Phase 2 → Phase 3 → Phase 4 → (loop or stop)     ║
║                                                                 ║
║   3. ALWAYS GET APPROVAL AT EVERY PHASE                         ║
║      Never proceed to next phase without user saying "yes"      ║
║                                                                 ║
║   4. TECH STACK IS FIXED                                        ║
║      NestJS + Nuxt + Prisma + Tailwind. No exceptions.          ║
║                                                                 ║
║   5. API FIRST, THEN APP                                        ║
║      In Phase 3, always implement API before App                ║
║                                                                 ║
║   6. LOOP UNTIL USER SAYS STOP                                  ║
║      After Phase 4, loop back to add more. Stop only when told. ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Must-Read Documents

**Before doing ANY work, read these documents in order:**

| Order | Document | What You'll Learn |
|-------|----------|-------------------|
| 1 | **[phases.md](./phases.md)** | Four phase workflow with loop, templates, approval process |
| 2 | **[new-project.md](./new-project.md)** | Project setup, folder structure, CLI commands |
| 3 | **[new-feature.md](./new-feature.md)** | Feature implementation workflow |
| 4 | **[fix-bug.md](./fix-bug.md)** | Bug investigation and fix workflow |

**Pattern documents (fetch via MCP search):**

| Document | What You'll Learn |
|----------|-------------------|
| `gateway.md` | Gateway pattern (NOT Repository) |
| `nestjs-standards.md` | API slice structure: `domain/`, `data/`, `dtos/` |
| `nuxtjs-standards.md` | App slice structure, Provider.vue pattern |

---

## Step 0: Fetch Docs (MANDATORY)

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   BEFORE WRITING ANY PLAN, SEARCH THE CLEANSLICE MCP:            ║
║                                                                 ║
║   search(query: "phases workflow")                              ║
║   search(query: "gateway pattern")                              ║
║   search(query: "slice structure")                              ║
║   search(query: "nestjs standards")                             ║
║   search(query: "nuxt standards")                               ║
║                                                                 ║
║   🚫 If you skip this, your plan WILL be wrong.                 ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Phase Summary

| Phase | What You Do | What You Ask | What You Wait For |
|-------|-------------|--------------|-------------------|
| **Phase 1** | List slices, pages, endpoints (NO file paths) | "Do you approve this high-level plan?" | User says YES |
| **Phase 2** | List files, schemas, components (ALL details) | "Do you approve this detailed plan?" | User says YES |
| **Phase 3** | Write code: API first, then App | - | - |
| **Phase 4** | Review, validate against MCP, plan next iteration | "STOP to end, or YES to continue?" | User says STOP or YES |

---

## Technology Stack (FIXED)

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   🚫 DO NOT ASK: "What technologies do you want to use?"        ║
║                                                                 ║
║   api/ folder → NestJS + Prisma                                 ║
║   app/ folder → Nuxt + Vue 3 + Pinia                            ║
║   styling     → Tailwind + shadcn-vue                           ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Project Structure (Summary)

```
your-project/
├── api/                      # Backend - NestJS (implement FIRST)
│   └── src/slices/           # ALL features in slices/
│
├── app/                      # Frontend - Nuxt (implement SECOND)
│   └── slices/               # ALL features in slices/
│
└── admin/                    # Admin panel - Nuxt (optional)
```

---

## Critical Rules

| Rule | Details |
|------|---------|
| **Slices folder** | ALL code goes in `slices/` - never in root |
| **Singular names** | `user/` not `users/` (except controller routes) |
| **Provider.vue** | Every component folder needs Provider.vue |
| **Gateway pattern** | Abstract in `domain/`, concrete in `data/` |
| **Pinia for state** | Use `stores/` not `composables/` for state |
| **camelCase DTOs** | `createChat.dto.ts` not `create-chat.dto.ts` |
| **API first** | In Phase 3, implement API before App |

---

## Forbidden Terms

If ANY of these appear in your plan, **FIX BEFORE PRESENTING**:

| Wrong | Correct |
|-------|---------|
| `.repository.ts` | `.gateway.ts` |
| `ChatService`, `AiService` | Just use Gateway (no Service layer) |
| `composables/useChat.ts` | `stores/chat.ts` |
| `create-message.dto.ts` | `createMessage.dto.ts` |
| `ChatWindow.vue` | `chat/Provider.vue` |
| `Presentation Layer` | `components/` or controller |
| `features/` | `slices/` |
| `hooks/` | `stores/` |
| React / Next.js / Vite | Nuxt |
| Express | NestJS |
| Vanilla CSS | Tailwind + shadcn-vue |
| Implementation Roadmap in Phase 1 | Save for Phase 2 |

---

## Request Type Router

| User Says | Read This Document |
|-----------|-------------------|
| "New project", "Start from scratch" | [new-project.md](./new-project.md) |
| "Add feature", "Implement", "Create" | [new-feature.md](./new-feature.md) |
| "Fix bug", "Error", "Not working" | [fix-bug.md](./fix-bug.md) |
| "How do phases work?" | [phases.md](./phases.md) |

---

## Quick Reference

### ❌ NEVER DO

1. **Skip Phase 2** - you MUST do the detailed plan
2. **Skip Phase 4** - you MUST do the review
3. Start coding without Phase 2 approval
4. Ask about tech stack - it's FIXED
5. Use Repository pattern - use Gateway
6. Use composables for state - use Pinia stores
7. Implement App before API
8. Stop without user saying "STOP"

### ✅ ALWAYS DO

1. Fetch MCP docs before planning
2. Do Phase 1 (high-level) → get approval
3. Do Phase 2 (detailed) → get approval
4. Then Phase 3 (implementation)
5. In Phase 3: API first, then App
6. Do Phase 4 (review) → validate against MCP docs
7. Loop back to Phase 2/3 unless user says "STOP"
8. Validate plan against forbidden terms at every phase

---

## Workflow Diagram

```
User Request
     │
     ▼
┌─────────────────┐
│  FETCH DOCS     │  ← search(query: "gateway pattern") etc.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PHASE 1        │  ← Slices, pages, endpoints (NO file paths!)
│  High-Level     │
└────────┬────────┘
         │
         ▼
    "Do you approve?"  ──No──→  Revise Phase 1
         │
        Yes
         │
         ▼
┌─────────────────┐
│  PHASE 2        │  ← Files, schemas, components (ALL details!)
│  Detailed       │     ⚠️ DO NOT SKIP THIS PHASE
└────────┬────────┘
         │
         ▼
    "Do you approve?"  ──No──→  Revise Phase 2
         │
        Yes
         │
         ▼
┌─────────────────┐
│  PHASE 3        │  ← Write code: API FIRST, then App
│  Implementation │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PHASE 4        │  ← Review, validate against MCP docs
│  Review         │     Identify issues, plan next iteration
└────────┬────────┘
         │
         ▼
    "STOP or continue?"
         │
    ┌────┴────┐
    │         │
  STOP       YES
    │         │
    ▼         ▼
┌────────┐  ┌─────────────────┐
│  DONE  │  │  LOOP BACK TO   │──→ Phase 2 or 3
└────────┘  │  (add details,  │
            │   implement)    │
            └─────────────────┘
```

---

## Related Documentation

### Quickstart (Read First)

| Document | Purpose |
|----------|---------|
| [phases.md](./phases.md) | Four phase workflow with loop |
| [new-project.md](./new-project.md) | Project setup guide |
| [new-feature.md](./new-feature.md) | Feature implementation guide |
| [fix-bug.md](./fix-bug.md) | Bug fix workflow |

### Standards (Fetch via MCP)

| Document | Purpose |
|----------|---------|
| `nestjs-standards.md` | API coding standards |
| `nuxtjs-standards.md` | App coding standards |
| `ts-standards.md` | TypeScript conventions |

### Patterns (Fetch via MCP)

| Document | Purpose |
|----------|---------|
| `gateway.md` | Gateway pattern (data access) |
| `controller.md` | Controller pattern (HTTP) |
| `mapper.md` | Mapper pattern (transformation) |
| `dto.md` | DTO pattern (validation) |

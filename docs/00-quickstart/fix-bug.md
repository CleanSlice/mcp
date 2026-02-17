---
id: fix-bug
title: Bug Fix Workflow - PLAN.md REQUIRED
version: 1.0.0
last_updated: 2025-12-21

pattern: workflow
complexity: fundamental
framework: full-stack
category: quickstart
applies_to: [api, app]

tags:
  - workflow
  - debugging
  - bug-fix
  - troubleshooting
  - plan

keywords:
  - fix bug
  - debug
  - troubleshooting
  - error handling
  - PLAN.md

deprecated: false
experimental: false
production_ready: true
---

# Bug Fix Workflow

> **CRITICAL: Create PLAN.md file BEFORE writing ANY code.** Even for bug fixes, document the investigation and proposed fix, then get user approval. No exceptions.

---

## 🛑 STEP 0: RUN CLEANSLICE MCP SEARCH FIRST (MANDATORY)

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   BEFORE INVESTIGATING ANY BUG, SEARCH THE CLEANSLICE MCP:       ║
║                                                                 ║
║   Use the "search" tool from the CleanSlice MCP server:          ║
║   (The server name may be: cleanslice-dev, cleanslice-local, etc.)║
║                                                                 ║
║   search(query: "gateway pattern")                              ║
║   search(query: "slice structure")                              ║
║   search(query: "nestjs standards")                             ║
║   search(query: "nuxt standards")                               ║
║                                                                 ║
║   READ THE RETURNED DOCS. They tell you:                        ║
║   - Gateway pattern (NOT Repository)                            ║
║   - domain/, data/, dtos/ folder structure                      ║
║   - Provider.vue component pattern                              ║
║   - Prisma IS the repository (no UserRepository)                ║
║                                                                 ║
║   🚫 If you skip this, your fix might break architecture.       ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

### Mandatory Pre-Fix Checklist

**Before proposing any fix, confirm you understand:**

- [ ] **Gateway pattern** - abstract in `domain/`, concrete in `data/`
- [ ] **Slice structure** - `domain/`, `data/`, `dtos/` folders required
- [ ] **Prisma IS the repository** - no UserRepository, ChatRepository
- [ ] **Provider.vue pattern** - every component folder needs it

**If you cannot check ALL boxes, go back and fetch the docs.**

---

## ⚠️ STOP: PLAN.md REQUIRED FOR BUG FIXES TOO ⚠️

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   🛑 BEFORE FIXING ANY BUG:                                     ║
║                                                                 ║
║   1. RUN the MCP commands above (Step 0)                        ║
║   2. Investigate and document findings                          ║
║   3. Create PLAN.md with proposed fix                           ║
║   4. Present to user: "Do you approve this fix?"                ║
║   5. WAIT for explicit approval                                 ║
║   6. Only then apply the fix                                    ║
║                                                                 ║
║   Even "simple" fixes can have side effects!                    ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  1. REPRODUCE                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  Understand and reproduce the bug                                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. INVESTIGATE                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Find root cause, trace the code flow                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. PLAN FIX                                                     │
│  ─────────────────────────────────────────────────────────────  │
│  Propose solution, get user approval                             │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. IMPLEMENT                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  Apply fix following standards                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. VERIFY & COMMIT                                              │
│  ─────────────────────────────────────────────────────────────  │
│  Test fix, provide commit message                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Reproduce

**Understand what the bug is and how to reproduce it.**

### Gather Information

```
To fix this bug, I need to understand:

1. What is the expected behavior?
2. What is the actual behavior?
3. Steps to reproduce the issue?
4. Any error messages or logs?
5. When did it start happening? (recent changes?)
6. Does it happen consistently or intermittently?
```

### Document the Bug

```markdown
## Bug Report

**Expected:** [What should happen]
**Actual:** [What actually happens]
**Steps to reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Error message (if any):**
```
[Error text here]
```

**Environment:** API / App / Both
**Affected files:** (if known)
```

---

## Phase 2: Investigate

**Find the root cause by tracing the code flow.**

### Investigation Steps

1. **Locate the error** - Find where the error occurs
2. **Trace backwards** - Follow the data/call flow
3. **Identify the cause** - Find what's wrong
4. **Check related code** - Look for similar issues

### Common Bug Categories

| Category | Symptoms | Where to Look |
|----------|----------|---------------|
| API Error | 4xx/5xx response | Controller → Gateway → Mapper |
| Type Error | TypeScript errors | Types, DTOs, Interfaces |
| Data Error | Wrong/missing data | Gateway, Mapper, Database |
| UI Error | Component not rendering | Provider, Props, State |
| State Error | Stale/wrong state | Store, Composables |
| Validation Error | Form errors | DTOs, Zod schemas |
| Auth Error | 401/403 errors | Guards, Decorators, Token |

### Investigation Template

```markdown
## Investigation

### Error Location
- **File:** `path/to/file.ts`
- **Line:** 42
- **Function:** `functionName()`

### Code Flow
1. Request comes to `controller.ts:25`
2. Calls `gateway.ts:50`
3. Error occurs at `mapper.ts:15`

### Root Cause
[Explain why the bug happens]

### Related Code
- `file1.ts` - [relevance]
- `file2.ts` - [relevance]
```

---

## Phase 3: Plan Fix

**Propose the solution and get user approval.**

### Fix Proposal Template

```markdown
## Proposed Fix

### Root Cause
[Brief explanation of why the bug occurs]

### Solution
[Explain what needs to change]

### Files to Modify
| File | Change |
|------|--------|
| `path/to/file.ts` | [Description of change] |
| `path/to/file2.ts` | [Description of change] |

### Code Changes Preview

**Before:**
```typescript
// Current problematic code
const result = data.value;  // data can be null
```

**After:**
```typescript
// Fixed code
const result = data?.value ?? defaultValue;
```

### Risk Assessment
- **Impact:** Low / Medium / High
- **Side effects:** [Any potential side effects]
- **Testing needed:** [What to test]

---

**Do you approve this fix?**
```

**Wait for approval before implementing.**

---

## Phase 4: Implement

**Apply the fix following the standards.**

### Implementation Guidelines

1. **Minimal changes** - Only fix what's broken
2. **Follow standards** - Use existing patterns
3. **No refactoring** - Don't improve unrelated code
4. **Add safeguards** - Prevent similar bugs

### Common Fix Patterns

**Null/Undefined Check:**
```typescript
// Before
const name = user.name;

// After
const name = user?.name ?? 'Unknown';
```

**Type Guard:**
```typescript
// Before
function process(data: unknown) {
  return data.value;
}

// After
function process(data: unknown) {
  if (!data || typeof data !== 'object' || !('value' in data)) {
    throw new Error('Invalid data');
  }
  return data.value;
}
```

**Error Handling:**
```typescript
// Before
const result = await service.getData();

// After
try {
  const result = await service.getData();
} catch (error) {
  console.error('Failed to get data:', error);
  throw new BadRequestException('Failed to retrieve data');
}
```

**Validation:**
```typescript
// Before
async createUser(data: CreateUserDto) {
  return this.gateway.create(data);
}

// After
async createUser(data: CreateUserDto) {
  if (!data.email) {
    throw new BadRequestException('Email is required');
  }
  return this.gateway.create(data);
}
```

---

## Phase 5: Verify & Commit

**Test the fix and provide a commit message.**

### Verification Checklist

```markdown
## Fix Verification

### Testing
- [ ] Bug no longer reproduces
- [ ] No new errors introduced
- [ ] Related functionality still works
- [ ] Build passes without errors

### Files Changed
- [x] `path/to/file.ts` - [what changed]
- [x] `path/to/file2.ts` - [what changed]
```

### Commit Message Format

**Always provide a commit message in this format:**

```
fix({scope}): {short description}

{detailed description of what was wrong and how it was fixed}

Closes #{issue-number} (if applicable)
```

### Commit Message Examples

**API Bug:**
```
fix(api/user): handle null email in user registration

The registration endpoint was throwing an unhandled exception when
email was undefined. Added null check and proper error response.

- Added validation for email field in CreateUserDto
- Return 400 Bad Request with clear error message
```

**Frontend Bug:**
```
fix(app/auth): prevent infinite redirect on login

Users were stuck in a redirect loop when accessing protected routes.
The auth guard was not properly checking token expiration.

- Fixed token expiration check in useAuth composable
- Added proper redirect handling in auth middleware
```

**Type Bug:**
```
fix(api/types): correct TeamDto interface to match database schema

TeamDto was missing the 'codename' field causing TypeScript errors
and runtime undefined values.

- Added codename field to ITeamData interface
- Updated TeamMapper to include codename in toData()
```

**Data Bug:**
```
fix(api/gateway): fix pagination returning wrong lastPage count

The lastPage calculation was using integer division causing
incorrect values when total was not divisible by perPage.

- Changed lastPage calculation to use Math.ceil()
- Added edge case handling for empty results
```

---

## Example: Fixing a User List Bug

### User Report
> "The user list shows 'undefined' for user names"

### Phase 1: Reproduce
```markdown
## Bug Report

**Expected:** User names display correctly
**Actual:** Shows "undefined" instead of names
**Steps to reproduce:**
1. Go to /users
2. Observe the user list

**Environment:** App (frontend)
```

### Phase 2: Investigate
```markdown
## Investigation

### Error Location
- **File:** `app/slices/user/components/userList/Thumb.vue`
- **Line:** 12
- **Code:** `{{ user.name }}`

### Code Flow
1. `UserListProvider.vue` fetches users via `UsersService.getUsers()`
2. Passes `user` prop to `UserListThumb.vue`
3. Thumb tries to display `user.name`

### Root Cause
The API returns `fullName` but component expects `name`.
API was updated but frontend component wasn't.

### Related Code
- `api/src/slices/user/data/user.mapper.ts` - returns `fullName`
- `api/src/slices/user/domain/user.types.ts` - IUserData has `fullName`
```

### Phase 3: Plan Fix
```markdown
## Proposed Fix

### Root Cause
API mapper returns `fullName` but frontend expects `name`.

### Solution
Update frontend component to use `fullName` instead of `name`.

### Files to Modify
| File | Change |
|------|--------|
| `app/slices/user/components/userList/Thumb.vue` | Change `user.name` to `user.fullName` |

### Code Changes Preview

**Before:**
```vue
<template>
  <div>{{ user.name }}</div>
</template>
```

**After:**
```vue
<template>
  <div>{{ user.fullName }}</div>
</template>
```

### Risk Assessment
- **Impact:** Low
- **Side effects:** None
- **Testing needed:** Verify user list displays names correctly

---

**Do you approve this fix?**
```

### Phase 4: Implement
[Apply the change]

### Phase 5: Verify & Commit
```markdown
## Fix Verification

### Testing
- [x] Bug no longer reproduces
- [x] No new errors introduced
- [x] User list shows correct names
- [x] Build passes

### Commit Message

```
fix(app/user): display correct user name field in list

The user list was showing 'undefined' because the component
was referencing 'user.name' but the API returns 'user.fullName'.

- Updated UserListThumb.vue to use fullName field
```
```

---

## Quick Reference

| Phase | Action | Output |
|-------|--------|--------|
| 1. Reproduce | Understand bug | Bug report |
| 2. Investigate | Find root cause | Investigation report |
| 3. Plan Fix | Propose solution | Fix proposal + approval |
| 4. Implement | Apply fix | Code changes |
| 5. Verify & Commit | Test + commit | Commit message |

**Never skip Phase 3 (Plan Fix).** Always get user approval before changing code.

---

## Commit Message Cheat Sheet

| Type | When to Use |
|------|-------------|
| `fix(api/{slice})` | Backend bug fix |
| `fix(app/{slice})` | Frontend bug fix |
| `fix(api/types)` | Type/interface fix |
| `fix(app/store)` | Pinia store fix |
| `fix(api/gateway)` | Data layer fix |
| `fix(app/component)` | Component fix |

**Format:**
```
fix({scope}): {what was fixed}

{why it was broken and how it was fixed}
```

---

## Related Documentation

- [TypeScript Standards](../02-standards/ts-standards.md)
- [NestJS Standards](../02-standards/nestjs-standards.md)
- [Nuxt.js Standards](../02-standards/nuxtjs-standards.md)
- [Error Handling](../01-setup/app-error.md)

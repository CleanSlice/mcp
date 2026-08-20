---
id: boundary-check
title: Boundary Check
version: 1.0.0
last_updated: 2026-08-20

pattern: standards
complexity: fundamental
framework: agnostic
category: standards
applies_to: [backend, api]

tags:
  - boundary-check
  - architecture-check
  - layers
  - slice-groups
  - dependency-cruiser
  - standards
  - ci

keywords:
  - boundary check
  - cleanslice-check
  - layer check
  - architecture check
  - dependency cruiser
  - slice groups
  - upward import
  - circular dependency
  - controller gateway
  - predev check

deprecated: false
experimental: false
production_ready: true
---

# Boundary Check

> **`cleanslice-check.cjs` enforces the CleanSlice boundaries on every `dev` start.** Three rules — group direction, no cycles, layers inside a slice. The group order is project configuration; the script is the same in every project.

---

## Why It Exists

The two promises of CleanSlice — slices that do not reach sideways, layers that only point inward — are invisible to the compiler. TypeScript happily accepts a controller that injects a gateway from a neighbouring slice: the import resolves, the types line up, the app boots. Nothing goes wrong until someone changes that gateway.

Left to review, this drift is found by eye, one file at a time, long after it spread. In agentfy2 it reached **six controllers**, four of them holding a *neighbouring* slice's gateway, while the dependency gate stayed green the whole time — because `controller -> its own domain/` is a legal downward edge, and no rule said anything about what was being imported through it.

The check exists so that class of mistake fails on the developer's machine, at `dev`, in under a second.

---

## Installation

```
api/
├── cleanslice.config.cjs        # the project's group order
├── scripts/
│   └── cleanslice-check.cjs     # the check — identical in every project
└── package.json
```

```bash
npm install --save-dev dependency-cruiser
```

```jsonc
// package.json
{
  "scripts": {
    "check": "node scripts/cleanslice-check.cjs",
    "predev": "npm run check && npm run docker && npm run generate && npm run migrate"
  }
}
```

`predev` runs before `dev` automatically — nothing else to remember. Put `npm run check` **first**: a violation then stops the start before docker, prisma, or nest do any work.

---

## Configuration

Everything project-specific lives here, and nowhere else:

```javascript
// api/cleanslice.config.cjs
module.exports = {
  groups: ['setup', 'user'],
};
```

| Key | Default | Meaning |
|-----|---------|---------|
| `groups` | *(required)* | Slice groups, **lowest first**. The order IS the rule. |
| `slicesDir` | `src/slices` | Where the group folders live. |
| `sourceDir` | `src` | What gets cruised (cycles are looked for in all of it). |

A project with eight groups declares eight; the starter kit declares two:

```javascript
// agentfy2/api/cleanslice.config.cjs
module.exports = {
  groups: ['infra', 'setup', 'system', 'user', 'admin', 'runtime', 'agent', 'billing'],
};
```

Both are checked by the same unmodified script. **Never hard-code group names in the script** — a check you edit per project is a template, not a standard.

A group named in the configuration but missing from `slicesDir` stops the run with exit code `2`. A rule generated for a folder that does not exist checks nothing, and a check that silently checks nothing is worse than no check.

---

## The Three Rules

### 1. `no-upward-import-from-{group}` — groups point downward

A group may depend on everything below it and on nothing above it.

```
setup -> user   OK, user is higher
user  -> setup  OK
setup -> user   VIOLATION when written inside setup/
```

**Catches:** the single import line that fuses two groups. After it, the lower group cannot be extracted, tested, or reasoned about without the higher one.

```
error no-upward-import-from-setup: src/slices/setup/health/health.controller.ts -> src/slices/user/user/domain/user.service.ts
  'setup' (L0) may not import higher groups: user
```

### 2. `no-circular` — no cycles, anywhere

**Catches:** the point where "which module depends on which" stops having an answer. Cyclic modules cannot be understood, moved, or loaded apart from each other.

```
error no-circular: user.gateway.ts -> user.types.ts -> user.service.ts -> user.gateway.ts
  No dependency cycles anywhere
```

### 3. Layers inside a slice

Presentation calls a **service**; the domain layer depends on the gateway **interface** it declares. Neither reaches into `data/`. Three sub-checks, because one alone is not enough:

| Sub-check | Sees | Catches |
|-----------|------|---------|
| `no-data-layer-in-controller` | paths | `import { UserGateway } from './data/user.gateway'` |
| `no-data-layer-in-domain` | paths | a service importing a mapper or a concrete gateway |
| `no-gateway-name-in-controller` | **names** | `import { IUserGateway } from './domain'` — through the barrel |

The name sub-check exists because of how the agentfy2 drift actually looked: every one of those six controllers pulled its gateway through the slice's `domain/index.ts`. At module level that import is indistinguishable from importing the service standing next to it — same file, same edge. What gives it away is the *name*, so that sub-check reads the import statements themselves.

```
error no-gateway-name-in-controller: src/slices/user/user/user.controller.ts -> ./domain (IUserGateway)
  A controller may not import a gateway — call the owning slice's service instead
```

See [Clean Architecture Layers](../03-patterns/layers.md), [Service Pattern](../03-patterns/service.md), [Controller Pattern](../03-patterns/controller.md).

---

## What It Costs

Measured on a MacBook, `dependency-cruiser` 18 (also runs on 16):

| Project | Groups | Modules | Check |
|---------|--------|---------|-------|
| starter kit | 2 | 64 | ~0.30 s |
| agentfy2 | 8 | 348 | ~0.55 s |

End to end, `npm run dev` in the starter kit — docker, prisma-import, migrate, a full nest compile, up to "Nest application successfully started":

| | run 1 | run 2 |
|---|---|---|
| without the check | 5.66 s | 5.43 s |
| with the check | 6.08 s | 6.08 s |

Half a second on a `dev` start that already waits for docker, prisma-import and a nest compile is not the reason your start feels slow. There is deliberately no "light mode": a check you can skip is a check that gets skipped.

---

## What It Does NOT Catch

**Read this section before trusting a green run.** Green means "none of these three rules is broken" — never "this code is CleanSlice".

- **Runtime wiring.** The check reads imports, not the DI container. A module that provides the wrong class under `'IUserGateway'`, or a controller handed a gateway through a factory provider, passes.
- **Imports that do not resolve.** A path with a typo, or one aliased in `tsconfig` but pointing nowhere, produces no edge — and no edge means no violation. This is why the script refuses to run without `tsconfig.json`, but it cannot flag a broken import as an architecture problem.
- **Gateways not named `*Gateway`.** The name sub-check keys on the suffix. Rename `IUserGateway` to `IUserPort` and it becomes invisible to that half (the path sub-checks still see `data/` and `*.gateway.ts`).
- **Namespace and dynamic imports.** `import * as domain from './domain'` hides the individual names; `await import(somePath)` hides the path.
- **Test files.** `*.spec.ts` and `*.e2e-spec.ts` are excluded on purpose — they legitimately wire across layers (an `AppModule` in a bootstrap, a neighbouring slice's fixture). Do not remove that exclusion to "increase coverage"; it will fail honest tests.
- **Layers by content.** The rules are directory-shaped. A prisma query written *inside* `domain/user.service.ts` is a data-layer concern in a domain file, and nothing here notices.
- **Everything inside a group.** Slice A importing slice B's domain within the same group is allowed by design; whether it *should* is a review question.
- **The frontend.** The script targets the api. Nuxt slices are not checked.
- **The rest of the constitution.** Singular slice names, `operationId` on every route, DTO validation, mappers without business logic, error types — none of it is verified here. See [NestJS Standards](./nestjs-standards.md).

Adding a rule is welcome, on one condition: **prove it red.** Break the code on purpose, show the check failing, then revert. A rule that stays green on broken code is worse than no rule — it manufactures confidence.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | No violations. |
| `1` | Violations found; each is printed with the rule that caught it. |
| `2` | The check could not run — missing or invalid `cleanslice.config.cjs`, missing `tsconfig.json`. |

---

## Related

- [Clean Architecture Layers](../03-patterns/layers.md) — the rules this check enforces
- [Service Pattern](../03-patterns/service.md) — why a controller talks to a service
- [Controller Pattern](../03-patterns/controller.md) — what a controller may inject
- [NestJS Standards](./nestjs-standards.md) — the standards that are still on review

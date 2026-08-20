---
id: boundary-check
title: Boundary Check
version: 1.0.0
last_updated: 2026-08-20

pattern: standards
complexity: fundamental
framework: nestjs
category: standards
applies_to: [backend, api]

tags:
  - boundary-check
  - cleanslice-check
  - dependency-cruiser
  - layers
  - slice-groups
  - architecture-enforcement
  - standards

keywords:
  - boundary check
  - cleanslice check
  - layer boundaries
  - group order
  - upward import
  - dependency cycle
  - controller gateway
  - architecture check
  - predev hook

deprecated: false
experimental: false
production_ready: true
---

# Boundary Check

> **`cleanslice-check.cjs` is the architecture rule that a machine can read.** The same script in every CleanSlice project; the group order comes from `cleanslice.json`, so a project with three groups is checked against three and one with eight against eight. It enforces three rules, and it runs on every `dev` start — not only in CI.

---

## Why it exists

Before it, "the CleanSlice check" was a dependency-cruiser config that knew two
things: group imports point downward, and there are no cycles. Everything else in
the architecture was held up by review — that is, by people.

What that cost is known to the file: a controller reaching for a gateway imports
it from its **own** slice folder. To a graph drawn between groups that is a legal
edge going nowhere in particular, so the gate stayed green while the mistake
spread to six controllers, four of which were reaching into another slice
entirely. It was caught by eye, months later.

Three rules that actually go red beat ten that mostly do not.

---

## Where it lives

```
api/
├── cleanslice.json              # the project's groups, low → high
└── scripts/
    └── cleanslice-check.cjs     # the same file in every project — do not edit per project
```

Run it: `node scripts/cleanslice-check.cjs`
Exit codes: `0` clean · `1` violations · `2` the check itself could not run.

---

## Configuration

The script contains no project names. `cleanslice.json` does:

```json
{
  "srcRoot": "src",
  "slicesRoot": "src/slices",
  "groups": ["infra", "setup", "system", "user", "admin", "runtime", "agent", "billing"]
}
```

**The order of `groups` IS the layering.** `groups[0]` is the lowest; a group may
import only groups below it. Reordering the array changes what is legal, without
touching a line of the script.

A group whose folder is not under `slicesRoot` names its own path:

```json
{
  "groups": [
    "setup",
    { "name": "user", "path": "src/user" }
  ]
}
```

A group name that points at a directory that does not exist is a **fatal error**,
not a warning. A group with no folder generates rules that can never fire, and a
check that quietly stops guarding something is worse than no check at all.

---

## The three rules

### 1. `no-upward-import-from-<group>` — group dependencies point downward

A group may not import any group declared after it.

```typescript
// src/slices/infra/redis/redis.service.ts
import { AgentService } from '#agent/agent/domain/agent.service'; // ✘ infra (L0) → agent (L6)
```

```
error no-upward-import-from-infra: src/slices/infra/redis/redis.service.ts → src/slices/agent/agent/domain/agent.service.ts
  'infra' (L0) may not import higher groups: setup, system, user, admin, runtime, agent, billing
```

Catches the day a foundation slice quietly starts depending on a feature, after
which neither can move alone.

### 2. `no-circular` — no dependency cycles, anywhere

```
error no-circular: src/user/user/domain/user.service.ts →
    src/user/user/user.controller.ts →
    src/user/user/domain/user.service.ts
```

The failure a reviewer has the least chance of spotting: no single import in the
loop looks wrong, only the loop does.

### 3. The three layers inside a slice: presentation → domain → data

**3a. A controller depends on a SERVICE** — never on `data/`, never on a gateway.
See [Controller Pattern](../03-patterns/controller.md): *"Calls SERVICE only
(never gateway)"*.

**3b. Domain depends on the gateway INTERFACE** in `domain/` — never on the
implementation in `data/`. See [Service Pattern](../03-patterns/service.md):
*"Services ONLY depend on gateway interfaces, never implementations."*

Rule 3a is checked twice, because once is not enough:

| Form | What it looks like | Caught by |
|---|---|---|
| direct | `import { UserGateway } from './data/user.gateway'` | the module graph |
| barrel | `import { IUserGateway } from './domain'` | the **import names** |

The barrel form is the one that matters. At module level, importing the gateway
interface out of `domain/index.ts` is indistinguishable from importing the
service next to it — every one of the six controllers that drifted did exactly
that. The script therefore also parses each `*.controller.ts` and rejects any
imported identifier ending in `Gateway`:

```
error no-gateway-name-in-controller: a controller may not import a gateway.

  src/user/user/user.controller.ts:58  imports `IUserGateway` from `./domain` — call the owning slice's service instead
```

---

## Running it on every `dev`

The check costs about half a second, so it does not need a "light mode" and does
not belong only in CI. Put it in front of the dev server:

```json
{
  "scripts": {
    "cleanslice": "node scripts/cleanslice-check.cjs",
    "predev": "npm run cleanslice && npm run docker && npm run generate && npm run migrate"
  }
}
```

A broken tree never reaches the database step:

```
> starter-api@1.0.0 predev
> npm run cleanslice && npm run docker && npm run generate && npm run migrate

> starter-api@1.0.0 cleanslice
> node scripts/cleanslice-check.cjs

  error no-gateway-name-in-controller: a controller may not import a gateway.
    src/user/user/user.controller.ts:58  imports `IUserGateway` from `./domain` — call the owning slice's service instead

✘ cleanslice-check failed (2 groups, 0.5s)
```

Projects that start the API differently hook the same script into whatever their
own dev entry point is (`prestart:dev`, a Makefile target, a run script). The
file never changes; only where it is called from.

---

## What this check does NOT catch

Read this part before treating a green run as "the code is CleanSlice-clean". It
means these three things are true. It does not mean anything else is.

- **Runtime wiring.** The rules read imports. A NestJS module that `provides` a
  gateway to a controller through DI, without the controller importing anything
  from it, is invisible here. The import is the evidence; without one there is
  nothing to see.
- **Dynamic imports and reflection.** `await import(someVariable)`, string-built
  module paths, and anything resolved at runtime are not in the graph.
- **Naming.** Singular slice names, `{entity}.service.ts` / `{Entity}Service`,
  the `dtos/` folder, `operationId` on every endpoint — all still review's job.
- **DTO and validation rules.** Whether a controller returns a DTO, whether a
  service leaks one, whether `class-validator` decorators are present.
- **Business-logic placement.** A controller with a hundred lines of rules in it
  imports nothing forbidden and passes.
- **Gateways that skip the interface.** A gateway implementation not implementing
  the declared abstract class is a type question, not an import question.
- **Frontend slices.** The script checks one TypeScript project — the API. Nuxt
  slices are not covered.
- **Tests.** `*.spec.ts` and `*.e2e-spec.ts` are excluded on purpose: a test
  legitimately wires across layers, builds whole modules, and borrows another
  slice's fixture. Including them would force every project to weaken the real
  rules to keep its tests compiling. Do not remove that exclusion.
- **Anything a group boundary cannot express.** Two slices in the same group may
  import each other freely. Whether they *should* is a design conversation.

---

## Two traps when wiring it up yourself

These belong to dependency-cruiser's **Node API**, which is how `cleanslice-check.cjs`
drives it. The `depcruise` CLI sets both for you, so a project that still runs a
plain `.dependency-cruiser.cjs` config through the CLI is not affected. Call the
API yourself and both are easy to miss — each produces a check that runs,
reports, and passes on any code you give it.

1. **`validate: true`.** Without it dependency-cruiser parses the rule set, echoes
   it back in the result, and never applies it. Every module comes back valid.
2. **`ruleSet.options.tsConfig.fileName`.** The tsconfig filename must sit there —
   nested, in the shape a `.dependency-cruiser.cjs` config file has — because that
   is the only place the resolver looks. Put it anywhere else and the tsconfig's
   `paths` are never loaded, so every aliased import (`#user/auth`, `#prisma`)
   fails to resolve. An import that does not resolve is an edge that does not
   exist, and an edge that does not exist is one no rule can forbid. On a codebase
   where slices reach each other by alias, that turns rule 1 off entirely.

Whatever you change, prove each rule with a **red run**: break the code on
purpose, watch the rule fire, put it back. A rule that stays green on broken code
is worse than a missing one — it manufactures confidence.

---

## Related Documentation

- [Controller Pattern](../03-patterns/controller.md) — presentation layer
- [Service Pattern](../03-patterns/service.md) — domain layer, gateway interfaces
- [Gateway Pattern](../03-patterns/gateway.md) — data layer
- [Layers Pattern](../03-patterns/layers.md) — the three layers inside a slice

---
id: bun-standards
title: Bun — the package manager
version: 1.0.0
last_updated: 2026-09-12

pattern: standards
complexity: fundamental
framework: agnostic
category: standards
applies_to: [backend, frontend, api, app]

tags:
  - bun
  - package-manager
  - install
  - scripts
  - lockfile
  - standards
  - tooling

keywords:
  - bun
  - bun install
  - bun add
  - bunx
  - bun run
  - package manager
  - lockfile
  - bun.lock
  - no npm
  - npm equivalent
  - yarn pnpm

deprecated: false
experimental: false
production_ready: true
---

# Bun — the package manager

> **CleanSlice projects use Bun. Not npm, not yarn, not pnpm.** One package manager, one lockfile (`bun.lock`), one set of commands in every document, every README and every CI file.

---

## Why One, And Why This One

Two package managers in a repo means two lockfiles that disagree, two node_modules resolutions, and a CI that installs something different from what the developer ran. The choice matters less than the fact that there is exactly one of them — and Bun is what CleanSlice projects install, run and build with.

Install times are the visible part. The part that matters more: `bun install` and `bun run` are the commands in the Dockerfile, in the setup docs and in an agent's instructions, so what a machine does and what a person reads are the same thing.

---

## The Command Map

Everything you knew in npm, in the form to use now:

| Instead of | Use | Notes |
|---|---|---|
| `npm install` | `bun install` | Restores from `bun.lock` |
| `npm ci` | `bun install --frozen-lockfile` | CI and Docker: fail rather than update the lock |
| `npm install <pkg>` | `bun add <pkg>` | |
| `npm install -D <pkg>` | `bun add -d <pkg>` | |
| `npm uninstall <pkg>` | `bun remove <pkg>` | |
| `npm run <script>` | `bun run <script>` | |
| `npx <cli>` | `bunx <cli>` | `bunx prisma`, `bunx shadcn-vue@latest add`, `bunx @nestjs/cli` |
| `package-lock.json` | `bun.lock` | Commit it. Never commit both |

---

## What Does Not Change

- **Pre-scripts still run.** `bun run dev` runs `predev` first, `bun run migrate` runs `premigrate` — verified on Bun 1.3. The whole CleanSlice flow depends on it: `predev` is where docker, prisma-import, migrations and the [boundary check](./boundary-check.md) live.
- **The scripts themselves.** `nest build`, `nuxt dev`, `jest`, `eslint` — same binaries, same flags.
- **Node in production.** The api's Docker runner stage still runs the built output on Node. Bun installs and builds; what serves traffic is unchanged, which is why a runtime image without Bun must call a local binary (`node_modules/.bin/prisma migrate deploy`) instead of `bunx`.

---

## Docker: Bun Installs, Node Builds

Use a **Node** base image with the Bun binary copied in, not `oven/bun`:

```dockerfile
FROM node:20-alpine AS builder
COPY --from=oven/bun:1-alpine /usr/local/bin/bun /usr/local/bin/bun
# `bunx` is a symlink to the same binary in the oven image — copying the binary
# alone leaves the build with `bunx: not found`
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY src ./src
RUN bun run build
```

`oven/bun` ships a **shim named `node`**, so `nest build` runs under Bun there —
and Nest's tsconfig-paths hook then leaves `#slice` aliases in the emitted
JavaScript instead of rewriting them to relative paths. The image builds
without a single warning and dies on boot with `Cannot find module '#mcp'`.
Verified on `oven/bun:1-alpine` (Bun 1.4): same source, same lockfile, same
command — `require("#mcp")` in the container, `require("../mcp")` with a real
Node under the build.

A Nuxt build has no such hook and is unaffected, but keeping one rule for every
image is cheaper than remembering which is which.

---

## Rules

1. **`bun.lock` is committed; `package-lock.json` is not** — delete it if you find one, and never let both exist in one project.
2. **Scripts call `bun run` and `bunx`, never `npm run` / `npx`** — including inside `package.json`, Dockerfiles, `start.sh`, husky hooks and CI.
3. **Docker installs with `--frozen-lockfile`.** A build that quietly updates the lockfile ships something nobody tested.
4. **New project scaffolds that hard-code a package manager get `--skip-install`**, then `bun install`. The NestJS CLI's `--package-manager` flag has no Bun value; do not pass `npm` to it.
5. **Documentation counts as code here.** A doc that still says `npm install` teaches every agent reading it to break rule 1.

---

## Checklist For A Project

- [ ] `bun.lock` exists and is committed
- [ ] No `package-lock.json`, `yarn.lock` or `pnpm-lock.yaml` anywhere
- [ ] Every `package.json` script uses `bun run` / `bunx`
- [ ] Dockerfile builds on `oven/bun` with `bun install --frozen-lockfile`
- [ ] README and setup docs say `bun`

---
id: setup-api-prisma
title: Prisma Setup (API)
version: 1.0.0
last_updated: 2025-12-20

pattern: setup
complexity: fundamental
framework: nestjs
category: setup
applies_to: [backend, api]

tags:
  - prisma
  - database
  - postgresql
  - orm
  - prisma-import
  - slices
  - docker
  - aws-rds

keywords:
  - prisma setup
  - prisma-import
  - database schema
  - prisma slices
  - schema merging
  - vscode prisma
  - docker compose
  - aws rds
  - postgresql docker

deprecated: false
experimental: false
production_ready: true
---

# Prisma Setup (API)

> **Prisma with prisma-import enables distributed schema files across slices**. Each slice can define its own `.prisma` file, which are merged into a single `schema.prisma` at build time. This keeps database models close to their domain logic. Uses **PostgreSQL** with Docker Compose locally and **AWS RDS** in production.

---

## Overview

The `prisma-import` extension allows splitting Prisma schemas across slices:

```
┌──────────────────────────────────────────────────────────────┐
│  SLICE PRISMA FILES (at slice root!)                         │
│                                                               │
│  slices/setup/prisma/prisma.prisma  ← datasource & generator │
│  slices/user/user.prisma            ← User model             │
│  slices/user/role.prisma            ← Role model             │
│  slices/user/team.prisma            ← Team model             │
│  slices/file/file.prisma            ← File model             │
└──────────────────────────────────────────────────────────────┘
                               │
                               │  npm run generate
                               │  (prisma-import --force)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  prisma/schema.prisma (GENERATED - do not edit)              │
│                                                               │
│  datasource db { ... }                                        │
│  generator client { ... }                                     │
│  model User { ... }                                           │
│  model Role { ... }                                           │
│  model Team { ... }                                           │
│  model File { ... }                                           │
└──────────────────────────────────────────────────────────────┘
                               │
                               │  prisma generate
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  @prisma/client                                              │
│                                                               │
│  PrismaService extends PrismaClient                          │
│  - this.prisma.user.findMany()                               │
│  - this.prisma.role.create()                                 │
│  - this.prisma.team.update()                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Critical Rules

### 1. Never Edit `prisma/schema.prisma` Directly

The merged schema is auto-generated and will be overwritten.

### 2. Prisma Files Live at Slice Root

Always place `.prisma` files at the **root of each slice**, not inside subfolders:

```
slices/
├── setup/
│   └── prisma/
│       └── prisma.prisma       ← datasource + generator ONLY
├── user/
│   ├── user.prisma             ← User model (at slice root!)
│   ├── user/
│   │   ├── user.service.ts
│   │   └── ...
│   ├── role.prisma             ← Role model (at slice root!)
│   ├── role/
│   │   └── ...
│   ├── team.prisma             ← Team model (at slice root!)
│   └── team/
│       └── ...
└── file/
    ├── file.prisma             ← File model (at slice root!)
    └── file/
        └── ...
```

### 3. Naming Convention

The `.prisma` file should match the model name in lowercase:
- `User` model → `user.prisma`
- `Team` model → `team.prisma`
- `ApiKey` model → `apiKey.prisma`

### 4. Use Import Syntax for Relations

When referencing models from other slices, use `import`:

```prisma
// slices/user/team.prisma
import { User } from "./user"
import { ApiKey } from "./apiKey"
import { File } from "../file/file"
import { TeamUser } from "./teamUser"

model Team {
  id        String   @id
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  apiKeys   ApiKey[]
  files     File[]
  teamUsers TeamUser[]
}
```

---

## File Location & Naming

```
api/
├── package.json                    # prisma-import config + scripts
├── docker-compose.yml              # Local PostgreSQL container
├── docker/
│   └── postgresql/                 # Docker volume (gitignored)
├── .env.dev                        # Local DATABASE_URL
├── .env.prod                       # Production DATABASE_URL (AWS RDS)
├── prisma/
│   ├── schema.prisma               # GENERATED - do not edit
│   └── migrations/                 # Migration history
└── src/
    └── slices/
        ├── setup/
        │   └── prisma/
        │       ├── prisma.prisma
        │       ├── prisma.service.ts
        │       ├── prisma.module.ts
        │       └── index.ts
        ├── user/
        │   ├── user.prisma
        │   ├── role.prisma
        │   ├── team.prisma
        │   ├── user/
        │   ├── role/
        │   └── team/
        └── file/
            ├── file.prisma
            └── file/
```

---

## Installation

### 1. Install Dependencies

```bash
npm install @prisma/client
npm install -D prisma
```

### 2. Install VSCode Extension

Install **Prisma Import** (`ajmnz.prisma-import`) for syntax highlighting and IntelliSense for split schema files.

### 3. Configure package.json

```json
{
  "scripts": {
    "generate": "npx prisma-import --force",
    "predev": "npm run docker && npm run migrate",
    "premigrate": "npx prisma-import --force",
    "migrate": "dotenv -e .env.dev -- npx prisma migrate dev && dotenv -e .env.dev -- npx prisma generate",
    "start:prod": "npx prisma migrate deploy && node dist/main.js"
  },
  "prisma": {
    "import": {
      "schemas": "./src/**/!(schema).prisma",
      "output": "./prisma/schema.prisma"
    }
  }
}
```

- `schemas`: Glob pattern to find all `.prisma` files (excludes `schema.prisma`)
- `output`: Where the merged schema is written

---

## Database Environments

### Local Development: Docker Compose

```
┌──────────────────────────────────────────────────────────────┐
│  LOCAL DEVELOPMENT                                            │
│                                                               │
│  docker-compose.yml → postgres-local (Port: 5432)            │
│                     → ./docker/postgresql/ (volume)           │
└──────────────────────────────────────────────────────────────┘
```

### `docker-compose.yml`

```yaml
version: '3.8'
name: myproject-api
services:
  postgres-local:
    image: postgres:latest
    ports:
      - '5432:5432'
    environment:
      POSTGRES_PASSWORD: root
      POSTGRES_DB: myproject-api-local-database
    volumes:
      - ./docker/postgresql:/var/lib/postgresql/data
```

### Production: AWS RDS

```
┌──────────────────────────────────────────────────────────────┐
│  PRODUCTION (AWS)                                             │
│                                                               │
│  ECS / Lambda (NestJS API) ──▶ AWS RDS PostgreSQL             │
│                                VPC Private Subnet             │
└──────────────────────────────────────────────────────────────┘
```

The `DATABASE_URL` is configured via Terraform/environment variables in production.

### Add Docker Script to package.json

```json
{
  "scripts": {
    "docker": "docker compose up -d",
    "predev": "npm run docker && npm run migrate"
  }
}
```

---

## Complete Configuration Examples

### Base Prisma Configuration

```prisma
// src/slices/prisma/prisma.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider         = "prisma-client-js"
  previewFeatures  = ["views"]
  binaryTargets    = ["native", "darwin-arm64", "rhel-openssl-3.0.x"]
  connect_timeout  = 10
  connection_limit = 20
}
```

### Prisma Service

```typescript
// src/slices/prisma/prisma.service.ts
import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
```

### Prisma Module

```typescript
// src/slices/prisma/prisma.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Export Index

```typescript
// src/slices/prisma/index.ts
export * from './prisma.service';
export * from './prisma.module';
```

---

## Slice Model Examples

### User Model

```prisma
// src/slices/user/user.prisma
import { Team } from "./team"
import { TeamUser } from "./teamUser"

model User {
  id                    String   @id
  name                  String
  email                 String
  emailError            Boolean? @default(false)
  emailErrorDescription String?  @default("")
  emailNotifications    Boolean? @default(true)
  roles                 String[] @default([])
  verified              Boolean  @default(false)
  banned                Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  password                   String?   @default("")
  emailConfirmed             Boolean?  @default(false)
  emailConfirmationToken     String?   @default("")
  emailConfirmationExpiresAt DateTime?

  teams     Team[]
  teamUsers TeamUser[]
}
```

### Team Model with Multiple Relations

```prisma
// src/slices/user/team.prisma
import { User } from "./user"
import { ApiKey } from "./apiKey"
import { File } from "../file/file"
import { TeamUser } from "./teamUser"

model Team {
  id        String   @id
  codename  String   @default("")
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  apiKeys   ApiKey[]
  files     File[]
  teamUsers TeamUser[]
}
```

### File Model (Cross-Slice Relation)

```prisma
// src/slices/file/file.prisma
import { Team } from "../user/team"

model File {
  id          String   @id
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id])
  name        String
  contentType String
  path        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## Using PrismaService in Gateways

Import `PrismaService` from the `#prisma` alias:

```typescript
// src/slices/user/role/data/role.gateway.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '#prisma';
import { IRoleGateway, IRoleData, ICreateRoleData, IUpdateRoleData } from '../domain';
import { RoleMapper } from './role.mapper';

@Injectable()
export class RoleGateway implements IRoleGateway {
  constructor(
    private prisma: PrismaService,
    private map: RoleMapper,
  ) {}

  async getRoles(): Promise<IRoleData[]> {
    const results = await this.prisma.role.findMany();
    return results.map((result) => this.map.toData(result));
  }

  async getRole(id: string) {
    const result = await this.prisma.role.findUnique({ where: { id } });
    return this.map.toData(result);
  }

  async createRole(data: ICreateRoleData) {
    const result = await this.prisma.role.create({ data: this.map.toCreate(data) });
    return this.map.toData(result);
  }

  async updateRole(id: string, data: IUpdateRoleData) {
    const result = await this.prisma.role.update({
      where: { id },
      data: this.map.toUpdate(data)
    });
    return this.map.toData(result);
  }

  async deleteRole(id: string) {
    try {
      await this.prisma.role.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## Import Path Alias

Configure the `#prisma` alias in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "#prisma": ["./src/slices/prisma"],
      "#/*": ["./src/slices/*"]
    }
  }
}
```

And in Jest config (`package.json`):

```json
{
  "jest": {
    "moduleNameMapper": {
      "^#prisma$": "<rootDir>/src/slices/prisma",
      "^#/(.*)$": "<rootDir>/src/slices/$1"
    }
  }
}
```

---

## NPM Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run generate` | Merge prisma files (prisma-import) |
| `npm run migrate` | Run migrations in dev mode |
| `npm run predev` | Auto-runs before dev (docker + migrate) |
| `npm run premigrate` | Auto-runs before migrate (prisma-import) |

### Workflow

```bash
npm run dev        # starts docker and runs migrations
npm run migrate    # manual migration creation
npm run generate   # generate merged schema only
```

---

## Prisma Import Syntax

```prisma
// Same slice (sibling files at slice root)
import { User } from "./user"
import { Role } from "./role"

// Different slice
import { File } from "../file/file"
import { Team } from "../user/team"
```

### Import Rules

1. **Import path** references the `.prisma` file (without extension)
2. **Model name** in braces must match exactly
3. **Relative paths** from the importing file's location
4. **Same slice imports** use `./` since files are siblings at slice root
5. **Cross-slice imports** use `../sliceName/modelName`

---

## Checklist

### Initial Setup

- [ ] Install `@prisma/client` and `prisma`
- [ ] Install VSCode extension `ajmnz.prisma-import`
- [ ] Create `docker-compose.yml` with `postgres-local` service
- [ ] Create `docker/postgresql/` directory for volume
- [ ] Add `prisma` config to `package.json`
- [ ] Add npm scripts (`docker`, `generate`, `migrate`, etc.)
- [ ] Create `slices/prisma/` with service and module
- [ ] Configure `#prisma` path alias
- [ ] Create `.env.dev` with local DATABASE_URL

### Creating New Models

- [ ] Create `{model}.prisma` file **at the slice root**
- [ ] Add `import` statements for related models
- [ ] Run `npm run generate` to merge schemas
- [ ] Run `npm run migrate` to create migration
- [ ] Verify generated `prisma/schema.prisma`

### Using in Gateways

- [ ] Import `PrismaService` from `#prisma`
- [ ] Inject via constructor
- [ ] Access models via `this.prisma.{model}.{method}()`
- [ ] Use mapper to convert Prisma types to domain types

### Never Do

- [ ] NO direct edits to `prisma/schema.prisma`
- [ ] NO model definitions outside of slice `.prisma` files
- [ ] NO `.prisma` files inside subfolders (always at slice root!)
- [ ] NO committing merged schema (add to `.gitignore` optionally)
- [ ] NO importing PrismaClient directly (use PrismaService)

---

## Environment Variables

### `.env.dev` (Local Docker)

```bash
DATABASE_URL=postgres://postgres:root@127.0.0.1:5432/myproject-api-local-database
```

### `.env.prod` (AWS RDS)

```bash
# Typically injected via Terraform or AWS Secrets Manager
DATABASE_URL=postgres://admin:${RDS_PASSWORD}@myproject-prod.xxxx.us-east-1.rds.amazonaws.com:5432/myproject
```

### `.env.example`

```bash
# PROVIDER "postgreSQL" from Docker (local development)
DATABASE_URL=postgres://postgres:root@127.0.0.1:5432/<PROJECT>-api-local-database

# PROVIDER "postgreSQL" from RDS (production)
# DATABASE_URL is defined via Terraform in production

# PROVIDER "postgreSQL" from Neon (alternative)
# Follow instructions: https://www.prisma.io/docs/orm/overview/databases/neon
# DATABASE_URL=...
# DIRECT_URL=...
```

---

## Related Documentation

- [Gateway Pattern](../03-patterns/gateway.md) - Data access layer
- [Mapper Pattern](../03-patterns/mapper.md) - Type conversion
- [Repository Pattern](../03-patterns/repository.md) - Data abstraction

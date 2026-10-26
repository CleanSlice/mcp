---
id: gateway-pattern
title: Gateway Pattern
version: 1.0.0
last_updated: 2025-12-16

pattern: gateway
complexity: intermediate
framework: agnostic
category: architecture
applies_to: [backend, frontend, api, app]

tags:
  - gateway
  - clean-architecture
  - dependency-inversion
  - abstraction
  - data-layer
  - domain-layer

keywords:
  - gateway pattern
  - interface
  - implementation
  - dependency injection
  - inversify
  - nestjs di
  - data access

deprecated: false
experimental: false
production_ready: true
---

# Gateway Pattern

> **Gateways abstract external data sources from your business logic**. The interface lives in `domain/`, the implementation lives in `data/`. They are connected via dependency injection (NestJS DI or InversifyJS) - the service NEVER directly imports the implementation.

---

## Gateway vs Repository

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   Use GATEWAY for database access (Prisma IS the repository)   ║
║   Use REPOSITORY for independent adapters/capabilities                 ║
║                                                                 ║
║   Prisma (auto-generated in node_modules) already provides      ║
║   the repository abstraction. Don't add another layer.          ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

| Need | Create | Example |
|------|--------|---------|
| Database access | **Gateway** | `UserGateway` uses `PrismaService` |
| GitHub API | **Repository** | `GitHubRepository` wraps `@octokit/rest` |
| AWS S3 | **Repository** | `S3Repository` wraps `@aws-sdk/s3` |
| Email (SMTP) | **Repository** | `SmtpRepository` wraps `nodemailer` |

---

## Gateway Over a Registry of Repositories

A gateway is not limited to one or two named repositories. When a slice offers a **set of interchangeable capabilities** — a toolset an LLM can call, a group of notification channels, several import sources — model each capability as a self-contained repository and let the gateway **orchestrate the whole set**: collect them through a multi-provider token and adapt each into a single domain contract.

```
                    IToolGateway (domain contract: all(), find(name))
                            ^ implements
                        ToolGateway (data)   <- adapts each repo into the domain ITool
                            | @Inject(TOOL_REPOSITORIES)
            +---------------+---------------+
    CurrentTimeToolRepo  CalculatorToolRepo  TextStatsToolRepo   <- self-contained, no domain imports
```

The repositories stay black boxes (own fields/types, no domain imports — see the [Repository Pattern](./repository.md)). The gateway is the single class that turns them into domain types, exposed as a collection. This also covers a **pure in-process capability** (a calculator, a formatter) — not only external-resource wrappers: it is still a self-contained repository the gateway adapts.

```typescript
// domain/tool.types.ts — the domain shape the gateway PRODUCES (repos never import this)
export interface ITool {
  def: { name: string; description: string; inputSchema: object };
  execute(input: unknown): Promise<unknown>;
}

// A multi-provider DI token that collects every tool repository.
export const TOOL_REPOSITORIES = Symbol('TOOL_REPOSITORIES');
```

```typescript
// data/repositories/calculatorTool.repository.ts — self-contained, imports only @nestjs/common
@Injectable()
export class CalculatorToolRepository {
  readonly name = 'calculator';
  readonly description = 'Evaluate an arithmetic expression.';
  readonly inputSchema = { type: 'object', properties: { expr: { type: 'string' } } };
  async run(input: { expr: string }): Promise<number> {
    return evaluate(input.expr);
  }
}
```

```typescript
// domain/tool.gateway.ts
export abstract class IToolGateway {
  abstract all(): ITool[];
  abstract find(name: string): ITool | undefined;
}
```

```typescript
// data/tool.gateway.ts — the ONE class that connects the repositories to the domain
type IToolRepository = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: object;
  run(input: unknown): Promise<unknown>;
};

@Injectable()
export class ToolGateway extends IToolGateway {
  constructor(@Inject(TOOL_REPOSITORIES) private readonly repos: IToolRepository[]) {
    super();
  }

  all(): ITool[] {
    return this.repos.map((r) => ({
      def: { name: r.name, description: r.description, inputSchema: r.inputSchema },
      execute: (input) => r.run(input),
    }));
  }

  find(name: string): ITool | undefined {
    return this.all().find((t) => t.def.name === name);
  }
}
```

```typescript
// tool.module.ts — a multi-provider token aggregates the repositories
const repos = [CurrentTimeToolRepository, CalculatorToolRepository, TextStatsToolRepository];

@Module({
  providers: [
    ...repos,
    { provide: TOOL_REPOSITORIES, useFactory: (...t) => t, inject: repos },
    { provide: IToolGateway, useClass: ToolGateway },
  ],
  exports: [IToolGateway],
})
export class ToolModule {}
```

Adding a capability is one new self-contained repository plus one entry in the token's `inject` list — the gateway and every consumer stay untouched.

---

## Overview

The Gateway Pattern separates **what** you need (interface) from **how** you get it (implementation):

```
┌──────────────────────────────────────────────────────────────┐
│  SERVICE (Domain Layer)                                       │
│  - Injects IUserGateway interface                             │
│  - Calls gateway.findById(id)                                 │
│  - Knows NOTHING about HTTP, Prisma, or external APIs         │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               │ @Inject('IUserGateway')
                               │ (DI Container resolves)
                               v
┌──────────────────────────────────────────────────────────────┐
│  GATEWAY INTERFACE (Domain Layer)                             │
│  domain/user.gateway.ts                                       │
│  - Defines contract: findById(id): Promise<IUserData>         │
│  - Pure TypeScript interface                                  │
│  - NO implementation details                                  │
└──────────────────────────────────────────────────────────────┘
                               │
                               │ implements
                               │ (resolved at runtime by DI)
                               v
┌──────────────────────────────────────────────────────────────┐
│  GATEWAY IMPLEMENTATION (Data Layer)                          │
│  data/user.gateway.ts                                         │
│  - Implements IUserGateway                                    │
│  - Contains actual HTTP calls, Prisma queries, etc.           │
│  - Can be swapped without touching domain layer               │
└──────────────────────────────────────────────────────────────┘
```

**Key Principle**: The service imports the INTERFACE from `domain/`, never the implementation from `data/`. The DI container connects them at runtime.

---

## Critical Rules

### 1. Interface in `domain/`, Implementation in `data/`

```
slices/user/
├── domain/
│   ├── user.gateway.ts        # INTERFACE lives here
│   ├── user.service.ts        # Service uses interface
│   └── user.types.ts
└── data/
    ├── user.gateway.ts        # IMPLEMENTATION lives here
    └── user.mapper.ts
```

### 2. Service NEVER Imports from `data/`

```typescript
// CORRECT - Service imports INTERFACE from domain/
import { IUserGateway } from './user.gateway';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserGateway')
    private readonly userGateway: IUserGateway
  ) {}
}

// WRONG - Service imports IMPLEMENTATION from data/
import { UserGateway } from '../data/user.gateway';  // NEVER DO THIS

@Injectable()
export class UserService {
  constructor(
    private readonly userGateway: UserGateway  // Concrete class - WRONG
  ) {}
}
```

### 3. Implementation Imports Interface from `domain/`

```typescript
// data/user.gateway.ts
import { IUserGateway } from '../domain/user.gateway';

@Injectable()
export class UserGateway implements IUserGateway {
  // ...
}
```

### 4. Module Wires Interface to Implementation

```typescript
// user.module.ts
@Module({
  providers: [
    UserService,
    {
      provide: 'IUserGateway',
      useClass: UserGateway,
    },
  ],
})
export class UserModule {}
```

---

## File Structure

```
slices/user/
├── user.controller.ts
├── user.module.ts
├── domain/
│   ├── user.gateway.ts             # Interface (contract)
│   ├── user.service.ts             # Uses interface
│   ├── user.types.ts               # Domain types
│   └── index.ts                    # Exports interface
└── data/
    ├── user.gateway.ts             # Implementation
    ├── user.mapper.ts              # Data transformation
    └── index.ts                    # Exports implementation
```

---

## Backend Example: NestJS with Prisma

### Interface (domain/user.gateway.ts)

```typescript
import { IUserData, ICreateUserData, IUpdateUserData } from './user.types';
import { IMetaResponse } from '#core/domain';

export interface IUserFilter {
  email?: string;
  search?: string;
  ids?: string[];
  page?: number;
  perPage?: number;
}

export interface IUserGateway {
  getUsers(filter?: IUserFilter): Promise<{ data: IUserData[]; meta: IMetaResponse }>;
  getUser(id: string): Promise<IUserData | null>;
  createUser(data: ICreateUserData): Promise<IUserData>;
  updateUser(id: string, data: IUpdateUserData): Promise<IUserData>;
  deleteUser(id: string): Promise<boolean>;
}
```

### Prisma Implementation (data/user.gateway.ts)

```typescript
import { Injectable } from '@nestjs/common';
import { IUserGateway, IUserFilter } from '../domain/user.gateway';
import { IUserData, ICreateUserData, IUpdateUserData, USER_ID_PREFIX } from '../domain/user.types';
import { UserNotFoundError } from '../domain/user.errors';
import { UserMapper } from './user.mapper';
import { PrismaService } from '#setup/prisma';
import { formatId, withIdRetry } from '#setup/id';
import { IMetaResponse } from '#core/domain';

/** `%`, `_` and `\` are LIKE wildcards; escape them so a search matches them literally. */
const likeLiteral = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class UserGateway implements IUserGateway {
  constructor(
    private prisma: PrismaService,
    private map: UserMapper,
  ) {}

  private get users() {
    return this.prisma.db.public.User;
  }

  async getUsers(filter?: IUserFilter): Promise<{ data: IUserData[]; meta: IMetaResponse }> {
    const perPage = filter?.perPage ?? 20;
    const currentPage = filter?.page ?? 1;

    let users = this.users;
    if (filter?.email) {
      users = users.where({ email: filter.email });
    }
    if (filter?.search) {
      const pattern = `%${likeLiteral(filter.search)}%`;
      users = users.where((u) => this.prisma.or(u.name.ilike(pattern), u.email.ilike(pattern)));
    }
    if (filter?.ids) {
      users = users.where((u) => u.id.in(filter.ids));
    }

    const [results, total] = await Promise.all([
      users
        // Every ordering ends on the primary key. With LIMIT/OFFSET, rows that tie on
        // createdAt have no stable position and show up twice or never across pages.
        .orderBy([(u) => u.createdAt.desc(), (u) => u.id.desc()])
        .offset((currentPage - 1) * perPage)
        .limit(perPage)
        .all(),
      users.aggregate((a) => ({ n: a.count() })).then((r) => r.n),
    ]);

    return {
      data: results.map((result) => this.map.toData(result)),
      meta: { total, lastPage: Math.ceil(total / perPage), currentPage, perPage },
    };
  }

  async getUser(id: string): Promise<IUserData | null> {
    const result = await this.users.first({ id });
    return result ? this.map.toData(result) : null;
  }

  async createUser(data: ICreateUserData): Promise<IUserData> {
    // Mint the primary key inside the write; retry only an `id` collision.
    // Format and rules: 02-standards/id-standards.md
    const createData = this.map.toCreate(data);
    const result = await withIdRetry(
      () => this.users.create({ id: formatId(USER_ID_PREFIX), ...createData }),
      this.prisma.inTransaction,
    );
    return this.map.toData(result);
  }

  async updateUser(id: string, data: IUpdateUserData): Promise<IUserData> {
    const result = await this.users.where({ id }).update(this.map.toUpdate(data));
    // Prisma 8 answers null for a missing row where Prisma 6 threw P2025.
    if (!result) throw new UserNotFoundError(id);
    return this.map.toData(result);
  }

  async deleteUser(id: string): Promise<boolean> {
    return (await this.users.where({ id }).delete()) !== null;
  }
}
```

Query reference (operators, `include`, aggregates, raw SQL, transactions): [Prisma Setup (API)](../01-setup/api-prisma.md#using-prismaservice-in-gateways).

### Mapper (data/user.mapper.ts)

```typescript
import { Injectable } from '@nestjs/common';
import type { PrismaCreate, PrismaRow, PrismaUpdate } from '#setup/prisma';
import { IUserData, ICreateUserData, IUpdateUserData } from '../domain/user.types';

@Injectable()
export class UserMapper {
  toData(user: PrismaRow<'User'>): IUserData {
    return {
      id: user.id, email: user.email, name: user.name,
      createdAt: user.createdAt, updatedAt: user.updatedAt,
    };
  }

  toCreate(data: ICreateUserData): Omit<PrismaCreate<'User'>, 'id'> {
    return { email: data.email, name: data.name };
  }

  toUpdate(data: IUpdateUserData): PrismaUpdate<'User'> {
    return {
      ...(data.email && { email: data.email }),
      ...(data.name && { name: data.name }),
    };
  }
}
```

### Module Wiring (user.module.ts)

```typescript
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './domain/user.service';
import { UserGateway } from './data/user.gateway';
import { UserMapper } from './data/user.mapper';
import { PrismaModule } from '#setup/prisma';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserMapper,
    { provide: 'IUserGateway', useClass: UserGateway },
  ],
  exports: [UserService],
})
export class UserModule {}
```

### Service Using Gateway (domain/user.service.ts)

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { IUserGateway, IUserFilter } from './user.gateway';
import { IUserData, ICreateUserData, IUpdateUserData } from './user.types';
import { IMetaResponse } from '#core/domain';
import { UserNotFoundError } from './errors/userNotFound.error';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserGateway')
    private readonly userGateway: IUserGateway
  ) {}

  async getUsers(filter?: IUserFilter): Promise<{ data: IUserData[]; meta: IMetaResponse }> {
    return this.userGateway.getUsers(filter);
  }

  async getUser(id: string): Promise<IUserData> {
    const user = await this.userGateway.getUser(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  async createUser(data: ICreateUserData): Promise<IUserData> {
    const normalizedData = { ...data, email: data.email.toLowerCase().trim() };
    return this.userGateway.createUser(normalizedData);
  }

  async updateUser(id: string, data: IUpdateUserData): Promise<IUserData> {
    await this.getUser(id);
    return this.userGateway.updateUser(id, data);
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.getUser(id);
    return this.userGateway.deleteUser(id);
  }
}
```

---

## Frontend Example

For a complete frontend gateway implementation with InversifyJS (including API gateway, mock gateway, DI registration, services, and composables), see [App DI Setup](../01-setup/app-di.md). The pattern is identical: interface in `domain/`, implementation in `data/`, wired via InversifyJS container.

---

## DI Injection Tokens

### NestJS (String Token)

```typescript
// Module
{ provide: 'IUserGateway', useClass: UserGateway }

// Service
@Inject('IUserGateway')
private readonly userGateway: IUserGateway
```

### InversifyJS (Symbol Token)

```typescript
// setup/di/types.ts
export const TYPES = {
  ProductGateway: Symbol.for('IProductGateway'),
  ProductService: Symbol.for('ProductService'),
};

// Registration
container.bind<IProductGateway>(TYPES.ProductGateway).to(ProductGateway);

// Service
@inject(TYPES.ProductGateway)
private readonly productGateway: IProductGateway
```

---

## Abstract Class Pattern for Interfaces

TypeScript interfaces don't exist at runtime, which means DI containers cannot use them directly as injection tokens. The solution is to use **abstract classes with the `I` prefix**.

```typescript
// Abstract classes exist at runtime and work as DI tokens
export abstract class IUserGateway {
  abstract findById(id: string): Promise<User>;
}

// Works perfectly - abstract class IS a value at runtime
{ provide: IUserGateway, useClass: UserGateway }
```

### Naming Convention

Keep the `I` prefix even though it's an abstract class:

```typescript
// domain/user.gateway.ts
export abstract class IUserGateway {
  abstract getUser(id: string): Promise<IUserData | null>;
  abstract createUser(data: ICreateUserData): Promise<IUserData>;
}

// data/user.gateway.ts
@Injectable()
export class UserGateway extends IUserGateway {
  async getUser(id: string): Promise<IUserData | null> { /* ... */ }
  async createUser(data: ICreateUserData): Promise<IUserData> { /* ... */ }
}
```

### Benefits

1. **No string/symbol tokens** - The class itself is the token
2. **Type safety** - TypeScript enforces the contract
3. **Clean injection** - No `@Inject()` decorator needed

```typescript
@Injectable()
export class UserService {
  constructor(private readonly userGateway: IUserGateway) {}
}

@Module({
  providers: [
    UserService,
    { provide: IUserGateway, useClass: UserGateway },
  ],
})
export class UserModule {}
```

### Summary

| Pattern | Runtime Exists | DI Token | Recommendation |
|---------|----------------|----------|----------------|
| `interface IUserGateway` | No | Requires string/symbol | Avoid for DI |
| `abstract class IUserGateway` | Yes | Class itself | **Use this** |

---

## Gateway vs Repository Comparison

| Aspect | Gateway | Repository |
|--------|---------|------------|
| Purpose | Abstract external data sources | Direct data access |
| Scope | External APIs, multiple sources | Single data source |
| Complexity | Can orchestrate multiple repos | Simple CRUD |
| Location | `data/` layer | `data/` layer |
| Use Case | AI APIs, payment, email, multi-source | Database access |

```
Gateway (orchestrates)
    ├── DocsRepository (local files)
    └── GitHubRepository (remote API)
```

---

## Benefits of Gateway Pattern

1. **Testability** - Mock the interface for unit tests
2. **Flexibility** - Swap implementations without touching domain
3. **Separation** - Domain knows nothing about HTTP, databases
4. **Multiple Implementations** - API, Mock, Offline, Cache
5. **Single Responsibility** - Gateway handles data access only

---

## Checklist

### Interface (domain/)

- [ ] File: `domain/{entity}.gateway.ts`
- [ ] Interface name: `I{Entity}Gateway`
- [ ] Methods return domain types
- [ ] Exported in `domain/index.ts`

### Implementation (data/)

- [ ] File: `data/{entity}.gateway.ts`
- [ ] Class name: `{Entity}Gateway`
- [ ] `@Injectable()` decorator (NestJS) or `@injectable()` (Inversify)
- [ ] `implements I{Entity}Gateway`
- [ ] Imports interface from `../domain/`
- [ ] Uses mapper for data transformation

### Module/DI Wiring

- [ ] Gateway registered with interface token
- [ ] Token matches `@Inject()` in service
- [ ] Service imports INTERFACE only
- [ ] Service NEVER imports from `data/`

### Never Do

- [ ] NO implementation details in interface
- [ ] NO direct database/HTTP code in domain layer
- [ ] NO importing implementation class in service
- [ ] NO business logic in gateway (put in service)

---

## Related Documentation

- [Service Pattern](./service.md) - Services use gateway interfaces
- [Layers Pattern](./layers.md) - Domain vs Data layer separation
- [Types Pattern](./types.md) - Domain types returned by gateways
- [Mapper Pattern](./mapper.md) - Transform data in gateway
- [App DI Setup](../01-setup/app-di.md) - InversifyJS configuration

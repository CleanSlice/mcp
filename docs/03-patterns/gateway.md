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
║   Use REPOSITORY only for external API wrappers                 ║
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
import { Prisma } from '@prisma/client';
import { IUserGateway, IUserFilter } from '../domain/user.gateway';
import { IUserData, ICreateUserData, IUpdateUserData } from '../domain/user.types';
import { UserMapper } from './user.mapper';
import { PrismaService } from '#prisma';
import { IMetaResponse } from '#core/domain';

@Injectable()
export class UserGateway implements IUserGateway {
  constructor(
    private prisma: PrismaService,
    private map: UserMapper,
  ) {}

  async getUsers(filter?: IUserFilter): Promise<{ data: IUserData[]; meta: IMetaResponse }> {
    const options: Prisma.UserFindManyArgs = { where: {} };

    if (filter?.email) {
      options.where.email = filter.email;
    }
    if (filter?.search) {
      options.where.OR = [
        { name: { contains: filter.search } },
        { email: { contains: filter.search } },
      ];
    }
    if (filter?.ids) {
      options.where.id = { in: filter.ids };
    }
    if (filter?.page && filter?.perPage) {
      options.skip = (filter.page - 1) * filter.perPage;
      options.take = filter.perPage;
    }

    const [results, total] = await Promise.all([
      this.prisma.user.findMany(options),
      this.prisma.user.count({ where: options.where }),
    ]);

    const perPage = filter?.perPage ?? 20;
    const currentPage = filter?.page ?? 1;

    return {
      data: results.map((result) => this.map.toData(result)),
      meta: { total, lastPage: Math.ceil(total / perPage), currentPage, perPage },
    };
  }

  async getUser(id: string): Promise<IUserData | null> {
    const result = await this.prisma.user.findUnique({ where: { id } });
    return result ? this.map.toData(result) : null;
  }

  async createUser(data: ICreateUserData): Promise<IUserData> {
    const result = await this.prisma.user.create({ data: this.map.toCreate(data) });
    return this.map.toData(result);
  }

  async updateUser(id: string, data: IUpdateUserData): Promise<IUserData> {
    const result = await this.prisma.user.update({
      where: { id },
      data: this.map.toUpdate(data),
    });
    return this.map.toData(result);
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
```

### Mapper (data/user.mapper.ts)

```typescript
import { Injectable } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';
import { IUserData, ICreateUserData, IUpdateUserData } from '../domain/user.types';

@Injectable()
export class UserMapper {
  toData(user: PrismaUser): IUserData {
    return {
      id: user.id, email: user.email, name: user.name,
      createdAt: user.createdAt, updatedAt: user.updatedAt,
    };
  }

  toCreate(data: ICreateUserData): Prisma.UserCreateInput {
    return { email: data.email, name: data.name };
  }

  toUpdate(data: IUpdateUserData): Prisma.UserUpdateInput {
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
import { PrismaModule } from '#prisma';

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

---
id: mapper-pattern
title: Mapper Pattern
version: 1.0.0
last_updated: 2025-12-16

pattern: mapper
complexity: fundamental
framework: agnostic
category: architecture
applies_to: [backend, frontend, api, app]

tags:
  - mapper
  - data-layer
  - transformation
  - prisma
  - clean-architecture
  - dto

keywords:
  - mapper pattern
  - data transformation
  - toData
  - toCreate
  - toUpdate
  - domain types
  - prisma types

deprecated: false
experimental: false
production_ready: true
---

# Mapper Pattern

> **Mappers transform data between layers**. They convert database models (Prisma) to domain types and vice versa. Mappers live in the `data/` layer and contain NO business logic - only pure data transformation.

---

## Overview

Mappers are the **bridge** between external data formats and your domain types:

```
┌──────────────────────────────────────────────────────────────┐
│  GATEWAY (Data Layer)                                         │
│  - Calls database/API                                         │
│  - Uses MAPPER to convert data                                │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               │ uses
                               v
┌──────────────────────────────────────────────────────────────┐
│  MAPPER (Data Layer)                     ← YOU ARE HERE       │
│  - toData(): DB Model → Domain Type                           │
│  - toCreate(): Create Input → DB Create Input                 │
│  - toUpdate(): Update Input → DB Update Input                 │
│  - Pure transformation, NO async, NO business logic           │
└──────────────────────────────────────────────────────────────┘
                               │
                               │ transforms to/from
                               v
┌──────────────────────────────────────────────────────────────┐
│  DOMAIN TYPES                                                 │
│  - IUserData, ICreateUserData, IUpdateUserData                │
│  - Clean, framework-agnostic interfaces                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Critical Rules

### 1. Mappers Are SYNCHRONOUS Only

```typescript
// CORRECT
toData(user: PrismaRow<'User'>): IUserData {
  return { id: user.id, name: user.name };
}

// WRONG
async toData(userId: string): Promise<IUserData> {
  const user = await this.prisma.db.public.User.first({ id: userId });
  return { id: user.id, name: user.name };
}
```

### 2. NO Database Calls in Mappers

```typescript
// WRONG
toData(user: PrismaRow<'User'>): IUserData {
  const roles = await this.prisma.db.public.Role.where({ userId: user.id }).all();
  return { ...user, roles };
}

// CORRECT - All data passed as parameters
toData(user: PrismaRow<'User'>, roles: PrismaRow<'Role'>[]): IUserData {
  return { ...user, roles: roles.map(r => r.name) };
}
```

### 3. NO Business Logic in Mappers

```typescript
// WRONG - Business logic belongs in SERVICE
toData(user: PrismaRow<'User'>): IUserData {
  if (user.status === 'banned') {
    throw new UserBannedError(user.id);
  }
  return { id: user.id, name: user.name };
}

// CORRECT - Pure transformation
toData(user: PrismaRow<'User'>): IUserData {
  return {
    id: user.id,
    name: user.name,
    status: user.status as UserStatusTypes,
  };
}
```

### 4. Mappers Live in `data/` Layer

```
slices/user/
├── domain/
│   └── user.types.ts          # Domain types
└── data/
    ├── user.gateway.ts        # Uses mapper
    └── user.mapper.ts         # Mapper lives HERE
```

---

## File Location & Naming

```
slices/user/
├── domain/
│   ├── user.types.ts          # IUserData, ICreateUserData, IUpdateUserData
│   └── user.gateway.ts        # Gateway interface
└── data/
    ├── user.gateway.ts        # Gateway implementation (uses mapper)
    └── user.mapper.ts         # Mapper (transforms data)
```

**Naming Convention:**
- File: `{entity}.mapper.ts` (SINGULAR)
- Class: `{Entity}Mapper` (SINGULAR)
- Location: `data/` folder

---

## Complete Mapper Example

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PrismaCreate, PrismaRow, PrismaUpdate } from '#setup/prisma';
import { IUserData, ICreateUserData, IUpdateUserData, RoleTypes } from '../domain';

// Prisma 8 generates no model types: #setup/prisma derives them from the contract.
export type IUserResponse = PrismaRow<'User'>;
export type IUserCreateRequest = PrismaCreate<'User'>;
export type IUserUpdateRequest = PrismaUpdate<'User'>;

@Injectable()
export class UserMapper {
  constructor(private configService: ConfigService) {}

  toData(data: IUserResponse): IUserData {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      emailConfirmed: data.emailConfirmed,
      emailError: data.emailError,
      emailErrorDescription: data.emailErrorDescription,
      emailNotifications: data.emailNotifications,
      roles: [...data.roles] as RoleTypes[], // lists read as readonly arrays
      verified: data.verified,
      banned: data.banned,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  /** Everything but the id: the gateway mints that with formatId(USER_ID_PREFIX). */
  toCreate(data: ICreateUserData): Omit<IUserCreateRequest, 'id'> {
    return {
      name: data.name,
      email: data.email,
      roles: data.roles,
      verified: this.configService.get('IS_USER_VERIFIED') === 'true',
    };
  }

  toUpdate(data: IUpdateUserData): IUserUpdateRequest {
    return {
      name: data.name,
      verified: data.verified,
      roles: data.roles,
      banned: data.banned,
      emailError: data.emailError ?? false,
      emailErrorDescription: data.emailErrorDescription ?? '',
      emailNotifications: data.emailNotifications ?? true,
    };
  }
}
```

---

## Mapper Methods Reference

### Standard Methods

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `toData()` | `PrismaRow<'User'>` | Domain Type | Convert DB response to domain |
| `toCreate()` | Create Input | `Omit<PrismaCreate<'User'>, 'id'>` | Prepare data for insert |
| `toUpdate()` | Update Input | `PrismaUpdate<'User'>` | Prepare data for update |

### Additional Methods (Optional)

| Method | Purpose |
|--------|---------|
| `toDto()` | Domain Type → Response DTO |
| `toList()` | DB Model[] → Domain Type[] (bulk conversion) |
| `toEntity()` | Domain Type → Entity class (if using entities) |

---

## Handling Complex Transformations

### Relations

```typescript
// what `this.prisma.db.public.User.include('posts')` returns
type UserWithPosts = PrismaRow<'User'> & { posts: PrismaRow<'Post'>[] };

toDataWithPosts(user: UserWithPosts): IUserWithPosts {
  return {
    ...this.toData(user),
    posts: user.posts.map((post) => ({
      id: post.id,
      title: post.title,
      createdAt: post.createdAt,
    })),
  };
}
```

### JSON Fields

```typescript
toData(user: PrismaRow<'User'>): IUserData {
  return {
    id: user.id,
    settings: user.settings as IUserSettings,
    metadata: (user.metadata as IUserMetadata) ?? {},
  };
}

toCreate(data: ICreateUserData): Omit<PrismaCreate<'User'>, 'id'> {
  return {
    name: data.name,
    settings: data.settings as unknown as JsonObject, // a Jsonb column; JsonObject from #setup/prisma
  };
}
```

### Enum Casting

```typescript
toData(user: PrismaRow<'User'>): IUserData {
  return {
    id: user.id,
    status: user.status as UserStatusTypes,
    role: user.role as UserRoleTypes,
    permissions: user.permissions as PermissionTypes[],
  };
}
```

### Date Handling

```typescript
toData(user: PrismaRow<'User'>): IUserData {
  return {
    id: user.id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt ?? undefined,
  };
}

toDto(user: IUserData): UserResponseDto {
  return {
    id: user.id,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}
```

### Bulk Conversion

```typescript
toList(users: PrismaRow<'User'>[]): IUserData[] {
  return users.map((user) => this.toData(user));
}
```

### Cross-Mapper Composition

When an entity includes related data that has its own mapper, inject and use that mapper to transform nested objects.

```typescript
import { Injectable } from '@nestjs/common';
import type { PrismaCreate, PrismaRow, PrismaUpdate } from '#setup/prisma';
import { IApiKeyData, ICreateApiKeyData, IUpdateApiKeyData } from '../domain';
import { randomBytes } from 'node:crypto';
import { TeamMapper } from '#users/teams';

// what `this.prisma.db.public.ApiKey.include('team')` returns
export type IApiKeyResponse = PrismaRow<'ApiKey'> & { team: PrismaRow<'Team'> };
export type IApiKeyCreateRequest = PrismaCreate<'ApiKey'>;
export type IApiKeyUpdateRequest = PrismaUpdate<'ApiKey'>;

@Injectable()
export class ApiKeyMapper {
  constructor(private readonly teamMapper: TeamMapper) {}

  toData(data: IApiKeyResponse): IApiKeyData {
    return {
      id: data.id,
      teamId: data.teamId,
      team: this.teamMapper.toData(data.team),
      name: data.name,
      secret: data.secret,
      lastUsedAt: data.lastUsedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  /** The id is minted by the gateway (formatId(API_KEY_ID_PREFIX)); the secret is not an id. */
  toCreate(data: ICreateApiKeyData): Omit<IApiKeyCreateRequest, 'id'> {
    return {
      teamId: data.teamId,
      name: data.name,
      secret: `secret-${randomBytes(32).toString('base64url')}`,
      lastUsedAt: new Date(),
    };
  }

  toUpdate(data: IUpdateApiKeyData): IApiKeyUpdateRequest {
    return {
      name: data.name,
    };
  }
}
```

**Key Points for Cross-Mapper Usage:**

1. **Import from slice path alias** - Use `#users/teams` not relative paths
2. **Inject via constructor** - Mappers are injectable services
3. **Response type includes relation** - Define `IApiKeyResponse` with included relation
4. **Gateway must include relation** - Query with `.include('team')`
5. **Delegate transformation** - Call `this.teamMapper.toData()` for nested objects

---

## Using Mapper in Gateway

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '#setup/prisma';
import { formatId, withIdRetry } from '#setup/id';
import { IUserGateway } from '../domain/user.gateway';
import { IUserData, ICreateUserData, IUpdateUserData, USER_ID_PREFIX } from '../domain/user.types';
import { UserNotFoundError } from '../domain/user.errors';
import { UserMapper } from './user.mapper';

@Injectable()
export class UserGateway implements IUserGateway {
  constructor(
    private prisma: PrismaService,
    private mapper: UserMapper,
  ) {}

  private get users() {
    return this.prisma.db.public.User;
  }

  async getUser(id: string): Promise<IUserData | null> {
    const result = await this.users.first({ id });
    return result ? this.mapper.toData(result) : null;
  }

  async getUsers(): Promise<IUserData[]> {
    const results = await this.users.orderBy((u) => u.createdAt.desc()).all();
    return results.map((r) => this.mapper.toData(r));
  }

  async createUser(data: ICreateUserData): Promise<IUserData> {
    const createData = this.mapper.toCreate(data);
    const result = await withIdRetry(
      () => this.users.create({ id: formatId(USER_ID_PREFIX), ...createData }),
      this.prisma.inTransaction,
    );
    return this.mapper.toData(result);
  }

  async updateUser(id: string, data: IUpdateUserData): Promise<IUserData> {
    const result = await this.users.where({ id }).update(this.mapper.toUpdate(data));
    if (!result) throw new UserNotFoundError(id); // Prisma 8 answers null
    return this.mapper.toData(result);
  }
}
```

**Gateway with Cross-Mapper:**

```typescript
async getApiKey(id: string): Promise<IApiKeyData | null> {
  const result = await this.prisma.db.public.ApiKey.include('team').first({ id });
  return result ? this.mapper.toData(result) : null;
}
```

---

## ID Generation

Mappers do **not** generate ids. The gateway mints the primary key inside the write and repeats the write on a collision:

```typescript
// data/user.gateway.ts
import { formatId, withIdRetry } from '#setup/id';

const createData = this.mapper.toCreate(data);
const user = await withIdRetry(
  () => this.prisma.db.public.User.create({ id: formatId(USER_ID_PREFIX), ...createData }),
  this.prisma.inTransaction,
);
```

Format, prefix registry and retry rules: [Identifier Standards](../02-standards/id-standards.md). Never `uuid()`, `cuid()` or a Prisma `@default` for a primary key.

---

## Module Registration

```typescript
import { Module } from '@nestjs/common';
import { UserGateway } from './data/user.gateway';
import { UserMapper } from './data/user.mapper';
import { PrismaModule } from '#setup/prisma';

@Module({
  imports: [PrismaModule],
  providers: [
    UserMapper,
    UserGateway,
  ],
})
export class UserModule {}
```

---

## Checklist

### Mapper Requirements

- [ ] File located in `data/` folder
- [ ] Named `{entity}.mapper.ts` (SINGULAR)
- [ ] Class named `{Entity}Mapper`
- [ ] `@Injectable()` decorator

### Methods

- [ ] All methods are SYNCHRONOUS (no async/await)
- [ ] All methods are pure transformations
- [ ] `toData()` - DB model → Domain type
- [ ] `toCreate()` - Create input → DB create input
- [ ] `toUpdate()` - Update input → DB update input

### Type Aliases

- [ ] `IUserResponse` - Prisma model type
- [ ] `IUserCreateRequest` - Prisma create input
- [ ] `IUserUpdateRequest` - Prisma update input

### Never Do

- [ ] NO async methods
- [ ] NO database calls
- [ ] NO API calls
- [ ] NO business logic
- [ ] NO validation
- [ ] NO error throwing (except type errors)
- [ ] NO id generation - the gateway mints with `formatId(prefix)` ([Identifier Standards](../02-standards/id-standards.md))

---

## Related Documentation

- [Gateway Pattern](./gateway.md) - Gateways use mappers
- [Types Pattern](./types.md) - Domain types transformed by mappers
- [Service Pattern](./service.md) - Services work with domain types
- [Layers Pattern](./layers.md) - Mapper lives in data layer

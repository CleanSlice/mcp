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
toData(user: PrismaUser): IUserData {
  return { id: user.id, name: user.name };
}

// WRONG
async toData(userId: string): Promise<IUserData> {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  return { id: user.id, name: user.name };
}
```

### 2. NO Database Calls in Mappers

```typescript
// WRONG
toData(user: PrismaUser): IUserData {
  const roles = await this.prisma.role.findMany({ where: { userId: user.id } });
  return { ...user, roles };
}

// CORRECT - All data passed as parameters
toData(user: PrismaUser, roles: PrismaRole[]): IUserData {
  return { ...user, roles: roles.map(r => r.name) };
}
```

### 3. NO Business Logic in Mappers

```typescript
// WRONG - Business logic belongs in SERVICE
toData(user: PrismaUser): IUserData {
  if (user.status === 'banned') {
    throw new UserBannedError(user.id);
  }
  return { id: user.id, name: user.name };
}

// CORRECT - Pure transformation
toData(user: PrismaUser): IUserData {
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
import DB, { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { IUserData, ICreateUserData, IUpdateUserData, RoleTypes } from '../domain';

export type IUserResponse = DB.User;

export type IUserCreateRequest = Prisma.XOR<
  Prisma.UserCreateInput,
  Prisma.UserUncheckedCreateInput
>;

export type IUserUpdateRequest = Prisma.XOR<
  Prisma.UserUpdateInput,
  Prisma.UserUncheckedUpdateInput
>;

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
      roles: data.roles as RoleTypes[],
      verified: data.verified,
      banned: data.banned,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  toCreate(data: ICreateUserData): IUserCreateRequest {
    const id = `user-${uuid()}`;
    return {
      id,
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
| `toData()` | DB Model | Domain Type | Convert DB response to domain |
| `toCreate()` | Create Input | DB Create Input | Prepare data for insert |
| `toUpdate()` | Update Input | DB Update Input | Prepare data for update |

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
type UserWithPosts = Prisma.UserGetPayload<{
  include: { posts: true };
}>;

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
toData(user: PrismaUser): IUserData {
  return {
    id: user.id,
    settings: user.settings as IUserSettings,
    metadata: (user.metadata as IUserMetadata) ?? {},
  };
}

toCreate(data: ICreateUserData): Prisma.UserCreateInput {
  return {
    name: data.name,
    settings: data.settings as Prisma.JsonObject,
  };
}
```

### Enum Casting

```typescript
toData(user: PrismaUser): IUserData {
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
toData(user: PrismaUser): IUserData {
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
toList(users: PrismaUser[]): IUserData[] {
  return users.map((user) => this.toData(user));
}
```

### Cross-Mapper Composition

When an entity includes related data that has its own mapper, inject and use that mapper to transform nested objects.

```typescript
import DB, { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { IApiKeyData, ICreateApiKeyData, IUpdateApiKeyData } from '../domain';
import { TeamMapper } from '#users/teams';
import { v4 as uuid } from 'uuid';

export type IApiKeyResponse = DB.ApiKey & {
  team: DB.Team;
};

export type IApiKeyCreateRequest = Prisma.XOR<
  Prisma.ApiKeyCreateInput,
  Prisma.ApiKeyUncheckedCreateInput
>;

export type IApiKeyUpdateRequest = Prisma.XOR<
  Prisma.ApiKeyUpdateInput,
  Prisma.ApiKeyUncheckedUpdateInput
>;

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

  toCreate(data: ICreateApiKeyData): IApiKeyCreateRequest {
    const id = `api-key-${uuid()}`;
    const secret = `secret-${uuid()}`;
    return {
      id,
      team: { connect: { id: data.teamId } },
      name: data.name,
      secret,
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
4. **Gateway must include relation** - Query with `{ include: { team: true } }`
5. **Delegate transformation** - Call `this.teamMapper.toData()` for nested objects

---

## Using Mapper in Gateway

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '#prisma';
import { IUserGateway } from '../domain/user.gateway';
import { IUserData, ICreateUserData, IUpdateUserData } from '../domain/user.types';
import { UserMapper } from './user.mapper';

@Injectable()
export class UserGateway implements IUserGateway {
  constructor(
    private prisma: PrismaService,
    private mapper: UserMapper,
  ) {}

  async getUser(id: string): Promise<IUserData | null> {
    const result = await this.prisma.user.findUnique({ where: { id } });
    return result ? this.mapper.toData(result) : null;
  }

  async getUsers(): Promise<IUserData[]> {
    const results = await this.prisma.user.findMany();
    return results.map((r) => this.mapper.toData(r));
  }

  async createUser(data: ICreateUserData): Promise<IUserData> {
    const result = await this.prisma.user.create({
      data: this.mapper.toCreate(data),
    });
    return this.mapper.toData(result);
  }

  async updateUser(id: string, data: IUpdateUserData): Promise<IUserData> {
    const result = await this.prisma.user.update({
      where: { id },
      data: this.mapper.toUpdate(data),
    });
    return this.mapper.toData(result);
  }
}
```

**Gateway with Cross-Mapper:**

```typescript
async getApiKey(id: string): Promise<IApiKeyData | null> {
  const result = await this.prisma.apiKey.findUnique({
    where: { id },
    include: { team: true },
  });
  return result ? this.mapper.toData(result) : null;
}
```

---

## ID Generation

```typescript
import { v4 as uuid } from 'uuid';

toCreate(data: ICreateUserData): Prisma.UserCreateInput {
  return {
    id: `user-${uuid()}`,
    ...data,
  };
}
```

Common ID prefixes: `user-`, `org-`, `task-`, `inv-`

---

## Module Registration

```typescript
import { Module } from '@nestjs/common';
import { UserGateway } from './data/user.gateway';
import { UserMapper } from './data/user.mapper';
import { PrismaModule } from '#prisma';

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

---

## Related Documentation

- [Gateway Pattern](./gateway.md) - Gateways use mappers
- [Types Pattern](./types.md) - Domain types transformed by mappers
- [Service Pattern](./service.md) - Services work with domain types
- [Layers Pattern](./layers.md) - Mapper lives in data layer

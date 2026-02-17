---
id: layers-pattern
title: Clean Architecture Layers
version: 1.0.0
last_updated: 2025-12-14

pattern: layers
complexity: fundamental
framework: agnostic
category: architecture
applies_to: [backend, frontend, fullstack]

tags:
  - layers
  - clean-architecture
  - domain
  - data
  - presentation
  - separation-of-concerns

keywords:
  - domain layer
  - data layer
  - presentation layer
  - dependency injection
  - inversion of control
  - layer boundaries

deprecated: false
experimental: false
production_ready: true
---

# Clean Architecture Layers

> **Foundation**: Every slice follows Clean Architecture with three distinct layers that enforce separation of concerns and dependency rules.

---

## Overview

CleanSlice organizes code into **three layers** within each slice:

```
┌───────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                   │
│  Controllers, DTOs, Components, Pages                 │
│  - Handles HTTP requests / UI events                  │
│  - Input validation                                   │
│  - Response formatting                                │
└─────────────────────────┬─────────────────────────────┘
                          │ calls
                          v
┌───────────────────────────────────────────────────────┐
│  DOMAIN LAYER                                         │
│  Services, Gateway Interfaces, Types, Entities        │
│  - Business logic                                     │
│  - Defines contracts (interfaces)                     │
│  - Pure TypeScript, framework-agnostic                │
└─────────────────────────┬─────────────────────────────┘
                          │ implements
                          v
┌───────────────────────────────────────────────────────┐
│  DATA LAYER                                           │
│  Gateway Implementations, Mappers, Repositories       │
│  - External API calls                                 │
│  - Database access                                    │
│  - Data transformation                                │
└───────────────────────────────────────────────────────┘
```

**Key Principle**: Dependencies point INWARD toward the domain layer.

---

## Layer Structure

### Backend (NestJS)

```
slices/user/
├── user.controller.ts           # Presentation layer
├── user.module.ts               # Module configuration
├── domain/                      # Domain layer
│   ├── index.ts
│   ├── user.service.ts
│   ├── user.gateway.ts          # Gateway interface (contract)
│   ├── user.types.ts            # Domain types (IUserData, etc.)
│   └── errors/
│       └── userNotFound.error.ts
├── data/                        # Data layer
│   ├── index.ts
│   ├── user.gateway.ts          # Gateway implementation
│   ├── user.mapper.ts
│   └── user.repository.ts       # Optional: direct data access
└── dtos/                        # Presentation layer (DTOs)
    ├── createUser.dto.ts
    └── userResponse.dto.ts
```

### Frontend (Nuxt/Vue/React)

```
slices/user/
├── components/                  # Presentation layer
│   └── user/
│       ├── List.vue
│       └── Form.vue
├── layouts/
│   └── UserLayout.vue
├── plugins/                     # Dependency injection
│   └── user.plugin.ts
├── stores/                      # State management (Pinia)
│   └── user.store.ts
├── menu/
│   └── user.menu.ts
├── domain/                      # Domain layer
│   ├── user.types.ts
│   ├── user.gateway.ts          # Gateway interface (contract)
│   └── user.service.ts
├── data/                        # Data layer
│   ├── user.gateway.ts          # Gateway implementation (API calls)
│   ├── user.mapper.ts
│   └── user.repository.ts
└── utils/
    └── user.utils.ts
```

---

## 1. Presentation Layer

**Location**: Root of slice + `dtos/` folder  |  **Purpose**: Handle external communication (HTTP, UI events)

### Backend Components

| File | Purpose |
|------|---------|
| `{slice}.controller.ts` | HTTP request handling, route definitions |
| `dtos/*.dto.ts` | Input validation, response formatting |

### Example: Controller

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './domain/user.service';
import { CreateUserDto } from './dtos/createUser.dto';
import { UserResponseDto } from './dtos/userResponse.dto';

@Controller('users')  // PLURAL route
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.userService.create(dto);
    return new UserResponseDto(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(id);
    return new UserResponseDto(user);
  }
}
```

### Example: DTOs

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;
}
```

```typescript
import { IUserData } from '../domain/user.types';

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;

  constructor(user: IUserData) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.createdAt = user.createdAt.toISOString();
  }
}
```

### Frontend Components

```vue
<template>
  <div class="user-list">
    <div v-for="user in users" :key="user.id">
      {{ user.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUser } from '../composables/useUser';
const { users, loading, error } = useUser();
</script>
```

### Rules

- Can import from `domain/` (services, types)
- Handles input validation and response formatting
- NO business logic
- NO direct database/API calls
- NEVER import from `data/`

---

## 2. Domain Layer

**Location**: `domain/` folder  |  **Purpose**: Contains business logic and defines contracts

### Components

| File | Purpose |
|------|---------|
| `{slice}.service.ts` | Business logic, orchestrates use cases |
| `{slice}.gateway.ts` | Interface definition (contract) |
| `{slice}.types.ts` | Domain types (`IEntityData` interfaces) |
| `{entity}.entity.ts` | Entity class with methods (optional) |
| `errors/*.error.ts` | Domain-specific errors |
| `index.ts` | Public API exports |

### Example: Service

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { IUserGateway } from './user.gateway';
import { IUserData, ICreateUserData } from './user.types';
import { UserNotFoundError } from './errors/userNotFound.error';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserGateway')
    private readonly userGateway: IUserGateway
  ) {}

  async create(data: ICreateUserData): Promise<IUserData> {
    const normalizedEmail = data.email.toLowerCase();
    return this.userGateway.create({ ...data, email: normalizedEmail });
  }

  async findById(id: string): Promise<IUserData> {
    const user = await this.userGateway.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }
}
```

### Example: Gateway Interface

```typescript
import { IUserData, ICreateUserData } from './user.types';

export interface IUserGateway {
  create(data: ICreateUserData): Promise<IUserData>;
  findById(id: string): Promise<IUserData | null>;
  findByEmail(email: string): Promise<IUserData | null>;
  findAll(): Promise<IUserData[]>;
  update(id: string, data: Partial<ICreateUserData>): Promise<IUserData>;
  delete(id: string): Promise<void>;
}
```

### Example: Types

```typescript
export interface IUserData {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateUserData {
  email: string;
  name: string;
}

// IUser - Full entity interface (OPTIONAL, only if you need methods)
export interface IUser extends IUserData {
  getDisplayName(): string;
  isActive(): boolean;
}
```

### Example: Domain Error

```typescript
import { BaseError } from '#setup/error/domain';

export class UserNotFoundError extends BaseError {
  constructor(userId: string) {
    super('User not found', 'USER_NOT_FOUND', 404, { userId });
  }
}
```

### Rules

- Pure TypeScript (no framework dependencies in types)
- Can import from other slice's `domain/` layers
- Defines interfaces for data layer to implement
- NO external API calls or database queries
- NEVER import from `data/` layer

---

## 3. Data Layer

**Location**: `data/` folder  |  **Purpose**: Implements gateway interfaces, handles external communication

### Components

| File | Purpose |
|------|---------|
| `{slice}.gateway.ts` | Gateway implementation |
| `{provider}.gateway.ts` | Provider-specific implementation |
| `{slice}.mapper.ts` | Data transformation |
| `{slice}.repository.ts` | Direct data access (optional) |
| `mock.gateway.ts` | Mock for testing/development |

### Example: Gateway Implementation

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '#setup/prisma';
import { IUserGateway } from '../domain/user.gateway';
import { IUserData, ICreateUserData } from '../domain/user.types';
import { UserMapper } from './user.mapper';

@Injectable()
export class UserGateway implements IUserGateway {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: UserMapper
  ) {}

  async create(data: ICreateUserData): Promise<IUserData> {
    const user = await this.prisma.user.create({
      data: this.mapper.toDatabase(data)
    });
    return this.mapper.toDomain(user);
  }

  async findById(id: string): Promise<IUserData | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.mapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<IUserData | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.mapper.toDomain(user) : null;
  }

  async findAll(): Promise<IUserData[]> {
    const users = await this.prisma.user.findMany();
    return users.map(user => this.mapper.toDomain(user));
  }

  async update(id: string, data: Partial<ICreateUserData>): Promise<IUserData> {
    const user = await this.prisma.user.update({
      where: { id },
      data: this.mapper.toDatabase(data)
    });
    return this.mapper.toDomain(user);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
```

### Example: Mapper

```typescript
import { Injectable } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';
import { IUserData, ICreateUserData } from '../domain/user.types';

@Injectable()
export class UserMapper {
  toDomain(prismaUser: PrismaUser): IUserData {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }

  toDatabase(data: ICreateUserData | Partial<ICreateUserData>): Partial<PrismaUser> {
    return {
      email: data.email,
      name: data.name,
    };
  }
}
```

### Example: Mock Gateway

```typescript
import { Injectable } from '@nestjs/common';
import { IUserGateway } from '../domain/user.gateway';
import { IUserData, ICreateUserData } from '../domain/user.types';

@Injectable()
export class MockUserGateway implements IUserGateway {
  private users: IUserData[] = [];

  async create(data: ICreateUserData): Promise<IUserData> {
    const user: IUserData = {
      id: `user-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async findById(id: string): Promise<IUserData | null> {
    return this.users.find(u => u.id === id) || null;
  }

  // ... other methods
}
```

### Rules

- Implements interfaces from `domain/`
- Can import from `domain/` layer and other slice's `data/` layers
- Handles all external communication
- NO business logic (only data transformation)
- Domain types should not leak database types

---

## Dependency Rules

### Within a Slice

```
┌──────────────────┐
│   Presentation   │────────┐
└────────┬─────────┘        │
         │ calls            │ can import types
         v                  │
┌──────────────────┐        │
│     Domain       │ <──────┘
└────────┬─────────┘
         │ implements (via DI)
         v
┌──────────────────┐
│      Data        │
└──────────────────┘
```

| From | To | Allowed? |
|------|-----|----------|
| Presentation | Domain | Yes |
| Presentation | Data | No |
| Domain | Data | No (use DI) |
| Data | Domain | Yes |

### Across Slices

```
ALLOWED:
  domain     -> domain        // Import from other domain layers
  data       -> data          // Import from other data layers
  data       -> domain        // Import from domain layers

FORBIDDEN:
  domain     -> data          // Domain CANNOT import from data
  presentation -> data        // Presentation CANNOT import from data
```

### Examples

```typescript
// GOOD: domain -> domain (cross-slice)
import { IUserData } from '../../user/domain';

// GOOD: data -> domain (cross-slice)
import { IUserData } from '../../user/domain';

// GOOD: data -> data (cross-slice)
import { UserRepository } from '../../user/data';

// BAD: domain -> data
import { UserRepository } from '../data'; // NEVER DO THIS

// BAD: presentation -> data
import { UserGateway } from './data'; // NEVER DO THIS
```

---

## Module Wiring

The module connects all layers using dependency injection:

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
    {
      provide: 'IUserGateway',
      useClass: UserGateway,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
```

### Environment-Based Gateway Selection

```typescript
@Module({
  providers: [
    {
      provide: 'IUserGateway',
      useClass: process.env.NODE_ENV === 'test'
        ? MockUserGateway
        : UserGateway,
    },
  ],
})
export class UserModule {}
```

---

## Quick Reference

### What Goes Where?

| Concern | Layer | Example File |
|---------|-------|--------------|
| HTTP routes | Presentation | `user.controller.ts` |
| Input validation | Presentation | `createUser.dto.ts` |
| Response formatting | Presentation | `userResponse.dto.ts` |
| Business logic | Domain | `user.service.ts` |
| Contracts/Interfaces | Domain | `user.gateway.ts` |
| Domain types | Domain | `user.types.ts` |
| Custom errors | Domain | `userNotFound.error.ts` |
| Database access | Data | `user.gateway.ts` |
| API calls | Data | `external.gateway.ts` |
| Data transformation | Data | `user.mapper.ts` |

### Layer Responsibilities Summary

| Layer | Knows About | Doesn't Know About |
|-------|------------|-------------------|
| Presentation | Domain types, Services | Data layer, Database, External APIs |
| Domain | Own types, Other domain types | Data layer, Framework specifics |
| Data | Domain interfaces, External systems | Presentation layer, HTTP |

---

## Common Mistakes

### Mixing Layers

```typescript
// BAD: Controller calling data layer directly
@Controller('users')
export class UserController {
  constructor(private readonly prisma: PrismaService) {} // WRONG

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.user.findUnique({ where: { id } }); // WRONG
  }
}

// GOOD: Controller uses service
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}
```

### Domain Importing Data

```typescript
// BAD: Service importing from data layer
import { UserGateway } from '../data/user.gateway'; // NEVER

// GOOD: Service depends on interface
import { IUserGateway } from './user.gateway';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserGateway')
    private readonly gateway: IUserGateway
  ) {}
}
```

### Leaking Database Types

```typescript
async findAll(): Promise<PrismaUser[]> { ... }  // BAD - Prisma type leaks
async findAll(): Promise<IUserData[]> { ... }    // GOOD - domain type
```

---

## Benefits

1. **Testability**: Mock the gateway interface, test business logic in isolation
2. **Maintainability**: Changes in one layer don't affect others
3. **Flexibility**: Swap implementations without touching business logic
4. **Clarity**: Clear boundaries make code easier to understand
5. **Reusability**: Domain logic can be reused across different entry points

---

## Related Patterns

- [Gateway Pattern](./gateway-pattern/README.md) - External service abstraction
- [Repository Pattern](./repository-pattern/README.md) - Simple data access
- [Setup Slice](./setup-slice/README.md) - Infrastructure concerns
- [Nested Slices](./nested-slices/README.md) - Complex domain organization
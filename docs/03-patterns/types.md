---
id: types-pattern
title: Domain Types Pattern
version: 1.0.0
last_updated: 2025-12-16

pattern: types
complexity: fundamental
framework: agnostic
category: architecture
applies_to: [backend, frontend, api, app]

tags:
  - types
  - domain-layer
  - interfaces
  - typescript
  - clean-architecture
  - type-safety

keywords:
  - domain types
  - interfaces
  - enums
  - type definitions
  - IData pattern
  - type safety

deprecated: false
experimental: false
production_ready: true
---

# Domain Types Pattern

> **Domain types are the contract of your slice**. They define the shape of data flowing through your application. All interfaces MUST start with "I" prefix and live in the `domain/` layer.

---

## Overview

Types define the **data contracts** used throughout your slice:

```
┌──────────────────────────────────────────────────────────────┐
│  CONTROLLER (Presentation Layer)                              │
│  - Uses DTOs for input/output                                 │
│  - DTOs implement domain interfaces                           │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               v
┌──────────────────────────────────────────────────────────────┐
│  SERVICE (Domain Layer)                                       │
│  - Works with domain types (IUserData, ICreateUserData)       │
│  - Returns domain types                                       │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               v
┌──────────────────────────────────────────────────────────────┐
│  GATEWAY (Data Layer)                                         │
│  - Accepts domain types                                       │
│  - Returns domain types                                       │
│  - Mapper converts DB types ↔ domain types                    │
└──────────────────────────────────────────────────────────────┘

                    TYPES FILE
┌──────────────────────────────────────────────────────────────┐
│  domain/{entity}.types.ts          ← SINGLE SOURCE OF TRUTH   │
│  - IUserData (base entity)                                    │
│  - ICreateUserData (creation input)                           │
│  - IUpdateUserData (update input)                             │
│  - Enums (UserStatus, UserRole)                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Critical Rules

### 1. ALL Interfaces Start with "I" Prefix

```typescript
// CORRECT
interface IUserData { ... }
interface ICreateUserData { ... }
interface IUserGateway { ... }

// WRONG
interface UserData { ... }      // Missing "I" prefix
interface User { ... }          // Missing "I" prefix
type UserData = { ... }         // Use interface, not type alias
```

### 2. Types Live in `domain/` Layer

```typescript
// CORRECT - domain layer
slices/user/domain/user.types.ts

// WRONG - other locations
slices/user/types/user.types.ts    // Wrong folder
slices/user/user.types.ts          // Not in domain/
slices/user/data/user.types.ts     // Data layer is for implementations
```

### 3. Use Enums Instead of String Literals

```typescript
// CORRECT - Use enum with "Types" suffix
export enum UserStatusTypes {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}

interface IUserData {
  status: UserStatusTypes;
}

// WRONG - String literal union
interface IUserData {
  status: 'active' | 'inactive' | 'pending';  // Use enum instead
}

// WRONG - Missing "Types" suffix
export enum UserStatus {  // Should be UserStatusTypes
  Active = 'active',
}
```

### 4. Base Interface Named `I{Entity}Data`

```typescript
// CORRECT - Standard naming
interface IUserData { ... }      // Base entity data
interface ITaskData { ... }
interface IOrderData { ... }

// WRONG - Inconsistent naming
interface IUser { ... }          // Missing "Data" suffix
interface UserDataType { ... }   // Missing "I" prefix
```

---

## File Location & Naming

```
slices/user/
├── user.controller.ts
├── user.module.ts
├── domain/
│   ├── user.types.ts          # All domain types HERE
│   ├── user.service.ts
│   ├── user.gateway.ts        # Gateway interface
│   └── index.ts               # Exports types
├── data/
│   └── user.gateway.ts        # Gateway implementation
└── dtos/
    ├── createUser.dto.ts      # DTOs implement domain interfaces
    └── userResponse.dto.ts
```

**Naming Convention:**
- File: `{entity}.types.ts` (SINGULAR)
- Location: `domain/` folder
- Interfaces: `I{Entity}Data`, `ICreate{Entity}Data`, `IUpdate{Entity}Data`

---

## Complete Types File Example

```typescript
export enum UserStatusTypes {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
  Suspended = 'suspended',
}

export enum UserRoleTypes {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}

export enum SortOrderTypes {
  Asc = 'asc',
  Desc = 'desc',
}

/** User data - base entity interface */
export interface IUserData {
  id: string;
  email: string;
  name: string;
  status: UserStatusTypes;
  role: UserRoleTypes;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/** Data required to create a new user - omits auto-generated fields */
export interface ICreateUserData {
  email: string;
  name: string;
  password: string;
  role?: UserRoleTypes;
  avatarUrl?: string;
}

/** Data for updating an existing user - all fields optional */
export interface IUpdateUserData {
  email?: string;
  name?: string;
  password?: string;
  status?: UserStatusTypes;
  role?: UserRoleTypes;
  avatarUrl?: string;
}

/** Pagination query parameters */
export interface IPaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: keyof IUserData;
  sortOrder?: SortOrderTypes;
}

/** User filter options */
export interface IUserFilter {
  status?: UserStatusTypes;
  role?: UserRoleTypes;
  createdAfter?: Date;
  createdBefore?: Date;
}

/** Combined query for user listing */
export interface IUserQuery extends IPaginationQuery {
  filter?: IUserFilter;
}

/** Paginated result wrapper */
export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLastPage: boolean;
}

/** User with related data (for detailed views) */
export interface IUserWithDetails extends IUserData {
  taskCount: number;
  teamCount: number;
  permissions: string[];
}

/** User ID type for clarity */
export type UserId = string;

/** Fields that can be used for sorting users */
export type UserSortField = keyof Pick<
  IUserData,
  'name' | 'email' | 'createdAt' | 'updatedAt' | 'lastLoginAt'
>;
```

---

## Enums Best Practices

```typescript
// CORRECT - String values + "Types" suffix
export enum UserStatusTypes {
  Active = 'active',
  Inactive = 'inactive',
}

// WRONG - Numeric values (not human-readable)
export enum UserStatusTypes {
  Active,    // 0
  Inactive,  // 1
}

// WRONG - Missing "Types" suffix
export enum UserStatus {  // Should be UserStatusTypes
  Active = 'active',
}
```

---

## Relationship with Other Layers

**DTOs implement domain interfaces:**

```typescript
// dtos/createUser.dto.ts
export class CreateUserDto implements ICreateUserData {
  @IsEmail() email: string;
  @IsString() name: string;
}
```

**Gateway uses domain types:**

```typescript
// domain/user.gateway.ts
export interface IUserGateway {
  create(data: ICreateUserData): Promise<IUserData>;
  findById(id: string): Promise<IUserData | null>;
}
```

**Service returns domain types:**

```typescript
// domain/user.service.ts
async createUser(data: ICreateUserData): Promise<IUserData> {
  return this.userGateway.create(data);
}
```

**Mapper converts to domain types:**

```typescript
// data/user.mapper.ts
toDomain(prismaUser: PrismaUser): IUserData {
  return { id: prismaUser.id, email: prismaUser.email, ... };
}
```

---

## Type Naming Conventions

| Type | Naming Pattern | Example |
|------|---------------|---------|
| Base entity | `I{Entity}Data` | `IUserData` |
| Create input | `ICreate{Entity}Data` | `ICreateUserData` |
| Update input | `IUpdate{Entity}Data` | `IUpdateUserData` |
| Request params | `I{Action}Request` | `ILoginRequest` |
| Query params | `I{Entity}Query` | `IUserQuery` |
| Filter params | `I{Entity}Filter` | `IUserFilter` |
| Pagination | `IPaginationQuery` | (shared) |
| Paginated result | `IPaginatedResult<T>` | (generic) |
| Extended entity | `I{Entity}With{Extra}` | `IUserWithDetails` |
| Gateway interface | `I{Entity}Gateway` | `IUserGateway` |
| Enum | `{Entity}{Concept}Types` | `UserStatusTypes`, `UserRoleTypes` |

---

## Checklist

### Type File Requirements

- [ ] File located in `domain/` folder
- [ ] Named `{entity}.types.ts` (SINGULAR)
- [ ] TSDoc on all interfaces and enums

### Interface Naming

- [ ] ALL interfaces start with "I" prefix
- [ ] Base entity: `I{Entity}Data`
- [ ] Create input: `ICreate{Entity}Data`
- [ ] Update input: `IUpdate{Entity}Data`
- [ ] Query params: `I{Entity}Query`

### Enums

- [ ] Use string values (not numeric)
- [ ] Always suffix with "Types": `UserStatusTypes`
- [ ] PascalCase enum name: `UserStatusTypes`
- [ ] PascalCase enum values: `Active`, `Inactive`
- [ ] Located at TOP of types file

### Organization

- [ ] Enums first
- [ ] Base entity interface second
- [ ] Input interfaces third
- [ ] Query interfaces fourth
- [ ] Result interfaces last

### Never Do

- [ ] NO interfaces without "I" prefix
- [ ] NO type aliases for entities (use interfaces)
- [ ] NO types in `data/` layer (except internal mapper types)
- [ ] NO string literal unions (use enums)
- [ ] NO types defined inline in services/controllers

---

## Related Documentation

- [Service Pattern](./service.md) - Services use domain types
- [Gateway Pattern](./gateway-pattern/README.md) - Gateways implement type contracts
- [Mapper Pattern](./mapper.md) - Mappers convert to domain types
- [Controller Pattern](./controller.md) - Controllers use DTOs based on types
- [Layers Pattern](./layers.md) - Type flow through layers

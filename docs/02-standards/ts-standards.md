---
id: typescript-standards
title: TypeScript Standards
version: 1.0.0
last_updated: 2025-12-20

pattern: standards
complexity: fundamental
framework: agnostic
category: standards
applies_to: [backend, frontend, api, app]

tags:
  - typescript
  - standards
  - naming-conventions
  - types
  - interfaces
  - enums
  - best-practices

keywords:
  - typescript standards
  - naming conventions
  - interface naming
  - enum naming
  - no any
  - type safety
  - code standards

deprecated: false
experimental: false
production_ready: true
---

# TypeScript Standards

> **Strict TypeScript standards ensure type safety, consistency, and maintainability**. These rules apply to all TypeScript code in both API (NestJS) and App (Nuxt) projects. The primary rules: always use types, never use `any`, prefix interfaces with `I`.

---

## Critical Rules Summary

| Rule | Correct | Incorrect |
|------|---------|-----------|
| Interface prefix | `IUserData` | `UserData` |
| Enum suffix | `UserStatusTypes` | `UserStatus` |
| No `any` | `unknown`, proper type | `any` |
| Explicit return types | `function(): string` | `function()` (inferred) |
| Optional vs undefined | `name?: string` | `name: string \| undefined` |

---

## 1. Never Use `any`

Always use proper types. The `any` type disables type checking.

```typescript
// WRONG
function processData(data: any) { return data.name; }

// CORRECT - Use unknown + type guard
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'name' in data) {
    return (data as { name: string }).name;
  }
  throw new Error('Invalid data');
}

// CORRECT - Use proper interface
function processData(data: IUserData) { return data.name; }

// CORRECT - Use generic
function processData<T extends { name: string }>(data: T) { return data.name; }
```

### When You Think You Need `any`

| Situation | Use Instead |
|-----------|-------------|
| Unknown API response | `unknown` + type guard |
| Dynamic object keys | `Record<string, T>` |
| Multiple possible types | Union type `A \| B \| C` |
| Third-party library | Create type definition |
| Complex generic | Proper generic constraints |

---

## 2. Interface Naming: `I` Prefix

**ALL interfaces MUST start with `I` prefix.**

```typescript
// CORRECT
export interface IUserData {
  id: string;
  name: string;
}
export interface ICreateUserData {
  name: string;
  email: string;
}
export interface IUserGateway {
  getUser(id: string): Promise<IUserData>;
}

// WRONG
export interface UserData { ... }
export interface CreateUserInput { ... }
```

### Interface Naming Patterns

| Type | Pattern | Example |
|------|---------|---------|
| Base entity | `I{Entity}Data` | `IUserData`, `ITeamData` |
| Create input | `ICreate{Entity}Data` | `ICreateUserData` |
| Update input | `IUpdate{Entity}Data` | `IUpdateUserData` |
| Filter/Query | `I{Entity}Filter` | `IUserFilter` |
| Request params | `I{Action}Request` | `ILoginRequest` |
| Response data | `I{Action}Response` | `ILoginResponse` |
| Gateway | `I{Entity}Gateway` | `IUserGateway` |
| Extended | `I{Entity}With{Extra}` | `IUserWithTeams` |

---

## 3. Enum Naming: `Types` Suffix

**ALL enums MUST end with `Types` suffix and use string values.**

```typescript
// CORRECT
export enum UserStatusTypes {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}
export enum RoleTypes {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}

// WRONG - Missing Types suffix
export enum UserStatus { Active = 'active' }

// WRONG - Numeric values
export enum UserStatusTypes { Active, Inactive }

// WRONG - SCREAMING_CASE values
export enum UserStatusTypes { ACTIVE = 'ACTIVE' }
```

### Enum Usage

```typescript
export interface IOrderData {
  id: string;
  status: OrderStatusTypes;
}

const order: IOrderData = {
  id: 'ord_123',
  status: OrderStatusTypes.Pending,
};
```

---

## 4. Type Aliases vs Interfaces

**Use interfaces for object shapes, type aliases for unions/utilities.**

```typescript
// USE INTERFACE for object shapes
export interface IUserData {
  id: string;
  name: string;
}

// USE TYPE for unions, utilities, function signatures
export type UserRole = 'admin' | 'user' | 'guest';
export type UserId = string;
export type Nullable<T> = T | null;
export type UserValidator = (user: IUserData) => boolean;
export type Readonly<T> = { readonly [K in keyof T]: T[K] };

// WRONG - Type alias for object (use interface)
export type UserData = { id: string; name: string };
```

---

## 5. Explicit Return Types

**Always declare return types for functions and methods.**

```typescript
// CORRECT
function getUser(id: string): IUserData {
  return { id, name: 'John' };
}
async function fetchUser(id: string): Promise<IUserData> {
  return await this.gateway.getUser(id);
}
const getUser = (id: string): IUserData => ({ id, name: 'John' });

// WRONG - Inferred return type
function getUser(id: string) { return { id, name: 'John' }; }
```

### Return Type Patterns

| Pattern | Example |
|---------|---------|
| Single value | `getUser(): IUserData` |
| Nullable | `findUser(): IUserData \| null` |
| Async | `fetchUser(): Promise<IUserData>` |
| Async nullable | `findUser(): Promise<IUserData \| null>` |
| Array | `getUsers(): IUserData[]` |
| Void | `deleteUser(): void` |
| Async void | `deleteUser(): Promise<void>` |
| Boolean | `isValid(): boolean` |

---

## 6. Optional Properties

**Use `?` for optional properties, not `| undefined`.**

```typescript
// CORRECT
export interface IUpdateUserData {
  name?: string;
  email?: string;
}
function greet(name: string, title?: string): string {
  return title ? `${title} ${name}` : name;
}
function greet(name: string, title: string = 'Mr.'): string {
  return `${title} ${name}`;
}

// WRONG
export interface IUpdateUserData {
  name: string | undefined;
}
```

---

## 7. Null vs Undefined

**Use `null` for intentional absence, `undefined` for unset values.**

```typescript
// null = intentionally empty (API response, cleared value)
export interface IUserData {
  avatarUrl: string | null;
}

// undefined = not provided (optional fields)
export interface IUpdateUserData {
  name?: string;
}

// Function returns
async function findUser(id: string): Promise<IUserData | null> {
  const user = await this.db.find(id);
  return user ?? null;
}
```

---

## 8. Const Assertions and Readonly

**Use `as const` for literal types and `readonly` for immutable data.**

```typescript
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

const ALLOWED_ROLES: readonly string[] = ['admin', 'user'] as const;

export interface IConfigData {
  readonly apiUrl: string;
  readonly timeout: number;
}

type ImmutableUser = Readonly<IUserData>;
```

---

## 9. Generic Constraints

**Use proper generic constraints for type safety.**

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

interface IBaseEntity {
  id: string;
  createdAt: Date;
}
function processEntity<T extends IBaseEntity>(entity: T): T {
  console.log(entity.id);
  return entity;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: { page: number; total: number };
}
```

---

## 10. Import/Export Standards

**Use named exports, avoid default exports.**

```typescript
// CORRECT - Named exports
export interface IUserData { ... }
export enum UserStatusTypes { ... }
export class UserService { ... }

// CORRECT - Named imports
import { IUserData, UserStatusTypes } from './user.types';

// AVOID - Default exports (harder to refactor)
export default class UserService { ... }

// EXCEPTION - Framework requirements
export default defineNuxtConfig({ ... });
```

### Import Organization

```typescript
// 1. Node.js built-ins / Framework
import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';

// 2. External packages
import { v4 as uuid } from 'uuid';

// 3. Slice aliases (#SLICE_NAME)
import { PrismaService } from '#prisma';
import { IUserData } from '#user/domain';

// 4. Relative imports (same slice only)
import { UserMapper } from './user.mapper';
```

### Slice Import Aliases (`#SLICE_NAME`)

**Always use `#` aliases for cross-slice imports. Never use relative paths across slice boundaries.**

```typescript
// CORRECT
import { PrismaService } from '#prisma';
import { IUserData } from '#user/domain';
import { useToast } from '#theme/components/ui/toast';

// WRONG - Relative path across slices
import { PrismaService } from '../../prisma/prisma.service';
import { IUserData } from '../../../user/domain/user.types';

// CORRECT - Relative path within same slice
import { UserMapper } from './user.mapper';
import { IUserData } from '../domain/user.types';
```

### Configuring Slice Aliases

**API (NestJS) - tsconfig.json:**

```json
{
  "compilerOptions": {
    "paths": {
      "#prisma": ["./src/slices/prisma"],
      "#core": ["./src/slices/core"],
      "#user/*": ["./src/slices/user/*"],
      "#team/*": ["./src/slices/user/team/*"],
      "#files/*": ["./src/slices/files/*"]
    }
  }
}
```

**App (Nuxt) - nuxt.config.ts per slice:**

```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  alias: { '#theme': currentDir },
});
```

### Common Slice Aliases

| Alias | Points To | Usage |
|-------|-----------|-------|
| `#prisma` | `slices/prisma` | Database service |
| `#core` | `slices/core` | Shared utilities, errors |
| `#user/domain` | `slices/user/*/domain` | User types |
| `#team/domain` | `slices/user/team/domain` | Team types |
| `#api` | `slices/setup/api` | API client (App) |
| `#theme` | `slices/setup/theme` | UI components (App) |
| `#error` | `slices/setup/error` | Error handling (App) |
| `#i18n` | `slices/setup/i18n` | Translations (App) |

### Why Use Slice Aliases?

1. **Explicit Dependencies** - Clear which slices depend on each other
2. **Refactoring Safety** - Move files without breaking imports
3. **Readability** - Immediately see cross-slice dependencies
4. **Enforce Boundaries** - Relative paths stay within slice

---

## 11. Async/Await Standards

**Always use async/await, never raw Promises.**

```typescript
// CORRECT
async function getUser(id: string): Promise<IUserData> {
  const user = await this.gateway.findById(id);
  if (!user) throw new UserNotFoundError(id);
  return user;
}

// CORRECT - Parallel operations
async function getUserWithTeam(userId: string): Promise<IUserWithTeam> {
  const [user, team] = await Promise.all([
    this.userGateway.findById(userId),
    this.teamGateway.findByUserId(userId),
  ]);
  return { ...user, team };
}

// WRONG - Raw promise chains
function getUser(id: string): Promise<IUserData> {
  return this.gateway.findById(id).then(user => {
    if (!user) throw new Error();
    return user;
  });
}
```

---

## 12. Error Handling Types

**Create typed errors with proper error codes.**

```typescript
export interface IErrorData {
  code: string;
  message: string;
  statusCode: number;
}

export const ErrorCodes = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_EXISTS: 'USER_EXISTS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(ErrorCodes.USER_NOT_FOUND, `User with ID '${userId}' not found`, 404);
  }
}
```

---

## 13. Class Property Standards

**Use proper access modifiers and readonly.**

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userGateway: IUserGateway,
    private readonly logger: LoggerService,
  ) {}

  private cache = new Map<string, IUserData>();

  async getUser(id: string): Promise<IUserData> {
    return await this.userGateway.findById(id);
  }

  private validateEmail(email: string): boolean {
    return email.includes('@');
  }
}

// WRONG
constructor(private userGateway: IUserGateway) {}  // Missing readonly
public cache = new Map();  // Should be private
```

---

## 14. Array and Object Types

```typescript
// Array types
const users: IUserData[] = [];
const ids: string[] = ['1', '2', '3'];
const ROLES: readonly string[] = ['admin', 'user'];

// Object with known keys
const config: Record<string, string> = { apiUrl: 'https://api.example.com' };

// Object with specific keys
type ConfigKeys = 'apiUrl' | 'timeout' | 'retries';
const config: Record<ConfigKeys, string> = { ... };

// Utility types
type PartialUser = Partial<IUserData>;
type RequiredUser = Required<IUserData>;
type PickedUser = Pick<IUserData, 'id' | 'name'>;
type OmittedUser = Omit<IUserData, 'createdAt' | 'updatedAt'>;
```

---

## 15. TSDoc Comments

**Document public interfaces, types, and functions.**

```typescript
/**
 * Represents a registered user in the system.
 */
export interface IUserData {
  /** Unique identifier (prefixed with 'usr_') */
  id: string;
  /** User's display name */
  name: string;
  /** User's email address - must be unique */
  email: string;
}

/**
 * Creates a new user in the system.
 * @param data - User creation data
 * @returns The created user with generated ID
 * @throws {UserExistsError} If email is already registered
 */
async function createUser(data: ICreateUserData): Promise<IUserData> {
  // ...
}
```

---

## Checklist

### Type Safety

- [ ] No `any` types in codebase
- [ ] All functions have explicit return types
- [ ] All interfaces have `I` prefix
- [ ] All enums have `Types` suffix
- [ ] Use `unknown` instead of `any` for unknown types

### Naming Conventions

- [ ] Interfaces: `I{Name}` (e.g., `IUserData`)
- [ ] Enums: `{Name}Types` (e.g., `UserStatusTypes`)
- [ ] Types: PascalCase (e.g., `UserId`)
- [ ] Constants: SCREAMING_CASE or camelCase
- [ ] Functions/methods: camelCase

### Best Practices

- [ ] Use named exports (not default)
- [ ] Use async/await (not .then())
- [ ] Use `readonly` for injected dependencies
- [ ] Use `private` for internal methods
- [ ] Use optional `?` not `| undefined`

### Organization

- [ ] Types in `domain/{entity}.types.ts`
- [ ] Enums at top of types file
- [ ] Imports organized (built-in > external > aliases > relative)
- [ ] TSDoc on public APIs

### Slice Imports

- [ ] Use `#SLICE_NAME` for cross-slice imports
- [ ] Use relative paths only within same slice
- [ ] Configure aliases in tsconfig.json (API) or nuxt.config.ts (App)
- [ ] Never use `../../../` to cross slice boundaries

### Never Do

- [ ] NO `any` type
- [ ] NO default exports (except framework requirements)
- [ ] NO implicit return types
- [ ] NO interfaces without `I` prefix
- [ ] NO enums without `Types` suffix
- [ ] NO raw Promise chains (use async/await)
- [ ] NO relative imports across slice boundaries

---

## Related Documentation

- [Types Pattern](../03-patterns/types.md) - Domain types organization
- [Service Pattern](../03-patterns/service.md) - Service type usage
- [Gateway Pattern](../03-patterns/gateway.md) - Gateway interfaces
- [DTO Pattern](../03-patterns/dto.md) - DTOs implementing interfaces

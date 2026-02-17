---
id: service-pattern
title: Service Pattern
version: 1.0.0
last_updated: 2025-12-16

pattern: service
complexity: fundamental
framework: nestjs
category: architecture
applies_to: [backend, api]

tags:
  - service
  - domain-layer
  - business-logic
  - clean-architecture
  - dependency-injection

keywords:
  - service pattern
  - domain service
  - business logic
  - gateway interface
  - dependency inversion
  - error handling

deprecated: false
experimental: false
production_ready: true
---

# Service Pattern

> **Services are the heart of your business logic**. They orchestrate operations, enforce business rules, and coordinate between the presentation layer (controllers) and the data layer (gateways). Services ONLY depend on gateway interfaces, never implementations.

---

## Overview

Services live in the **domain layer** and contain all business logic:

```
┌──────────────────────────────────────────────────────────────┐
│  CONTROLLER (Presentation Layer)                              │
│  - Receives HTTP request                                      │
│  - Calls SERVICE                                              │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               v
┌──────────────────────────────────────────────────────────────┐
│  SERVICE (Domain Layer)                    ← YOU ARE HERE     │
│  - Business logic                                             │
│  - Validation rules                                           │
│  - Error handling                                             │
│  - Orchestration                                              │
│  - Depends on INTERFACE (IUserGateway)                        │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               v
┌──────────────────────────────────────────────────────────────┐
│  GATEWAY (Data Layer)                                         │
│  - Data access                                                │
│  - External API calls                                         │
│  - Implements interface                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Critical Rules

### 1. Services Depend on Gateway INTERFACES

```typescript
// CORRECT
@Injectable()
export class UserService {
  constructor(
    @Inject('IUserGateway')
    private readonly userGateway: IUserGateway
  ) {}
}

// WRONG - depends on implementation
@Injectable()
export class UserService {
  constructor(
    private readonly userGateway: UserGateway  // NEVER
  ) {}
}
```

### 2. Services Return Domain Types (Not DTOs)

```typescript
// CORRECT
async getUser(id: string): Promise<IUserData> {
  return this.userGateway.findById(id);
}

// WRONG - controller's responsibility
async getUser(id: string): Promise<UserResponseDto> {
  const user = await this.userGateway.findById(id);
  return new UserResponseDto(user);
}
```

### 3. Services Do NOT Return Wrapper Objects

```typescript
// WRONG - interceptor does this
async createUser(data: ICreateUserData) {
  const user = await this.userGateway.create(data);
  return { success: true, data: user };
}

// CORRECT
async createUser(data: ICreateUserData): Promise<IUserData> {
  return this.userGateway.create(data);
}
```

### 4. Business Logic Lives in Services

```typescript
async createUser(data: ICreateUserData): Promise<IUserData> {
  const normalizedData = {
    ...data,
    email: data.email.toLowerCase().trim(),
    name: data.name.trim(),
  };

  const existingUser = await this.userGateway.findByEmail(normalizedData.email);
  if (existingUser) {
    throw new UserAlreadyExistsError(normalizedData.email);
  }

  return this.userGateway.create(normalizedData);
}
```

---

## File Location & Naming

```
slices/user/
├── user.controller.ts
├── user.module.ts
├── domain/
│   ├── user.service.ts        # Service lives here
│   ├── user.gateway.ts        # Gateway interface
│   ├── user.types.ts          # Domain types
│   └── errors/
│       └── userNotFound.error.ts
├── data/
│   └── user.gateway.ts        # Gateway implementation
└── dtos/
```

**Naming Convention:**
- File: `{entity}.service.ts` (SINGULAR)
- Class: `{Entity}Service` (SINGULAR)
- Location: `domain/` folder

---

## Complete Service Example

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { IUserGateway } from './user.gateway';
import {
  IUserData,
  ICreateUserData,
  IUpdateUserData,
  IPaginationQuery,
  IPaginatedResult,
} from './user.types';
import { UserNotFoundError } from './errors/userNotFound.error';
import { UserAlreadyExistsError } from './errors/userAlreadyExists.error';
import { InvalidUserDataError } from './errors/invalidUserData.error';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserGateway')
    private readonly userGateway: IUserGateway
  ) {}

  // PUBLIC METHODS

  async createUser(data: ICreateUserData): Promise<IUserData> {
    this.validateUserData(data);
    const normalizedData = this.normalizeUserData(data);

    const existingUser = await this.userGateway.findByEmail(normalizedData.email);
    if (existingUser) {
      throw new UserAlreadyExistsError(normalizedData.email);
    }

    return this.userGateway.create(normalizedData);
  }

  /** @throws {UserNotFoundError} If user doesn't exist */
  async getUserById(id: string): Promise<IUserData> {
    const user = await this.userGateway.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<IUserData | null> {
    return this.userGateway.findByEmail(email.toLowerCase().trim());
  }

  async getUsers(query: IPaginationQuery): Promise<IPaginatedResult<IUserData>> {
    const normalizedQuery = {
      page: query.page || 1,
      limit: Math.min(query.limit || 10, 100),
      search: query.search?.trim(),
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };
    return this.userGateway.findAll(normalizedQuery);
  }

  /**
   * @throws {UserNotFoundError} If user doesn't exist
   * @throws {UserAlreadyExistsError} If new email is already taken
   */
  async updateUser(id: string, data: IUpdateUserData): Promise<IUserData> {
    await this.getUserById(id);

    if (data.email) {
      const normalizedEmail = data.email.toLowerCase().trim();
      const existingUser = await this.userGateway.findByEmail(normalizedEmail);
      if (existingUser && existingUser.id !== id) {
        throw new UserAlreadyExistsError(normalizedEmail);
      }
      data.email = normalizedEmail;
    }

    if (data.name) {
      data.name = data.name.trim();
    }

    return this.userGateway.update(id, data);
  }

  /** @throws {UserNotFoundError} If user doesn't exist */
  async deleteUser(id: string): Promise<void> {
    await this.getUserById(id);
    return this.userGateway.delete(id);
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    const existingUser = await this.userGateway.findByEmail(email.toLowerCase().trim());
    return !existingUser;
  }

  // PRIVATE METHODS

  private validateUserData(data: ICreateUserData): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new InvalidUserDataError('Invalid email address');
    }
    if (!data.name || data.name.trim().length < 2) {
      throw new InvalidUserDataError('Name must be at least 2 characters');
    }
  }

  private normalizeUserData(data: ICreateUserData): ICreateUserData {
    return {
      ...data,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

---

## Service Patterns

### Simple Pass-Through

When no business logic is needed:

```typescript
@Injectable()
export class ConfigService {
  constructor(
    @Inject('IConfigGateway')
    private readonly configGateway: IConfigGateway
  ) {}

  async getConfig(): Promise<IConfigData> {
    return this.configGateway.getConfig();
  }
}
```

### With Multiple Gateways

```typescript
@Injectable()
export class CheckoutService {
  constructor(
    @Inject('IOrderGateway') private readonly orderGateway: IOrderGateway,
    @Inject('IPaymentGateway') private readonly paymentGateway: IPaymentGateway,
    @Inject('INotificationGateway') private readonly notificationGateway: INotificationGateway,
  ) {}

  async checkout(data: ICheckoutData): Promise<IOrderData> {
    const order = await this.orderGateway.create(data.order);

    await this.paymentGateway.processPayment({
      orderId: order.id,
      amount: order.total,
      method: data.paymentMethod,
    });

    await this.notificationGateway.sendOrderConfirmation(order);
    return order;
  }
}
```

---

## Error Handling

### Creating Domain Errors

```typescript
// domain/errors/userNotFound.error.ts
import { BaseError, ErrorCodes } from '#setup/error';

export class UserNotFoundError extends BaseError {
  constructor(userId: string) {
    super(`User with ID '${userId}' not found`, 404);
    this.code = ErrorCodes.NOT_FOUND;
  }
}

export class UserAlreadyExistsError extends BaseError {
  constructor(email: string) {
    super(`User with email '${email}' already exists`, 409);
    this.code = ErrorCodes.CONFLICT;
  }
}

export class InvalidUserDataError extends BaseError {
  constructor(reason: string) {
    super(`Invalid user data: ${reason}`, 400);
    this.code = ErrorCodes.VALIDATION_ERROR;
  }
}
```

### Error Handling Patterns

```typescript
// Let errors propagate (most common)
async getUser(id: string): Promise<IUserData> {
  const user = await this.userGateway.findById(id);
  if (!user) {
    throw new UserNotFoundError(id);
  }
  return user;
}

// Catch and re-throw with context
async createUser(data: ICreateUserData): Promise<IUserData> {
  try {
    return await this.userGateway.create(data);
  } catch (error) {
    if (error.code === 'UNIQUE_VIOLATION') {
      throw new UserAlreadyExistsError(data.email);
    }
    throw error;
  }
}

// Wrap external errors
async syncWithExternalSystem(userId: string): Promise<void> {
  try {
    await this.externalGateway.sync(userId);
  } catch (error) {
    throw new SyncFailedError(`Failed to sync user ${userId}`, { cause: error });
  }
}
```

---

## Gateway Interface Definition

Services depend on gateway interfaces defined in the same `domain/` folder:

```typescript
// domain/user.gateway.ts
import {
  IUserData,
  ICreateUserData,
  IUpdateUserData,
  IPaginationQuery,
  IPaginatedResult,
} from './user.types';

export interface IUserGateway {
  findById(id: string): Promise<IUserData | null>;
  findByEmail(email: string): Promise<IUserData | null>;
  findAll(query: IPaginationQuery): Promise<IPaginatedResult<IUserData>>;
  create(data: ICreateUserData): Promise<IUserData>;
  update(id: string, data: IUpdateUserData): Promise<IUserData>;
  delete(id: string): Promise<void>;
}

export const IUserGateway = Symbol('IUserGateway');
```

---

## Module Wiring

```typescript
// user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './domain/user.service';
import { UserGateway } from './data/user.gateway';
import { IUserGateway } from './domain/user.gateway';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: 'IUserGateway',
      useClass: UserGateway,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
```

Using a Symbol as token:

```typescript
// domain/user.gateway.ts
export const IUserGateway = Symbol('IUserGateway');

// domain/user.service.ts
@Inject(IUserGateway)
private readonly userGateway: IUserGateway

// user.module.ts
{ provide: IUserGateway, useClass: UserGateway }
```

---

## Method Organization

```typescript
@Injectable()
export class UserService {
  constructor(...) {}

  // 1. PUBLIC methods first (alphabetical or by importance)
  async createUser(...) {}
  async deleteUser(...) {}
  async getUserById(...) {}
  async getUsers(...) {}
  async updateUser(...) {}

  // 2. PRIVATE methods last
  private normalizeUserData(...) {}
  private validateUserData(...) {}
}
```

---

## Checklist

### Service Requirements

- [ ] File located in `domain/` folder
- [ ] `@Injectable()` decorator on class
- [ ] Constructor injects gateway INTERFACES (not implementations)
- [ ] Uses `@Inject('IXxxGateway')` for dependency injection

### Methods

- [ ] Public methods return domain types (not DTOs)
- [ ] Public methods listed BEFORE private methods
- [ ] No `{ success: true }` wrappers in return values
- [ ] `@throws` documented for methods that throw domain errors

### Business Logic

- [ ] All validation logic in service (not controller or gateway)
- [ ] All data normalization in service
- [ ] Business rules enforced in service
- [ ] Proper error handling with domain errors

### Never Do

- [ ] NO direct gateway implementation imports
- [ ] NO DTO returns (controller's responsibility)
- [ ] NO HTTP-specific logic (status codes, headers)
- [ ] NO database-specific logic (SQL, Prisma queries)
- [ ] NO response wrapping (interceptor's job)

---

## Related Documentation

- [Controller Pattern](./controller.md) - Presentation layer
- [Gateway Pattern](./gateway-pattern/README.md) - Data access abstraction
- [Layers Pattern](./layers.md) - Clean Architecture layers
- [Types Pattern](./types.md) - Domain types
- [Setup Slice - Error](./setup-slice/README.md) - Error handling

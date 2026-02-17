---
id: app-di-setup
title: Frontend Dependency Injection with InversifyJS
version: 1.0.0
last_updated: 2025-12-16

category: setup
complexity: intermediate
framework: nuxt
applies_to: [frontend, app]

tags:
  - dependency-injection
  - inversify
  - di-container
  - frontend
  - nuxt
  - vue

keywords:
  - inversifyjs
  - container
  - inject
  - gateway pattern
  - testability
  - mocking

deprecated: false
experimental: false
production_ready: true
---

# Frontend Dependency Injection with InversifyJS

> **Purpose**: Set up dependency injection in your Nuxt/Vue frontend app using InversifyJS for clean architecture, testability, and swappable implementations.

---

## Why DI in Frontend?

1. **Testability** - Mock gateways/services in unit tests
2. **Swappable Implementations** - Switch between real API, mock data, or offline mode
3. **Clean Architecture** - Domain layer doesn't know about HTTP/fetch
4. **Separation of Concerns** - Business logic isolated from data fetching

---

## Installation

```bash
pnpm add inversify reflect-metadata
```

**Required TypeScript configuration** (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  }
}
```

---

## Project Structure

The DI system lives in `setup/di` subslice, registered via `plugins/di.ts` in each slice:

```
app/src/slices/
├── setup/
│   └── di/
│       ├── container.ts          # Main DI container
│       ├── types.ts              # Injection tokens (Symbols)
│       ├── index.ts              # Public exports
│       └── plugins/
│           └── di.ts             # Nuxt plugin for setup slice
│
├── user/                         # Feature slice
│   ├── domain/
│   │   ├── user.gateway.ts       # Gateway interface (contract)
│   │   ├── user.service.ts       # Business logic
│   │   └── user.types.ts         # Domain types
│   ├── data/
│   │   ├── user.gateway.ts       # API implementation
│   │   └── mock.gateway.ts       # Mock implementation
│   ├── plugins/
│   │   └── di.ts                 # Slice DI registration
│   └── composables/
│       └── useUser.ts            # Vue composable using DI
│
└── task/                         # Another feature slice
    ├── domain/ ...
    ├── data/ ...
    └── plugins/
        └── di.ts                 # Task slice DI registration
```

---

## Step 1: Create the Setup/DI Subslice

### 1.1 Injection Tokens

```typescript
// slices/setup/di/types.ts

export const TYPES = {
  // Core Infrastructure
  ApiClient: Symbol.for('ApiClient'),
  Logger: Symbol.for('Logger'),
  Config: Symbol.for('Config'),

  // User Slice
  UserGateway: Symbol.for('IUserGateway'),
  UserService: Symbol.for('UserService'),

  // Task Slice
  TaskGateway: Symbol.for('ITaskGateway'),
  TaskService: Symbol.for('TaskService'),

  // Auth Slice
  AuthGateway: Symbol.for('IAuthGateway'),
  AuthService: Symbol.for('AuthService'),
} as const;

export type TYPES = typeof TYPES;
```

### 1.2 DI Container

```typescript
// slices/setup/di/container.ts

import 'reflect-metadata';
import { Container } from 'inversify';

class DIContainer {
  private static instance: Container | null = null;

  static getInstance(): Container {
    if (!DIContainer.instance) {
      DIContainer.instance = new Container({
        defaultScope: 'Singleton',
        autoBindInjectable: true,
      });
    }
    return DIContainer.instance;
  }

  static reset(): void {
    if (DIContainer.instance) {
      DIContainer.instance.unbindAll();
      DIContainer.instance = null;
    }
  }

  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  static useMocks(): boolean {
    return process.env.NUXT_PUBLIC_USE_MOCKS === 'true';
  }
}

export const container = DIContainer.getInstance();
export { DIContainer };
```

### 1.3 Public Exports

```typescript
// slices/setup/di/index.ts

export { container, DIContainer } from './container';
export { TYPES } from './types';
```

### 1.4 Setup Slice DI Plugin

```typescript
// slices/setup/di/plugins/di.ts

import { container } from '../container';

export function registerSetupDI(): void {
  // Register core infrastructure: Logger, Config, ApiClient
  console.log('[DI] Setup slice registered');
}

export default defineNuxtPlugin(() => {
  registerSetupDI();

  return {
    provide: { container },
  };
});
```

---

## Step 2: Create Feature Slice with DI

### 2.1 Gateway Interface (Domain Layer)

```typescript
// slices/user/domain/user.gateway.ts

import type { IUserData, ICreateUserData, IUpdateUserData } from './user.types';

export interface IUserGateway {
  findAll(): Promise<IUserData[]>;
  findById(id: string): Promise<IUserData | null>;
  create(data: ICreateUserData): Promise<IUserData>;
  update(id: string, data: IUpdateUserData): Promise<IUserData>;
  delete(id: string): Promise<void>;
}
```

### 2.2 Domain Types

```typescript
// slices/user/domain/user.types.ts

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

export interface IUpdateUserData {
  email?: string;
  name?: string;
}
```

### 2.3 Gateway Implementations (Data Layer)

#### Real API Gateway

```typescript
// slices/user/data/user.gateway.ts

import { injectable } from 'inversify';
import type { IUserGateway } from '../domain/user.gateway';
import type { IUserData, ICreateUserData, IUpdateUserData } from '../domain/user.types';

@injectable()
export class UserGateway implements IUserGateway {
  private readonly baseUrl = '/api/users';

  async findAll(): Promise<IUserData[]> {
    return await $fetch<IUserData[]>(this.baseUrl);
  }

  async findById(id: string): Promise<IUserData | null> {
    try {
      return await $fetch<IUserData>(`${this.baseUrl}/${id}`);
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  async create(data: ICreateUserData): Promise<IUserData> {
    return await $fetch<IUserData>(this.baseUrl, { method: 'POST', body: data });
  }

  async update(id: string, data: IUpdateUserData): Promise<IUserData> {
    return await $fetch<IUserData>(`${this.baseUrl}/${id}`, { method: 'PATCH', body: data });
  }

  async delete(id: string): Promise<void> {
    await $fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' });
  }
}
```

#### Mock Gateway

```typescript
// slices/user/data/mock.gateway.ts

import { injectable } from 'inversify';
import type { IUserGateway } from '../domain/user.gateway';
import type { IUserData, ICreateUserData, IUpdateUserData } from '../domain/user.types';

@injectable()
export class MockUserGateway implements IUserGateway {
  private users: IUserData[] = [
    { id: '1', email: 'john@example.com', name: 'John Doe', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
    { id: '2', email: 'jane@example.com', name: 'Jane Smith', createdAt: new Date('2024-01-02'), updatedAt: new Date('2024-01-02') },
  ];

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async findAll(): Promise<IUserData[]> {
    await this.delay(200);
    return [...this.users];
  }

  async findById(id: string): Promise<IUserData | null> {
    await this.delay(100);
    return this.users.find(u => u.id === id) || null;
  }

  async create(data: ICreateUserData): Promise<IUserData> {
    await this.delay(300);
    const newUser: IUserData = { id: String(Date.now()), ...data, createdAt: new Date(), updatedAt: new Date() };
    this.users.push(newUser);
    return newUser;
  }

  async update(id: string, data: IUpdateUserData): Promise<IUserData> {
    await this.delay(200);
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    this.users[index] = { ...this.users[index], ...data, updatedAt: new Date() };
    return this.users[index];
  }

  async delete(id: string): Promise<void> {
    await this.delay(200);
    this.users = this.users.filter(u => u.id !== id);
  }
}
```

### 2.4 Domain Service

```typescript
// slices/user/domain/user.service.ts

import { injectable, inject } from 'inversify';
import { TYPES } from '#setup/di';
import type { IUserGateway } from './user.gateway';
import type { IUserData, ICreateUserData, IUpdateUserData } from './user.types';

@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserGateway) private readonly userGateway: IUserGateway
  ) {}

  async getUsers(): Promise<IUserData[]> {
    return this.userGateway.findAll();
  }

  async getUserById(id: string): Promise<IUserData> {
    const user = await this.userGateway.findById(id);
    if (!user) throw new Error(`User with ID ${id} not found`);
    return user;
  }

  async createUser(data: ICreateUserData): Promise<IUserData> {
    const normalizedData = {
      ...data,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
    };
    return this.userGateway.create(normalizedData);
  }

  async updateUser(id: string, data: IUpdateUserData): Promise<IUserData> {
    await this.getUserById(id);
    return this.userGateway.update(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    await this.getUserById(id);
    return this.userGateway.delete(id);
  }
}
```

### 2.5 Slice DI Plugin

**Key file that registers the slice's dependencies:**

```typescript
// slices/user/plugins/di.ts

import { container, TYPES } from '#setup/di';
import { UserService } from '../domain/user.service';
import type { IUserGateway } from '../domain/user.gateway';
import { UserGateway } from '../data/user.gateway';
import { MockUserGateway } from '../data/mock.gateway';

export function registerUserDI(useMocks: boolean = false): void {
  if (container.isBound(TYPES.UserGateway)) return;

  container
    .bind<IUserGateway>(TYPES.UserGateway)
    .to(useMocks ? MockUserGateway : UserGateway)
    .inSingletonScope();

  container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();

  console.log(`[DI] User slice registered (mocks: ${useMocks})`);
}
```

---

## Step 3: Wire Up All Slices

```typescript
// plugins/di.client.ts

import { container } from '#setup/di';
import { registerUserDI } from '~/slices/user/plugins/di';
// import { registerTaskDI } from '~/slices/task/plugins/di';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const useMocks = config.public.useMocks === 'true';

  registerUserDI(useMocks);
  // registerTaskDI(useMocks);

  console.log('[DI] All slices registered');

  return {
    provide: { container },
  };
});
```

---

## Step 4: Create Composables Using DI

```typescript
// slices/user/composables/useUser.ts

import { ref, computed } from 'vue';
import { container, TYPES } from '#setup/di';
import type { UserService } from '../domain/user.service';
import type { IUserData, ICreateUserData, IUpdateUserData } from '../domain/user.types';

export function useUser() {
  const userService = container.get<UserService>(TYPES.UserService);

  const users = ref<IUserData[]>([]);
  const currentUser = ref<IUserData | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const userCount = computed(() => users.value.length);

  async function withLoading<T>(fn: () => Promise<T>): Promise<T | null> {
    loading.value = true;
    error.value = null;
    try {
      return await fn();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Operation failed');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUsers(): Promise<void> {
    await withLoading(async () => { users.value = await userService.getUsers(); });
  }

  async function fetchUserById(id: string): Promise<void> {
    await withLoading(async () => { currentUser.value = await userService.getUserById(id); });
  }

  async function createUser(data: ICreateUserData): Promise<IUserData | null> {
    return withLoading(async () => {
      const newUser = await userService.createUser(data);
      users.value.push(newUser);
      return newUser;
    });
  }

  async function updateUser(id: string, data: IUpdateUserData): Promise<IUserData | null> {
    return withLoading(async () => {
      const updated = await userService.updateUser(id, data);
      const index = users.value.findIndex(u => u.id === id);
      if (index !== -1) users.value[index] = updated;
      if (currentUser.value?.id === id) currentUser.value = updated;
      return updated;
    });
  }

  async function deleteUser(id: string): Promise<boolean> {
    const result = await withLoading(async () => {
      await userService.deleteUser(id);
      users.value = users.value.filter(u => u.id !== id);
      if (currentUser.value?.id === id) currentUser.value = null;
      return true;
    });
    return result ?? false;
  }

  return {
    users, currentUser, loading, error, userCount,
    fetchUsers, fetchUserById, createUser, updateUser, deleteUser,
    clearError: () => { error.value = null; },
  };
}
```

---

## Step 5: Use in Components

```vue
<!-- slices/user/components/UserList.vue -->

<script setup lang="ts">
import { useUser } from '../composables/useUser';

const { users, loading, error, userCount, fetchUsers, deleteUser, clearError } = useUser();

onMounted(() => fetchUsers());

async function handleDelete(id: string) {
  if (confirm('Are you sure?')) await deleteUser(id);
}
</script>

<template>
  <div class="user-list">
    <h2>Users ({{ userCount }})</h2>
    <div v-if="error" class="error">
      {{ error.message }}
      <button @click="clearError">Dismiss</button>
    </div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="users.length === 0">No users found.</div>
    <ul v-else>
      <li v-for="user in users" :key="user.id">
        {{ user.name }} ({{ user.email }})
        <button @click="handleDelete(user.id)">Delete</button>
      </li>
    </ul>
  </div>
</template>
```

---

## Configuration

### nuxt.config.ts

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      useMocks: process.env.NUXT_PUBLIC_USE_MOCKS || 'false',
    },
  },
  alias: {
    '#setup': './src/slices/setup',
    '#user': './src/slices/user',
    '#task': './src/slices/task',
  },
});
```

### Environment Files

```bash
# .env.development
NUXT_PUBLIC_USE_MOCKS=true

# .env.production
NUXT_PUBLIC_USE_MOCKS=false
```

---

## Testing with DI

```typescript
// slices/user/domain/user.service.spec.ts

import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '#setup/di';
import { UserService } from './user.service';
import type { IUserGateway } from './user.gateway';

describe('UserService', () => {
  let testContainer: Container;
  let userService: UserService;
  let mockGateway: jest.Mocked<IUserGateway>;

  beforeEach(() => {
    testContainer = new Container();
    mockGateway = { findAll: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    testContainer.bind<IUserGateway>(TYPES.UserGateway).toConstantValue(mockGateway);
    testContainer.bind<UserService>(TYPES.UserService).to(UserService);
    userService = testContainer.get<UserService>(TYPES.UserService);
  });

  afterEach(() => testContainer.unbindAll());

  it('should normalize email on create', async () => {
    mockGateway.create.mockResolvedValue({
      id: '1', email: 'john@example.com', name: 'John', createdAt: new Date(), updatedAt: new Date(),
    });

    await userService.createUser({ email: '  JOHN@EXAMPLE.COM  ', name: '  John  ' });

    expect(mockGateway.create).toHaveBeenCalledWith({ email: 'john@example.com', name: 'John' });
  });
});
```

---

## Summary: DI File Structure Per Slice

```
slices/{slice}/
├── domain/
│   ├── {slice}.gateway.ts      # Interface (contract)
│   ├── {slice}.service.ts      # Business logic with @injectable()
│   └── {slice}.types.ts        # Domain types
├── data/
│   ├── {slice}.gateway.ts      # Real implementation with @injectable()
│   └── mock.gateway.ts         # Mock implementation with @injectable()
├── plugins/
│   └── di.ts                   # Slice DI registration function
└── composables/
    └── use{Slice}.ts           # Gets service from container
```

---

## Checklist

- [ ] `reflect-metadata` imported at app entry
- [ ] TypeScript decorators enabled
- [ ] `TYPES` tokens defined in `setup/di/types.ts`
- [ ] Container created in `setup/di/container.ts`
- [ ] Each slice has `plugins/di.ts` with registration function
- [ ] All injectable classes have `@injectable()` decorator
- [ ] Dependencies use `@inject(TYPES.xxx)` decorator
- [ ] Main plugin (`plugins/di.client.ts`) registers all slices
- [ ] Composables get services via `container.get<T>(TYPES.xxx)`

---

## Related Documentation

- [Layers Pattern](../03-patterns/layers.md) - Clean Architecture layers
- [Gateway Pattern](../03-patterns/gateway-pattern/README.md) - Gateway abstraction
- [App Store Setup](./app-store.md) - State management with Pinia
- [New Project Setup](../00-quickstart/new-project.md) - Full project structure

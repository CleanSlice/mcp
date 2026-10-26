---
id: app-di-setup
title: Frontend Dependency Injection with InversifyJS
version: 2.0.0
last_updated: 2026-10-08

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

> **Purpose**: Add swappable implementations (mock, offline, alternate transport) or a unit-testable client-side service to a slice, without changing the Pinia store that consumes them.

---

## When DI Applies

The default data path has no DI: `Provider.vue` → Pinia store → generated SDK (`#api`). That is the shape of most slices and of the starter kit's `user` slice. See [App Store Setup](./app-store.md) and [Nuxt Standards §6](../02-standards/nuxtjs-standards.md).

Use DI when a slice needs one of:

1. **A swappable adapter** - mock gateway for development/tests, offline implementation, second transport
2. **A client-side domain service** - real business policy that must be unit-tested against a mocked gateway
3. **A setup-level capability** with several implementations (logger, storage)

```
Default (no DI)          With DI
---------------          -------
Provider.vue             Provider.vue
   |                        |
Pinia store                Pinia store
   |                        |
#api SDK                 IUserGateway (interface, domain/)
                            |
                   +--------+--------+
                   |                 |
             UserGateway       MockUserGateway
             (#api SDK)        (in-memory)
```

> **Do not add a gateway interface for symmetry.** One real implementation and no client-side policy means the SDK already is the typed contract; an interface over it that is never swapped is a second copy of the same shape.

---

## Installation

```bash
bun add inversify reflect-metadata
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

The DI system lives in the `setup/di` subslice; each slice that uses DI registers its bindings in `plugins/di.ts`:

```
app/slices/
├── setup/
│   └── di/
│       ├── container.ts          # Main DI container
│       ├── types.ts              # Injection tokens (Symbols)
│       ├── index.ts              # Public exports
│       ├── nuxt.config.ts        # #di alias, decorator support
│       └── plugins/
│           └── di.ts             # Nuxt plugin for setup slice
│
└── user/                         # Feature slice
    ├── domain/
    │   ├── user.gateway.ts       # Gateway interface (contract)
    │   ├── user.service.ts       # Optional: client-side policy
    │   └── user.types.ts         # Domain types
    ├── data/
    │   ├── user.gateway.ts       # Implementation over the #api SDK
    │   └── mock.gateway.ts       # Mock implementation
    ├── plugins/
    │   └── di.ts                 # Slice DI registration
    ├── stores/
    │   └── user.ts               # Resolves the gateway from the container
    └── components/
        └── userList/
            └── Provider.vue      # Calls the store
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
    return import.meta.env.DEV;
  }

  static useMocks(): boolean {
    return import.meta.env.VITE_USE_MOCKS === 'true';
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

### 1.4 Slice Config

```typescript
// slices/setup/di/nuxt.config.ts

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { Nitro } from 'nitropack';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  alias: {
    '#di': currentDir,
  },
  hooks: {
    'nitro:build:before': (nitro: Nitro) => {
      nitro.options.moduleSideEffects.push('reflect-metadata');
    },
  },
  vite: {
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
        },
      },
    },
  },
});
```

### 1.5 Setup Slice DI Plugin

```typescript
// slices/setup/di/plugins/di.ts

import { container } from '../container';

export function registerSetupDI(): void {
  // Register core infrastructure: Logger, Config, ApiClient
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
  createdAt: string; // SDK date-time fields are ISO strings
  updatedAt: string;
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

#### Real Gateway over the SDK

The only file in the slice that imports `#api`:

```typescript
// slices/user/data/user.gateway.ts

import { injectable } from 'inversify';
import { getUsers, getUser, createUser, updateUser, deleteUser, type UserDto } from '#api';
import type { IUserGateway } from '../domain/user.gateway';
import type { IUserData, ICreateUserData, IUpdateUserData } from '../domain/user.types';

function toDomain(dto: UserDto): IUserData {
  return { id: dto.id, email: dto.email, name: dto.name, createdAt: dto.createdAt, updatedAt: dto.updatedAt };
}

@injectable()
export class UserGateway implements IUserGateway {
  async findAll(): Promise<IUserData[]> {
    const { data } = await getUsers();
    return (data?.data ?? []).map(toDomain);
  }

  async findById(id: string): Promise<IUserData | null> {
    const { data } = await getUser({ path: { id } });
    return data ? toDomain(data) : null;
  }

  async create(input: ICreateUserData): Promise<IUserData> {
    const { data } = await createUser({ body: input });
    return toDomain(data!);
  }

  async update(id: string, input: IUpdateUserData): Promise<IUserData> {
    const { data } = await updateUser({ path: { id }, body: input });
    return toDomain(data!);
  }

  async delete(id: string): Promise<void> {
    await deleteUser({ path: { id } });
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
    { id: '1', email: 'john@example.com', name: 'John Doe', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
    { id: '2', email: 'jane@example.com', name: 'Jane Smith', createdAt: '2024-01-02T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
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
    const now = new Date().toISOString();
    const newUser: IUserData = { id: String(Date.now()), ...data, createdAt: now, updatedAt: now };
    this.users.push(newUser);
    return newUser;
  }

  async update(id: string, data: IUpdateUserData): Promise<IUserData> {
    await this.delay(200);
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    this.users[index] = { ...this.users[index], ...data, updatedAt: new Date().toISOString() };
    return this.users[index];
  }

  async delete(id: string): Promise<void> {
    await this.delay(200);
    this.users = this.users.filter(u => u.id !== id);
  }
}
```

### 2.4 Domain Service (Optional)

Only when the slice carries client-side policy (normalization, decisions that must not live in a component, logic to unit-test against a mocked gateway). A slice without such policy skips this file; the store calls the gateway directly.

```typescript
// slices/user/domain/user.service.ts

import { injectable, inject } from 'inversify';
import { TYPES } from '#di';
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

```typescript
// slices/user/plugins/di.ts

import { container, TYPES } from '#di';
import type { IUserGateway } from '../domain/user.gateway';
import { UserGateway } from '../data/user.gateway';
import { MockUserGateway } from '../data/mock.gateway';

export function registerUserDI(useMocks: boolean = false): void {
  if (container.isBound(TYPES.UserGateway)) return;

  container
    .bind<IUserGateway>(TYPES.UserGateway)
    .to(useMocks ? MockUserGateway : UserGateway)
    .inSingletonScope();

  // Only when the slice has a domain service:
  // container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
}
```

---

## Step 3: Wire Up All Slices

```typescript
// plugins/di.client.ts

import { container } from '#di';
import { registerUserDI } from '~/slices/user/plugins/di';
// import { registerTaskDI } from '~/slices/task/plugins/di';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const useMocks = config.public.useMocks === 'true';

  registerUserDI(useMocks);
  // registerTaskDI(useMocks);

  return {
    provide: { container },
  };
});
```

---

## Step 4: The Store Resolves the Gateway

State stays in Pinia, exactly as in a slice without DI. The store resolves the gateway from the container **inside actions**, not at module scope, so it never touches the container before the plugin has populated it.

```typescript
// slices/user/stores/user.ts

import { container, TYPES } from '#di';
import type { IUserGateway } from '../domain/user.gateway';
import type { IUserData, ICreateUserData } from '../domain/user.types';

export const useUserStore = defineStore('user', () => {
  const users = ref<IUserData[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const userCount = computed(() => users.value.length);

  const gateway = () => container.get<IUserGateway>(TYPES.UserGateway);

  async function fetchUsers(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      users.value = await gateway().findAll();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(data: ICreateUserData): Promise<IUserData> {
    const created = await gateway().create(data);
    users.value.push(created);
    return created;
  }

  function clearError() {
    error.value = null;
  }

  return { users, loading, error, userCount, fetchUsers, createUser, clearError };
});
```

> **NO list state in composables.** A composable returns fresh refs on every call; two components calling `useUser()` would own two copies of the list. Shared state is a store.

---

## Step 5: Use in Components

The Provider is unchanged by DI. It loads through `useAsyncData` (SSR-safe, deduplicated by key), never through `onMounted`:

```vue
<!-- slices/user/components/userList/Provider.vue -->

<script setup lang="ts">
const store = useUserStore();
const { users, loading, error, userCount } = storeToRefs(store);

// `.then(() => true)`: useAsyncData treats an undefined result as "nothing cached"
// and would re-run the request on every hydration.
await useAsyncData('users', () => store.fetchUsers().then(() => true));
</script>

<template>
  <div class="user-list">
    <h2>Users ({{ userCount }})</h2>
    <div v-if="error" class="text-destructive">
      {{ error.message }}
      <Button variant="ghost" size="sm" @click="store.clearError">Dismiss</Button>
    </div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="users.length === 0">No users found.</div>
    <ul v-else>
      <li v-for="user in users" :key="user.id">
        {{ user.name }} ({{ user.email }})
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
      useMocks: 'false',
    },
  },
});
```

> **Note:** Use `import.meta.env.DEV` and `import.meta.env.VITE_USE_MOCKS` in plain TypeScript files (like `container.ts`). Use `useRuntimeConfig()` in Nuxt plugins, stores and composables. Never pass `process.env` to Vite's `define` — it exposes all environment variables to the client bundle.

### Environment Files

```bash
# .env.development
NUXT_PUBLIC_USE_MOCKS=true

# .env.production
NUXT_PUBLIC_USE_MOCKS=false
```

---

## Testing with DI

A fresh container per test, a mocked gateway bound to the token. The example tests the optional domain service; a store is tested the same way with `setActivePinia(createPinia())` before `useUserStore()`.

```typescript
// slices/user/domain/user.service.spec.ts

import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '#di';
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
      id: '1', email: 'john@example.com', name: 'John',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
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
│   ├── {slice}.service.ts      # Optional: client-side policy with @injectable()
│   └── {slice}.types.ts        # Domain types
├── data/
│   ├── {slice}.gateway.ts      # Real implementation over #api with @injectable()
│   └── mock.gateway.ts         # Mock implementation with @injectable()
├── plugins/
│   └── di.ts                   # Slice DI registration function
└── stores/
    └── {slice}.ts              # Resolves the gateway inside actions
```

---

## Checklist

- [ ] The slice actually needs a swappable implementation or a testable client-side service (otherwise: store → `#api`, no DI)
- [ ] `reflect-metadata` imported at app entry
- [ ] TypeScript decorators enabled
- [ ] `TYPES` tokens defined in `setup/di/types.ts`
- [ ] Container created in `setup/di/container.ts`
- [ ] Slice has `plugins/di.ts` with a registration function
- [ ] All injectable classes have `@injectable()`
- [ ] Dependencies use `@inject(TYPES.xxx)`
- [ ] Main plugin (`plugins/di.client.ts`) registers all slices
- [ ] The store resolves via `container.get<T>(TYPES.xxx)` inside actions; state stays in Pinia
- [ ] Provider loads through `useAsyncData`, not `onMounted`

---

## Related Documentation

- [Layers Pattern](../03-patterns/layers.md) - Clean Architecture layers
- [Gateway Pattern](../03-patterns/gateway.md) - Gateway abstraction
- [App Store Setup](./app-store.md) - State management with Pinia
- [App API Setup](./app-api.md) - The generated SDK the real gateway wraps

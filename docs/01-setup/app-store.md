---
id: setup-app-store
title: Store Setup (App)
version: 1.0.0
last_updated: 2025-12-19

pattern: setup
complexity: fundamental
framework: nuxt
category: setup
applies_to: [frontend, app]

tags:
  - pinia
  - store
  - state-management
  - vue
  - nuxt

keywords:
  - pinia setup
  - state management
  - vue store
  - nuxt store
  - global state
  - auto-import stores

deprecated: false
experimental: false
production_ready: true
---

# Store Setup (App)

> **The Pinia slice configures global state management** for your Nuxt application. It enables auto-importing of stores from all slices, allowing each feature slice to manage its own state while being accessible application-wide.

---

## Overview

The Pinia slice provides **centralized state management** configuration:

```
┌──────────────────────────────────────────────────────────────┐
│  PINIA SLICE (setup/pinia)                                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  nuxt.config.ts                                          │ │
│  │  - Registers @pinia/nuxt module                          │ │
│  │  - Auto-imports stores from slices/**/stores             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                               │
                               v
┌──────────────────────────────────────────────────────────────┐
│  FEATURE SLICES                                               │
│                                                               │
│  slices/user/auth/stores/auth.ts     → useAuthStore()        │
│  slices/user/account/stores/account.ts → useAccountStore()   │
│  slices/setup/error/stores/error.ts  → useErrorStore()       │
│                                                               │
│  All stores are AUTO-IMPORTED and available globally!         │
└──────────────────────────────────────────────────────────────┘
```

---

## Critical Rules

### 1. Stores Live in Feature Slices

Each feature slice manages its own stores in a `stores/` folder:

```
slices/
├── setup/
│   ├── pinia/              # Pinia configuration only
│   │   └── nuxt.config.ts
│   └── error/
│       └── stores/
│           └── error.ts    # Error store
├── user/
│   ├── auth/
│   │   └── stores/
│   │       └── auth.ts     # Auth store
│   └── account/
│       └── stores/
│           └── account.ts  # Account store
└── product/
    └── stores/
        └── product.ts      # Product store
```

### 2. Stores are Auto-Imported

Thanks to Pinia's auto-import configuration, stores are globally available:

```vue
<script setup lang="ts">
// NO import needed! Stores are auto-imported
const authStore = useAuthStore();
const errorStore = useErrorStore();
</script>
```

### 3. Store Naming Convention

```typescript
// File: slices/user/auth/stores/auth.ts
// Store name: 'auth'
// Composable: useAuthStore

export const useAuthStore = defineStore('auth', {
  // ...
});
```

| File Location | Store Name | Composable |
|---------------|------------|------------|
| `slices/user/auth/stores/auth.ts` | `'auth'` | `useAuthStore()` |
| `slices/user/account/stores/account.ts` | `'account'` | `useAccountStore()` |
| `slices/setup/error/stores/error.ts` | `'error'` | `useErrorStore()` |

---

## File Location & Naming

```
slices/setup/pinia/
└── nuxt.config.ts            # Pinia module configuration

slices/{feature}/stores/
├── {feature}.ts              # Main store file
└── index.ts                  # Optional barrel export
```

---

## Installation

### Install Dependencies

```bash
npm install @pinia/nuxt pinia
```

---

## Complete Configuration Example

### `slices/setup/pinia/nuxt.config.ts`

```typescript
// @scope:app
// @slice:setup/pinia
// @layer:config
// @type:nuxt-config

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  alias: {
    '#pinia': currentDir,
  },
  imports: {
    /**
     * Auto-import stores from all slices
     * This allows useAuthStore(), useErrorStore(), etc. to work without imports
     */
    dirs: ['../../../stores', '../../../slices/**/stores'],
  },
});
```

> **Auto-Import**: The `imports.dirs` configuration automatically registers all stores from the `stores/` folders across all slices. No manual imports needed!

---

## Store Examples

### Simple Store (Options API)

```typescript
// @scope:app
// @slice:user/account
// @layer:stores
// @type:store

// slices/user/account/stores/account.ts
import { defineStore } from 'pinia';
import { AuthService, UserDto } from '#api/data';

export const useAccountStore = defineStore('account', {
  state: () => ({
    user: null as null | UserDto,
    loading: false,
  }),

  getters: {
    getUser: (state) => state.user,
    isLoading: (state) => state.loading,
  },

  actions: {
    async init() {
      await this.fetchAccount();
    },

    async fetchAccount() {
      try {
        this.loading = true;
        const response = await AuthService.me();
        if (response.data?.data) {
          this.user = response.data.data;
        }
      } catch (e) {
        console.error('Failed to fetch account', e);
      } finally {
        this.loading = false;
      }
    },
  },
});
```

### Error Store Pattern

```typescript
// @scope:app
// @slice:setup/error
// @layer:stores
// @type:store

// slices/setup/error/stores/error.ts
import { defineStore } from 'pinia';

export interface ErrorInfo {
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface ErrorOptions {
  metadata?: Record<string, unknown>;
  isGlobal?: boolean;
}

interface ErrorState {
  errors: Record<string, ErrorInfo>;
  globalError: ErrorInfo | null;
}

export const useErrorStore = defineStore('error', {
  state: (): ErrorState => ({
    errors: {},
    globalError: null,
  }),

  getters: {
    getError: (state) => (key: string): ErrorInfo | null => {
      return state.errors[key] || null;
    },
    hasError: (state) => (key: string): boolean => {
      return key in state.errors;
    },
    getGlobalError: (state): ErrorInfo | null => {
      return state.globalError;
    },
    hasGlobalError: (state): boolean => {
      return state.globalError !== null;
    },
  },

  actions: {
    setError(key: string, message: string, options: ErrorOptions = {}): void {
      const error: ErrorInfo = {
        message,
        metadata: options.metadata,
        timestamp: Date.now(),
      };

      if (options.isGlobal) {
        this.globalError = error;
      } else {
        this.errors[key] = error;
      }
    },

    clearError(key: string): void {
      delete this.errors[key];
    },

    clearGlobalError(): void {
      this.globalError = null;
    },

    clearAllErrors(): void {
      this.errors = {};
      this.globalError = null;
    },

    setApiError(key: string, error: unknown, defaultMessage: string): void {
      let message = defaultMessage;
      let metadata: Record<string, unknown> | undefined;

      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any;
        if (apiError.response?.data?.message) {
          message = apiError.response.data.message;
          metadata = {
            code: apiError.response.data.code,
            statusCode: apiError.response.data.statusCode,
            originalError: error,
          };
        }
      } else if (error instanceof Error) {
        message = error.message;
        metadata = { stack: error.stack };
      }

      this.setError(key, message, { metadata });
    },
  },
});
```

### Composition API Store (Setup Syntax)

```typescript
// @scope:app
// @slice:product
// @layer:stores
// @type:store

// slices/product/stores/product.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ProductDto } from '#api/data';

export const useProductStore = defineStore('product', () => {
  // State
  const products = ref<ProductDto[]>([]);
  const loading = ref(false);
  const selectedId = ref<string | null>(null);

  // Getters
  const productCount = computed(() => products.value.length);
  const selectedProduct = computed(() =>
    products.value.find((p) => p.id === selectedId.value)
  );

  // Actions
  async function fetchProducts() {
    loading.value = true;
    try {
      // API call here
      products.value = [];
    } finally {
      loading.value = false;
    }
  }

  function selectProduct(id: string) {
    selectedId.value = id;
  }

  return {
    // State
    products,
    loading,
    selectedId,
    // Getters
    productCount,
    selectedProduct,
    // Actions
    fetchProducts,
    selectProduct,
  };
});
```

---

## Usage Examples

### Using Stores in Components

```vue
<script setup lang="ts">
// Stores are auto-imported - no import statement needed!
const authStore = useAuthStore();
const accountStore = useAccountStore();
const errorStore = useErrorStore();

// Access state
const user = computed(() => accountStore.user);
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Call actions
async function handleLogin(credentials: LoginDto) {
  const success = await authStore.login(credentials);
  if (success) {
    await accountStore.fetchAccount();
  }
}

// Check errors
const loginError = computed(() => errorStore.getError('auth_login'));
</script>

<template>
  <div v-if="isAuthenticated">
    <p>Welcome, {{ user?.name }}</p>
  </div>
  <div v-else>
    <LoginForm @submit="handleLogin" />
    <p v-if="loginError" class="text-destructive">
      {{ loginError.message }}
    </p>
  </div>
</template>
```

### Using Stores in Other Stores

```typescript
// slices/user/auth/stores/auth.ts
import { defineStore } from 'pinia';
import { useErrorStore } from '@/slices/setup/error/stores/error';

export const useAuthStore = defineStore('auth', {
  actions: {
    async login(credentials: LoginUserDto): Promise<boolean> {
      const errorStore = useErrorStore();
      try {
        // ... login logic
        return true;
      } catch (e) {
        errorStore.setApiError('auth_login', e, 'Failed to login');
        return false;
      }
    },
  },
});
```

### Using Stores in Composables

```typescript
// slices/user/composables/useAuth.ts
export function useAuth() {
  const authStore = useAuthStore();
  const accountStore = useAccountStore();

  const isLoggedIn = computed(() => authStore.isAuthenticated);
  const currentUser = computed(() => accountStore.user);

  async function logout() {
    authStore.logout();
    navigateTo('/login');
  }

  return {
    isLoggedIn,
    currentUser,
    logout,
  };
}
```

---

## Store Patterns

### State Structure

| Pattern | Usage |
|---------|-------|
| `loading: boolean` | Track async operation status |
| `error: string \| null` | Store error messages |
| `data: T \| null` | Main data storage |
| `items: T[]` | List/collection storage |
| `selectedId: string \| null` | Track selected item |

### Getter Patterns

```typescript
getters: {
  // Simple accessor
  getUser: (state) => state.user,

  // Computed value
  isLoading: (state) => state.loading,

  // Parameterized getter (returns function)
  getById: (state) => (id: string) => {
    return state.items.find(item => item.id === id);
  },

  // Getter using other getters
  displayName(state): string {
    return this.getUser?.name || 'Guest';
  },
}
```

### Action Patterns

```typescript
actions: {
  // Synchronous action
  setUser(user: UserDto) {
    this.user = user;
  },

  // Async action with loading state
  async fetchData() {
    this.loading = true;
    try {
      const response = await api.getData();
      this.data = response.data;
    } catch (e) {
      this.error = 'Failed to fetch data';
    } finally {
      this.loading = false;
    }
  },

  // Action calling other store
  async loginAndFetch(credentials: LoginDto) {
    const authStore = useAuthStore();
    const success = await authStore.login(credentials);
    if (success) {
      await this.fetchData();
    }
  },
}
```

---

## Checklist

### Initial Setup

- [ ] Install `@pinia/nuxt` and `pinia`
- [ ] Create `slices/setup/pinia/nuxt.config.ts`
- [ ] Configure `imports.dirs` for auto-import

### For Each Store Created

- [ ] Place in `slices/{feature}/stores/` folder
- [ ] Use `defineStore` with unique store name
- [ ] Export composable as `use{Feature}Store`
- [ ] Define typed state interface
- [ ] Add getters for computed values
- [ ] Add actions for mutations and async operations

### Never Do

- [ ] NO stores outside of `stores/` folders
- [ ] NO duplicate store names across slices
- [ ] NO direct state mutation outside actions
- [ ] NO manual imports of auto-imported stores in templates

---

## Related Documentation

- [Theme Setup](./app-theme.md) - UI components and styling
- [Error Setup](./app-error.md) - Error handling patterns
- [API Setup](./app-api.md) - API client configuration

---
id: setup-app-error
title: Error Handling Setup (App)
version: 1.0.0
last_updated: 2025-12-20

pattern: setup
complexity: fundamental
framework: nuxt
category: setup
applies_to: [frontend, app]

tags:
  - error-handling
  - toast
  - api-interceptor
  - error-store
  - i18n-errors

keywords:
  - error handling
  - toast notifications
  - api error interceptor
  - error store
  - useError composable
  - handleError utility

deprecated: false
experimental: false
production_ready: true
---

# Error Handling Setup (App)

> **Centralized error handling for the frontend** with toast notifications, an error store for state management, and API interceptors that catch errors globally. Error messages are i18n-compatible using error code patterns (`CODE_title`, `CODE_description`).

---

## Overview

The error handling system has three main components:

```
┌──────────────────────────────────────────────────────────────┐
│  API CALL                                                     │
│                                                               │
│  const result = await AuthService.login(data);                │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                               │
                               │  Error occurs
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  API INTERCEPTOR (plugins/api.ts)                             │
│                                                               │
│  - Catches all Axios errors                                   │
│  - Calls handleError() utility                                │
│  - Handles 401 → token refresh or logout                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  handleError() UTILITY                                        │
│                                                               │
│  - Extracts error code from API response                      │
│  - Looks up i18n translations: {CODE}_title, {CODE}_description│
│  - Shows toast notification with error message                │
│  - Handles auth errors (logout on 401)                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  TOAST NOTIFICATION                                           │
│                                                               │
│  ┌─────────────────────────────────────┐                      │
│  │  ⚠️ User Not Found                   │                      │
│  │  We couldn't find an account with   │                      │
│  │  the provided email address.        │                      │
│  └─────────────────────────────────────┘                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Critical Rules

### 1. API Errors Use Code-Based i18n Translations

```json
// locales/en.json
{
  "USER_NOT_FOUND_title": "User Not Found",
  "USER_NOT_FOUND_description": "We couldn't find an account with the provided email."
}
```

The `handleError()` function automatically looks up translations using the error code from the API.

### 2. 401 Errors Trigger Token Refresh

The interceptor handles authentication errors:
- First 401 → attempt token refresh
- If refresh fails → logout and redirect to login page
- Max 2 refresh attempts to prevent loops

### 3. Use Error Store for Component-Level Errors

```typescript
// For form validation errors, use the error store
const { setError, clearError, hasError, getError } = useError();

setError('email', 'Invalid email format');
```

---

## File Location & Naming

```
app/
└── slices/
    └── setup/
        ├── error/                        # Error handling slice
        │   ├── nuxt.config.ts            # Slice config + alias
        │   ├── composables/
        │   │   └── useError.ts           # Error composable
        │   ├── stores/
        │   │   └── error.ts              # Pinia error store
        │   ├── utils/
        │   │   └── handleError.ts        # Global error handler
        │   └── locales/
        │       └── en.json               # Error translations
        └── api/
            └── plugins/
                └── api.ts                # API interceptor
```

---

## Installation

The error slice depends on:
- `#theme` (for toast component)
- `#api` (for API client)
- Pinia store (for error state)
- i18n (for translations)

### nuxt.config.ts

```typescript
// slices/setup/error/nuxt.config.ts
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  alias: {
    '#error': currentDir,
  },
  i18n: {
    langDir: '../locales',
    locales: [{ code: 'en', file: 'en.json' }],
  },
});
```

---

## Complete Configuration Examples

### Error Store

```typescript
// slices/setup/error/stores/error.ts
// @scope:app
// @slice:setup/error
// @layer:stores
// @type:store

import { defineStore } from 'pinia';

// Types
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
    getError:
      (state) =>
      (key: string): ErrorInfo | null => {
        return state.errors[key] || null;
      },

    hasError:
      (state) =>
      (key: string): boolean => {
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

    // Utility: Set API error with proper extraction
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

    // Validation errors (component-level)
    setValidationError(key: string, message: string, metadata?: Record<string, unknown>): void {
      this.setError(key, message, { metadata });
    },

    // Auth errors (global toast)
    setAuthError(key: string, message: string, metadata?: Record<string, unknown>): void {
      this.setError(key, message, { metadata, isGlobal: true });
    },

    // Network errors (global toast)
    setNetworkError(key: string, message?: string): void {
      this.setError(
        key,
        message || 'Network error occurred. Please check your connection.',
        { isGlobal: true }
      );
    },
  },
});
```

### useError Composable

```typescript
// slices/setup/error/composables/useError.ts
// @scope:app
// @slice:setup/error
// @layer:composables
// @type:composable

import { computed } from 'vue';
import { useErrorStore, type ErrorInfo, type ErrorOptions } from '../stores/error';

export const useError = () => {
  const store = useErrorStore();

  // Computed properties
  const globalError = computed(() => store.getGlobalError);
  const hasGlobalError = computed(() => store.hasGlobalError);

  // Error management
  const getError = (key: string): ErrorInfo | null => {
    return store.getError(key);
  };

  const hasError = (key: string): boolean => {
    return store.hasError(key);
  };

  const setError = (key: string, message: string, options: ErrorOptions = {}): void => {
    store.setError(key, message, options);
  };

  const clearError = (key: string): void => {
    store.clearError(key);
  };

  const clearGlobalError = (): void => {
    store.clearGlobalError();
  };

  const clearAllErrors = (): void => {
    store.clearAllErrors();
  };

  // Utility methods
  const setApiError = (key: string, error: unknown, defaultMessage: string): void => {
    store.setApiError(key, error, defaultMessage);
  };

  const setValidationError = (key: string, message: string, metadata?: Record<string, unknown>): void => {
    store.setValidationError(key, message, metadata);
  };

  const setAuthError = (key: string, message: string, metadata?: Record<string, unknown>): void => {
    store.setAuthError(key, message, metadata);
  };

  const setNetworkError = (key: string, message?: string): void => {
    store.setNetworkError(key, message);
  };

  // Async error handling wrapper
  const handleAsync = async <T>(
    key: string,
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      setApiError(key, error, errorMessage);
      return null;
    }
  };

  return {
    // State
    globalError,
    hasGlobalError,

    // Methods
    getError,
    hasError,
    setError,
    clearError,
    clearGlobalError,
    clearAllErrors,

    // Utility methods
    setApiError,
    setValidationError,
    setAuthError,
    setNetworkError,
    handleAsync,
  };
};
```

### handleError Utility (Global Toast Handler)

```typescript
// slices/setup/error/utils/handleError.ts
// @scope:app
// @slice:setup/error
// @layer:utils
// @type:utility

import { useToast } from '#theme/components/ui/toast/use-toast';

// Track refresh attempts to prevent infinite loops
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 2;

export const handleError = async (error: any) => {
  console.log('Error:', error);
  const { toast } = useToast();
  const account = useAuthStore();
  const app = useNuxtApp();

  // No response - network error or similar
  if (!error?.response) {
    throw createError({ statusCode: 404, message: 'Data not found' });
  }

  // Handle 401 Unauthorized - Token refresh flow
  if (error.response.status === 401) {
    if (refreshAttempts === 0) {
      refreshAttempts = 1;
    } else if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      // Too many attempts - force logout
      refreshAttempts = 0;
      account.logout();
      navigateTo(pages.logout);
      return;
    } else {
      refreshAttempts++;
    }

    const refreshSuccess = await account.refreshToken();
    if (!refreshSuccess) {
      refreshAttempts = 0;
      navigateTo(pages.logout);
      return;
    }

    // Success - reset counter
    refreshAttempts = 0;
    return;
  }

  // Handle errors with error code (from API BaseError)
  if (error.response.data.code) {
    try {
      const code = error.response.data.code;
      const apiMessage = error.response.data.message;

      // Look up i18n translations using error code
      let title = app.$i18n.t(`${code}_title`);
      let description = apiMessage || app.$i18n.t(`${code}_description`, {
        supportLink: `<strong><a href="mailto:support@example.com">support@example.com</a></strong>`,
      });

      // Fallback if translation doesn't exist
      if (title === `${code}_title`) {
        title = 'Error';
      }
      if (description === `${code}_description` && apiMessage) {
        description = apiMessage;
      }

      // Show toast notification
      toast({
        title,
        description,
        variant: 'destructive',
      });
    } catch (e) {
      console.error('Error showing toast:', e);
    }
  }
};
```

### API Interceptor Plugin

```typescript
// slices/setup/api/plugins/api.ts
// @scope:app
// @slice:setup/api
// @layer:plugins
// @type:plugin

import { client } from '../data/repositories/api/client.gen';
import { defineNuxtPlugin } from '#app';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export default defineNuxtPlugin((nuxtApp) => {
  // Request interceptor
  client.instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      return config;
    },
    (error: AxiosError) => {
      return handleError(error);
    },
  );

  // Response interceptor - catches all API errors
  client.instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error: AxiosError) => {
      return handleError(error);
    },
  );

  return {
    provide: {
      client,
    },
  };
});
```

---

## Error Translations (i18n)

### Pattern: `{CODE}_title` and `{CODE}_description`

```json
// slices/setup/error/locales/en.json
{
  "UNEXPECTED_ERROR_title": "Oops! Something Went Wrong",
  "UNEXPECTED_ERROR_description": "We encountered an unexpected error. Please try again."
}

// slices/user/auth/locales/en.json
{
  "USER_EXISTS_title": "User Already Registered",
  "USER_EXISTS_description": "It looks like you already have an account. Please log in.",

  "USER_NOT_FOUND_title": "User Not Found",
  "USER_NOT_FOUND_description": "We couldn't find an account with the provided email.",

  "USER_NOT_AUTHORIZED_title": "Incorrect Email or Password",
  "USER_NOT_AUTHORIZED_description": "Please verify your credentials and try again, or contact {supportLink}.",

  "USER_BANNED_title": "Account Banned",
  "USER_BANNED_description": "Your account has been banned. Please contact {supportLink}."
}
```

### Matching API Error Codes

The error codes in translations must match the codes thrown by the API:

```typescript
// API (NestJS) - throws error with code
throw new UserNotFoundError(userId);
// Response: { code: "USER_NOT_FOUND", message: "User not found", statusCode: 404 }

// App (Nuxt) - looks up translation
$t('USER_NOT_FOUND_title')  // → "User Not Found"
$t('USER_NOT_FOUND_description')  // → "We couldn't find..."
```

---

## Usage Examples

### Using useError in Components

```vue
<script setup lang="ts">
const { setError, clearError, hasError, getError } = useError();

const validateEmail = (email: string) => {
  clearError('email');

  if (!email) {
    setError('email', 'Email is required');
    return false;
  }

  if (!email.includes('@')) {
    setError('email', 'Invalid email format');
    return false;
  }

  return true;
};
</script>

<template>
  <div>
    <input v-model="email" @blur="validateEmail(email)" />
    <span v-if="hasError('email')" class="text-red-500">
      {{ getError('email')?.message }}
    </span>
  </div>
</template>
```

### Using handleAsync Wrapper

```typescript
const { handleAsync } = useError();

// Wraps async operation with automatic error handling
const user = await handleAsync(
  'fetch-user',
  () => UserService.getUser(id),
  'Failed to fetch user'
);

if (user) {
  // Success - user is available
}
```

### Manual Toast for Custom Errors

```typescript
import { useToast } from '#theme/components/ui/toast/use-toast';

const { toast } = useToast();

toast({
  title: 'Success',
  description: 'Your changes have been saved.',
  variant: 'default',
});

toast({
  title: 'Error',
  description: 'Something went wrong.',
  variant: 'destructive',
});
```

---

## Error Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  ERROR TYPES                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  API Error   │    │  Validation  │    │  Network     │       │
│  │  (from API)  │    │  Error       │    │  Error       │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  handleError()       useError()          useError()       │   │
│  │  (interceptor)       composable          composable       │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Toast       │    │  Error Store │    │  Toast       │       │
│  │  (global)    │    │  (component) │    │  (global)    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist

### Initial Setup

- [ ] Create `slices/setup/error/` directory structure
- [ ] Create error store (`stores/error.ts`)
- [ ] Create useError composable (`composables/useError.ts`)
- [ ] Create handleError utility (`utils/handleError.ts`)
- [ ] Create nuxt.config.ts with `#error` alias
- [ ] Create locales/en.json with base error translations
- [ ] Configure API interceptor in `setup/api/plugins/api.ts`

### Adding Error Translations

- [ ] Add `{CODE}_title` translation
- [ ] Add `{CODE}_description` translation
- [ ] Match code exactly to API error codes
- [ ] Support interpolation with `{placeholder}` syntax

### Using in Components

- [ ] Import `useError` composable
- [ ] Use `setError()` for validation errors
- [ ] Use `clearError()` before validation
- [ ] Display errors with `getError()?.message`
- [ ] Use `hasError()` for conditional rendering

### Never Do

- [ ] NO hardcoded error messages in components
- [ ] NO catching API errors without proper handling
- [ ] NO ignoring 401 errors (must handle auth flow)
- [ ] NO infinite refresh loops (use MAX_REFRESH_ATTEMPTS)

---

## Related Documentation

- [i18n Setup](./app-i18n.md) - Internationalization
- [Theme Setup](./app-theme.md) - Toast component
- [API Setup](./app-api.md) - SDK and interceptors
- [Error Pattern (API)](../03-patterns/error.md) - Backend error handling

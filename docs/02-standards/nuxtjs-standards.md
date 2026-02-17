---
id: nuxtjs-standards
title: Nuxt.js Standards
version: 1.0.0
last_updated: 2025-12-20

pattern: standards
complexity: fundamental
framework: nuxt
category: standards
applies_to: [frontend, app]

tags:
  - nuxt
  - vue
  - auto-import
  - composables
  - pinia
  - dependency-injection
  - standards

keywords:
  - nuxt standards
  - auto-import
  - no imports
  - composables
  - pinia stores
  - tsyringe
  - dependency injection
  - nuxt layers

deprecated: false
experimental: false
production_ready: true
---

# Nuxt.js Standards

> **Nuxt auto-imports most utilities, composables, and components**. Avoid manual imports for Vue APIs, Nuxt composables, components, and stores. Use dependency injection with tsyringe for complex service patterns. Each slice is a Nuxt layer with its own configuration.

---

## Post-Installation Cleanup

After creating a new Nuxt app with `npx nuxi init`, clean up the default folder structure. **Only `slices/` should exist in the app root**.

```bash
rm -rf components composables pages layouts middleware plugins assets
```

### Correct Structure

```
app/                  # Nuxt app root (the monorepo folder)
├── slices/           # KEEP - All code lives here
│   ├── setup/        # Core setup slices (theme, api, auth, etc.)
│   └── user/         # Feature slices
├── nuxt.config.ts    # Root config (extends slices)
└── app.vue           # Root app component
```

- **Slices are Nuxt layers** - Each slice has its own `components/`, `composables/`, `pages/`, etc.
- **No root-level code** - Everything is organized by feature in slices
- **Auto-import works** - Nuxt auto-imports from all slice layers

### Root nuxt.config.ts

```typescript
export default defineNuxtConfig({
  extends: [
    './slices/setup/theme',
    './slices/setup/api',
    './slices/setup/auth',
    './slices/user/account',
  ],
});
```

---

## Critical Rules Summary

| Rule | Correct | Incorrect |
|------|---------|-----------|
| Vue APIs | `ref()`, `computed()` | `import { ref } from 'vue'` |
| Nuxt composables | `useRoute()`, `useCookie()` | `import { useRoute } from '#app'` |
| Components | `<Button />` | `import { Button } from '...'` |
| Pinia stores | `useAuthStore()` | `import { useAuthStore } from '...'` |
| API SDK | `import { UserService } from '#api'` | Must import (generated types) |

---

## 1. Auto-Import: Avoid Manual Imports

**Nuxt auto-imports Vue APIs, composables, components, and utilities. Do NOT manually import them.**

### Vue APIs (Auto-Imported)

```typescript
const count = ref(0);
const doubled = computed(() => count.value * 2);
const user = reactive({ name: 'John' });
watch(count, (newVal) => console.log('Count changed:', newVal));
onMounted(() => console.log('Component mounted'));
// WRONG: import { ref, computed, reactive, watch, onMounted } from 'vue';
```

### Nuxt Composables (Auto-Imported)

```typescript
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const cookie = useCookie('token');
const { data } = await useFetch('/api/users');
definePageMeta({ layout: 'dashboard' });
// WRONG: import { useRoute, useRouter } from '#app';
```

### Components (Auto-Imported)

```vue
<template>
  <Button variant="primary">Click me</Button>
  <Card><CardHeader>Title</CardHeader><CardContent>Content</CardContent></Card>
  <AuthLoginProvider />
</template>
<!-- WRONG: import { Button } from '#theme/components/ui/button'; -->
```

### Pinia Stores (Auto-Imported)

```typescript
const authStore = useAuthStore();
const menuStore = useMenuStore();
// WRONG: import { useAuthStore } from '~/slices/user/auth/stores/auth';
```

**Auto-import configured in `setup/pinia/nuxt.config.ts`:**

```typescript
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  imports: {
    dirs: ['../../../stores', '../../../slices/**/stores'],
  },
});
```

---

## 2. When to Use Manual Imports

**Some things MUST be imported manually:**

### API SDK (Generated Types and Services)

```typescript
import { AuthService, UserDto, LoginUserDto } from '#api';
const user = await AuthService.login(credentials);
```

### External Libraries

```typescript
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';
```

### Types and Cross-Slice Utilities

```typescript
import type { AuthDto, UserDto } from '#api';
import { cn } from '#theme/utils/cn';
import { handleError } from '#error/utils';
```

---

## 3. Dependency Injection with tsyringe

**For complex service patterns, use tsyringe for dependency injection.**

### Setup (slices/setup/di/nuxt.config.ts)

```typescript
import type { Nitro } from 'nitropack';

export default defineNuxtConfig({
  alias: { '#di': currentDir },
  hooks: {
    'nitro:build:before': (nitro: Nitro) => {
      nitro.options.moduleSideEffects.push('reflect-metadata');
    },
  },
  vite: {
    esbuild: {
      tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
    },
  },
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "verbatimModuleSyntax": false
  }
}
```

### Type Declaration (slices/setup/di/index.d.ts)

```typescript
import type { DependencyContainer } from 'tsyringe';

declare module '#app' {
  interface NuxtApp { $di: DependencyContainer; }
}
declare module 'vue' {
  interface ComponentCustomProperties { $di: DependencyContainer; }
}
```

### Using DI in Components

```typescript
const { $di } = useNuxtApp();
const userService = $di.resolve(UserService);
```

---

## 4. Slice Configuration (nuxt.config.ts)

**Each slice has its own `nuxt.config.ts` that configures aliases, modules, and auto-imports.**

```typescript
// slices/user/auth/nuxt.config.ts
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  alias: { '#auth': currentDir },
  i18n: {
    langDir: '../locales',
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'fr', file: 'fr.json' },
    ],
  },
});
```

### Key Configuration Options

| Option | Purpose | Example |
|--------|---------|---------|
| `alias` | Create `#slice` import alias | `'#auth': currentDir` |
| `modules` | Register Nuxt modules | `['@nuxtjs/i18n']` |
| `i18n.langDir` | Locale files location | `'../locales'` |
| `imports.dirs` | Auto-import directories | `['./composables']` |
| `components` | Component auto-import config | `{ dirs: ['./components'] }` |

---

## 5. Page and Layout Standards

### Page Structure

```vue
<!-- slices/user/auth/pages/login.vue -->
<script lang="ts" setup>
definePageMeta({
  layout: 'auth',
  auth: {
    public: true,
    onlyNotAuthenticated: true,
    redirect: pages.goToAfterLogin,
  },
});
</script>

<template>
  <AuthLoginProvider />
</template>
```

### Page Meta Options

```typescript
definePageMeta({
  layout: 'dashboard',
  auth: { public: true, onlyNotAuthenticated: true, redirect: '/dashboard' },
  title: 'Login',
  middleware: ['auth'],
});
```

### Page Files Location

```
slices/user/auth/pages/
├── login.vue       → /login
├── register.vue    → /register
├── logout.vue      → /logout
└── confirm.vue     → /confirm
```

---

## 6. Store Standards (Pinia)

### Store Structure

```typescript
// slices/user/auth/stores/auth.ts
import { defineStore } from 'pinia';
import { AuthDto, AuthService } from '#api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    auth: null as AuthDto | null,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.auth?.accessToken),
    getToken: (state): string | null => state.auth?.accessToken || null,
  },

  actions: {
    async login(credentials: LoginUserDto): Promise<boolean> {
      this.loading = true;
      try {
        const response = await AuthService.login(credentials);
        this.auth = response.data;
        return true;
      } catch (error) {
        return false;
      } finally {
        this.loading = false;
      }
    },
    logout(): void { this.auth = null; },
  },
});
```

### Store Naming Convention

| Pattern | Example |
|---------|---------|
| Store function | `use{Entity}Store` |
| File name | `{entity}.ts` |
| Location | `slices/{slice}/stores/` |

### Using Stores (No Import Needed)

```vue
<script setup lang="ts">
const authStore = useAuthStore();
const isLoggedIn = computed(() => authStore.isAuthenticated);
await authStore.login(credentials);
</script>
```

---

## 7. Composable Standards

```typescript
// slices/setup/error/composables/useError.ts
export const useError = () => {
  const store = useErrorStore();
  const globalError = computed(() => store.getGlobalError);
  const hasGlobalError = computed(() => store.hasGlobalError);

  const setError = (key: string, message: string): void => store.setError(key, message);
  const clearError = (key: string): void => store.clearError(key);

  return { globalError, hasGlobalError, setError, clearError };
};
```

### Composable Naming Convention

| Pattern | Example |
|---------|---------|
| Function name | `use{Feature}` |
| File name | `use{Feature}.ts` |
| Location | `slices/{slice}/composables/` |

Composables are auto-imported from any slice's `composables/` folder -- no import statement needed.

---

## 8. Component Standards

### Component Folder Structure

**Every component folder MUST have a `Provider.vue` file as the bootstrap entry point.**

**Maximum ONE level of folders inside `components/` - use combined names.**

```
slices/{slice}/
└── components/
    ├── {entity}/              # Single entity view
    │   ├── Provider.vue       # REQUIRED - Bootstrap/entry point
    │   ├── Item.vue           # Display component
    │   ├── Form.vue           # Form component
    │   └── Menu.vue           # Menu component
    ├── {entity}List/          # List view (combined name)
    │   ├── Provider.vue       # REQUIRED
    │   └── Thumb.vue          # List item thumbnail
    ├── {entity}Create/        # Create view (combined name)
    │   ├── Provider.vue       # REQUIRED
    │   └── Form.vue           # Create form
    └── {entity}Item/          # Item detail view (combined name)
        ├── Provider.vue       # REQUIRED
        └── Details.vue        # Details display
```

### Example: Account Slice

```
slices/user/account/components/
└── account/
    ├── Provider.vue     # Bootstrap entry point
    ├── Item.vue         # Displays user profile info
    ├── Form.vue         # Edit profile dialog
    └── Menu.vue         # Account navigation menu
```

---

### Provider Pattern

**The Provider component is the data-fetching wrapper that passes data to child components.**

```vue
<!-- slices/user/account/components/account/Provider.vue -->
<script lang="ts" setup>
import { AuthService } from '#api';

const { data, pending, error, refresh } = useAsyncData('account', () => AuthService.me());
</script>

<template>
  <div>
    <AccountForm v-if="!pending" :user="data?.data" @update="refresh" />
    <div class="mb-5"></div>
    <AccountItem :pending="pending" :user="data?.data" />
  </div>
</template>
```

- Uses `useAsyncData` for SSR-friendly data fetching
- Passes data and loading state (`pending`) to child components via props
- Handles refresh when child components update data

---

### Item Pattern

**Receives data via props -- pure display component, no data fetching.**

```vue
<!-- slices/user/account/components/account/Item.vue -->
<script lang="ts" setup>
import { UserDto } from '#api';
defineProps<{ user: UserDto; pending: boolean }>();
</script>

<template>
  <div class="py-2">
    <div class="font-bold">Name</div>
    <Skeleton v-if="!user && pending" class="h-3 mt-2 w-[150px]" />
    <div v-if="user" class="text-sm text-muted-foreground">{{ user.name }}</div>
  </div>
</template>
```

---

### Form Pattern

**Handles create/edit with vee-validate + zod. Emits `update` on success so Provider can refresh.**

```vue
<!-- slices/user/account/components/account/Form.vue -->
<script lang="ts" setup>
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';
import { UsersService, UpdateUserDto, UserDto } from '#api';

const props = defineProps<{ user: UserDto }>();
const emits = defineEmits<{ (e: 'update', value: any): void }>();
const loading = ref(false);
const isOpen = ref(false);

const formSchema = z.object({
  name: z.string().describe('Name').default(props.user.name),
  email: z.string().describe('Email').default(props.user.email),
});
const form = useForm({ validationSchema: toTypedSchema(formSchema) });

const submit = form.handleSubmit(async (values) => {
  loading.value = true;
  try {
    const result = await UsersService.updateUser({
      id: props.user.id, requestBody: values as UpdateUserDto,
    });
    isOpen.value = false;
    emits('update', result);
  } finally { loading.value = false; }
});
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger><Button>Edit Profile</Button></DialogTrigger>
    <DialogScrollContent>
      <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
      <form class="space-y-6" @submit="submit">
        <FormField v-slot="{ componentField }" name="name" :value="user.name">
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input v-bind="componentField" type="text" /></FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <Button type="submit" :loading="loading">Save</Button>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
```

---

### Component Naming Convention

**Auto-import name is `{FolderName}{FileName}` (PascalCase).**

| Type | Folder Pattern | Auto-Import Name |
|------|----------------|------------------|
| Provider (bootstrap) | `{entity}/Provider.vue` | `{Entity}Provider` |
| List Provider | `{entity}List/Provider.vue` | `{Entity}ListProvider` |
| Create Provider | `{entity}Create/Provider.vue` | `{Entity}CreateProvider` |
| Item Provider | `{entity}Item/Provider.vue` | `{Entity}ItemProvider` |
| Form | `{entity}/Form.vue` | `{Entity}Form` |
| Item | `{entity}/Item.vue` | `{Entity}Item` |
| Thumb | `{entity}List/Thumb.vue` | `{Entity}ListThumb` |

### Using Components in Pages

Pages should use Provider components for data fetching:

```vue
<script lang="ts" setup>
definePageMeta({ layout: 'dashboard', auth: { public: false } });
</script>

<template>
  <AccountProvider />
</template>
```

### Component Type Reference

| Type | Purpose |
|------|---------|
| `Provider.vue` | Data fetching, orchestration -- passes data to children |
| `Item.vue` | Display single entity (receives props, no fetching) |
| `Form.vue` | Create/edit forms with validation |
| `Thumb.vue` | List item thumbnail (clickable card) |
| `Menu.vue` | Navigation menu |
| `Dropdown.vue` | Selector dropdown |

**Key Rules:**
- Every folder MUST have a `Provider.vue`
- Use combined names (`teamList/`) NOT nested (`team/list/`)
- Maximum ONE level of folders inside `components/`

---

## Checklist

### Auto-Import Usage

- [ ] NO imports for Vue APIs (ref, computed, watch, etc.)
- [ ] NO imports for Nuxt composables (useRoute, useFetch, etc.)
- [ ] NO imports for components from slices
- [ ] NO imports for Pinia stores
- [ ] Import API SDK types and services from `#api`
- [ ] Import external packages normally

### Slice Configuration

- [ ] Each slice has `nuxt.config.ts`
- [ ] Alias configured: `'#sliceName': currentDir`
- [ ] i18n langDir points to locales folder
- [ ] Stores in `stores/` folder for auto-import

### Component Standards

- [ ] Use `<script setup lang="ts">`
- [ ] Props defined with `defineProps<Props>()`
- [ ] Emits defined with `defineEmits<{}>()`
- [ ] Components follow naming conventions
- [ ] Every component folder MUST have a `Provider.vue` (bootstrap)
- [ ] Maximum ONE level of folders inside `components/`
- [ ] Use combined names: `teamList/` NOT `team/list/`
- [ ] Provider.vue handles data fetching with `useAsyncData`
- [ ] Item.vue receives data via props (no fetching)
- [ ] Form.vue emits `update` event on success

### Store Standards

- [ ] Store function named `use{Entity}Store`
- [ ] Located in `slices/{slice}/stores/`
- [ ] Uses typed state
- [ ] Getters return typed values
- [ ] Actions use async/await

### Never Do

- [ ] NO importing Vue APIs (ref, computed, etc.)
- [ ] NO importing Nuxt composables
- [ ] NO importing components from slices
- [ ] NO importing stores (they're auto-imported)
- [ ] NO Options API (use Composition API)
- [ ] NO missing `lang="ts"` in script setup

---

## Related Documentation

- [TypeScript Standards](./ts-standards.md) - General TS rules
- [Theme Setup](../01-setup/app-theme.md) - UI components
- [Store Setup](../01-setup/app-store.md) - Pinia configuration
- [API Setup](../01-setup/app-api.md) - SDK generation
- [i18n Setup](../01-setup/app-i18n.md) - Translations

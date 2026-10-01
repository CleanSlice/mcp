---
id: setup-app
title: Nuxt App Setup
version: 1.0.0
last_updated: 2025-12-16

setup: app
complexity: intermediate
framework: nuxt
category: setup
applies_to: [frontend, app]

tags:
  - nuxt
  - setup
  - pinia
  - di
  - i18n
  - api
  - theme
  - shadcn-vue
  - hey-api

keywords:
  - nuxt setup
  - app setup
  - register slices
  - pinia store
  - inversify
  - i18n
  - api client
  - shadcn theme

deprecated: false
experimental: false
production_ready: true
---

# Nuxt App Setup

> Frontend apps use Nuxt Layers to organize slices. Each slice is a self-contained layer with its own `nuxt.config.ts`, auto-registered via `registerSlices.ts`. Setup slices provide core infrastructure: Pinia, DI, i18n, API, Theme, and Error handling.

---

## Overview

```
app/
├── nuxt.config.ts
├── registerSlices.ts
├── slices/
│   ├── setup/
│   │   ├── pinia/
│   │   ├── di/
│   │   ├── i18n/
│   │   ├── api/
│   │   ├── error/
│   │   └── theme/
│   ├── user/
│   ├── common/
│   └── {feature}/
├── .nvmrc
└── package.json
```

---

## Node.js Version

`.nvmrc` in app root:

```
24
```

```bash
nvm use
nvm install
```

---

## TypeScript Configuration

`tsconfig.json`:

```json
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "allowJs": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "verbatimModuleSyntax": false
  }
}
```

**Reference:** [tsconfig.json](https://github.com/Dreamvention/cleanslice/blob/main/app/tsconfig.json)

---

## Auto-Registration: registerSlices.ts

```typescript
import * as fs from 'fs';
import * as path from 'path';

export const registerSlices = (): string[] => {
  const settings = {
    specialSlices: ['./slices/setup', './slices/user', './slices/common'],
  };

  const slices = fs.readdirSync('./slices').filter((entry) => {
    const fullPath = path.join('./slices', entry);
    return fs.statSync(fullPath).isDirectory();
  });

  if (!slices.length) return [];

  const result: string[] = [];

  const collectSlices = (path: string) => {
    if (fs.existsSync(`${path}/nuxt.config.ts`)) {
      if (!result.includes(path)) {
        result.push(path);
      }
    } else {
      const subPaths = fs.readdirSync(path).filter((entry) => {
        const fullPath = `${path}/${entry}`;
        return fs.statSync(fullPath).isDirectory();
      });
      for (const subPath of subPaths) {
        collectSlices(`${path}/${subPath}`);
      }
    }
  };

  for (const specialSlice of settings.specialSlices) {
    collectSlices(specialSlice);
  }

  for (const slice of slices) {
    const slicePath = `./slices/${slice}`;
    collectSlices(slicePath);
  }

  return result;
};
```

**Root nuxt.config.ts:**

```typescript
import { registerSlices } from './registerSlices';

export default defineNuxtConfig({
  devtools: { enabled: false },
  extends: [...registerSlices()],
  ssr: false,
  runtimeConfig: {
    public: {
      apiUrl: 'http://localhost:3333',
      useMocks: 'false',
    },
  },
  vite: {
    define: {
      __VUE_I18N_FULL_INSTALL__: true,
      __VUE_I18N_LEGACY_API__: false,
      __INTLIFY_PROD_DEVTOOLS__: false,
    },
  },
  modules: ['@nuxt/image'],
  compatibilityDate: '2024-10-04',
});
```

---

## Setup Slices Overview

| Slice | Purpose | Alias | Key Files |
|-------|---------|-------|-----------|
| **pinia** | State management | - | `nuxt.config.ts` |
| **di** | Dependency injection (InversifyJS) | `#di` | `nuxt.config.ts` |
| **i18n** | Internationalization | - | `nuxt.config.ts`, `i18n.config.ts` |
| **api** | Backend API SDK (hey-api) | `#api` | `plugins/api.ts`, `data/repositories/api/` |
| **error** | Global error handling | `#error` | `utils/handleError.ts`, `stores/error.ts` |
| **theme** | UI components (shadcn-vue) | `#theme` | `components/ui/`, `tailwind.config.ts` |

---

## 1. Pinia (State Management)

**Reference:** [GitHub - setup/pinia](https://github.com/Dreamvention/cleanslice/tree/main/app/slices/setup/pinia)

```bash
npm i @pinia/nuxt pinia
```

```typescript
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  imports: {
    dirs: ['stores', 'slices/*/stores'],
  },
});
```

Stores in `{slice}/stores/` are auto-imported and available globally.

---

## 2. DI (Dependency Injection)

**Reference:** [GitHub - setup/di](https://github.com/Dreamvention/cleanslice/tree/main/app/slices/setup/di)

```bash
npm i inversify reflect-metadata tslib
npm i -D @rollup/plugin-typescript
```

```typescript
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

**For detailed DI setup, see:** [app-di.md](./app-di.md)

---

## 3. i18n (Internationalization)

**Reference:** [GitHub - setup/i18n](https://github.com/Dreamvention/cleanslice/tree/main/app/slices/setup/i18n)

```bash
npm i -D @nuxtjs/i18n@next
```

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    vueI18n: './configs/i18n.config.ts',
    strategy: 'no_prefix',
    defaultLocale: 'en',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
  },
});
```

**configs/i18n.config.ts:**

```typescript
export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  messages: {
    en: { /* translations */ },
    fr: { /* translations */ },
  },
  datetimeFormats: {
    en: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric' },
    },
  },
}));
```

**Adding translations to a slice:**

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    langDir: './locales',
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'fr', file: 'fr.json' },
    ],
  },
});
```

---

## 4. API (Backend SDK with hey-api)

**Reference:** [setup/api](https://github.com/Dreamvention/cleanslice/tree/main/app/slices/setup/api) | [openapi-ts.config.ts](https://github.com/Dreamvention/cleanslice/blob/main/app/openapi-ts.config.ts)

```bash
npm i axios
npm i -D @hey-api/openapi-ts
```

> **Note:** Starting with `@hey-api/openapi-ts` v0.73+, `@hey-api/client-axios` is bundled and does not need separate installation.

**openapi-ts.config.ts (root):**

```typescript
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../api/swagger-spec.json',
  output: {
    path: './slices/setup/api/data/repositories/api',
  },
  postProcess: ['prettier'],
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    '@hey-api/client-axios',
  ],
});
```

**package.json scripts:**

```json
{
  "scripts": {
    "build:api": "openapi-ts",
    "dev": "npm run build:api && nuxt dev",
    "build": "nuxt build"
  }
}
```

```bash
npm run build:api
```

> **Both artifacts are committed, and neither refreshes itself.**
> `../api/swagger-spec.json` is written by `npm run swagger:generate` in the API
> ([Swagger Setup](../01-setup/api-swagger.md#exporting-the-spec)), and the SDK
> under `slices/setup/api/data/repositories/api/` is written by `build:api`.
> Regenerate the spec, regenerate the SDK, commit both. Skip the second step and
> `build:api` - which runs inside `dev` and `build` - rewrites the tracked SDK
> every time anyone starts the frontend, leaving a modified file in `git status`
> that nobody edited.

**nuxt.config.ts:**

```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  alias: {
    '#api': currentDir,
  },
});
```

**plugins/api.ts:**

```typescript
import { client } from '../data/repositories/api/client.gen';

export default defineNuxtPlugin(() => {
  const { apiUrl } = useRuntimeConfig().public;

  client.setConfig({
    baseURL: apiUrl as string,
  });

  client.instance.interceptors.response.use(
    (response) => response,
    (error) => {
      handleError(error);
      return Promise.reject(error);
    },
  );
});
```

**Generated files:**

```
slices/setup/api/data/repositories/api/
├── client/                # Client utilities (bundled @hey-api/client-axios)
│   ├── client.gen.ts
│   ├── types.gen.ts
│   └── utils.gen.ts
├── client.gen.ts          # Client instance (import { client } from here)
├── core/                  # Core utilities
├── sdk.gen.ts             # SDK functions (getUsers, createUser, etc.)
├── types.gen.ts           # TypeScript types
└── index.ts               # Re-exports
```

---

## 5. Error Handling

**Reference:** [GitHub - setup/error](https://github.com/Dreamvention/cleanslice/tree/main/app/slices/setup/error)

**nuxt.config.ts:**

```typescript
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

**utils/handleError.ts:**

```typescript
import { useToast } from '#theme/components/ui/toast/use-toast';

let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 2;

export const handleError = async (error: any) => {
  const { toast } = useToast();
  const account = useAuthStore();
  const app = useNuxtApp();

  if (!error?.response) {
    throw createError({ statusCode: 404, message: 'Data not found' });
  }

  if (error.response.status === 401) {
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      refreshAttempts = 0;
      account.logout();
      navigateTo(pages.logout);
      return;
    }
    refreshAttempts++;
    const refreshSuccess = await account.refreshToken();
    if (!refreshSuccess) {
      refreshAttempts = 0;
      navigateTo(pages.logout);
      return;
    }
    refreshAttempts = 0;
    return;
  }

  if (error.response.data.code) {
    const code = error.response.data.code;
    const apiMessage = error.response.data.message;
    let title = app.$i18n.t(`${code}_title`);
    let description = apiMessage || app.$i18n.t(`${code}_description`);
    if (title === `${code}_title`) title = 'Error';
    toast({ title, description, variant: 'destructive' });
  }
};
```

---

## 6. Theme (shadcn-vue)

**Reference:** [GitHub - setup/theme](https://github.com/Dreamvention/cleanslice/tree/main/app/slices/setup/theme)

```bash
npm i @nuxtjs/tailwindcss shadcn-nuxt
npm i -D vite-svg-loader
```

```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import svgLoader from 'vite-svg-loader';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt'],
  css: ['#theme/assets/scss/main.scss'],
  alias: {
    '#theme': currentDir,
  },
  tailwindcss: {
    cssPath: '#theme/assets/css/tailwind.css',
    configPath: './tailwind.config',
  },
  vite: {
    plugins: [svgLoader()],
  },
  shadcn: {
    prefix: '',
    componentDir: './slices/setup/theme/components/ui',
  },
});
```

**Structure:**

```
slices/setup/theme/
├── nuxt.config.ts
├── tailwind.config.ts
├── assets/
│   ├── css/tailwind.css
│   └── scss/main.scss
├── components/ui/
├── utils/
│   └── cn.ts
└── index.ts
```

**Usage:**

```vue
<template>
  <Button variant="default">Click me</Button>
  <Card>
    <CardHeader>Title</CardHeader>
    <CardContent>Content</CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Button } from '#theme/components/ui/button';
import { Card, CardHeader, CardContent } from '#theme/components/ui/card';
</script>
```

---

## Slice nuxt.config.ts Template

```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  alias: {
    '#feature': currentDir,
  },
  modules: ['@nuxtjs/i18n'],
  i18n: {
    langDir: './locales',
    locales: [
      { code: 'en', file: 'en.json' },
    ],
  },
});
```

---

## Setup Order

`registerSlices.ts` processes slices in order. Setup slices must load first:

1. **setup/pinia** - State management
2. **setup/di** - DI container
3. **setup/i18n** - Translations
4. **setup/theme** - UI components
5. **setup/error** - Error handling (depends on theme, i18n)
6. **setup/api** - API client (depends on error handling)
7. **user** - User/auth slice
8. **common** - Shared utilities
9. **{feature}** - Feature slices

---

## Quick Reference

| Task | Where to Look |
|------|---------------|
| Add new slice | Create folder with `nuxt.config.ts`, auto-registered |
| Add state store | `{slice}/stores/{name}.ts` |
| Add translations | `{slice}/locales/{lang}.json` + nuxt.config.ts |
| Add UI component | Use from `#theme/components/ui/` |
| Configure API base URL | `setup/api/plugins/api.ts` via `useRuntimeConfig()` |
| Handle API errors | `setup/error/utils/handleError.ts` |
| Add auth interceptor | `setup/api/plugins/api.ts` |

---

## Dockerfile

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
ARG NUXT_PUBLIC_API_URL
RUN NUXT_PUBLIC_API_URL=${NUXT_PUBLIC_API_URL} npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

```bash
docker build --build-arg NUXT_PUBLIC_API_URL=https://api.example.com -t app .
docker run -p 3000:3000 app
```

> **Note:** Nuxt automatically maps `NUXT_PUBLIC_*` env vars to `runtimeConfig.public.*` at build time. Never pass `process.env` to Vite's `define` — it exposes all environment variables to the client bundle.

**Reference:** [Dockerfile](https://github.com/Dreamvention/cleanslice/blob/main/app/Dockerfile)

---

## Related Documentation

- [app-di.md](./app-di.md) - Detailed DI setup with InversifyJS
- [Gateway Pattern](../03-patterns/gateway.md) - Frontend gateway pattern
- [Repository Pattern](../03-patterns/repository.md) - API repository usage
- [Types Pattern](../03-patterns/types.md) - Domain types

---

## External References

- [cleanslice/app](https://github.com/Dreamvention/cleanslice/tree/main/app) - Reference implementation
- [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts) - API SDK generator
- [shadcn-vue](https://www.shadcn-vue.com/) - UI components
- [Nuxt Layers](https://nuxt.com/docs/getting-started/layers) - Layer architecture

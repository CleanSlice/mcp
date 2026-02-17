---
id: setup-slices
title: Setup Slices
version: 1.0.0
last_updated: 2025-12-21

pattern: slice
complexity: fundamental
framework: full-stack
category: slices
applies_to: [api, app]

tags:
  - setup
  - slices
  - infrastructure
  - configuration

keywords:
  - setup slices
  - prisma
  - theme
  - api sdk
  - error handling
  - i18n

deprecated: false
experimental: false
production_ready: true
---

# Setup Slices

> **Setup slices provide infrastructure and shared utilities.** They are foundational slices that feature slices depend on. App setup slices live in `app/slices/setup/`, API setup slices live in `api/src/slices/`.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  APP SETUP SLICES (Nuxt)                                        │
│  ─────────────────────────────────────────────────────────────  │
│  theme/  │  pinia/  │  api/  │  error/  │  i18n/                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  API SETUP SLICES (NestJS)                                      │
│  ─────────────────────────────────────────────────────────────  │
│  prisma/  │  core/  │  aws/  │  redis/  │  health/              │
└─────────────────────────────────────────────────────────────────┘
```

---

## App Setup Slices (Nuxt)

Located at: `app/slices/setup/`

| Slice | Purpose | Dependencies |
|-------|---------|--------------|
| `theme/` | UI components, Tailwind CSS, Shadcn Vue | tailwindcss, shadcn-vue |
| `pinia/` | State management configuration | @pinia/nuxt |
| `api/` | API SDK generation and HTTP client | @hey-api/openapi-ts, axios |
| `error/` | Error handling, toast notifications | pinia, i18n |
| `i18n/` | Internationalization | @nuxtjs/i18n |

### Registration Order

```typescript
export default defineNuxtConfig({
  extends: [
    './slices/setup/theme',
    './slices/setup/pinia',
    './slices/setup/api',
    './slices/setup/error',
    './slices/setup/i18n',
    './slices/user/auth',
    './slices/user/account',
    './slices/project',
  ],
});
```

---

### 1. Theme Slice

**Purpose:** UI component library and styling with Tailwind CSS and Shadcn Vue.

#### Structure

```
app/slices/setup/theme/
├── nuxt.config.ts
├── tailwind.config.js
├── assets/scss/main.scss
├── components/ui/          # Shadcn Vue: button/, card/, dialog/, form/, input/ ...
├── plugins/fonts.ts
└── utils/cn.ts
```

#### nuxt.config.ts

```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  alias: { '#theme': currentDir },
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt'],
  tailwindcss: {
    cssPath: `${currentDir}/assets/scss/main.scss`,
    configPath: `${currentDir}/tailwind.config.js`,
  },
  shadcn: {
    prefix: '',
    componentDir: `${currentDir}/components/ui`,
  },
  vite: { plugins: [svgLoader()] },
});
```

#### Key Dependencies

`@nuxtjs/tailwindcss`, `shadcn-nuxt`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-vue-next`, `vee-validate`, `zod`, `@vee-validate/zod`

---

### 2. Pinia Slice

**Purpose:** State management with automatic store discovery.

#### Structure

```
app/slices/setup/pinia/
└── nuxt.config.ts
```

#### nuxt.config.ts

```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  alias: { '#pinia': currentDir },
  modules: ['@pinia/nuxt'],
  pinia: {
    storesDirs: [
      'stores/**',
      'slices/*/stores/**',
      'slices/*/*/stores/**',
    ],
  },
});
```

#### Usage

Stores are auto-imported across all slices: `const authStore = useAuthStore();`

---

### 3. API Slice

**Purpose:** Generated API SDK from OpenAPI/Swagger spec with auth interceptors and error handling.

#### Structure

```
app/slices/setup/api/
├── nuxt.config.ts
├── api.config.ts               # Axios client setup + interceptors
├── plugins/api.ts
├── utils/handleApiAuthentication.ts
└── data/repositories/api/      # Generated SDK (do not edit)
    ├── index.ts
    ├── services.gen.ts
    ├── types.gen.ts
    └── ...
```

#### nuxt.config.ts

```typescript
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  alias: { '#api': resolve(currentDir, 'data/repositories/api') },
  runtimeConfig: {
    public: { apiUrl: process.env.API_URL || 'http://localhost:4000' },
  },
});
```

#### api.config.ts

Sets up the Axios-based API client with request interceptor (attaches `Bearer` token from cookie) and response interceptor (handles 401 / token refresh). See the generated `client` from `#api`.

#### SDK Generation

```bash
npx @hey-api/openapi-ts \
  -i http://localhost:4000/api-json \
  -o app/slices/setup/api/data/repositories/api \
  -c axios
```

#### Usage

```typescript
import { AuthService } from '#api';
const user = await AuthService.login({ email, password });
```

---

### 4. Error Slice

**Purpose:** Centralized error handling with toast notifications.

#### Structure

```
app/slices/setup/error/
├── nuxt.config.ts
├── stores/error.ts
├── composables/useError.ts
├── utils/handleError.ts
└── locales/en.json
```

#### stores/error.ts

```typescript
import { defineStore } from 'pinia';

interface ErrorState {
  errors: Map<string, { message: string; code?: string; timestamp: Date }>;
  globalError: string | null;
}

export const useErrorStore = defineStore('error', {
  state: (): ErrorState => ({ errors: new Map(), globalError: null }),
  getters: {
    hasError: (state) => (key: string) => state.errors.has(key),
    getError: (state) => (key: string) => state.errors.get(key),
  },
  actions: {
    setError(key: string, message: string, code?: string) {
      this.errors.set(key, { message, code, timestamp: new Date() });
    },
    clearError(key: string) { this.errors.delete(key); },
    clearAllErrors() { this.errors.clear(); this.globalError = null; },
  },
});
```

#### composables/useError.ts

```typescript
export const useError = () => {
  const errorStore = useErrorStore();
  const toast = useToast();
  const { t } = useI18n();

  const handleAsync = async <T>(
    fn: () => Promise<T>,
    options?: { showToast?: boolean; errorKey?: string }
  ): Promise<T | null> => {
    try { return await fn(); }
    catch (error: any) {
      const message = error?.response?.data?.message || t('error.generic');
      if (options?.showToast !== false) toast.error(message);
      if (options?.errorKey) errorStore.setError(options.errorKey, message);
      return null;
    }
  };

  return { handleAsync, setError: errorStore.setError, clearError: errorStore.clearError, hasError: errorStore.hasError };
};
```

#### Usage

```typescript
const { handleAsync } = useError();
const result = await handleAsync(() => UsersService.createUser(data), { showToast: true, errorKey: 'createUser' });
```

---

### 5. i18n Slice

**Purpose:** Multi-language support with locale detection.

#### Structure

```
app/slices/setup/i18n/
├── nuxt.config.ts
├── i18n.config.ts
└── locales/
    ├── en.json
    ├── fr.json
    └── es.json
```

#### nuxt.config.ts

```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  alias: { '#i18n': currentDir },
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: [
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'fr', file: 'fr.json', name: 'Français' },
      { code: 'es', file: 'es.json', name: 'Español' },
    ],
    lazy: true,
    langDir: `${currentDir}/locales`,
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_redirected', redirectOn: 'root' },
  },
});
```

#### Usage

```vue
<script setup lang="ts">
const { t } = useI18n();
</script>
<template>
  <h1>{{ t('welcome.title') }}</h1>
</template>
```

---

## API Setup Slices (NestJS)

Located at: `api/src/slices/`

| Slice | Purpose | Dependencies |
|-------|---------|--------------|
| `prisma/` | Database ORM and connection | @prisma/client |
| `core/` | Decorators, interceptors, error handling | - |
| `aws/` | AWS services (S3, Cognito, etc.) | @aws-sdk/* |
| `redis/` | Cache and session storage | redis |
| `health/` | Health check endpoint | - |

### Registration

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, CoreModule, AwsModule, RedisModule, HealthModule,
    UserModule, ProjectModule,
  ],
})
export class AppModule {}
```

---

### 1. Prisma Slice

**Purpose:** Database ORM and connection management.

#### Structure

```
api/src/slices/prisma/
├── prisma.module.ts
├── prisma.service.ts
└── index.ts
```

#### prisma.module.ts

```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

#### prisma.service.ts

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

#### Usage

```typescript
@Injectable()
export class UserGateway implements IUserGateway {
  constructor(private prisma: PrismaService) {}
  async getUser(id: string) { return this.prisma.user.findUnique({ where: { id } }); }
}
```

---

### 2. Core Slice

**Purpose:** Shared decorators, interceptors, and error handling.

#### Structure

```
api/src/slices/core/
├── core.module.ts
├── decorators/
│   ├── api-response.decorator.ts
│   ├── public.decorator.ts
│   └── user.decorator.ts
├── interceptors/
│   ├── response.interceptor.ts
│   └── error.interceptor.ts
├── errors/
│   ├── base.error.ts
│   └── error-codes.ts
└── types/meta.types.ts
```

#### Decorator Example (api-response.decorator.ts)

```typescript
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiSingleResponse = <T extends Type<any>>(model: T) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        properties: {
          data: { $ref: getSchemaPath(model) },
          success: { type: 'boolean', example: true },
        },
      },
    })
  );
```

#### Interceptor Example (response.interceptor.ts)

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => ({ data, success: true })));
  }
}
```

> The `ErrorInterceptor` follows the same pattern, wrapping errors with a standard `{ code, statusCode, message, timestamp, path }` shape. See the [Error Handling](../01-setup/app-error.md) docs for full implementation.

#### Error Classes

```typescript
export abstract class BaseError extends Error {
  abstract statusCode: number;
  abstract code: string;
  constructor(message: string) { super(message); this.name = this.constructor.name; }
}

export enum ErrorCodes {
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

#### Meta Types

```typescript
export interface IMetaResponse {
  total: number;
  currentPage: number;
  perPage: number;
  lastPage: number;
}
```

---

### 3. AWS Slice

**Purpose:** AWS services integration with submodule pattern.

#### Structure

```
api/src/slices/aws/
├── aws.module.ts
├── s3/
│   ├── s3.module.ts
│   └── s3.repository.ts
├── cognito/
│   ├── cognito.module.ts
│   └── cognito.repository.ts
└── bedrock/
    ├── bedrock.module.ts
    └── bedrock.repository.ts
```

#### aws.module.ts

```typescript
import { Module } from '@nestjs/common';
import { S3Module } from './s3/s3.module';
import { CognitoModule } from './cognito/cognito.module';
import { BedrockModule } from './bedrock/bedrock.module';

@Module({
  imports: [S3Module, CognitoModule, BedrockModule],
  exports: [S3Module, CognitoModule, BedrockModule],
})
export class AwsModule {}
```

Each submodule exports a repository wrapping the corresponding AWS SDK client with methods like `upload(key, body, contentType)`, `get(key)`, `delete(key)`.

---

### 4. Redis Slice

**Purpose:** Cache and session storage.

#### Structure

```
api/src/slices/redis/
├── redis.module.ts
└── redis.repository.ts
```

#### redis.module.ts

```typescript
import { Module, Global } from '@nestjs/common';
import { RedisRepository } from './redis.repository';

@Global()
@Module({
  providers: [RedisRepository],
  exports: [RedisRepository],
})
export class RedisModule {}
```

#### redis.repository.ts (signatures)

```typescript
@Injectable()
export class RedisRepository implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  constructor(private config: ConfigService) {}
  async onModuleInit(): Promise<void>;
  async onModuleDestroy(): Promise<void>;
  async get(key: string): Promise<string | null>;
  async set(key: string, value: string, ttl?: number): Promise<void>;
  async del(key: string): Promise<void>;
}
```

---

### 5. Health Slice

**Purpose:** API health check endpoint.

#### Structure

```
api/src/slices/health/
├── health.module.ts
└── health.controller.ts
```

#### health.module.ts

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

#### health.controller.ts

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @ApiOperation({ summary: 'Health check', operationId: 'healthCheck' })
  @Get()
  check() { return { status: 'ok' }; }
}
```

---

## Setup Slice Checklist

### App Setup Slices

- [ ] Theme slice with Tailwind and Shadcn Vue configured
- [ ] Pinia slice with store auto-discovery
- [ ] API slice with SDK generation from Swagger
- [ ] Error slice with toast notifications
- [ ] i18n slice with locale detection

### API Setup Slices

- [ ] Prisma slice with database connection
- [ ] Core slice with decorators and interceptors
- [ ] AWS slice (if using AWS services)
- [ ] Redis slice (if using caching)
- [ ] Health slice for monitoring

---

## Related Documentation

- [App Theme Setup](../01-setup/app-theme.md)
- [App API Setup](../01-setup/app-api.md)
- [App Error Setup](../01-setup/app-error.md)
- [App i18n Setup](../01-setup/app-i18n.md)
- [API Prisma Setup](../01-setup/api-prisma.md)
- [API Swagger Setup](../01-setup/api-swagger.md)

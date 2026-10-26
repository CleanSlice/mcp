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
│  prisma/ │ core/ │ aws/ │ redis/ │ health/ │ id/ │ mail/        │
└─────────────────────────────────────────────────────────────────┘
```

---

## App Setup Slices (Nuxt)

Located at: `app/slices/setup/`

| Slice | Purpose | Dependencies |
|-------|---------|--------------|
| `theme/` | UI components, Tailwind CSS, Shadcn Vue | tailwindcss, shadcn-vue |
| `pinia/` | State management configuration | @pinia/nuxt |
| `api/` | API SDK generation and HTTP client | @hey-api/openapi-ts (bundles client-axios), axios |
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
├── assets/css/tailwind.css # @import tailwindcss + @theme inline token wiring
├── assets/themes/*.css     # one theme = one file of CSS variables (:root + .dark)
├── components/ui/          # Shadcn Vue: button/, card/, dialog/, form/, input/ ...
└── utils/cn.ts
```

#### nuxt.config.ts

```typescript
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import tailwindcss from '@tailwindcss/vite';

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, '../../..');
const componentsJson = JSON.parse(readFileSync(resolve(appRoot, 'components.json'), 'utf-8'));
const themeName = componentsJson.tailwind?.theme || 'default';

export default defineNuxtConfig({
  alias: { '#theme': currentDir },
  modules: ['shadcn-nuxt'],
  css: [`#theme/assets/themes/${themeName}.css`, '#theme/assets/css/tailwind.css'],
  vite: { plugins: [tailwindcss()] },
  shadcn: {
    prefix: '',
    componentDir: `${currentDir}/components/ui`,
  },
  components: { dirs: [] },
});
```

Tailwind v4: no `tailwind.config`, no `@nuxtjs/tailwindcss`. `components.json` at the app root names the active theme. Full setup: [Theme Setup](../01-setup/app-theme.md).

#### Key Dependencies

`tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`, `shadcn-nuxt`, `reka-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-vue-next`, `@nuxtjs/color-mode`

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
├── plugins/api.ts              # Client config via useRuntimeConfig() + interceptors
├── utils/handleApiAuthentication.ts
└── data/repositories/api/      # Generated SDK (do not edit)
    ├── client/                 # Client utilities (bundled @hey-api/client-axios)
    ├── client.gen.ts           # Client instance
    ├── core/                   # Core utilities
    ├── sdk.gen.ts              # SDK functions
    ├── types.gen.ts
    └── index.ts
```

#### nuxt.config.ts

```typescript
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  alias: { '#api': resolve(currentDir, 'data/repositories/api') },
  runtimeConfig: {
    public: {
      apiUrl: 'http://localhost:4000',
    },
  },
});
```

#### plugins/api.ts

Configures the API client base URL via `useRuntimeConfig()` and sets up response interceptors for error handling. The `client` instance from `client.gen.ts` exposes an `instance` property (AxiosInstance) for adding interceptors.

#### SDK Generation

```bash
bun run build:api
```

Uses `openapi-ts.config.ts` at the app root. See [App API Setup](../01-setup/app-api.md) for full config.

#### Usage

```typescript
import { login } from '#api';
const { data } = await login({ body: { email, password } });
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
const result = await handleAsync(() => createUser({ body: data }), { showToast: true, errorKey: 'createUser' });
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
| `prisma/` | Database ORM and connection (Prisma 8) | @prisma/orm-postgres |
| `core/` | Decorators, interceptors, error handling | - |
| `swagger/` | The OpenAPI document: served at `/api`, exported by command | @nestjs/swagger |
| `aws/` | AWS services (S3, Cognito, etc.) | @aws-sdk/* |
| `redis/` | Cache and session storage | redis |
| `health/` | Health check endpoint | - |
| `id/` | Primary IDs: `formatId`, `withIdRetry`, `@IsEntityId`, `EntityIdPipe`, `IIdGateway.reserve` | human-id 4.1.3, nanoid 3.3.11 |
| `mail/` | Email sending behind `IMailGateway`; SMTP repository, Mailpit locally | nodemailer |

`swagger/` holds pure functions, not providers, so it has no module and nothing
imports it in `app.module.ts` - `main.ts` and `src/swagger.ts` import it
directly. It exists so that the document served at `/api` and the committed
`swagger-spec.json` come from one `DocumentBuilder`. See
[Swagger Setup (API)](../01-setup/api-swagger.md#exporting-the-spec).

### Registration

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, CoreModule, AwsModule, RedisModule, HealthModule, IdModule, MailModule,
    UserModule, ProjectModule,
  ],
})
export class AppModule {}
```

---

### 1. Prisma Slice

**Purpose:** Database ORM and connection management, on Prisma 8. Copy it from the starter kit (`api/src/slices/setup/prisma/`); setup in [Prisma Setup (API)](../01-setup/api-prisma.md).

#### Structure

```
api/src/slices/setup/prisma/
├── prisma.module.ts     # @Global()
├── prisma.service.ts    # connection, db.public.<Model>, transaction(), raw SQL
├── prisma.types.ts      # PrismaRow / PrismaCreate / PrismaUpdate
├── prisma.errors.ts     # isUniqueViolation, sqlState (SQLSTATE, not P2002)
└── index.ts             # #setup/prisma
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

Holds an `@prisma/orm-postgres` client built from the emitted contract (`generated/prisma/contract.json`); the ESM-only runtime is loaded with `import()` at module init. It exposes `db.public.<Model>`, an ambient `transaction()` that nested calls join, and the raw SQL helpers (`sql`, `rawRows`, `rawExecute`). Take the file from the kit.

#### Usage

```typescript
@Injectable()
export class UserGateway extends IUserGateway {
  constructor(private readonly prisma: PrismaService, private readonly mapper: UserMapper) { super(); }

  async getUser(id: string) {
    const user = await this.prisma.db.public.User.first({ id });
    return user ? this.mapper.toData(user) : null;
  }
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

### 6. ID Slice

**Purpose:** The one place that builds and checks primary keys. Every id is `<prefix>-<adjective>-<noun>-<12 Crockford>`, minted by the gateway, never by a Prisma `@default`.

#### Structure

```
api/src/slices/setup/id/
├── id.module.ts                    # @Global; IIdGateway -> IdGateway
├── id.prisma                       # model IdReservation { id String @id }
├── id.validator.ts                 # entityId(), @IsEntityId(), EntityIdPipe
├── domain/
│   ├── idFormat.ts                 # formatId, isId, isCanonicalId, LEGACY_ID_FORMATS, idPattern
│   └── id.gateway.ts               # abstract IIdGateway { reserve(prefix) }
└── data/
    ├── id.gateway.ts               # reserve() through IdReservation
    └── idRetry.ts                  # withIdRetry (unique violation 23505 on ['id'], 5 attempts)
```

#### Usage

```typescript
const user = await withIdRetry(
  () => this.prisma.db.public.User.create({ id: formatId(USER_ID_PREFIX), ...createData }),
  this.prisma.inTransaction,
);

@Param('id', new EntityIdPipe(USER_ID_PREFIX)) id: string
```

Rules: [Identifier Standards](../02-standards/id-standards.md). Installation: [ID Setup (API)](../01-setup/api-id.md).

---

### 7. Mail Slice

**Purpose:** The one place the API sends email from. Feature slices inject `MailService`; the transport is a repository behind an abstract gateway. Locally the repository talks to Mailpit (Docker), in production to any SMTP relay.

#### Structure

```
api/src/slices/setup/mail/
├── mail.module.ts                  # @Global; IMailGateway -> SmtpMailGateway
├── index.ts
├── domain/
│   ├── mail.types.ts               # IMailMessage, IMailResult
│   ├── mail.gateway.ts             # abstract IMailGateway
│   ├── mail.service.ts             # MailService: default sender, delegates
│   └── mail.errors.ts              # MailNotConfiguredError, MailDeliveryError
└── data/
    ├── mail.gateway.ts             # SmtpMailGateway
    ├── mail.mapper.ts
    └── repositories/smtp/
        ├── smtp.repository.ts      # nodemailer transport from SMTP_* env
        └── smtp.types.ts
```

#### Usage

```typescript
@Injectable()
export class InviteService {
  constructor(private readonly mail: MailService) {}

  async invite(email: string, url: string): Promise<void> {
    await this.mail.send({
      to: email,
      subject: 'You are invited',
      html: `<a href="${url}">Accept the invitation</a>`,
    });
  }
}
```

Open `http://localhost:8025` to see the message. Full setup, env vars and how to add a second provider: [Mail Setup (API)](../01-setup/api-mail.md).

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
- [ ] ID slice; every model `id String @id`, gateways mint with `formatId`
- [ ] Mail slice (if the product sends email); Mailpit in docker-compose

---

## Related Documentation

- [App Theme Setup](../01-setup/app-theme.md)
- [App API Setup](../01-setup/app-api.md)
- [App Error Setup](../01-setup/app-error.md)
- [App i18n Setup](../01-setup/app-i18n.md)
- [API Prisma Setup](../01-setup/api-prisma.md)
- [API Swagger Setup](../01-setup/api-swagger.md)
- [API Mail Setup](../01-setup/api-mail.md)
- [API ID Setup](../01-setup/api-id.md)
- [Identifier Standards](../02-standards/id-standards.md)
- [API Docker Services](../01-setup/api-docker.md)

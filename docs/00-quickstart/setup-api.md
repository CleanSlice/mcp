# Setup API (NestJS)

NestJS has its own built-in module system that serves as the slice registration mechanism. Unlike Nuxt, there's no need for a custom `registerSlices.ts` file - everything is wired directly in `app.module.ts`.

## Project Structure

```
api/
├── src/
│   ├── slices/
│   │   ├── setup/
│   │   │   ├── prisma/
│   │   │   ├── error/
│   │   │   ├── swagger/
│   │   │   ├── health/
│   │   │   ├── id/
│   │   │   └── mail/
│   │   ├── user/
│   │   ├── team/
│   │   └── file/
│   ├── app.module.ts
│   ├── swagger.ts
│   └── main.ts
├── prisma/
│   └── migrations/          # Prisma 8 plans (TypeScript), forward only
├── generated/prisma/        # emitted contract, gitignored
├── scripts/
│   └── migrate.mjs          # the one migration entrypoint
├── prisma.config.ts         # Prisma 8: globs src/slices/**/*.prisma
├── swagger-spec.json
├── docker-compose.yml
├── .env.example
├── .env.dev
├── .nvmrc
└── package.json
```

## Node.js Version

Create `.nvmrc` in the api root to ensure consistent Node.js version across the team:

```
24
```

Usage:
```bash
nvm use        # Switches to the version specified in .nvmrc
nvm install    # Installs the version if not available
```

## app.module.ts

The root module imports all slice modules directly. NestJS handles dependency injection and module lifecycle automatically.

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Setup slices
import { PrismaModule } from './slices/setup/prisma/prisma.module';
import { HealthModule } from './slices/setup/health/health.module';
import { IdModule } from './slices/setup/id';
import { MailModule } from './slices/setup/mail';

// Feature slices
import { UserModule } from './slices/user/user.module';
import { TeamModule } from './slices/team/team.module';
import { FileModule } from './slices/file/file.module';

@Module({
  imports: [
    // Global configuration - loads environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
    }),

    // Setup slices (order matters for dependencies)
    PrismaModule,
    HealthModule,
    IdModule,
    MailModule,

    // Feature slices
    UserModule,
    TeamModule,
    FileModule,
  ],
})
export class AppModule {}
```

### Key Points

- **ConfigModule**: Always first, with `isGlobal: true` so all modules can inject `ConfigService`
- **Environment files**: Uses `.env.dev`, `.env.staging`, `.env.prod` based on `NODE_ENV`
- **Module order**: Setup slices before feature slices (Prisma must be available first)

## main.ts

The entry point configures Swagger, global interceptors, validation, and CORS.

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { buildOpenApiDocument } from './slices/setup/swagger';
import { ErrorHandlingInterceptor } from './slices/setup/error/error-handling.interceptor';
import { ResponseInterceptor } from './slices/setup/error/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============================================
  // GLOBAL INTERCEPTORS
  // ============================================

  // Error handling - converts domain errors to HTTP responses
  app.useGlobalInterceptors(new ErrorHandlingInterceptor());

  // Validation - transforms and validates DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,        // Auto-transform payloads to DTO instances
      whitelist: true,        // Strip properties not in DTO — SILENTLY, see note below
      forbidNonWhitelisted: false,
    }),
  );

  // Response wrapper - standardizes API responses
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  // ============================================
  // CORS
  // ============================================

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  // ============================================
  // SWAGGER / OPENAPI
  // ============================================

  // Served, not written. `swagger-spec.json` is tracked in git and is produced
  // by `bun run swagger:generate` - writing it here would modify a tracked file
  // every time anyone starts the API.
  SwaggerModule.setup('api', app, buildOpenApiDocument(app));

  // ============================================
  // START SERVER
  // ============================================

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application running on: http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api`);
}

bootstrap();
```

> **`whitelist: true` strips silently.** A property not declared on the DTO is removed before the controller sees it, with no error (`forbidNonWhitelisted` is off). The symptom is a field that "never saves": the form sends it, the API answers 200, the row is unchanged. When a body field or query parameter stops working, check the DTO declaration first. What a query parameter accepts is proven by a test on the DTO through `ValidationPipe`, not on the gateway.

### Interceptor Order

The order of interceptors matters:

1. **ErrorHandlingInterceptor** - First, catches all errors from downstream
2. **ValidationPipe** - Validates incoming requests
3. **ResponseInterceptor** - Last, wraps successful responses

### Swagger Output

`swagger-spec.json` is a **committed build artifact**, not a runtime output.
Starting the API serves the document at `/api`; it never writes the file.

```json
{
  "scripts": {
    "swagger:generate": "bun run build && node dist/swagger.js",
    "swagger:check": "bun run build && node dist/swagger.js --check"
  }
}
```

Change a controller, a DTO or a route and the spec is stale until you run
`bun run swagger:generate` and commit the result - then `cd app && bun run
build:api` to refresh the SDK, and commit that too.

Why it is not written on boot: the file is tracked, so a write in `bootstrap()`
leaves a modified file in the working tree of everyone who has ever started the
API - noise in `git status` that gets committed by accident or explained by
hand. Full pattern, including the staleness check, in
[Swagger Setup (API)](../01-setup/api-swagger.md#exporting-the-spec).

## Prisma Slice

The Prisma slice provides database access to all other slices, on **Prisma 8**. Copy it from the [starter kit](https://github.com/CleanSlice/nest-nuxt-starter-kit) (`api/src/slices/setup/prisma/`); the full setup is [Prisma Setup (API)](../01-setup/api-prisma.md).

### Structure

```
slices/setup/prisma/
├── prisma.module.ts     # @Global()
├── prisma.service.ts    # connection, db.public.<Model>, transaction(), raw SQL
├── prisma.types.ts      # PrismaRow / PrismaCreate / PrismaUpdate
├── prisma.errors.ts     # isUniqueViolation, sqlState (SQLSTATE, not P2002)
└── index.ts             # #setup/prisma
```

### prisma.module.ts

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Makes PrismaService available globally without importing
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### prisma.service.ts

`PrismaService` loads the ESM-only runtime with `import('@prisma/orm-postgres/runtime')` at module init and reads the emitted contract. Gateways query `this.prisma.db.public.<Model>`; `transaction()` makes a unit of work ambient, so gateways take no `tx` parameter. The file is ~300 lines: take it from the kit rather than writing it.

```typescript
// how a gateway uses it
private get users() {
  return this.prisma.db.public.User;
}

const user = await this.users.first({ id });
```

### Slice models and the contract

Each slice owns its `*.prisma` at the slice root; `prisma.config.ts` globs them. There is no assembled `schema.prisma`, no `datasource`/`generator` block and no prisma-import.

**prisma.config.ts**:

```typescript
import { definePrismaConfig } from 'prisma/config';
import { defineConfig as definePostgresConfig } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: './src/slices/**/*.prisma',
    output: 'generated/prisma',
    migrations: { dir: 'prisma/migrations' },
    db: { connection: process.env['DATABASE_URL'] },
  }),
});
```

**src/slices/user/user/user.prisma**:

```prisma
// use prisma-8
model User {
  id        String   @id // minted by the gateway: formatId(USER_ID_PREFIX), never @default
  email     String   @unique
  name      String?
  teamId    String?
  team      Team?    @relation(fields: [teamId], references: [id])
  createdAt TimestamptzJsDate(3) @default(now())
  updatedAt temporal.timestamptzJsDate(3, onCreate: now, onUpdate: now)
}
```

### Package.json

Exact pins, the same in every CleanSlice project:

```json
{
  "dependencies": { "@prisma/orm-postgres": "8.0.0-rc.14", "pg": "8.23.1" },
  "devDependencies": { "prisma": "8.0.0-rc.19", "@types/pg": "8.23.1" },
  "overrides": {
    "@prisma/orm-toolchain": "8.0.0-rc.14",
    "@prisma/orm-framework": "8.0.0-rc.14"
  },
  "scripts": {
    "postinstall": "prisma contract emit --format human --quiet",
    "prisma:emit": "prisma contract emit --format human --quiet",
    "build": "prisma contract emit --format human --quiet && nest build",
    "predev": "bun run check && bun run docker && bun run db:deploy",
    "start:prod": "node scripts/migrate.mjs && node dist/main",
    "db:deploy": "node --env-file-if-exists=.env.dev --env-file-if-exists=.env scripts/migrate.mjs",
    "db:plan": "node --env-file-if-exists=.env.dev --env-file-if-exists=.env node_modules/prisma/dist/prisma.js migration plan --from deploy --format human",
    "test": "prisma contract emit --format human --quiet && NODE_OPTIONS=--experimental-vm-modules jest"
  }
}
```

**Workflow:**

1. Edit the slice's `.prisma` file, `bun run prisma:emit`
2. `bun run db:plan -- --name <what>`, review the plan, `bunx prisma migration ref set deploy <hash>`
3. `bun run db:deploy` (also run by `bun run dev`) applies it

## docker-compose.yml

Local development uses Docker for external services.

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres-local:
    image: postgres:latest
    container_name: cleanslice-postgres
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: root
      POSTGRES_DB: cleanslice-api-local-database
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  # Mailpit - catches every email the API sends; inbox at http://localhost:8025
  mail-local:
    image: axllent/mailpit:v1.31.4
    container_name: cleanslice-mail
    ports:
      - '127.0.0.1:1025:1025' # SMTP
      - '127.0.0.1:8025:8025' # Web UI
    environment:
      MP_MAX_MESSAGES: '500'
    healthcheck:
      test: ['CMD', '/mailpit', 'readyz']
      interval: 2s
      timeout: 3s
      retries: 30

  # Local S3-compatible storage
  s3-local:
    image: luofuxiang/local-s3:latest
    container_name: cleanslice-s3
    ports:
      - '19025:80'
    volumes:
      - s3-data:/data

  # Redis (optional - for caching/sessions)
  redis-local:
    image: redis:alpine
    container_name: cleanslice-redis
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  s3-data:
  redis-data:
```

### Usage

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f postgres-local

# Stop all services
docker-compose down

# Reset database (removes volume)
docker-compose down -v
```

## Environment Configuration

### .env.example

```bash
# ============================================
# APPLICATION
# ============================================
NODE_ENV=dev
PORT=3000
CORS_ORIGIN=http://localhost:3001,http://localhost:3002

# ============================================
# DATABASE (PostgreSQL)
# ============================================
DATABASE_URL=postgresql://postgres:root@localhost:5432/cleanslice-api-local-database

# ============================================
# STORAGE (S3)
# ============================================
S3_ENDPOINT=http://localhost:19025
S3_BUCKET_NAME=cleanslice-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=local
S3_SECRET_ACCESS_KEY=local

# ============================================
# AWS (Production)
# ============================================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# ============================================
# AI SERVICES
# ============================================
# OpenAI
OPENAI_API_KEY=

# AWS Bedrock
AWS_BEDROCK_REGION=us-east-1

# Cohere
COHERE_API_KEY=

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Cognito (if using AWS Cognito)
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
COGNITO_REGION=us-east-1

# ============================================
# EMAIL (SMTP) - locally Mailpit from docker-compose, inbox at http://localhost:8025
# ============================================
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=CleanSlice <noreply@cleanslice.local>

# ============================================
# EXTERNAL APIS
# ============================================
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ============================================
# MONITORING
# ============================================
SENTRY_DSN=
LOG_LEVEL=debug
```

### Environment Files

Create separate files for each environment:

- `.env.dev` - Local development
- `.env.staging` - Staging environment
- `.env.prod` - Production (never commit!)

```bash
# Copy example and configure
cp .env.example .env.dev

# Edit with your values
nano .env.dev
```

### ConfigService Usage

Access environment variables in services:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SomeService {
  constructor(private config: ConfigService) {}

  doSomething() {
    const dbUrl = this.config.get<string>('DATABASE_URL');
    const port = this.config.get<number>('PORT', 3000); // with default
  }
}
```

## tsconfig.json

Configure TypeScript with path aliases for clean slice imports.

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "es2017",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "resolveJsonModule": true,
    "paths": {
      "#": ["src/slices"],
      "#*": ["src/slices/*"]
    }
  },
  "exclude": ["node_modules", "cdktf.out", "dist"]
}
```

### Path Aliases

The `#` alias provides clean imports for slices:

```typescript
// Instead of relative paths
import { UserService } from '../../../slices/user/domain/user.service';
import { PrismaService } from '../../setup/prisma/prisma.service';

// Use clean aliases
import { UserService } from '#/user/domain/user.service';
import { PrismaService } from '#/setup/prisma/prisma.service';
```

**Key settings:**

| Path | Maps To | Usage |
|------|---------|-------|
| `#` | `src/slices` | `import x from '#'` |
| `#*` | `src/slices/*` | `import x from '#/user/...'` |

**Why `#` instead of `@`?**

- `@` is commonly used for scoped packages (`@nestjs/common`)
- `#` is unique and clearly indicates internal slice imports
- Avoids confusion with external dependencies

### Required for NestJS

These compiler options are required for NestJS decorators:

- `emitDecoratorMetadata: true` - Enables decorator metadata
- `experimentalDecorators: true` - Enables decorator syntax

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Copy environment file
cp .env.example .env.dev

# 3. Start Docker services
docker-compose up -d

# 4. Apply the database migrations (bun run dev also does it)
bun run db:deploy

# 5. Start development server
bun run dev

# 6. Open Swagger UI
open http://localhost:4229/api
```

## See Also

- [Setup App (Nuxt)](./setup-app.md) - Frontend setup
- [Repository Pattern](../03-patterns/repository.md) - Repository pattern with Prisma
- [Mail Setup (API)](../01-setup/api-mail.md) - Sending email; Mailpit as the local inbox
- [ID Setup (API)](../01-setup/api-id.md) - The one primary ID format and the slice that mints it
- [Error Pattern](../03-patterns/error.md) - Error handling setup
- [Controller Pattern](../03-patterns/controller.md) - API endpoints

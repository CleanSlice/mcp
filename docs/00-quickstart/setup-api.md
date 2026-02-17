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
│   │   │   └── health/
│   │   ├── user/
│   │   ├── team/
│   │   └── file/
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
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
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

import { AppModule } from './app.module';
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
      whitelist: true,        // Strip properties not in DTO
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

  const config = new DocumentBuilder()
    .setTitle('CleanSlice API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        description: 'JWT Bearer token',
        name: 'Authorization',
        bearerFormat: 'Bearer',
        scheme: 'Bearer',
        type: 'http',
        in: 'Header',
      },
      'defaultBearerAuth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API Key',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Export OpenAPI spec to file (for frontend SDK generation)
  fs.writeFileSync('swagger-spec.json', JSON.stringify(document));

  SwaggerModule.setup('api', app, document);

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

### Interceptor Order

The order of interceptors matters:

1. **ErrorHandlingInterceptor** - First, catches all errors from downstream
2. **ValidationPipe** - Validates incoming requests
3. **ResponseInterceptor** - Last, wraps successful responses

### Swagger Output

The `swagger-spec.json` file is generated on startup. This file is used by the frontend to generate a type-safe API client using `@hey-api/openapi-ts`.

## Prisma Slice

The Prisma slice provides database access to all other slices.

### Structure

```
slices/setup/prisma/
├── prisma.module.ts
├── prisma.service.ts
└── index.ts
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

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### prisma-import

Each slice can define its own Prisma schema fragment. The `prisma-import` tool merges them into a single `schema.prisma`.

**Install:**

```bash
npm install -D prisma-import
```

**prisma/schema.prisma** (base):

```prisma
// This is auto-generated by prisma-import. Do not edit manually.
import { schema } from "../src/slices/user/data/user.prisma"
import { schema } from "../src/slices/team/data/team.prisma"
import { schema } from "../src/slices/file/data/file.prisma"

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**src/slices/user/data/user.prisma**:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  teamId    String?
  team      Team?    @relation(fields: [teamId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "generate": "npx prisma-import --force",
    "premigrate": "npx prisma-import --force",
    "migrate": "dotenv -e .env.dev -- npx prisma migrate dev && dotenv -e .env.dev -- npx prisma generate",
    "migrate:prod": "dotenv -e .env.prod -- npx prisma migrate deploy",
    "studio": "dotenv -e .env.dev -- npx prisma studio"
  }
}
```

**Workflow:**

1. Edit slice-specific `.prisma` files
2. Run `npm run migrate` - merges schemas, creates migration, generates client
3. Use `npm run studio` to view data in Prisma Studio

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
# EMAIL (SMTP)
# ============================================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@example.com

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

- `@` is commonly used for scoped npm packages (`@nestjs/common`)
- `#` is unique and clearly indicates internal slice imports
- Avoids confusion with external dependencies

### Required for NestJS

These compiler options are required for NestJS decorators:

- `emitDecoratorMetadata: true` - Enables decorator metadata
- `experimentalDecorators: true` - Enables decorator syntax

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.dev

# 3. Start Docker services
docker-compose up -d

# 4. Run database migrations
npm run migrate

# 5. Start development server
npm run start:dev

# 6. Open Swagger UI
open http://localhost:3000/api
```

## See Also

- [Setup App (Nuxt)](./setup-app.md) - Frontend setup
- [Repository Pattern](../03-patterns/repository.md) - Repository pattern with Prisma
- [Error Pattern](../03-patterns/error.md) - Error handling setup
- [Controller Pattern](../03-patterns/controller.md) - API endpoints

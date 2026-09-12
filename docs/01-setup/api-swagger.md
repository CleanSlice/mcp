---
id: setup-api-swagger
title: Swagger Setup (API)
version: 1.1.0
last_updated: 2026-08-20

pattern: setup
complexity: fundamental
framework: nestjs
category: setup
applies_to: [backend, api]

tags:
  - swagger
  - openapi
  - documentation
  - nestjs
  - api-docs

keywords:
  - swagger setup
  - openapi documentation
  - nestjs swagger
  - api documentation
  - swagger decorators
  - operationId
  - swagger spec export
  - swagger:generate
  - stale openapi spec
  - dirty working tree

deprecated: false
experimental: false
production_ready: true
---

# Swagger Setup (API)

> **Swagger provides auto-generated API documentation** and exports an OpenAPI specification file (`swagger-spec.json`) that enables type-safe SDK generation for frontend applications.

---

## Overview

Swagger integrates with your NestJS API to provide **documentation and SDK generation**:

```
┌──────────────────────────────────────────────────────────────┐
│  NESTJS API                                                   │
│                                                               │
│  Controllers + DTOs + Swagger Decorators                      │
│  @ApiTags, @ApiOperation({ operationId }), @ApiProperty      │
└──────────────────────────────────────────────────────────────┘
                               │
                               │  buildOpenApiDocument(app)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  ONE DOCUMENT BUILDER                                         │
│  slices/setup/swagger/swagger.config.ts                       │
└──────────────────────────────────────────────────────────────┘
              │                                 │
              │  every boot                     │  only when you ask
              ▼                                 ▼
┌─────────────────────────┐      ┌─────────────────────────────┐
│  Swagger UI (/api)      │      │  swagger-spec.json          │
│  served by main.ts      │      │  bun run swagger:generate   │
│  - Interactive docs     │      │  - Committed to git         │
│  - Try endpoints        │      │  - Input for the app SDK    │
└─────────────────────────┘      └─────────────────────────────┘
```

Two callers, one builder. A published spec that disagrees with the running API
is worse than no spec, so neither caller is allowed its own `DocumentBuilder`.

**`swagger-spec.json` is a committed build artifact, not a runtime output.**
Starting the API serves the document; it never writes the file. See
[Exporting the Spec](#exporting-the-spec).

---

## Critical Rules

### 1. Every Endpoint MUST Have `operationId`

```typescript
// CORRECT
@ApiOperation({ summary: 'Get user by ID', operationId: 'getUserById' })

// WRONG - SDK will generate ugly names like "usersControllerGetUser"
@ApiOperation({ summary: 'Get user by ID' })
```

### 2. All DTOs MUST Have `@ApiProperty`

```typescript
// CORRECT
export class UserDto {
  @ApiProperty({ example: 'usr_123' })
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;
}

// WRONG - properties won't appear in Swagger schema
export class UserDto {
  id: string;
  email: string;
}
```

### 3. NEVER Write swagger-spec.json During Bootstrap

```typescript
// WRONG - starting the API modifies a file that is tracked in git
async function bootstrap() {
  const document = SwaggerModule.createDocument(app, config);
  fs.writeFileSync('swagger-spec.json', JSON.stringify(document));
  SwaggerModule.setup('api', app, document);
}

// CORRECT - bootstrap serves the document, a command writes the file
async function bootstrap() {
  SwaggerModule.setup('api', app, buildOpenApiDocument(app));
}
```

`swagger-spec.json` is committed, because the frontend generates its entire SDK
from it and has to build without a running API. A write in `bootstrap()`
therefore rewrites a **tracked file on every start**, into whatever directory
the process happened to be launched from.

The damage is not to the spec, it is to everyone else's `git status`: a file
nobody edited turns up modified, and it gets either committed by accident or
spends someone's afternoon being explained. Export it with
[`bun run swagger:generate`](#exporting-the-spec) instead.

---

## File Location & Naming

```
api/
├── src/
│   ├── main.ts                     # serves the document at /api
│   ├── swagger.ts                  # writes/checks the file (never runs on boot)
│   └── slices/
│       ├── setup/
│       │   └── swagger/
│       │       ├── swagger.config.ts   # the ONE DocumentBuilder
│       │       └── index.ts
│       ├── core/
│       │   └── decorators/
│       │       ├── ApiSingleResponse.ts
│       │       └── ApiPaginatedResponse.ts
│       └── user/
│           ├── user.controller.ts
│           └── dtos/
│               ├── user.dto.ts
│               └── createUser.dto.ts
└── swagger-spec.json               # committed artifact, written by command
```

---

## Installation

```bash
bun add @nestjs/swagger swagger-ui-express
```

---

## Complete Configuration Example

### `src/main.ts`

`main.ts` does one Swagger thing: it serves the document. The builder lives in
`slices/setup/swagger` ([below](#exporting-the-spec)), so the API and the
exported file can never describe different contracts.

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './slices/setup/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Served, not written. The file comes from `bun run swagger:generate`.
  SwaggerModule.setup('api', app, buildOpenApiDocument(app), {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3333);
}

bootstrap();
```

---

## Exporting the Spec

The document is built in one place and used by two callers: `main.ts` serves it,
and a dedicated entrypoint writes the file. Nothing else builds a document.

### `src/slices/setup/swagger/swagger.config.ts`

```typescript
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';

/**
 * The committed OpenAPI artifact, `api/swagger-spec.json`.
 *
 * Resolved from this file, NEVER from `process.cwd()`: the spec belongs to the
 * api package, not to whichever directory a command was started from. Four
 * levels up lands on `api/` from both `src/` and the compiled `dist/`, which
 * are the same depth.
 */
export const SWAGGER_SPEC_PATH = join(__dirname, '..', '..', '..', '..', 'swagger-spec.json');

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('REST API documentation')
    .setVersion('1.0')
    .addServer('/')
    .addBearerAuth(
      { type: 'http', in: 'header', scheme: 'bearer', bearerFormat: 'JWT' },
      'defaultBearerAuth',
    )
    .build();

  return SwaggerModule.createDocument(app, config);
}

/**
 * The exact bytes of the artifact. Generation and the staleness check share it,
 * so "up to date" means byte-identical and nothing softer.
 */
export function serializeOpenApiDocument(document: OpenAPIObject): string {
  return JSON.stringify(document);
}
```

`index.ts` next to it is the barrel both callers import from:

```typescript
export {
  buildOpenApiDocument,
  serializeOpenApiDocument,
  SWAGGER_SPEC_PATH,
} from './swagger.config';
```

### `src/swagger.ts` -- the explicit command

```typescript
import { NestFactory } from '@nestjs/core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

import { AppModule } from './app.module';
import {
  buildOpenApiDocument,
  serializeOpenApiDocument,
  SWAGGER_SPEC_PATH,
} from './slices/setup/swagger';

/**
 *   bun run swagger:generate   write the spec
 *   bun run swagger:check      fail if the committed spec is stale
 *
 * The app is created but never started: `NestFactory.create` alone is enough to
 * explore the routes, and it skips `onModuleInit`, so no queue worker or
 * scheduler comes up just to write a JSON file.
 */
async function main(): Promise<number> {
  const check = process.argv.includes('--check');
  const where = relative(process.cwd(), SWAGGER_SPEC_PATH) || SWAGGER_SPEC_PATH;

  const app = await NestFactory.create(AppModule, { logger: false });
  const spec = serializeOpenApiDocument(buildOpenApiDocument(app));
  await app.close();

  if (!check) {
    writeFileSync(SWAGGER_SPEC_PATH, spec);
    console.log(`wrote ${where}`);
    return 0;
  }

  const committed = existsSync(SWAGGER_SPEC_PATH) ? readFileSync(SWAGGER_SPEC_PATH, 'utf8') : null;
  if (committed === spec) {
    console.log(`${where} is up to date`);
    return 0;
  }

  console.error(
    `${where} is stale. Run \`bun run swagger:generate\` and commit the result ` +
      `(the frontend SDK is generated from this file).`,
  );
  return 1;
}

void main().then(
  // A Nest app leaves live redis/db sockets behind; without an explicit exit the
  // process would sit there with nothing left to do.
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
```

### `package.json`

```json
{
  "scripts": {
    "swagger:generate": "bun run build && node dist/swagger.js",
    "swagger:check": "bun run build && node dist/swagger.js --check"
  }
}
```

**Both build first, and that is not incidental.** The response schemas are
attached by the `@nestjs/swagger` CLI plugin declared in `nest-cli.json`, which
only runs during `nest build`. A document built by `ts-node` is missing most of
its DTOs.

### The Staleness Gate

`swagger:check` builds the document, compares it **byte for byte** with the
committed file and exits 1 if they differ. Two things follow from byte
comparison, and both are intended:

- A change that reorders the document without changing the contract still fails
  the check. That is correct: the committed bytes are what the SDK generator
  reads, so "different bytes" is exactly the condition that needs a regenerate.
- The check is deterministic. The same code produces the same bytes on every
  run, so a passing check today keeps passing until someone changes a route or
  a DTO.

Keep it out of the lint/build gate: it boots the Nest app, so it needs the API's
`.env`, which lint and build do not.

### Changing a Route or a DTO

The two artifacts are committed and neither refreshes itself:

```bash
cd api && bun run swagger:generate   # refresh the spec
cd app && bun run build:api          # refresh the SDK from that spec
git add api/swagger-spec.json app/slices/setup/api/data/repositories/api
```

Skip the second command and you have moved the problem, not fixed it:
`build:api` runs inside the app's `dev` and `build` scripts, so a stale
committed SDK means starting the frontend leaves a modified tracked file behind
-- the same dirty `git status`, one file over.

---

## Custom Response Decorators

### `slices/core/decorators/ApiSingleResponse.ts`

```typescript
import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class SingleModel<T> {
  public readonly data: T;

  @ApiProperty({ example: true })
  public readonly success: boolean;
}

export const ApiSingleResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(SingleModel, model),
    ApiOkResponse({
      description: 'Successfully received model',
      schema: {
        allOf: [
          { $ref: getSchemaPath(SingleModel) },
          { properties: { data: { $ref: getSchemaPath(model) } } },
        ],
      },
    }),
  );
};
```

### `slices/core/decorators/ApiPaginatedResponse.ts`

```typescript
import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class MetaListDto {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  lastPage: number;

  @ApiProperty({ example: 1 })
  currentPage: number;

  @ApiProperty({ example: 20 })
  perPage: number;

  @ApiProperty({ example: null, nullable: true })
  prev: number | null;

  @ApiProperty({ example: 2, nullable: true })
  next: number | null;
}

export class PaginationModel<T> {
  public readonly data: T[];

  @ApiProperty()
  public readonly meta: MetaListDto;
}

export const ApiPaginatedResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(PaginationModel, model),
    ApiOkResponse({
      description: 'Successfully received paginated list',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginationModel) },
          { properties: { data: { type: 'array', items: { $ref: getSchemaPath(model) } } } },
        ],
      },
    }),
  );
};
```

---

## Controller Examples

### Basic CRUD Controller

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { ApiSingleResponse, ApiPaginatedResponse } from '#core';
import { RoleService } from './domain/role.service';
import { CreateRoleDto, UpdateRoleDto, RoleDto } from './dtos';

@ApiTags('Roles')
@Controller('roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @ApiOperation({ summary: 'List all roles', operationId: 'getRoles' })
  @ApiPaginatedResponse(RoleDto)
  @Get()
  async getRoles() {
    return await this.roleService.getRoles();
  }

  @ApiOperation({ summary: 'Get role by ID', operationId: 'getRole' })
  @ApiParam({ name: 'id', description: 'Role unique identifier' })
  @ApiSingleResponse(RoleDto)
  @Get(':id')
  async getRole(@Param('id') id: string) {
    return await this.roleService.getRole(id);
  }

  @ApiOperation({ summary: 'Create a new role', operationId: 'createRole' })
  @ApiBody({ type: CreateRoleDto })
  @ApiSingleResponse(RoleDto)
  @Post()
  async createRole(@Body() data: CreateRoleDto) {
    return await this.roleService.createRole(data);
  }

  @ApiOperation({ summary: 'Update role', operationId: 'updateRole' })
  @ApiParam({ name: 'id', description: 'Role unique identifier' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiSingleResponse(RoleDto)
  @Put(':id')
  async updateRole(@Param('id') id: string, @Body() data: UpdateRoleDto) {
    return await this.roleService.updateRole(id, data);
  }

  @ApiOperation({ summary: 'Delete role', operationId: 'deleteRole' })
  @ApiParam({ name: 'id', description: 'Role unique identifier' })
  @Delete(':id')
  async deleteRole(@Param('id') id: string) {
    return await this.roleService.deleteRole(id);
  }
}
```

### Auth Controller with Advanced Decorators

```typescript
import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiSingleResponse, BaseErrorDto } from '#core';
import { Public } from './public.decorator';
import { User } from './user.decorator';
import { LoginUserDto, RegisterUserDto, AuthDto } from './dtos';
import { UserDto } from '../user/dtos';

@ApiTags('Auth')
@ApiBearerAuth('defaultBearerAuth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Get Current User', operationId: 'me' })
  @ApiSingleResponse(UserDto)
  @ApiResponse({ status: 401, description: 'Unauthorized', type: BaseErrorDto })
  @Get('/me')
  async getLoggedInUser(@User() user: any) {
    return user;
  }

  @Public()
  @ApiOperation({ summary: 'User Login', operationId: 'login' })
  @ApiBody({
    type: LoginUserDto,
    examples: {
      validCredentials: {
        summary: 'Valid credentials',
        value: { email: 'user@example.com', password: 'securePassword123' },
      },
    },
  })
  @ApiSingleResponse(AuthDto)
  @ApiResponse({ status: 400, description: 'Invalid credentials', type: BaseErrorDto })
  @Post('login')
  async login(@Body() data: LoginUserDto) {
    return await this.authService.login(data);
  }

  @Public()
  @ApiOperation({ summary: 'User Registration', operationId: 'register' })
  @ApiBody({ type: RegisterUserDto })
  @ApiSingleResponse(UserDto)
  @ApiResponse({ status: 409, description: 'User already exists', type: BaseErrorDto })
  @Post('register')
  async register(@Body() data: RegisterUserDto) {
    return await this.authService.register(data);
  }

  @Public()
  @ApiOperation({ summary: 'Confirm Email', operationId: 'confirmEmail' })
  @ApiQuery({ name: 'token', description: 'Confirmation token', required: true })
  @ApiQuery({ name: 'email', description: 'Email address', required: true })
  @Get('confirm')
  async confirm(@Query('token') token: string, @Query('email') email: string) {
    await this.authService.confirm(token, email);
    return { message: 'Email confirmed successfully' };
  }
}
```

---

## DTO Examples

### Response DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class RoleDto {
  @ApiProperty({ example: 'role_abc123' })
  id: string;

  @ApiProperty({ example: 'Admin' })
  name: string;

  @ApiProperty({ type: [String], example: ['users:read', 'users:write'] })
  permissions: string[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
```

### Request DTO with Validation

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, MinLength, ArrayMinSize } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Editor', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ type: [String], example: ['posts:read', 'posts:write'] })
  @IsArray()
  @ArrayMinSize(1)
  permissions: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior Editor' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  permissions?: string[];
}
```

---

## Swagger Decorator Reference

### Controller Decorators

| Decorator | Purpose | Required |
|-----------|---------|----------|
| `@ApiTags()` | Groups endpoints in Swagger UI | Yes |
| `@ApiBearerAuth()` | Marks controller as requiring JWT auth | When auth needed |
| `@ApiSecurity()` | Custom security scheme | When needed |

### Endpoint Decorators

| Decorator | Purpose | Required |
|-----------|---------|----------|
| `@ApiOperation()` | Describes endpoint with `operationId` | **Yes** |
| `@ApiResponse()` | Documents response status codes | Yes |
| `@ApiBody()` | Documents request body | For POST/PUT |
| `@ApiParam()` | Documents URL parameters | For params |
| `@ApiQuery()` | Documents query parameters | For queries |

### DTO Decorators

| Decorator | Purpose | Required |
|-----------|---------|----------|
| `@ApiProperty()` | Documents required property | Yes |
| `@ApiPropertyOptional()` | Documents optional property | For optional |
| `@ApiHideProperty()` | Hides property from schema | When needed |

---

## OperationId Naming Convention

| HTTP Method | Pattern | Example |
|-------------|---------|---------|
| `GET /users` | `get{Entities}` | `getUsers` |
| `GET /users/:id` | `get{Entity}ById` | `getUserById` |
| `POST /users` | `create{Entity}` | `createUser` |
| `PUT /users/:id` | `update{Entity}` | `updateUser` |
| `DELETE /users/:id` | `delete{Entity}` | `deleteUser` |
| `POST /users/:id/activate` | `{action}{Entity}` | `activateUser` |
| `GET /auth/me` | `{action}` | `me` |

---

## Checklist

### Initial Setup

- [ ] Install `@nestjs/swagger` and `swagger-ui-express`
- [ ] Put the `DocumentBuilder` in `slices/setup/swagger/swagger.config.ts`
- [ ] Add `SwaggerModule.setup()` in `main.ts` for the UI
- [ ] Add `src/swagger.ts` plus the `swagger:generate` / `swagger:check` scripts
- [ ] Commit `swagger-spec.json`, and confirm that starting the API leaves
      `git status --short` empty

### For Each Controller

- [ ] Add `@ApiTags()` with descriptive tag name
- [ ] Add `@ApiBearerAuth()` if auth required

### For Each Endpoint

- [ ] Add `@ApiOperation()` with `operationId` (REQUIRED)
- [ ] Add `@ApiResponse()` for success and error cases
- [ ] Add `@ApiParam()` for URL parameters
- [ ] Add `@ApiQuery()` for query parameters
- [ ] Add `@ApiBody()` for request body

### For Each DTO

- [ ] Add `@ApiProperty()` to all properties with `example` values
- [ ] Use `@ApiPropertyOptional()` for optional fields

### Never Do

- [ ] NO endpoints without `operationId`
- [ ] NO DTOs without `@ApiProperty` decorators
- [ ] NO missing error response documentation
- [ ] NO hardcoded examples that don't match schema
- [ ] NO writing `swagger-spec.json` from `bootstrap()` -- starting the API must
      never modify a tracked file
- [ ] NO second `DocumentBuilder` -- the served document and the exported file
      come from the same function
- [ ] NO paths resolved from `process.cwd()` -- the artifact belongs to the
      package, not to the directory the command was run from

---

## Related Documentation

- [Controller Pattern](../03-patterns/controller.md) - Controller architecture
- [App API Setup](./app-api.md) - Frontend SDK generation
- [DTO Pattern](../03-patterns/dto.md) - DTO best practices

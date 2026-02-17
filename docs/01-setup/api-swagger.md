---
id: setup-api-swagger
title: Swagger Setup (API)
version: 1.0.0
last_updated: 2025-12-19

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
                               │  On app bootstrap
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  SWAGGER MODULE                                               │
│                                                               │
│  1. Generates Swagger UI at /api                              │
│  2. Exports swagger-spec.json for SDK generation              │
└──────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
┌─────────────────────────┐      ┌─────────────────────────────┐
│  Swagger UI (/api)      │      │  swagger-spec.json          │
│  - Interactive docs     │      │  - Used by @hey-api/openapi │
│  - Try endpoints        │      │  - Generates TypeScript SDK │
└─────────────────────────┘      └─────────────────────────────┘
```

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

### 3. Export swagger-spec.json on Bootstrap

```typescript
fs.writeFileSync('swagger-spec.json', JSON.stringify(document));
```

---

## File Location & Naming

```
api/
├── src/
│   ├── main.ts
│   └── slices/
│       ├── core/
│       │   └── decorators/
│       │       ├── ApiSingleResponse.ts
│       │       └── ApiPaginatedResponse.ts
│       └── user/
│           ├── user.controller.ts
│           └── dtos/
│               ├── user.dto.ts
│               └── createUser.dto.ts
└── swagger-spec.json
```

---

## Installation

```bash
npm install @nestjs/swagger swagger-ui-express
```

---

## Complete Configuration Example

### `src/main.ts`

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('REST API documentation')
    .setVersion('1.0')
    .addServer('/')
    .addBearerAuth(
      { type: 'http', in: 'header', scheme: 'bearer', bearerFormat: 'JWT' },
      'defaultBearerAuth',
    )
    .addApiKey(
      { type: 'apiKey', name: 'api-key', in: 'header', description: 'API Key Authorization' },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  fs.writeFileSync('swagger-spec.json', JSON.stringify(document));
  await app.listen(process.env.PORT ?? 3333);
}

bootstrap();
```

---

## Modular Configuration (Recommended)

For better organization, extract Swagger config to a dedicated file:

### `src/config/swagger.config.ts`

```typescript
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import * as fs from 'fs';

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  path: string;
  exportPath?: string;
}

const defaultConfig: SwaggerConfig = {
  title: 'API Documentation',
  description: 'REST API documentation',
  version: '1.0',
  path: 'api',
  exportPath: 'swagger-spec.json',
};

export function setupSwagger(
  app: INestApplication,
  config: Partial<SwaggerConfig> = {},
): OpenAPIObject {
  const mergedConfig = { ...defaultConfig, ...config };

  const documentBuilder = new DocumentBuilder()
    .setTitle(mergedConfig.title)
    .setDescription(mergedConfig.description)
    .setVersion(mergedConfig.version)
    .addServer('/')
    .addBearerAuth(
      { type: 'http', in: 'header', scheme: 'bearer', bearerFormat: 'JWT' },
      'defaultBearerAuth',
    )
    .addApiKey(
      { type: 'apiKey', name: 'api-key', in: 'header', description: 'API Key Authorization' },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, documentBuilder);

  SwaggerModule.setup(mergedConfig.path, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  if (mergedConfig.exportPath) {
    fs.writeFileSync(mergedConfig.exportPath, JSON.stringify(document, null, 2));
  }

  return document;
}
```

### Updated `src/main.ts`

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  setupSwagger(app, {
    title: 'My API',
    description: 'API for my application',
    version: '1.0.0',
  });

  await app.listen(process.env.PORT ?? 3333);
}

bootstrap();
```

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
- [ ] Configure `DocumentBuilder` in `main.ts`
- [ ] Add `SwaggerModule.setup()` for UI
- [ ] Export `swagger-spec.json` for frontend SDK

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

---

## Related Documentation

- [Controller Pattern](../03-patterns/controller.md) - Controller architecture
- [App API Setup](./app-api.md) - Frontend SDK generation
- [DTO Pattern](../03-patterns/dto.md) - DTO best practices

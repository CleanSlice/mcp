---
id: controller-pattern
title: Controller Pattern
version: 1.0.0
last_updated: 2025-12-16

pattern: controller
complexity: fundamental
framework: nestjs
category: architecture
applies_to: [backend, api]

tags:
  - controller
  - presentation-layer
  - swagger
  - openapi
  - heyapi
  - sdk-generation
  - rest-api

keywords:
  - controller pattern
  - swagger decorators
  - operationId
  - hey-api
  - sdk generation
  - response interceptor
  - error handling

deprecated: false
experimental: false
production_ready: true
---

# Controller Pattern

> **The Controller is the entry point to your slice**. It handles HTTP requests, delegates to services, and returns responses. Controllers MUST use Swagger decorators with `operationId` for SDK generation compatibility.

---

## Overview

Controllers are the **presentation layer** of your slice:

```
┌──────────────────────────────────────────────────────────────┐
│  HTTP Request                                                 │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               v
┌──────────────────────────────────────────────────────────────┐
│  CONTROLLER (Presentation Layer)                              │
│  - Route handling                                             │
│  - Swagger documentation                                      │
│  - Input validation (via DTOs)                                │
│  - Response formatting (via setup/response interceptor)       │
│  - Calls SERVICE only (never gateway)                         │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               v
┌──────────────────────────────────────────────────────────────┐
│  SERVICE (Domain Layer)                                       │
│  - Business logic                                             │
│  - Error handling                                             │
└──────────────────────────────────────────────────────────────┘
```

---

## Critical Rules

### 1. Controllers ONLY Call Services

```typescript
// CORRECT - Controller calls service
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userService.getUserById(id);  // Service handles business logic
  }
}

// WRONG - Controller calls gateway directly
@Controller('users')
export class UserController {
  constructor(private readonly userGateway: IUserGateway) {}  // NEVER

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userGateway.findById(id);  // NEVER do this
  }
}
```

### 2. Every Endpoint MUST Have `operationId`

The `operationId` is **required** for SDK generation with `@hey-api/openapi-ts`:

```typescript
// CORRECT - Has operationId
@ApiOperation({
  summary: 'Get user by ID',
  operationId: 'getUserById',  // REQUIRED for SDK generation
})

// WRONG - Missing operationId
@ApiOperation({
  summary: 'Get user by ID',
  // Missing operationId - SDK will generate ugly names
})
```

### 3. No Business Logic in Controllers

```typescript
// WRONG - Business logic in controller
@Post()
async createUser(@Body() dto: CreateUserDto) {
  // Don't do validation/business logic here
  if (dto.email.includes('admin')) {
    throw new BadRequestException('Invalid email');
  }
  const normalizedEmail = dto.email.toLowerCase();
  // ...
}

// CORRECT - Delegate to service
@Post()
async createUser(@Body() dto: CreateUserDto) {
  return this.userService.createUser(dto);  // Service handles all logic
}
```

---

## File Location & Naming

```
slices/user/
├── user.controller.ts         # At ROOT of slice (not in presentation/)
├── user.module.ts
├── domain/
│   └── user.service.ts        # Controller calls this
├── data/
│   └── user.gateway.ts        # Controller NEVER calls this
└── dtos/
    ├── createUser.dto.ts
    └── userResponse.dto.ts
```

**Naming Convention:**
- File: `{entity}.controller.ts` (SINGULAR)
- Class: `{Entity}Controller` (SINGULAR)
- Route: `@Controller('{entities}')` (PLURAL)

---

## Complete Controller Example

```typescript
// @scope:api
// @slice:user
// @layer:presentation
// @type:controller

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

// Import service from domain layer
import { UserService } from './domain/user.service';

// Import DTOs
import { CreateUserDto } from './dtos/createUser.dto';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { UserResponseDto } from './dtos/userResponse.dto';
import { UserListResponseDto } from './dtos/userListResponse.dto';
import { PaginationQueryDto } from './dtos/paginationQuery.dto';

// Import response types from setup slice
import { IApiResponse, IPaginatedResponse } from '#setup/response';

/**
 * User controller
 *
 * Handles all user-related HTTP endpoints.
 * All responses are automatically wrapped by ResponseInterceptor.
 * All errors are handled by ErrorHandlingInterceptor.
 */
@ApiTags('Users')
@Controller('users')  // PLURAL route
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ============================================
  // CREATE
  // ============================================

  /**
   * Create a new user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user with the provided data',
    operationId: 'createUser',  // REQUIRED for @hey-api/openapi-ts
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    // Delegate to service - no business logic here
    return this.userService.createUser(dto);
  }

  // ============================================
  // READ - Single
  // ============================================

  /**
   * Get user by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves a single user by their unique identifier',
    operationId: 'getUserById',  // REQUIRED
  })
  @ApiParam({
    name: 'id',
    description: 'User unique identifier',
    example: 'usr_123abc',
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.getUserById(id);
  }

  // ============================================
  // READ - List with Pagination
  // ============================================

  /**
   * Get all users with pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieves a paginated list of users',
    operationId: 'getUsers',  // REQUIRED
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or email',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    type: UserListResponseDto,
  })
  async findAll(
    @Query() query: PaginationQueryDto
  ): Promise<IPaginatedResponse<UserResponseDto>> {
    return this.userService.getUsers(query);
  }

  // ============================================
  // UPDATE
  // ============================================

  /**
   * Update user by ID
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates an existing user with the provided data',
    operationId: 'updateUser',  // REQUIRED
  })
  @ApiParam({
    name: 'id',
    description: 'User unique identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.userService.updateUser(id, dto);
  }

  // ============================================
  // DELETE
  // ============================================

  /**
   * Delete user by ID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Permanently deletes a user',
    operationId: 'deleteUser',  // REQUIRED
  })
  @ApiParam({
    name: 'id',
    description: 'User unique identifier',
  })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.userService.deleteUser(id);
  }
}
```

---

## Swagger Decorators Reference

### Required Decorators

| Decorator | Purpose | Required |
|-----------|---------|----------|
| `@ApiTags()` | Groups endpoints in Swagger UI | Yes |
| `@ApiOperation()` | Describes endpoint with `operationId` | Yes |
| `@ApiResponse()` | Documents response types and status codes | Yes |

### Optional Decorators

| Decorator | Purpose |
|-----------|---------|
| `@ApiParam()` | Documents URL parameters |
| `@ApiQuery()` | Documents query parameters |
| `@ApiBody()` | Documents request body (usually inferred from DTO) |
| `@ApiBearerAuth()` | Marks endpoint as requiring authentication |
| `@ApiExcludeEndpoint()` | Hides endpoint from Swagger |

---

## Response Handling

### Automatic Response Wrapping

The `ResponseInterceptor` from `setup/response` automatically wraps all responses:

```typescript
// Controller returns raw data
@Get(':id')
async findOne(@Param('id') id: string) {
  return { id: '1', name: 'John', email: 'john@example.com' };
}

// ResponseInterceptor wraps it:
// {
//   "data": { "id": "1", "name": "John", "email": "john@example.com" },
//   "success": true
// }
```

### Response Types

From `setup/response/domain/response.types.ts`:

```typescript
/**
 * Standard API response wrapper
 */
interface IApiResponse<T> {
  data?: T;
  success: boolean;
  error?: string;
}

/**
 * Paginated response structure
 */
interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLastPage: boolean;
  success: boolean;
}
```

### Flat Response (Opt-Out)

Use `@FlatResponse()` decorator to return data without wrapping:

```typescript
import { FlatResponse } from '#setup/response';

@Get('raw')
@FlatResponse()  // Response NOT wrapped
async getRawData() {
  return { custom: 'structure' };
}
// Response: { "custom": "structure" }  (no wrapping)
```

---

## Error Handling

### Automatic Error Handling

The `ErrorHandlingInterceptor` from `setup/error` handles all errors automatically:

```typescript
// Service throws error
async getUserById(id: string): Promise<IUserData> {
  const user = await this.userGateway.findById(id);
  if (!user) {
    throw new UserNotFoundError(id);  // Thrown from service
  }
  return user;
}

// ErrorHandlingInterceptor catches and formats:
// {
//   "code": "USER_NOT_FOUND",
//   "statusCode": 404,
//   "message": "User with ID 'xyz' not found",
//   "timestamp": "2025-12-16T10:30:00.000Z",
//   "path": "/api/users/xyz"
// }
```

### Creating Domain Errors

Extend `BaseError` from `setup/error`:

```typescript
// slices/user/domain/errors/userNotFound.error.ts
import { BaseError, ErrorCodes } from '#setup/error';

export class UserNotFoundError extends BaseError {
  constructor(userId: string) {
    super(`User with ID '${userId}' not found`, 404);
    this.code = ErrorCodes.NOT_FOUND;
  }
}

export class UserAlreadyExistsError extends BaseError {
  constructor(email: string) {
    super(`User with email '${email}' already exists`, 409);
    this.code = ErrorCodes.CONFLICT;
  }
}
```

### Error Codes

From `setup/error/domain/error.types.ts`:

```typescript
enum ErrorCodes {
  // Generic errors
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',

  // Add domain-specific errors as needed
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
}
```

---

## OperationId Naming Convention

The `operationId` is used by `@hey-api/openapi-ts` to generate SDK method names:

| HTTP Method | operationId Pattern | SDK Method |
|-------------|--------------------| ------------|
| `GET /users` | `getUsers` | `client.getUsers()` |
| `GET /users/:id` | `getUserById` | `client.getUserById({ id })` |
| `POST /users` | `createUser` | `client.createUser({ body })` |
| `PUT /users/:id` | `updateUser` | `client.updateUser({ id, body })` |
| `DELETE /users/:id` | `deleteUser` | `client.deleteUser({ id })` |

### Naming Rules

```typescript
// Pattern: {verb}{Entity}[ByField]

// GET collection
operationId: 'getUsers'           // GET /users
operationId: 'getUserTasks'       // GET /users/:id/tasks

// GET single
operationId: 'getUserById'        // GET /users/:id
operationId: 'getUserByEmail'     // GET /users/email/:email

// POST
operationId: 'createUser'         // POST /users
operationId: 'createUserTask'     // POST /users/:id/tasks

// PUT/PATCH
operationId: 'updateUser'         // PUT /users/:id
operationId: 'patchUserProfile'   // PATCH /users/:id/profile

// DELETE
operationId: 'deleteUser'         // DELETE /users/:id

// Custom actions
operationId: 'activateUser'       // POST /users/:id/activate
operationId: 'resetUserPassword'  // POST /users/:id/reset-password
```

---

## DTO Integration

### Request DTOs

```typescript
// dtos/createUser.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;
}
```

### Response DTOs

```typescript
// dtos/userResponse.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'usr_123abc' })
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;
}
```

---

## Module Registration

```typescript
// user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './domain/user.service';
import { UserGateway } from './data/user.gateway';
import { TYPES } from './domain/user.gateway';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: TYPES.UserGateway,
      useClass: UserGateway,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
```

---

## Checklist

### Before Creating Controller

- [ ] Service exists in `domain/` layer
- [ ] DTOs defined in `dtos/` folder
- [ ] Response types defined (or using `IApiResponse<T>`)

### Controller Requirements

- [ ] File at ROOT of slice (not in `presentation/`)
- [ ] Metadata tags at top of file
- [ ] `@ApiTags()` decorator on class
- [ ] `@Controller()` with PLURAL route
- [ ] Constructor injects SERVICE only (never gateway)

### Every Endpoint Must Have

- [ ] `@ApiOperation()` with `operationId` (REQUIRED for SDK)
- [ ] `@ApiResponse()` for success case with DTO type
- [ ] `@ApiResponse()` for error cases
- [ ] `@ApiParam()` for URL params
- [ ] `@ApiQuery()` for query params
- [ ] Proper `@HttpCode()` for non-200 responses (201 for POST, 204 for DELETE)

### Never Do

- [ ] NO business logic in controller
- [ ] NO validation logic (use DTOs)
- [ ] NO direct gateway calls
- [ ] NO try/catch (use ErrorHandlingInterceptor)
- [ ] NO manual response wrapping (use ResponseInterceptor)

---

## Related Documentation

- [Layers Pattern](./layers.md) - Clean Architecture layers
- [Service Pattern](./service.md) - Domain services
- [Gateway Pattern](./gateway-pattern/README.md) - Data access abstraction
- [Types Pattern](./types.md) - Domain types and DTOs
- [Setup Slice - Response](./setup-slice/README.md) - Response interceptor
- [Setup Slice - Error](./setup-slice/README.md) - Error handling

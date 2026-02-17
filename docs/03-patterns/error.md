---
id: error-pattern
title: Error Pattern
version: 1.0.0
last_updated: 2025-12-16

pattern: error
complexity: fundamental
framework: nestjs
category: architecture
applies_to: [backend, api]

tags:
  - error
  - error-handling
  - exception
  - domain-error
  - base-error
  - interceptor
  - clean-architecture

keywords:
  - error pattern
  - domain errors
  - BaseError
  - error handling
  - error interceptor
  - error codes
  - http status

deprecated: false
experimental: false
production_ready: true
---

# Error Pattern

> **Errors are defined in the domain layer** and extend `BaseError` from the `setup/error` slice. They control negative behaviors in your application and can be thrown from services (domain layer) or gateways (data layer). Repository errors must be caught in the gateway and converted to domain errors. The error handling interceptor catches all errors and returns standardized responses.

---

## Overview

Errors flow through the application with automatic handling:

```
┌──────────────────────────────────────────────────────────────┐
│  CONTROLLER (Presentation Layer)                             │
│  - NO try/catch needed                                       │
│  - Just calls service methods                                │
│  - Errors automatically handled by interceptor               │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ errors bubble up
                           │
┌──────────────────────────┴───────────────────────────────────┐
│  SERVICE (Domain Layer)                                      │
│  - Throws domain errors (UserNotFoundError, etc.)            │
│  - Validates business rules                                  │
│  - Errors defined in domain/errors/                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ errors bubble up
                           │
┌──────────────────────────┴───────────────────────────────────┐
│  GATEWAY (Data Layer)                                        │
│  - Catches repository/external errors                        │
│  - Converts to domain errors                                 │
│  - Throws domain errors                                      │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ catches raw errors
                           │
┌──────────────────────────┴───────────────────────────────────┐
│  REPOSITORY (Black Box)                                      │
│  - Throws raw errors/exceptions                              │
│  - SDK errors, API errors, file system errors                │
│  - NOT domain errors (repository doesn't know domain)        │
└──────────────────────────────────────────────────────────────┘

                     ↓ All errors caught by ↓

┌──────────────────────────────────────────────────────────────┐
│  ERROR HANDLING INTERCEPTOR (setup/error)                    │
│  - Catches ALL errors globally                               │
│  - Formats standardized error response                       │
│  - Logs errors                                               │
│  - Returns proper HTTP status codes                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Setup Slice: Base Error Infrastructure

The `setup/error` slice provides the foundation:

```
slices/setup/error/
├── domain/
│   ├── base.error.ts          # BaseError class (extend this)
│   ├── error.types.ts         # ErrorCodes enum, IErrorResponse
│   └── domain.errors.ts       # Generic errors (ValidationError, etc.)
├── interceptors/
│   └── error-handling.interceptor.ts  # Global error handler
├── error.module.ts
└── index.ts
```

### BaseError Class

```typescript
// setup/error/domain/base.error.ts
import { HttpException } from '@nestjs/common';
import { ErrorCodes } from './error.types';

export abstract class BaseError extends HttpException {
  public code: ErrorCodes = ErrorCodes.UNEXPECTED_ERROR;
  public override cause: Error;

  constructor(
    message: string,
    statusCode: number = 500,
    options?: { cause?: Error }
  ) {
    super(message, statusCode, { cause: options?.cause });
    this.cause = options?.cause || new Error(message);
    this.name = this.constructor.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  getStatus(): number {
    return super.getStatus();
  }

  getCause(): Error {
    return this.cause || new Error('No cause provided');
  }

  getCode(): ErrorCodes {
    return this.code;
  }
}
```

### ErrorCodes Enum

```typescript
// setup/error/domain/error.types.ts
export enum ErrorCodes {
  // Generic errors
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',

  // Domain-specific errors (add yours here)
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_NOT_AUTHORIZED = 'USER_NOT_AUTHORIZED',
  USER_EXISTS = 'USER_EXISTS',
  USER_NOT_CONFIRMED = 'USER_NOT_CONFIRMED',
  USER_BANNED = 'USER_BANNED',
  USER_NOT_VERIFIED = 'USER_NOT_VERIFIED',

  // Framework errors
  FRAMEWORK_NOT_FOUND = 'FRAMEWORK_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
}

export interface IErrorResponse {
  code: string;
  statusCode: number;
  message: string;
  timestamp: string;
  path?: string;
  details?: unknown;
}
```

### Error Handling Interceptor

```typescript
// setup/error/interceptors/error-handling.interceptor.ts
import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';
import { Response } from 'express';
import { BaseError } from '../domain/base.error';
import { IErrorResponse } from '../domain/error.types';

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorHandlingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        const statusCode =
          error instanceof HttpException || error instanceof BaseError
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
          error.response?.message || error.message || 'An unexpected error occurred';

        const code =
          error instanceof BaseError
            ? error.getCode()
            : error.code || 'UNEXPECTED_ERROR';

        const errorResponse: IErrorResponse = {
          code,
          statusCode,
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        if (error.details) {
          errorResponse.details = error.details;
        }

        this.logger.error(
          `[${code}] ${message}`,
          error.stack,
          JSON.stringify({ path: request.url, method: request.method, statusCode })
        );

        response.status(statusCode).json(errorResponse);
        return throwError(() => error);
      })
    );
  }
}
```

---

## File Location & Naming

Domain errors live in the `domain/errors/` folder of each slice:

```
slices/user/
├── domain/
│   ├── user.types.ts
│   ├── user.service.ts
│   ├── user.gateway.ts
│   └── errors/                      # Errors folder
│       ├── index.ts                 # Re-exports all errors
│       ├── error.types.ts           # Slice-specific ErrorCodes
│       ├── userNotFound.error.ts
│       ├── userNotAuthorized.error.ts
│       ├── userExists.error.ts
│       └── userBanned.error.ts
└── data/
    └── user.gateway.ts
```

**Naming Convention:**

| Item | Format | Example |
|------|--------|---------|
| File | `{errorName}.error.ts` | `userNotFound.error.ts` |
| Class | `{ErrorName}Error` | `UserNotFoundError` |
| Error Code | `SCREAMING_SNAKE_CASE` | `USER_NOT_FOUND` |

---

## Creating Domain Errors

### Error with Dynamic Message

```typescript
// userNotFound.error.ts
import { BaseError } from '#setup/error';
import { ErrorCodes } from './error.types';
import { HttpStatus } from '@nestjs/common';

export class UserNotFoundError extends BaseError {
  public readonly code = ErrorCodes.USER_NOT_FOUND;

  constructor(userId: string, options?: { cause: Error }) {
    super(
      `User with ID '${userId}' was not found.`,
      HttpStatus.NOT_FOUND,
      options
    );
  }
}
```

### Error with Default Message

```typescript
// userNotAuthorized.error.ts
import { BaseError } from '#setup/error';
import { ErrorCodes } from './error.types';
import { HttpStatus } from '@nestjs/common';

export class UserNotAuthorizedError extends BaseError {
  public readonly code = ErrorCodes.USER_NOT_AUTHORIZED;

  constructor(message?: string, options?: { cause: Error }) {
    super(
      message ?? 'Username or password was incorrect.',
      HttpStatus.BAD_REQUEST,
      options
    );
  }
}
```

### Error with Details

```typescript
// validationError.error.ts
import { BaseError } from '#setup/error';
import { ErrorCodes } from './error.types';
import { HttpStatus } from '@nestjs/common';

export class ValidationError extends BaseError {
  public readonly code = ErrorCodes.VALIDATION_ERROR;
  public readonly details: unknown;

  constructor(message: string, details?: unknown, options?: { cause: Error }) {
    super(message, HttpStatus.BAD_REQUEST, options);
    this.details = details;
  }
}
```

---

## Throwing Errors

### In Services (Domain Layer)

Services throw domain errors for business rule violations:

```typescript
// domain/user.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { IUserGateway } from './user.gateway';
import { IUserData } from './user.types';
import { UserNotFoundError, ValidationError } from './errors';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserGateway')
    private readonly userGateway: IUserGateway,
  ) {}

  async getUser(id: string): Promise<IUserData> {
    if (!id) {
      throw new ValidationError('User ID is required.');
    }

    const user = await this.userGateway.getUser(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    return user;
  }
}
```

### In Gateways (Data Layer)

Gateways catch repository/external errors and convert to domain errors:

```typescript
// data/user.gateway.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '#prisma';
import { IUserGateway } from '../domain/user.gateway';
import { IUserData } from '../domain/user.types';
import { UserMapper } from './user.mapper';
import { UserNotFoundError, DatabaseError } from '../domain/errors';

@Injectable()
export class UserGateway implements IUserGateway {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: UserMapper,
  ) {}

  async getUser(id: string): Promise<IUserData | null> {
    try {
      const result = await this.prisma.user.findUnique({ where: { id } });
      return result ? this.mapper.toData(result) : null;
    } catch (error) {
      throw new DatabaseError('Failed to fetch user', { cause: error as Error });
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new UserNotFoundError(id);
      }
      throw new DatabaseError('Failed to delete user', { cause: error as Error });
    }
  }
}
```

---

## Controller - No Error Handling Needed

Controllers do NOT need try/catch. The interceptor handles everything:

```typescript
// user.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './domain/user.service';
import { UserDto, CreateUserDto } from './dtos';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ operationId: 'getUser' })
  async getUser(@Param('id') id: string): Promise<UserDto> {
    return this.userService.getUser(id);
  }

  @Post()
  @ApiOperation({ operationId: 'createUser' })
  async createUser(@Body() data: CreateUserDto): Promise<UserDto> {
    return this.userService.createUser(data);
  }
}
```

---

## Module Registration

### Setup Error Module

```typescript
// setup/error/error.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorHandlingInterceptor } from './interceptors/error-handling.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorHandlingInterceptor,
    },
  ],
})
export class ErrorModule {}
```

### App Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ErrorModule } from '#setup/error';
import { UserModule } from './slices/user/user.module';

@Module({
  imports: [
    ErrorModule,
    UserModule,
  ],
})
export class AppModule {}
```

---

## Error Response Format

All errors return a standardized response:

```json
{
  "code": "USER_NOT_FOUND",
  "statusCode": 404,
  "message": "User 'user-123' was not found.",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users/user-123"
}
```

---

## Index Export

```typescript
// domain/errors/index.ts
export * from './error.types';
export * from './userNotFound.error';
export * from './userNotAuthorized.error';
export * from './userExists.error';
export * from './userBanned.error';

// domain/index.ts
export * from './user.types';
export * from './user.service';
export * from './user.gateway';
export * from './errors';
```

---

## HTTP Status Code Reference

| Status | Usage | Example Errors |
|--------|-------|----------------|
| 400 | Bad Request | ValidationError, UserNotAuthorizedError |
| 401 | Unauthorized | UnauthorizedError |
| 403 | Forbidden | UserBannedError, UserNotConfirmedError |
| 404 | Not Found | UserNotFoundError, DocumentNotFoundError |
| 409 | Conflict | UserExistsError |
| 500 | Server Error | DatabaseError, UnexpectedError |

---

## Checklist

### BaseError Setup

- [ ] `setup/error` slice exists
- [ ] `BaseError` class extends `HttpException`
- [ ] `ErrorCodes` enum defined
- [ ] `IErrorResponse` interface defined
- [ ] `ErrorHandlingInterceptor` registered globally

### Domain Error Requirements

- [ ] File located in `domain/errors/` folder
- [ ] Named `{errorName}.error.ts` (camelCase)
- [ ] Class extends `BaseError`
- [ ] Has unique `code` from `ErrorCodes` enum
- [ ] Sets appropriate HTTP status code
- [ ] Has meaningful default message

### Error Throwing

- [ ] Services throw domain errors for business rules
- [ ] Gateways catch repository errors and convert to domain errors
- [ ] Controllers do NOT have try/catch (interceptor handles)
- [ ] Error cause is passed when converting errors

### Never Do

- [ ] NO try/catch in controllers
- [ ] NO raw `throw new Error()` in services
- [ ] NO repository errors leaking to domain layer
- [ ] NO hardcoded error messages (use error classes)

---

## Related Documentation

- [Service Pattern](./service.md) - Services throw domain errors
- [Gateway Pattern](./gateway.md) - Gateways convert repository errors
- [Repository Pattern](./repository.md) - Repositories throw raw errors
- [Controller Pattern](./controller.md) - Controllers don't handle errors

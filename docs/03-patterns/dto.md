---
id: dto-pattern
title: DTO Pattern
version: 1.0.0
last_updated: 2025-12-16

pattern: dto
complexity: fundamental
framework: nestjs
category: architecture
applies_to: [backend, api]

tags:
  - dto
  - data-transfer-object
  - presentation-layer
  - validation
  - swagger
  - class-validator
  - class-transformer

keywords:
  - dto pattern
  - request dto
  - response dto
  - create dto
  - update dto
  - filter dto
  - validation
  - ApiProperty
  - class-validator

deprecated: false
experimental: false
production_ready: true
---

# DTO Pattern

> **DTOs (Data Transfer Objects) define the shape of API requests and responses**. They live in the `dtos/` folder, implement domain interfaces, and handle validation (request) and serialization (response). DTOs are the contract between your API and its consumers.

---

## Overview

DTOs serve as the **boundary** between external clients and your application:

```
┌──────────────────────────────────────────────────────────────┐
│  CLIENT REQUEST                                              │
│  - JSON body from API consumer                               │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ validates
                           v
┌──────────────────────────────────────────────────────────────┐
│  REQUEST DTO (Presentation Layer)        <- YOU ARE HERE      │
│  - CreateUserDto, UpdateUserDto, FilterUserDto               │
│  - Validation decorators (@IsString, @IsEmail, etc.)         │
│  - Swagger decorators (@ApiProperty)                         │
│  - Implements domain interface                               │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ passes to
                           v
┌──────────────────────────────────────────────────────────────┐
│  CONTROLLER → SERVICE → GATEWAY                              │
│  - Business logic processes the data                         │
│  - Returns domain type (IUserData)                           │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ transforms to
                           v
┌──────────────────────────────────────────────────────────────┐
│  RESPONSE DTO (Presentation Layer)       <- YOU ARE HERE      │
│  - UserDto, UserResponseDto                                  │
│  - Swagger decorators for documentation                      │
│  - Optional transformation (@Transform)                      │
│  - Implements domain interface                               │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ serializes to
                           v
┌──────────────────────────────────────────────────────────────┐
│  CLIENT RESPONSE                                             │
│  - JSON response to API consumer                             │
└──────────────────────────────────────────────────────────────┘
```

---

## DTO Types

| Type | Purpose | Implements | Validation | Example |
|------|---------|------------|------------|---------|
| **Response DTO** | API response shape | `IUserData` | No | `UserDto` |
| **Create DTO** | Create request body | `ICreateUserData` | Yes | `CreateUserDto` |
| **Update DTO** | Update request body | `IUpdateUserData` | Yes | `UpdateUserDto` |
| **Filter DTO** | Query parameters | `IFilterUser` | Yes | `FilterUserDto` |

---

## Critical Rules

### 1. DTOs Must Implement Domain Interfaces

```typescript
// CORRECT - Implements domain interface
export class CreateUserDto implements ICreateUserData {
  @ApiProperty()
  @IsEmail()
  email: string;
}

// WRONG - No interface implementation
export class CreateUserDto {  // Missing implements
  @ApiProperty()
  @IsEmail()
  email: string;
}
```

### 2. Use @ApiProperty for Required, @ApiPropertyOptional for Optional

```typescript
// CORRECT
export class CreateUserDto {
  @ApiProperty()           // Required field
  @IsString()
  name: string;

  @ApiPropertyOptional()   // Optional field
  @IsString()
  @IsOptional()
  phone?: string;
}

// WRONG - Never use @ApiProperty({ required: false })
export class CreateUserDto {
  @ApiProperty({ required: false })  // NEVER DO THIS
  phone?: string;
}
```

### 3. Request DTOs MUST Have Validation Decorators

```typescript
// CORRECT - Validation decorators
export class CreateUserDto implements ICreateUserData {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}

// WRONG - No validation
export class CreateUserDto implements ICreateUserData {
  @ApiProperty()
  email: string;  // No validation!
}
```

### 4. Response DTOs Do NOT Need Validation

```typescript
export class UserDto implements IUserData {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdAt: Date;
}
```

### 5. NO @Expose() Decorator

```typescript
// WRONG - Using @Expose
export class UserDto {
  @Expose()  // NEVER use @Expose
  @ApiProperty()
  id: string;
}

// CORRECT - Just @ApiProperty
export class UserDto {
  @ApiProperty()
  id: string;
}
```

---

## File Location & Naming

```
slices/user/
├── domain/
│   └── user.types.ts       # IUserData, ICreateUserData, IUpdateUserData
├── dtos/                   # DTOs folder at slice root
│   ├── user.dto.ts         # Response DTO
│   ├── createUser.dto.ts   # Create request DTO
│   ├── updateUser.dto.ts   # Update request DTO
│   └── filterUser.dto.ts   # Filter/query DTO
└── user.controller.ts
```

**Naming Conventions:**

| DTO Type | File Name | Class Name |
|----------|-----------|------------|
| Response | `user.dto.ts` | `UserDto` |
| Create | `createUser.dto.ts` | `CreateUserDto` |
| Update | `updateUser.dto.ts` | `UpdateUserDto` |
| Filter | `filterUser.dto.ts` | `FilterUserDto` |

---

## Response DTO Example

Response DTOs define what the API returns. They implement the domain data interface and document the response shape with Swagger.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IApiKeyData } from '../domain';

export class ApiKeyDto implements IApiKeyData {
  @ApiProperty({ example: 'api-key-abc123' })
  id: string;

  @ApiProperty({ example: 'team-xyz789' })
  teamId: string;

  @ApiProperty({ example: 'Production API Key' })
  name: string;

  @ApiProperty({ example: 'secret-****-4567' })
  @Transform(({ value }) => maskSecret(value))
  secret: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  lastUsedAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

function maskSecret(key: string): string {
  return `${key.slice(0, 7)}****${key.slice(-4)}`;
}
```

---

## Create DTO Example

Create DTOs validate incoming data for creating new entities.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ICreateApiKeyData } from '../domain';

export class CreateApiKeyDto implements ICreateApiKeyData {
  // teamId injected from auth context, not in body
  teamId: string;

  @ApiProperty({ example: 'Production API Key' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;
}
```

---

## Update DTO Example

Update DTOs have optional fields for partial updates.

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { IUpdateApiKeyData } from '../domain';

export class UpdateApiKeyDto implements IUpdateApiKeyData {
  @ApiPropertyOptional({ example: 'Updated API Key Name' })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  name?: string;
}
```

---

## Filter DTO Example

Filter DTOs define query parameters for list/search endpoints.

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { IFilterApiKey, ApiKeyStatusTypes } from '../domain';

export class FilterApiKeyDto implements IFilterApiKey {
  // teamId injected from auth context
  teamId: string;

  @ApiPropertyOptional({ example: 'production' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ApiKeyStatusTypes, example: ApiKeyStatusTypes.Active })
  @IsOptional()
  @IsEnum(ApiKeyStatusTypes)
  status?: ApiKeyStatusTypes;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
```

---

## Common Validation Decorators

```typescript
import {
  IsString, IsNotEmpty, MinLength, MaxLength, Matches, IsEmail, IsUrl, IsUUID,
  IsNumber, IsInt, Min, Max, IsPositive,
  IsBoolean, IsEnum,
  IsArray, ArrayMinSize, ArrayMaxSize,
  IsDate, MinDate, MaxDate,
  IsOptional, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// --- String ---
@IsString() @IsNotEmpty() @MinLength(2) @MaxLength(50)
name: string;

@IsEmail()
email: string;

@IsString() @MinLength(8)
@Matches(/^(?=.*[A-Z])(?=.*[0-9])/, { message: 'Must contain uppercase and number' })
password: string;

@IsOptional() @IsUrl()
website?: string;

@IsUUID()
organizationId: string;

// --- Number ---
@IsNumber() @IsPositive()
price: number;

@IsInt() @Min(0) @Max(10000)
quantity: number;

@IsOptional() @IsInt() @Type(() => Number)  // query param string -> number
page?: number;

// --- Boolean ---
@IsOptional() @IsBoolean()
@Transform(({ value }) => value === 'true' || value === true)
isActive?: boolean;

// --- Array ---
@IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsString({ each: true })
tags: string[];

// --- Enum ---
@IsEnum(UserRoleTypes)
role: UserRoleTypes;

@IsOptional() @IsEnum(UserStatusTypes)
status?: UserStatusTypes;

// --- Date ---
@IsDate() @Type(() => Date) @MinDate(new Date())
startDate: Date;

// --- Nested Object ---
@ValidateNested() @Type(() => AddressDto)
address: AddressDto;
```

---

## Transformation with @Transform

Use `@Transform` from `class-transformer` to modify values during serialization.

### Masking Sensitive Data

```typescript
export class ApiKeyDto {
  @ApiProperty()
  @Transform(({ value }) => maskSecret(value))
  secret: string;
}

function maskSecret(key: string): string {
  if (!key || key.length < 12) return '****';
  return `${key.slice(0, 7)}****${key.slice(-4)}`;
}
```

### Trimming Whitespace

```typescript
export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;
}
```

---

## Using DTOs in Controllers

```typescript
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { ApiKeyService } from './domain/apiKey.service';
import { ApiKeyDto, CreateApiKeyDto, FilterApiKeyDto } from './dtos';

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  @ApiOperation({ operationId: 'getApiKeys', summary: 'List API keys' })
  @ApiOkResponse({ type: [ApiKeyDto] })
  async getApiKeys(@Query() filter: FilterApiKeyDto): Promise<ApiKeyDto[]> {
    return this.apiKeyService.getApiKeys(filter);
  }

  @Post()
  @ApiOperation({ operationId: 'createApiKey', summary: 'Create API key' })
  @ApiCreatedResponse({ type: ApiKeyDto })
  async createApiKey(@Body() data: CreateApiKeyDto): Promise<ApiKeyDto> {
    return this.apiKeyService.createApiKey(data);
  }
}
```

---

## Index Export Pattern

Export all DTOs from a single index file:

```typescript
// slices/api-key/dtos/index.ts
export * from './apiKey.dto';
export * from './createApiKey.dto';
export * from './updateApiKey.dto';
export * from './filterApiKey.dto';
```

---

## Checklist

### Response DTO Requirements

- [ ] File located in `dtos/` folder
- [ ] Named `{entity}.dto.ts` or `{entity}Response.dto.ts`
- [ ] Implements domain data interface (`IUserData`)
- [ ] `@ApiProperty()` on all fields
- [ ] `@ApiPropertyOptional()` for optional fields
- [ ] NO validation decorators
- [ ] NO `@Expose()` decorator
- [ ] Uses `@Transform()` for sensitive data if needed

### Request DTO Requirements (Create/Update/Filter)

- [ ] File named `create{Entity}.dto.ts`, `update{Entity}.dto.ts`, `filter{Entity}.dto.ts`
- [ ] Implements corresponding domain interface
- [ ] All fields have validation decorators
- [ ] `@ApiProperty()` for required fields
- [ ] `@ApiPropertyOptional()` for optional fields
- [ ] NO `@ApiProperty({ required: false })` - use `@ApiPropertyOptional`
- [ ] Update DTOs: all fields optional with `@IsOptional()`
- [ ] Filter DTOs: `@Type(() => Number)` for numeric query params

### Never Do

- [ ] NO `@Expose()` decorator
- [ ] NO `@ApiProperty({ required: false })`
- [ ] NO validation on response DTOs
- [ ] NO business logic in DTOs
- [ ] NO database calls in DTOs

---

## Related Documentation

- [Controller Pattern](./controller.md) - Controllers use DTOs
- [Types Pattern](./types.md) - Domain interfaces DTOs implement
- [Service Pattern](./service.md) - Services work with domain types from DTOs
- [Layers Pattern](./layers.md) - DTOs live in presentation layer

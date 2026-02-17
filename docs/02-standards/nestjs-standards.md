---
id: nestjs-standards
title: NestJS Standards
version: 1.0.0
last_updated: 2025-12-21

pattern: standards
complexity: fundamental
framework: nestjs
category: standards
applies_to: [backend, api]

tags:
  - nestjs
  - modules
  - controllers
  - services
  - gateways
  - dependency-injection
  - standards

keywords:
  - nestjs standards
  - modules
  - submodules
  - aws modules
  - controllers
  - gateways
  - mappers
  - dtos
  - guards

deprecated: false
experimental: false
production_ready: true
---

# NestJS Standards

> **Controllers delegate to Gateways, Gateways use Mappers**. Each slice is a module. Use abstract classes as DI tokens. AWS and other integrations are submodules.

---

## Critical Rules Summary

| Layer | Responsibility | Injects |
|-------|----------------|---------|
| Controller | HTTP endpoints, validation | `IEntityGateway` |
| Gateway (abstract) | Interface contract | - |
| Gateway (impl) | Business logic, Prisma queries | `PrismaService`, `Mapper` |
| Mapper | Data transformation | `ConfigService` (optional) |
| Service | Cross-module facade (optional) | `IEntityGateway` |

---

## 1. Module Structure

**Every slice is a NestJS module with this structure:**

```
slices/{slice}/
├── domain/
│   ├── index.ts              # Barrel exports
│   ├── {entity}.types.ts     # Interfaces and types
│   ├── {entity}.gateway.ts   # Abstract gateway class
│   └── {entity}.service.ts   # Optional service facade
├── data/
│   ├── {entity}.gateway.ts   # Concrete gateway implementation
│   └── {entity}.mapper.ts    # Data transformation
├── dtos/
│   ├── index.ts              # Barrel exports
│   ├── {entity}.dto.ts       # Response DTO
│   ├── create{Entity}.dto.ts # Create request DTO
│   ├── update{Entity}.dto.ts # Update request DTO
│   └── filter{Entity}.dto.ts # Query params DTO
├── {entity}.module.ts        # Module definition
├── {entity}.controller.ts    # HTTP endpoints
└── {entity}.guard.ts         # Optional guards
```

---

## 2. Module Definition

```typescript
// user.module.ts
@Module({
  imports: [PrismaModule],
  providers: [
    { provide: IUserGateway, useClass: UserGateway },  // Abstract → Concrete
    UserMapper,
    UserService,
  ],
  controllers: [UserController],
  exports: [
    { provide: IUserGateway, useClass: UserGateway },
    UserService,
  ],
})
export class UserModule {}
```

**Key rules:**
- Use `{ provide: IAbstract, useClass: Concrete }` for gateways
- Export what other modules need
- Import only required modules

---

## 3. Submodules Pattern (AWS Example)

**Parent module aggregates related submodules:**

```typescript
// aws/aws.module.ts
@Module({
  imports: [S3Module, CognitoModule, BedrockModule],
  exports: [S3Module, CognitoModule, BedrockModule],
})
export class AwsModule {}
```

**Individual submodule:**

```typescript
// aws/s3/s3.module.ts
@Module({
  providers: [S3Repository],
  exports: [S3Repository],
})
export class S3Module {}
```

**Submodule structure:**

```
slices/aws/
├── aws.module.ts          # Parent module
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

---

## 4. Controller Pattern

```typescript
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private userGateway: IUserGateway) {}  // Inject abstract

  @ApiOperation({ summary: 'Get users', operationId: 'getUsers' })
  @ApiPaginatedResponse(UserDto)
  @Get()
  async getUsers(@Query() query: FilterUserDto) {
    return await this.userGateway.getUsers(query);
  }

  @ApiOperation({ summary: 'Get user', operationId: 'getUser' })
  @ApiSingleResponse(UserDto)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return await this.userGateway.getUser(id);
  }

  @ApiOperation({ summary: 'Create user', operationId: 'createUser' })
  @ApiSingleResponse(UserDto)
  @Post()
  async createUser(@Body() data: CreateUserDto) {
    return await this.userGateway.createUser(data);
  }

  @ApiOperation({ summary: 'Update user', operationId: 'updateUser' })
  @ApiSingleResponse(UserDto)
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() data: UpdateUserDto) {
    return await this.userGateway.updateUser(id, data);
  }

  @ApiOperation({ summary: 'Delete user', operationId: 'deleteUser' })
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return await this.userGateway.deleteUser(id);
  }
}
```

**Controller rules:**
- Inject `IEntityGateway` (abstract), not concrete
- Use Swagger decorators on every endpoint
- Delegate all logic to gateway

---

## 5. Gateway Pattern

**Abstract gateway (domain/user.gateway.ts):**

```typescript
export abstract class IUserGateway {
  abstract getUsers(filter?: IUserFilter): Promise<{ data: IUserData[]; meta: IMetaResponse }>;
  abstract getUser(id: string): Promise<IUserData>;
  abstract createUser(data: ICreateUserData): Promise<IUserData>;
  abstract updateUser(id: string, data: IUpdateUserData): Promise<IUserData>;
  abstract deleteUser(id: string): Promise<boolean>;
}
```

**Concrete gateway (data/user.gateway.ts):**

```typescript
@Injectable()
export class UserGateway implements IUserGateway {
  constructor(
    private prisma: PrismaService,
    private map: UserMapper,
  ) {}

  async getUsers(filter?: IUserFilter) {
    const where: Prisma.UserWhereInput = {};
    if (filter?.email) where.email = { contains: filter.email, mode: 'insensitive' };

    const results = await this.prisma.user.findMany({
      where,
      take: filter?.perPage ?? 20,
      skip: ((filter?.page ?? 1) - 1) * (filter?.perPage ?? 20),
    });

    const total = await this.prisma.user.count({ where });

    return {
      data: results.map((r) => this.map.toData(r)),
      meta: {
        total,
        currentPage: filter?.page ?? 1,
        perPage: filter?.perPage ?? 20,
        lastPage: Math.ceil(total / (filter?.perPage ?? 20)),
      },
    };
  }

  async getUser(id: string) {
    const result = await this.prisma.user.findUnique({ where: { id } });
    return this.map.toData(result);
  }

  async createUser(data: ICreateUserData) {
    const result = await this.prisma.user.create({
      data: this.map.toCreate(data),
    });
    return this.map.toData(result);
  }

  async updateUser(id: string, data: IUpdateUserData) {
    const result = await this.prisma.user.update({
      where: { id },
      data: this.map.toUpdate(data),
    });
    return this.map.toData(result);
  }

  async deleteUser(id: string) {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## 6. Mapper Pattern

```typescript
@Injectable()
export class UserMapper {
  constructor(private config: ConfigService) {}

  toData(data: User): IUserData {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      roles: data.roles as RoleTypes[],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  toCreate(data: ICreateUserData): Prisma.UserCreateInput {
    return {
      id: `user-${uuid()}`,
      name: data.name,
      email: data.email,
      roles: data.roles,
      verified: this.config.get('IS_USER_VERIFIED') === 'true',
    };
  }

  toUpdate(data: IUpdateUserData): Prisma.UserUpdateInput {
    return {
      name: data.name,
      roles: data.roles,
      verified: data.verified,
    };
  }
}
```

**Mapper methods:**
- `toData()` - DB model → Domain interface
- `toCreate()` - Create DTO → Prisma create input
- `toUpdate()` - Update DTO → Prisma update input

---

## 7. DTO Pattern

**Response DTO:**

```typescript
export class UserDto implements IUserData {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: RoleTypes, isArray: true })
  roles: RoleTypes[];
}
```

**Create DTO:**

```typescript
export class CreateUserDto implements ICreateUserData {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: RoleTypes, isArray: true })
  @IsArray()
  @IsOptional()
  roles: RoleTypes[];
}
```

**Filter DTO:**

```typescript
export class FilterUserDto implements IUserFilter {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  perPage?: number = 20;
}
```

---

## 8. Types Pattern

```typescript
// domain/user.types.ts
export interface IUserData {
  id: string;
  name: string;
  email: string;
  roles: RoleTypes[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateUserData {
  name: string;
  email: string;
  roles?: RoleTypes[];
}

export interface IUpdateUserData {
  name?: string;
  roles?: RoleTypes[];
  verified?: boolean;
}

export interface IUserFilter {
  email?: string;
  page?: number;
  perPage?: number;
}

export enum RoleTypes {
  User = 'user',
  Admin = 'admin',
}
```

---

## 9. Guard Pattern

**Base guard class:**

```typescript
@Injectable()
export abstract class CoreGuard implements CanActivate {
  constructor(protected reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return this.handleAuth(context);
  }

  protected abstract handleAuth(context: ExecutionContext): Promise<boolean>;
}
```

**Auth guard:**

```typescript
@Injectable()
export class AuthGuard extends CoreGuard {
  constructor(
    private authGateway: IAuthGateway,
    reflector: Reflector,
  ) {
    super(reflector);
  }

  protected async handleAuth(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException();

    const payload = await this.authGateway.verifyToken(token);
    request['user'] = payload;
    return true;
  }
}
```

**Global guard registration:**

```typescript
@Module({
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
```

---

## 10. Custom Decorators

```typescript
// Public - skip auth
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Role - require specific role
export const ROLE_KEY = 'roles';
export const Role = (...roles: RoleTypes[]) => SetMetadata(ROLE_KEY, roles);

// User - extract authenticated user
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**Usage:**

```typescript
@Public()
@Post('login')
async login(@Body() data: LoginDto) {}

@Role(RoleTypes.Admin)
@Delete(':id')
async delete(@Param('id') id: string, @User() user: IUserData) {}
```

---

## 11. Conditional Providers

```typescript
@Module({
  providers: [
    {
      provide: IAuthGateway,
      useClass: process.env.AUTH_TYPE === 'cognito'
        ? CognitoAuthGateway
        : BasicAuthGateway,
    },
  ],
})
export class AuthModule {}
```

---

## 12. Slice Imports

```typescript
// Use # alias for cross-slice imports
import { IUserGateway, IUserData } from '#user/user/domain';
import { UserDto } from '#user/user/dtos';
import { PrismaModule } from '#prisma';
import { AwsModule } from '#aws';
```

**tsconfig.json paths:**

```json
{
  "compilerOptions": {
    "paths": {
      "#": ["src/slices"],
      "#*": ["src/slices/*"]
    }
  }
}
```

---

## 13. Barrel Exports

```typescript
// domain/index.ts
export * from './user.types';
export * from './user.gateway';
export * from './user.service';

// dtos/index.ts
export * from './user.dto';
export * from './createUser.dto';
export * from './updateUser.dto';
export * from './filterUser.dto';
```

---

## Checklist

### Module Structure

- [ ] Module uses `{ provide: IAbstract, useClass: Concrete }`
- [ ] Gateway is abstract class (not interface)
- [ ] Mapper handles all data transformation
- [ ] DTOs implement domain interfaces
- [ ] Barrel exports in `domain/index.ts` and `dtos/index.ts`

### Controller

- [ ] Injects abstract gateway `IEntityGateway`
- [ ] Has `@ApiTags()` decorator
- [ ] Every endpoint has `@ApiOperation({ operationId })`
- [ ] Uses `@ApiSingleResponse()` or `@ApiPaginatedResponse()`
- [ ] Delegates all logic to gateway

### Gateway

- [ ] Abstract class defines contract
- [ ] Concrete class implements abstract
- [ ] Uses mapper for all transformations
- [ ] Returns typed domain interfaces

### DTOs

- [ ] Response DTOs implement `I{Entity}Data`
- [ ] Create/Update DTOs implement `ICreate{Entity}Data`
- [ ] Has `@ApiProperty()` on every field
- [ ] Has validators (`@IsString()`, `@IsNotEmpty()`)
- [ ] Filter DTOs use `@Transform()` for type conversion

### Never Do

- [ ] NO business logic in controllers
- [ ] NO direct Prisma access in controllers
- [ ] NO TypeScript interfaces for DI tokens (use abstract classes)
- [ ] NO manual data transformation in gateways (use mappers)

---

## Related Documentation

- [TypeScript Standards](./ts-standards.md) - General TS rules
- [Controller Pattern](../03-patterns/controller.md) - Detailed controller docs
- [Gateway Pattern](../03-patterns/gateway.md) - Detailed gateway docs
- [Repository Pattern](../03-patterns/repository.md) - Data access patterns

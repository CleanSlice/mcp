---
id: api-id
title: ID Setup (API)
description: Install the setup/id slice that mints and validates every primary key identifier - formatId, withIdRetry, IsEntityId, EntityIdPipe, IdReservation - and wire feature slices to it.
version: 1.0.0
last_updated: 2026-10-25

pattern: setup
complexity: fundamental
framework: nestjs
category: setup
applies_to: [backend, api]

tags:
  - setup
  - id
  - identifier
  - primary-key
  - prisma
  - validation

keywords:
  - id slice
  - setup id
  - primary key setup
  - identifier setup
  - formatId
  - withIdRetry
  - IsEntityId
  - EntityIdPipe
  - IdReservation
  - human-id
  - nanoid

deprecated: false
experimental: false
production_ready: true
---

# ID Setup (API)

> **The `setup/id` slice is the one place that builds and checks primary keys.** Feature slices import `formatId`, `withIdRetry`, `IsEntityId`, `EntityIdPipe` and `IIdGateway` from `#setup/id`. The rules live in [Identifier Standards](../02-standards/id-standards.md); this page is how to install the slice.

---

## Structure

```
api/src/slices/setup/id/
├── id.module.ts                    # @Global; IIdGateway -> IdGateway
├── id.prisma                       # model IdReservation { id String @id }
├── id.validator.ts                 # entityId(), @IsEntityId(), EntityIdPipe
├── index.ts
├── README.md
├── domain/
│   ├── idFormat.ts                 # formatId, isId, isCanonicalId, LEGACY_ID_FORMATS, idPattern
│   ├── id.gateway.ts               # abstract IIdGateway { reserve(prefix) }
│   ├── index.ts
│   └── tests/idFormat.spec.ts      # control vector + every refused shape
└── data/
    ├── id.gateway.ts               # IdGateway: reserve() through IdReservation
    ├── idRetry.ts                  # withIdRetry, ID_MAX_ATTEMPTS
    └── tests/
        ├── idRetry.spec.ts
        └── id.gateway.spec.ts
```

`setup/prisma/prisma.errors.ts` adds `isUniqueViolation(error, columns?)`, which `withIdRetry` uses to recognise a Prisma 6 `P2002` on exactly `['id']`.

---

## 1. Dependencies (pinned exactly)

```bash
bun add human-id@4.1.3 nanoid@3.3.11
bun remove uuid @types/uuid       # nothing mints a UUID any more
```

```json
{
  "dependencies": {
    "human-id": "4.1.3",
    "nanoid": "3.3.11"
  }
}
```

No `^`. The dictionaries are the format; `idFormat.spec.ts` asserts the installed versions and the control vector `user-afraid-swans-nmkjhgfedcba`.

---

## 2. Copy the slice

Copy `api/src/slices/setup/id/` from the starter kit unchanged. `domain/idFormat.ts` must be byte-for-byte the shared module; the only thing a product edits in it is `LEGACY_ID_FORMATS`.

---

## 3. Register the module

```typescript
// app.module.ts
import { IdModule } from '#setup/id';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SetupModule,
    HealthModule,
    IdModule,          // global: IIdGateway is injectable everywhere
    MailModule,
    UserSliceModule,
  ],
})
export class AppModule {}
```

---

## 4. Migrate

`id.prisma` adds the reservation table. Merge the schemas and create the migration:

```bash
bun run migrate     # prisma-import --force && prisma migrate dev
```

```sql
-- CreateTable
CREATE TABLE "IdReservation" (
    "id" TEXT NOT NULL,
    CONSTRAINT "IdReservation_pkey" PRIMARY KEY ("id")
);
```

Existing models need no migration: their `id` column is already `TEXT`. Only the way new values are produced changes.

---

## 5. Wire a feature slice

**Prefix, next to the entity's types:**

```typescript
// slices/user/domain/user.types.ts
export const USER_ID_PREFIX = 'user';
```

**Model, no default:**

```prisma
model User {
  id String @id
}
```

**Gateway mints, mapper does not:**

```typescript
// data/user.gateway.ts
import { formatId, withIdRetry } from '#setup/id';

const user = await withIdRetry(() =>
  this.prisma.user.create({
    data: { id: formatId(USER_ID_PREFIX), ...this.mapper.toCreate(data) },
  }),
);
```

**Boundary:**

```typescript
// user.controller.ts
import { EntityIdPipe } from '#setup/id';

@Get(':id')
@ApiParam({ name: 'id', example: 'user-calm-rivers-k8m4p2d7n9x3' })
getUser(@Param('id', new EntityIdPipe(USER_ID_PREFIX)) id: string) {}

// dtos/moveFile.dto.ts
import { IsEntityId } from '#setup/id';

@IsEntityId(TEAM_ID_PREFIX)
teamId: string;

// dtos/user.dto.ts
import { idPattern } from '#setup/id';

@ApiProperty({ example: 'user-calm-rivers-k8m4p2d7n9x3', pattern: idPattern(USER_ID_PREFIX) })
id: string;
```

**Reservation before irreversible external work:**

```typescript
constructor(private readonly ids: IIdGateway) {}

const fileId = await this.ids.reserve(FILE_ID_PREFIX);   // before the business transaction
await this.storage.upload(fileId, body);
await this.fileGateway.create({ id: fileId, ...data });
```

---

## 6. Remove the old generators

```bash
grep -rn "uuid()\|cuid()\|randomUUID\|@default(uuid\|@default(cuid" src
```

Must be empty. A project that already issued `user-<uuid>` rows adds the `prefixed-uuid` entry to `LEGACY_ID_FORMATS` (see the standard) and nothing else; rewriting rows is a separate approved procedure.

---

## Testing

- `domain/tests/idFormat.spec.ts`: the control vector, the pinned versions, every refused shape, 10 000 round trips.
- `data/tests/idRetry.spec.ts`: retries only `P2002` on `['id']`, bounded at 5, never inside a transaction, never a look-alike error.
- `data/tests/id.gateway.spec.ts`: `reserve()` mints a fresh candidate on every attempt.
- `id.validator.spec.ts`: `@IsEntityId`, `EntityIdPipe`, `entityId`.
- Feature tests take a fake `IIdGateway` (`{ reserve: jest.fn() }`) and assert on `isCanonicalId(row.id, PREFIX)`.

---

## Checklist

- [ ] `human-id` 4.1.3 and `nanoid` 3.3.11 pinned exactly; `uuid` removed
- [ ] `setup/id` copied unchanged except `LEGACY_ID_FORMATS`
- [ ] `IdModule` registered in `app.module.ts`
- [ ] `IdReservation` migration created
- [ ] Every entity: `{ENTITY}_ID_PREFIX`, `id String @id`, gateway mints inside `withIdRetry`
- [ ] Every incoming id validated at the boundary
- [ ] `grep` for old generators is empty

---

## Related Documentation

- [Identifier Standards](../02-standards/id-standards.md) - The format, rules, legacy and transition
- [Prisma Setup (API)](./api-prisma.md) - Schema merging and migrations
- [Gateway Pattern](../03-patterns/gateway.md)
- [DTO Pattern](../03-patterns/dto.md)

---
id: id-standards
title: Identifier Standards (Primary IDs)
description: The one primary key id format for every entity - prefix, two words, 12 Crockford characters - minted by the gateway with formatId() and withIdRetry(); never uuid, cuid or a Prisma @default. How identifiers are validated in DTOs and route params, reserved before external work, and how legacy formats are declared.
version: 1.0.0
last_updated: 2026-10-25

pattern: standards
complexity: fundamental
framework: nestjs
category: standards
applies_to: [backend, api]

tags:
  - standards
  - id
  - identifier
  - primary-key
  - uuid
  - prisma
  - gateway
  - validation

keywords:
  - id
  - ids
  - identifier
  - identifiers
  - primary key
  - primary id
  - id format
  - uuid
  - cuid
  - "@default(uuid())"
  - "@default(cuid())"
  - randomUUID
  - formatId
  - withIdRetry
  - isId
  - entityId
  - IsEntityId
  - EntityIdPipe
  - id prefix
  - human-id
  - nanoid
  - crockford
  - legacy id
  - id migration

deprecated: false
experimental: false
production_ready: true
---

# Identifier Standards (Primary IDs)

> **Every primary key has one format, minted by the application, never by the database.** `formatId(prefix)` inside `withIdRetry` in the gateway; `@IsEntityId(prefix)` or `EntityIdPipe` at the boundary; `id String @id` in Prisma with **no** `@default`. No `uuid()`, no `cuid()`, no `randomUUID()`.

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   <prefix>-<adjective>-<noun>-<12 Crockford base32>             ║
║   user-calm-rivers-k8m4p2d7n9x3                                 ║
║                                                                 ║
║   Prisma:     id String @id            (no @default!)           ║
║   Gateway:    withIdRetry(() => prisma.user.create({            ║
║                 data: { id: formatId(USER_ID_PREFIX), ...rest } ║
║               }))                                               ║
║   DTO:        @IsEntityId(TEAM_ID_PREFIX) teamId: string        ║
║   Param:      @Param('id', new EntityIdPipe(USER_ID_PREFIX))    ║
║   Mapper:     never produces an id                              ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Why

- **Readable and self-describing.** The prefix names the entity: a log line, a ticket or a URL says what it points to without a lookup.
- **Enough entropy.** 60 bits in the suffix, ~16 more in the words. Uniqueness is the primary key's job, with a bounded retry.
- **One module, every product.** `setup/id/domain/idFormat.ts` is byte-for-byte the same everywhere; a control test vector proves a copy is exact.
- **The application mints.** The gateway knows the id before the row exists, can reserve it before an irreversible external effect, and a test can inject a deterministic byte source.

---

## The Format

| Part | Rule |
|------|------|
| `prefix` | The entity, lowercase kebab-case, `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, at most 32 characters, may itself contain `-` (`team-api-key`) |
| `adjective` | One of the 200 adjectives of **human-id 4.1.3**, in the package's order |
| `noun` | One of the 300 nouns of **human-id 4.1.3** |
| `suffix` | Exactly **12** lower-case Crockford base32 characters `0123456789abcdefghjkmnpqrstvwxyz` (no `i`, `l`, `o`, `u`); 60 bits |
| randomness | Node `crypto.randomBytes`; words by masked rejection, suffix by **nanoid 3.3.11** `customRandom` |
| uniqueness | The primary key; on collision the whole write is repeated, at most 5 times |
| length | Canonical at most 62 characters; any accepted value at most 80 (`ID_MAX_LENGTH`) |

Dependencies pinned exactly, no `^`: `"human-id": "4.1.3"`, `"nanoid": "3.3.11"`. A floating minor changes the dictionaries and with them every minted id; the suite asserts the installed versions.

---

## Prefix Registry

Each entity declares its prefix once, next to its domain types. The application owns the registry, not the `setup/id` slice:

```typescript
// slices/user/domain/user.types.ts
/** Primary ID prefix of the User entity: `user-<adjective>-<noun>-<12 Crockford>`. */
export const USER_ID_PREFIX = 'user';
```

- Whole model name in kebab-case: `OrganizationMember` → `organization-member`, `ApiKey` → `api-key`. A shortening (`org`) is a recorded decision.
- A hyphenated prefix is never ambiguous: three segments always follow the prefix, so `team-api-key-…` is never a `team` id and `isId(value, 'team')` refuses it.
- Never reused for another entity, never changed in place. Renaming is a migration.
- `formatId`, `isId` and the validators throw `TypeError` on a malformed prefix at build time, not on the first request.

---

## Generation (exact algorithm)

`formatId(prefix, random = crypto.randomBytes)` reads from `random(n)` in this order:

1. **adjective** — `index(200)`
2. **noun** — `index(300)`
3. **suffix** — nanoid 3.3.11 `customRandom(ID_SUFFIX_ALPHABET, 12, random)()` from the same source

`index(n)`: the fewest whole bytes that hold `n − 1`, read big-endian, masked to the bit length of `n − 1`, drawn again while not below `n`.

| n | bits | bytes per try | mask | accepted when |
|---|------|---------------|------|---------------|
| 200 | 8 | 1 | 255 | value < 200 |
| 300 | 9 | 2 | 511 | (b0·256 + b1) & 511 < 300 |

nanoid asks for `ceil(1.6 × 31 × 12 / 32)` = **19** bytes in one request, reads them from the last one back, keeps `byte & 31` of each, stops after 12 letters.

### Control test vector

Bytes `0, 1, 2, 3, …` in order:

```
formatId('user', counter) === 'user-afraid-swans-nmkjhgfedcba'   // 22 bytes read
```

`adjectives[0]` = `afraid`; `258 & 511` → `nouns[258]` = `swans`; bytes 21…10 → `nmkjhgfedcba`. Every product's suite asserts this string. A different result is not a valid copy of the module.

---

## Prisma Models

```prisma
model User {
  id        String   @id        // minted by the gateway: formatId(USER_ID_PREFIX)
  email     String   @unique
  createdAt DateTime @default(now())
}
```

No `@default(uuid())`, `@default(cuid())` or `autoincrement()` on a primary key. Foreign keys are plain `String` columns validated with the owner's prefix.

---

## Minting in the Gateway

```typescript
// data/user.gateway.ts
import { formatId, withIdRetry } from '#setup/id';
import { USER_ID_PREFIX } from '../domain/user.types';

async createUser(data: ICreateUserData): Promise<IUserData> {
  const createData = this.mapper.toCreate(data);          // everything but the id
  const user = await withIdRetry(() =>
    this.prisma.user.create({
      data: { id: formatId(USER_ID_PREFIX), ...createData },
    }),
  );
  return this.mapper.toData(user);
}
```

`formatId` is called **inside** the callback: every attempt is a new candidate. The mapper's `toCreate` returns no id.

---

## Retry Rules

`withIdRetry(work, insideTransaction = false)`:

- Repeats `work` at most **5** times (`ID_MAX_ATTEMPTS`), only for a unique violation on exactly the `id` column: Prisma 6 `P2002` with `meta.target` `['id']`. Everything else is rethrown on the first attempt.
- **Inside `$transaction`, pass `insideTransaction = true`.** A failed statement aborts the PostgreSQL transaction; its owner repeats the whole unit of work.
- **External effects stay outside `work`.** The callback is one database write.
- A duplicate `email` is a domain error for the service, not a reason to mint again.

---

## Validation

`isId(value, prefix)` = canonical form **or** a declared legacy format. Format check only: no lookup, no authorization, no normalization (upper case, Unicode look-alikes, percent-encoded dashes, whitespace are refused, not cleaned).

```typescript
// DTO field
@IsEntityId(TEAM_ID_PREFIX)
teamId: string;

// route / query parameter
@Get(':id')
getUser(@Param('id', new EntityIdPipe(USER_ID_PREFIX)) id: string) {}

// anywhere else (zod, custom pipe): the check itself
z.string().refine(entityId('artifact'));

// OpenAPI
@ApiProperty({ example: 'user-calm-rivers-k8m4p2d7n9x3', pattern: idPattern(USER_ID_PREFIX) })
id: string;
```

Refused as canonical: a third word, a 6- or 20-character suffix, hex of another length, `i`/`l`/`o`/`u` in the suffix, a word outside the dictionaries, a UUID, a cuid. Twelve hex digits are a subset of Crockford, so `…-a1b2c3d4e5f6` is canonical.

---

## Reservation Before Irreversible Work

`IIdGateway.reserve(prefix)` burns an identity in its own committed statement (table `IdReservation`) so that an S3 key, a provider-side record or a webhook secret can carry it before the business row exists. Failed operations do not recycle ids. Call it **before** opening the business transaction.

```typescript
const fileId = await this.ids.reserve(FILE_ID_PREFIX);
await this.storage.upload(fileId, body);            // external, irreversible
await this.fileGateway.create({ id: fileId, ...data }); // the row
```

---

## Legacy Formats and the Transition

`LEGACY_ID_FORMATS` in `idFormat.ts` is the only part of the module that differs between products: formats the product has **already issued** and keeps accepting. Nothing in it is ever minted. A fresh project has an empty list.

A project scaffolded before this standard holds `user-<uuid>` rows and declares exactly that:

```typescript
export const LEGACY_ID_FORMATS: readonly ILegacyIdFormat[] = Object.freeze([
  {
    name: 'prefixed-uuid',
    shape: '<prefix>-<lower-case UUID> (before the ID standard)',
    prefixed: true,
    segments: 5,
    test: (s) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s.join('-')),
  },
]);
```

**Rewriting issued ids is a separate, explicitly approved maintenance procedure**, never implied by adopting the standard: inventory every reference (columns, JSON, provider references, idempotency keys); stop writers, back up, restore-check; one transaction per entity type that records the mapping (`entity`, `oldId`, `newId`), rewrites the key and every reference, and revokes sessions or signed contexts embedding the old value; repeat runs change zero identities; no HTTP aliases for old paths. See [Migrations and Evidence](../architecture/migrations-and-evidence.md).

---

## Checklist

- [ ] `human-id` 4.1.3 and `nanoid` 3.3.11 pinned exactly; suite asserts `user-afraid-swans-nmkjhgfedcba`
- [ ] Every model: `id String @id`, no `@default(uuid())`, `cuid()`, `autoincrement()`
- [ ] Every entity declares `{ENTITY}_ID_PREFIX` next to its domain types
- [ ] Gateways mint with `formatId(prefix)` **inside** `withIdRetry`; mappers never produce an id
- [ ] Every incoming id checked with `@IsEntityId(prefix)`, `EntityIdPipe` or `entityId(prefix)`
- [ ] Irreversible external work uses `IIdGateway.reserve`
- [ ] `LEGACY_ID_FORMATS` lists only what the product has already issued

### Never Do

- [ ] NO `@default(uuid())`, `@default(cuid())`, `randomUUID()`, `uuid()` for a primary key
- [ ] NO `formatId` outside the retried callback
- [ ] NO normalizing an incoming id before checking it
- [ ] NO accepting an id without a prefix (`isId(value, prefix)`)
- [ ] NO rewriting issued ids as a side effect of a deploy

---

## Related Documentation

- [ID Setup (API)](../01-setup/api-id.md) - Installing the `setup/id` slice
- [Gateway Pattern](../03-patterns/gateway.md) - Where ids are minted
- [Mapper Pattern](../03-patterns/mapper.md) - Mappers never produce an id
- [DTO Pattern](../03-patterns/dto.md) - Where ids are validated
- [Prisma Setup (API)](../01-setup/api-prisma.md) - Models and migrations

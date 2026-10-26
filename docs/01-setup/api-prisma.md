---
id: setup-api-prisma
title: Prisma Setup (API)
version: 2.0.0
last_updated: 2026-10-26

pattern: setup
complexity: fundamental
framework: nestjs
category: setup
applies_to: [backend, api]

tags:
  - prisma
  - prisma-8
  - database
  - postgresql
  - orm
  - migrations
  - transactions
  - raw-sql
  - slices
  - docker

keywords:
  - prisma setup
  - prisma 8
  - prisma.config.ts
  - prisma contract emit
  - contract
  - slice prisma files
  - PrismaService
  - prisma.db.public
  - gateway query
  - raw sql
  - rawRows
  - rawExecute
  - transaction
  - migration plan
  - db migrate
  - db:deploy
  - migrate.mjs
  - deploy ref
  - unique violation
  - SQLSTATE
  - upgrade prisma 6
  - prisma 6 to prisma 8
  - docker compose

deprecated: false
experimental: false
production_ready: true
---

# Prisma Setup (API)

> **CleanSlice runs on Prisma 8.** Each slice owns its `*.prisma` file; `prisma.config.ts` globs them into one **contract**, which `prisma contract emit` writes to `generated/prisma` (gitignored). There is no assembled `schema.prisma`, no `datasource`/`generator` block, no `prisma generate`, no prisma-import. Gateways query `this.prisma.db.public.<Model>`; migrations are TypeScript plans applied forward only by one entrypoint, `bun run db:deploy`. PostgreSQL only.

The [starter kit](https://github.com/CleanSlice/nest-nuxt-starter-kit) is the reference: `api/prisma.config.ts`, `api/scripts/migrate.mjs`, `api/src/slices/setup/prisma/`. Copy from it rather than writing these files by hand.

---

## Overview

```
┌──────────────────────────────────────────────────────────────┐
│  SLICE PRISMA FILES (at the slice root)                       │
│                                                               │
│  slices/user/user/user.prisma     ← User model                │
│  slices/team/team/team.prisma     ← Team, Membership          │
│  slices/setup/id/id.prisma        ← IdReservation             │
└──────────────────────────────────────────────────────────────┘
                               │  prisma.config.ts: './src/slices/**/*.prisma'
                               │  bun run prisma:emit  (postinstall, build, dev, test)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  generated/prisma/contract.json + contract.d.ts  (gitignored) │
└──────────────────────────────────────────────────────────────┘
          │                                        │
          │ PrismaService reads it at start        │ bun run db:plan
          ▼                                        ▼
   this.prisma.db.public.User          prisma/migrations/app/<ts>_<name>/
                                       (migration.ts + ops.json + migration.json)
                                                   │ bun run db:deploy
                                                   ▼
                                               PostgreSQL
```

---

## Critical Rules

1. **Every slice model file starts with `// use prisma-8`** and lives at the slice root as `{slice}.prisma`, never in `domain/` or `data/`.
2. **No assembled schema.** Do not create `prisma/schema.prisma`, a `datasource` or `generator` block, or install `prisma-import`/`@prisma/client`. The connection is `DATABASE_URL`, read by `prisma.config.ts` and `PrismaService`.
3. **The contract is generated.** `generated/prisma/` is gitignored and emitted by `postinstall`, `build`, `dev`, `typecheck` and `test`. Builds, typechecks and tests emit first; never commit it.
4. **Gateways are the only code that queries Prisma.** Domain types never mention Prisma; mappers convert `PrismaRow<'User'>` to domain types.
5. **Primary keys have no database default.** `id String @id`; the gateway mints it with `formatId(prefix)` inside `withIdRetry` (see [ID Setup](./api-id.md)). Never `@default(uuid())`, `cuid()` or `autoincrement()` for an entity ID.
6. **Migrations are forward only and applied by one entrypoint**: `bun run db:deploy` → `scripts/migrate.mjs`, used by `bun run dev`, the test global setup and the Docker start alike.
7. **Pin exact versions.** All Prisma packages carry the same pins in every CleanSlice project (below), no carets; `bun.lock` is committed.

---

## Installation

### Versions

| Package | Version | Where |
|---------|---------|-------|
| `@prisma/orm-postgres` | `8.0.0-rc.14` | `dependencies` (runtime) |
| `prisma` | `8.0.0-rc.19` | `devDependencies` (CLI) |
| `@prisma/orm-toolchain` | `8.0.0-rc.14` | `overrides` |
| `@prisma/orm-framework` | `8.0.0-rc.14` | `overrides` |
| `pg` / `@types/pg` | `8.23.1` | migration scripts, test setup |

```bash
bun add --exact @prisma/orm-postgres@8.0.0-rc.14 pg@8.23.1
bun add --exact --dev prisma@8.0.0-rc.19 @types/pg@8.23.1
```

### `package.json`

```json
{
  "engines": { "node": ">=22.18" },
  "scripts": {
    "postinstall": "prisma contract emit --format human --quiet",
    "prisma:emit": "prisma contract emit --format human --quiet",
    "build": "prisma contract emit --format human --quiet && nest build",
    "typecheck": "prisma contract emit --format human --quiet && tsc --noEmit -p tsconfig.json",
    "predev": "bun run check && bun run docker && bun run db:deploy",
    "dev": "export PORT=${PORT:-4229}; prisma contract emit --format human --quiet && cross-env NODE_ENV=dev nest start --watch",
    "start:prod": "node scripts/migrate.mjs && node dist/main",
    "docker": "docker compose up -d --wait",
    "db:deploy": "node --env-file-if-exists=.env.dev --env-file-if-exists=.env scripts/migrate.mjs",
    "db:status": "node --env-file-if-exists=.env.dev --env-file-if-exists=.env node_modules/prisma/dist/prisma.js migration status --to deploy --format human",
    "db:plan": "node --env-file-if-exists=.env.dev --env-file-if-exists=.env node_modules/prisma/dist/prisma.js migration plan --from deploy --format human",
    "db:verify": "node --env-file-if-exists=.env.dev --env-file-if-exists=.env node_modules/prisma/dist/prisma.js db verify --format human",
    "test": "prisma contract emit --format human --quiet && NODE_OPTIONS=--experimental-vm-modules jest"
  },
  "trustedDependencies": ["bcrypt", "esbuild", "prisma"],
  "overrides": {
    "@prisma/orm-toolchain": "8.0.0-rc.14",
    "@prisma/orm-framework": "8.0.0-rc.14"
  }
}
```

`trustedDependencies` replaces Bun's default allow-list, so list every package whose install script you need (`bcrypt` in the kit).

### `prisma.config.ts`

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

`DATABASE_URL` is optional here, so `contract emit` works without a database.

### `tsconfig.json`

The runtime is **ESM-only**; the Nest build stays CommonJS. `nodenext` lets the build load the runtime with a real `import()` and its types with `resolution-mode`:

```jsonc
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "isolatedModules": true,       // ts-jest requires it under nodenext
    "rootDir": "./src"
    // ...
  },
  "include": ["src/**/*"],          // prisma.config.ts and the plans run on their own
  "exclude": ["node_modules", "dist", "generated"]
}
```

### `.gitignore`

```
generated/
```

### Docker Compose (local)

```yaml
services:
  postgres-local:
    image: postgres:18
    ports:
      - '4230:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: root
      POSTGRES_DB: cleanslice-api-local-database
    volumes:
      # for postgres:18, the volume must be a directory, not a file
      - ./docker/postgresql:/var/lib/postgresql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5
```

```bash
# .env.dev
DATABASE_URL=postgresql://postgres:root@localhost:4230/cleanslice-api-local-database
```

In production `DATABASE_URL` comes from the environment (Terraform, a Kubernetes secret, the platform). Any managed PostgreSQL works: RDS, Neon, Supabase.

---

## Slice Models

```prisma
// use prisma-8
// api/src/slices/user/user/user.prisma
model User {
  id        String   @id // user-<adjective>-<noun>-<12 Crockford>, minted by the gateway
  email     String   @unique
  name      String
  password  String
  roles     String[]
  verified  Boolean  @default(false)
  createdAt TimestamptzJsDate(3) @default(now())
  updatedAt temporal.timestamptzJsDate(3, onCreate: now, onUpdate: now)
}
```

Relations need no import: every slice file is part of the same contract.

```prisma
// use prisma-8
// api/src/slices/team/team/team.prisma
model Team {
  id        String       @id
  name      String
  members   Membership[]
  createdAt TimestamptzJsDate(3) @default(now())
}

model Membership {
  id     String @id
  teamId String
  userId String
  role   String
  team   Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
  @@index([userId])
}
```

| Prisma 6 | Prisma 8 | Reads/writes as |
|----------|----------|-----------------|
| `DateTime @default(now())` | `TimestamptzJsDate(3) @default(now())` | `Date` (column `timestamptz(3)`) |
| `DateTime @updatedAt` | `temporal.timestamptzJsDate(3, onCreate: now, onUpdate: now)` | `Date` |
| `Json` | `Jsonb` | `JsonValue` |
| `Decimal @db.Decimal(12, 2)` | `Numeric(12, 2)` | decimal string |
| `DateTime @db.Date` | `DateString` | `'YYYY-MM-DD'` |
| `String[]` | `String[]` | `readonly string[]`, `NOT NULL` |
| `enum Role { … }` | `String` + a domain union/enum | `string` |

Keep the Prisma 6 table and column names when upgrading, so raw SQL reads the same. The model for this exact version is in `node_modules/@prisma/orm-postgres/skills/prisma-8/references/contract.md`.

---

## The Prisma Slice

```
api/src/slices/setup/prisma/
├── prisma.module.ts      # @Global(): every gateway injects PrismaService
├── prisma.service.ts     # the connection, db, transaction(), raw SQL
├── prisma.types.ts       # PrismaRow / PrismaCreate / PrismaUpdate, raw SQL types
├── prisma.errors.ts      # isUniqueViolation, sqlState, … (SQLSTATE, not P2002)
├── tests/prisma.service.e2e-spec.ts
├── README.md
└── index.ts              # exported as #setup/prisma
```

`PrismaService` (copy it from the kit) loads the runtime with `import('@prisma/orm-postgres/runtime')` at module init, reads `generated/prisma/contract.json`, and exposes:

| Member | Use |
|--------|-----|
| `db.public.<Model>` | the ORM, inside the current transaction if one is open |
| `transaction(work, options?)` | one unit of work; nested calls join; retries 40001/40P01; times out |
| `inTransaction` | true inside `transaction()` (pass it to `withIdRetry`) |
| `sql` | the raw SQL tag; `${value}` is always a bound parameter |
| `rawRows(q)` / `rawExecute(q)` | run `.returnsRow({...})` / `.affectedCount()` statements |
| `param(value, codecId)` | a parameter whose codec cannot be inferred (null, `Date`, arrays, JSON) |
| `join`, `verbatim`, `condition` | `Prisma.join`, `Prisma.raw` (trusted text only), a raw predicate in `.where` |
| `rawExecuteUnsafe(text)` | trusted text without parameters: DDL, `TRUNCATE`, `SET LOCAL` |
| `and` / `or` / `not` | combinators for `.where((m) => …)` |
| `PrismaService.open({ url })` / `close()` | a client outside Nest: scripts, test setup |

`prisma.types.ts` derives the names mappers use, because Prisma 8 generates no `User` or `Prisma.UserCreateInput`:

```typescript
import type { PrismaCreate, PrismaRow, PrismaUpdate } from '#setup/prisma';

toData(user: PrismaRow<'User'>): IUserData { … }
toCreate(data: ICreateUserData): Omit<PrismaCreate<'User'>, 'id'> { … }
toUpdate(data: IUpdateUserData): PrismaUpdate<'User'> { … }
```

---

## Using PrismaService in Gateways

```typescript
// src/slices/user/user/data/user.gateway.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '#setup/prisma';
import { formatId, withIdRetry } from '#setup/id';
import { IUserGateway } from '../domain/user.gateway';
import { IUserData, ICreateUserData, IUpdateUserData, USER_ID_PREFIX } from '../domain/user.types';
import { UserNotFoundError } from '../domain/user.errors';
import { UserMapper } from './user.mapper';

@Injectable()
export class UserGateway extends IUserGateway {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: UserMapper,
  ) {
    super();
  }

  private get users() {
    return this.prisma.db.public.User;
  }

  async getUser(id: string): Promise<IUserData | null> {
    const user = await this.users.first({ id });
    return user ? this.mapper.toData(user) : null;
  }

  async createUser(data: ICreateUserData): Promise<IUserData> {
    const createData = this.mapper.toCreate(data);
    const user = await withIdRetry(
      () => this.users.create({ id: formatId(USER_ID_PREFIX), ...createData }),
      this.prisma.inTransaction,
    );
    return this.mapper.toData(user);
  }

  async updateUser(id: string, data: IUpdateUserData): Promise<IUserData> {
    const changes = this.mapper.toUpdate(data);
    // Nothing to write is a read: an empty update answers null.
    const user =
      Object.keys(changes).length === 0
        ? await this.users.first({ id })
        : await this.users.where({ id }).update(changes);
    if (!user) throw new UserNotFoundError(id); // Prisma 6 threw P2025; Prisma 8 answers null
    return this.mapper.toData(user);
  }

  async deleteUser(id: string): Promise<IUserData> {
    const user = await this.users.where({ id }).delete();
    if (!user) throw new UserNotFoundError(id);
    return this.mapper.toData(user);
  }
}
```

### Query cheat sheet

```typescript
const users = this.prisma.db.public.User;

await users.first({ id });                                         // Row | null
await users.where({ verified: true }).all();                      // equality shorthand
await users.where((u) => u.email.ilike(`%${likeLiteral(q)}%`)).all();
await users.where((u) => this.prisma.or(u.name.ilike(p), u.email.ilike(p))).all();
await users.select('id', 'email').orderBy([(u) => u.createdAt.desc(), (u) => u.id.desc()])
  .offset((page - 1) * perPage).limit(perPage).all();
await users.aggregate((a) => ({ n: a.count() }));                 // { n: number }
await this.prisma.db.public.Team.include('members').first({ id });
await users.where({ id }).update({ name });                        // Row | null
await users.where({ id }).delete();                                // Row | null
await users.upsert({ create: { … }, update: { … }, conflictOn: { email } }); // default: the primary key
```

- Operators on the field proxy: `.eq`, `.neq`, `.lt`, `.lte`, `.gt`, `.gte`, `.like`, `.ilike`, `.in([...])`, `.isNull()`, `.isNotNull()`. There is no `.between`, no `contains`/`mode: 'insensitive'`: use `ilike`, and escape `%`, `_` and `\` in user input (`value.replace(/[\\%_]/g, '\\$&')`).
- There is no `.count()` terminal: `aggregate((a) => ({ n: a.count() }))`.
- `.all()` has no implicit limit; `.first()` for one row.
- Take `and` / `or` / `not` from `PrismaService`, not from `@prisma/orm-postgres/orm-client`: that module is ESM-only and a static import breaks Jest.
- A JSON path, an array membership or anything else the proxy cannot say: `.where(() => this.prisma.condition\`${role} = ANY("roles")\`)`.

### Errors

Prisma 8 surfaces the database's own error (`SqlQueryError` with `sqlState`, the `pg` error with `constraint`/`detail` down the `cause` chain), not `PrismaClientKnownRequestError`. Use the helpers from `#setup/prisma`:

```typescript
try {
  return await this.users.create({ id, ...data });
} catch (error) {
  if (isUniqueViolation(error, ['email'])) throw new UserExistsError(data.email);
  throw error;
}
```

| Prisma 6 | Prisma 8 helper | SQLSTATE |
|----------|-----------------|----------|
| `P2002` + `meta.target` | `isUniqueViolation(e, columns?)`, `uniqueViolationColumns(e)` | `23505` |
| `P2003` | `isForeignKeyViolation(e)` | `23503` |
| `P2034` | `isRetryable(e)` | `40001`, `40P01` |
| `P2025` (record not found) | none: `update`/`delete` answer `null` | |

---

## Raw SQL

For what the ORM cannot express: `FOR UPDATE SKIP LOCKED`, `ON CONFLICT … DO UPDATE` over many rows, advisory locks. Every `${value}` is a bound parameter.

```typescript
// Rows: name each column's codec.
const rows = await this.prisma.rawRows(
  this.prisma.sql`
    SELECT "id", "email" FROM "User"
    WHERE "verified" = ${true} AND "createdAt" > ${this.prisma.param(since, 'pg/timestamptz-date@1')}
    FOR UPDATE SKIP LOCKED`.returnsRow({ id: 'pg/text@1', email: 'pg/text@1' }),
);

// A statement without rows: the affected count.
const n = await this.prisma.rawExecute(
  this.prisma.sql`UPDATE "User" SET "verified" = true WHERE "id" = ${id}`.affectedCount(),
);
```

| Prisma 6 | Prisma 8 |
|----------|----------|
| `$queryRaw\`…\`` | `rawRows(sql\`…\`.returnsRow({ col: 'pg/text@1' }))` |
| `$executeRaw\`…\`` | `rawExecute(sql\`…\`.affectedCount())` |
| `$executeRawUnsafe(text)` | `rawExecuteUnsafe(text)` (no parameters) |
| `Prisma.join(list)` | `join(fragments)`, each `sql\`…\`.returns('pg/text@1')` |
| `Prisma.raw(text)` | `verbatim(text)` (trusted text only) |
| `Prisma.sql` fragment | `sql\`…\`.returns(codecId)` |

Common codecs: `pg/text@1`, `pg/int4@1`, `pg/int8@1` (bigint), `pg/bool@1`, `pg/jsonb@1`, `pg/timestamptz-date@1`. A bare string, number, bigint, boolean or `Uint8Array` infers its codec; `null`, `Date`, arrays and JSON go through `param(value, codecId)`.

---

## Transactions

```typescript
await this.prisma.transaction(async () => {
  const team = await this.teamGateway.create(data);          // gateways need no tx parameter
  await this.membershipGateway.add(team.id, ownerId, 'owner');
});
```

- **Ambient.** `transaction()` parks the transaction in an `AsyncLocalStorage`; `db` and the raw helpers answer with it. A gateway does not opt in and cannot forget to; no Prisma type reaches a domain signature. The callback also receives the transaction's models (`async (db) => db.User.create(…)`).
- **Nested calls join** the transaction in progress (no savepoints): every caller wants all or nothing.
- **Retries.** The outermost one re-runs the whole callback on a serialization failure or deadlock (`maxRetries`, default 2), so the callback must have no side effects outside the database.
- **Timeout.** `timeoutMs` (default 30 s) rolls back with `TransactionTimeoutError`; a connection is awaited for at most 10 s.
- **Isolation.** `{ isolationLevel: TransactionIsolationLevel.Serializable }`.
- **No batched form.** Prisma 6's `$transaction([a, b])` does not exist; use the callback (or `Promise.all` outside one for independent reads).
- **IDs.** Inside a transaction `withIdRetry(work, this.prisma.inTransaction)`: a collision aborts the transaction, so its owner repeats the unit.

Where a transaction boundary belongs across slices: [Transactions across slices](../architecture/transactions.md).

---

## Migrations

TypeScript plans under `prisma/migrations/app/<timestamp>_<name>/` (`migration.ts` + `ops.json` + `migration.json`), contract snapshots under `prisma/migrations/snapshots/`, and the ref `prisma/migrations/app/refs/deploy.json`: the contract the next deploy brings a database to. `prisma/migrations/package.json` is `{ "type": "module" }`. All of it is committed.

### A new change

```bash
# 1. edit the slice's .prisma
bun run prisma:emit
# 2. plan from the deploy ref (the last shipped contract); prints the DDL
bun run db:plan -- --name add_team
# 3. review prisma/migrations/app/<ts>_add_team/ops.json
# 4. SQL the planner cannot say: a guarded rawSql step in migration.ts, then
node prisma/migrations/app/<ts>_add_team/migration.ts      # self-emit ops.json + migration.json
# 5. point the deploy ref at the plan's "to" hash
bunx prisma migration ref set deploy <hash>
# 6. apply
bun run db:deploy
```

`migration.ts` is rendered by the planner: edit only its `operations` (add steps, fill `placeholder(...)` slots), never the import line. A hand-written step:

```typescript
rawSql({
  id: 'user-email-lower', label: 'Case-insensitive unique email',
  operationClass: 'additive', target: { id: 'postgres' },
  precheck: [{ description: 'not there yet', sql: `SELECT to_regclass('public."User_email_lower"') IS NULL AS result`, params: [] }],
  execute: [{ description: 'create index', sql: `CREATE UNIQUE INDEX "User_email_lower" ON "User" (lower("email"))`, params: [] }],
  postcheck: [{ description: 'index exists', sql: `SELECT to_regclass('public."User_email_lower"') IS NOT NULL AS result`, params: [] }],
} as never),
```

### Applying: `scripts/migrate.mjs`

The one way a database is brought up to date, used by `bun run dev` (`predev`), the test global setup and the container start:

```javascript
// api/scripts/migrate.mjs
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const say = (line) => console.error(`migrate: ${line}`);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: apiDir, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${[command, ...args].join(' ')} exited with ${result.status ?? result.signal}`);
  }
}

function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  say('applying database migrations');
  // The CLI's own entry, run by this node: the runtime image has no Bun and no npx.
  const cli = join(apiDir, 'node_modules', 'prisma', 'dist', 'prisma.js');
  run(process.execPath, [cli, 'db', 'migrate', '--to', 'deploy', '--format', 'human']);
  say('done');
}

try {
  main();
} catch (error) {
  say(`failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
```

Applied plans are skipped, so a second run is a no-op. `bun run db:status` shows what is pending; `bun run db:verify` checks the database against the contract.

### A new project

The kit ships one plan, `init`, and the `deploy` ref. A project that starts from an empty graph plans its first migration the same way: `bunx prisma migration plan --name init` plans from an empty database, then `migration ref set deploy <hash>`.

---

## Docker

```dockerfile
# build stage (node:22-alpine with the bun binary copied in)
COPY api/package.json api/bun.lock ./
# postinstall (contract emit) needs the slices' *.prisma files, copied only below
RUN bun install --frozen-lockfile --ignore-scripts
COPY api/ ./
RUN bun run build          # emits the contract, then nest build

# runtime stage
COPY --from=api-builder /build/api/dist ./api/dist
COPY --from=api-builder /build/api/node_modules ./api/node_modules        # includes the prisma CLI
COPY --from=api-builder /build/api/package.json /build/api/prisma.config.ts ./api/
COPY --from=api-builder /build/api/generated ./api/generated              # PrismaService reads it
COPY --from=api-builder /build/api/prisma/migrations ./api/prisma/migrations
COPY --from=api-builder /build/api/scripts/migrate.mjs ./api/scripts/
COPY --from=api-builder /build/api/src/slices ./api/src/slices            # the contract source
RUN find ./api/src -type f ! -name '*.prisma' -delete && find ./api/src -type d -empty -delete
```

The start script runs `node scripts/migrate.mjs` before `node dist/main.js`. Keep `**/*.tsbuildinfo` in `.dockerignore`: a local incremental build-info file makes `nest build` in the image emit nothing.

---

## Tests

- `bun run test` (never `bun test`): `prisma contract emit && NODE_OPTIONS=--experimental-vm-modules jest`. The runtime is loaded with a real `import()`, which Jest only allows under that flag.
- ts-jest uses the project tsconfig (`"transform": { "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": "<rootDir>/../tsconfig.json" }] }`) with `isolatedModules: true`.
- Database specs run against **PostgreSQL**, never SQLite. A Jest `globalSetup` drops and recreates a dedicated database whose name must contain `test` (it refuses anything else), then runs `scripts/migrate.mjs`; a `setupFiles` entry points `DATABASE_URL` at it. `maxWorkers: 1` when suites share that database.
- Construct gateways on a real client: `const prisma = await PrismaService.open(); new UserGateway(prisma, new UserMapper())`; `prisma.close()` in `afterAll`; `TRUNCATE` in `beforeEach`.
- Unit specs that fake a database error use the Prisma 8 shape: `Object.assign(new Error('duplicate key'), { sqlState: '23505', detail: 'Key (id)=(x) already exists.' })`.

The kit's `api/test/globalSetup.cjs`, `api/test/env.cjs` and `src/slices/setup/prisma/tests/prisma.service.e2e-spec.ts` are the reference.

---

## Upgrading a Prisma 6 project

A project generated before 2026-10-26 runs Prisma 6 with prisma-import. The upgrade is the one Agentfy made (AGNT2-540, also Securify and Store Deputy); the full, tested procedure with every script is in **[Upgrading a Prisma 6 project](./api-prisma-upgrade.md)**. In short:

1. Deploy the last Prisma 6 release everywhere, so every database is at the same last Prisma 6 migration.
2. Swap the packages (`@prisma/client`, `prisma-import` and the `"prisma"` block out; the pins above in), add `prisma.config.ts`, switch `tsconfig` to `nodenext`, gitignore `generated/`.
3. Rewrite each slice `*.prisma` to `// use prisma-8` with the **same table and column names**; delete the datasource/generator file and `prisma/schema.prisma`.
4. Replace the Prisma slice with the kit's (`prisma.service.ts`, `prisma.types.ts`, `prisma.errors.ts`), then port gateways, mappers, raw SQL and transactions.
5. Archive the Prisma 6 migrations in `prisma/prisma6/`, plan a **baseline**, add the hand-written SQL and the **copy step** to it, and run `scripts/prisma6Aside.mjs` from `scripts/migrate.mjs`: an existing database is set aside into a schema and copied into the new tables in one transaction, with row counts checked. No data is lost; the old copy stays until you drop it.
6. Move tests to `--experimental-vm-modules` and a rebuilt test database; update the Dockerfile and the start command.

---

## Checklist

### New model
- [ ] `{slice}.prisma` at the slice root, first line `// use prisma-8`
- [ ] `id String @id`, no default; timestamps `TimestamptzJsDate(3)` / `temporal.timestamptzJsDate(...)`
- [ ] `bun run prisma:emit`, `bun run db:plan -- --name <what>`, review, `migration ref set deploy`, `bun run db:deploy`
- [ ] Plan, snapshot and ref committed

### Gateway
- [ ] `private get <models>() { return this.prisma.db.public.<Model>; }`
- [ ] Mapper typed with `PrismaRow` / `PrismaCreate` / `PrismaUpdate`; domain never sees them
- [ ] `null` from `update`/`delete` handled (no P2025)
- [ ] Unique/foreign-key errors through `isUniqueViolation` / `isForeignKeyViolation`
- [ ] `withIdRetry(work, this.prisma.inTransaction)`

### Never
- [ ] No `schema.prisma`, `datasource`, `generator`, `prisma generate`, `prisma-import`, `@prisma/client`, `PrismaClient`
- [ ] No `$transaction([...])`, `$queryRaw`, `findUnique`/`findMany`, `P2002`
- [ ] No committed `generated/`
- [ ] No caret on a Prisma package

---

## Related Documentation

- [Upgrading a Prisma 6 project](./api-prisma-upgrade.md) - The full procedure and scripts
- [ID Setup](./api-id.md) - `formatId`, `withIdRetry`, `IdReservation`
- [Gateway Pattern](../03-patterns/gateway.md) - Data access layer
- [Mapper Pattern](../03-patterns/mapper.md) - Row ↔ domain conversion
- [Transactions across slices](../architecture/transactions.md) - Where a unit of work belongs
- [Migrations and evidence](../architecture/migrations-and-evidence.md) - Backfill, compatibility, recovery

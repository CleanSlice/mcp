---
id: setup-api-prisma-upgrade
title: Upgrading a Prisma 6 Project to Prisma 8
version: 1.0.0
last_updated: 2026-10-26

pattern: setup
complexity: advanced
framework: nestjs
category: setup
applies_to: [backend, api]

tags:
  - prisma
  - prisma-8
  - prisma-6
  - upgrade
  - migration
  - database
  - postgresql

keywords:
  - upgrade prisma 6
  - upgrading a prisma 6 project
  - prisma 6 to prisma 8
  - migrate from prisma-import
  - remove prisma-import
  - remove schema.prisma
  - adopt existing database
  - baseline migration
  - prisma6Aside
  - archived prisma 6 migrations
  - copy rows
  - no data loss
  - gateway before after
  - findUnique to first
  - $transaction to transaction
  - $queryRaw to rawRows
  - P2002 to isUniqueViolation

deprecated: false
experimental: false
production_ready: true
---

# Upgrading a Prisma 6 Project to Prisma 8

> **The procedure Agentfy followed (AGNT2-540), as did Securify and Store Deputy, generalized and re-run on a database built by the Prisma 6 starter kit.** The code moves to Prisma 8 in one branch; an existing database is **set aside** into its own schema and **copied** into the new tables by the baseline migration in one transaction, with row counts checked. No row is lost, and the old copy stays in place until you drop it.

Read [Prisma Setup (API)](./api-prisma.md) first: it is the target state. The [starter kit](https://github.com/CleanSlice/nest-nuxt-starter-kit) `api/` is the reference for every file below; copy its files rather than retyping them.

---

## What changes

| Prisma 6 (prisma-import) | Prisma 8 |
|--------------------------|----------|
| `@prisma/client`, `prisma` ^6, `prisma-import`, `"prisma": { "import": … }` in package.json | `@prisma/orm-postgres` 8.0.0-rc.14, `prisma` 8.0.0-rc.19, overrides for `@prisma/orm-toolchain` / `@prisma/orm-framework` 8.0.0-rc.14, exact pins |
| `prisma.prisma` with `datasource` + `generator client`; assembled `prisma/schema.prisma` | `prisma.config.ts` globs `src/slices/**/*.prisma`; no assembled schema, no datasource/generator |
| `prisma generate` → `node_modules/.prisma/client` | `prisma contract emit` → `generated/prisma` (gitignored), run by postinstall/build/dev/typecheck/test |
| `class PrismaService extends PrismaClient` | `PrismaService` holds an `@prisma/orm-postgres` client; `this.prisma.db.public.<Model>` |
| `import { User, Prisma } from '@prisma/client'` | `PrismaRow<'User'>`, `PrismaCreate<'User'>`, `PrismaUpdate<'User'>` from `#setup/prisma` |
| `P2002` / `P2003` / `P2025` | SQLSTATE `23505` / `23503`; `update`/`delete` answer `null` |
| `$transaction(fn)` / `$transaction([a, b])` | `prisma.transaction(fn)`: ambient, nested calls join, retries, timeout |
| `$queryRaw`, `$executeRaw`, `Prisma.sql/join/raw` | `prisma.sql`, `rawRows`, `rawExecute`, `join`, `verbatim` |
| SQL migrations, `prisma migrate dev` / `deploy` | TypeScript plans, forward only, `bun run db:deploy` → `scripts/migrate.mjs` |
| `DateTime` = `timestamp(3)` | `TimestamptzJsDate(3)` = `timestamptz(3)`, still a JS `Date` |
| CommonJS throughout | the runtime is ESM-only: `tsconfig` `nodenext`, Jest under `--experimental-vm-modules` |

Work on one branch; nothing below can be merged half-done.

---

## Step 0. Before you start

1. **Deploy the last Prisma 6 release everywhere** (dev, staging, prod), so every database is at the same last Prisma 6 migration. Write its name down: it is `LAST_PRISMA6_MIGRATION` below (the newest directory in `prisma/migrations/`, e.g. `20261025170611_add_id_reservation`).
2. **Freeze schema changes** on other branches until the upgrade is merged.
3. **Back up** each database: `pg_dump --format=custom --file=before-prisma8.dump "$DATABASE_URL"`. Rollback is restoring this dump and deploying the last Prisma 6 image.
4. Get a **copy of production data** into a local database (`pg_restore --no-owner --dbname=…`); step 10 runs the upgrade on it before any real environment.

---

## Step 1. Packages

```bash
cd api
bun remove @prisma/client prisma prisma-import
bun add --exact @prisma/orm-postgres@8.0.0-rc.14 pg@8.23.1
bun add --exact --dev prisma@8.0.0-rc.19 @types/pg@8.23.1
```

In `package.json`:

- delete the `"prisma": { "import": { … } }` block;
- add the `overrides`, `trustedDependencies` and `engines` blocks, and replace the `generate`, `migrate`, `premigrate`, `studio` and `start:prod` scripts with the Prisma 8 ones from [Prisma Setup → package.json](./api-prisma.md#packagejson) (`postinstall`, `prisma:emit`, `build`, `typecheck`, `dev`, `start:prod`, `db:deploy`, `db:status`, `db:plan`, `db:verify`, `test`);
- `trustedDependencies` replaces Bun's default allow-list: list every package whose install script you need (`bcrypt`, `esbuild`, `prisma`, …; `bun pm untrusted` shows what was blocked).

Commit `bun.lock`.

## Step 2. Configuration

1. `api/prisma.config.ts`, exactly as in [Prisma Setup](./api-prisma.md#prismaconfigts).
2. `tsconfig.json`: `"module": "nodenext"`, `"moduleResolution": "nodenext"`, `"isolatedModules": true`, `"include": ["src/**/*"]`, `"generated"` in `exclude`. The build stays CommonJS (there is no `"type": "module"` in package.json). Fix what `nodenext` reports: mostly default imports of CommonJS packages (`import * as x` → `import x`).
3. `.gitignore`: add `generated/`, remove `prisma/schema.prisma`.
4. `.dockerignore`: add `**/*.tsbuildinfo` and `api/generated`.

## Step 3. Slice models

For every `*.prisma` file in `src/slices`:

1. First line `// use prisma-8`.
2. **Keep every model, table and column name exactly as it is** (including `@map`/`@@map`): the copy matches tables and columns by name, and raw SQL keeps working.
3. Types:

| Prisma 6 | Prisma 8 |
|----------|----------|
| `DateTime @default(now())` | `TimestamptzJsDate(3) @default(now())` |
| `DateTime @updatedAt` | `temporal.timestamptzJsDate(3, onCreate: now, onUpdate: now)` |
| `DateTime?` | `TimestamptzJsDate(3)?` |
| `DateTime @db.Date` | `DateString` (mapper: `'YYYY-MM-DD'` ↔ `Date`) |
| `Json` | `Jsonb` |
| `Decimal @db.Decimal(p, s)` | `Numeric(p, s)` (a decimal string) |
| `enum X { A B }` + `x X` | `x String`; the union/enum lives in the domain; the copy casts the old enum to text |
| `String[]` (nullable in Prisma 6's SQL) | `String[]` (`NOT NULL`; the copy turns NULL into `{}`) |
| `@default(uuid())` / `cuid()` on an id | no default: the gateway mints the id ([ID Setup](./api-id.md)); existing ids are kept |

4. Relations need no `import` lines any more: delete them. `@relation`, `@@unique`, `@@index` stay.
5. Delete `src/slices/setup/prisma/prisma.prisma` (the datasource/generator file) and `prisma/schema.prisma`.
6. `bun run prisma:emit` must succeed.

A **new** `NOT NULL` column that Prisma 6 did not have needs a `@default(...)`, or add it in a migration after the baseline: the copy only fills columns both sides have.

## Step 4. The Prisma slice

Replace `src/slices/setup/prisma/` with the kit's: `prisma.service.ts`, `prisma.types.ts`, `prisma.errors.ts`, `prisma.module.ts`, `index.ts`, `README.md`, `tests/prisma.service.e2e-spec.ts`. Keep your project's `@Global()` module and alias (`#setup/prisma` in the kit). If your project had its own error helpers, port them onto `sqlState()` / `isUniqueViolation()`.

`CONTRACT_PATH` in `prisma.service.ts` is relative to the file (`../../../../generated/prisma/contract.json` from `src/slices/setup/prisma/`); adjust the depth if your Prisma slice lives elsewhere (Agentfy: `src/slices/infra/prisma`, same depth).

## Step 5. Gateways and mappers

Every gateway that injects `PrismaService` changes. Find them: `grep -rln "this.prisma\.\|@prisma/client" src`.

### Before (Prisma 6)

```typescript
import { Prisma, User } from '@prisma/client';

async getUsers(filter: IUserFilter) {
  const where: Prisma.UserWhereInput = {};
  if (filter.search) {
    where.OR = [
      { name: { contains: filter.search, mode: 'insensitive' } },
      { email: { contains: filter.search, mode: 'insensitive' } },
    ];
  }
  const [total, users] = await this.prisma.$transaction([
    this.prisma.user.count({ where }),
    this.prisma.user.findMany({ where, skip, take: perPage, orderBy: { createdAt: 'desc' } }),
  ]);
  return { data: users.map((u) => this.mapper.toData(u)), total };
}

async getUser(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  return user ? this.mapper.toData(user) : null;
}

async createUser(data: ICreateUserData) {
  const user = await withIdRetry(() =>
    this.prisma.user.create({ data: { id: formatId(USER_ID_PREFIX), ...this.mapper.toCreate(data) } }),
  );
  return this.mapper.toData(user);
}

async updateUser(id: string, data: IUpdateUserData) {
  const user = await this.prisma.user.update({ where: { id }, data: this.mapper.toUpdate(data) }); // throws P2025
  return this.mapper.toData(user);
}

async deleteUser(id: string) {
  return this.mapper.toData(await this.prisma.user.delete({ where: { id } }));
}

// mapper
toData(user: User): IUserData { return { …, roles: user.roles as RoleTypes[] }; }
```

### After (Prisma 8)

```typescript
import type { PrismaCreate, PrismaRow, PrismaUpdate } from '#setup/prisma';

/** `%`, `_` and `\` are LIKE wildcards; escape them so a search matches them literally. */
const likeLiteral = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

private get users() {
  return this.prisma.db.public.User;
}

async getUsers(filter: IUserFilter) {
  let users = this.users;
  if (filter.search) {
    const pattern = `%${likeLiteral(filter.search)}%`;
    users = users.where((u) => this.prisma.or(u.name.ilike(pattern), u.email.ilike(pattern)));
  }
  const [total, rows] = await Promise.all([
    users.aggregate((a) => ({ n: a.count() })).then((r) => r.n),
    users
      .orderBy([(u) => u.createdAt.desc(), (u) => u.id.desc()])   // id breaks ties for stable pages
      .offset((page - 1) * perPage)
      .limit(perPage)
      .all(),
  ]);
  return { data: rows.map((u) => this.mapper.toData(u)), total };
}

async getUser(id: string) {
  const user = await this.users.first({ id });
  return user ? this.mapper.toData(user) : null;
}

async createUser(data: ICreateUserData) {
  const createData = this.mapper.toCreate(data);
  const user = await withIdRetry(
    () => this.users.create({ id: formatId(USER_ID_PREFIX), ...createData }),
    this.prisma.inTransaction,
  );
  return this.mapper.toData(user);
}

async updateUser(id: string, data: IUpdateUserData) {
  const changes = this.mapper.toUpdate(data);
  const user =
    Object.keys(changes).length === 0                       // an empty update answers null
      ? await this.users.first({ id })
      : await this.users.where({ id }).update(changes);
  if (!user) throw new UserNotFoundError(id);               // was P2025
  return this.mapper.toData(user);
}

async deleteUser(id: string) {
  const user = await this.users.where({ id }).delete();
  if (!user) throw new UserNotFoundError(id);
  return this.mapper.toData(user);
}

// mapper
toData(user: PrismaRow<'User'>): IUserData { return { …, roles: [...user.roles] as RoleTypes[] }; }
toCreate(data: ICreateUserData): Omit<PrismaCreate<'User'>, 'id'> { … }
toUpdate(data: IUpdateUserData): PrismaUpdate<'User'> { … }
```

### Translation table

| Prisma 6 | Prisma 8 |
|----------|----------|
| `prisma.user.findUnique({ where: { id } })` | `db.public.User.first({ id })` |
| `findFirst({ where: { email } })` | `.where({ email }).first()` |
| `findMany({ where, orderBy, skip, take })` | `.where(…).orderBy((u) => u.f.desc()).offset(n).limit(n).all()` |
| `select: { id: true }` | `.select('id', …)` |
| `include: { members: true }` | `.include('members')` |
| `count({ where })` | `.where(…).aggregate((a) => ({ n: a.count() }))` |
| `{ contains: s, mode: 'insensitive' }` | `u.f.ilike(\`%${likeLiteral(s)}%\`)` |
| `{ in: [...] }`, `{ not: null }`, `{ gt: x }` | `u.f.in([...])`, `u.f.isNotNull()`, `u.f.gt(x)` |
| `OR: [...]`, `NOT: …` | `this.prisma.or(...)`, `this.prisma.not(...)` |
| `{ has: x }` on a list, JSON `path` filters | `.where(() => this.prisma.condition\`${x} = ANY("roles")\`)` |
| `create({ data })` | `create(data)` |
| `update({ where: { id }, data })` | `.where({ id }).update(data)` → `Row \| null` |
| `delete({ where: { id } })` | `.where({ id }).delete()` → `Row \| null` |
| `upsert({ where, create, update })` | `.upsert({ create, update, conflictOn })`: `conflictOn` names the unique key's values; without it, the primary key |
| `createMany({ data })` | a loop inside `transaction()`, or raw `INSERT … SELECT unnest(…)` |
| `error.code === 'P2002' && error.meta.target` | `isUniqueViolation(error, ['email'])` |
| `error.code === 'P2003'` | `isForeignKeyViolation(error)` |
| `error.code === 'P2025'` | check for `null` |

Prisma's own reference for this version: `node_modules/@prisma/orm-postgres/skills/prisma-8/references/queries-postgres.md`.

## Step 6. Raw SQL

```typescript
// Before
const rows = await this.prisma.$queryRaw<{ id: string }[]>`
  SELECT id FROM "Job" WHERE status = ${status} FOR UPDATE SKIP LOCKED LIMIT 10`;
await this.prisma.$executeRaw`UPDATE "Job" SET status = 'running' WHERE id IN (${Prisma.join(ids)})`;
await this.prisma.$executeRawUnsafe('TRUNCATE "Job"');

// After
const rows = await this.prisma.rawRows(
  this.prisma.sql`SELECT id FROM "Job" WHERE status = ${status} FOR UPDATE SKIP LOCKED LIMIT 10`
    .returnsRow({ id: 'pg/text@1' }),
);
await this.prisma.rawExecute(
  this.prisma.sql`UPDATE "Job" SET status = 'running' WHERE id = ANY(${this.prisma.param(ids, 'pg/text-array@1')})`
    .affectedCount(),
);
await this.prisma.rawExecuteUnsafe('TRUNCATE "Job"');
```

- Every row-returning statement names each column's codec in `.returnsRow({...})`: `pg/text@1`, `pg/int4@1`, `pg/int8@1` (bigint), `pg/bool@1`, `pg/jsonb@1`, `pg/timestamptz-date@1`.
- `null`, `Date`, arrays and JSON values go through `this.prisma.param(value, codecId)`; plain strings, numbers, bigints and booleans infer their codec.
- `Prisma.join(list)` → `this.prisma.join(list.map((x) => this.prisma.sql\`${x}\`.returns('pg/text@1')))`; `Prisma.raw(text)` → `this.prisma.verbatim(text)` (trusted text only).
- Inside `transaction()` the raw helpers run on the same transaction automatically.
- Columns that were `timestamp(3)` are now `timestamptz(3)`: SQL that compared them with a zoneless literal keeps working (UTC), but prefer passing a `Date` through `param`.

## Step 7. Transactions

```typescript
// Before
await this.prisma.$transaction(async (tx) => {
  const team = await tx.team.create({ data: { … } });
  await tx.membership.create({ data: { teamId: team.id, … } });
});
await this.prisma.$transaction([this.prisma.a.create(…), this.prisma.b.update(…)]);

// After: gateways inside need no tx parameter
await this.prisma.transaction(async () => {
  const team = await this.teamGateway.create(data);
  await this.membershipGateway.add(team.id, ownerId, 'owner');
});
// or with the transaction's models directly
await this.prisma.transaction(async (db) => {
  await db.Team.create({ … });
});
```

- Delete every `tx` parameter you threaded through gateways for Prisma 6: the transaction is ambient (`AsyncLocalStorage`), and a nested `transaction()` joins the outer one.
- The batched array form does not exist: use the callback.
- The outermost unit retries on 40001/40P01 (`maxRetries`, default 2) and rolls back after `timeoutMs` (30 s), so keep external side effects (mail, HTTP, queues) out of the callback.
- `isolationLevel: 'Serializable'` → `{ isolationLevel: TransactionIsolationLevel.Serializable }`.
- Inside a transaction: `withIdRetry(work, this.prisma.inTransaction)`.

## Step 8. Migrations: the baseline and the copy

### 8.1 Archive the Prisma 6 migrations

```bash
mkdir -p prisma/prisma6
git mv prisma/migrations prisma/prisma6/migrations      # the Prisma 6 SQL, read-only from now on
bunx prisma-import --force 2>/dev/null; cp prisma/schema.prisma prisma/prisma6/schema.prisma   # or take it from the last Prisma 6 commit
mkdir -p prisma/migrations && echo '{ "type": "module" }' > prisma/migrations/package.json
```

`prisma/prisma6/` is history: nothing runs it, but it is the record of what the old databases contain, and step 8.3 reads hand-written SQL from it.

### 8.2 Plan the baseline

```bash
bun run prisma:emit
bunx prisma migration plan --name baseline     # from an empty database: the graph is empty
```

It writes `prisma/migrations/app/<timestamp>_baseline/` and a snapshot, and prints the DDL. Compare it with `prisma/prisma6/schema.prisma`: the same tables, columns, unique keys, indexes and foreign keys. Expected differences: `timestamp(3)` → `timestamptz(3)`, lists `NOT NULL` with a CHECK on their elements, enums as `text`.

### 8.3 Carry over the hand-written SQL

`grep -rniE "create (unique )?index|trigger|function|check|exclude|insert into|extension" prisma/prisma6/migrations` lists what Prisma 6 did not generate: partial or expression indexes, CHECK/EXCLUDE constraints, triggers and their functions, seeded rows, extensions. Each becomes a guarded `rawSql` step in the baseline's `migration.ts` (the shape is in [Prisma Setup → Migrations](./api-prisma.md#migrations)): the precheck refuses to run it twice, the postcheck proves it landed. Order inside `operations`:

1. the planner's steps (tables, keys, indexes);
2. hand-written constraints, indexes, extensions, seeded rows that do not exist in an old database;
3. **the copy** (below);
4. **triggers last**: a trigger present during the copy fires for every copied row.

### 8.4 The copy step

Paste this above `export default class M` in the baseline's `migration.ts`, add `rawSql` to the existing `@prisma/orm-postgres/migration` import (do not add an import line), and put `copyPrisma6` in `operations` before the triggers. Pick a schema name for `ASIDE` and use the same one in 8.5.

```typescript
// ---------------------------------------------------------------------------
// Adopting a Prisma 6 database. scripts/prisma6Aside.mjs (run by
// scripts/migrate.mjs before this plan) has moved its tables into ASIDE; the
// planner's steps above create the Prisma 8 tables in `public`, and this step
// copies every row across in the same transaction: ids kept, `timestamp` read
// as UTC into `timestamptz`, a NULL list as '{}'. It refuses to commit if any
// table ends with a different row count. On a new database ASIDE does not
// exist and the step does nothing.
// ---------------------------------------------------------------------------
const ASIDE = 'app_prisma6';
const COPIED = 'Rows copied by the Prisma 8 baseline';

const probe = (sql: string) => [{ description: 'probe', sql, params: [] as unknown[] }];

/**
 * A data step. The runner skips a step whose postcheck already holds, so
 * `done` must be false until the step has run (or has nothing to do).
 */
function dataStep(id: string, label: string, sql: string, done: string) {
  return rawSql({
    id,
    label,
    operationClass: 'data',
    target: { id: 'postgres' },
    precheck: probe('SELECT true AS "result"'),
    execute: [{ description: label, sql, params: [] }],
    postcheck: probe(`SELECT (${done}) AS "result"`),
  } as never);
}

const copyPrisma6 = dataStep(
  'raw.prisma6_copy',
  `Copy the rows of a Prisma 6 schema set aside as ${ASIDE}`,
  `DO $copy$
   DECLARE
     remaining text[]; t text; r record; expr text; cols text; sels text;
     progress boolean; old_count bigint; new_count bigint; copied int := 0;
   BEGIN
     IF to_regnamespace('${ASIDE}') IS NULL THEN RETURN; END IF;
     SELECT coalesce(array_agg(c.relname::text ORDER BY c.relname), '{}') INTO remaining
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND to_regclass(format('${ASIDE}.%I', c.relname)) IS NOT NULL;
     -- Parents before children: a table waits while a table it references is still to copy.
     WHILE cardinality(remaining) > 0 LOOP
       progress := false;
       FOREACH t IN ARRAY remaining LOOP
         CONTINUE WHEN EXISTS (
           SELECT 1 FROM pg_constraint co
             JOIN pg_class s ON s.oid = co.conrelid
             JOIN pg_class p ON p.oid = co.confrelid
             JOIN pg_namespace n ON n.oid = s.relnamespace
            WHERE co.contype = 'f' AND n.nspname = 'public' AND s.relname = t
              AND p.relname <> t AND p.relname = ANY (remaining));
         cols := ''; sels := '';
         FOR r IN
           SELECT c.column_name, c.data_type, c.udt_name, o.udt_name AS old_udt
             FROM information_schema.columns c
             JOIN information_schema.columns o
               ON o.table_schema = '${ASIDE}' AND o.table_name = t AND o.column_name = c.column_name
            WHERE c.table_schema = 'public' AND c.table_name = t
            ORDER BY c.ordinal_position
         LOOP
           expr := 's.' || quote_ident(r.column_name);
           IF r.old_udt = 'timestamp' AND r.udt_name = 'timestamptz' THEN expr := expr || ' AT TIME ZONE ''UTC''';
           ELSIF r.data_type = 'ARRAY' THEN expr := 'COALESCE(' || expr || ', ''{}'')';
           ELSIF r.old_udt <> r.udt_name THEN expr := expr || '::' || r.udt_name;
           END IF;
           cols := cols || ', ' || quote_ident(r.column_name);
           sels := sels || ', ' || expr;
         END LOOP;
         EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM ${ASIDE}.%I s', t, substr(cols, 3), substr(sels, 3), t);
         EXECUTE format('SELECT (SELECT count(*) FROM ${ASIDE}.%I), (SELECT count(*) FROM public.%I)', t, t) INTO old_count, new_count;
         IF old_count <> new_count THEN
           RAISE EXCEPTION 'copy of % ended with % rows, the Prisma 6 table has %', t, new_count, old_count;
         END IF;
         remaining := array_remove(remaining, t);
         copied := copied + 1;
         progress := true;
       END LOOP;
       IF NOT progress THEN RAISE EXCEPTION 'foreign keys form a cycle among %', remaining; END IF;
     END LOOP;
     EXECUTE format('COMMENT ON SCHEMA ${ASIDE} IS %L', '${COPIED}');
     RAISE NOTICE 'Prisma 6 rows copied into % tables. Check the api, then drop the old copy: DROP SCHEMA ${ASIDE} CASCADE', copied;
   END
   $copy$;`,
  `to_regnamespace('${ASIDE}') IS NULL OR obj_description(to_regnamespace('${ASIDE}'), 'pg_namespace') = '${COPIED}'`,
);
```

It copies every table that exists in both schemas, column by column for the columns both sides have, parents before children; `timestamp` is read as UTC into `timestamptz`, a NULL list becomes `{}`, any other type change is a cast (enum → text). A table whose new copy has a different row count fails the whole migration, which then rolls back with nothing changed. On a new database `ASIDE` does not exist and the step does nothing; its postcheck makes a second run a no-op.

Then self-emit and point the ref at the baseline:

```bash
node prisma/migrations/app/<timestamp>_baseline/migration.ts      # rewrites ops.json + migration.json
bunx prisma migration ref set deploy <the "to" hash of migration.json>
```

### 8.5 `scripts/prisma6Aside.mjs`

Moves a Prisma 6 database's own objects out of `public` before the baseline runs. Set `LAST_PRISMA6_MIGRATION` (step 0) and `ASIDE` (the name used in 8.4).

```javascript
// Runs before `prisma db migrate` (scripts/migrate.mjs). A database built by the
// Prisma 6 migrations (archived under prisma/prisma6/migrations) has its tables
// in `public` and a `_prisma_migrations` table. Prisma 8 would find those
// tables in its way, so this moves the application's own objects out of
// `public` into the schema ASIDE; the baseline migration then creates the new
// tables in `public` and copies the rows across (its `prisma6-copy` step).
//
// It moves, one by one, what the connecting role owns in `public`: tables (with
// their indexes, constraints, triggers and owned sequences), other sequences,
// views, types and functions that do not belong to an extension. `public`
// itself and extensions stay where they are: on a managed PostgreSQL (Neon,
// RDS, Supabase) `public` belongs to pg_database_owner and an extension's
// objects to the platform's admin role, so neither can be moved.
//
// States:
//   - nothing in public, no ASIDE: a new database, nothing to do;
//   - public._prisma_migrations: a Prisma 6 database. It must be at
//     LAST_PRISMA6_MIGRATION with nothing unfinished, and ASIDE must not hold
//     anything yet; otherwise refused, nothing changed;
//   - ASIDE._prisma_migrations: already set aside, nothing to do (a second
//     run, or a retry after a failed baseline);
//   - both: refused, resolve by hand.
// Everything happens in one transaction. The old copy stays in ASIDE until
// someone drops it by hand once the api is checked: DROP SCHEMA <ASIDE> CASCADE;
//
// Uses DATABASE_URL. Exit 0 on success or nothing to do, 1 on refusal/failure.
import pg from 'pg';

/** The last migration in prisma/prisma6/migrations: the one every database must be at. */
export const LAST_PRISMA6_MIGRATION = '20261025170611_add_id_reservation';
/** Where the Prisma 6 tables wait for the baseline to copy them. */
export const ASIDE = 'app_prisma6';

// What the connecting role owns in public, outside any extension.
const OWNED = `
  WITH me AS (SELECT oid FROM pg_roles WHERE rolname = current_user),
       pub AS (SELECT oid FROM pg_namespace WHERE nspname = 'public'),
       ext AS (SELECT objid, classid FROM pg_depend WHERE deptype = 'e')`;

async function ownedObjects(client) {
  const { rows } = await client.query(`${OWNED}
    SELECT 'table' AS kind, format('%I.%I', 'public', c.relname) AS name, c.relname AS label
      FROM pg_class c, me, pub
     WHERE c.relnamespace = pub.oid AND c.relowner = me.oid AND c.relkind IN ('r', 'p')
       AND NOT EXISTS (SELECT 1 FROM ext WHERE ext.classid = 'pg_class'::regclass AND ext.objid = c.oid)
    UNION ALL
    SELECT 'view', format('%I.%I', 'public', c.relname), c.relname
      FROM pg_class c, me, pub
     WHERE c.relnamespace = pub.oid AND c.relowner = me.oid AND c.relkind IN ('v', 'm')
       AND NOT EXISTS (SELECT 1 FROM ext WHERE ext.classid = 'pg_class'::regclass AND ext.objid = c.oid)
    UNION ALL
    -- A sequence a table owns moves with the table.
    SELECT 'sequence', format('%I.%I', 'public', c.relname), c.relname
      FROM pg_class c, me, pub
     WHERE c.relnamespace = pub.oid AND c.relowner = me.oid AND c.relkind = 'S'
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype IN ('a', 'i'))
       AND NOT EXISTS (SELECT 1 FROM ext WHERE ext.classid = 'pg_class'::regclass AND ext.objid = c.oid)
    UNION ALL
    -- Enums, domains and standalone composite types; a table's row type moves with it.
    SELECT 'type', format('%I.%I', 'public', t.typname), t.typname
      FROM pg_type t, me, pub
     WHERE t.typnamespace = pub.oid AND t.typowner = me.oid AND t.typtype IN ('e', 'd', 'c', 'r')
       AND (t.typrelid = 0 OR (SELECT relkind FROM pg_class WHERE oid = t.typrelid) = 'c')
       AND NOT EXISTS (SELECT 1 FROM ext WHERE ext.classid = 'pg_type'::regclass AND ext.objid = t.oid)
    UNION ALL
    SELECT CASE p.prokind WHEN 'p' THEN 'procedure' WHEN 'a' THEN 'aggregate' ELSE 'function' END,
           format('%I.%I(%s)', 'public', p.proname, pg_get_function_identity_arguments(p.oid)), p.proname
      FROM pg_proc p, me, pub
     WHERE p.pronamespace = pub.oid AND p.proowner = me.oid
       AND NOT EXISTS (SELECT 1 FROM ext WHERE ext.classid = 'pg_proc'::regclass AND ext.objid = p.oid)
     ORDER BY 1, 3`);
  return rows;
}

const STATEMENT = {
  table: (name) => `ALTER TABLE ${name} SET SCHEMA ${ASIDE}`,
  view: (name) => `ALTER TABLE ${name} SET SCHEMA ${ASIDE}`,
  sequence: (name) => `ALTER SEQUENCE ${name} SET SCHEMA ${ASIDE}`,
  type: (name) => `ALTER TYPE ${name} SET SCHEMA ${ASIDE}`,
  function: (name) => `ALTER FUNCTION ${name} SET SCHEMA ${ASIDE}`,
  procedure: (name) => `ALTER PROCEDURE ${name} SET SCHEMA ${ASIDE}`,
  aggregate: (name) => `ALTER AGGREGATE ${name} SET SCHEMA ${ASIDE}`,
};

/**
 * Sets a Prisma 6 schema aside when there is one. Resolves to what it did;
 * throws (after rolling back) when it refuses.
 */
export async function prisma6Aside(url, log = (line) => console.log(line)) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS legacy,
              to_regclass('${ASIDE}._prisma_migrations') IS NOT NULL AS done,
              (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = '${ASIDE}') AS aside_relations`,
    );
    const { legacy, done } = rows[0];
    const asideRelations = Number(rows[0].aside_relations);
    if (legacy && (done || asideRelations > 0)) {
      throw new Error(`public._prisma_migrations exists and ${ASIDE} already holds tables. Resolve by hand before deploying.`);
    }
    if (!legacy && done) {
      log(`prisma6Aside: the Prisma 6 schema is already in ${ASIDE}; nothing to do.`);
      return 'already-aside';
    }
    if (!legacy) {
      log('prisma6Aside: no Prisma 6 schema in public; nothing to set aside.');
      return 'nothing';
    }

    const state = await client.query(
      `SELECT
         count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS unfinished,
         bool_or(migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS last
       FROM public._prisma_migrations`,
      [LAST_PRISMA6_MIGRATION],
    );
    const { unfinished, last } = state.rows[0];
    if (Number(unfinished) > 0 || !last) {
      throw new Error(
        `this Prisma 6 database is not at ${LAST_PRISMA6_MIGRATION} (or a migration is unfinished). ` +
          'Deploy the last Prisma 6 release first.',
      );
    }

    await client.query('BEGIN');
    try {
      await client.query(`CREATE SCHEMA ${ASIDE}`);
      const objects = await ownedObjects(client);
      const counts = {};
      for (const { kind, name } of objects) {
        await client.query(STATEMENT[kind](name));
        counts[kind] = (counts[kind] ?? 0) + 1;
      }
      // Nothing of the application may stay behind in public: a table the
      // role does not own would collide with the baseline, so refuse.
      const left = await client.query(
        `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
            AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')`,
      );
      if (left.rows.length > 0) {
        throw new Error(`relations left in public that this role cannot move: ${left.rows.map((r) => r.relname).join(', ')}`);
      }
      await client.query('COMMIT');
      const summary = Object.entries(counts)
        .map(([kind, n]) => `${n} ${kind}${n === 1 ? '' : 's'}`)
        .join(', ');
      log(`prisma6Aside: the Prisma 6 schema is now ${ASIDE} (${summary}); the baseline migration copies its rows.`);
      return 'set-aside';
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    await client.end();
  }
}

// `node scripts/prisma6Aside.mjs` on its own.
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('prisma6Aside: DATABASE_URL is not set.');
    process.exit(2);
  }
  prisma6Aside(url).catch((error) => {
    console.error(`prisma6Aside: nothing changed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
```

### 8.6 `scripts/migrate.mjs` with the aside

The kit's entrypoint plus the aside, run before `prisma db migrate`:

```javascript
// The one way to bring a database up to date:
//
//   node scripts/migrate.mjs     # what the container runs before the api (docker/start.sh)
//   bun run db:deploy            # the same, from a checkout: reads api/.env.dev, then api/.env
//
// It applies the Prisma 8 plans in prisma/migrations up to
// prisma/migrations/app/refs/deploy.json (`prisma db migrate --to deploy`).
// Applied ones are skipped, so a second run is a no-op. The dev server, the
// test global setup and the Docker start all call it, so a database is never
// built two different ways.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma6Aside } from './prisma6Aside.mjs';

const apiDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const say = (line) => console.error(`migrate: ${line}`);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: apiDir, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${[command, ...args].join(' ')} exited with ${result.status ?? result.signal}`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

  say('setting a Prisma 6 schema aside, if there is one');
  await prisma6Aside(process.env.DATABASE_URL, (line) => say(line));

  say('applying database migrations');
  // The CLI's own entry, run by this node: the runtime image has no Bun and no npx.
  const cli = join(apiDir, 'node_modules', 'prisma', 'dist', 'prisma.js');
  run(process.execPath, [cli, 'db', 'migrate', '--to', 'deploy', '--format', 'human']);
  say('done');
}

main().catch((error) => {
  say(`failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
```

What a run prints on a Prisma 6 database:

```
migrate: setting a Prisma 6 schema aside, if there is one
migrate: prisma6Aside: the Prisma 6 schema is now app_prisma6 (3 tables); the baseline migration copies its rows.
migrate: applying database migrations
✔ Applied 1 migration(s) (5 operation(s)) across 1 contract space(s)
migrate: done
```

a second run (`already in app_prisma6; nothing to do`, nothing applied), a new database (`no Prisma 6 schema in public; nothing to set aside`, the copy step skipped) and a Prisma 6 database behind `LAST_PRISMA6_MIGRATION` (`failed: this Prisma 6 database is not at …`, nothing changed).

### 8.7 Seeds

Prisma 8 has no `prisma db seed`. Keep the seed as a script that opens `PrismaService.open()`, writes through the gateways or the ORM, and `close()`s; run it from a `db:seed` script after `db:deploy`.

## Step 9. Tests

1. `"test": "prisma contract emit --format human --quiet && NODE_OPTIONS=--experimental-vm-modules jest"`. Run with `bun run test`, never `bun test`.
2. ts-jest on the project tsconfig: `"transform": { "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": "<rootDir>/../tsconfig.json" }] }` (adjust to where `rootDir` is).
3. A dedicated test database rebuilt on every run by the same `scripts/migrate.mjs`: copy `api/test/env.cjs` and `api/test/globalSetup.cjs` from the kit, add `"setupFiles": ["<rootDir>/../test/env.cjs"]`, `"globalSetup": "<rootDir>/../test/globalSetup.cjs"` and `"maxWorkers": 1` to the Jest config. The setup refuses a database whose name lacks `test`.
4. Mocks of `this.prisma.user.findUnique` become mocks of `{ db: { public: { User: { first } } } }`; better, test gateways against the test database (`PrismaService.open()`, `TRUNCATE` in `beforeEach`).
5. Fake database errors in the Prisma 8 shape: `Object.assign(new Error('duplicate key'), { sqlState: '23505', detail: 'Key (id)=(x) already exists.' })`, not `new Prisma.PrismaClientKnownRequestError(...)`.
6. If the suite runs out of memory under `--experimental-vm-modules` (each test file links the ESM graph anew), add `"workerIdleMemoryLimit": "1536MB"`.

## Step 10. Docker and deploy

1. Dockerfile: install with `--ignore-scripts` before copying the sources, build with `bun run build`, and copy into the runtime image `generated/`, `prisma/migrations/`, `prisma.config.ts`, `scripts/migrate.mjs`, **`scripts/prisma6Aside.mjs`** and the slices' `*.prisma` files (see [Prisma Setup → Docker](./api-prisma.md#docker)). The image needs the `prisma` CLI and `pg`.
2. The start command (container entrypoint, init container, `start:prod`) runs `node scripts/migrate.mjs`, not `prisma migrate deploy`. If an init container outside this repository still runs `prisma migrate deploy --schema=…`, put a `prisma` shim on the image's PATH that answers that one command with `node /app/scripts/migrate.mjs` (Agentfy's api Dockerfile does), so the two repositories can roll out in either order.

## Step 11. Verify, roll out, clean up

On the local copy of production (step 0.4), then staging, then production:

```bash
bun run db:deploy                 # aside + baseline + copy
bun run db:verify                 # the database matches the contract
bun run db:deploy                 # a second run: nothing to apply
```

```sql
-- row counts, old vs new, for every table (the copy already refused a mismatch)
SELECT n.nspname, c.relname, c.reltuples FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname IN ('public', 'app_prisma6') AND c.relkind = 'r' ORDER BY 2, 1;
```

Then `bun run typecheck`, `bun run test`, `bun run build`, the Docker image, and a smoke test of the api against the upgraded copy (log in with an existing user, list, create, update, delete).

Once production has run on Prisma 8 and is checked, drop the old copy in each environment:

```sql
DROP SCHEMA app_prisma6 CASCADE;
```

Rollback before that point: restore the step 0 dump and deploy the last Prisma 6 image. After writes have happened on Prisma 8, a rollback loses them; roll forward instead.

---

## Checklist

- [ ] Every environment at `LAST_PRISMA6_MIGRATION`; dumps taken
- [ ] `@prisma/client`, `prisma-import`, the `"prisma"` block, `schema.prisma`, the datasource/generator file gone
- [ ] Exact pins, overrides, `trustedDependencies`; `bun.lock` committed
- [ ] `prisma.config.ts`; `tsconfig` `nodenext` + `isolatedModules`; `generated/` gitignored
- [ ] Every slice `*.prisma` starts with `// use prisma-8`, same table and column names
- [ ] Prisma slice replaced by the kit's; `grep -rn "@prisma/client\|findUnique\|findMany\|\$transaction\|\$queryRaw\|P2002\|P2025" src` is empty
- [ ] Prisma 6 migrations in `prisma/prisma6/`; baseline planned, hand-written SQL carried over, copy before triggers; `deploy` ref set
- [ ] `scripts/prisma6Aside.mjs` with the right `LAST_PRISMA6_MIGRATION` and `ASIDE`; `scripts/migrate.mjs` calls it
- [ ] Tests under `--experimental-vm-modules` on a rebuilt test database
- [ ] Dockerfile and start command use `scripts/migrate.mjs`; the image carries both scripts
- [ ] Rehearsed on a copy of production: deploy, verify, second deploy is a no-op, smoke test
- [ ] Old schema dropped after production is checked

## Related Documentation

- [Prisma Setup (API)](./api-prisma.md) - The Prisma 8 target state
- [ID Setup](./api-id.md) - IDs, `withIdRetry`, legacy ID formats after an upgrade
- [Migrations and evidence](../architecture/migrations-and-evidence.md) - Backfill, compatibility, recovery

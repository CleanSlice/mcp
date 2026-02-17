---
id: repository-pattern
title: Repository Pattern
version: 1.0.0
last_updated: 2025-12-16

pattern: repository
complexity: intermediate
framework: agnostic
category: architecture
applies_to: [backend, api]

tags:
  - repository
  - data-layer
  - black-box
  - self-contained
  - reusable
  - clean-architecture
  - external-services

keywords:
  - repository pattern
  - black box
  - data access
  - self-contained
  - reusable module
  - external api
  - sdk wrapper

deprecated: false
experimental: false
production_ready: true
---

# Repository Pattern

> **Repositories are self-contained black boxes** that encapsulate access to external resources (APIs, file systems, databases, SDKs). They have their own types, do NOT know about the application, and do NOT import from domain or data layers. Gateways use repositories and mappers to convert repository output to domain types.

---

## IMPORTANT: Repository vs Gateway

```
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   DO NOT CREATE A REPOSITORY FOR DATABASE ACCESS!               ║
║                                                                 ║
║   Prisma (in node_modules) IS your repository layer.            ║
║   Gateway wraps Prisma directly - no extra layer needed.        ║
║                                                                 ║
║   WRONG: UserRepository -> UserGateway -> Prisma                ║
║   RIGHT: UserGateway -> Prisma (directly)                       ║
║                                                                 ║
║   Repository is ONLY for external services:                     ║
║   - GitHubRepository - wraps GitHub API                         ║
║   - S3Repository - wraps AWS S3 SDK                             ║
║   - StripeRepository - wraps Stripe SDK                         ║
║   - OpenAIRepository - wraps OpenAI API                         ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

| Use Case | Pattern | Why |
|----------|---------|-----|
| Database access | **Gateway** | Prisma IS the repository |
| External API (GitHub, Stripe) | **Repository** | Wraps external SDK |
| File system access | **Repository** | Self-contained module |

---

## Overview

Repositories are **closed building blocks** - completely independent modules:

```
┌──────────────────────────────────────────────────────────────┐
│  SERVICE (Domain Layer)                                      │
│  - Business logic orchestration                              │
│  - Depends on gateway interface                              │
└──────────────────────────┬───────────────────────────────────┘
                           │ calls via interface
                           v
┌──────────────────────────────────────────────────────────────┐
│  GATEWAY (Data Layer)                                        │
│  - Implements domain interface                               │
│  - Uses REPOSITORY to fetch raw data                         │
│  - Uses MAPPER to convert to domain types                    │
└──────────────────────────┬───────────────────────────────────┘
                           │ fetches from
                           v
┌──────────────────────────────────────────────────────────────┐
│  REPOSITORY (Black Box)                  <- YOU ARE HERE      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SELF-CONTAINED MODULE                                 │  │
│  │  - Own types (I{Name}Response, I{Name}Config, etc.)    │  │
│  │  - Own logic (SDK calls, API requests, file I/O)       │  │
│  │  - NO imports from domain/ or data/ layers             │  │
│  │  - NO knowledge of the application                     │  │
│  │  - REUSABLE across projects without modifications      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Examples: GitHub API, AWS S3, Stripe, OpenAI, File System   │
└──────────────────────────────────────────────────────────────┘
                           │ returns
                           v
┌──────────────────────────────────────────────────────────────┐
│  REPOSITORY TYPES (NOT Domain Types!)                        │
│  - IGitHubTreeResponse, IS3ListResponse                      │
│  - Raw API/SDK response structures                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Principles

### 1. Repository is a BLACK BOX

The repository knows **nothing** about your application. It only knows about:
- Its area of expertise (GitHub, S3, Stripe, etc.)
- Its own types
- External SDKs/APIs it wraps

### 2. NO Imports from Domain or Data Layers

```typescript
// WRONG - Repository importing domain types
import { IUserData } from '../domain/user.types';  // NEVER!

// CORRECT - Repository has its own types
import { IGitHubUserResponse } from './github.types';
```

### 3. Gateway Converts Repository Output

```typescript
async getUser(username: string): Promise<IUserData> {
  const repoData = await this.githubRepository.getUser(username);
  return this.mapper.toData(repoData);
}
```

### 4. Designed for Reuse

A repository can be copied to another project with **zero modifications**. It doesn't depend on your application's domain model.

---

## Placement Options

Repositories can live in two places:

### Option 1: Inside a Slice (`data/repositories/`)

For repositories specific to one feature:

```
slices/knowledge/
├── domain/
│   ├── knowledge.types.ts
│   ├── knowledge.gateway.ts
│   └── knowledge.service.ts
├── data/
│   ├── knowledge.gateway.ts
│   ├── knowledge.mapper.ts
│   └── repositories/
│       ├── docs/
│       │   ├── docs.repository.ts
│       │   ├── docs.loader.ts
│       │   └── docs.types.ts
│       └── github/
│           ├── github.repository.ts
│           └── github.types.ts
└── knowledge.module.ts
```

### Option 2: Separate Reusable Slice

For repositories shared across features or projects:

```
slices/
├── aws/
│   ├── s3/
│   │   ├── s3.module.ts
│   │   ├── index.ts
│   │   └── data/repositories/s3/
│   │       ├── s3.repository.ts
│   │       └── s3.types.ts
│   └── cognito/
│       └── ...
├── stripe/
│   ├── stripe.module.ts
│   └── data/repositories/stripe/
│       ├── stripe.repository.ts
│       └── stripe.types.ts
└── user/
    └── data/
        └── user.gateway.ts         # Uses S3Repository, StripeRepository
```

---

## Repository Types

Repositories define their **own types** - separate from domain types:

```typescript
export interface IGitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface IGitHubTreeResponse {
  sha: string;
  url: string;
  tree: IGitHubTreeItem[];
  truncated: boolean;
}
```

---

## Repository Implementation Examples

### Example 1: Documentation Repository (Local Files)

```typescript
import { Injectable } from '@nestjs/common';
import { DocsLoader } from './docs.loader';

export interface IDocumentSearchQuery {
  query?: string;
  framework?: string;
  category?: string;
  tags?: string[];
}

export interface IDocumentSearchResult {
  name: string;
  path: string;
  content: string;
  description?: string;
  category?: string;
  tags?: string[];
  relevanceScore?: number;
  source: 'local';
}

@Injectable()
export class DocsRepository {
  constructor(private readonly docsLoader: DocsLoader) {}

  search(query: IDocumentSearchQuery = {}): IDocumentSearchResult[] {
    const documents = this.docsLoader.getScannedDocuments();
    const results: IDocumentSearchResult[] = [];

    for (const doc of documents) {
      let score = 0;

      if (query.query) {
        const queryLower = query.query.toLowerCase();
        if (doc.name.toLowerCase().includes(queryLower)) {
          score += 20;
        } else if (doc.description.toLowerCase().includes(queryLower)) {
          score += 15;
        }
      }

      if (query.category && doc.category === query.category) {
        score += 10;
      }

      if (query.tags?.length) {
        const matches = doc.tags.filter(t => query.tags!.includes(t));
        score += matches.length * 5;
      }

      if (score > 0) {
        const content = this.docsLoader.loadDocument(doc.path);
        if (content) {
          results.push({
            name: doc.name,
            path: doc.path,
            content,
            description: doc.description,
            category: doc.category,
            tags: doc.tags,
            relevanceScore: score,
            source: 'local',
          });
        }
      }
    }

    return results.sort((a, b) => b.relevanceScore! - a.relevanceScore!);
  }
}
```

### Example 2: AWS S3 Repository (Cloud SDK)

```typescript
import { Injectable } from '@nestjs/common';
import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class S3Repository {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME!;
    const clientConfig: S3ClientConfig = {
      region: process.env.AWS_REGION,
      forcePathStyle: true,
    };
    if (process.env.S3_ENDPOINT) {
      clientConfig.endpoint = process.env.S3_ENDPOINT;
    }
    this.client = new S3Client(clientConfig);
  }

  async uploadFile(key: string, contentType: string, body: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async readFile(key: string): Promise<Readable> {
    const { Body } = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    return Body as Readable;
  }

  async removeFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  async listFiles(prefix: string) {
    return await this.client.send(
      new ListObjectsCommand({
        Bucket: this.bucketName,
        Prefix: prefix,
        Delimiter: '/',
      }),
    );
  }

  async getSignedUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async renameFile(oldKey: string, newKey: string): Promise<void> {
    if (oldKey === newKey) return;
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `/${this.bucketName}/${oldKey}`,
        Key: newKey,
      }),
    );
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: oldKey }),
    );
  }
}
```

---

## Gateway Using Repository

The gateway calls the repository for raw data, then uses a mapper to convert to domain types.

```typescript
import { Injectable } from '@nestjs/common';
import { IKnowledgeGateway } from '../domain/knowledge.gateway';
import { IDocumentData } from '../domain/knowledge.types';
import { DocsRepository, IDocumentSearchQuery } from './repositories/docs/docs.repository';
import { KnowledgeMapper } from './knowledge.mapper';

@Injectable()
export class KnowledgeGateway implements IKnowledgeGateway {
  constructor(
    private readonly docsRepository: DocsRepository,
    private readonly mapper: KnowledgeMapper,
  ) {}

  async searchDocuments(query: string): Promise<IDocumentData[]> {
    const searchQuery: IDocumentSearchQuery = { query };
    const localResults = this.docsRepository.search(searchQuery);
    return localResults.map(r => this.mapper.toData(r));
  }
}
```

---

## Mapper for Repository Types

Converts repository-specific types to domain types:

```typescript
import { Injectable } from '@nestjs/common';
import { IDocumentSearchResult } from './repositories/docs/docs.repository';
import { IDocumentData } from '../domain/knowledge.types';

@Injectable()
export class KnowledgeMapper {
  toData(result: IDocumentSearchResult): IDocumentData {
    return {
      id: this.generateId(result.path),
      name: result.name,
      path: result.path,
      content: result.content,
      description: result.description ?? '',
      category: result.category ?? 'uncategorized',
      tags: result.tags ?? [],
      source: result.source,
    };
  }

  private generateId(path: string): string {
    return `doc-${path.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
  }
}
```

---

## Module Registration

```typescript
// knowledge.module.ts
import { Module } from '@nestjs/common';
import { KnowledgeService } from './domain/knowledge.service';
import { KnowledgeGateway } from './data/knowledge.gateway';
import { KnowledgeMapper } from './data/knowledge.mapper';
import { DocsRepository } from './data/repositories/docs/docs.repository';
import { DocsLoader } from './data/repositories/docs/docs.loader';

@Module({
  providers: [
    KnowledgeService,
    { provide: 'IKnowledgeGateway', useClass: KnowledgeGateway },
    KnowledgeMapper,
    DocsRepository,
    DocsLoader,
  ],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
```

---

## Comparison: Repository vs Gateway

| Aspect | Repository | Gateway |
|--------|------------|---------|
| **Purpose** | Access external resources | Abstract data access for domain |
| **Types** | Own types (raw API responses) | Domain types |
| **Knowledge** | Only its domain (S3, GitHub, etc.) | Knows domain model |
| **Imports** | External SDKs only | Repository + Mapper + Domain |
| **Reusability** | 100% portable | Specific to application |
| **Location** | `data/repositories/` or separate slice | `data/` folder |
| **Interface** | Optional | Required (in domain/) |

---

## When to Use Repositories

### Use Repository Pattern When:

- **External API Access** - GitHub, Stripe, OpenAI, etc.
- **Cloud Services** - AWS S3, Cognito, SES, DynamoDB
- **Third-party SDKs** - Any external dependency
- **File System Operations** - Reading/writing local files
- **Reusable Logic** - Code that can be shared across projects
- **Complex Data Access** - Caching, rate limiting, retries

### Don't Use Repository For:

- **Simple Prisma queries** - Use Gateway directly with mapper
- **Application-specific logic** - That belongs in Service
- **One-off integrations** - Keep in Gateway if not reusable

---

## Checklist

### Repository Requirements

- [ ] Located in `data/repositories/` or separate slice
- [ ] Named `{name}.repository.ts` (SINGULAR)
- [ ] Class named `{Name}Repository`
- [ ] Has own types file (`{name}.types.ts`)
- [ ] NO imports from `domain/` or parent `data/` layers
- [ ] `@Injectable()` decorator

### Black Box Principles

- [ ] Self-contained - all logic inside repository
- [ ] Own types - no domain types imported
- [ ] No application knowledge - doesn't know about business rules
- [ ] Reusable - can copy to another project unchanged
- [ ] External dependencies only - SDKs, APIs, file system

### Integration

- [ ] Gateway injects repository
- [ ] Mapper converts repository types to domain types
- [ ] Repository registered in module providers

### Never Do

- [ ] NO imports from `domain/` layer
- [ ] NO imports from parent `data/` layer
- [ ] NO business logic (that's for Service)
- [ ] NO domain type awareness
- [ ] NO application configuration (except env vars)

---

## Related Documentation

- [Gateway Pattern](./gateway.md) - Gateways use repositories
- [Mapper Pattern](./mapper.md) - Mappers convert repository types
- [Service Pattern](./service.md) - Services orchestrate via gateways
- [Layers Pattern](./layers.md) - Repository lives in data layer

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { resolve } from 'path';
import { KnowledgeGateway } from './knowledge.gateway';
import { DocsLoader } from './repositories/docs/docs.loader';
import { DocsRepository } from './repositories/docs/docs.repository';
import { GitHubLoader } from './repositories/github/github.loader';
import { GitHubRepository } from './repositories/github/github.repository';
import { FrameworkArchitectureResponseDto } from '../dtos/knowledgeResponse.dto';

describe('Bundled architecture knowledge', () => {
  let gateway: KnowledgeGateway;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [KnowledgeGateway, DocsLoader, DocsRepository,
        { provide: ConfigService, useValue: new ConfigService({ DOCS_PATH: resolve(process.cwd(), 'docs') }) },
        { provide: GitHubLoader, useValue: { loadDocument: jest.fn().mockResolvedValue(null) } },
        { provide: GitHubRepository, useValue: { search: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    gateway = module.get(KnowledgeGateway);
  });

  it('renders actual startup rules, workflow and provenance rather than empty headings', async () => {
    const data = await gateway.getGettingStarted();
    const text = new FrameworkArchitectureResponseDto(data).toMcpResponse().content[0].text;
    expect(text).toContain('Source: 00-quickstart/get-started.md');
    expect(text).toContain('version: 5.0.0');
    expect(text).toContain('SINGULAR');
    expect(text).toContain('Prisma');
    expect(text).toContain('approved task authorizes');
    expect(text).not.toMatch(/## (?:When to Use|Checklist)\s*(?:---|$)/);
  });

  it.each([
    ['transaction outbox idempotency', 'architecture/reliable-operations.md'],
    ['authorization context', 'architecture/authorization-context.md'],
    ['migrations evidence', 'architecture/migrations-and-evidence.md'],
    ['transactions slices', 'architecture/transactions.md'],
  ])('discovers the guide for %s and reads its full content', async (query, path) => {
    const result = await gateway.search({ query, limit: 100 });
    expect(result.results.map(doc => doc.path)).toContain(path);
    const content = await gateway.readDocument(path);
    expect(content).toContain('version: 1.0.0');
    expect(content).toContain('## Verification');
  });
});

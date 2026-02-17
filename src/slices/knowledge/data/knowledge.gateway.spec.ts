// @scope:api
// @slice:knowledge
// @layer:data
// @type:test

import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGateway } from './knowledge.gateway';
import { DocsRepository } from './repositories/docs/docs.repository';
import { GitHubRepository } from './repositories/github/github.repository';
import type { IDocumentSearchResult } from './repositories/docs/docs.repository';

describe('KnowledgeGateway', () => {
  let gateway: KnowledgeGateway;
  let docsRepository: jest.Mocked<DocsRepository>;
  let githubRepository: jest.Mocked<GitHubRepository>;

  // Mock local documents
  const mockLocalDocs: IDocumentSearchResult[] = [
    {
      name: 'CleanSlice Architecture Rules',
      path: '00-quickstart/rules.md',
      content: '# Rules\n\nSINGULAR names!',
      description: 'Critical rules',
      category: 'quickstart',
      tags: ['rules', 'quickstart'],
      relevanceScore: 25,
      source: 'local',
    },
    {
      name: 'New Project Setup',
      path: '00-quickstart/new-project.md',
      content: '# New Project\n\nSetup guide',
      description: 'Project setup',
      category: 'quickstart',
      tags: ['setup', 'quickstart'],
      relevanceScore: 20,
      source: 'local',
    },
  ];

  // Mock GitHub documents
  const mockGitHubDocs: IDocumentSearchResult[] = [
    {
      name: 'Gateway Pattern',
      path: '02-patterns/gateway-pattern.md',
      content: '# Gateway Pattern\n\nOverview',
      description: 'Gateway pattern docs',
      category: 'patterns',
      tags: ['gateway', 'patterns'],
      relevanceScore: 18,
      source: 'github',
    },
    {
      name: 'CleanSlice Architecture Rules', // Duplicate
      path: 'docs/rules.md',
      content: '# Old Rules from GitHub',
      description: 'Old rules',
      category: 'quickstart',
      tags: ['rules'],
      relevanceScore: 15,
      source: 'github',
    },
  ];

  beforeEach(async () => {
    const mockDocsRepo = {
      search: jest.fn().mockReturnValue(mockLocalDocs),
      getCategories: jest.fn().mockReturnValue(['quickstart', 'patterns']),
      getAllDocuments: jest.fn().mockReturnValue([]),
    };

    const mockGitHubRepo = {
      search: jest.fn().mockResolvedValue(mockGitHubDocs),
      getCategories: jest.fn().mockResolvedValue(['patterns', 'advanced']),
      getAllDocuments: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeGateway,
        { provide: DocsRepository, useValue: mockDocsRepo },
        { provide: GitHubRepository, useValue: mockGitHubRepo },
      ],
    }).compile();

    gateway = module.get<KnowledgeGateway>(KnowledgeGateway);
    docsRepository = module.get(DocsRepository);
    githubRepository = module.get(GitHubRepository);
  });

  describe('search', () => {
    it('should search both local and GitHub repositories', async () => {
      await gateway.search({ query: 'test', limit: 100 });

      expect(docsRepository.search).toHaveBeenCalledWith(expect.objectContaining({ query: 'test' }));
      expect(githubRepository.search).toHaveBeenCalledWith(expect.objectContaining({ query: 'test' }));
    });

    it('should merge results from both sources', async () => {
      const { results, total } = await gateway.search({ query: 'test', limit: 100 });

      // Should have 3 unique results (rules.md deduplicated)
      expect(total).toBe(3);
      expect(results.length).toBe(3);
    });

    it('should prefer local results over GitHub duplicates', async () => {
      const { results } = await gateway.search({ query: 'rules', limit: 100 });

      // Find the rules document
      const rulesDoc = results.find((r) => r.path.includes('rules'));

      // Should be local version (higher score, local path)
      expect(rulesDoc?.path).toBe('00-quickstart/rules.md');
      expect(rulesDoc?.content).toBe('# Rules\n\nSINGULAR names!');
    });

    it('should sort merged results by relevance score', async () => {
      const { results } = await gateway.search({ query: 'test', limit: 100 });

      // Verify descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].relevanceScore).toBeGreaterThanOrEqual(
          results[i + 1].relevanceScore || 0
        );
      }
    });

    it('should handle GitHub failure gracefully', async () => {
      githubRepository.search.mockRejectedValue(new Error('Network error'));

      const { results, total } = await gateway.search({ query: 'test', limit: 100 });

      // Should return only local results
      expect(total).toBe(mockLocalDocs.length);
      expect(results[0].path).toBe('00-quickstart/rules.md');
    });

    it('should include GitHub-only documents', async () => {
      const { results } = await gateway.search({ query: 'test', limit: 100 });

      // Gateway pattern only exists in GitHub
      const gatewayDoc = results.find((r) => r.name === 'Gateway Pattern');
      expect(gatewayDoc).toBeDefined();
      expect(gatewayDoc?.path).toBe('02-patterns/gateway-pattern.md');
    });

    it('should paginate results with limit and offset', async () => {
      const page1 = await gateway.search({ query: 'test', limit: 2, offset: 0 });
      const page2 = await gateway.search({ query: 'test', limit: 2, offset: 2 });

      expect(page1.results.length).toBe(2);
      expect(page1.total).toBe(3);
      expect(page1.offset).toBe(0);

      expect(page2.results.length).toBe(1);
      expect(page2.total).toBe(3);
      expect(page2.offset).toBe(2);
    });

    it('should default to limit 5 and offset 0', async () => {
      const { limit, offset } = await gateway.search({ query: 'test' });

      expect(limit).toBe(5);
      expect(offset).toBe(0);
    });
  });

  describe('getCategories', () => {
    it('should merge categories from both sources', async () => {
      const categories = await gateway.getCategories();

      expect(categories).toContain('quickstart');
      expect(categories).toContain('patterns');
      expect(categories).toContain('advanced');
    });

    it('should deduplicate categories', async () => {
      const categories = await gateway.getCategories();

      // 'patterns' exists in both, should appear once
      const patternsCount = categories.filter((c) => c === 'patterns').length;
      expect(patternsCount).toBe(1);
    });

    it('should sort categories alphabetically', async () => {
      const categories = await gateway.getCategories();

      const sorted = [...categories].sort();
      expect(categories).toEqual(sorted);
    });

    it('should handle GitHub failure gracefully', async () => {
      githubRepository.getCategories.mockRejectedValue(new Error('Network error'));

      const categories = await gateway.getCategories();

      // Should return only local categories
      expect(categories).toEqual(['patterns', 'quickstart']);
    });
  });

  describe('getGettingStarted', () => {
    it('should return rules document when found', async () => {
      const result = await gateway.getGettingStarted();

      expect(result.frameworkName).toBe('CleanSlice Architecture');
      expect(result.documentation.overview).toContain('SINGULAR names');
    });

    it('should search for rules in quickstart category', async () => {
      await gateway.getGettingStarted();

      expect(docsRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'get-started',
          category: 'quickstart',
        })
      );
    });

    it('should fallback to general quickstart search if rules not found', async () => {
      // Mock no rules document
      docsRepository.search.mockReturnValue([
        {
          name: 'Overview',
          path: '00-quickstart/overview.md',
          content: '# Overview\n\nGeneral overview',
          description: 'Overview',
          category: 'quickstart',
          tags: ['overview'],
          relevanceScore: 15,
          source: 'local',
        },
      ]);
      githubRepository.search.mockResolvedValue([]);

      const result = await gateway.getGettingStarted();

      // Should have called search twice (once for rules, once for fallback)
      expect(docsRepository.search).toHaveBeenCalledTimes(2);
    });
  });

  describe('deduplication', () => {
    it('should dedupe by filename (case insensitive)', async () => {
      docsRepository.search.mockReturnValue([
        {
          name: 'Rules',
          path: 'docs/Rules.md',
          content: 'Local rules',
          relevanceScore: 20,
          source: 'local',
        },
      ]);
      githubRepository.search.mockResolvedValue([
        {
          name: 'Rules',
          path: 'github/rules.md', // Same filename, different case
          content: 'GitHub rules',
          relevanceScore: 15,
          source: 'github',
        },
      ]);

      const { results } = await gateway.search({ query: 'rules', limit: 100 });

      // Should only have one rules.md
      expect(results.length).toBe(1);
      expect(results[0].content).toBe('Local rules'); // Local preferred
    });

    it('should not dedupe documents with different filenames', async () => {
      docsRepository.search.mockReturnValue([
        {
          name: 'Setup',
          path: 'docs/setup.md',
          content: 'Local setup',
          relevanceScore: 20,
          source: 'local',
        },
      ]);
      githubRepository.search.mockResolvedValue([
        {
          name: 'Installation',
          path: 'github/install.md',
          content: 'GitHub install',
          relevanceScore: 15,
          source: 'github',
        },
      ]);

      const { results } = await gateway.search({ query: 'setup', limit: 100 });

      expect(results.length).toBe(2);
    });
  });
});

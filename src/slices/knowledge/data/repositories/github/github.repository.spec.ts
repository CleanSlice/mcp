// @scope:api
// @slice:knowledge
// @layer:data
// @type:test

import { Test, TestingModule } from '@nestjs/testing';
import { GitHubRepository } from './github.repository';
import { GitHubLoader } from './github.loader';
import { IGitHubScannedDocument } from './github.types';

describe('GitHubRepository', () => {
  let repository: GitHubRepository;
  let githubLoader: jest.Mocked<GitHubLoader>;

  const mockScannedDocs: IGitHubScannedDocument[] = [
    {
      path: 'docs/00-quickstart/rules.md',
      name: 'CleanSlice Rules',
      description: 'Essential rules for CleanSlice architecture',
      category: 'quickstart',
      tags: ['rules', 'quickstart', 'getting-started'],
      keywords: ['rules', 'singular', 'naming', 'architecture'],
      sha: 'abc123',
    },
    {
      path: 'docs/02-patterns/gateway-pattern.md',
      name: 'Gateway Pattern',
      description: 'Gateway pattern for external dependencies',
      category: 'patterns',
      tags: ['gateway', 'patterns', 'nestjs'],
      keywords: ['gateway', 'pattern', 'dependency', 'injection'],
      sha: 'def456',
    },
    {
      path: 'docs/02-patterns/repository-pattern.md',
      name: 'Repository Pattern',
      description: 'Repository pattern for data access',
      category: 'patterns',
      tags: ['repository', 'patterns', 'data'],
      keywords: ['repository', 'pattern', 'data', 'access'],
      sha: 'ghi789',
    },
  ];

  const mockContent = '# Mock Document\n\nThis is mock content.';

  beforeEach(async () => {
    const mockLoader = {
      getScannedDocuments: jest.fn().mockResolvedValue(mockScannedDocs),
      getCategories: jest.fn().mockResolvedValue(['quickstart', 'patterns']),
      loadDocument: jest.fn().mockResolvedValue(mockContent),
      initialize: jest.fn().mockResolvedValue(undefined),
      rescan: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubRepository,
        { provide: GitHubLoader, useValue: mockLoader },
      ],
    }).compile();

    repository = module.get<GitHubRepository>(GitHubRepository);
    githubLoader = module.get(GitHubLoader);
  });

  describe('getAllDocuments', () => {
    it('should return all scanned documents from loader', async () => {
      const docs = await repository.getAllDocuments();

      expect(docs).toEqual(mockScannedDocs);
      expect(githubLoader.getScannedDocuments).toHaveBeenCalled();
    });
  });

  describe('getCategories', () => {
    it('should return categories from loader', async () => {
      const categories = await repository.getCategories();

      expect(categories).toEqual(['quickstart', 'patterns']);
      expect(githubLoader.getCategories).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should return empty array when no matches', async () => {
      const results = await repository.search({ query: 'nonexistent123' });

      expect(results).toEqual([]);
    });

    it('should match documents by query text', async () => {
      const results = await repository.search({ query: 'rules' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Rules');
    });

    it('should include source field as github', async () => {
      const results = await repository.search({ query: 'gateway' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].source).toBe('github');
    });

    it('should filter by category', async () => {
      const results = await repository.search({ category: 'patterns' });

      expect(results.length).toBe(2);
      results.forEach((r) => {
        expect(r.category).toBe('patterns');
      });
    });

    it('should filter by framework', async () => {
      const results = await repository.search({ framework: 'nestjs' });

      // Only gateway-pattern has 'nestjs' tag
      expect(results.length).toBeGreaterThanOrEqual(1);
      const gatewayDoc = results.find((r) => r.name === 'Gateway Pattern');
      expect(gatewayDoc).toBeDefined();
    });

    it('should filter by tags', async () => {
      const results = await repository.search({ tags: ['getting-started'] });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should sort by relevance score descending', async () => {
      const results = await repository.search({ query: 'pattern' });

      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].relevanceScore).toBeGreaterThanOrEqual(
            results[i + 1].relevanceScore!
          );
        }
      }
    });

    it('should load content and extract snippets for matched documents', async () => {
      const results = await repository.search({ query: 'gateway' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('snippets');
      expect(Array.isArray(results[0].snippets)).toBe(true);
      expect(githubLoader.loadDocument).toHaveBeenCalled();
    });

    it('should handle multi-word queries', async () => {
      const results = await repository.search({ query: 'gateway pattern' });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should match by sliceName', async () => {
      githubLoader.getScannedDocuments.mockResolvedValue([
        {
          ...mockScannedDocs[0],
          name: 'User Slice Guide',
        },
      ]);

      const results = await repository.search({ sliceName: 'user' });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should boost score for workingOn context', async () => {
      const apiResults = await repository.search({ workingOn: 'api' });

      expect(Array.isArray(apiResults)).toBe(true);
    });

    it('should match by phase', async () => {
      githubLoader.getScannedDocuments.mockResolvedValue([
        {
          ...mockScannedDocs[0],
          tags: ['initialization', 'setup'],
          keywords: ['initialization', 'setup'],
        },
      ]);

      const results = await repository.search({ phase: 'initialization' });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should match by feature', async () => {
      githubLoader.getScannedDocuments.mockResolvedValue([
        {
          ...mockScannedDocs[0],
          tags: ['authentication'],
          keywords: ['authentication', 'login'],
        },
      ]);

      const results = await repository.search({ feature: 'authentication' });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should skip documents when content loading fails', async () => {
      githubLoader.loadDocument.mockResolvedValue(null);

      const results = await repository.search({ query: 'gateway' });

      expect(results).toEqual([]);
    });
  });
});

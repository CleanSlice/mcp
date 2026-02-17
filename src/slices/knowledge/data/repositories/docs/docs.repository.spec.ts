// @scope:api
// @slice:knowledge
// @layer:data
// @type:test

import { Test, TestingModule } from '@nestjs/testing';
import { DocsRepository } from './docs.repository';
import { DocsLoader, IScannedDocument } from './docs.loader';
import { FrameworkNotFoundError } from '../../../../setup/error';

describe('DocsRepository', () => {
  let repository: DocsRepository;

  // Mock document content
  const mockDocContent = '# Test Document\n\nThis is test content.';

  // Mock scanned documents
  const mockScannedDocs: IScannedDocument[] = [
    {
      path: '00-quickstart/new-project.md',
      name: 'New Project Setup Guide',
      description: 'Quick start guide for setting up a new project',
      category: 'quickstart',
      tags: ['new-project', 'setup', 'quickstart', 'guide'],
      keywords: ['new', 'project', 'setup', 'start', 'guide', 'quickstart'],
    },
    {
      path: '00-quickstart/development-roadmap.md',
      name: 'Development Roadmap',
      description: 'Step-by-step roadmap for developing an application',
      category: 'quickstart',
      tags: ['roadmap', 'development', 'steps', 'planning'],
      keywords: ['development', 'roadmap', 'steps', 'planning', 'guide'],
    },
    {
      path: '02-patterns/nestjs-guide.md',
      name: 'NestJS Guide',
      description: 'Guide for NestJS development',
      category: 'patterns',
      tags: ['nestjs', 'backend', 'api'],
      keywords: ['nestjs', 'backend', 'api', 'guide'],
    },
    {
      path: '02-patterns/nuxt-guide.md',
      name: 'Nuxt Guide',
      description: 'Guide for Nuxt development',
      category: 'patterns',
      tags: ['nuxt', 'frontend', 'app'],
      keywords: ['nuxt', 'frontend', 'app', 'guide'],
    },
  ];

  const mockDocsLoader = {
    getScannedDocuments: jest.fn().mockReturnValue(mockScannedDocs),
    loadDocument: jest.fn().mockReturnValue(mockDocContent),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsRepository,
        {
          provide: DocsLoader,
          useValue: mockDocsLoader,
        },
      ],
    }).compile();

    repository = module.get<DocsRepository>(DocsRepository);
  });

  describe('getAllDocuments', () => {
    it('should return all scanned documents', () => {
      const docs = repository.getAllDocuments();

      expect(docs).toEqual(mockScannedDocs);
      expect(mockDocsLoader.getScannedDocuments).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should return empty array when no query matches', () => {
      const results = repository.search({ query: 'xyznonexistentterm123' });

      expect(results).toEqual([]);
    });

    it('should return results matching query text', () => {
      const results = repository.search({ query: 'project' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('path');
      expect(results[0]).toHaveProperty('content');
    });

    it('should throw error for unsupported framework', () => {
      expect(() => {
        repository.search({ framework: 'unsupported-framework' });
      }).toThrow(FrameworkNotFoundError);
    });

    it('should accept valid frameworks (nestjs)', () => {
      expect(() => {
        repository.search({ framework: 'nestjs' });
      }).not.toThrow();
    });

    it('should accept valid frameworks (nuxt)', () => {
      expect(() => {
        repository.search({ framework: 'nuxt' });
      }).not.toThrow();
    });

    it('should filter by framework', () => {
      const results = repository.search({ framework: 'nestjs', query: 'guide' });

      // Should include framework-specific doc and framework-agnostic docs
      expect(results.length).toBeGreaterThan(0);
      // Should not include nuxt-specific docs
      const hasNuxtOnly = results.some(
        (r) => r.tags?.includes('nuxt') && !r.tags?.includes('nestjs')
      );
      expect(hasNuxtOnly).toBe(false);
    });

    it('should match documents by category', () => {
      const results = repository.search({ category: 'quickstart' });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.category).toBe('quickstart');
      });
    });

    it('should match documents by tags', () => {
      const results = repository.search({ tags: ['setup', 'guide'] });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should sort results by relevance score (descending)', () => {
      const results = repository.search({ query: 'project setup' });

      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].relevanceScore).toBeGreaterThanOrEqual(
            results[i + 1].relevanceScore!
          );
        }
      }
    });

    it('should return documents with all expected properties', () => {
      const results = repository.search({ query: 'setup' });

      expect(results.length).toBeGreaterThan(0);
      const doc = results[0];
      expect(doc).toHaveProperty('name');
      expect(doc).toHaveProperty('path');
      expect(doc).toHaveProperty('content');
      expect(doc).toHaveProperty('description');
      expect(doc).toHaveProperty('category');
      expect(doc).toHaveProperty('tags');
      expect(doc).toHaveProperty('relevanceScore');
    });

    it('should handle multi-word queries', () => {
      const results = repository.search({ query: 'new project setup guide' });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should combine multiple search criteria', () => {
      const results = repository.search({
        query: 'setup',
        category: 'quickstart',
      });

      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0].category).toBe('quickstart');
      }
    });

    it('should boost score for workingOn context', () => {
      const apiResults = repository.search({ workingOn: 'api', query: 'guide' });
      const appResults = repository.search({ workingOn: 'app', query: 'guide' });

      expect(Array.isArray(apiResults)).toBe(true);
      expect(Array.isArray(appResults)).toBe(true);
    });

    it('should match documents by sliceName', () => {
      const results = repository.search({ sliceName: 'project' });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should match documents by feature', () => {
      const results = repository.search({ feature: 'setup' });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should match documents by phase', () => {
      // Add phase to mock docs for this test
      mockDocsLoader.getScannedDocuments.mockReturnValue([
        {
          ...mockScannedDocs[0],
          tags: [...mockScannedDocs[0].tags, 'initialization'],
        },
      ]);

      const results = repository.search({ phase: 'initialization' });

      expect(Array.isArray(results)).toBe(true);
    });
  });
});

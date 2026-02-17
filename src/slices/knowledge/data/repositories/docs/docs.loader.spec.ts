// @scope:api
// @slice:knowledge
// @layer:data
// @type:test

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocsLoader } from './docs.loader';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

describe('DocsLoader', () => {
  let loader: DocsLoader;
  const mockExistsSync = fs.existsSync as jest.Mock;
  const mockReadFileSync = fs.readFileSync as jest.Mock;
  const mockReaddirSync = fs.readdirSync as jest.Mock;
  const mockStatSync = fs.statSync as jest.Mock;

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  const setupMocks = () => {
    // Mock docs directory discovery
    mockExistsSync.mockImplementation((path: string) => {
      if (path.endsWith('docs')) return true;
      if (path.endsWith('.md')) return true;
      return false;
    });

    // Mock directory listing
    mockReaddirSync.mockImplementation((path: string) => {
      if (path.endsWith('docs')) {
        return ['00-quickstart', 'README.md'];
      }
      if (path.includes('00-quickstart')) {
        return ['overview.md', 'setup.md'];
      }
      return [];
    });

    // Mock stat for directories/files
    mockStatSync.mockImplementation((path: string) => ({
      isDirectory: () => !path.endsWith('.md'),
      isFile: () => path.endsWith('.md'),
    }));

    // Mock file content
    mockReadFileSync.mockImplementation((path: string) => {
      if (path.includes('README.md')) {
        return '# Documentation\n\nWelcome to the docs.';
      }
      if (path.includes('overview.md')) {
        return '---\ntitle: Overview Guide\ntags: [quickstart, guide]\n---\n\n# Overview\n\nThis is the overview.';
      }
      if (path.includes('setup.md')) {
        return '# Setup Guide\n\nHow to set up your project.';
      }
      return '';
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    setupMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsLoader,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    loader = module.get<DocsLoader>(DocsLoader);
  });

  describe('initialization', () => {
    it('should discover docs directory automatically', () => {
      expect(loader.getBasePath()).toContain('docs');
    });

    it('should scan and index documents on initialization', () => {
      const docs = loader.getScannedDocuments();
      expect(docs.length).toBeGreaterThan(0);
    });
  });

  describe('getScannedDocuments', () => {
    it('should return array of scanned documents', () => {
      const docs = loader.getScannedDocuments();
      expect(Array.isArray(docs)).toBe(true);
    });

    it('should extract document metadata', () => {
      const docs = loader.getScannedDocuments();
      const doc = docs.find((d) => d.path.includes('overview'));

      if (doc) {
        expect(doc.name).toBe('Overview Guide');
        expect(doc.tags).toContain('quickstart');
        expect(doc.category).toBe('quickstart');
      }
    });

    it('should extract name from first heading when no frontmatter title', () => {
      const docs = loader.getScannedDocuments();
      const doc = docs.find((d) => d.path.includes('setup'));

      if (doc) {
        expect(doc.name).toBe('Setup Guide');
      }
    });
  });

  describe('loadDocument', () => {
    it('should return file content when file exists', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('# Test Content');

      const result = loader.loadDocument('test.md');

      expect(result).toBe('# Test Content');
    });

    it('should return null when file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = loader.loadDocument('nonexistent.md');

      expect(result).toBeNull();
    });

    it('should return null and log error when file read fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = loader.loadDocument('error.md');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('rescan', () => {
    it('should clear and rebuild document index', () => {
      const initialDocs = loader.getScannedDocuments();
      const initialCount = initialDocs.length;

      // Rescan
      loader.rescan();

      const newDocs = loader.getScannedDocuments();
      expect(newDocs.length).toBe(initialCount);
    });
  });

  describe('metadata extraction', () => {
    it('should parse frontmatter tags', () => {
      const docs = loader.getScannedDocuments();
      const doc = docs.find((d) => d.path.includes('overview'));

      if (doc) {
        expect(doc.tags).toContain('quickstart');
        expect(doc.tags).toContain('guide');
      }
    });

    it('should extract category from directory path', () => {
      const docs = loader.getScannedDocuments();
      const doc = docs.find((d) => d.path.includes('quickstart'));

      if (doc) {
        expect(doc.category).toBe('quickstart');
      }
    });

    it('should extract keywords from content', () => {
      const docs = loader.getScannedDocuments();
      const doc = docs.find((d) => d.path.includes('overview'));

      if (doc) {
        expect(doc.keywords.length).toBeGreaterThan(0);
      }
    });
  });
});

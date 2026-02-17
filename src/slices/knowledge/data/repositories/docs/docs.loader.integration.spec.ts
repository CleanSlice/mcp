// @scope:api
// @slice:knowledge
// @layer:data
// @type:test
// Integration test - uses real filesystem, no mocks

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocsLoader } from './docs.loader';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.dev file (Jest doesn't load it automatically)
config({ path: join(__dirname, '../../../../../../.env.dev') });

describe('DocsLoader Integration', () => {
  let loader: DocsLoader;

  // Real path to docs folder (from .env.dev)
  const DOCS_PATH = process.env.DOCS_PATH;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsLoader,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'DOCS_PATH' ? DOCS_PATH : undefined),
          },
        },
      ],
    }).compile();

    loader = module.get<DocsLoader>(DocsLoader);
  });

  describe('with real docs folder', () => {
    it('should load from configured path', () => {
      console.log('\n📁 Base path:', loader.getBasePath());
      expect(loader.getBasePath()).toBe(DOCS_PATH);
    });

    it('should scan and find markdown files', () => {
      const docs = loader.getScannedDocuments();

      console.log(`\n📄 Found ${docs.length} documents:\n`);
      docs.forEach((doc, i) => {
        console.log(`${i + 1}. ${doc.name}`);
        console.log(`   Path: ${doc.path}`);
        console.log(`   Category: ${doc.category}`);
        console.log(`   Tags: ${doc.tags.join(', ')}`);
        console.log(`   Description: ${doc.description.substring(0, 80)}...`);
        console.log('');
      });

      expect(docs.length).toBeGreaterThan(0);
    });

    it('should load document content', () => {
      const docs = loader.getScannedDocuments();

      if (docs.length > 0) {
        const firstDoc = docs[0];
        const content = loader.loadDocument(firstDoc.path);

        console.log(`\n📖 Loading: ${firstDoc.name}`);
        console.log(`   Content length: ${content?.length || 0} chars`);
        console.log(`   Preview: ${content?.substring(0, 200)}...`);

        expect(content).not.toBeNull();
        expect(content!.length).toBeGreaterThan(0);
      }
    });

    it('should extract metadata correctly', () => {
      const docs = loader.getScannedDocuments();

      docs.forEach((doc) => {
        expect(doc.path).toBeTruthy();
        expect(doc.name).toBeTruthy();
        expect(doc.category).toBeTruthy();
        expect(Array.isArray(doc.tags)).toBe(true);
        expect(Array.isArray(doc.keywords)).toBe(true);
      });
    });

    it('should return unique categories', () => {
      const categories = loader.getCategories();

      console.log(`\n📂 Found ${categories.length} categories:`);
      categories.forEach((cat) => {
        console.log(`   - ${cat}`);
      });

      expect(categories.length).toBeGreaterThan(0);
      expect(Array.isArray(categories)).toBe(true);
      // Categories should be unique (no duplicates)
      expect(new Set(categories).size).toBe(categories.length);
    });
  });
});

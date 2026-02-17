// @scope:api
// @slice:knowledge
// @layer:data
// @type:test
// Integration test - fetches real data from GitHub

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GitHubLoader } from './github.loader';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.dev file
config({ path: join(__dirname, '../../../../../../../.env.dev') });

describe('GitHubLoader Integration', () => {
  let loader: GitHubLoader;

  // GitHub repo config from env or defaults
  const GITHUB_REPO = process.env.GITHUB_REPO || 'Dreamvention/cleanslice';
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

  beforeAll(async () => {
    console.log(`\n🔗 Testing GitHub integration with: ${GITHUB_REPO}`);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubLoader,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              switch (key) {
                case 'GITHUB_REPO':
                  return GITHUB_REPO;
                case 'GITHUB_BRANCH':
                  return GITHUB_BRANCH;
                case 'GITHUB_TOKEN':
                  return process.env.GITHUB_TOKEN;
                case 'GITHUB_CACHE_TTL':
                  return '60'; // Short TTL for testing
                default:
                  return undefined;
              }
            },
          },
        },
      ],
    }).compile();

    loader = module.get<GitHubLoader>(GitHubLoader);

    // Wait for initialization
    await loader.initialize();
  }, 30000); // 30s timeout for GitHub API

  describe('with real GitHub repository', () => {
    it('should fetch documents from GitHub', async () => {
      const docs = await loader.getScannedDocuments();

      console.log(`\n📄 Found ${docs.length} documents from GitHub:\n`);
      docs.slice(0, 10).forEach((doc, i) => {
        console.log(`${i + 1}. ${doc.name}`);
        console.log(`   Path: ${doc.path}`);
        console.log(`   Category: ${doc.category}`);
        console.log(`   Tags: ${doc.tags.join(', ')}`);
        console.log('');
      });

      if (docs.length > 10) {
        console.log(`   ... and ${docs.length - 10} more documents`);
      }

      expect(docs.length).toBeGreaterThan(0);
    });

    it('should extract categories from GitHub docs', async () => {
      const categories = await loader.getCategories();

      console.log(`\n📂 Found ${categories.length} categories:`);
      categories.forEach((cat) => {
        console.log(`   - ${cat}`);
      });

      expect(categories.length).toBeGreaterThan(0);
      expect(Array.isArray(categories)).toBe(true);
    });

    it('should load document content', async () => {
      const docs = await loader.getScannedDocuments();

      if (docs.length > 0) {
        const firstDoc = docs[0];
        const content = await loader.loadDocument(firstDoc.path);

        console.log(`\n📖 Loading: ${firstDoc.name}`);
        console.log(`   Path: ${firstDoc.path}`);
        console.log(`   Content length: ${content?.length || 0} chars`);
        console.log(`   Preview: ${content?.substring(0, 150)}...`);

        expect(content).not.toBeNull();
        expect(content!.length).toBeGreaterThan(0);
      }
    });

    it('should extract proper metadata from documents', async () => {
      const docs = await loader.getScannedDocuments();

      docs.forEach((doc) => {
        expect(doc.path).toBeTruthy();
        expect(doc.name).toBeTruthy();
        expect(doc.category).toBeTruthy();
        expect(Array.isArray(doc.tags)).toBe(true);
        expect(Array.isArray(doc.keywords)).toBe(true);
        expect(doc.sha).toBeTruthy(); // GitHub-specific field
      });
    });

    it('should cache content after first fetch', async () => {
      const docs = await loader.getScannedDocuments();

      if (docs.length > 0) {
        const testDoc = docs[0];

        // Clear cache by loading a fresh document
        await loader.rescan();
        await loader.loadDocument(testDoc.path);

        // Second fetch (should be cached)
        const content1 = await loader.loadDocument(testDoc.path);
        const content2 = await loader.loadDocument(testDoc.path);

        console.log(`\n⏱️ Cache test:`);
        console.log(`   Content matches: ${content1 === content2}`);

        // Both fetches should return the same content
        expect(content1).toBe(content2);
        expect(content1).not.toBeNull();
      }
    });

    it('should find markdown files in repository', async () => {
      const docs = await loader.getScannedDocuments();

      // Should have found at least one markdown file
      const markdownDocs = docs.filter((d) => d.path.endsWith('.md'));

      console.log(`\n📁 Markdown documents found: ${markdownDocs.length}`);
      markdownDocs.forEach((doc) => {
        console.log(`   - ${doc.path}`);
      });

      expect(markdownDocs.length).toBeGreaterThan(0);
    });
  });
});

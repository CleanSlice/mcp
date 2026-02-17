// @scope:api
// @slice:knowledge
// @layer:data
// @type:loader

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IGitHubTreeResponse,
  IGitHubScannedDocument,
  ICacheEntry,
  IGitHubLoaderConfig,
} from './github.types';

/**
 * GitHub document loader
 *
 * Fetches and caches markdown documentation from a GitHub repository.
 * Uses GitHub API to get repo tree and raw content API for file contents.
 */
@Injectable()
export class GitHubLoader implements OnModuleInit {
  private config: IGitHubLoaderConfig;
  private scannedDocuments: IGitHubScannedDocument[] = [];
  private contentCache: Map<string, ICacheEntry<string>> = new Map();
  private treeCache: ICacheEntry<IGitHubTreeResponse> | null = null;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      repo: this.configService.get<string>('GITHUB_REPO') || 'CleanSlice/docs',
      branch: this.configService.get<string>('GITHUB_BRANCH') || 'main',
      token: this.configService.get<string>('GITHUB_TOKEN'),
      cacheTtl: parseInt(this.configService.get<string>('GITHUB_CACHE_TTL') || '3600', 10),
    };
  }

  async onModuleInit(): Promise<void> {
    // Initialize in background to not block startup
    this.initialize().catch((error) => {
      console.warn('GitHubLoader: Failed to initialize, will retry on first request:', error.message);
    });
  }

  /**
   * Initialize loader by scanning GitHub repository
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.scanRepository();
      this.initialized = true;
    } catch (error) {
      console.error('GitHubLoader: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get all scanned documents
   */
  async getScannedDocuments(): Promise<IGitHubScannedDocument[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.scannedDocuments;
  }

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    const docs = await this.getScannedDocuments();
    const categories = new Set<string>();
    for (const doc of docs) {
      if (doc.category) {
        categories.add(doc.category);
      }
    }
    return Array.from(categories).sort();
  }

  /**
   * Load document content by path
   */
  async loadDocument(path: string): Promise<string | null> {
    // Check cache first
    const cached = this.contentCache.get(path);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.data;
    }

    try {
      const content = await this.fetchRawContent(path);
      if (content) {
        this.contentCache.set(path, {
          data: content,
          timestamp: Date.now(),
          ttl: this.config.cacheTtl * 1000,
        });
      }
      return content;
    } catch (error) {
      console.error(`GitHubLoader: Failed to load document ${path}:`, error);
      return null;
    }
  }

  /**
   * Force rescan of repository
   */
  async rescan(): Promise<void> {
    this.treeCache = null;
    this.contentCache.clear();
    this.scannedDocuments = [];
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Scan repository for markdown files
   */
  private async scanRepository(): Promise<void> {
    const tree = await this.fetchTree();
    if (!tree) {
      console.warn('GitHubLoader: Could not fetch repository tree');
      return;
    }

    // Filter for markdown files in docs folder
    const markdownFiles = tree.tree.filter(
      (item) =>
        item.type === 'blob' &&
        item.path.endsWith('.md') &&
        (item.path.startsWith('docs/') || !item.path.includes('/'))
    );

    // Process each markdown file
    for (const file of markdownFiles) {
      const doc = await this.extractDocumentMetadata(file.path, file.sha);
      if (doc) {
        this.scannedDocuments.push(doc);
      }
    }
  }

  /**
   * Fetch repository tree from GitHub API
   */
  private async fetchTree(): Promise<IGitHubTreeResponse | null> {
    // Check cache
    if (this.treeCache && !this.isCacheExpired(this.treeCache)) {
      return this.treeCache.data;
    }

    const url = `https://api.github.com/repos/${this.config.repo}/git/trees/${this.config.branch}?recursive=1`;

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as IGitHubTreeResponse;

      this.treeCache = {
        data,
        timestamp: Date.now(),
        ttl: this.config.cacheTtl * 1000,
      };

      return data;
    } catch (error) {
      console.error('GitHubLoader: Failed to fetch tree:', error);
      return null;
    }
  }

  /**
   * Fetch raw file content from GitHub
   */
  private async fetchRawContent(path: string): Promise<string | null> {
    const url = `https://raw.githubusercontent.com/${this.config.repo}/${this.config.branch}/${path}`;

    try {
      const response = await fetch(url, {
        headers: this.config.token ? { Authorization: `token ${this.config.token}` } : {},
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`GitHub raw content error: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`GitHubLoader: Failed to fetch content for ${path}:`, error);
      return null;
    }
  }

  /**
   * Extract metadata from a markdown document
   */
  private async extractDocumentMetadata(
    path: string,
    sha: string
  ): Promise<IGitHubScannedDocument | null> {
    const content = await this.loadDocument(path);
    if (!content) {
      return null;
    }

    const filename = path.split('/').pop()?.replace('.md', '') || '';
    const category = this.extractCategory(path);
    const frontmatter = this.parseFrontmatter(content);
    const firstHeading = this.extractFirstHeading(content);
    const firstParagraph = this.extractFirstParagraph(content);

    const name = frontmatter.title || firstHeading || this.formatName(filename);
    const description = frontmatter.description || firstParagraph || '';
    const tags = this.extractTags(path, frontmatter);
    const keywords = this.extractKeywords(name, description, content);

    return {
      path,
      name,
      description,
      category,
      tags,
      keywords,
      sha,
    };
  }

  /**
   * Parse YAML frontmatter
   */
  private parseFrontmatter(content: string): Record<string, any> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      return {};
    }

    const frontmatter: Record<string, any> = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
      const kvMatch = line.match(/^(\w+):\s*(.+)$/);
      if (kvMatch) {
        const [, key, value] = kvMatch;
        if (value.startsWith('[') && value.endsWith(']')) {
          frontmatter[key] = value
            .slice(1, -1)
            .split(',')
            .map((s) => s.trim().replace(/['"]/g, ''));
        } else {
          frontmatter[key] = value.replace(/['"]/g, '').trim();
        }
      }
    }

    return frontmatter;
  }

  /**
   * Extract category from path
   */
  private extractCategory(path: string): string {
    const parts = path.split('/');
    if (parts.length < 2) {
      return 'general';
    }

    // Skip 'docs/' prefix if present
    const startIndex = parts[0] === 'docs' ? 1 : 0;
    if (parts.length <= startIndex) {
      return 'general';
    }

    const topDir = parts[startIndex];
    return topDir.replace(/^\d+-/, '');
  }

  /**
   * Extract first heading from content
   */
  private extractFirstHeading(content: string): string | null {
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    const match = withoutFrontmatter.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract first paragraph from content
   */
  private extractFirstParagraph(content: string): string {
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    const lines = withoutFrontmatter.split('\n');

    let paragraph = '';
    let inParagraph = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!inParagraph) {
        if (trimmed.startsWith('#') || trimmed === '') {
          continue;
        }
        inParagraph = true;
      }

      if (inParagraph && (trimmed === '' || trimmed.startsWith('#'))) {
        break;
      }

      paragraph += (paragraph ? ' ' : '') + trimmed;
    }

    return paragraph.length > 200 ? paragraph.substring(0, 200) + '...' : paragraph;
  }

  /**
   * Extract tags from path and frontmatter
   */
  private extractTags(path: string, frontmatter: Record<string, any>): string[] {
    const tags = new Set<string>();

    if (Array.isArray(frontmatter.tags)) {
      frontmatter.tags.forEach((tag: string) => tags.add(tag.toLowerCase()));
    }

    const parts = path.split('/');
    for (const part of parts) {
      const cleaned = part.replace(/^\d+-/, '').replace(/\.md$/, '');
      if (cleaned && cleaned !== 'README' && cleaned !== 'docs') {
        tags.add(cleaned.toLowerCase());
      }
    }

    return Array.from(tags);
  }

  /**
   * Extract keywords for search
   */
  private extractKeywords(name: string, description: string, content: string): string[] {
    const keywords = new Set<string>();

    name
      .toLowerCase()
      .split(/\s+/)
      .forEach((w) => {
        if (w.length > 2) keywords.add(w);
      });

    description
      .toLowerCase()
      .split(/\s+/)
      .forEach((w) => {
        if (w.length > 3) keywords.add(w);
      });

    const headings = content.match(/^#{1,3}\s+(.+)$/gm) || [];
    for (const heading of headings) {
      const text = heading.replace(/^#+\s+/, '').toLowerCase();
      text.split(/\s+/).forEach((w) => {
        if (w.length > 3) keywords.add(w);
      });
    }

    return Array.from(keywords);
  }

  /**
   * Format filename into readable name
   */
  private formatName(filename: string): string {
    return filename
      .replace(/[-_]/g, ' ')
      .replace(/^\d+\s*/, '')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get headers for GitHub API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (this.config.token) {
      headers.Authorization = `token ${this.config.token}`;
    }

    return headers;
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired<T>(entry: ICacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}

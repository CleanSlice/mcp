// @scope:api
// @slice:knowledge
// @layer:data
// @type:loader

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';

/**
 * Document metadata extracted from file
 */
export interface IScannedDocument {
  /** Relative path from docs base directory */
  path: string;
  /** Document name (from frontmatter title or filename) */
  name: string;
  /** Document description (from frontmatter or first paragraph) */
  description: string;
  /** Category (from parent directory name) */
  category: string;
  /** Tags extracted from frontmatter or path */
  tags: string[];
  /** Keywords for search (extracted from content) */
  keywords: string[];
}

/**
 * Document loader service
 *
 * Loads and scans markdown documentation files from a configurable docs directory.
 * Automatically discovers all .md files and extracts metadata for indexing.
 */
@Injectable()
export class DocsLoader {
  private readonly docsBasePath: string;
  private scannedDocuments: IScannedDocument[] = [];

  constructor(private readonly configService: ConfigService) {
    // Get docs path from config or use default discovery
    const configuredPath = this.configService.get<string>('DOCS_PATH');

    if (configuredPath && existsSync(configuredPath)) {
      this.docsBasePath = configuredPath;
    } else {
      // Fall back to auto-discovery
      this.docsBasePath = this.discoverDocsPath();
    }

    // Scan directory on initialization
    this.scanDirectory();
  }

  /**
   * Get the base path for docs
   */
  getBasePath(): string {
    return this.docsBasePath;
  }

  /**
   * Get all scanned documents with metadata
   */
  getScannedDocuments(): IScannedDocument[] {
    return this.scannedDocuments;
  }

  /**
   * Get all unique categories from scanned documents
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const doc of this.scannedDocuments) {
      if (doc.category) {
        categories.add(doc.category);
      }
    }
    return Array.from(categories).sort();
  }

  /**
   * Rescan the docs directory (useful for hot-reload scenarios)
   */
  rescan(): void {
    this.scannedDocuments = [];
    this.scanDirectory();
  }

  /**
   * Load a document by path
   *
   * @param documentPath - Relative path from docs directory
   * @returns Document content as string, or null if not found
   */
  loadDocument(documentPath: string): string | null {
    const fullPath = join(this.docsBasePath, documentPath);

    if (!existsSync(fullPath)) {
      return null;
    }

    try {
      return readFileSync(fullPath, 'utf-8');
    } catch (error) {
      console.error(`Failed to load document at ${fullPath}:`, error);
      return null;
    }
  }

  /**
   * Scan the docs directory recursively and build document index
   */
  private scanDirectory(subPath: string = ''): void {
    const currentPath = join(this.docsBasePath, subPath);

    if (!existsSync(currentPath)) {
      return;
    }

    const entries = readdirSync(currentPath);

    for (const entry of entries) {
      const entryPath = join(currentPath, entry);
      const relativePath = join(subPath, entry);
      const stat = statSync(entryPath);

      if (stat.isDirectory()) {
        // Skip hidden directories and node_modules
        if (!entry.startsWith('.') && entry !== 'node_modules') {
          this.scanDirectory(relativePath);
        }
      } else if (stat.isFile() && entry.endsWith('.md')) {
        const document = this.extractDocumentMetadata(relativePath);
        if (document) {
          this.scannedDocuments.push(document);
        }
      }
    }
  }

  /**
   * Extract metadata from a markdown document
   */
  private extractDocumentMetadata(relativePath: string): IScannedDocument | null {
    const content = this.loadDocument(relativePath);
    if (!content) {
      return null;
    }

    const filename = basename(relativePath, '.md');
    const category = this.extractCategory(relativePath);
    const frontmatter = this.parseFrontmatter(content);
    const firstHeading = this.extractFirstHeading(content);
    const firstParagraph = this.extractFirstParagraph(content);

    // Build document metadata
    const name = frontmatter.title || firstHeading || this.formatName(filename);
    const description = frontmatter.description || firstParagraph || '';
    const tags = this.extractTags(relativePath, frontmatter);
    const keywords = this.extractKeywords(name, description, content);

    return {
      path: relativePath,
      name,
      description,
      category,
      tags,
      keywords,
    };
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): Record<string, any> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return {};
    }

    const frontmatter: Record<string, any> = {};
    const lines = frontmatterMatch[1].split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        // Handle arrays (simple format: tags: [a, b, c])
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
   * Extract category from path (parent directory name)
   */
  private extractCategory(relativePath: string): string {
    const dir = dirname(relativePath);
    if (dir === '.' || dir === '') {
      return 'general';
    }

    // Get the top-level directory as category
    const parts = dir.split('/');
    const topDir = parts[0];

    // Remove numeric prefix (e.g., "00-quickstart" -> "quickstart")
    return topDir.replace(/^\d+-/, '');
  }

  /**
   * Extract first heading from markdown content
   */
  private extractFirstHeading(content: string): string | null {
    // Skip frontmatter
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    const match = withoutFrontmatter.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract first paragraph from markdown content
   */
  private extractFirstParagraph(content: string): string {
    // Skip frontmatter and headings
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    const lines = withoutFrontmatter.split('\n');

    let paragraph = '';
    let inParagraph = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip headings and empty lines at the start
      if (!inParagraph) {
        if (trimmed.startsWith('#') || trimmed === '') {
          continue;
        }
        inParagraph = true;
      }

      // End paragraph on empty line or heading
      if (inParagraph && (trimmed === '' || trimmed.startsWith('#'))) {
        break;
      }

      paragraph += (paragraph ? ' ' : '') + trimmed;
    }

    // Truncate to reasonable length
    return paragraph.length > 200 ? paragraph.substring(0, 200) + '...' : paragraph;
  }

  /**
   * Extract tags from path and frontmatter
   */
  private extractTags(
    relativePath: string,
    frontmatter: Record<string, any>
  ): string[] {
    const tags = new Set<string>();

    // Tags from frontmatter
    if (Array.isArray(frontmatter.tags)) {
      frontmatter.tags.forEach((tag: string) => tags.add(tag.toLowerCase()));
    }

    // Tags from path segments
    const pathParts = relativePath.split('/');
    for (const part of pathParts) {
      // Remove numeric prefixes and file extension
      const cleaned = part.replace(/^\d+-/, '').replace(/\.md$/, '');
      if (cleaned && cleaned !== 'README') {
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

    // Add words from name
    name
      .toLowerCase()
      .split(/\s+/)
      .forEach((w) => {
        if (w.length > 2) keywords.add(w);
      });

    // Add words from description
    description
      .toLowerCase()
      .split(/\s+/)
      .forEach((w) => {
        if (w.length > 3) keywords.add(w);
      });

    // Extract headings from content as keywords
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
      .replace(/^\d+\s*/, '') // Remove leading numbers
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Auto-discover docs directory by walking up from __dirname
   */
  private discoverDocsPath(): string {
    let currentPath = __dirname;

    // Try up to 10 levels
    for (let i = 0; i < 10; i++) {
      const testPath = join(currentPath, 'docs');
      if (existsSync(testPath)) {
        return testPath;
      }
      currentPath = join(currentPath, '..');
    }

    throw new Error(
      'Could not locate docs directory. Set DOCS_PATH environment variable or ensure docs/ folder exists.'
    );
  }
}

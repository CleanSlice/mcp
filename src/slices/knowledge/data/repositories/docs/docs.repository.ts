// @scope:api
// @slice:knowledge
// @layer:data
// @type:repository

import { Injectable } from '@nestjs/common';
import { DocsLoader, IScannedDocument } from './docs.loader';
import { FrameworkNotFoundError } from '../../../../setup/error';

/**
 * Search query parameters
 */
export interface IDocumentSearchQuery {
  query?: string;
  framework?: string;
  sliceName?: string;
  phase?: 'initialization' | 'setup' | 'implementation' | 'testing' | 'deployment';
  feature?: string;
  workingOn?: 'api' | 'app' | 'admin' | 'full-stack';
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Search result document
 */
export interface IDocumentSearchResult {
  name: string;
  path: string;
  snippets: string[];
  description?: string;
  category?: string;
  tags?: string[];
  relevanceScore?: number;
  source: 'local' | 'github';
}

/**
 * Documentation repository
 *
 * Dynamic search over markdown documentation from docs/ folder.
 * Documents are automatically scanned and indexed by DocsLoader.
 */
@Injectable()
export class DocsRepository {
  private readonly supportedFrameworks = ['nestjs', 'nuxt'];
  private static readonly MAX_SNIPPETS = 3;
  private static readonly SNIPPET_WINDOW = 150;

  constructor(private readonly docsLoader: DocsLoader) {}

  /**
   * Get all indexed documents
   */
  getAllDocuments(): IScannedDocument[] {
    return this.docsLoader.getScannedDocuments();
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return this.docsLoader.getCategories();
  }

  /**
   * Search for relevant documents
   *
   * Dynamically finds and returns documents relevant to the search query.
   * Uses keyword matching, category filtering, and context-aware relevance scoring.
   * Returns snippets (keyword-in-context excerpts) instead of full content.
   *
   * @param query - Search query with optional context parameters
   * @returns Array of relevant documents sorted by relevance
   */
  search(query: IDocumentSearchQuery = {}): IDocumentSearchResult[] {
    if (query.framework) {
      this.validateFramework(query.framework);
    }

    const results: Array<IDocumentSearchResult & { relevanceScore: number }> = [];
    const documents = this.docsLoader.getScannedDocuments();

    for (const doc of documents) {
      let score = 0;

      // Framework matching (check tags/keywords for framework references)
      if (query.framework) {
        const hasFramework =
          doc.tags.includes(query.framework) ||
          doc.keywords.includes(query.framework);
        const isFrameworkAgnostic = !doc.tags.some((t) =>
          this.supportedFrameworks.includes(t)
        );

        if (hasFramework) {
          score += 10;
        } else if (isFrameworkAgnostic) {
          score += 5;
        } else {
          continue; // Skip documents for other frameworks
        }
      }

      // Query text matching (high weight)
      if (query.query) {
        const queryLower = query.query.toLowerCase().trim();
        const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 0);
        const docText = `${doc.name} ${doc.description} ${doc.keywords.join(' ')}`.toLowerCase();

        // Exact phrase match (highest priority)
        if (doc.name.toLowerCase().includes(queryLower)) {
          score += 20;
        } else if (doc.description.toLowerCase().includes(queryLower)) {
          score += 15;
        } else if (doc.keywords.some((kw) => kw.toLowerCase().includes(queryLower))) {
          score += 12;
        } else if (docText.includes(queryLower)) {
          score += 8;
        } else if (queryWords.length > 1) {
          // Multi-word query: match individual words
          const matchedWords = queryWords.filter((word) => docText.includes(word));
          if (matchedWords.length > 0) {
            const matchRatio = matchedWords.length / queryWords.length;
            score += Math.round(10 * matchRatio);
          }
        } else if (queryWords.length === 1) {
          // Single word query
          const word = queryWords[0];
          if (doc.name.toLowerCase().includes(word)) {
            score += 15;
          } else if (doc.description.toLowerCase().includes(word)) {
            score += 12;
          } else if (doc.keywords.some((kw) => kw.toLowerCase().includes(word))) {
            score += 10;
          } else if (docText.includes(word)) {
            score += 5;
          }
        }
      }

      // Phase matching (check tags for phase keywords)
      if (query.phase) {
        if (doc.tags.includes(query.phase) || doc.keywords.includes(query.phase)) {
          score += 8;
        }
      }

      // Feature matching
      if (query.feature) {
        const featureLower = query.feature.toLowerCase();
        if (
          doc.tags.some((t) => t.toLowerCase().includes(featureLower)) ||
          doc.keywords.some((k) => k.toLowerCase().includes(featureLower))
        ) {
          score += 8;
        } else if (doc.name.toLowerCase().includes(featureLower)) {
          score += 5;
        }
      }

      // Category matching
      if (query.category && doc.category === query.category) {
        score += 6;
      }

      // Tag matching
      if (query.tags && query.tags.length > 0) {
        const matchingTags = doc.tags.filter((tag) =>
          query.tags!.some((qt) => tag.toLowerCase().includes(qt.toLowerCase()))
        );
        score += matchingTags.length * 3;
      }

      // Slice name matching
      if (query.sliceName) {
        const sliceLower = query.sliceName.toLowerCase();
        if (doc.name.toLowerCase().includes(sliceLower)) {
          score += 7;
        }
      }

      // Working on context
      if (query.workingOn) {
        if (query.workingOn === 'api' && doc.tags.includes('nestjs')) {
          score += 3;
        } else if (query.workingOn !== 'api' && doc.tags.includes('nuxt')) {
          score += 3;
        }
      }

      // Only include documents with positive relevance
      if (score > 0) {
        const snippets = this.extractSnippets(doc.content, doc.contentLower, query.query);
        results.push({
          name: doc.name,
          path: doc.path,
          snippets,
          description: doc.description,
          category: doc.category,
          tags: doc.tags,
          relevanceScore: score,
          source: 'local',
        });
      }
    }

    // Sort by relevance score (descending)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Extract keyword-in-context snippets from document content
   */
  private extractSnippets(content: string, contentLower: string, query?: string): string[] {
    if (!query) {
      // No query text — return first paragraph as snippet
      return [this.getFirstParagraphSnippet(content)];
    }

    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 0);
    const window = DocsRepository.SNIPPET_WINDOW;
    const ranges: Array<{ start: number; end: number }> = [];

    // Find match positions for the full phrase first, then individual words
    const terms = contentLower.includes(queryLower)
      ? [queryLower]
      : queryWords;

    for (const term of terms) {
      let pos = 0;
      while (pos < contentLower.length && ranges.length < 10) {
        const idx = contentLower.indexOf(term, pos);
        if (idx === -1) break;
        const start = Math.max(0, idx - window);
        const end = Math.min(content.length, idx + term.length + window);
        ranges.push({ start, end });
        pos = idx + term.length;
      }
    }

    if (ranges.length === 0) {
      return [this.getFirstParagraphSnippet(content)];
    }

    // Sort by position and merge overlapping ranges
    ranges.sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
      const last = merged[merged.length - 1];
      if (ranges[i].start <= last.end) {
        last.end = Math.max(last.end, ranges[i].end);
      } else {
        merged.push(ranges[i]);
      }
    }

    // Extract snippet text, break at newlines for cleaner boundaries
    return merged.slice(0, DocsRepository.MAX_SNIPPETS).map(({ start, end }) => {
      let text = content.slice(start, end);
      // Trim to newline boundaries if not at document edges
      if (start > 0) {
        const firstNewline = text.indexOf('\n');
        if (firstNewline !== -1 && firstNewline < window * 0.3) {
          text = text.slice(firstNewline + 1);
        } else {
          text = '...' + text;
        }
      }
      if (end < content.length) {
        const lastNewline = text.lastIndexOf('\n');
        if (lastNewline !== -1 && lastNewline > text.length * 0.7) {
          text = text.slice(0, lastNewline);
        } else {
          text = text + '...';
        }
      }
      return text.trim();
    });
  }

  private getFirstParagraphSnippet(content: string): string {
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    const lines = withoutFrontmatter.split('\n');
    let snippet = '';
    let started = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!started) {
        if (trimmed.startsWith('#') || trimmed === '') continue;
        started = true;
      }
      if (started && (trimmed === '' || trimmed.startsWith('#'))) break;
      snippet += (snippet ? ' ' : '') + trimmed;
    }
    return snippet.length > 300 ? snippet.slice(0, 300) + '...' : snippet;
  }

  /**
   * Validate framework identifier
   */
  private validateFramework(framework: string): void {
    if (!this.supportedFrameworks.includes(framework)) {
      throw new FrameworkNotFoundError(framework, this.supportedFrameworks);
    }
  }
}

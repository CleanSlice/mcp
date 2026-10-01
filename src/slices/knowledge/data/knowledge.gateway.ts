// @scope:api
// @slice:knowledge
// @layer:data
// @type:gateway

import { Injectable, Logger } from '@nestjs/common';
import { IKnowledgeGateway, IDocumentSearchQuery, IPaginatedSearchResult } from '../domain/knowledge.gateway';
import { DocsRepository } from './repositories/docs/docs.repository';
import { DocsLoader } from './repositories/docs/docs.loader';
import { GitHubRepository } from './repositories/github/github.repository';
import { GitHubLoader } from './repositories/github/github.loader';
import type { IDocumentSearchResult } from './repositories/docs/docs.repository';
import { IFrameworkArchitectureData } from '../domain/knowledge.types';

/**
 * Knowledge gateway
 *
 * Searches both local docs and GitHub repository, merging results by relevance.
 * Local results are preferred when duplicates exist (fresher content).
 */
@Injectable()
export class KnowledgeGateway implements IKnowledgeGateway {
  private readonly logger = new Logger(KnowledgeGateway.name);

  constructor(
    private readonly docsRepository: DocsRepository,
    private readonly docsLoader: DocsLoader,
    private readonly githubRepository: GitHubRepository,
    private readonly githubLoader: GitHubLoader,
  ) {}

  async getGettingStarted(): Promise<IFrameworkArchitectureData> {
    // Startup rules are a contract, not a ranked search result. The canonical
    // document is named get-started.md (not rules.md).
    const path = '00-quickstart/get-started.md';
    const content = await this.readDocument(path);
    if (!content?.trim()) {
      throw new Error(`Required CleanSlice documentation unavailable: ${path}`);
    }
    return {
      frameworkName: 'CleanSlice',
      documentation: {
        overview: `Source: ${path}\n\n${content}`,
        whenToUse: '',
        checklist: '',
      },
    };
  }

  async search(query: IDocumentSearchQuery): Promise<IPaginatedSearchResult> {
    const limit = query.limit ?? 5;
    const offset = query.offset ?? 0;

    // Search both sources in parallel
    const [localResults, githubResults] = await Promise.all([
      Promise.resolve(this.docsRepository.search(query)),
      this.githubRepository.search(query).catch((error) => {
        this.logger.warn(`GitHubRepository search failed, using local only: ${error.message}`);
        return [];
      }),
    ]);

    // Merge results, preferring local when duplicates exist (sorted by relevance)
    const merged = this.mergeResults(localResults, githubResults);

    return {
      results: merged.slice(offset, offset + limit),
      total: merged.length,
      limit,
      offset,
    };
  }

  async getCategories(): Promise<string[]> {
    // Get categories from both sources
    const [localCategories, githubCategories] = await Promise.all([
      Promise.resolve(this.docsRepository.getCategories()),
      this.githubRepository.getCategories().catch(() => []),
    ]);

    // Merge and deduplicate
    const allCategories = new Set([...localCategories, ...githubCategories]);
    return Array.from(allCategories).sort();
  }

  /**
   * Read full document content by path
   *
   * Tries local docs first, falls back to GitHub.
   */
  async readDocument(path: string): Promise<string | null> {
    // Try local first
    const localContent = this.docsLoader.loadDocument(path);
    if (localContent) {
      return localContent;
    }

    // Fall back to GitHub
    try {
      return await this.githubLoader.loadDocument(path);
    } catch (error) {
      this.logger.warn(`Failed to load document from GitHub: ${path}`);
      return null;
    }
  }

  /**
   * Merge results from both sources
   *
   * - Deduplicates by document name (local preferred)
   * - Sorts by relevance score
   */
  private mergeResults(
    localResults: IDocumentSearchResult[],
    githubResults: IDocumentSearchResult[]
  ): IDocumentSearchResult[] {
    const seen = new Set<string>();
    const merged: IDocumentSearchResult[] = [];

    // Add local results first (they take priority)
    for (const result of localResults) {
      const key = this.getDedupeKey(result);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(result);
      }
    }

    // Add GitHub results that don't exist locally
    for (const result of githubResults) {
      const key = this.getDedupeKey(result);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(result);
      }
    }

    // Sort by relevance score
    return merged.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Generate deduplication key from result
   *
   * Uses normalized filename to detect duplicates across sources
   */
  private getDedupeKey(result: IDocumentSearchResult): string {
    // Extract filename from path and normalize
    const filename = result.path.split('/').pop()?.toLowerCase() || '';
    return filename;
  }

}

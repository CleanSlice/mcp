// @scope:api
// @slice:knowledge
// @layer:data
// @type:gateway

import { Injectable } from '@nestjs/common';
import { IKnowledgeGateway, IDocumentSearchQuery, IPaginatedSearchResult } from '../domain/knowledge.gateway';
import { DocsRepository } from './repositories/docs/docs.repository';
import { GitHubRepository } from './repositories/github/github.repository';
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
  constructor(
    private readonly docsRepository: DocsRepository,
    private readonly githubRepository: GitHubRepository
  ) {}

  async getGettingStarted(): Promise<IFrameworkArchitectureData> {
    // First, try to find the rules document specifically
    const rulesSearch = await this.search({
      query: 'get-started',
      category: 'quickstart',
      limit: 10,
    });

    // Find the rules document
    const rulesDoc = rulesSearch.results.find(
      (r) => r.path.includes('rules') || r.name.toLowerCase().includes('rules')
    );

    if (rulesDoc) {
      return {
        frameworkName: 'CleanSlice Architecture',
        documentation: {
          overview: rulesDoc.content,
          whenToUse: '',
          checklist: '',
        },
      };
    }

    // Fallback to general quickstart search
    const fallback = await this.search({
      phase: 'initialization',
      category: 'quickstart',
      limit: 10,
    });

    return this.transformToFrameworkArchitecture(fallback.results, 'CleanSlice Architecture');
  }

  async search(query: IDocumentSearchQuery): Promise<IPaginatedSearchResult> {
    const limit = query.limit ?? 5;
    const offset = query.offset ?? 0;

    // Search both sources in parallel
    const [localResults, githubResults] = await Promise.all([
      Promise.resolve(this.docsRepository.search(query)),
      this.githubRepository.search(query).catch((error) => {
        console.warn('GitHubRepository search failed, using local only:', error.message);
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

  private transformToFrameworkArchitecture(
    results: IDocumentSearchResult[],
    frameworkName: string
  ): IFrameworkArchitectureData {
    const overview = this.findContent(results, ['overview', 'slice-creation-rules']);
    const whenToUse = this.findContent(results, ['when-to-use', 'overview']);
    const checklist = this.findContent(results, ['checklist']);

    return {
      frameworkName,
      documentation: {
        overview: overview || '',
        whenToUse: whenToUse || '',
        checklist: checklist || '',
      },
    };
  }

  private findContent(results: IDocumentSearchResult[], keywords: string[]): string | null {
    for (const keyword of keywords) {
      const doc = results.find(
        (r) =>
          r.path.toLowerCase().includes(keyword.toLowerCase()) ||
          r.name.toLowerCase().includes(keyword.toLowerCase())
      );
      if (doc) {
        return doc.content;
      }
    }
    return null;
  }
}

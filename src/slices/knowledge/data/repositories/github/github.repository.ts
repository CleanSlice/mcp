// @scope:api
// @slice:knowledge
// @layer:data
// @type:repository

import { Injectable } from '@nestjs/common';
import { GitHubLoader } from './github.loader';
import { IGitHubScannedDocument } from './github.types';
import { IDocumentSearchQuery } from '../docs/docs.repository';

/**
 * Search result from GitHub repository
 */
export interface IGitHubDocumentSearchResult {
  name: string;
  path: string;
  content: string;
  description?: string;
  category?: string;
  tags?: string[];
  relevanceScore?: number;
  source: 'github';
}

/**
 * GitHub documentation repository
 *
 * Provides search over markdown documentation from GitHub repository.
 * Uses same relevance scoring algorithm as DocsRepository.
 */
@Injectable()
export class GitHubRepository {
  private readonly supportedFrameworks = ['nestjs', 'nuxt'];

  constructor(private readonly githubLoader: GitHubLoader) {}

  /**
   * Get all indexed documents
   */
  async getAllDocuments(): Promise<IGitHubScannedDocument[]> {
    return this.githubLoader.getScannedDocuments();
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    return this.githubLoader.getCategories();
  }

  /**
   * Search for relevant documents
   *
   * Uses same relevance scoring algorithm as DocsRepository.
   */
  async search(query: IDocumentSearchQuery = {}): Promise<IGitHubDocumentSearchResult[]> {
    const results: Array<IGitHubDocumentSearchResult & { relevanceScore: number }> = [];
    const documents = await this.githubLoader.getScannedDocuments();

    for (const doc of documents) {
      let score = 0;

      // Framework matching
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
          continue;
        }
      }

      // Query text matching
      if (query.query) {
        const queryLower = query.query.toLowerCase().trim();
        const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 0);
        const docText = `${doc.name} ${doc.description} ${doc.keywords.join(' ')}`.toLowerCase();

        if (doc.name.toLowerCase().includes(queryLower)) {
          score += 20;
        } else if (doc.description.toLowerCase().includes(queryLower)) {
          score += 15;
        } else if (doc.keywords.some((kw) => kw.toLowerCase().includes(queryLower))) {
          score += 12;
        } else if (docText.includes(queryLower)) {
          score += 8;
        } else if (queryWords.length > 1) {
          const matchedWords = queryWords.filter((word) => docText.includes(word));
          if (matchedWords.length > 0) {
            const matchRatio = matchedWords.length / queryWords.length;
            score += Math.round(10 * matchRatio);
          }
        } else if (queryWords.length === 1) {
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

      // Phase matching
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
        const content = await this.githubLoader.loadDocument(doc.path);
        if (content) {
          results.push({
            name: doc.name,
            path: doc.path,
            content,
            description: doc.description,
            category: doc.category,
            tags: doc.tags,
            relevanceScore: score,
            source: 'github',
          });
        }
      }
    }

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

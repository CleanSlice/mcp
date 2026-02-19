// @scope:api
// @slice:knowledge
// @layer:domain
// @type:interface

import { IFrameworkArchitectureData } from './knowledge.types';
import type { IDocumentSearchResult } from '../data/repositories/docs/docs.repository';

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
 * Paginated search result
 */
export interface IPaginatedSearchResult {
  results: IDocumentSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Knowledge gateway interface
 *
 * Defines contract for accessing framework knowledge from external sources.
 * Gateway searches both local docs and GitHub repository, merging results by relevance.
 */
export interface IKnowledgeGateway {
  getGettingStarted(): Promise<IFrameworkArchitectureData>;

  search(query: IDocumentSearchQuery): Promise<IPaginatedSearchResult>;

  getCategories(): Promise<string[]>;

  readDocument(path: string): Promise<string | null>;
}

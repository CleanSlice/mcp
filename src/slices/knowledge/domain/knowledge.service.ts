// @scope:api
// @slice:knowledge
// @layer:domain
// @type:service

import { Injectable, Inject } from '@nestjs/common';
import { IKnowledgeGateway, IDocumentSearchQuery, IPaginatedSearchResult } from './knowledge.gateway';
import { IFrameworkArchitectureData } from './knowledge.types';

/**
 * Knowledge service
 *
 * Business logic for framework knowledge retrieval.
 * Simple pass-through to gateway - gateway handles all data assembly.
 */
@Injectable()
export class KnowledgeService {
  constructor(
    @Inject('IKnowledgeGateway')
    private readonly knowledgeGateway: IKnowledgeGateway
  ) {}

  async getGettingStarted(): Promise<IFrameworkArchitectureData> {
    return this.knowledgeGateway.getGettingStarted();
  }

  async search(query: IDocumentSearchQuery): Promise<IPaginatedSearchResult> {
    return this.knowledgeGateway.search(query);
  }

  async getCategories(): Promise<string[]> {
    return this.knowledgeGateway.getCategories();
  }
}

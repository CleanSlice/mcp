// @scope:api
// @slice:knowledge
// @layer:domain
// @type:service

import { Injectable, Inject } from '@nestjs/common';
import { IKnowledgeGateway, IDocumentSearchQuery } from './knowledge.gateway';
import { IFrameworkArchitectureData } from './knowledge.types';
import type { IDocumentSearchResult } from '../data/repositories/docs/docs.repository';

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

  async search(query: IDocumentSearchQuery): Promise<IDocumentSearchResult[]> {
    return this.knowledgeGateway.search(query);
  }

  async getCategories(): Promise<string[]> {
    return this.knowledgeGateway.getCategories();
  }
}

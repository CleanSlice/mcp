// @scope:api
// @slice:knowledge
// @layer:data
// @type:mapper

import { Injectable } from '@nestjs/common';
import type {
  ISliceArchitectureData as IRepoSliceArchitectureData,
  ICompleteSliceKnowledgeData as IRepoCompleteSliceKnowledgeData,
  IFrameworkArchitectureData as IRepoFrameworkArchitectureData,
} from './repositories/docs/docs.types';
import type {
  ISliceArchitectureData,
  ICompleteSliceKnowledgeData,
  IFrameworkArchitectureData,
} from '../domain/knowledge.types';

/**
 * Knowledge data mapper
 *
 * Transforms repository types to domain types.
 * All methods are synchronous (no async/await) - pure data transformation.
 *
 * IMPORTANT: Mappers must be synchronous and never call services or gateways.
 * Only transforms data structure, no business logic or formatting.
 *
 * Note: With the simplified docs-based approach, repository and domain types
 * are now identical, so this mapper is essentially a pass-through.
 * Kept for consistency with CleanSlice architecture patterns.
 */
@Injectable()
export class KnowledgeMapper {
  /**
   * Map repository slice architecture data to domain type
   *
   * @param repoData - Repository slice architecture data
   * @returns Domain slice architecture data
   */
  toSliceArchitectureData(repoData: IRepoSliceArchitectureData): ISliceArchitectureData {
    return {
      frameworkName: repoData.frameworkName,
      sliceName: repoData.sliceName,
      documentation: repoData.documentation,
      availableDocs: repoData.availableDocs,
    };
  }

  /**
   * Map repository complete knowledge data to domain type
   *
   * @param repoData - Repository complete knowledge data
   * @returns Domain complete knowledge data
   */
  toCompleteSliceKnowledgeData(
    repoData: IRepoCompleteSliceKnowledgeData
  ): ICompleteSliceKnowledgeData {
    return {
      ...this.toSliceArchitectureData(repoData),
      documents: repoData.documents,
    };
  }

  /**
   * Map repository framework architecture data to domain type
   *
   * @param repoData - Repository framework architecture data
   * @returns Domain framework architecture data
   */
  toFrameworkArchitectureData(
    repoData: IRepoFrameworkArchitectureData
  ): IFrameworkArchitectureData {
    return {
      frameworkName: repoData.frameworkName,
      documentation: repoData.documentation,
    };
  }
}

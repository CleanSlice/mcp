// @scope:api
// @slice:knowledge
// @layer:presentation
// @type:module

import { Module } from '@nestjs/common';
import { KnowledgeTool } from './knowledge.tool';
import { KnowledgeService } from './domain/knowledge.service';
import { DocsRepository } from './data/repositories/docs/docs.repository';
import { DocsLoader } from './data/repositories/docs/docs.loader';
import { GitHubRepository } from './data/repositories/github/github.repository';
import { GitHubLoader } from './data/repositories/github/github.loader';
import { KnowledgeGateway } from './data/knowledge.gateway';
import { KnowledgeMapper } from './data/knowledge.mapper';

/**
 * Knowledge module
 *
 * Provides MCP tools for accessing framework architecture knowledge
 * following CleanSlice best practices with proper layer separation:
 * - Presentation: KnowledgeTool (DTOs handle markdown formatting)
 * - Domain: KnowledgeService (thin orchestration, returns domain types)
 * - Data: DocsRepository (local) + GitHubRepository (remote) + KnowledgeGateway (merges sources)
 *
 * Data flow: Tool → DTO (formats) ← Service → Gateway → [DocsRepository + GitHubRepository]
 *
 * @module KnowledgeModule
 */
@Module({
  providers: [
    KnowledgeTool,
    KnowledgeService,
    KnowledgeMapper,
    // Local docs
    DocsLoader,
    DocsRepository,
    // GitHub docs
    GitHubLoader,
    GitHubRepository,
    // Gateway (merges both sources)
    {
      provide: 'IKnowledgeGateway',
      useClass: KnowledgeGateway,
    },
  ],
  exports: [KnowledgeTool],
})
export class KnowledgeModule {}

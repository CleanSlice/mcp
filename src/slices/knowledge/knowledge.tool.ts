// @scope:api
// @slice:knowledge
// @layer:presentation
// @type:tool

import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '#mcp';
import { z } from 'zod';
import { KnowledgeService } from './domain/knowledge.service';
import {
  FrameworkArchitectureResponseDto,
  SearchResultsResponseDto,
} from './dtos/knowledgeResponse.dto';

/**
 * Knowledge tool
 *
 * Provides two simple tools:
 * - getStarted: Returns essential slice creation rules (read first!)
 * - search: Dynamically searches for relevant documentation
 *
 * Error Handling:
 * - No try-catch blocks needed - errors are caught by ErrorHandlingInterceptor
 * - Domain errors (FrameworkNotFoundError, etc.) are automatically formatted
 * - Returns standardized error responses via setup/error interceptor
 */
@Injectable()
export class KnowledgeTool {
  private readonly logger = new Logger(KnowledgeTool.name);

  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Tool({
    name: 'get-started',
    description:
      '⚠️ CRITICAL: request this tool first before creating any code! Returns essential slice creation rules. READ THIS FIRST before creating any slices! Contains the MOST IMPORTANT naming rule: ALWAYS use SINGULAR names (user/ not users/).',
    parameters: z.object({}),
  })
  async getStarted() {
    this.logger.debug('get-started requested');

    const data = await this.knowledgeService.getGettingStarted();
    const dto = new FrameworkArchitectureResponseDto(data);

    this.logger.debug('get-started: returned slice creation rules');
    return dto.toMcpResponse();
  }

  @Tool({
    name: 'list-categories',
    description:
      'List all available documentation categories. Use this to discover what categories are available before searching.',
    parameters: z.object({}),
  })
  async listCategories() {
    this.logger.debug('list-categories requested');

    const categories = await this.knowledgeService.getCategories();

    this.logger.debug(`list-categories: found ${categories.length} categories`);

    return {
      content: [
        {
          type: 'text' as const,
          text: `## Available Categories\n\n${categories.map((c) => `- **${c}**`).join('\n')}\n\nUse these categories with the \`search\` tool's \`category\` parameter.`,
        },
      ],
    };
  }

  @Tool({
    name: 'search',
    description:
      'Search for relevant documentation. Use `list-categories` first to see available categories. Filter by query text, framework, phase, feature, category, or tags. Returns documents sorted by relevance.',
    parameters: z.object({
      query: z.string().optional().describe('Search query text (searches in document names, descriptions, and keywords)'),
      framework: z
        .string()
        .optional()
        .describe('Framework identifier (e.g., nestjs, nuxt)'),
      sliceName: z
        .string()
        .optional()
        .describe('Name of the slice to find documentation for'),
      phase: z
        .enum(['initialization', 'setup', 'implementation', 'testing', 'deployment'])
        .optional()
        .describe('Development phase to filter by'),
      feature: z
        .string()
        .optional()
        .describe('Feature name (e.g., authentication, user-management, file-upload)'),
      workingOn: z
        .enum(['api', 'app', 'admin', 'full-stack'])
        .optional()
        .describe('Which application you are currently working on'),
      category: z
        .string()
        .optional()
        .describe('Category filter (e.g., quickstart, pattern, best-practices)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Array of tags to filter by'),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Max results to return (default: 5)'),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Number of results to skip for pagination (default: 0)'),
    }),
  })
  async search({ query, framework, sliceName, phase, feature, workingOn, category, tags, limit, offset }) {
    const params = { query, framework, sliceName, phase, feature, workingOn, category, tags, limit, offset };
    this.logger.debug({ msg: 'search requested', params });

    const { results, total, limit: appliedLimit, offset: appliedOffset } = await this.knowledgeService.search(params);

    const dto = new SearchResultsResponseDto(results, { total, limit: appliedLimit, offset: appliedOffset });

    this.logger.debug(`search: returned ${results.length} of ${total} document(s) (offset: ${appliedOffset})`);
    return dto.toMcpResponse();
  }
}
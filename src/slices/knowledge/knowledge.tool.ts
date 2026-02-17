// @scope:api
// @slice:knowledge
// @layer:presentation
// @type:tool

import { Injectable } from '@nestjs/common';
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
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Tool({
    name: 'get-started',
    description:
      '⚠️ CRITICAL: request this tool first before creating any code! Returns essential slice creation rules. READ THIS FIRST before creating any slices! Contains the MOST IMPORTANT naming rule: ALWAYS use SINGULAR names (user/ not users/).',
    parameters: z.object({}),
  })
  async getStarted() {
    console.log('\n🎯 [MCP Request] get-started');
    console.log('   Tool: get-started');
    console.log('   Description: Critical slice creation rules');

    const data = await this.knowledgeService.getGettingStarted();
    const dto = new FrameworkArchitectureResponseDto(data);

    console.log('   ✅ Response: Returned slice creation rules');
    return dto.toMcpResponse();
  }

  @Tool({
    name: 'list-categories',
    description:
      'List all available documentation categories. Use this to discover what categories are available before searching.',
    parameters: z.object({}),
  })
  async listCategories() {
    console.log('\n🎯 [MCP Request] list-categories');

    const categories = await this.knowledgeService.getCategories();

    console.log(`   ✅ Response: Found ${categories.length} categories`);
    console.log(`   Categories: ${categories.join(', ')}`);

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
    console.log('\n🎯 [MCP Request] search');
    console.log('   Tool: search');
    console.log('   Parameters:');
    if (query) console.log(`     - query: ${query}`);
    if (framework) console.log(`     - framework: ${framework}`);
    if (sliceName) console.log(`     - sliceName: ${sliceName}`);
    if (phase) console.log(`     - phase: ${phase}`);
    if (feature) console.log(`     - feature: ${feature}`);
    if (workingOn) console.log(`     - workingOn: ${workingOn}`);
    if (category) console.log(`     - category: ${category}`);
    if (tags) console.log(`     - tags: ${tags.join(', ')}`);
    if (limit) console.log(`     - limit: ${limit}`);
    if (offset) console.log(`     - offset: ${offset}`);

    const { results, total, limit: appliedLimit, offset: appliedOffset } = await this.knowledgeService.search({
      query,
      framework,
      sliceName,
      phase,
      feature,
      workingOn,
      category,
      tags,
      limit,
      offset,
    });

    const dto = new SearchResultsResponseDto(results, { total, limit: appliedLimit, offset: appliedOffset });

    console.log(`   ✅ Response: Returned ${results.length} of ${total} document(s) (offset: ${appliedOffset})`);
    return dto.toMcpResponse();
  }
}
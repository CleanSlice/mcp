// @scope:api
// @slice:mcp
// @layer:application
// @type:service

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Injectable, Logger, Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { McpRegistryService } from './mcp-registry.service';
import { McpToolsHandler } from './handlers/mcp-tools.handler';
import { McpResourcesHandler } from './handlers/mcp-resources.handler';
import { McpPromptsHandler } from './handlers/mcp-prompts.handler';

/**
 * Request-scoped service for executing MCP tools
 */
@Injectable({ scope: Scope.REQUEST })
export class McpExecutorService {
  private logger = new Logger(McpExecutorService.name);
  private registry: McpRegistryService;
  private toolsHandler: McpToolsHandler;
  private resourcesHandler: McpResourcesHandler;
  private promptsHandler: McpPromptsHandler;

  constructor(moduleRef: ModuleRef, registry: McpRegistryService) {
    this.registry = registry;
    this.toolsHandler = new McpToolsHandler(moduleRef, registry);
    this.resourcesHandler = new McpResourcesHandler(moduleRef, registry);
    this.promptsHandler = new McpPromptsHandler(moduleRef, registry);
  }

  /**
   * Register request handlers with the MCP server.
   * Only registers handlers for capabilities that have discovered items,
   * matching the capabilities declared via buildMcpCapabilities().
   */
  registerRequestHandlers(mcpServer: McpServer, httpRequest: any) {
    try {
      if (this.registry.getTools().length > 0) {
        this.toolsHandler.registerHandlers(mcpServer, httpRequest);
      }
      if (this.registry.getResources().length > 0) {
        this.resourcesHandler.registerHandlers(mcpServer, httpRequest);
      }
      if (this.registry.getPrompts().length > 0) {
        this.promptsHandler.registerHandlers(mcpServer, httpRequest);
      }
    } catch (error) {
      this.logger.error(`[MCP] Error registering handlers:`, error);
    }
  }
}

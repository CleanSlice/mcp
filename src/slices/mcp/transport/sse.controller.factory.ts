// @scope:api
// @slice:mcp
// @layer:presentation
// @type:controller

import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  Type,
  UseGuards,
  OnModuleInit,
  VERSION_NEUTRAL,
  applyDecorators,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { CanActivate } from "@nestjs/common";
import { ContextIdFactory, ModuleRef } from "@nestjs/core";
import { Buffer } from "node:buffer";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpOptions } from "../interfaces";
import { ApiTags } from "@nestjs/swagger";
import { McpRegistryService } from "../services/mcp-registry.service";
import { McpExecutorService } from "../services/mcp-executor.service";
import { SsePingService } from "../services/sse-ping.service";

/**
 * Creates a controller for handling SSE connections and tool executions
 */
export function createSseController(
  sseEndpoint: string,
  messagesEndpoint: string,
  globalApiPrefix: string,
  guards: Type<CanActivate>[] = [],
  decorators: ClassDecorator[] = []
) {
  @ApiTags('mcp')
  @Controller({
    version: VERSION_NEUTRAL,
  })
  @applyDecorators(...decorators)
  class SseController implements OnModuleInit {
    // Note: Currently, storing transports and servers in memory makes this not viable for scaling out.
    // Redis can be used for this purpose, but considering that HTTP Streamable succeeds SSE then we can drop keeping this in memory.

    // Map to store active transports by session ID (только для текущего пода)
    public transports = new Map<string, SSEServerTransport>();
    // Map to store MCP server instances by session ID (только для текущего пода)
    public mcpServers = new Map<string, McpServer>();

    constructor(
      @Inject("MCP_OPTIONS") public readonly options: McpOptions,
      public readonly moduleRef: ModuleRef,
      public readonly toolRegistry: McpRegistryService,
      @Inject(SsePingService) public readonly pingService: SsePingService
    ) {}

    /**
     * Initialize the controller and configure ping service
     */
    onModuleInit() {
      // Configure ping service with options
      this.pingService.configure({
        pingEnabled: this.options.sse?.pingEnabled, // Enable by default
        pingIntervalMs: this.options.sse?.pingIntervalMs,
      });
    }

    /**
     * SSE connection endpoint
     */
    @Get(sseEndpoint)
    async sse(@Res() res: Response, @Req() req: Request) {
      // Don't set headers here - SSEServerTransport.start() will handle it
      const transport = new SSEServerTransport(
        // Remove potential double slashes from the path
        `${globalApiPrefix}/${messagesEndpoint}`.replace(/\/+/g, "/"),
        res
      );
      const sessionId = transport.sessionId;

      // Store teamId for this session (locally for the current pod)
      // this.sessionTeams.set(sessionId, teamId); // Remove local storage

      // Create a new MCP server for this session
      const mcpServer = new McpServer(
        { name: this.options.name, version: this.options.version },
        {
          capabilities: this.options.capabilities || {
            tools: {},
            resources: {},
            resourceTemplates: {},
            prompts: {},
          },
          instructions: this.options.instructions || "",
        }
      );

      // Store the transport and server for this session (локально для текущего пода)
      this.transports.set(sessionId, transport);
      this.mcpServers.set(sessionId, mcpServer);

      // Register the connection with the ping service
      this.pingService.registerConnection(sessionId, transport, res);

      // Handle client disconnect using modern event handling
      const cleanup = () => {
        this.transports.delete(sessionId);
        this.mcpServers.delete(sessionId);
        // this.sessionTeams.delete(sessionId); // Remove local storage
        this.pingService.removeConnection(sessionId);
      };

      // Use modern event handling for Node.js v22 compatibility
      if (req.socket && typeof req.socket.on === "function") {
        req.socket.on("close", cleanup);
        req.socket.on("end", cleanup);
      }

      // Also handle request close event
      req.on("close", cleanup);

      // Set transport close handler
      transport.onclose = () => {
        cleanup();
      };

      try {
        await mcpServer.connect(transport);
        // Connection successful - transport handles all SSE communication
      } catch (error) {
        console.error(
          `[MCP] Failed to connect MCP server for session ${sessionId}:`,
          error
        );
        // Clean up on error
        cleanup();

        // If headers haven't been sent yet, send error response
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to connect MCP server" });
        } else {
          res.end();
        }
      }
    }

    /**
     * Tool execution endpoint - protected by the provided guards
     */
    @Post(messagesEndpoint)
    @UseGuards(...guards)
    async messages(
      @Req() req: Request,
      @Res() res: Response,
      @Body() body: unknown
    ) {
      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        console.error(`[MCP] Missing session ID in request to ${req.url}`);
        return res.status(400).json({ error: "Session ID is required" });
      }

      console.log(`[MCP] Processing request for session: ${sessionId}`);
      console.log(
        `[MCP] Local active sessions: ${Array.from(this.transports.keys()).join(", ")}`
      );

      // First check local sessions
      let transport = this.transports.get(sessionId);
      let mcpServer = this.mcpServers.get(sessionId);

      // If session not found locally, check Redis and restore if needed
      if (!transport || !mcpServer) {
        console.log(
          `[MCP] Session ${sessionId} not found locally, checking Redis...`
        );
      }

      console.log(`[MCP] Successfully found/restored session ${sessionId}`);

      const normalizedBody = this.normalizeRequestBody(body);

      if (typeof normalizedBody === "string") {
        (req as any).body = normalizedBody;
        (req as any).rawBody = normalizedBody;
      }

      // Resolve the request-scoped tool executor service
      const contextId = ContextIdFactory.getByRequest(req);
      const executor = await this.moduleRef.resolve(
        McpExecutorService,
        contextId,
        { strict: false }
      );

      // Register request handlers with the user context from this specific request
      executor.registerRequestHandlers(mcpServer, req);

      // Process the message
      // Note: For restored sessions, we can't use transport.handlePostMessage()
      // because it tries to send headers that are already sent
      // Instead, we'll handle the request directly through the MCP server

      try {
        // For restored sessions, we need to handle the request differently
        // since we can't use the original transport
        if (this.transports.has(sessionId)) {
          // Original session - use normal transport handling
          await transport.handlePostMessage(req, res, normalizedBody);
        } else {
          // Restored session - handle manually
          // Parse the request body as MCP message
          let mcpMessage: any = body;
          if (normalizedBody) {
            try {
              mcpMessage = JSON.parse(normalizedBody);
            } catch (parseError) {
              console.warn(
                `[MCP] Failed to parse MCP message body as JSON for session ${sessionId}:`,
                parseError
              );
              mcpMessage = body;
            }
          }

          // Check if it's a tool call request
          if (mcpMessage?.method === "tools/call") {
            // Execute the tool directly
            const toolName = mcpMessage?.params?.name;
            if (toolName) {
              // Find and execute the tool
              const toolInfo = this.toolRegistry.findTool(toolName);
              if (toolInfo) {
                try {
                  const contextId = ContextIdFactory.getByRequest(req);
                  const toolInstance = await this.moduleRef.resolve(
                    toolInfo.providerClass,
                    contextId,
                    { strict: false }
                  );

                  if (toolInstance) {
                    const result = await toolInstance[toolInfo.methodName].call(
                      toolInstance,
                      mcpMessage?.params?.arguments || {},
                      {
                        reportProgress: () => {},
                        log: {
                          debug: () => {},
                          error: () => {},
                          info: () => {},
                          warn: () => {},
                        },
                      },
                      req
                    );

                    res.json({
                      jsonrpc: "2.0",
                      id: mcpMessage?.id,
                      result: result,
                    });
                  } else {
                    res.status(500).json({
                      jsonrpc: "2.0",
                      id: mcpMessage?.id,
                      error: {
                        code: -32000,
                        message: "Tool instance not found",
                      },
                    });
                  }
                } catch (error) {
                  res.status(500).json({
                    jsonrpc: "2.0",
                    id: mcpMessage?.id,
                    error: { code: -32000, message: error.message },
                  });
                }
              } else {
                res.status(404).json({
                  jsonrpc: "2.0",
                  id: mcpMessage?.id,
                  error: {
                    code: -32601,
                    message: `Tool not found: ${toolName}`,
                  },
                });
              }
            } else {
              res.status(400).json({
                jsonrpc: "2.0",
                id: mcpMessage?.id,
                error: { code: -32602, message: "Tool name not specified" },
              });
            }
          } else {
            // For other MCP methods, return method not found
            res.status(404).json({
              jsonrpc: "2.0",
              id: mcpMessage?.id,
              error: {
                code: -32601,
                message: `Method not supported: ${mcpMessage?.method}`,
              },
            });
          }
        }
      } catch (error) {
        console.error(
          `[MCP] Error handling MCP request for session ${sessionId}:`,
          error
        );

        // Send error response
        res.status(500).json({
          error: "Failed to process MCP request",
          sessionId,
          details: error.message,
        });
      }
    }

    normalizeRequestBody(body: unknown): string {
      if (typeof body === "string") {
        return body;
      }

      if (Buffer.isBuffer(body)) {
        return body.toString("utf8");
      }

      if (body instanceof Uint8Array) {
        return Buffer.from(body).toString("utf8");
      }

      if (body === undefined || body === null) {
        return "";
      }

      try {
        const json = JSON.stringify(body);
        return typeof json === "string" ? json : String(body);
      } catch {
        return String(body);
      }
    }

  }

  return SseController;
}

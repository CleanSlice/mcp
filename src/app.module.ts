import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./slices/health/health.module";
import { McpModule } from "./slices/mcp/mcp.module";
import { McpTransportType } from "./slices/mcp/interfaces/mcp-options.interface";
import { KnowledgeModule } from "./slices/knowledge/knowledge.module";
import { SetupModule } from "./slices/setup/setup.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    McpModule.forRoot({
      name: "cleanslice-mcp",
      version: "1.0.0",
      transport: [McpTransportType.SSE, McpTransportType.STREAMABLE_HTTP, McpTransportType.STDIO],
      sseEndpoint: "sse",
      messagesEndpoint: "messages",
      mcpEndpoint: "mcp",
    }),
    SetupModule,
    HealthModule,
    KnowledgeModule,
  ],
})
export class AppModule {}

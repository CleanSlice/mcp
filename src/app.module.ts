import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./slices/health/health.module";
import { McpModule } from "./slices/mcp/mcp.module";
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
      sseEndpoint: "mcp/sse",
      messagesEndpoint: "mcp/messages",
      mcpEndpoint: "mcp/mcp",
    }),
    SetupModule,
    HealthModule,
    KnowledgeModule,
  ],
})
export class AppModule {}

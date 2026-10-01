// @scope:api
// @slice:setup/swagger
// @layer:presentation
// @type:config

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';

/**
 * The committed OpenAPI artifact, `swagger-spec.json`.
 *
 * Resolved from this file rather than from `process.cwd()`: the spec belongs to
 * the package, not to whichever directory a command happened to be started
 * from. Four levels up lands on the package root from both `src/` and the
 * compiled `dist/`, which are the same depth.
 */
export const SWAGGER_SPEC_PATH = join(__dirname, '..', '..', '..', '..', 'swagger-spec.json');

/**
 * The OpenAPI document, built once and used twice: `main.ts` serves it at `/api`
 * and `/api.json`, and the `swagger:generate` entrypoint writes it to
 * {@link SWAGGER_SPEC_PATH}. One builder for both, because a published spec that
 * disagrees with the running server is worse than no spec at all.
 *
 * Writing the file is deliberately NOT part of serving it. The artifact is
 * tracked in git, so a write on every boot left anyone who had ever started the
 * server with a modified file they had not touched.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('CleanSlice MCP Server')
    .setVersion('1.0')
    .addTag('api')
    .addTag('mcp')
    .addServer('/')
    .build();

  return SwaggerModule.createDocument(app, config);
}

/**
 * The exact bytes of the artifact. Generation and the staleness check share it,
 * so "up to date" means byte-identical and nothing softer.
 */
export function serializeOpenApiDocument(document: OpenAPIObject): string {
  return JSON.stringify(document);
}

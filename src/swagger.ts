// @scope:api
// @slice:-
// @layer:presentation
// @type:entrypoint

import { NestFactory } from '@nestjs/core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

import { AppModule } from './app.module';
import {
  buildOpenApiDocument,
  serializeOpenApiDocument,
  SWAGGER_SPEC_PATH,
} from './slices/setup/swagger';

/**
 * The explicit way to produce `swagger-spec.json`.
 *
 *   npm run swagger:generate   write the spec
 *   npm run swagger:check      fail if the committed spec is stale
 *
 * The file is tracked in git, so it is never written while the server boots -
 * that would leave a modified file in the working tree of everyone who has ever
 * started it.
 *
 * The app is created but never started: `NestFactory.create` alone is enough to
 * explore the routes, and it skips `onModuleInit`, so nothing warms up just to
 * write a JSON file.
 */
async function main(): Promise<number> {
  const check = process.argv.includes('--check');
  const where = relative(process.cwd(), SWAGGER_SPEC_PATH) || SWAGGER_SPEC_PATH;

  const app = await NestFactory.create(AppModule, { logger: false });
  const spec = serializeOpenApiDocument(buildOpenApiDocument(app));
  await app.close();

  if (!check) {
    writeFileSync(SWAGGER_SPEC_PATH, spec);
    console.log(`wrote ${where}`);
    return 0;
  }

  const committed = existsSync(SWAGGER_SPEC_PATH) ? readFileSync(SWAGGER_SPEC_PATH, 'utf8') : null;
  if (committed === spec) {
    console.log(`${where} is up to date`);
    return 0;
  }

  console.error(
    `${where} is stale - the server publishes a different contract than the one committed.\n` +
      `Run \`npm run swagger:generate\` and commit the result.`
  );
  return 1;
}

void main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  }
);

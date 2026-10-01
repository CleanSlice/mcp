// @scope:api
// @slice:setup/swagger
// @layer:presentation
// @type:index

/**
 * Swagger subslice exports
 *
 * The one place the OpenAPI document is built. `main.ts` serves it; `swagger.ts`
 * writes the committed `swagger-spec.json`.
 */

export {
  buildOpenApiDocument,
  serializeOpenApiDocument,
  SWAGGER_SPEC_PATH,
} from './swagger.config';

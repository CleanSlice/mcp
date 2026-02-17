// @scope:api
// @slice:setup/response
// @layer:decorators
// @type:decorator

import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for flat response flag
 */
export const IS_FLAT_RESPONSE = 'isFlat';

/**
 * FlatResponse decorator
 *
 * Mark a controller method to return the response as-is without wrapping
 * in the standard { data, success } structure.
 *
 * Use this for:
 * - Responses that already have their own structure
 * - Pass-through endpoints
 * - Custom formatted responses
 * - File downloads
 *
 * @example
 * ```typescript
 * @Get('custom')
 * @FlatResponse()
 * getCustomResponse() {
 *   return { custom: 'structure', values: [1, 2, 3] };
 * }
 * ```
 */
export const FlatResponse = () => SetMetadata(IS_FLAT_RESPONSE, true);

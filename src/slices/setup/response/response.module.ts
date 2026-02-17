// @scope:api
// @slice:setup/response
// @layer:presentation
// @type:module

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor';

/**
 * Response subslice module
 *
 * Provides response formatting infrastructure as part of the setup slice.
 *
 * Features:
 * - Global response interceptor
 * - Standardized response wrapper
 * - @FlatResponse() decorator
 * - Pagination support
 *
 * This is a nested subslice under setup/ that provides shared
 * response formatting functionality for the entire application.
 *
 * All responses are automatically wrapped in:
 * { data: T, success: true }
 *
 * Use @FlatResponse() decorator to opt-out for specific endpoints.
 *
 * @example
 * ```typescript
 * // Import decorator
 * import { FlatResponse } from '@slices/setup/response';
 *
 * @Get('custom')
 * @FlatResponse()
 * getCustomResponse() {
 *   return { custom: 'structure' };
 * }
 * ```
 */
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
  exports: [],
})
export class ResponseModule {}

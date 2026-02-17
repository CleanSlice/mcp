// @scope:api
// @slice:setup/error
// @layer:presentation
// @type:module

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorHandlingInterceptor } from './interceptors/error-handling.interceptor';

/**
 * Error subslice module
 *
 * Provides error handling infrastructure as part of the setup slice.
 *
 * Features:
 * - Global error interceptor
 * - Standardized error responses
 * - Custom error classes
 * - Error logging
 *
 * This is a nested subslice under setup/ that provides shared
 * error handling functionality for the entire application.
 *
 * @example
 * ```typescript
 * // Use domain errors anywhere in the app
 * import { FrameworkNotFoundError } from '@slices/setup/error';
 *
 * throw new FrameworkNotFoundError('nestjs', ['nestjs', 'nuxt']);
 * ```
 */
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorHandlingInterceptor,
    },
  ],
  exports: [],
})
export class ErrorModule {}

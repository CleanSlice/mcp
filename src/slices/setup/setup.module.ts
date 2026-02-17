// @scope:api
// @slice:setup
// @layer:presentation
// @type:module

import { Module } from '@nestjs/common';
import { ErrorModule } from './error/error.module';
import { ResponseModule } from './response/response.module';

/**
 * Setup slice module
 *
 * Parent slice containing cross-cutting infrastructure concerns.
 * Organized as nested subslices for better modularity.
 *
 * Subslices:
 * - error/ - Error handling and standardized error responses
 * - response/ - Response formatting and standardized success responses
 *
 * This follows the nested slices pattern where related functionality
 * is grouped under a parent slice (setup/) with clear subdirectories
 * for each concern (error/, response/).
 *
 * Features:
 * - Global error handling
 * - Standardized error responses
 * - Global response formatting
 * - Standardized success responses
 * - @FlatResponse() decorator for opt-out
 *
 * Usage:
 * Import this module in AppModule to enable all setup functionality:
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [SetupModule],
 * })
 * export class AppModule {}
 * ```
 *
 * Then use features anywhere:
 *
 * @example
 * ```typescript
 * // Error handling
 * import { FrameworkNotFoundError } from '@slices/setup/error';
 * throw new FrameworkNotFoundError('nestjs');
 *
 * // Response formatting
 * import { FlatResponse } from '@slices/setup/response';
 * @FlatResponse()
 * getCustom() { return { custom: 'data' }; }
 * ```
 */
@Module({
  imports: [ErrorModule, ResponseModule],
  exports: [ErrorModule, ResponseModule],
})
export class SetupModule {}

// @scope:api
// @slice:setup/error
// @layer:domain
// @type:error

import { HttpException } from '@nestjs/common';
import { ErrorCodes } from './error.types';

/**
 * Base error class for all application errors
 *
 * Extends HttpException to integrate with NestJS error handling.
 * Provides standardized error structure with:
 * - Error code (from ErrorCodes enum)
 * - HTTP status code
 * - Error message
 * - Optional cause (chained errors)
 *
 * @example
 * ```typescript
 * class FrameworkNotFoundError extends BaseError {
 *   constructor(framework: string) {
 *     super(`Framework '${framework}' not found`, 404);
 *     this.code = ErrorCodes.FRAMEWORK_NOT_FOUND;
 *   }
 * }
 * ```
 */
export abstract class BaseError extends HttpException {
  public code: ErrorCodes = ErrorCodes.UNEXPECTED_ERROR;
  public override cause: Error;

  /**
   * Create a new BaseError
   *
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param options - Additional options including cause
   */
  constructor(
    message: string,
    statusCode: number = 500,
    options?: { cause?: Error }
  ) {
    super(message, statusCode, { cause: options?.cause });
    this.cause = options?.cause || new Error(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get the HTTP status code
   */
  getStatus(): number {
    return super.getStatus();
  }

  /**
   * Get the error cause (chained error)
   */
  getCause(): Error {
    return this.cause || new Error('No cause provided');
  }

  /**
   * Get error code
   */
  getCode(): ErrorCodes {
    return this.code;
  }
}

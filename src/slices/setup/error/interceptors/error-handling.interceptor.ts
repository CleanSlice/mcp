// @scope:api
// @slice:setup/error
// @layer:interceptors
// @type:interceptor

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';
import { Response } from 'express';
import { BaseError } from '../domain/base.error';
import { IErrorResponse } from '../domain/error.types';

/**
 * Error handling interceptor
 *
 * Catches all errors thrown during request processing and formats them
 * into a standardized error response structure.
 *
 * Features:
 * - Standardized error response format
 * - Proper HTTP status codes
 * - Error logging
 * - Support for custom error codes
 * - Chain error causes
 *
 * @example
 * ```typescript
 * // In module
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: ErrorHandlingInterceptor,
 *     },
 *   ],
 * })
 * ```
 */
@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorHandlingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        // Determine status code
        const statusCode =
          error instanceof HttpException || error instanceof BaseError
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        // Extract error message
        const message =
          error.response?.message ||
          error.message ||
          'An unexpected error occurred';

        // Extract error code
        const code =
          error instanceof BaseError
            ? error.getCode()
            : error.code || 'UNEXPECTED_ERROR';

        // Build standardized error response
        const errorResponse: IErrorResponse = {
          code,
          statusCode,
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        // Add details if available (for validation errors, etc.)
        if (error.details) {
          errorResponse.details = error.details;
        }

        // Log error
        this.logger.error(
          `[${code}] ${message}`,
          error.stack,
          JSON.stringify({
            path: request.url,
            method: request.method,
            statusCode,
          })
        );

        // Send error response
        response.status(statusCode).json(errorResponse);

        // Re-throw to allow further error handling if needed
        return throwError(() => error);
      })
    );
  }
}

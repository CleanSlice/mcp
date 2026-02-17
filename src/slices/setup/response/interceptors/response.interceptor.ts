// @scope:api
// @slice:setup/response
// @layer:interceptors
// @type:interceptor

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { IS_FLAT_RESPONSE } from '../decorators/flat-response.decorator';
import { IApiResponse } from '../domain/response.types';

/**
 * Response formatting interceptor
 *
 * Automatically wraps all successful responses in a standardized structure:
 * { data: T, success: true }
 *
 * Exceptions:
 * - Methods decorated with @FlatResponse() - returned as-is
 * - Responses with pagination metadata (isLastPage, meta) - preserved
 *
 * Features:
 * - Consistent response structure
 * - Automatic success flag
 * - Pagination support
 * - Opt-out via decorator
 *
 * @example
 * ```typescript
 * // Standard response (gets wrapped)
 * @Get('users')
 * getUsers() {
 *   return [{ id: 1, name: 'John' }];
 * }
 * // Response: { data: [{ id: 1, name: 'John' }], success: true }
 *
 * // Flat response (returned as-is)
 * @Get('custom')
 * @FlatResponse()
 * getCustom() {
 *   return { custom: 'structure' };
 * }
 * // Response: { custom: 'structure' }
 * ```
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, IApiResponse<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<IApiResponse<T>> {
    // Check if method is decorated with @FlatResponse()
    const isFlat = this.reflector.getAllAndOverride<boolean>(
      IS_FLAT_RESPONSE,
      [context.getHandler(), context.getClass()]
    );

    return next.handle().pipe(
      map((data) => {
        // If @FlatResponse() is used, return data as-is
        if (isFlat) {
          return data;
        }

        // If response has pagination metadata (isLastPage), preserve structure
        if (data?.isLastPage !== undefined) {
          return { ...data, success: true };
        }

        // If response has pagination metadata (meta), preserve structure
        if (data?.meta !== undefined) {
          return { ...data, success: true };
        }

        // Wrap response in standard structure
        return {
          data,
          success: true,
        };
      })
    );
  }
}

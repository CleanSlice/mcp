// @scope:api
// @slice:setup/response
// @layer:presentation
// @type:index

/**
 * Response subslice exports
 *
 * Provides easy access to response formatting functionality
 */

// Domain types
export * from './domain/response.types';

// Module
export * from './response.module';

// Decorator
export * from './decorators/flat-response.decorator';

// Interceptor
export * from './interceptors/response.interceptor';

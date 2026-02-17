// @scope:api
// @slice:setup/error
// @layer:presentation
// @type:index

/**
 * Error subslice exports
 *
 * Provides easy access to error handling functionality
 */

// Domain types
export * from './domain/error.types';

// Base error class
export * from './domain/base.error';

// Domain errors
export * from './domain/domain.errors';

// Module
export * from './error.module';

// Interceptor
export * from './interceptors/error-handling.interceptor';

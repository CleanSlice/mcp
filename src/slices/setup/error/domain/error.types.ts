// @scope:api
// @slice:setup/error
// @layer:domain
// @type:types

/**
 * Standard error codes for the application
 */
export enum ErrorCodes {
  // Generic errors
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',

  // Domain-specific errors
  FRAMEWORK_NOT_FOUND = 'FRAMEWORK_NOT_FOUND',
  SLICE_NOT_FOUND = 'SLICE_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  INVALID_FRAMEWORK = 'INVALID_FRAMEWORK',
  INVALID_SLICE_NAME = 'INVALID_SLICE_NAME',
}

/**
 * Standard error response structure
 */
export interface IErrorResponse {
  code: string;
  statusCode: number;
  message: string;
  timestamp: string;
  path?: string;
  details?: unknown;
}

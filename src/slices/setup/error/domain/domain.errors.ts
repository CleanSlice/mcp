// @scope:api
// @slice:setup/error
// @layer:domain
// @type:error

import { BaseError } from './base.error';
import { ErrorCodes } from './error.types';

/**
 * Framework not found error
 *
 * Thrown when a requested framework doesn't exist
 */
export class FrameworkNotFoundError extends BaseError {
  constructor(framework: string, availableFrameworks?: string[]) {
    const available = availableFrameworks
      ? ` Available frameworks: ${availableFrameworks.join(', ')}`
      : '';
    super(`Framework '${framework}' not found.${available}`, 404);
    this.code = ErrorCodes.FRAMEWORK_NOT_FOUND;
  }
}

/**
 * Slice not found error
 *
 * Thrown when a requested slice doesn't exist
 */
export class SliceNotFoundError extends BaseError {
  constructor(sliceName: string, framework: string) {
    super(
      `Slice '${sliceName}' not found for framework '${framework}'`,
      404
    );
    this.code = ErrorCodes.SLICE_NOT_FOUND;
  }
}

/**
 * Document not found error
 *
 * Thrown when a requested document doesn't exist
 */
export class DocumentNotFoundError extends BaseError {
  constructor(documentName: string, framework: string) {
    super(
      `Document '${documentName}' not found for framework '${framework}'`,
      404
    );
    this.code = ErrorCodes.DOCUMENT_NOT_FOUND;
  }
}

/**
 * Invalid framework error
 *
 * Thrown when framework parameter is invalid
 */
export class InvalidFrameworkError extends BaseError {
  constructor(framework: string, reason?: string) {
    const message = reason
      ? `Invalid framework '${framework}': ${reason}`
      : `Invalid framework '${framework}'`;
    super(message, 400);
    this.code = ErrorCodes.INVALID_FRAMEWORK;
  }
}

/**
 * Invalid slice name error
 *
 * Thrown when slice name parameter is invalid
 */
export class InvalidSliceNameError extends BaseError {
  constructor(sliceName: string, reason?: string) {
    const message = reason
      ? `Invalid slice name '${sliceName}': ${reason}`
      : `Invalid slice name '${sliceName}'`;
    super(message, 400);
    this.code = ErrorCodes.INVALID_SLICE_NAME;
  }
}

/**
 * Validation error
 *
 * Thrown when input validation fails
 */
export class ValidationError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 400);
    this.code = ErrorCodes.VALIDATION_ERROR;
    Object.assign(this, { details });
  }
}

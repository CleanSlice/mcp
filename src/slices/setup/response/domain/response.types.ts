// @scope:api
// @slice:setup/response
// @layer:domain
// @type:types

/**
 * Standard API response wrapper
 *
 * Wraps all successful API responses in a consistent structure
 */
export interface IApiResponse<T> {
  data?: T;
  success: boolean;
  error?: string;
}

/**
 * Paginated response structure
 *
 * For responses that include pagination metadata
 */
export interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLastPage: boolean;
  success: boolean;
}

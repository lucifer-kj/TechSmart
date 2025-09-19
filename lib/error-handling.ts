/**
 * Standardized error handling utilities for the customer portal
 */

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
  status?: number;
}

export class CustomerPortalError extends Error {
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly status?: number;

  constructor(message: string, options?: {
    code?: string;
    details?: unknown;
    status?: number;
  }) {
    super(message);
    this.name = 'CustomerPortalError';
    this.code = options?.code;
    this.details = options?.details;
    this.status = options?.status;
  }
}

/**
 * Standardized error handler for API responses
 */
export async function handleApiResponse<T>(
  response: Response,
  context: string = 'API call'
): Promise<T> {
  if (!response.ok) {
    let errorMessage = `${context} failed`;
    let errorDetails: unknown = undefined;
    let errorCode: string | undefined = undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      errorDetails = errorData.details;
      errorCode = errorData.code;
    } catch {
      // If we can't parse the error response, use status text
      errorMessage = response.statusText || errorMessage;
    }

    throw new CustomerPortalError(errorMessage, {
      code: errorCode,
      details: errorDetails,
      status: response.status
    });
  }

  return response.json();
}

/**
 * Standardized error handler for async operations
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  context: string = 'Operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof CustomerPortalError) {
      throw error;
    }

    // Handle network errors, timeouts, etc.
    if (error instanceof Error) {
      throw new CustomerPortalError(
        `${context} failed: ${error.message}`,
        { details: error.message }
      );
    }

    // Handle unknown error types
    throw new CustomerPortalError(
      `${context} failed with unknown error`,
      { details: error }
    );
  }
}

/**
 * User-friendly error messages for common scenarios
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof CustomerPortalError) {
    // Handle specific error codes
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'AUTHENTICATION_REQUIRED':
        return 'Please sign in to continue.';
      case 'INSUFFICIENT_PERMISSIONS':
        return 'You do not have permission to perform this action.';
      case 'RESOURCE_NOT_FOUND':
        return 'The requested information could not be found.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment and try again.';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    // Handle common error patterns
    if (error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error.message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    if (error.message.includes('404')) {
      return 'The requested information could not be found.';
    }
    if (error.message.includes('500')) {
      return 'A server error occurred. Please try again later.';
    }
    if (error.message.includes('401') || error.message.includes('403')) {
      return 'Please sign in to continue.';
    }

    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Retry mechanism for failed operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoffMultiplier?: number;
    context?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoffMultiplier = 2,
    context = 'Operation'
  } = options;

  let lastError: unknown;
  let currentDelay = delay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on authentication errors or validation errors
      if (error instanceof CustomerPortalError) {
        if (error.code === 'AUTHENTICATION_REQUIRED' || 
            error.code === 'INSUFFICIENT_PERMISSIONS' ||
            error.code === 'VALIDATION_ERROR' ||
            error.code === 'RESOURCE_NOT_FOUND') {
          throw error;
        }
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw new CustomerPortalError(
    `${context} failed after ${maxRetries + 1} attempts`,
    { details: lastError }
  );
}

/**
 * Error boundary helper for React components
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof CustomerPortalError) {
    return !['AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'VALIDATION_ERROR'].includes(error.code || '');
  }

  if (error instanceof Error) {
    return !error.message.includes('401') && 
           !error.message.includes('403') && 
           !error.message.includes('404') &&
           !error.message.includes('validation');
  }

  return true;
}

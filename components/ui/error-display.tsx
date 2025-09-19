"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerPortalError, getFriendlyErrorMessage, isRetryableError } from "@/lib/error-handling";

interface ErrorDisplayProps {
  error: unknown;
  context?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function ErrorDisplay({
  error,
  context = "Operation",
  onRetry,
  onDismiss,
  showDetails = false,
  className = ""
}: ErrorDisplayProps) {
  const friendlyMessage = getFriendlyErrorMessage(error);
  const canRetry = isRetryableError(error) && onRetry;

  const getErrorIcon = () => {
    if (error instanceof CustomerPortalError) {
      switch (error.code) {
        case 'NETWORK_ERROR':
          return '📡';
        case 'AUTHENTICATION_REQUIRED':
          return '🔐';
        case 'INSUFFICIENT_PERMISSIONS':
          return '🚫';
        case 'RESOURCE_NOT_FOUND':
          return '🔍';
        case 'VALIDATION_ERROR':
          return '⚠️';
        case 'RATE_LIMIT_EXCEEDED':
          return '⏱️';
        default:
          return '❌';
      }
    }
    return '❌';
  };

  const getErrorColor = () => {
    if (error instanceof CustomerPortalError) {
      switch (error.code) {
        case 'NETWORK_ERROR':
          return 'border-orange-200 bg-orange-50 dark:bg-orange-900/20';
        case 'AUTHENTICATION_REQUIRED':
          return 'border-red-200 bg-red-50 dark:bg-red-900/20';
        case 'INSUFFICIENT_PERMISSIONS':
          return 'border-red-200 bg-red-50 dark:bg-red-900/20';
        case 'RESOURCE_NOT_FOUND':
          return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20';
        case 'VALIDATION_ERROR':
          return 'border-orange-200 bg-orange-50 dark:bg-orange-900/20';
        case 'RATE_LIMIT_EXCEEDED':
          return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
        default:
          return 'border-red-200 bg-red-50 dark:bg-red-900/20';
      }
    }
    return 'border-red-200 bg-red-50 dark:bg-red-900/20';
  };

  const getTextColor = () => {
    if (error instanceof CustomerPortalError) {
      switch (error.code) {
        case 'NETWORK_ERROR':
          return 'text-orange-600 dark:text-orange-400';
        case 'AUTHENTICATION_REQUIRED':
          return 'text-red-600 dark:text-red-400';
        case 'INSUFFICIENT_PERMISSIONS':
          return 'text-red-600 dark:text-red-400';
        case 'RESOURCE_NOT_FOUND':
          return 'text-yellow-600 dark:text-yellow-400';
        case 'VALIDATION_ERROR':
          return 'text-orange-600 dark:text-orange-400';
        case 'RATE_LIMIT_EXCEEDED':
          return 'text-blue-600 dark:text-blue-400';
        default:
          return 'text-red-600 dark:text-red-400';
      }
    }
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className={`${getErrorColor()} ${className}`}>
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="text-3xl">{getErrorIcon()}</span>
          </div>
          
          <h3 className="text-lg font-medium mb-2">
            {context} Failed
          </h3>
          
          <p className={`font-medium mb-4 ${getTextColor()}`}>
            {friendlyMessage}
          </p>

          {showDetails && error instanceof Error && (
            <details className="text-left mb-4">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                <div><strong>Error:</strong> {error.name}</div>
                <div><strong>Message:</strong> {error.message}</div>
                {error instanceof CustomerPortalError && (
                  <>
                    {error.code && <div><strong>Code:</strong> {error.code}</div>}
                    {error.status && <div><strong>Status:</strong> {error.status}</div>}
                    {error.details && <div><strong>Details:</strong> {JSON.stringify(error.details, null, 2)}</div>}
                  </>
                )}
              </div>
            </details>
          )}

          <div className="flex justify-center space-x-3">
            {canRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
              >
                🔄 Try Again
              </Button>
            )}
            
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simple error message component for inline use
 */
interface ErrorMessageProps {
  error: unknown;
  className?: string;
}

export function ErrorMessage({ error, className = "" }: ErrorMessageProps) {
  const friendlyMessage = getFriendlyErrorMessage(error);
  
  return (
    <p className={`text-sm text-red-600 dark:text-red-400 ${className}`}>
      {friendlyMessage}
    </p>
  );
}

'use client'

import type { ErrorRendererProps } from './types'

/**
 * ErrorRenderer - Displays error messages in the chat interface
 *
 * Renders error information with optional retry and dismiss actions.
 * Styled to integrate with Carbon AI Chat components.
 */
export function ErrorRenderer({
  error,
  onRetry,
  onDismiss,
  className = ''
}: ErrorRendererProps) {
  const { message, code, details, timestamp, recoverable = true } = error

  return (
    <div
      className={`error-renderer border border-red-200 bg-red-50 rounded-lg p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="error-renderer__icon text-red-500 flex-shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="error-renderer__content flex-1 min-w-0">
          <div className="error-renderer__header flex items-center gap-2 flex-wrap">
            <span className="font-medium text-red-800">Error</span>
            {code && (
              <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">
                Code: {code}
              </span>
            )}
          </div>

          <p className="error-renderer__message mt-1 text-sm text-red-700">
            {message}
          </p>

          {details && (
            <details className="error-renderer__details mt-2">
              <summary className="text-xs text-red-600 cursor-pointer hover:underline">
                Show details
              </summary>
              <pre className="mt-1 text-xs text-red-600 bg-red-100 p-2 rounded overflow-x-auto">
                {details}
              </pre>
            </details>
          )}

          {timestamp && (
            <p className="error-renderer__timestamp mt-2 text-xs text-red-500">
              {new Date(timestamp).toLocaleString()}
            </p>
          )}

          {(onRetry || onDismiss) && (
            <div className="error-renderer__actions mt-3 flex gap-2">
              {onRetry && recoverable && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-sm px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="text-sm px-3 py-1.5 border border-red-300 text-red-700 rounded hover:bg-red-100 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorRenderer

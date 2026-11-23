import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { ApiError } from '../../types/api.types';
import { Button } from './Button';

export interface ErrorMessageProps {
  error: ApiError | Error | string | null | undefined;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  title = 'An error occurred',
  onRetry,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const isApiError = error instanceof ApiError;
  const message = typeof error === 'string' ? error : error.message;
  const code = isApiError ? error.code : undefined;
  const requestId = isApiError ? error.requestId : undefined;
  const fields = isApiError ? error.fields : [];

  return (
    <div
      role="alert"
      className={`p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">{title}</h4>
            {requestId && (
              <button
                type="button"
                onClick={() => setShowDetails((p) => !p)}
                className="text-xs text-red-700 hover:text-red-900 flex items-center gap-1 font-mono focus:outline-none"
              >
                <span>ID: {requestId.slice(0, 8)}...</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <p className="text-sm mt-1 leading-relaxed text-red-800">{message}</p>

          {fields.length > 0 && (
            <ul className="mt-2 text-xs text-red-700 list-disc list-inside space-y-0.5">
              {fields.map((f, i) => (
                <li key={i}>
                  <span className="font-semibold">{f.field}:</span> {f.message}
                </li>
              ))}
            </ul>
          )}

          {showDetails && (requestId || code) && (
            <div className="mt-3 p-2 bg-red-100/60 rounded border border-red-200 text-xs font-mono text-red-800 space-y-1">
              {code && <p>Error Code: {code}</p>}
              {requestId && <p>Support Request ID: {requestId}</p>}
            </div>
          )}

          {onRetry && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="border-red-300 text-red-800 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

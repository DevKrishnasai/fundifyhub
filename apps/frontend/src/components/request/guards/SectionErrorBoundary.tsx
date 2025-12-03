'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * SectionErrorBoundary - Isolates errors to individual sections
 * Prevents one broken section from crashing the entire page
 */

interface SectionErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Name of the section for error reporting */
  sectionName: string;
  /** Custom fallback UI */
  fallback?: ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show retry button */
  showRetry?: boolean;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SectionErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error(
      `[SectionErrorBoundary] Error in "${this.props.sectionName}":`,
      error,
      errorInfo
    );

    this.setState({ errorInfo });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // In production, you'd send this to your error tracking service
    // e.g., Sentry.captureException(error, { extra: { errorInfo, sectionName } });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, sectionName, fallback, showRetry = true } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Failed to load {sectionName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Something went wrong while loading this section. 
              {showRetry && ' You can try again or refresh the page.'}
            </p>
            
            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            {showRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}

/**
 * Functional wrapper for easier use with hooks
 * Note: Error boundaries must be class components
 */
export function withSectionErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  sectionName: string
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <SectionErrorBoundary sectionName={sectionName}>
      <WrappedComponent {...props} />
    </SectionErrorBoundary>
  );

  WithErrorBoundary.displayName = `withSectionErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
}

export default SectionErrorBoundary;

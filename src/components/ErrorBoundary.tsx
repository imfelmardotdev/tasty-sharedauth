import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full">
            <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
            <div className="bg-muted p-4 rounded mb-4">
              <p className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            {/* Only show reload button if environment variables are missing */}
            {this.state.error?.message.includes('environment variables') && (
              <p className="text-sm text-muted-foreground mb-4">
                Please ensure all required environment variables are set in Netlify:
                <ul className="list-disc list-inside mt-2">
                  <li>VITE_SUPABASE_URL</li>
                  <li>VITE_SUPABASE_ANON_KEY</li>
                  <li>VITE_SUPABASE_SERVICE_KEY</li>
                </ul>
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

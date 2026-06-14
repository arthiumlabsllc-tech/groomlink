import { Component, ErrorInfo, ReactNode } from 'react';
import Icon from './Icon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-elevated border border-gray-200 dark:border-gray-700 p-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
                <Icon name="error_outline" size={32} className="text-red-500" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-heading">
                Something went wrong
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                An unexpected error occurred. You can try reloading the page or going back to the dashboard.
              </p>

              {this.state.error && (
                <details className="text-left mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-all overflow-auto max-h-40">
                    {this.state.error.message}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Go Home
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 px-4 py-2.5 bg-ghana-green text-white rounded-lg font-medium hover:bg-support-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="refresh" size={16} />
                  Reload
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

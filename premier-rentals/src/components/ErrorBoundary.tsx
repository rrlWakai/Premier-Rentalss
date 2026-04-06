import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f5f0] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border border-[rgba(201,169,110,0.2)]">
            <div className="w-16 h-16 bg-[#fff9f0] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-[#c9a96e]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#1a1a1a] font-['Jost'] mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-8 font-['Jost']">
              An unexpected error has occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white px-6 py-3 rounded hover:bg-[#2a2a2a] transition-colors font-['Jost'] tracking-wider uppercase text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  parsedDetails: Record<string, unknown> | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
    parsedDetails: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    let parsedDetails: Record<string, unknown> | null = null;
    try {
      const maybeJson = JSON.parse(error.message);
      if (maybeJson && typeof maybeJson === 'object') {
        parsedDetails = maybeJson;
      }
    } catch {
      parsedDetails = null;
    }

    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
      parsedDetails,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '', parsedDetails: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const displayError =
        this.state.parsedDetails && typeof this.state.parsedDetails.error === 'string'
          ? this.state.parsedDetails.error
          : this.state.errorMessage;

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-slate-900">
                  Workspace Operation Interrupted
                </h2>
                <p className="mt-1 text-sm text-slate-600 break-words">{displayError}</p>
                {this.state.parsedDetails && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 space-y-1">
                    <div>
                      Operation: {String(this.state.parsedDetails.operationType || 'unknown')}
                    </div>
                    <div>Path: {String(this.state.parsedDetails.path || 'n/a')}</div>
                  </div>
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={this.handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reload Workspace</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

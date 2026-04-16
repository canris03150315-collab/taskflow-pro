import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="text-5xl mb-4 opacity-50">⚠️</div>
          <h2 className="text-lg font-bold text-slate-700 mb-2">
            {this.props.fallbackTitle || '此頁面載入時發生錯誤'}
          </h2>
          <p className="text-sm text-slate-400 mb-4 max-w-md">
            {this.state.error?.message || '未知錯誤'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition"
          >
            重新載入此頁面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

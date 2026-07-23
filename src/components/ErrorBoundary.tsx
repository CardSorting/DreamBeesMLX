import React, { Component, ErrorInfo, ReactNode } from 'react';
import { IconZap } from '../icons';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Renderer Error]', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fatal-error-immersive">
          <div className="error-content">
            <div className="error-orb">
              <IconZap size={48} />
            </div>
            <h1>The vision was interrupted</h1>
            <p>A fatal glitch occurred in the latent space. We've captured the diagnostics for analysis.</p>
            <button 
              onClick={() => window.location.reload()}
              className="retry-btn clickable"
            >
              Reawaken Studio
            </button>
            <pre className="error-stack">
              {this.state.error?.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, resetErrorBoundary: () => void) => ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    resetKeys?: Array<unknown>;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: undefined };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
        // Optionally log to external services here
    }

    resetErrorBoundary = () => {
        this.setState({ hasError: false, error: undefined });
    };

    componentDidUpdate(prevProps: ErrorBoundaryProps) {
        // Automatically reset error boundary if children change
        if (this.state.hasError && (prevProps.children !== this.props.children || JSON.stringify(this.props.resetKeys) !== JSON.stringify(prevProps.resetKeys))) {
            this.resetErrorBoundary();
        }
    }

    render() {
        const { hasError, error } = this.state;

        if (hasError && error) {
            if (this.props.fallback) {
                return this.props.fallback(error, this.resetErrorBoundary);
            }

            return (
                <div>
                    <h2>Something went wrong.</h2>
                    <code>{error.message}</code>
                    <button onClick={this.resetErrorBoundary}>Try again</button>
                </div>
            );
        }

        return this.props.children;
    }
}
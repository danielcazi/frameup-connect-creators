import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-xl w-full bg-card border rounded-lg shadow-lg p-8">
                        <div className="flex items-center gap-3 mb-4 text-destructive">
                            <AlertCircle className="w-8 h-8" />
                            <h1 className="text-2xl font-bold">Algo deu errado</h1>
                        </div>

                        <p className="text-muted-foreground mb-6">
                            Ocorreu um erro inesperado ao renderizar este componente.
                        </p>

                        {this.state.error && (
                            <div className="bg-muted p-4 rounded-md overflow-auto mb-6 max-h-60 text-xs font-mono">
                                <p className="font-bold mb-2">{this.state.error.toString()}</p>
                                <pre>{this.state.errorInfo?.componentStack}</pre>
                            </div>
                        )}

                        <Button onClick={() => window.location.reload()}>
                            Recarregar Página
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

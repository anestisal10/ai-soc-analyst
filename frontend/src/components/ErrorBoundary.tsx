"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Fix #25: React Error Boundary — prevents a rendering crash in any child
 * component (e.g. InvestigationGraph, ReportDashboard) from taking down the
 * entire page. Displays a friendly fallback UI with a retry button.
 */
export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[ErrorBoundary] Caught rendering error:", error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    className="editorial-card flex flex-col items-center justify-center text-center py-16 px-8 gap-5"
                    style={{ borderColor: "var(--status-critical-solid)" }}
                >
                    <div
                        className="w-14 h-14 flex items-center justify-center mb-2"
                        style={{
                            backgroundColor: "#FEF2F2",
                            border: "1px solid var(--status-critical-solid)",
                            borderRadius: "2px",
                        }}
                    >
                        <AlertTriangle className="w-7 h-7" style={{ color: "var(--status-critical-solid)" }} />
                    </div>
                    <div>
                        <h3
                            className="text-base font-bold mb-1"
                            style={{ fontFamily: "var(--font-syne)", color: "var(--text-main)" }}
                        >
                            Rendering Error
                        </h3>
                        <p
                            className="text-sm max-w-sm mb-2"
                            style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-mono)" }}
                        >
                            A component failed to render. This is likely a temporary issue.
                        </p>
                        {this.state.error && (
                            <pre
                                className="text-xs text-left bg-red-50 border border-red-200 rounded p-3 max-w-md overflow-auto mt-2"
                                style={{ fontFamily: "var(--font-dm-mono)", color: "var(--status-critical-text)" }}
                            >
                                {this.state.error.message}
                            </pre>
                        )}
                    </div>
                    <button
                        onClick={this.handleReset}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

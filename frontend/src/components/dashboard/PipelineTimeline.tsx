"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, BarChart3 } from 'lucide-react';

export interface TimelineStep {
    label: string;
    status: 'pending' | 'running' | 'done';
    timestamp?: string;
}

interface PipelineTimelineProps {
    timeline: TimelineStep[];
}

export default function PipelineTimeline({ timeline }: PipelineTimelineProps) {
    return (
        <div
            className="p-4 min-h-[160px]"
            style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '2px',
            }}
        >
            <AnimatePresence>
                {timeline.length > 0 ? (
                    <div className="space-y-2.5">
                        {timeline.map((step, i) => (
                            <motion.div
                                key={step.label}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-center gap-2.5 text-xs"
                            >
                                {/* Step indicator */}
                                {step.status === 'running' && (
                                    <div
                                        className="w-3 h-3 border-2 rounded-full animate-spin flex-shrink-0"
                                        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                                    />
                                )}
                                {step.status === 'done' && (
                                    <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--status-safe-solid)' }} />
                                )}
                                {step.status === 'pending' && (
                                    <div
                                        className="w-3 h-3 rounded-full border flex-shrink-0"
                                        style={{ borderColor: 'var(--border-strong)' }}
                                    />
                                )}
                                <span
                                    style={{
                                        fontFamily: 'var(--font-dm-mono)',
                                        color:
                                            step.status === 'running'
                                                ? 'var(--accent)'
                                                : step.status === 'done'
                                                    ? 'var(--text-main)'
                                                    : 'var(--text-muted)',
                                        fontWeight: step.status !== 'pending' ? '500' : '400',
                                    }}
                                >
                                    {step.label}
                                </span>
                                {step.timestamp && (
                                    <span
                                        className="ml-auto"
                                        style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}
                                    >
                                        {step.timestamp}
                                    </span>
                                )}
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-2 opacity-50">
                        <BarChart3 className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>
                            Awaiting analysis task
                        </p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

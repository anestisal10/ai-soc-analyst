import React from 'react';
import { motion } from 'framer-motion';

interface ScoreBreakdown {
    factor: string;
    score: number;
    type: string;
    description: string;
}

export default function ThreatWaterfall({
    score,
    breakdown
}: {
    score: number;
    breakdown: ScoreBreakdown[];
}) {
    let color = 'var(--status-safe-solid)';
    if (score >= 70) color = 'var(--status-critical-solid)';
    else if (score >= 30) color = 'var(--status-high-solid)';

    const label = score >= 70 ? 'Critical' : score >= 30 ? 'Suspicious' : 'Clean';
    const badgeClass = score >= 70 ? 'badge-critical' : score >= 30 ? 'badge-high' : 'badge-safe';

    return (
        <div className="flex flex-col w-full px-2 pt-2">
            <div className="flex justify-between items-center mb-6 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                    <span
                        className="text-5xl font-extrabold tracking-tight leading-none"
                        style={{ fontFamily: 'var(--font-syne)', color: color }}
                    >
                        {score}
                    </span>
                    <span
                        className="flex flex-col text-[9px] font-bold text-[#78746D] uppercase tracking-[0.14em]"
                        style={{ fontFamily: 'var(--font-dm-mono)' }}
                    >
                        <span>Total Score</span>
                        <span>Out of 100</span>
                    </span>
                </div>
                <div>
                    <span className={`badge ${badgeClass}`}>{label} Risk</span>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {breakdown.map((item, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                            <span
                                className="text-[10px] font-bold uppercase tracking-widest"
                                style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-main)' }}
                            >
                                {item.factor}
                            </span>
                            <span
                                className="text-xs font-bold"
                                style={{
                                    fontFamily: 'var(--font-dm-mono)',
                                    color: item.score > 0 ? 'var(--status-critical-solid)' : 'var(--status-safe-solid)'
                                }}
                            >
                                {item.score > 0 ? '+' : ''}{item.score}
                            </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-muted)' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(item.score, 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.15 }}
                                className="h-full rounded-full"
                                style={{
                                    backgroundColor: item.score > 0 ? 'var(--status-critical-solid)' : 'var(--status-safe-solid)'
                                }}
                            />
                        </div>
                        {item.description && (
                            <span className="text-[9px] truncate" style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-muted)' }} title={item.description}>
                                {item.description}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

import React from 'react';

export default function ThreatGauge({ score }: { score: number }) {
    const radius = 58;
    const stroke = 8;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    let color = 'var(--status-safe-solid)';
    if (score >= 70) color = 'var(--status-critical-solid)';
    else if (score >= 30) color = 'var(--status-high-solid)';

    const label = score >= 70 ? 'Critical' : score >= 30 ? 'Suspicious' : 'Clean';
    const badgeClass = score >= 70 ? 'badge-critical' : score >= 30 ? 'badge-high' : 'badge-safe';

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
                <svg width="144" height="144" viewBox="0 0 144 144" className="transform -rotate-90">
                    <circle cx="72" cy="72" r={radius} fill="none" stroke="#E2DFD9" strokeWidth={stroke} />
                    <circle
                        cx="72" cy="72" r={radius}
                        fill="none" stroke={color} strokeWidth={stroke}
                        strokeLinecap="butt"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - progress}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                    <span
                        className="text-5xl font-extrabold tracking-tight"
                        style={{ fontFamily: 'var(--font-syne)', color: color }}
                    >
                        {score}
                    </span>
                    <span
                        className="text-[9px] font-bold text-[#78746D] uppercase tracking-[0.14em] mt-1"
                        style={{ fontFamily: 'var(--font-dm-mono)' }}
                    >
                        Threat Score
                    </span>
                </div>
            </div>
            <span className={`badge ${badgeClass}`}>{label} Risk</span>
        </div>
    );
}

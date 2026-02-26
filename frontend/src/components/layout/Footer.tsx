import React from 'react';

export default function Footer() {
    return (
        <footer
            className="w-full mt-auto"
            style={{
                backgroundColor: 'var(--bg-card)',
                borderTop: '1px solid var(--border-subtle)',
            }}
        >
            <div className="max-w-[1440px] mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center">
                <p
                    className="text-[11px] font-medium"
                    style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-muted)' }}
                >
                    © 2026 AI SOC Analyst Platform
                </p>
                <div
                    className="flex flex-row items-center gap-4 mt-2 md:mt-0 text-[11px] font-medium"
                    style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-muted)' }}
                >
                    {['Technical Engine', 'Behavioral Engine', 'OSINT Enrichment'].map((item, i, arr) => (
                        <React.Fragment key={item}>
                            <span>{item}</span>
                            {i < arr.length - 1 && <span className="w-0.5 h-0.5 rounded-full bg-current" />}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </footer>
    );
}

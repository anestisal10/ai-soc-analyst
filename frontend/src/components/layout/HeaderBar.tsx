import { Cpu, Radio } from 'lucide-react';

export default function HeaderBar() {
    return (
        <div
            className="border-b z-40"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
            <div className="max-w-[1440px] mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="section-label mb-2">
                        <span
                            className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 text-white"
                            style={{ background: 'var(--accent)', borderRadius: '2px', fontFamily: 'var(--font-dm-mono)' }}
                        >
                            Live
                        </span>
                        Threat Analysis Workspace
                    </div>
                    <h2
                        className="text-2xl font-extrabold tracking-tight"
                        style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-main)' }}
                    >
                        Command Center
                    </h2>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>
                        Multi-Engine Threat Analysis & Automated Response
                    </p>
                </div>

                <div className="flex gap-3">
                    {[
                        { icon: Cpu, label: 'Engines', value: '2 Active', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
                        { icon: Radio, label: 'Mode', value: 'Realtime', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
                    ].map(({ icon: Icon, label, value, color, bg, border }) => (
                        <div
                            key={label}
                            className={`flex items-center gap-3 px-4 py-2.5 ${bg} border ${border}`}
                            style={{ borderRadius: '2px' }}
                        >
                            <Icon className={`w-4 h-4 ${color}`} />
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#78746D]" style={{ fontFamily: 'var(--font-dm-mono)' }}>{label}</p>
                                <p className="text-sm font-bold text-[#0F0F0E]" style={{ fontFamily: 'var(--font-syne)' }}>{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

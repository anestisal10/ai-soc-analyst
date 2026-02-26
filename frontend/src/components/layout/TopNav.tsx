import { Shield } from 'lucide-react';

export default function TopNav() {
    return (
        <header className="top-nav sticky top-0 z-50">
            <div className="max-w-[1440px] mx-auto px-6 h-[52px] flex items-center justify-between">
                {/* Wordmark */}
                <div className="flex items-center gap-3">
                    <div
                        className="w-7 h-7 flex items-center justify-center"
                        style={{ background: 'var(--accent)', borderRadius: '2px' }}
                    >
                        <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-white font-bold text-sm tracking-tight uppercase" style={{ fontFamily: 'var(--font-syne)' }}>
                            SOC Analyst
                        </span>
                        <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-500" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                            AI Platform
                        </span>
                    </div>
                </div>

                {/* Nav + Status */}
                <div className="flex items-center gap-8">
                    <nav className="hidden md:flex items-center gap-6">
                        {['Dashboard', 'Reports', 'Settings'].map((item, i) => (
                            <span
                                key={item}
                                className="text-xs font-bold uppercase tracking-[0.12em] cursor-pointer transition-colors"
                                style={{
                                    fontFamily: 'var(--font-syne)',
                                    color: i === 0 ? '#FFFFFF' : '#6B6B6B',
                                    borderBottom: i === 0 ? '2px solid var(--accent)' : '2px solid transparent',
                                    paddingBottom: '2px',
                                }}
                            >
                                {item}
                            </span>
                        ))}
                    </nav>
                    <div
                        className="flex items-center gap-2 text-[11px] font-medium px-3 py-1.5"
                        style={{
                            fontFamily: 'var(--font-dm-mono)',
                            color: '#8A8A8A',
                            border: '1px solid #2A2A2A',
                            borderRadius: '2px',
                            backgroundColor: '#1A1A1A',
                        }}
                    >
                        <div className="status-dot" />
                        System Online
                    </div>
                </div>
            </div>
        </header>
    );
}

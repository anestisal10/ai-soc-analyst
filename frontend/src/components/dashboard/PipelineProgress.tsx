import { Shield, Server } from 'lucide-react';

export default function PipelineProgress() {
    return (
        <div
            className="editorial-card flex flex-col items-center justify-center py-20 gap-6"
            style={{ background: 'var(--bg-muted)' }}
        >
            <div className="flex gap-5 items-center">
                <div
                    className="w-11 h-11 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '2px' }}
                >
                    <Shield className="w-5 h-5 animate-pulse" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex items-center gap-1.5 px-3">
                    {[0, 150, 300].map((delay) => (
                        <div
                            key={delay}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ backgroundColor: 'var(--accent)', animationDelay: `${delay}ms` }}
                        />
                    ))}
                </div>
                <div
                    className="w-11 h-11 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '2px' }}
                >
                    <Server className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>
            </div>
            <div className="text-center">
                <p className="text-base font-bold mb-1" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-main)' }}>
                    Executing Analysis Pipeline
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>
                    Correlating threat intelligence and generating remediation signatures...
                </p>
            </div>
        </div>
    );
}

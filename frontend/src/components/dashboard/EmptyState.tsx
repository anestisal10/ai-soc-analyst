import { Activity } from 'lucide-react';

export default function EmptyState() {
    return (
        <div
            className="editorial-card flex flex-col items-center justify-center text-center py-20 px-8"
            style={{ borderStyle: 'dashed', borderColor: 'var(--border-strong)', background: 'var(--bg-muted)' }}
        >
            <div
                className="w-14 h-14 flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '2px' }}
            >
                <Activity className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3
                className="text-base font-bold mb-1"
                style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-main)' }}
            >
                Awaiting Telemetry
            </h3>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>
                Provide an email sample above to trigger the automated investigation workflow.
            </p>
        </div>
    );
}

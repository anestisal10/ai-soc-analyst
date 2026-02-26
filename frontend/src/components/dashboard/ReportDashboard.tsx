"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Cpu, Activity, Shield, AlertTriangle, Globe, FileText, CheckCircle, Server, Copy } from 'lucide-react';
import dynamic from 'next/dynamic';
import ThreatGauge from '@/components/dashboard/ThreatGauge';
import { ThreatReport } from '@/lib/types';
import { cardVariants } from '@/lib/animations';
import ReactMarkdown from 'react-markdown';

const InvestigationGraph = dynamic(() => import('@/components/InvestigationGraph'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[400px] flex items-center justify-center bg-[#F2F0EB] text-[#78746D] text-xs font-mono tracking-widest uppercase animate-pulse">
            Loading Graph Engine...
        </div>
    )
});



export default function ReportDashboard({ report }: { report: ThreatReport }) {
    // Recompute timestamp each time a new report arrives
    const generatedTime = React.useMemo(
        () => new Date().toLocaleString(),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [report.threat_score, report.iocs.length, report.technical_analysis]
    );

    return (
        <div className="flex flex-col gap-7">
            {/* Report Header */}
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '2px solid var(--accent)' }}>
                <h2
                    className="text-xl font-extrabold tracking-tight"
                    style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-main)' }}
                >
                    Analysis Report
                </h2>
                <span
                    className="text-[10px]"
                    style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-muted)' }}
                >
                    Generated · {generatedTime}
                </span>
            </div>

            {/* Row 1: Threat Gauge + Analysis */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
                {/* Threat Score */}
                <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card xl:col-span-1 flex flex-col">
                    <div className="editorial-card-header">
                        <ShieldAlert
                            className="w-3.5 h-3.5"
                            style={{
                                color: report.threat_score >= 70
                                    ? 'var(--status-critical-solid)'
                                    : report.threat_score >= 30
                                        ? 'var(--status-high-solid)'
                                        : 'var(--status-safe-solid)'
                            }}
                        />
                        Overall Risk Score
                    </div>
                    <div className="editorial-card-body flex-1 flex flex-col items-center justify-center py-8">
                        <ThreatGauge score={report.threat_score} />
                        {report.threat_score >= 70 && (
                            <div className="mt-6 w-full text-center">
                                <p
                                    className="text-[10px] font-bold uppercase tracking-[0.12em] flex items-center justify-center gap-1"
                                    style={{ color: 'var(--status-critical-text)', fontFamily: 'var(--font-dm-mono)' }}
                                >
                                    <AlertTriangle className="w-3 h-3" />
                                    Immediate Action Required
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Analysis Text Cards */}
                <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Technical Analysis */}
                    <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card">
                        <div className="editorial-card-header">
                            <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                            Technical Analysis Engine
                        </div>
                        <div className="editorial-card-body text-[13px] leading-relaxed" style={{ color: 'var(--text-main)', fontFamily: 'var(--font-dm-mono)' }}>
                            <div className="markdown-body">
                                <ReactMarkdown>
                                    {report.technical_analysis}
                                </ReactMarkdown>
                            </div>

                            {report.iocs.length > 0 && (
                                <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                    <h4
                                        className="text-[9px] font-bold uppercase tracking-[0.14em] mb-3"
                                        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}
                                    >
                                        Extracted Indicators (IoCs)
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {report.iocs.map((ioc, idx) => (
                                            <span key={`${ioc}-${idx}`} className="badge-ioc">{ioc}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Behavioral Analysis */}
                    <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card">
                        <div className="editorial-card-header">
                            <Activity className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                            Behavioral Analysis Engine
                        </div>
                        <div className="editorial-card-body text-[13px] leading-relaxed" style={{ color: 'var(--text-main)', fontFamily: 'var(--font-dm-mono)' }}>
                            <div className="markdown-body">
                                <ReactMarkdown>
                                    {report.psychological_analysis}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Row 2: Authentication + OSINT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Infrastructure Authentication */}
                {report.authentication_results && (
                    <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card">
                        <div className="editorial-card-header">
                            <Shield className="w-3.5 h-3.5" style={{ color: '#047857' }} />
                            Infrastructure Authentication
                        </div>
                        <div className="editorial-card-body p-5">
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                {['SPF', 'DKIM', 'DMARC'].map((protocol) => {
                                    const key = `${protocol.toLowerCase()}_pass` as keyof typeof report.authentication_results;
                                    const passed = report.authentication_results?.[key];
                                    return (
                                        <div key={protocol} className="flex flex-col items-center justify-center p-3 border rounded-sm transition-colors" style={{ borderColor: passed ? 'var(--status-safe-solid)' : 'var(--status-critical-solid)', backgroundColor: passed ? 'var(--status-safe-bg)' : '#FEF2F2' }}>
                                            <span className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: passed ? 'var(--status-safe-text)' : 'var(--status-critical-text)', fontFamily: 'var(--font-dm-mono)' }}>{protocol}</span>
                                            <span className="text-sm font-bold" style={{ color: passed ? 'var(--status-safe-solid)' : 'var(--status-critical-solid)' }}>{passed ? 'PASS' : 'FAIL'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {report.authentication_results.anomalies.length > 0 && (
                                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-red-600 mb-3 block flex items-center gap-1.5" style={{ fontFamily: 'var(--font-dm-mono)' }}>
                                        <AlertTriangle className="w-3 h-3" /> Header Anomalies Detected
                                    </span>
                                    <ul className="list-disc pl-4 text-xs space-y-2" style={{ color: 'var(--status-critical-text)', fontFamily: 'var(--font-dm-mono)' }}>
                                        {report.authentication_results.anomalies.map((anomaly, idx) => (
                                            <li key={idx} className="leading-tight">{anomaly}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {report.authentication_results.x_mailer && (
                                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-2 block" style={{ fontFamily: 'var(--font-dm-mono)' }}>X-Mailer Fingerprint</span>
                                    <span className="text-xs bg-zinc-100 px-2 py-1 rounded-sm border border-zinc-200 block break-words" style={{ fontFamily: 'var(--font-dm-mono)' }}>{report.authentication_results.x_mailer}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* OSINT Results */}
                {report.osint_results && report.osint_results.length > 0 ? (
                    <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card">
                        <div className="editorial-card-header">
                            <Globe className="w-3.5 h-3.5" style={{ color: '#3730A3' }} />
                            OSINT Intelligence
                        </div>
                        <div className="editorial-card-body p-0">
                            <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                {report.osint_results.map((result, i) => (
                                    <div
                                        key={i}
                                        className="p-4 transition-colors"
                                        style={{
                                            borderBottom: i < report.osint_results.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="badge badge-blue">{result.source}</span>
                                            <span
                                                className="text-xs"
                                                style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--text-muted)' }}
                                            >
                                                {result.target}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {Object.entries(result.data).map(([key, value]) => {
                                                const isBad = (key === 'malicious' && (value as number) > 0) || (key === 'abuseConfidenceScore' && (value as number) > 50);
                                                return (
                                                    <span key={key} className={`badge ${isBad ? 'badge-critical' : 'badge-neutral'}`}>
                                                        {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card">
                        <div className="editorial-card-header">
                            <Globe className="w-3.5 h-3.5" style={{ color: '#3730A3' }} />
                            OSINT Intelligence
                        </div>
                        <div className="editorial-card-body flex items-center justify-center p-12 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>
                            No external intelligence found for indicators.
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Row 3: Automation & Threat Intel Outputs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
                {/* Remediation Script */}
                <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card">
                    <div className="editorial-card-header">
                        <Shield className="w-3.5 h-3.5" style={{ color: 'var(--status-safe-solid)' }} />
                        Firewall Rule (Palo Alto XML)
                    </div>
                    <div className="editorial-card-body" style={{ backgroundColor: 'var(--bg-muted)', height: 'calc(100% - 44px)' }}>
                        <div className="relative h-full flex flex-col group">
                            <pre className="code-block flex-1 m-0 max-h-[300px] overflow-auto">
                                {report.remediation_script}
                            </pre>
                            <button
                                onClick={() => navigator.clipboard.writeText(report.remediation_script)}
                                className="btn-secondary absolute top-2 right-2 text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Copy className="w-3 h-3" />
                                Copy
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* STIX 2.1 Bundle */}
                {report.stix_bundle && (
                    <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card">
                        <div className="editorial-card-header">
                            <CheckCircle className="w-3.5 h-3.5" style={{ color: '#047857' }} />
                            STIX 2.1 Bundle Export
                        </div>
                        <div className="editorial-card-body" style={{ backgroundColor: 'var(--bg-muted)', height: 'calc(100% - 44px)' }}>
                            <div className="relative h-full flex flex-col group">
                                <pre className="code-block flex-1 m-0 max-h-[300px] overflow-auto text-[10px]">
                                    {report.stix_bundle}
                                </pre>
                                <button
                                    onClick={() => navigator.clipboard.writeText(report.stix_bundle!)}
                                    className="btn-secondary absolute top-2 right-2 text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Copy className="w-3 h-3" />
                                    Copy
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* MISP Push Status */}
                {report.misp_status && (
                    <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card">
                        <div className="editorial-card-header">
                            <Server className="w-3.5 h-3.5" style={{ color: '#3730A3' }} />
                            MISP Intelligence Push
                        </div>
                        <div className="editorial-card-body p-6 flex flex-col items-center justify-center text-center h-[calc(100%-44px)]">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: report.misp_status.status === 'success' ? 'var(--status-safe-bg)' : '#FEF2F2' }}>
                                {report.misp_status.status === 'success' ? (
                                    <CheckCircle className="w-6 h-6" style={{ color: 'var(--status-safe-solid)' }} />
                                ) : (
                                    <AlertTriangle className="w-6 h-6" style={{ color: 'var(--status-critical-solid)' }} />
                                )}
                            </div>
                            <h3 className="text-base font-bold mb-1" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-main)' }}>
                                {report.misp_status.status === 'success' ? 'Event Published successfully' : 'MISP Push Skipped / Failed'}
                            </h3>
                            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>
                                {report.misp_status.message}
                            </p>
                            {report.misp_status.event_id && (
                                <div className="flex flex-col gap-2 w-full mt-2 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <div className="flex justify-between items-center text-xs">
                                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>Event ID</span>
                                        <span className="font-bold" style={{ fontFamily: 'var(--font-dm-mono)' }}>#{report.misp_status.event_id}</span>
                                    </div>
                                    {report.misp_status.url && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>Link</span>
                                            <a href={report.misp_status.url} className="text-blue-600 hover:underline font-bold" style={{ fontFamily: 'var(--font-dm-mono)' }}>View in MISP</a>
                                        </div>
                                    )}
                                    {report.misp_status.attributes && (
                                        <div className="flex justify-between items-start text-xs mt-1">
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>Attributes added</span>
                                            <span className="font-bold text-right" style={{ fontFamily: 'var(--font-dm-mono)' }}>{report.misp_status.attributes.length}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Row 4: Attachment Analysis */}
            {report.attachment_results && report.attachment_results.length > 0 && (
                <motion.div custom={8} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card mt-5">
                    <div className="editorial-card-header">
                        <FileText className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                        Static Attachment Analysis
                    </div>
                    <div className="editorial-card-body p-0">
                        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            {report.attachment_results.map((att, i) => (
                                <div key={i} className="p-5" style={{ borderBottom: i < (report.attachment_results ? report.attachment_results.length : 0) - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-sm font-bold" style={{ color: 'var(--text-main)', fontFamily: 'var(--font-dm-mono)' }}>{att.filename}</span>
                                        <span className="badge badge-neutral text-[10px] bg-zinc-100">{att.content_type || 'Unknown Type'}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {att.scans.map((scan, j) => {
                                            const isCritical = scan.status === 'Malicious' || scan.status === 'Suspicious' || scan.status === 'Warning';
                                            return (
                                                <div key={j} className="p-3 border rounded-sm" style={{ borderColor: isCritical ? 'var(--status-critical-solid)' : 'var(--border-subtle)', backgroundColor: isCritical ? '#FEF2F2' : 'var(--bg-muted)' }}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{scan.tool}</span>
                                                        <span className={`badge ${isCritical ? 'badge-critical' : scan.status.includes('Clean') ? 'badge-safe' : 'badge-neutral'}`}>{scan.status}</span>
                                                    </div>
                                                    {scan.findings && scan.findings.length > 0 ? (
                                                        <ul className="list-disc pl-4 text-[11px] space-y-1 mt-2" style={{ color: isCritical ? 'var(--status-critical-text)' : 'var(--text-main)', fontFamily: 'var(--font-dm-mono)' }}>
                                                            {scan.findings.map((f, k) => <li key={k}>{f}</li>)}
                                                        </ul>
                                                    ) : (
                                                        <span className="text-xs italic text-zinc-500 mt-2 block" style={{ fontFamily: 'var(--font-dm-mono)' }}>No findings.</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Row 5: Investigation Graph */}
            <motion.div custom={9} variants={cardVariants} initial="hidden" animate="visible" className="editorial-card overflow-hidden mt-5">
                <div className="editorial-card-header">
                    <Activity className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    Investigation Graph Mapping
                </div>
                <div style={{ backgroundColor: '#F7F5F0', borderTop: '1px solid var(--border-subtle)' }}>
                    <InvestigationGraph data={report.graph_data} />
                </div>
            </motion.div>
        </div>
    );
}

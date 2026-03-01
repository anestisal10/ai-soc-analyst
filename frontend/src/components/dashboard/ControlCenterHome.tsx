"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Globe, AlertTriangle, ShieldCheck, Activity, ChevronRight, BarChart2, Shield } from 'lucide-react';

export default function ControlCenterHome({ onInvestigate }: { onInvestigate: () => void }) {

    // Mock Alerts
    const alerts = [
        { id: "ALT-8921", time: "2 min ago", type: "Phishing Email", source: "finance-update@paypaI-secure.com", severity: "Critical" },
        { id: "ALT-8920", time: "14 min ago", type: "Firewall Log", source: "192.168.1.50 -> 45.33.32.156", severity: "High" },
        { id: "ALT-8919", time: "1 hr ago", type: "SIEM Alert", source: "Multiple Failed Logins (User: admin)", severity: "Medium" },
        { id: "ALT-8918", time: "3 hrs ago", type: "Phishing Email", source: "hr.dept@company-portal.net", severity: "Critical" },
        { id: "ALT-8917", time: "5 hrs ago", type: "Network Capture", source: "Suspicious DNS Query (random string)", severity: "Low" },
    ];

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'Critical': return <span className="badge badge-critical">Critical</span>;
            case 'High': return <span className="badge badge-high">High</span>;
            case 'Medium': return <span className="badge badge-medium">Medium</span>;
            default: return <span className="badge badge-low">Low</span>;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
        >
            {/* Top KPI Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Active Threats */}
                <div className="editorial-card p-5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>ACTIVE THREATS (24H)</span>
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="text-3xl font-mono" style={{ color: 'var(--text-main)' }}>142</div>
                    <div className="text-xs flex items-center gap-1" style={{ color: 'var(--status-critical-solid)' }}>
                        <var>↑</var> 12% vs yesterday
                    </div>
                </div>

                {/* Critical Alerts */}
                <div className="editorial-card p-5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>CRITICAL ALERTS</span>
                        <Shield className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-3xl font-mono" style={{ color: 'var(--text-main)' }}>8</div>
                    <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        <var>4</var> awaiting triage
                    </div>
                </div>

                {/* Avg Score */}
                <div className="editorial-card p-5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>AVG THREAT SCORE</span>
                        <Activity className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-3xl font-mono" style={{ color: 'var(--text-main)' }}>68<span className="text-sm">/100</span></div>
                    <div className="text-xs flex items-center gap-1" style={{ color: 'var(--status-safe-solid)' }}>
                        <var>↓</var> 5 pts from last week
                    </div>
                </div>

                {/* Automation */}
                <div className="editorial-card p-5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>AUTOMATED REMEDIATION</span>
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-3xl font-mono" style={{ color: 'var(--text-main)' }}>94%</div>
                    <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        Blocks generated automatically
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Col: Alert Queue (takes up 2 cols) */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="editorial-card h-full flex flex-col">
                        <div className="editorial-card-header flex justify-between items-center">
                            <span className="flex items-center gap-2">
                                <Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                Alert Queue
                            </span>
                            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Live Feed</span>
                        </div>

                        <div className="overflow-x-auto p-0">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-muted)' }}>
                                        <th className="px-4 py-3 text-xs font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>ID</th>
                                        <th className="px-4 py-3 text-xs font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>TIME</th>
                                        <th className="px-4 py-3 text-xs font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>SOURCE / SUMMARY</th>
                                        <th className="px-4 py-3 text-xs font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>TYPE</th>
                                        <th className="px-4 py-3 text-xs font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>SEVERITY</th>
                                        <th className="px-4 py-3 text-xs font-bold tracking-wider text-right" style={{ color: 'var(--text-muted)' }}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.map((alert, i) => (
                                        <tr key={i} className="hover:bg-[var(--bg-muted)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0">
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{alert.id}</td>
                                            <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--text-main)' }}>{alert.time}</td>
                                            <td className="px-4 py-3 text-sm font-mono truncate max-wxs" style={{ color: 'var(--text-main)' }}>{alert.source}</td>
                                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{alert.type}</td>
                                            <td className="px-4 py-3">
                                                {getSeverityBadge(alert.severity)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={onInvestigate}
                                                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded bg-[var(--accent-light)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                                                >
                                                    Triage <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Col: Maps & Charts */}
                <div className="lg:col-span-1 flex flex-col gap-6">

                    {/* Placeholder Map */}
                    <div className="editorial-card">
                        <div className="editorial-card-header">
                            <span className="flex items-center gap-2">
                                <Globe className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                Threat Origins
                            </span>
                        </div>
                        <div className="h-48 flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
                            <div className="absolute inset-0 opacity-20" style={{
                                backgroundImage: 'radial-gradient(circle at center, var(--accent) 1px, transparent 1px)',
                                backgroundSize: '16px 16px'
                            }}></div>
                            <div className="z-10 text-center flex flex-col items-center gap-2">
                                <Globe className="w-8 h-8 opacity-50" style={{ color: 'var(--accent)' }} />
                                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                    Map Visualization<br />Initializing...
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder Chart */}
                    <div className="editorial-card flex-1">
                        <div className="editorial-card-header">
                            <span className="flex items-center gap-2">
                                <BarChart2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                Threat Volume
                            </span>
                        </div>
                        <div className="p-5 h-40 flex items-end justify-between gap-2 overflow-hidden items-stretch">
                            {/* Mock Bar Chart */}
                            {[40, 60, 30, 80, 50, 90, 70, 45, 65, 85, 55, 100].map((h, i) => (
                                <div key={i} className="w-full bg-[var(--border-subtle)] rounded-t relative group flex flex-col justify-end">
                                    <div
                                        className="w-full rounded-t transition-all duration-500 group-hover:opacity-80"
                                        style={{ height: `${h}%`, backgroundColor: h > 75 ? 'var(--status-critical-solid)' : 'var(--accent)' }}
                                    ></div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </motion.div>
    );
}

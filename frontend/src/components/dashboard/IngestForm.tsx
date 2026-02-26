"use client";

import React, { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Upload, ShieldAlert, Server, Globe, Clock } from 'lucide-react';
import PipelineTimeline, { TimelineStep } from '@/components/dashboard/PipelineTimeline';

interface IngestFormProps {
    inputText: string;
    setInputText: (text: string) => void;
    fileName: string | null;
    setFileName: (name: string | null) => void;
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    analyzing: boolean;
    handleAnalyze: () => void;
    timeline: TimelineStep[];
}

export default function IngestForm({
    inputText,
    setInputText,
    fileName,
    setFileName,
    selectedFile,
    setSelectedFile,
    analyzing,
    handleAnalyze,
    timeline
}: IngestFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.eml') || file.name.endsWith('.txt') || file.name.endsWith('.msg'))) {
            setSelectedFile(file);
            setFileName(file.name);
            setInputText('');
        }
    }, [setSelectedFile, setFileName, setInputText]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setFileName(file.name);
            setInputText('');
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="editorial-card"
        >
            <div className="editorial-card-header">
                <FileText className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                Ingest Suspicious Email
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Left: Input */}
                <div className="lg:col-span-7 p-6 flex flex-col gap-4" style={{ borderRight: '1px solid var(--border-subtle)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>
                        Provide raw email content or upload a file (.eml / .txt / .msg) for dual-engine analysis.
                    </p>

                    {/* Drop Zone */}
                    <div
                        className={`border-2 border-dashed p-5 text-center cursor-pointer transition-all`}
                        style={{
                            borderRadius: '2px',
                            borderColor: isDragging
                                ? 'var(--accent)'
                                : fileName
                                    ? 'var(--status-safe-solid)'
                                    : 'var(--border-strong)',
                            backgroundColor: isDragging
                                ? 'var(--accent-light)'
                                : fileName
                                    ? 'var(--status-safe-bg)'
                                    : 'var(--bg-muted)',
                        }}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".eml,.txt,.msg"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        {fileName ? (
                            <div className="flex items-center justify-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4" style={{ color: 'var(--status-safe-solid)' }} />
                                <span className="font-bold" style={{ color: 'var(--status-safe-text)', fontFamily: 'var(--font-dm-mono)' }}>{fileName}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                                    className="ml-2 text-xs font-bold"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-1">
                                <Upload className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm-mono)' }}>
                                    Drop file here or click to browse
                                </span>
                            </div>
                        )}
                    </div>

                    {!selectedFile && (
                        <textarea
                            className="input-saas h-44 resize-none leading-relaxed"
                            placeholder={"From: ceo@company.com\nTo: finance@company.com\nSubject: URGENT: Wire Transfer\n\nPlease transfer $50k immediately..."}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                    )}

                    <div className="flex justify-end mt-1">
                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing || (!inputText.trim() && !selectedFile)}
                            className="btn-primary"
                        >
                            {analyzing ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    Execute Analysis
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right: Integrations + Pipeline */}
                <div className="lg:col-span-5 p-6 flex flex-col gap-6" style={{ backgroundColor: 'var(--bg-muted)' }}>
                    {/* Integrations */}
                    <div className="flex flex-col gap-3">
                        <div className="section-label">
                            <Server className="w-3 h-3" />
                            Active Integrations
                        </div>
                        <div className="space-y-2">
                            {[
                                { name: 'VirusTotal API' },
                                { name: 'AbuseIPDB API' },
                            ].map(({ name }) => (
                                <div
                                    key={name}
                                    className="flex items-center justify-between text-sm px-3 py-2.5"
                                    style={{
                                        backgroundColor: 'var(--bg-card)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '2px',
                                    }}
                                >
                                    <span
                                        className="font-medium text-xs flex items-center gap-2"
                                        style={{ color: 'var(--text-main)', fontFamily: 'var(--font-dm-mono)' }}
                                    >
                                        <Globe className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                                        {name}
                                    </span>
                                    <span className="badge badge-neutral" title="Status depends on API key configuration">Configured</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pipeline Status */}
                    <div className="flex flex-col gap-3">
                        <div className="section-label">
                            <Clock className="w-3 h-3" />
                            Pipeline Status
                        </div>
                        <PipelineTimeline timeline={timeline} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

"use client";

import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Shield, ShieldAlert, Cpu, Activity, Server, FileText, CheckCircle, Upload, AlertTriangle, Globe, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const InvestigationGraph = dynamic(() => import('@/components/InvestigationGraph'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] flex items-center justify-center bg-black/50 border border-white/10 rounded-xl text-slate-500 animate-pulse">Loading Graph Engine...</div>
});

interface OsintResult {
  source: string;
  target: string;
  data: Record<string, any>;
}

interface ThreatReport {
  threat_score: number;
  technical_analysis: string;
  psychological_analysis: string;
  iocs: string[];
  graph_data: any;
  remediation_script: string;
  osint_results: OsintResult[];
}

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

// Timeline step type
interface TimelineStep {
  label: string;
  status: 'pending' | 'running' | 'done';
  timestamp?: string;
}

export default function Home() {
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<ThreatReport | null>(null);
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateTimeline = (steps: TimelineStep[]) => setTimeline([...steps]);

  const handleAnalyze = async () => {
    if (!inputText.trim() && !selectedFile) return;

    setAnalyzing(true);
    setReport(null);

    // Initialize timeline
    const steps: TimelineStep[] = [
      { label: 'Ingesting Content', status: 'running' },
      { label: 'Gemini Technical Analysis', status: 'pending' },
      { label: 'Claude Psychological Analysis', status: 'pending' },
      { label: 'OSINT Enrichment', status: 'pending' },
      { label: 'Building Investigation Graph', status: 'pending' },
      { label: 'Generating Remediation Rules', status: 'pending' },
    ];
    updateTimeline(steps);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('text', inputText);
      }

      // Progress simulation (since the backend does it all at once)
      const progressInterval = setInterval(() => {
        setTimeline(prev => {
          const updated = [...prev];
          const runningIdx = updated.findIndex(s => s.status === 'running');
          if (runningIdx >= 0 && runningIdx < updated.length - 1) {
            updated[runningIdx].status = 'done';
            updated[runningIdx].timestamp = new Date().toLocaleTimeString();
            updated[runningIdx + 1].status = 'running';
          }
          return updated;
        });
      }, 500);

      const response = await axios.post('http://localhost:8000/api/analyze', formData);

      clearInterval(progressInterval);

      // Mark all as done
      setTimeline(prev => prev.map(s => ({
        ...s,
        status: 'done' as const,
        timestamp: s.timestamp || new Date().toLocaleTimeString()
      })));

      setReport(response.data);
    } catch (error) {
      console.error("Analysis failed", error);
      setTimeline(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'done' as const, label: `❌ ${s.label}` } : s));
      alert("Analysis failed. Is the backend running?");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.eml') || file.name.endsWith('.txt') || file.name.endsWith('.msg'))) {
      setSelectedFile(file);
      setFileName(file.name);
      setInputText('');
    }
  }, []);

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

  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-emerald-400';
    if (score < 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score < 30) return 'from-emerald-500/20 to-emerald-500/5';
    if (score < 70) return 'from-amber-500/20 to-amber-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              AI SOC <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Analyst</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Input Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Ingest Suspicious Email
            </h2>
            <p className="text-sm text-slate-400 mb-4">Paste the raw text/headers of a suspicious email or upload an .eml file.</p>

            {/* File Upload Zone */}
            <div
              className={`mb-4 border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${isDragging
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : fileName
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-white/10 hover:border-white/20 bg-black/20'
                }`}
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
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">{fileName}</span>
                  <button onClick={(e) => { e.stopPropagation(); clearFile(); }} className="text-slate-500 hover:text-red-400 ml-2 text-xs">✕</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5 text-slate-500" />
                  <span className="text-xs text-slate-500">Drop .eml file here or click to browse</span>
                </div>
              )}
            </div>

            {!selectedFile && (
              <textarea
                className="w-full h-56 bg-black/50 border border-white/10 rounded-lg p-4 text-sm font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600 resize-none"
                placeholder={"From: ceo@company.com\nTo: finance@company.com\nSubject: URGENT: Wire Transfer\n\nPlease transfer $50k immediately..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing || (!inputText.trim() && !selectedFile)}
              className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {analyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing Threat Vectors...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5" />
                  Analyze Content
                </>
              )}
            </button>
          </div>

          {/* OSINT Enrichment Panel */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Globe className="w-32 h-32" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-4 relative z-10 flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              OSINT Enrichment
            </h2>
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between text-sm p-3 bg-black/30 rounded border border-white/5">
                <span className="text-slate-400">VirusTotal Integration</span>
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Active</span>
              </div>
              <div className="flex items-center justify-between text-sm p-3 bg-black/30 rounded border border-white/5">
                <span className="text-slate-400">AbuseIPDB Integration</span>
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Active</span>
              </div>

              {/* Show actual OSINT results when available */}
              {report?.osint_results && report.osint_results.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                  <h4 className="text-xs uppercase text-slate-500 font-semibold mb-2">Live Results</h4>
                  {report.osint_results.map((result, i) => (
                    <div key={i} className="p-3 bg-black/40 rounded border border-white/5 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-indigo-400 font-semibold">{result.source}</span>
                        <span className="font-mono text-slate-400">{result.target}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Object.entries(result.data).map(([key, value]) => (
                          <span key={key} className={`px-2 py-0.5 rounded text-xs ${key === 'malicious' && (value as number) > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              key === 'abuseConfidenceScore' && (value as number) > 50 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                'bg-slate-800 text-slate-400 border border-white/5'
                            }`}>
                            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Real-Time Analysis Timeline */}
          <AnimatePresence>
            {timeline.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/[0.02] border border-white/10 rounded-xl p-6 shadow-2xl"
              >
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  Analysis Pipeline
                </h2>
                <div className="space-y-2">
                  {timeline.map((step, i) => (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-3 text-sm p-2 rounded ${step.status === 'running' ? 'bg-indigo-500/10 border border-indigo-500/20' :
                          step.status === 'done' ? 'bg-white/[0.02]' : 'opacity-40'
                        }`}
                    >
                      {step.status === 'running' && <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
                      {step.status === 'done' && <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                      {step.status === 'pending' && <div className="w-3 h-3 rounded-full border border-slate-600 flex-shrink-0" />}
                      <span className={step.status === 'done' ? 'text-slate-300' : step.status === 'running' ? 'text-indigo-300' : 'text-slate-600'}>
                        {step.label}
                      </span>
                      {step.timestamp && <span className="text-xs text-slate-600 ml-auto font-mono">{step.timestamp}</span>}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Results Dashboard */}
        <div className="lg:col-span-7">
          {!report && !analyzing && (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl bg-white/[0.01] text-slate-500 py-32 px-8 text-center">
              <Activity className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-slate-300 mb-2">Awaiting Telemetry</h3>
              <p>Paste an email or upload a file to begin the automated agentic investigation workflow.</p>
            </div>
          )}

          {analyzing && !report && (
            <div className="h-full flex flex-col items-center justify-center border border-white/10 rounded-xl bg-white/[0.02] py-32 space-y-8">
              <div className="flex gap-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-16 h-16 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center"
                >
                  <Cpu className="w-8 h-8 text-blue-400" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                  className="w-16 h-16 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center"
                >
                  <Activity className="w-8 h-8 text-purple-400" />
                </motion.div>
              </div>
              <div className="text-center">
                <p className="text-lg text-indigo-400 font-medium mb-1">Dual-Brain Agents Engaged</p>
                <p className="text-sm text-slate-400">Querying Gemini (Technical) and Claude (Psychological)...</p>
              </div>
            </div>
          )}

          {report && !analyzing && (
            <div className="flex flex-col gap-6">

              {/* Score Card */}
              <motion.div
                custom={0}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className={`bg-gradient-to-r ${getScoreBg(report.threat_score)} border border-white/10 rounded-xl p-6 flex items-center justify-between overflow-hidden relative`}
              >
                <div className={`absolute top-0 left-0 w-2 h-full ${report.threat_score > 70 ? 'bg-red-500' : report.threat_score > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <div className="pl-4">
                  <h2 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-1">Unified Threat Score</h2>
                  <p className="text-3xl font-bold text-white flex items-center gap-2">
                    {report.threat_score >= 70 && <AlertTriangle className="w-7 h-7 text-red-400" />}
                    {report.threat_score >= 70 ? "Critical Threat" : report.threat_score >= 30 ? "Suspicious" : "Clean"}
                  </p>
                </div>
                <div className={`text-6xl font-black tracking-tighter ${getScoreColor(report.threat_score)}`}>
                  {report.threat_score}<span className="text-2xl text-slate-600">/100</span>
                </div>
              </motion.div>

              {/* Grid for Dual Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Gemini Card */}
                <motion.div
                  custom={1}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]"
                >
                  <h3 className="flex items-center gap-2 text-blue-400 font-bold mb-4">
                    <Cpu className="w-5 h-5" />
                    Gemini Technical Analysis
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {report.technical_analysis}
                  </p>

                  {report.iocs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <h4 className="text-xs uppercase text-slate-500 font-semibold mb-2">Extracted IoCs</h4>
                      <div className="flex flex-wrap gap-2">
                        {report.iocs.map(ioc => (
                          <span key={ioc} className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                            {ioc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Claude Card */}
                <motion.div
                  custom={2}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="bg-slate-900 border border-purple-500/30 rounded-xl p-6 shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)]"
                >
                  <h3 className="flex items-center gap-2 text-purple-400 font-bold mb-4">
                    <Activity className="w-5 h-5" />
                    Claude Psychological Analysis
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {report.psychological_analysis}
                  </p>
                </motion.div>

              </div>

              {/* Investigation Graph */}
              <motion.div
                custom={3}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <h3 className="flex items-center gap-2 text-white font-bold mb-4">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  Investigation Graph
                </h3>
                <InvestigationGraph data={report.graph_data} />
              </motion.div>

              {/* Remediation Panel */}
              <motion.div
                custom={4}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-white/[0.02] border border-white/10 rounded-xl p-6"
              >
                <h3 className="flex items-center gap-2 text-white font-bold mb-4">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  Auto-Generated Firewall Rule (Palo Alto XML)
                </h3>
                <div className="relative group">
                  <pre className="bg-black border border-white/10 rounded-lg p-4 overflow-x-auto text-xs font-mono text-green-400">
                    {report.remediation_script}
                  </pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(report.remediation_script)}
                    className="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-800 border border-white/10 rounded text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Copy
                  </button>
                </div>
              </motion.div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

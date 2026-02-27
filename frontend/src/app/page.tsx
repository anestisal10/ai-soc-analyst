"use client";

import React, { useState } from 'react';

import TopNav from '@/components/layout/TopNav';
import HeaderBar from '@/components/layout/HeaderBar';
import Footer from '@/components/layout/Footer';
import EmptyState from '@/components/dashboard/EmptyState';
import PipelineProgress from '@/components/dashboard/PipelineProgress';
import ReportDashboard from '@/components/dashboard/ReportDashboard';
import IngestForm from '@/components/dashboard/IngestForm';
import ErrorBoundary from '@/components/ErrorBoundary';
import { TimelineStep } from '@/components/dashboard/PipelineTimeline';
import { ThreatReport } from '@/lib/types';
// Fix #17: Removed unused `cardVariants` import

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// Fix #20: 120-second analysis timeout
const ANALYSIS_TIMEOUT_MS = 120_000;

export default function Home() {
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<ThreatReport | null>(null);
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Cancel any in-flight request when the component unmounts
  React.useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  const updateTimeline = (steps: TimelineStep[]) => setTimeline([...steps]);
  void updateTimeline; // suppress unused variable warning

  const handleAnalyze = async () => {
    if (!inputText.trim() && !selectedFile) return;

    // Cancel any previous in-flight request
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setAnalyzing(true);
    setReport(null);
    setErrorMsg(null);
    setTimeline([
      { label: 'Initializing Analysis...', status: 'running' }
    ]);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('text', inputText);
      }

      // Fix #20: Combine user abort signal with a 120-second timeout signal
      const timeoutSignal = AbortSignal.timeout(ANALYSIS_TIMEOUT_MS);
      const combinedSignal = AbortSignal.any
        ? AbortSignal.any([abortController.signal, timeoutSignal])
        : abortController.signal;

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        body: formData,
        signal: combinedSignal,
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail ?? `Server returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) throw new Error("Could not initialize stream reader");

      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          // keep the last incomplete chunk in buffer
          buffer = chunks.pop() || '';

          for (const chunk of chunks) {
            const line = chunk.trim();
            if (line.startsWith('data: ')) {
              // Use slice(6) rather than replace() to safely strip the SSE prefix
              const dataStr = line.slice(6).trim();
              if (!dataStr) continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'status') {
                  setTimeline(prev => {
                    const updated = prev.map(s => s.status === 'running' ? { ...s, status: 'done' as const, timestamp: new Date().toLocaleTimeString() } : s);
                    return [...updated, { label: data.message, status: 'running' }];
                  });
                } else if (data.type === 'result') {
                  setReport(data.data);
                  setTimeline(prev => {
                    const completed = prev.map(s => s.status === 'running' ? { ...s, status: 'done' as const, timestamp: new Date().toLocaleTimeString() } : s);
                    return [...completed, { label: 'Analysis Complete', status: 'done' as const, timestamp: new Date().toLocaleTimeString() }];
                  });
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (e: unknown) {
                const err = e as Error;
                if (err.message && !err.message.includes('JSON')) {
                  throw e;
                }
                console.error("Error parsing stream chunk", e, dataStr);
              }
            }
          }
        }
      }

    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        if (err.name === 'TimeoutError') {
          setErrorMsg("Analysis timed out after 2 minutes. Please try again.");
        }
        setAnalyzing(false);
        return;
      }
      console.error("Analysis failed", error);
      setTimeline(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'done' as const, label: `✕ Failed: ${s.label}` } : s));
      setErrorMsg(err.message || "Analysis failed. Is the backend running?");
    } finally {
      setAnalyzing(false);
    }
  };



  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>

      <TopNav />
      <HeaderBar />

      {/* ══ Main Content ══ */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Input Card */}
        <IngestForm
          inputText={inputText}
          setInputText={setInputText}
          fileName={fileName}
          setFileName={setFileName}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          analyzing={analyzing}
          handleAnalyze={handleAnalyze}
          timeline={timeline}
        />

        {/* ══ Results Dashboard ══ */}

        {/* Error State */}
        {errorMsg && !analyzing && (
          <div className="p-5 border border-red-200 bg-red-50 text-red-700 rounded-lg shadow-sm" style={{ fontFamily: 'var(--font-dm-mono)' }}>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600"></div> Error During Analysis</h3>
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Empty State */}
        {!report && !analyzing && !errorMsg && <EmptyState />}

        {/* Analyzing State */}
        {analyzing && !report && <PipelineProgress />}

        {/* Results — wrapped in Error Boundary to prevent full-page crash */}
        {report && !analyzing && (
          <ErrorBoundary>
            <ReportDashboard report={report} />
          </ErrorBoundary>
        )}
      </main>

      <Footer />
    </div>
  );
}

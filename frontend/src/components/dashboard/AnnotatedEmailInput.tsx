"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AlertCircle, Link as LinkIcon, DollarSign, FileWarning } from 'lucide-react';

interface AnnotatedEmailInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

// ─── Regex Patterns ───────────────────────────────────────────────
// (These are basic patterns for the hackathon; could be refined)
const URl_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
const URGENCY_REGEX = /\b(act immediately|urgent|account suspended|verify your account|action required|immediate action|password expires|validate now|update your payment)\b/gi;
const FINANCE_REGEX = /\b(wire transfer|invoice|payment|bank details|routing number|swift code|transfer funds|w-2|w2|payroll|gift card)\b/gi;
const EXTENSION_REGEX = /\b[\w-]+\.(exe|scr|bat|cmd|vbs|js|jar|ps1|zip|rar)\b/gi;

type MatchType = 'url' | 'urgency' | 'finance' | 'extension';

interface Match {
    start: number;
    end: number;
    text: string;
    type: MatchType;
}

export default function AnnotatedEmailInput({
    value,
    onChange,
    disabled = false,
    placeholder = "Paste email content here...",
    className = ""
}: AnnotatedEmailInputProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [hoveredState, setHoveredState] = useState<{ x: number; y: number; type: MatchType } | null>(null);

    // Sync scrolling between textarea and overlay
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = e.currentTarget.scrollTop;
            scrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
        setHoveredState(null); // Hide tooltip when scrolling so it doesn't float away
    };

    // Run detection on text changes
    useEffect(() => {
        const text = value;
        const newMatches: Match[] = [];

        // Helper to find all matches for a regex
        const findMatches = (regex: RegExp, type: MatchType) => {
            let match;
            // Reset lastIndex for global regexes
            regex.lastIndex = 0;
            while ((match = regex.exec(text)) !== null) {
                newMatches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    type
                });
            }
        };

        findMatches(URl_REGEX, 'url');
        findMatches(URGENCY_REGEX, 'urgency');
        findMatches(FINANCE_REGEX, 'finance');
        findMatches(EXTENSION_REGEX, 'extension');

        // Sort matches by start position
        newMatches.sort((a, b) => a.start - b.start);

        // Resolve overlapping matches (keep the longest one, or first one)
        const resolvedMatches: Match[] = [];
        let currentEnd = -1;

        for (const match of newMatches) {
            if (match.start >= currentEnd) {
                resolvedMatches.push(match);
                currentEnd = match.end;
            } else {
                // Overlap detected. For simplicity, we just ignore the overlapping match
                // that starts later. Could be smarter here.
            }
        }

        setMatches(resolvedMatches);
    }, [value]);

    // Generate the formatted overlay text
    const renderOverlay = useMemo(() => {
        if (matches.length === 0) {
            return value + '\n'; // Add newline to ensure identical height/scrolling at end
        }

        const result = [];
        let lastIndex = 0;

        matches.forEach((match, index) => {
            // Add text before match
            if (match.start > lastIndex) {
                result.push(value.substring(lastIndex, match.start));
            }

            // Add the matched span with tooltip
            const config = getMatchConfig(match.type);

            result.push(
                <span
                    key={index}
                    className={`relative group cursor-help rounded-[2px] transition-colors pointer-events-auto ${config.className}`}
                    onClick={() => textareaRef.current?.focus()}
                    onMouseEnter={(e) => {
                        if (!containerRef.current) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const containerRect = containerRef.current.getBoundingClientRect();
                        setHoveredState({
                            x: rect.left - containerRect.left + (rect.width / 2),
                            y: rect.top - containerRect.top,
                            type: match.type
                        });
                    }}
                    onMouseLeave={() => setHoveredState(null)}
                >
                    {value.substring(match.start, match.end)}
                </span>
            );

            lastIndex = match.end;
        });

        // Add remaining text
        if (lastIndex < value.length) {
            result.push(value.substring(lastIndex));
        }

        // Crucial: add a newline at the end so the overlay height exactly matches textarea 
        // when ending with newlines.
        result.push('\n');

        return result;
    }, [value, matches]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Background container for identical sizing/styling */}
            <div
                className="w-full h-full bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[2px]"
            >
                {/* Render Layer (Visuals & Interactions on Top) */}
                <div
                    ref={scrollRef}
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words overflow-auto pointer-events-none text-[var(--text-main)] selection:bg-transparent z-20"
                >
                    {renderOverlay}
                </div>

                {/* Input Layer (Textarea underneath) */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={handleScroll}
                    disabled={disabled}
                    placeholder={placeholder}
                    spellCheck={false}
                    className={`absolute inset-0 w-full h-full p-3 resize-none font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words border-none outline-none z-10 bg-transparent text-transparent caret-[var(--accent)]`}
                    style={{
                        // Ensure textarea text itself is totally invisible, 
                        // so we only see the perfect replica from the render layer above.
                        WebkitTextFillColor: 'transparent',
                    }}
                />

                {/* Focus ring overlay (pointer-events-none so it doesn't block clicks) */}
                <div className={`absolute inset-0 rounded-[2px] pointer-events-none z-30 transition-all duration-150 border-2 border-transparent ${!disabled && 'peer-focus:border-[var(--accent)] peer-focus:shadow-[0_0_0_3px_var(--accent-light)]'}`} />
            </div>

            {/* Portal-like Tooltip Layer (Outside the overflow-auto container) */}
            {hoveredState && (() => {
                const config = getMatchConfig(hoveredState.type);
                return (
                    <div
                        className="absolute z-[100] w-max max-w-[280px] min-w-[200px] bg-[#111111] text-[#F9F8F6] p-3 rounded shadow-lg border border-[#333333] pointer-events-none"
                        style={{
                            left: `${hoveredState.x}px`,
                            top: `${hoveredState.y}px`,
                            transform: 'translate(-50%, calc(-100% - 6px))'
                        }}
                    >
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-solid border-t-[#111111] border-r-transparent border-b-transparent border-l-transparent" />

                        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-white uppercase tracking-wider">
                            <config.icon className="w-3 h-3" />
                            {config.title}
                        </div>
                        <div className="text-[11px] text-gray-300 leading-tight">
                            {config.description}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

// ─── Helpers ───────────────────────────────────────────────

function getMatchConfig(type: MatchType) {
    switch (type) {
        case 'url':
            return {
                title: 'Extracted Link',
                description: 'Attackers use deceptive links to steal credentials or download malware.',
                icon: LinkIcon,
                className: 'bg-yellow-300/40 border-b-2 border-dotted border-yellow-600 hover:bg-yellow-300/60'
            };
        case 'urgency':
            return {
                title: 'Urgency Language',
                description: 'Psychological manipulation to bypass critical thinking and force quick action.',
                icon: AlertCircle,
                className: 'bg-red-200/40 border-b-2 border-dotted border-red-600 hover:bg-red-200/60'
            };
        case 'finance':
            return {
                title: 'Financial Request',
                description: 'Keywords associated with BEC (Business Email Compromise) and wire fraud.',
                icon: DollarSign,
                className: 'bg-blue-200/40 border-b-2 border-dotted border-blue-600 hover:bg-blue-200/60'
            };
        case 'extension':
            return {
                title: 'Suspicious File',
                description: 'Executable or script file extensions often used to deliver payloads.',
                icon: FileWarning,
                className: 'bg-red-200/60 border-b-2 border-dotted border-red-800 hover:bg-red-200/80'
            };
    }
}

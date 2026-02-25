"use client"

import { useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

interface Node {
    id: string;
    group: number;
    label: string;
}

interface Link {
    source: string;
    target: string;
}

interface GraphData {
    nodes: Node[];
    links: Link[];
}

const GROUP_COLORS: Record<number, string> = {
    1: '#e2e8f0', // Sender - white
    2: '#eab308', // URL - yellow
    3: '#ef4444', // Payload - red
    4: '#6366f1', // OSINT - indigo
};

export default function InvestigationGraph({ data }: { data: GraphData }) {
    const fgRef = useRef<any>();

    useEffect(() => {
        if (fgRef.current) {
            setTimeout(() => {
                fgRef.current.zoomToFit(400);
            }, 500);
        }
    }, [data]);

    return (
        <div className="w-full h-[400px] bg-black/50 border border-white/10 rounded-xl overflow-hidden relative">
            <div className="absolute top-4 left-4 z-10 text-xs font-mono text-slate-400 bg-black/50 px-3 py-1 rounded-full border border-white/10 backdrop-blur">
                Interactive Investigation Graph
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 flex gap-3 text-[10px] font-mono bg-black/60 px-3 py-2 rounded-lg border border-white/10 backdrop-blur">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" />Sender</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />URL</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Payload</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" />OSINT</span>
            </div>

            <ForceGraph2D
                ref={fgRef}
                graphData={data}
                nodeLabel="label"
                nodeColor={(node: any) => GROUP_COLORS[node.group] || '#6366f1'}
                linkColor={() => 'rgba(255,255,255,0.15)'}
                backgroundColor="transparent"
                nodeRelSize={7}
                linkWidth={2}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleColor={() => 'rgba(99,102,241,0.6)'}
                d3VelocityDecay={0.15}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const label = node.label;
                    const fontSize = 11 / globalScale;
                    const nodeSize = 7;
                    const color = GROUP_COLORS[node.group] || '#6366f1';

                    // Draw node circle
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
                    ctx.fillStyle = color;
                    ctx.fill();

                    // Draw glow
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Draw label
                    ctx.font = `${fontSize}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    ctx.fillText(label, node.x, node.y + nodeSize + 2);
                }}
            />
        </div>
    );
}

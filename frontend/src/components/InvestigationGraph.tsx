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
    links: Link[]
}

// Editorial light theme node palette
const GROUP_COLORS: Record<number, string> = {
    1: '#8B7D6B', // Sender — warm brown
    2: '#C77E0A', // URL — amber
    3: '#C8383A', // Payload — scarlet
    4: '#3730A3', // OSINT — indigo
};

export default function InvestigationGraph({ data }: { data: GraphData }) {
    const fgRef = useRef<any>(null);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (fgRef.current && data && data.nodes && data.nodes.length > 0) {
            timeoutId = setTimeout(() => {
                if (fgRef.current) {
                    fgRef.current.zoomToFit(400);
                }
            }, 500);
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [data]);

    return (
        <div className="w-full h-[400px] overflow-hidden relative block" style={{ backgroundColor: '#F7F5F0' }}>
            {/* Label */}
            <div
                className="absolute top-3 left-3 z-10 text-[10px] uppercase tracking-[0.12em] px-2.5 py-1.5"
                style={{
                    fontFamily: 'var(--font-dm-mono)',
                    color: '#78746D',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2DFD9',
                    borderRadius: '2px',
                }}
            >
                Interactive Investigation Graph
            </div>

            {/* Legend */}
            <div
                className="absolute bottom-3 left-3 z-10 flex gap-3 text-[10px] px-3 py-2"
                style={{
                    fontFamily: 'var(--font-dm-mono)',
                    color: '#78746D',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2DFD9',
                    borderRadius: '2px',
                }}
            >
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#8B7D6B' }} />Sender</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#C77E0A' }} />URL</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#C8383A' }} />Payload</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#3730A3' }} />OSINT</span>
            </div>

            <ForceGraph2D
                ref={fgRef}
                graphData={data}
                nodeLabel="label"
                nodeColor={(node: any) => GROUP_COLORS[node.group] || '#3730A3'}
                linkColor={() => 'rgba(15,15,14,0.12)'}
                backgroundColor="transparent"
                nodeRelSize={7}
                linkWidth={1.5}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleColor={() => 'rgba(200,56,58,0.5)'}
                d3VelocityDecay={0.15}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const label = node.label;
                    const fontSize = Math.max(10.5 / globalScale, 2); // Prevent font from getting too small
                    const nodeSize = 7;
                    const color = GROUP_COLORS[node.group] || '#3730A3';

                    // Soft shadow ring
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeSize + 3, 0, 2 * Math.PI, false);
                    ctx.fillStyle = color + '22';
                    ctx.fill();

                    // Node
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
                    ctx.fillStyle = color;
                    ctx.fill();

                    // Label (Performance Optimization: Only render if text is large enough)
                    if (globalScale > 0.8) {
                        ctx.font = `500 ${fontSize}px DM Mono, monospace`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        ctx.fillStyle = '#78746D';
                        ctx.fillText(label, node.x, node.y + nodeSize + 3);
                    }
                }}
            />
        </div>
    );
}

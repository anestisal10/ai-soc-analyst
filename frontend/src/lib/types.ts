/* eslint-disable @typescript-eslint/no-explicit-any */
export interface OsintResult {
    source: string;
    target: string;
    data: Record<string, any>;
}

export interface GraphNode {
    id: string;
    group: number;
    label: string;
}

export interface GraphLink {
    source: string;
    target: string;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export interface ThreatReport {
    threat_score: number;
    score_breakdown: {
        factor: string;
        score: number;
        type: string;
        description: string;
    }[];
    technical_analysis: string;
    psychological_analysis: string;
    iocs: string[];
    graph_data: GraphData;
    remediation_script: string;
    osint_results: OsintResult[];
    attachment_results?: {
        filename: string;
        content_type: string;
        scans: {
            tool: string;
            status: string;
            findings: string[];
        }[];
    }[];
    authentication_results?: {
        spf_pass: boolean;
        dkim_pass: boolean;
        dmarc_pass: boolean;
        anomalies: string[];
        x_mailer: string | null;
        spoofed_indicators: boolean;
        summary: string;
    };
    stix_bundle?: string;
    misp_status?: {
        status: string;
        event_id?: string;
        url?: string;
        message: string;
        attributes?: string[];
    };
}

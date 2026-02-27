// Fix #7: Updated ThreatReport type to match the ACTUAL backend API response.
// The old type (verdict, severity_score, explanation, extracted_iocs) was completely
// out of sync with the real API which returns threat_score, technical_analysis, etc.

export type OsintResult = {
    source: string;
    target: string;
    data: Record<string, unknown>;
};

export type AttachmentScan = {
    tool: string;
    status: string;
    findings?: string[];
};

export type AttachmentResult = {
    filename: string;
    content_type: string;
    scans: AttachmentScan[];
};

export type AuthenticationResults = {
    spf_pass: boolean;
    dkim_pass: boolean;
    dmarc_pass: boolean;
    anomalies: string[];
    x_mailer: string | null;
    spoofed_indicators: boolean;
    summary: string;
};

export type GraphNode = {
    id: string;
    group: number;
    label: string;
};

export type GraphLink = {
    source: string;
    target: string;
};

export type GraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};

export type MispStatus = {
    status: string;
    event_id: string | null;
    message: string;
};

export type ThreatReport = {
    threat_score: number;
    technical_analysis: string;
    psychological_analysis: string;
    iocs: string[];
    graph_data: GraphData;
    remediation_script: string;
    osint_results: OsintResult[];
    attachment_results: AttachmentResult[];
    authentication_results: AuthenticationResults;
    stix_bundle: string | null;
    misp_status: MispStatus | null;
};

export type ExtensionMessage =
    | { type: "SHOW_RESULTS"; data: ThreatReport }
    | { type: "SHOW_LOADING" }
    | { type: "SHOW_ERROR"; error: string };

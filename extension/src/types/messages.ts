export type ThreatReport = {
    verdict: "Clean" | "Suspicious" | "Malicious";
    severity_score: number;
    explanation: string;
    extracted_iocs: {
        urls: string[];
        ips: string[];
        domains: string[];
        emails: string[];
    };
    social_engineering_tactics: string[];
    osint_results?: any;
};

export type ExtensionMessage =
    | { type: "SHOW_RESULTS"; data: ThreatReport }
    | { type: "SHOW_LOADING" }
    | { type: "SHOW_ERROR"; error: string };

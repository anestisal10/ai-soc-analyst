type OsintResult = {
    source: string;
    target: string;
    data: Record<string, unknown>;
};

type AttachmentScan = {
    tool: string;
    status: string;
    findings?: string[];
};

type AttachmentResult = {
    filename: string;
    content_type: string;
    scans: AttachmentScan[];
};

type AuthenticationResults = {
    spf_pass: boolean;
    dkim_pass: boolean;
    dmarc_pass: boolean;
    anomalies: string[];
    x_mailer: string | null;
    spoofed_indicators: boolean;
    summary: string;
};

type ThreatReport = {
    threat_score: number;
    technical_analysis: string;
    psychological_analysis: string;
    iocs: string[];
    graph_data: Record<string, unknown>;
    remediation_script: string;
    osint_results: OsintResult[];
    attachment_results: AttachmentResult[];
    authentication_results: AuthenticationResults;
    stix_bundle: string | null;
    misp_status: Record<string, unknown> | null;
};

type ExtensionMessage =
    | { type: "SHOW_RESULTS"; data: ThreatReport }
    | { type: "SHOW_LOADING" }
    | { type: "SHOW_ERROR"; error: string };

/** Escapes HTML special chars to prevent XSS when injecting data into innerHTML. */
function sanitize(str: string): string {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

// Prevent double injection
if (!(window as { __aiSocInjected?: boolean }).__aiSocInjected) {
    (window as { __aiSocInjected?: boolean }).__aiSocInjected = true;
    init();
}

let overlayContainer: HTMLElement | null = null;

/** Creates a fresh drag state object for each overlay instance. */
function createDragState() {
    return {
        isDragging: false,
        // Fix #10: Track element position (xOffset/yOffset) separately from
        // initial mouse-down position (initialX/initialY) so multi-drag works correctly.
        xOffset: window.innerWidth - 420,
        yOffset: 20,
        initialX: 0,
        initialY: 0,
    };
}

let dragState = createDragState();
let _dragEndHandler: EventListener | null = null;
let _dragHandler: EventListener | null = null;


function init() {
    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
        switch (message.type) {
            case "SHOW_LOADING":
                showOverlay(renderLoading());
                break;
            case "SHOW_RESULTS":
                showOverlay(renderResults(message.data));
                break;
            case "SHOW_ERROR":
                showOverlay(renderError(message.error));
                break;
        }
    });
}

function showOverlay(contentHtml: string) {
    if (!overlayContainer) {
        // Reset drag state for each new overlay
        dragState = createDragState();

        overlayContainer = document.createElement("div");
        overlayContainer.id = "ai-soc-overlay-root";

        // Header for dragging and close button
        const header = document.createElement("div");
        header.className = "ai-soc-header";

        const dragHandle = document.createElement("div");
        dragHandle.className = "ai-soc-drag-handle";
        dragHandle.innerText = "🛡️ AI SOC Analysis";

        const closeBtn = document.createElement("button");
        closeBtn.className = "ai-soc-close-btn";
        closeBtn.innerText = "×";
        closeBtn.onclick = closeOverlay;

        header.appendChild(dragHandle);
        header.appendChild(closeBtn);

        // Content area
        const contentBody = document.createElement("div");
        contentBody.id = "ai-soc-content-body";
        contentBody.innerHTML = contentHtml;

        overlayContainer.appendChild(header);
        overlayContainer.appendChild(contentBody);
        document.body.appendChild(overlayContainer);

        // Setup Draggable
        setupDraggable(dragHandle, overlayContainer);

        // Initial Position
        overlayContainer.style.transform = `translate3d(${dragState.xOffset}px, ${dragState.yOffset}px, 0)`;

        // Fade in
        requestAnimationFrame(() => {
            if (overlayContainer) overlayContainer.style.opacity = "1";
        });
    } else {
        const contentBody = document.getElementById("ai-soc-content-body");
        if (contentBody) {
            contentBody.innerHTML = contentHtml;
        }
    }
}

function closeOverlay() {
    if (overlayContainer) {
        overlayContainer.style.opacity = "0";
        setTimeout(() => {
            overlayContainer?.remove();
            overlayContainer = null;
            if (_dragEndHandler) document.removeEventListener("mouseup", _dragEndHandler);
            if (_dragHandler) document.removeEventListener("mousemove", _dragHandler);
            _dragEndHandler = null;
            _dragHandler = null;
        }, 300); // Wait for transition
    }
}

function setupDraggable(dragHandle: HTMLElement, container: HTMLElement) {
    function dragStart(e: MouseEvent) {
        if (e.target === dragHandle) {
            dragState.isDragging = true;
            // Store the mouse position offset relative to the current element position
            dragState.initialX = e.clientX - dragState.xOffset;
            dragState.initialY = e.clientY - dragState.yOffset;
        }
    }

    // Fix #10: Corrected drag logic.
    // initialX/Y = mouse position where drag started, relative to element origin.
    // xOffset/yOffset = element's current position (updated during drag).
    // On dragEnd, we only clear isDragging — xOffset/yOffset persist correctly
    // so the next drag starts from the last correct position.
    function dragEnd() {
        dragState.isDragging = false;
    }

    function drag(e: MouseEvent) {
        if (dragState.isDragging) {
            e.preventDefault();
            dragState.xOffset = e.clientX - dragState.initialX;
            dragState.yOffset = e.clientY - dragState.initialY;
            container.style.transform = `translate3d(${dragState.xOffset}px, ${dragState.yOffset}px, 0)`;
        }
    }

    dragHandle.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);

    _dragEndHandler = dragEnd as EventListener;
    _dragHandler = drag as EventListener;
}

function getScoreColor(score: number): string {
    if (score < 40) return "#10b981"; // emerald-500
    if (score < 70) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
}

function renderLoading() {
    return `
    <div class="ai-soc-loading">
        <div class="ai-soc-spinner"></div>
        <p>AI SOC is analyzing the text...</p>
    </div>
  `;
}

function renderError(error: string) {
    return `
    <div class="ai-soc-error">
        <h3>Analysis Failed</h3>
        <p>${sanitize(error)}</p>
    </div>
  `;
}

function renderResults(data: ThreatReport) {
    const scoreColor = getScoreColor(data.threat_score);

    // Derived verdict based on score (since backend doesn't send "verdict" string)
    let verdict = "Clean";
    if (data.threat_score >= 70) verdict = "Malicious";
    else if (data.threat_score >= 40) verdict = "Suspicious";

    let iocsHtml = "";
    if (data.iocs && data.iocs.length > 0) {
        iocsHtml = `<div class="ai-soc-section">
            <h4>Extracted IoCs</h4>
            <div class="ai-soc-iocs">
                ${data.iocs.map((ioc: string) => `<span class="ai-soc-tag">${sanitize(ioc)}</span>`).join("")}
            </div>
        </div>`;
    }

    let osintHtml = "";
    if (data.osint_results && data.osint_results.length > 0) {
        osintHtml = `<div class="ai-soc-section">
            <h4>OSINT Results</h4>
            <ul class="ai-soc-tactics">
                ${data.osint_results.map((o: OsintResult) => `<li><strong>${sanitize(o.source)}:</strong> ${sanitize(o.target)}</li>`).join("")}
            </ul>
        </div>`;
    }

    return `
    <div class="ai-soc-report">
        <div class="ai-soc-header-verdict" style="border-right: 4px solid ${scoreColor}">
            <div class="ai-soc-verdict-title">Verdict</div>
            <div class="ai-soc-verdict-value" style="color: ${scoreColor}">${verdict}</div>
            <div class="ai-soc-score">Severity: <strong>${data.threat_score}/100</strong></div>
        </div>
        
        <div class="ai-soc-section">
            <h4>Technical Analysis</h4>
            <div class="ai-soc-explanation">${sanitize(data.technical_analysis || "No technical analysis provided.")}</div>
        </div>

        <div class="ai-soc-section">
            <h4>Psychological Analysis</h4>
            <div class="ai-soc-explanation">${sanitize(data.psychological_analysis || "No psychological analysis provided.")}</div>
        </div>
        
        ${osintHtml}
        ${iocsHtml}
    </div>
  `;
}

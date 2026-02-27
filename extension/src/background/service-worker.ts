import { ThreatReport } from "../types/messages";

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "analyze-phishing",
        title: "Analyze Phishing with AI SOC",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "analyze-phishing" && info.selectionText && tab?.id) {
        const tabId = tab.id;
        try {
            // 1. Tell content script to show loading state
            chrome.tabs.sendMessage(tabId, { type: "SHOW_LOADING" }).catch(() => {
                // Content script might not be injected yet — inject on demand
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["dist/content/index.js"]
                }).then(() => {
                    chrome.scripting.insertCSS({
                        target: { tabId: tabId },
                        // Fix #27: Use consistent dist path (matching manifest fallback)
                        files: ["dist/content/content.css"]
                    });
                    chrome.tabs.sendMessage(tabId, { type: "SHOW_LOADING" });
                });
            });

            // 2. Fetch analysis from backend
            const formData = new FormData();
            formData.append("text", info.selectionText);

            const response = await fetch("http://localhost:8000/api/analyze", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${await response.text()}`);
            }

            if (!response.body) throw new Error("No response body");

            // Fix #6: Corrected SSE stream parsing.
            // Old code used buffer.split('\\n') which splits on literal \+n (2 chars), never matching.
            // SSE events are separated by double newlines (\n\n), matching the backend and frontend.
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let buffer = "";
            let reportReceived: ThreatReport | null = null;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    // SSE events are delimited by \n\n
                    const chunks = buffer.split('\n\n');
                    // Keep last (potentially incomplete) chunk in buffer
                    buffer = chunks.pop() || '';

                    for (const chunk of chunks) {
                        const line = chunk.trim();
                        if (line.startsWith('data: ')) {
                            // Use slice(6) consistently (same as frontend implementation)
                            const dataStr = line.slice(6).trim();
                            if (!dataStr) continue;
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.type === 'result') {
                                    reportReceived = data.data as ThreatReport;
                                    break;
                                } else if (data.type === 'error') {
                                    throw new Error(data.message);
                                }
                                // 'status' events are informational — ignore in extension
                            } catch (e: unknown) {
                                const err = e as Error;
                                if (err.message && !err.message.includes('JSON')) {
                                    throw e;
                                }
                            }
                        }
                    }
                }
                if (reportReceived) break;
            }

            if (!reportReceived) {
                throw new Error("Analysis completed but no report was returned.");
            }

            // 3. Send results to content script
            chrome.tabs.sendMessage(tabId, { type: "SHOW_RESULTS", data: reportReceived });

        } catch (error: unknown) {
            const err = error as Error;
            console.error("Analysis error:", err);
            chrome.tabs.sendMessage(tabId, { type: "SHOW_ERROR", error: err.message });
        }
    }
});

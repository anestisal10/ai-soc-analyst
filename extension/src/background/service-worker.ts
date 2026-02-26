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
                // Content script might not be injected yet
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["dist/content/index.js"]
                }).then(() => {
                    chrome.scripting.insertCSS({
                        target: { tabId: tabId },
                        files: ["dist/content/content.css"]
                    });
                    chrome.tabs.sendMessage(tabId, { type: "SHOW_LOADING" });
                });
            });

            // 2. Fetch analysis
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

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let buffer = "";
            let reportReceived = null;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim().startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim();
                            if (!dataStr) continue;
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.type === 'result') {
                                    reportReceived = data.data;
                                    break;
                                } else if (data.type === 'error') {
                                    throw new Error(data.message);
                                }
                            } catch (e: any) {
                                if (e.message && !e.message.includes('JSON')) {
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

        } catch (error: any) {
            console.error("Analysis error:", error);
            chrome.tabs.sendMessage(tabId, { type: "SHOW_ERROR", error: error.message });
        }
    }
});

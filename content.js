console.log("ExplainIt AI content script loaded");

// Check if we're in an iframe
function isIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

// Check if we're on a valid page for content script
function isValidPage() {
    const url = window.location.href;
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') || 
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('chrome-search://')) {
        return false;
    }
    return true;
}

// Exit early if in iframe or invalid page
if (isIframe() || !isValidPage()) {
    console.log("ExplainIt AI: Skipping iframe or restricted page");
    if (typeof chrome === 'undefined') {
        window.chrome = {};
    }
} else {

// Ensure chrome object exists
if (typeof chrome === 'undefined') {
    console.log("ExplainIt AI: Chrome API not available");
} else {


// Message listener with error handling
if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    try {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "getSelectedText") {
                const selectedText = window.getSelection().toString().trim();
                sendResponse({ text: selectedText });
            }
            return true;
        });
    } catch (error) {
        console.warn("Could not add message listener:", error);
    }
}

let selectionTimeout;
let isProcessing = false;

document.addEventListener("mouseup", handleTextSelection);
document.addEventListener("keyup", handleTextSelection);

async function handleTextSelection(e) {
    if (isProcessing) return;
    
    clearTimeout(selectionTimeout);

    selectionTimeout = setTimeout(async () => {
        const selectedText = window.getSelection().toString().trim();

        if (selectedText.length > 10) {
            isProcessing = true;
            
            try {
                // Always use message passing instead of direct storage access
                if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
                    await chrome.runtime.sendMessage({
                        action: "saveSelection",
                        selectedText: selectedText,
                        timestamp: Date.now(),
                        url: window.location.href,
                        title: document.title,
                    });
                    console.log("Text sent to background via message");
                }

                showSelectionFeedback();
            } catch (error) {
                console.error("Error in handleTextSelection:", error);
                showSelectionFeedback();
            } finally {
                isProcessing = false;
            }
        }
    }, 300);
}

function showSelectionFeedback() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const existingIndicator = document.querySelector(".explainit-selection-indicator");
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const indicator = document.createElement("div");
        indicator.className = "explainit-selection-indicator";
        indicator.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke-width="2"/>
                <path d="M2 17L12 22L22 17" stroke-width="2"/>
                <path d="M2 12L12 17L22 12" stroke-width="2"/>
            </svg>
            <span>Explain with AI</span>
        `;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        const top = Math.max(10, rect.top + scrollTop - 40);
        const left = Math.min(
            window.innerWidth - 200, 
            Math.max(10, rect.left + scrollLeft + rect.width / 2 - 80)
        );

        indicator.style.cssText = `
            position: absolute;
            top: ${top}px;
            left: ${left}px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 2147483647;
            cursor: pointer;
            animation: fadeInUp 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            pointer-events: auto;
        `;

        document.body.appendChild(indicator);

        indicator.addEventListener("click", async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const text = selection.toString().trim();
            console.log("Indicator clicked, saving text:", text.substring(0, 50));
            
            try {
                // Use message passing only - no direct storage access
                if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
                    // First save the text
                    await chrome.runtime.sendMessage({
                        action: "saveSelection",
                        selectedText: text,
                        timestamp: Date.now(),
                        url: window.location.href,
                        title: document.title,
                    });
                    
                    console.log("Text saved via message passing");
                    
                    // Small delay to ensure message is processed
                    await new Promise(resolve => setTimeout(resolve, 150));
                    
                    // Then open side panel
                    await chrome.runtime.sendMessage({
                        action: "openSidePanel",
                        text: text,
                    });
                    
                    console.log("Side panel open message sent");
                }
            } catch (error) {
                console.error("Error in indicator click:", error);
            }
            
            indicator.remove();
        });

        setTimeout(() => {
            if (indicator && indicator.parentElement) {
                indicator.style.animation = "fadeOut 0.3s ease";
                setTimeout(() => {
                    if (indicator && indicator.parentElement) {
                        indicator.remove();
                    }
                }, 300);
            }
        }, 5000);

        const removeIndicator = (e) => {
            if (indicator && !indicator.contains(e.target)) {
                indicator.remove();
                document.removeEventListener("click", removeIndicator);
            }
        };
        
        setTimeout(() => {
            document.addEventListener("click", removeIndicator);
        }, 100);
        
    } catch (error) {
        console.error("Error showing selection feedback:", error);
    }
}


// Add styles
if (!document.getElementById("explainit-style")) {
    const style = document.createElement("style");
    style.id = "explainit-style";
    style.textContent = `
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        .explainit-selection-indicator {
            pointer-events: auto !important;
        }
        .explainit-selection-indicator:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.25);
            transition: all 0.2s ease;
        }
    `;
    document.head.appendChild(style);
}

console.log("ExplainIt AI content script initialized");

} // End chrome check
} // End isValidPage check
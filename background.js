console.log("ExplainIt AI background script loaded");

chrome.contextMenus.removeAll(() => {
  console.log("Cleared existing context menus");
});

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const reason = details.reason;

    if (reason === "install") {
      console.log("ExplainIt AI installed successfully");

      await chrome.storage.local.set({
        explanationLevel: "teen",
        autoTranslate: false,
        targetLanguage: "es",
        showFloatingButton: false,
        notes: [],
        usageStats: {},
      });

      // Open side panel on install
      chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icon128.png",
        title: "ExplainIt AI Installed",
        message: "Click the extension icon or press Ctrl+Shift+E to open the side panel.",
      });
    } 
    else if (reason === "update") {
      console.log("ExplainIt AI updated to version:", chrome.runtime.getManifest().version);
    }

    // Clear and recreate context menus
    await chrome.contextMenus.removeAll();
    
    // Setup Context Menus with error handling
    const contextMenuItems = [
      { id: "explainItAI", title: "Explain with AI" },
      { id: "explainItAI-summarize", title: "Summarize with AI" },
      { id: "explainItAI-translate", title: "Translate with AI" },
    ];

    for (const item of contextMenuItems) {
      try {
        await chrome.contextMenus.create({
          id: item.id,
          title: item.title,
          contexts: ["selection"],
        });
        console.log(`Created context menu: ${item.id}`);
      } catch (error) {
        console.warn(`Context menu ${item.id} error:`, error.message);
      }
    }

  } catch (error) {
    console.error("Error during installation:", error);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log("Context menu clicked:", info.menuItemId);
  
  if (!info.selectionText) {
    console.log("No text selected");
    return;
  }

  console.log("Selected text:", info.selectionText.substring(0, 50));
  await logUsage(info.menuItemId);

  // Save selected text to storage with detailed logging
  try {
    await chrome.storage.local.set({
      selectedText: info.selectionText,
      timestamp: Date.now(),
      action: info.menuItemId,
      url: tab.url,
      title: tab.title,
    });
    
    console.log("Text saved to storage from context menu");
    
    // Small delay to ensure storage is written
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.error("Error saving to storage:", error);
  }

  // Open side panel
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'popup.html',
      enabled: true
    });
    console.log("Side panel opened from context menu");
  } catch (error) {
    console.error("Error opening side panel:", error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received:", request.action);

  const actions = {
    openSidePanel: () => handleOpenSidePanel(sender.tab?.id, request.text),
    getSelectedText: () => handleGetSelectedText(sender.tab?.id),
    saveNote: () => handleSaveNote(request.note),
    checkAIAvailability: () => checkAIAvailability(),
    saveSelection: () => handleSaveSelection(request),
  };

  if (actions[request.action]) {
    actions[request.action]()
      .then(result => {
        console.log(`Action ${request.action} completed:`, result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error(`Action ${request.action} failed:`, error);
        sendResponse({ error: error.message });
      });
    return true; // Keep message channel open
  } else {
    console.warn("Unknown action:", request.action);
    sendResponse({ error: "Unknown action" });
  }
});

async function handleOpenSidePanel(tabId, text) {
  try {
    console.log("Opening side panel, text provided:", !!text);
    
    if (text) {
      await chrome.storage.local.set({ 
        selectedText: text, 
        timestamp: Date.now() 
      });
      console.log("Saved text to storage:", text.substring(0, 50));
    }
    
    // Get current tab if tabId not provided
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id;
    }
    
    if (tabId) {
      // Open side panel
      await chrome.sidePanel.open({ tabId });
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'popup.html',
        enabled: true
      });
      console.log("Side panel opened successfully");
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error opening side panel:", error);
    return { error: error.message };
  }
}

async function handleGetSelectedText(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection().toString().trim(),
    });
    return { text: result?.result || "" };
  } catch (error) {
    console.error("Error getting selected text:", error);
    return { error: error.message };
  }
}

async function handleSaveNote(note) {
  try {
    const { notes = [] } = await chrome.storage.local.get("notes");

    const newNote = {
      ...note,
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };

    notes.unshift(newNote);
    if (notes.length > 50) notes.splice(50);

    await chrome.storage.local.set({ notes });
    await updateBadge();
    return { success: true, notesCount: notes.length };
  } catch (error) {
    console.error("Error saving note:", error);
    return { error: error.message };
  }
}

async function handleSaveSelection(data) {
    try {
        console.log("Saving selection in background:", data.selectedText?.substring(0, 50));
        
        const saveData = {
            selectedText: data.selectedText || data.text,
            timestamp: data.timestamp || Date.now(),
            url: data.url,
            title: data.title,
        };
        
        await chrome.storage.local.set(saveData);
        console.log("Selection saved successfully");
        
        return { success: true };
    } catch (error) {
        console.error("Error saving selection in background:", error);
        return { error: error.message };
    }
}

async function checkAIAvailability() {
  try {
    return {
      available: true,
      message: "AI features available",
      details: {
        languageModel: true,
        summarizer: true,
        translator: true,
        rewriter: true,
      },
    };
  } catch (error) {
    return { available: false, message: "AI not available", error: error.message };
  }
}

async function logUsage(action) {
  try {
    const { usageStats = {} } = await chrome.storage.local.get("usageStats");
    usageStats[action] = (usageStats[action] || 0) + 1;
    usageStats.lastUsed = Date.now();
    await chrome.storage.local.set({ usageStats });
  } catch (error) {
    console.error("Error logging usage:", error);
  }
}

async function updateBadge() {
  try {
    const { notes = [] } = await chrome.storage.local.get("notes");
    const text = notes.length ? (notes.length > 99 ? "99+" : notes.length.toString()) : "";
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: "#667eea" });
  } catch (error) {
    console.error("Error updating badge:", error);
  }
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log("Command received:", command);
  if (command === "_execute_action") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString().trim(),
      });

      const selectedText = result?.result;
      if (selectedText) {
        await chrome.storage.local.set({
          selectedText,
          timestamp: Date.now(),
          url: tab.url,
          title: tab.title,
        });
      }
      
      // Open side panel
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error("Error handling keyboard shortcut:", error);
    }
  }
});

// Handle extension icon click - Open side panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Try to get selected text first
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString().trim(),
      });

      const selectedText = result?.result;
      if (selectedText) {
        await chrome.storage.local.set({
          selectedText,
          timestamp: Date.now(),
          url: tab.url,
          title: tab.title,
        });
      }
    } catch (error) {
      console.log("Could not get selected text:", error);
    }

    // Open side panel
    await chrome.sidePanel.open({ tabId: tab.id });
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'popup.html',
      enabled: true
    });
  } catch (error) {
    console.error("Error opening side panel:", error);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    console.log("Tab updated:", tab.url);
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.notes) {
    console.log(`Notes updated: ${changes.notes.newValue?.length || 0} items`);
    updateBadge();
  }
});

// Cleanup old data periodically
chrome.alarms.create("cleanupOldData", { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "cleanupOldData") {
    const { timestamp } = await chrome.storage.local.get("timestamp");
    const now = Date.now();
    if (timestamp && now - timestamp > 3600000) { // 1 hour old
      await chrome.storage.local.remove(["selectedText", "timestamp"]);
      console.log("Cleaned up old temporary data");
    }
  }
});

// Error handlers
self.addEventListener("error", (event) => {
  console.error("Background script error:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

// Initialize badge
updateBadge();

console.log("ExplainIt AI background script initialized successfully");
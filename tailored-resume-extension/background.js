// Initialize side panel when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Set panel behavior first
  chrome.sidePanel.setPanelBehavior({ 
    openPanelOnActionClick: true 
  }).catch(console.error);

  // Create context menu item
  chrome.contextMenus.create({
    id: 'openResumeTailor',
    title: 'Open Resume Tailor',
    contexts: ['all']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'openResumeTailor' && tab?.windowId) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  }
});

// Handle extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.windowId) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  }
});

// Initialize side panel behavior
chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ 
    openPanelOnActionClick: true 
  });
});

/**
 * Agentex Background Service Worker v4.0
 * 
 * Bridges: content script (floating panel) ↔ AI service ↔ side panel
 * Handles: message routing, generation, PDF compilation, state management
 */

// ============================================ 
// SIDE PANEL SETUP
// ============================================

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(e => console.error('[BG] Side panel behavior error:', e));

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openAgentex',
    title: 'Open Agentex Resume Tailor',
    contexts: ['all']
  });
  console.log('[BG] Extension installed, context menu created');
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openAgentex' && tab?.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// ============================================
// LAZY-LOAD AI SERVICE (runs in SW context)
// ============================================

try {
  importScripts('config.js', 'services/ai-service.js');
} catch (e) {
  console.error('[BG] Failed to import scripts:', e);
}

let _aiService = null;

async function getAIService() {
  if (!_aiService) {
    if (self.AIService) {
      _aiService = new self.AIService();
      await _aiService.loadSettings();
    } else {
      console.error('[BG] AIService not found on self object.');
    }
  }
  return _aiService;
}

// ============================================
// MESSAGE HANDLER
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // OPEN_SIDE_PANEL must be handled synchronously to preserve user gesture context.
  // Routing through an async function breaks the gesture chain and Chrome rejects the call.
  if (message.type === 'OPEN_SIDE_PANEL') {
    const view = message.view || 'main';
    chrome.storage.local.set({ sidePanelView: view });
    const windowId = sender.tab?.windowId;
    const openOpts = windowId ? { windowId } : undefined;
    if (openOpts) {
      chrome.sidePanel.open(openOpts)
        .then(() => sendResponse({ success: true }))
        .catch(e => {
          console.warn('[BG] sidePanel.open error:', e.message);
          sendResponse({ error: `Could not open side panel: ${e.message}` });
        });
    } else {
      chrome.windows.getCurrent().then(win => {
        chrome.sidePanel.open({ windowId: win.id })
          .then(() => sendResponse({ success: true }))
          .catch(e => sendResponse({ error: `Could not open side panel: ${e.message}` }));
      });
    }
    return true;
  }

  handleMessage(message, sender).then(sendResponse).catch(err => {
    console.error('[BG] Message handler error:', err);
    sendResponse({ error: err.message || 'Unknown error' });
  });
  return true; // keep channel open for async
});

async function handleMessage(message, sender) {
  const { type } = message;
  console.log('[BG] Message:', type);

  switch (type) {

    // ---- STATUS ----
    case 'GET_STATUS': {
      const stored = await chrome.storage.local.get([
        'resumeLatex', 'originalLatex', 'lastJobDescription', 'savedJD',
        'geminiApiKey', 'claudeApiKey',
        'selectedProvider', 'selectedModelId'
      ]);

      // Support both storage keys (sidepanel uses resumeLatex, background uses originalLatex)
      const resumeLatex = stored.resumeLatex || stored.originalLatex || null;
      const provider = stored.selectedProvider || 'gemini';
      const modelId = stored.selectedModelId || 'gemini-2.5-flash';
      const hasApiKey = !!(stored.geminiApiKey || stored.claudeApiKey);
      const modelInfo = self.config?.getModel?.(provider, modelId);

      return {
        hasResume: !!resumeLatex,
        hasApiKey,
        provider,
        modelId,
        modelName: modelInfo?.name || modelId,
        jd: stored.lastJobDescription || stored.savedJD || '',
        originalLatex: resumeLatex
      };
    }

    // ---- GET MODELS ----
    case 'GET_MODELS': {
      const models = self.config?.MODELS || {};
      return {
        gemini: models.gemini || [],
        claude: models.claude || []
      };
    }

    // ---- GET DEFAULT PROMPT ----
    case 'GET_DEFAULT_PROMPT': {
      if (self.AIService?.getDefaultPrompt) {
        return { prompt: self.AIService.getDefaultPrompt() };
      }
      return { prompt: '' };
    }

    // ---- SET MODEL ----
    case 'SET_MODEL': {
      await chrome.storage.local.set({
        selectedProvider: message.provider,
        selectedModelId: message.modelId,
        selectedModel: `${message.provider}:${message.modelId}`
      });
      _aiService = null; // Force reload
      return { success: true };
    }

    // ---- SAVE JD ----
    case 'SAVE_JD': {
      await chrome.storage.local.set({ lastJobDescription: message.jd, savedJD: message.jd });
      return { success: true };
    }

    // ---- GENERATE ----
    case 'GENERATE_RESUME': {
      const aiService = await getAIService();
      if (!aiService) return { error: 'AI Service not available. Try reloading the extension.' };

      await aiService.loadSettings();

      const stored = await chrome.storage.local.get([
        'resumeLatex', 'originalLatex', 'knowledgeBase', 'lastKnowledgeBase',
        'focusSkills', 'focusExperience', 'focusSummary', 'focusProjects',
        'preserveEducation', 'preserveContact', 'customInstructions'
      ]);

      const resumeLatex = stored.resumeLatex || stored.originalLatex;
      if (!resumeLatex) {
        return { error: 'No resume uploaded. Open the sidebar and upload your .tex file.' };
      }

      // Build focus/preserve arrays from individual checkboxes
      const focusAreas = [];
      if (stored.focusSkills !== false) focusAreas.push('skills');
      if (stored.focusExperience !== false) focusAreas.push('experience');
      if (stored.focusSummary !== false) focusAreas.push('summary');
      if (stored.focusProjects) focusAreas.push('projects');

      const preserveContent = [];
      if (stored.preserveEducation !== false) preserveContent.push('education');
      if (stored.preserveContact !== false) preserveContent.push('contact');

      aiService.setUserInstructions({
        focusAreas,
        preserveContent,
        customInstructions: stored.customInstructions || ''
      });

      // Progress forwarding
      aiService.onProgress((stage, msg) => {
        if (sender.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'GENERATION_PROGRESS', stage, message: msg
          }).catch(() => { });
        }
      });

      try {
        const kb = stored.knowledgeBase || stored.lastKnowledgeBase || '';
        const tailoredLatex = await aiService.generateTailoredResume(resumeLatex, message.jobDescription, kb);
        await chrome.storage.local.set({ tailoredLatex });
        return { tailoredLatex };
      } catch (error) {
        return { error: error.message };
      }
    }

    // ---- COMPILE PDF ----
    case 'COMPILE_PDF': {
      try {
        const serverUrl = self.config?.SERVER_URL || 'https://agentex.onrender.com';
        const response = await fetch(`${serverUrl}/compile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latex: message.latex })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${response.status}`);
        }
        const pdfBuffer = await response.arrayBuffer();
        return { pdfBase64: arrayBufferToBase64(pdfBuffer) };
      } catch (error) {
        return { error: `PDF compilation failed: ${error.message}` };
      }
    }

    // ---- SETTINGS CHANGED ----
    case 'SETTINGS_CHANGED': {
      _aiService = null;
      return { success: true };
    }

    default:
      return { error: `Unknown message type: ${type}` };
  }
}

// ============================================
// UTILITIES
// ============================================

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

console.log('[BG] Background service worker v4.0 loaded');

/**
 * Agentex Side Panel Controller — v4.1 (Config Hub)
 * 
 * Manages API keys, models, tailoring properties.
 * No longer handles generation (moved to floating panel).
 */

(function () {
  'use strict';

  const config = window.AgentexConfig || window.config || {};
  const MODELS = config.MODELS || {};

  const $ = s => document.querySelector(s);
  const banner = $('#status-banner');
  const bannerText = $('#status-text');
  const modelSelect = $('#model-select');
  const modelInfo = $('#model-info');
  const kbInput = $('#kb-input');
  const uploadZone = $('#upload-zone');
  const fileInput = $('#resume-upload');
  const fileStatus = $('#file-status');
  const toastContainer = $('#toast-container');
  const panelToggle = $('#panel-toggle');

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setupDarkMode();
    setupModelSelector();
    setupUpload();
    setupSettings();
    setupSettingsToggle();
    setupPromptSection();
    setupBugReport();
    setupDownloadName();
    setupStorageSync();
    setupPanelToggle();
    await restoreState();
    updateBanner();
  }

  // ── Dark Mode ──
  async function setupDarkMode() {
    const toggle = $('#dark-mode-toggle');
    const data = await chrome.storage.local.get(['darkMode']);
    const isDark = data.darkMode ?? window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (toggle) toggle.checked = isDark;
    applyTheme(isDark);

    toggle?.addEventListener('change', async () => {
      const dark = toggle.checked;
      applyTheme(dark);
      await chrome.storage.local.set({ darkMode: dark });
    });
  }

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  // ── Model Selector ──
  function setupModelSelector() {
    if (!modelSelect) return;
    modelSelect.innerHTML = '';

    if (MODELS.gemini?.length) {
      const g = document.createElement('optgroup');
      g.label = 'Gemini';
      for (const m of MODELS.gemini) {
        const o = document.createElement('option');
        o.value = `gemini:${m.id}`;
        o.textContent = m.name + (m.tier === 'recommended' ? ' (Recommended)' : '');
        g.appendChild(o);
      }
      modelSelect.appendChild(g);
    }

    if (MODELS.claude?.length) {
      const c = document.createElement('optgroup');
      c.label = 'Claude';
      for (const m of MODELS.claude) {
        const o = document.createElement('option');
        o.value = `claude:${m.id}`;
        o.textContent = m.name + (m.tier === 'recommended' ? ' (Recommended)' : '');
        c.appendChild(o);
      }
      modelSelect.appendChild(c);
    }

    if (MODELS.groq?.length) {
      const g = document.createElement('optgroup');
      g.label = 'Groq';
      for (const m of MODELS.groq) {
        const o = document.createElement('option');
        o.value = `groq:${m.id}`;
        o.textContent = m.name + (m.tier === 'recommended' ? ' (Recommended)' : '');
        g.appendChild(o);
      }
      modelSelect.appendChild(g);
    }

    if (MODELS.openrouter?.length) {
      const or = document.createElement('optgroup');
      or.label = 'OpenRouter';
      for (const m of MODELS.openrouter) {
        const o = document.createElement('option');
        o.value = `openrouter:${m.id}`;
        o.textContent = m.name + (m.tier === 'recommended' ? ' (Recommended)' : '');
        or.appendChild(o);
      }
      const customOpt = document.createElement('option');
      customOpt.value = 'openrouter:custom';
      customOpt.textContent = 'Custom Model...';
      or.appendChild(customOpt);
      modelSelect.appendChild(or);
    }

    modelSelect.addEventListener('change', () => {
      const idx = modelSelect.value.indexOf(':');
      const provider = modelSelect.value.substring(0, idx);
      const modelId = modelSelect.value.substring(idx + 1);
      updateModelInfo(provider, modelId);
      chrome.runtime.sendMessage({ type: 'SET_MODEL', provider, modelId }).catch(() => { });
    });
  }

  function updateModelInfo(provider, modelId) {
    if (!modelInfo) return;
    const customInput = $('#custom-model-input');

    if (provider === 'openrouter' && modelId === 'custom') {
      modelInfo.innerHTML = '<span class="model-desc">Enter any valid OpenRouter model ID below.</span>';
      if (customInput) customInput.style.display = 'block';
      return;
    }

    if (customInput) customInput.style.display = 'none';

    const models = MODELS[provider] || [];
    const model = models.find(m => m.id === modelId);
    if (model) {
      modelInfo.innerHTML = `<span class="model-tier">${model.tier}</span> <span class="model-desc">${model.description || ''}</span>`;
    } else {
      modelInfo.innerHTML = '';
    }
  }

  // ── Storage Sync ──
  function setupStorageSync() {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.selectedModel && modelSelect) {
        const newVal = changes.selectedModel.newValue;
        if (newVal && modelSelect.value !== newVal) {
          modelSelect.value = newVal;
          const idx = newVal.indexOf(':');
          const p = newVal.substring(0, idx);
          const m = newVal.substring(idx + 1);
          updateModelInfo(p, m);
        }
      }
      if (changes.darkMode) {
        const dark = changes.darkMode.newValue;
        applyTheme(dark);
        const toggle = $('#dark-mode-toggle');
        if (toggle) toggle.checked = dark;
      }
    });
  }

  // ── Per-Tab Panel Toggle ──
  function setupPanelToggle() {
    if (!panelToggle) return;

    // Query current tab's panel state on init
    chrome.runtime.sendMessage({ type: 'GET_PANEL_STATE' }).then(res => {
      panelToggle.checked = !!res?.enabled;
    }).catch(() => { panelToggle.checked = false; });

    // Toggle click
    panelToggle.addEventListener('change', async () => {
      try {
        const res = await chrome.runtime.sendMessage({ type: 'TOGGLE_PANEL' });
        if (res?.error) {
          showToast(res.error, 'error');
          panelToggle.checked = !panelToggle.checked; // revert
        } else {
          panelToggle.checked = !!res?.enabled;
          showToast(res.enabled ? 'Panel shown on this tab' : 'Panel hidden on this tab', 'info', 2000);
        }
      } catch (e) {
        showToast('Could not toggle panel.', 'error');
        panelToggle.checked = !panelToggle.checked;
      }
    });

    // Listen for tab-switch notifications from background
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'PANEL_STATE_CHANGED') {
        panelToggle.checked = !!msg.enabled;
      }
    });
  }

  // ── Upload ──
  function setupUpload() {
    if (!uploadZone) return;
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
    fileInput?.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
  }

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.tex')) {
      showToast('Please upload a .tex file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const latex = e.target.result;
      await chrome.storage.local.set({ resumeLatex: latex, resumeFilename: file.name });
      if (fileStatus) fileStatus.innerHTML = `<div class="file-status-item success"><span class="material-icons">check_circle</span><span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span></div>`;
      showToast('Resume uploaded.', 'success');
      updateBanner();
    };
    reader.readAsText(file);
  }

  // ── Settings ──
  function setupSettings() {
    $('#toggle-gemini-key')?.addEventListener('click', () => toggleVis('gemini-key'));
    $('#toggle-claude-key')?.addEventListener('click', () => toggleVis('claude-key'));
    $('#toggle-groq-key')?.addEventListener('click', () => toggleVis('groq-key'));
    $('#toggle-openrouter-key')?.addEventListener('click', () => toggleVis('openrouter-key'));
    $('#btn-save-settings')?.addEventListener('click', () => {
      saveSettings();
      showToast('Configuration saved successfully.', 'success');
    });

    // Auto-save logic for Knowledge Base
    let kbSaveTimer = null;
    if (kbInput) {
      kbInput.addEventListener('input', () => {
        clearTimeout(kbSaveTimer);
        kbSaveTimer = setTimeout(() => {
          saveSettings();
        }, 800);
      });
    }

    // Auto-save logic for Custom Model Input
    const customInput = $('#custom-model-input');
    let customModelTimer = null;
    if (customInput) {
      customInput.addEventListener('input', () => {
        clearTimeout(customModelTimer);
        customModelTimer = setTimeout(() => {
          saveSettings();
        }, 800);
      });
    }
  }

  function toggleVis(id) {
    const inp = $(`#${id}`);
    const btn = $(`#toggle-${id}`);
    if (inp.type === 'password') {
      inp.type = 'text';
      btn.querySelector('.material-icons').textContent = 'visibility_off';
    } else {
      inp.type = 'password';
      btn.querySelector('.material-icons').textContent = 'visibility';
    }
  }

  // ── Settings View Toggle ──
  function setupSettingsToggle() {
    const btnSettings = $('#btn-settings');
    const mainView = $('#main-view');
    const settingsView = $('#settings-view');
    if (!btnSettings || !mainView || !settingsView) return;

    function switchView(view) {
      if (view === 'settings') {
        mainView.style.display = 'none';
        settingsView.style.display = 'block';
        btnSettings.querySelector('.material-icons').textContent = 'arrow_back';
        btnSettings.title = 'Back';
      } else {
        settingsView.style.display = 'none';
        mainView.style.display = 'block';
        btnSettings.querySelector('.material-icons').textContent = 'settings';
        btnSettings.title = 'Settings';
      }
    }

    // Button toggles between views
    btnSettings.addEventListener('click', () => {
      const inSettings = settingsView.style.display !== 'none';
      switchView(inSettings ? 'main' : 'settings');
    });

    // Check if opened with a specific view request
    chrome.storage.local.get(['sidePanelView'], (data) => {
      if (data.sidePanelView === 'settings') {
        switchView('settings');
      }
      // Clear the pending request
      chrome.storage.local.remove('sidePanelView');
    });

    // React to view requests while panel is already open
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.sidePanelView?.newValue) {
        switchView(changes.sidePanelView.newValue);
        chrome.storage.local.remove('sidePanelView');
      }
    });
  }

  // ── System Prompt Section (collapsible, with default + reset) ──
  let _defaultPrompt = '';

  function setupPromptSection() {
    const toggle = $('#toggle-prompt-section');
    const content = $('#prompt-section-content');
    const promptArea = $('#system-prompt');
    const resetBtn = $('#btn-reset-prompt');

    if (toggle && content) {
      toggle.addEventListener('click', () => {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        toggle.querySelector('.section-hint .material-icons').textContent = isHidden ? 'expand_less' : 'expand_more';
      });
    }

    // Load the default prompt from the background/AI service
    chrome.runtime.sendMessage({ type: 'GET_DEFAULT_PROMPT' }).then(res => {
      _defaultPrompt = res?.prompt || '';
      // If prompt area is empty, show the default
      if (promptArea && !promptArea.value) {
        promptArea.value = _defaultPrompt;
      }
    }).catch(() => { });

    // Reset button
    if (resetBtn && promptArea) {
      resetBtn.addEventListener('click', () => {
        promptArea.value = _defaultPrompt;
        showToast('Prompt reset to default.', 'success');
      });
    }
  }

  // ── Download Filename ──
  function setupDownloadName() {
    const input = $('#download-name');
    if (!input) return;
    let _timer = null;
    input.addEventListener('input', () => {
      clearTimeout(_timer);
      _timer = setTimeout(() => {
        // Sanitize: strip characters invalid in filenames, collapse spaces to dashes
        const raw = input.value.trim();
        const sanitized = raw.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-');
        const name = sanitized || 'tailored-resume';
        chrome.storage.local.set({ downloadName: name });
        if (sanitized !== raw) input.value = sanitized;
      }, 400);
    });
  }

  // ── Bug Report & Feature Request ──
  function setupBugReport() {
    const issueUrl = config.BUG_REPORT_URL || 'https://github.com/sbeeredd04/Agentex/issues/new';
    const browser = navigator.userAgent;
    const model = modelSelect ? modelSelect.value : 'unknown';
    const version = config.APP_VERSION || 'unknown';
    const mode = config.IS_DEV ? 'Dev' : 'Prod';

    $('#btn-report-bug')?.addEventListener('click', () => {
      const params = new URLSearchParams({
        title: '[Bug] ',
        body: `**Extension Version:** ${version}\n**Browser:** ${browser}\n**Model:** ${model}\n**Mode:** ${mode}\n\n**Describe the bug:**\n\n**Steps to reproduce:**\n1. \n2. \n3. \n\n**Expected behavior:**\n\n**Screenshots (if any):**\n`
      });
      window.open(`${issueUrl}?${params.toString()}`, '_blank');
    });

    $('#btn-request-feature')?.addEventListener('click', () => {
      const params = new URLSearchParams({
        title: '[Feature Request] ',
        labels: 'enhancement',
        body: `**Extension Version:** ${version}\n**Model:** ${model}\n\n**Describe the feature:**\n\n**Why would this be useful?**\n\n**Any additional context or mockups:**\n`
      });
      window.open(`${issueUrl}?${params.toString()}`, '_blank');
    });
  }

  // ── State ──
  async function restoreState() {
    const data = await chrome.storage.local.get([
      'darkMode', 'resumeFilename', 'resumeLatex',
      'selectedModel', 'geminiApiKey', 'claudeApiKey', 'groqApiKey', 'openrouterApiKey',
      'knowledgeBase', 'focusSkills', 'focusExperience', 'focusSummary', 'focusProjects',
      'preserveEducation', 'preserveContact', 'strictMode', 'customInstructions',
      'systemPrompt', 'guardrailRules', 'downloadName'
    ]);

    if (data.resumeFilename && fileStatus) {
      fileStatus.innerHTML = `<div class="file-status-item success"><span class="material-icons">check_circle</span><span>${data.resumeFilename}</span></div>`;
    }

    if (data.selectedModel && modelSelect) {
      let restoredVal = data.selectedModel;

      // Check if it's a custom OpenRouter model that's not in the regular list
      const idx = restoredVal.indexOf(':');
      const p = restoredVal.substring(0, idx);
      const m = restoredVal.substring(idx + 1);

      if (p === 'openrouter') {
        const isKnown = MODELS.openrouter?.some(mod => mod.id === m);
        if (!isKnown) {
          restoredVal = 'openrouter:custom';
          const customInput = $('#custom-model-input');
          if (customInput) {
            customInput.value = m;
            customInput.style.display = 'block';
          }
        }
      }

      modelSelect.value = restoredVal;
      updateModelInfo(p, restoredVal === 'openrouter:custom' ? 'custom' : m);
    }
    if (data.geminiApiKey) $('#gemini-key').value = data.geminiApiKey;
    if (data.claudeApiKey) $('#claude-key').value = data.claudeApiKey;
    if (data.groqApiKey) $('#groq-key').value = data.groqApiKey;
    if (data.openrouterApiKey) $('#openrouter-key').value = data.openrouterApiKey;
    if (data.knowledgeBase && kbInput) kbInput.value = data.knowledgeBase;

    for (const [id, val] of Object.entries({
      'focus-skills': data.focusSkills,
      'focus-experience': data.focusExperience,
      'focus-summary': data.focusSummary,
      'focus-projects': data.focusProjects,
      'strict-mode': data.strictMode,
      'preserve-education': data.preserveEducation,
      'preserve-contact': data.preserveContact
    })) {
      const el = $(`#${id}`);
      if (el && val !== undefined) el.checked = val;
    }

    if (data.customInstructions) $('#custom-instructions').value = data.customInstructions;
    if (data.guardrailRules && $('#guardrail-rules')) $('#guardrail-rules').value = data.guardrailRules;
    if ($('#download-name')) $('#download-name').value = data.downloadName || '';

    // System prompt: if user has a saved custom one, show it; otherwise setupPromptSection fills the default
    if (data.systemPrompt && $('#system-prompt')) $('#system-prompt').value = data.systemPrompt;
  }

  async function saveSettings() {
    const modelVal = modelSelect ? modelSelect.value : 'gemini:gemini-2.5-flash';
    const idx = modelVal.indexOf(':');
    const provider = modelVal.substring(0, idx);
    let modelId = modelVal.substring(idx + 1);

    if (provider === 'openrouter' && modelId === 'custom') {
      const customVal = $('#custom-model-input')?.value.trim();
      if (customVal) modelId = customVal;
    }

    // If the system prompt matches the default, don't save it (so AI service uses built-in default)
    const promptVal = $('#system-prompt')?.value.trim() || '';
    const isDefaultPrompt = promptVal === _defaultPrompt.trim();

    await chrome.storage.local.set({
      selectedModel: modelSelect ? modelSelect.value : null,
      selectedProvider: provider,
      selectedModelId: modelId,
      geminiApiKey: $('#gemini-key')?.value.trim(),
      claudeApiKey: $('#claude-key')?.value.trim(),
      groqApiKey: $('#groq-key')?.value.trim(),
      openrouterApiKey: $('#openrouter-key')?.value.trim(),
      knowledgeBase: kbInput?.value.trim(),
      focusSkills: $('#focus-skills')?.checked ?? true,
      focusExperience: $('#focus-experience')?.checked ?? true,
      focusSummary: $('#focus-summary')?.checked ?? true,
      focusProjects: $('#focus-projects')?.checked ?? false,
      preserveEducation: $('#preserve-education')?.checked ?? true,
      preserveContact: $('#preserve-contact')?.checked ?? true,
      strictMode: $('#strict-mode')?.checked ?? true,
      customInstructions: $('#custom-instructions')?.value.trim(),
      systemPrompt: isDefaultPrompt ? '' : promptVal,
      guardrailRules: $('#guardrail-rules')?.value.trim() || '',
    });

    chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED' }).catch(() => { });
    updateBanner();
  }

  // ── Banner ──
  async function updateBanner() {
    if (!banner) return;
    const data = await chrome.storage.local.get(['resumeLatex', 'geminiApiKey', 'claudeApiKey', 'groqApiKey', 'openrouterApiKey']);
    const hasResume = !!data.resumeLatex;
    const hasKey = !!(data.geminiApiKey || data.claudeApiKey || data.groqApiKey || data.openrouterApiKey);

    if (!hasResume && !hasKey) {
      banner.style.display = 'flex'; banner.className = 'status-banner warning';
      bannerText.textContent = 'Upload a base resume and add an API key.';
    } else if (!hasResume) {
      banner.style.display = 'flex'; banner.className = 'status-banner warning';
      bannerText.textContent = 'Upload a base resume to get started.';
    } else if (!hasKey) {
      banner.style.display = 'flex'; banner.className = 'status-banner warning';
      bannerText.textContent = 'Add an API key to enable AI tailoring.';
    } else {
      banner.style.display = 'flex'; banner.className = 'status-banner success';
      bannerText.textContent = 'Ready. Use the floating panel to paste a job description.';
    }
  }

  // ── Toast ──
  function showToast(msg, type = 'info', ms = 3000) {
    if (!toastContainer) return;
    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<div class="toast-content"><span class="material-icons toast-icon">${icons[type]}</span><span class="toast-message">${msg}</span></div><button class="toast-close" onclick="this.parentElement.remove()"><span class="material-icons">close</span></button>`;
    toastContainer.appendChild(t);
    setTimeout(() => { t.style.animation = 'slideOut 0.3s ease'; setTimeout(() => t.remove(), 300); }, ms);
  }

})();

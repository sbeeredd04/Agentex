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

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setupDarkMode();
    setupModelSelector();
    setupUpload();
    setupSettings();
    setupSettingsToggle();
    setupAdvancedToggle();
    setupBugReport();
    setupStorageSync();
    await restoreState();
    await loadAnalytics();
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

    modelSelect.addEventListener('change', () => {
      const [provider, modelId] = modelSelect.value.split(':');
      updateModelInfo(provider, modelId);
      chrome.runtime.sendMessage({ type: 'SET_MODEL', provider, modelId }).catch(() => { });
    });
  }

  function updateModelInfo(provider, modelId) {
    if (!modelInfo) return;
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
          const [p, m] = newVal.split(':');
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
    $('#btn-save-settings')?.addEventListener('click', () => {
      saveSettings();
      showToast('Configuration saved successfully.', 'success');
    });
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

  function setupAdvancedToggle() {
    const toggle = $('#toggle-advanced');
    const content = $('#advanced-content');
    if (toggle && content) {
      toggle.addEventListener('click', () => {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        toggle.querySelector('.section-hint .material-icons').textContent = isHidden ? 'expand_less' : 'expand_more';
      });
    }
  }

  // ── Bug Report ──
  function setupBugReport() {
    $('#btn-report-bug')?.addEventListener('click', () => {
      const url = config.BUG_REPORT_URL || 'https://github.com/sbeeredd04/Agentex/issues/new';
      const browser = navigator.userAgent;
      const model = modelSelect ? modelSelect.value : 'unknown';
      const params = new URLSearchParams({
        title: '[Bug] ',
        body: `**Extension Version:** ${config.APP_VERSION || 'unknown'}\n**Browser:** ${browser}\n**Model:** ${model}\n**Mode:** ${config.IS_DEV ? 'Dev' : 'Prod'}\n\n**Describe the bug:**\n\n**Steps to reproduce:**\n1. \n2. \n3. \n\n**Expected behavior:**\n\n**Screenshots (if any):**\n`
      });
      window.open(`${url}?${params.toString()}`, '_blank');
    });
  }

  // ── Analytics ──
  async function loadAnalytics() {
    try {
      const analytics = config.getAnalytics ? await config.getAnalytics() : { generations: 0, errors: 0, models: {} };
      if ($('#stat-generations')) $('#stat-generations').textContent = analytics.generations || 0;
      if ($('#stat-errors')) $('#stat-errors').textContent = analytics.errors || 0;

      const usage = $('#stat-model-usage');
      if (usage && analytics.models && Object.keys(analytics.models).length > 0) {
        const lines = Object.entries(analytics.models)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key, count]) => `${key.split(':')[1] || key}: ${count}`)
          .join(' | ');
        usage.textContent = `Most used: ${lines}`;
      }
    } catch { }
  }

  // ── State ──
  async function restoreState() {
    const data = await chrome.storage.local.get([
      'resumeLatex', 'resumeFilename', 'selectedModel', 'geminiApiKey', 'claudeApiKey',
      'knowledgeBase', 'focusSkills', 'focusExperience', 'focusSummary', 'focusProjects',
      'preserveEducation', 'preserveContact', 'strictMode', 'customInstructions', 'systemPrompt'
    ]);

    if (data.resumeFilename && fileStatus) {
      fileStatus.innerHTML = `<div class="file-status-item success"><span class="material-icons">check_circle</span><span>${data.resumeFilename}</span></div>`;
    }

    if (data.selectedModel && modelSelect) {
      modelSelect.value = data.selectedModel;
    }
    const selectedModelStr = modelSelect ? modelSelect.value : 'gemini:gemini-2.5-flash';
    const [p, m] = selectedModelStr.split(':');
    updateModelInfo(p, m);

    if (data.geminiApiKey) $('#gemini-key').value = data.geminiApiKey;
    if (data.claudeApiKey) $('#claude-key').value = data.claudeApiKey;
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
    if (data.systemPrompt) $('#system-prompt').value = data.systemPrompt;
  }

  async function saveSettings() {
    const [provider, modelId] = (modelSelect ? modelSelect.value : 'gemini:gemini-2.5-flash').split(':');

    await chrome.storage.local.set({
      selectedModel: modelSelect ? modelSelect.value : null,
      selectedProvider: provider,
      selectedModelId: modelId,
      geminiApiKey: $('#gemini-key')?.value.trim(),
      claudeApiKey: $('#claude-key')?.value.trim(),
      knowledgeBase: kbInput?.value.trim(),
      focusSkills: $('#focus-skills')?.checked ?? true,
      focusExperience: $('#focus-experience')?.checked ?? true,
      focusSummary: $('#focus-summary')?.checked ?? true,
      focusProjects: $('#focus-projects')?.checked ?? false,
      preserveEducation: $('#preserve-education')?.checked ?? true,
      preserveContact: $('#preserve-contact')?.checked ?? true,
      strictMode: $('#strict-mode')?.checked ?? true,
      customInstructions: $('#custom-instructions')?.value.trim(),
      systemPrompt: $('#system-prompt')?.value.trim(),
    });

    chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED' }).catch(() => { });
    updateBanner();
  }

  // ── Banner ──
  async function updateBanner() {
    if (!banner) return;
    const data = await chrome.storage.local.get(['resumeLatex', 'geminiApiKey', 'claudeApiKey']);
    const hasResume = !!data.resumeLatex;
    const hasKey = !!(data.geminiApiKey || data.claudeApiKey);

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

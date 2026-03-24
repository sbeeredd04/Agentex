/**
 * Agentex Side Panel Controller — v5.2 (Resume Hub)
 *
 * Three-tab layout: Import / Editor / Settings
 * Manages file uploads (LaTeX/PDF/DOCX), LinkedIn import,
 * structured editor, API keys, models, and tailoring properties.
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
    setupTabs();
    setupDarkMode();
    setupModelSelector();
    setupUpload();
    setupLinkedIn();
    setupEditorActions();
    setupSettings();
    setupSettingsToggle();
    setupPromptSection();
    setupBugReport();
    setupDownloadName();
    setupStorageSync();
    setupPanelToggle();
    setupGuardrailSync();
    await restoreState();

    // Init the structured editor
    const editorContent = document.getElementById('editor-content');
    if (editorContent && typeof ResumeEditor !== 'undefined') {
      ResumeEditor.init(editorContent);
    }

    updateBanner();
  }

  // ── Tab Navigation ──
  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pane = document.getElementById('tab-' + btn.dataset.tab);
        if (pane) pane.classList.add('active');
      });
    });

    // Cross-tab switching buttons (e.g., "Go to Import" in editor empty state)
    document.querySelectorAll('[data-switch-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.switchTab;
        const tabBtn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
        if (tabBtn) tabBtn.click();
      });
    });
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
        o.value = 'gemini:' + m.id;
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
        o.value = 'claude:' + m.id;
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
        o.value = 'groq:' + m.id;
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
        o.value = 'openrouter:' + m.id;
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
      let modelId = modelSelect.value.substring(idx + 1);

      if (provider === 'openrouter' && modelId === 'custom') {
        const customId = prompt("Enter custom OpenRouter model ID (e.g. microsoft/wizardlm-2-8x22b):");
        if (customId && customId.trim() !== '') {
          modelId = customId.trim();
          let existingOpt = Array.from(modelSelect.options).find(o => o.value === 'openrouter:' + modelId);
          if (!existingOpt) {
            existingOpt = document.createElement('option');
            existingOpt.value = 'openrouter:' + modelId;
            existingOpt.textContent = modelId + ' (Custom)';
            const orGroup = modelSelect.querySelector('optgroup[label="OpenRouter"]');
            if (orGroup) {
              orGroup.insertBefore(existingOpt, orGroup.lastElementChild);
            } else {
              modelSelect.appendChild(existingOpt);
            }
          }
          modelSelect.value = existingOpt.value;
          saveSettings();
        } else {
          chrome.storage.local.get(['selectedModel'], (data) => {
            if (data.selectedModel) modelSelect.value = data.selectedModel;
          });
          return;
        }
      }

      updateModelInfo(provider, modelId);
      chrome.runtime.sendMessage({ type: 'SET_MODEL', provider, modelId }).catch(() => { });
    });
  }

  function updateModelInfo(provider, modelId) {
    if (!modelInfo) return;
    const models = MODELS[provider] || [];
    const model = models.find(m => m.id === modelId);
    if (model) {
      modelInfo.innerHTML = '<span class="model-tier">' + model.tier + '</span> <span class="model-desc">' + (model.description || '') + '</span>';
    } else if (modelId !== 'custom') {
      modelInfo.innerHTML = '<span class="model-tier">custom</span> <span class="model-desc">User-provided model on ' + provider + '</span>';
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

  // ── Bidirectional Guardrail Sync ──
  function setupGuardrailSync() {
    const pairs = [
      ['guard-education', 'preserve-education'],
      ['guard-contact', 'preserve-contact']
    ];
    for (const [guardId, preserveId] of pairs) {
      const guardEl = $('#' + guardId);
      const preserveEl = $('#' + preserveId);
      if (guardEl && preserveEl) {
        guardEl.addEventListener('change', () => { preserveEl.checked = guardEl.checked; });
        preserveEl.addEventListener('change', () => { guardEl.checked = preserveEl.checked; });
      }
    }
  }

  // ── Per-Tab Panel Toggle ──
  function setupPanelToggle() {
    if (!panelToggle) return;

    chrome.runtime.sendMessage({ type: 'GET_PANEL_STATE' }).then(res => {
      panelToggle.checked = !!res?.enabled;
    }).catch(() => { panelToggle.checked = false; });

    panelToggle.addEventListener('change', async () => {
      try {
        const res = await chrome.runtime.sendMessage({ type: 'TOGGLE_PANEL' });
        if (res?.error) {
          showToast(res.error, 'error');
          panelToggle.checked = !panelToggle.checked;
        } else {
          panelToggle.checked = !!res?.enabled;
          showToast(res.enabled ? 'Panel shown on this tab' : 'Panel hidden on this tab', 'info', 2000);
        }
      } catch (e) {
        showToast('Could not toggle panel.', 'error');
        panelToggle.checked = !panelToggle.checked;
      }
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'PANEL_STATE_CHANGED') {
        panelToggle.checked = !!msg.enabled;
      }
    });
  }

  // ── Upload (LaTeX / PDF / DOCX) ──
  function setupUpload() {
    if (!uploadZone) return;
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('dragover'); handleFileUpload(e.dataTransfer.files[0]); });
    fileInput?.addEventListener('change', e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); });
  }

  async function handleFileUpload(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'tex') {
      // Existing LaTeX handling — client-side
      const reader = new FileReader();
      reader.onload = async (e) => {
        const latex = e.target.result;
        await chrome.storage.local.set({ resumeLatex: latex, resumeFilename: file.name });
        if (fileStatus) fileStatus.innerHTML = '<div class="file-status-item success"><span class="material-icons">check_circle</span><span>' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)</span></div>';
        showToast('LaTeX resume uploaded.', 'success');
        updateBanner();
      };
      reader.readAsText(file);
      return;
    }

    if (ext === 'pdf' || ext === 'docx') {
      // Server-side parsing
      const progress = document.getElementById('upload-progress');
      const progressFill = document.getElementById('upload-progress-fill');
      const progressText = document.getElementById('upload-progress-text');
      if (progress) progress.removeAttribute('hidden');
      if (progressFill) progressFill.style.width = '30%';
      if (progressText) progressText.textContent = 'Parsing ' + ext.toUpperCase() + '...';

      // Get AI credentials for optional structuring
      const storage = await chrome.storage.local.get(['selectedProvider', 'selectedModelId', 'geminiApiKey', 'claudeApiKey', 'groqApiKey', 'openrouterApiKey']);
      const provider = storage.selectedProvider || 'gemini';
      const apiKeyMap = { gemini: 'geminiApiKey', claude: 'claudeApiKey', groq: 'groqApiKey', openrouter: 'openrouterApiKey' };
      const apiKey = storage[apiKeyMap[provider]] || '';
      const modelId = storage.selectedModelId || '';

      const formData = new FormData();
      formData.append('file', file);
      if (apiKey) {
        formData.append('provider', provider);
        formData.append('apiKey', apiKey);
        formData.append('modelId', modelId);
      }

      try {
        if (progressFill) progressFill.style.width = '60%';
        const serverUrl = getServerUrl();
        const resp = await fetch(serverUrl + '/parse/' + ext, { method: 'POST', body: formData });
        const result = await resp.json();

        if (progressFill) progressFill.style.width = '90%';

        if (result.resume) {
          await chrome.storage.local.set({ resumeStructured: result.resume, resumeFilename: file.name });
          if (typeof ResumeEditor !== 'undefined') ResumeEditor.setData(result.resume);
          // Switch to editor tab
          const editorTab = document.querySelector('.tab-btn[data-tab="editor"]');
          if (editorTab) editorTab.click();
          showToast('Resume parsed and loaded into editor.', 'success');
        } else if (result.rawText) {
          await chrome.storage.local.set({ resumeRawText: result.rawText, resumeFilename: file.name });
          showToast('File parsed but could not auto-structure. Please fill in the editor manually.', 'warning');
        } else {
          showToast(result.error || 'Failed to parse file.', 'error');
        }
      } catch (err) {
        showToast('Upload failed: ' + err.message, 'error');
      } finally {
        if (progressFill) progressFill.style.width = '100%';
        setTimeout(() => {
          if (progress) progress.setAttribute('hidden', '');
          if (progressFill) progressFill.style.width = '0';
        }, 500);
      }

      if (fileStatus) fileStatus.innerHTML = '<div class="file-status-item success"><span class="material-icons">check_circle</span><span>' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)</span></div>';
      updateBanner();
      return;
    }

    showToast('Unsupported file format: .' + ext, 'error');
  }

  function getServerUrl() {
    return (typeof config !== 'undefined' && config.SERVER_URL)
      ? config.SERVER_URL
      : 'http://localhost:3000';
  }

  // ── LinkedIn OAuth & Data Import ──
  function setupLinkedIn() {
    const loginBtn = document.getElementById('linkedin-login-btn');
    const logoutBtn = document.getElementById('linkedin-logout');
    const profileSection = document.getElementById('linkedin-profile');
    const exportSection = document.getElementById('linkedin-export-section');
    const linkedinFile = document.getElementById('linkedin-file');
    const linkedinUpload = document.getElementById('linkedin-upload');

    // Check existing auth state
    if (typeof LinkedInAuth !== 'undefined') {
      LinkedInAuth.getAuthState().then(state => {
        if (state.authenticated) showLinkedInLoggedIn();
      });
    }

    loginBtn?.addEventListener('click', async () => {
      if (typeof LinkedInAuth === 'undefined') {
        showToast('LinkedIn auth not available.', 'error');
        return;
      }
      const result = await LinkedInAuth.login();
      if (result.success) {
        showLinkedInLoggedIn();
        showToast('Signed in with LinkedIn.', 'success');
      } else {
        showToast('LinkedIn sign-in failed: ' + result.error, 'error');
      }
    });

    logoutBtn?.addEventListener('click', async () => {
      if (typeof LinkedInAuth !== 'undefined') await LinkedInAuth.logout();
      if (loginBtn) loginBtn.removeAttribute('hidden');
      if (profileSection) profileSection.setAttribute('hidden', '');
      if (exportSection) exportSection.setAttribute('hidden', '');
      showToast('Signed out of LinkedIn.', 'info');
    });

    // LinkedIn ZIP upload
    linkedinUpload?.addEventListener('click', () => linkedinFile?.click());
    linkedinFile?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await handleLinkedinExport(file);
    });

    function showLinkedInLoggedIn() {
      if (loginBtn) loginBtn.setAttribute('hidden', '');
      if (profileSection) profileSection.removeAttribute('hidden');
      if (exportSection) exportSection.removeAttribute('hidden');
    }
  }

  async function handleLinkedinExport(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const serverUrl = getServerUrl();
      const resp = await fetch(serverUrl + '/parse/linkedin', { method: 'POST', body: formData });
      const result = await resp.json();

      if (result.success && result.resume) {
        const existing = await chrome.storage.local.get('resumeStructured');
        if (existing.resumeStructured) {
          if (!confirm('This will replace your current resume data. Continue?')) return;
        }

        await chrome.storage.local.set({ resumeStructured: result.resume, resumeFilename: 'LinkedIn Import' });
        if (typeof ResumeEditor !== 'undefined') ResumeEditor.setData(result.resume);
        const editorTab = document.querySelector('.tab-btn[data-tab="editor"]');
        if (editorTab) editorTab.click();

        if (result.warnings?.length) {
          showToast('Imported with warnings: ' + result.warnings[0], 'warning');
        } else {
          showToast('LinkedIn data imported successfully.', 'success');
        }
      } else {
        showToast(result.error || 'Failed to parse LinkedIn export.', 'error');
      }
    } catch (err) {
      showToast('LinkedIn import failed: ' + err.message, 'error');
    }
  }

  // ── Editor Actions ──
  function setupEditorActions() {
    document.getElementById('editor-generate-latex')?.addEventListener('click', async () => {
      if (typeof ResumeEditor === 'undefined') return;
      const data = ResumeEditor.getData();
      if (!data) {
        showToast('No resume data in editor.', 'error');
        return;
      }

      if (typeof generateLatex === 'undefined') {
        showToast('LaTeX template system not loaded.', 'error');
        return;
      }

      const latex = generateLatex(data);
      await chrome.storage.local.set({ resumeLatex: latex });
      showToast('LaTeX generated from editor data. Ready to tailor!', 'success');
      updateBanner();
    });

    document.getElementById('manual-entry-btn')?.addEventListener('click', () => {
      if (typeof createEmptyResume !== 'undefined' && typeof ResumeEditor !== 'undefined') {
        const emptyResume = createEmptyResume();
        ResumeEditor.setData(emptyResume);
        const editorTab = document.querySelector('.tab-btn[data-tab="editor"]');
        if (editorTab) editorTab.click();
      }
    });

    document.getElementById('editor-import-btn')?.addEventListener('click', () => {
      if (typeof ResumeEditor !== 'undefined' && ResumeEditor.getData()) {
        if (!confirm('Re-importing will replace your current editor data. Continue?')) return;
      }
      const importTab = document.querySelector('.tab-btn[data-tab="import"]');
      if (importTab) importTab.click();
    });
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

    let kbSaveTimer = null;
    if (kbInput) {
      kbInput.addEventListener('input', () => {
        clearTimeout(kbSaveTimer);
        kbSaveTimer = setTimeout(() => { saveSettings(); }, 800);
      });
    }
  }

  function toggleVis(id) {
    const inp = $('#' + id);
    const btn = $('#toggle-' + id);
    if (inp.type === 'password') {
      inp.type = 'text';
      btn.querySelector('.material-icons').textContent = 'visibility_off';
    } else {
      inp.type = 'password';
      btn.querySelector('.material-icons').textContent = 'visibility';
    }
  }

  // ── Settings View Toggle (gear icon now switches to settings tab) ──
  function setupSettingsToggle() {
    const btnSettings = $('#btn-settings');
    if (!btnSettings) return;

    btnSettings.addEventListener('click', () => {
      const settingsTab = document.querySelector('.tab-btn[data-tab="settings"]');
      const importTab = document.querySelector('.tab-btn[data-tab="import"]');
      const currentActive = document.querySelector('.tab-btn.active');

      if (currentActive?.dataset.tab === 'settings') {
        // Go back to import tab
        if (importTab) importTab.click();
        btnSettings.querySelector('.material-icons').textContent = 'settings';
        btnSettings.title = 'Settings';
      } else {
        if (settingsTab) settingsTab.click();
        btnSettings.querySelector('.material-icons').textContent = 'arrow_back';
        btnSettings.title = 'Back';
      }
    });

    // Update gear icon when tabs change
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab === 'settings') {
          btnSettings.querySelector('.material-icons').textContent = 'arrow_back';
          btnSettings.title = 'Back';
        } else {
          btnSettings.querySelector('.material-icons').textContent = 'settings';
          btnSettings.title = 'Settings';
        }
      });
    });

    // Check if opened with a specific view request
    chrome.storage.local.get(['sidePanelView'], (data) => {
      if (data.sidePanelView === 'settings') {
        const settingsTab = document.querySelector('.tab-btn[data-tab="settings"]');
        if (settingsTab) settingsTab.click();
      }
      chrome.storage.local.remove('sidePanelView');
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.sidePanelView?.newValue) {
        const tabName = changes.sidePanelView.newValue === 'settings' ? 'settings' : 'import';
        const tab = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
        if (tab) tab.click();
        chrome.storage.local.remove('sidePanelView');
      }
    });
  }

  // ── System Prompt Section ──
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

    chrome.runtime.sendMessage({ type: 'GET_DEFAULT_PROMPT' }).then(res => {
      _defaultPrompt = res?.prompt || '';
      if (promptArea && !promptArea.value) {
        promptArea.value = _defaultPrompt;
      }
    }).catch(() => { });

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
        body: '**Extension Version:** ' + version + '\n**Browser:** ' + browser + '\n**Model:** ' + model + '\n**Mode:** ' + mode + '\n\n**Describe the bug:**\n\n**Steps to reproduce:**\n1. \n2. \n3. \n\n**Expected behavior:**\n\n**Screenshots (if any):**\n'
      });
      window.open(issueUrl + '?' + params.toString(), '_blank');
    });

    $('#btn-request-feature')?.addEventListener('click', () => {
      const params = new URLSearchParams({
        title: '[Feature Request] ',
        labels: 'enhancement',
        body: '**Extension Version:** ' + version + '\n**Model:** ' + model + '\n\n**Describe the feature:**\n\n**Why would this be useful?**\n\n**Any additional context or mockups:**\n'
      });
      window.open(issueUrl + '?' + params.toString(), '_blank');
    });
  }

  // ── State ──
  async function restoreState() {
    const data = await chrome.storage.local.get([
      'darkMode', 'resumeFilename', 'resumeLatex', 'resumeStructured',
      'selectedModel', 'geminiApiKey', 'claudeApiKey', 'groqApiKey', 'openrouterApiKey',
      'knowledgeBase', 'focusSkills', 'focusExperience', 'focusSummary', 'focusProjects',
      'preserveEducation', 'preserveContact', 'strictMode', 'customInstructions',
      'systemPrompt', 'guardrailRules', 'downloadName', 'onePageResume'
    ]);

    if (data.resumeFilename && fileStatus) {
      fileStatus.innerHTML = '<div class="file-status-item success"><span class="material-icons">check_circle</span><span>' + data.resumeFilename + '</span></div>';
    }

    if (data.selectedModel && modelSelect) {
      let restoredVal = data.selectedModel;
      const idx = restoredVal.indexOf(':');
      const p = restoredVal.substring(0, idx);
      const m = restoredVal.substring(idx + 1);

      if (p === 'openrouter') {
        const isKnown = MODELS.openrouter?.some(mod => mod.id === m);
        if (!isKnown && m !== 'custom') {
          let existingOpt = Array.from(modelSelect.options).find(o => o.value === restoredVal);
          if (!existingOpt) {
            existingOpt = document.createElement('option');
            existingOpt.value = restoredVal;
            existingOpt.textContent = m + ' (Custom)';
            const orGroup = modelSelect.querySelector('optgroup[label="OpenRouter"]');
            if (orGroup) orGroup.insertBefore(existingOpt, orGroup.lastElementChild);
          }
        }
      }

      modelSelect.value = restoredVal;
      updateModelInfo(p, m);
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
      'preserve-contact': data.preserveContact,
      'guard-education': data.preserveEducation,
      'guard-contact': data.preserveContact,
      'guard-one-page': data.onePageResume
    })) {
      const el = $('#' + id);
      if (el && val !== undefined) el.checked = val;
    }

    if (data.customInstructions) $('#custom-instructions').value = data.customInstructions;
    if (data.guardrailRules && $('#guardrail-rules')) $('#guardrail-rules').value = data.guardrailRules;
    if ($('#download-name')) $('#download-name').value = data.downloadName || '';

    if (data.systemPrompt && $('#system-prompt')) $('#system-prompt').value = data.systemPrompt;
  }

  async function saveSettings() {
    const modelVal = modelSelect ? modelSelect.value : 'gemini:gemini-2.5-flash';
    const idx = modelVal.indexOf(':');
    const provider = modelVal.substring(0, idx);
    const modelId = modelVal.substring(idx + 1);

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
      focusSummary: $('#focus-summary')?.checked ?? false,
      focusProjects: $('#focus-projects')?.checked ?? false,
      preserveEducation: $('#preserve-education')?.checked ?? true,
      preserveContact: $('#preserve-contact')?.checked ?? true,
      strictMode: $('#strict-mode')?.checked ?? true,
      onePageResume: $('#guard-one-page')?.checked ?? false,
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
    const data = await chrome.storage.local.get(['resumeLatex', 'resumeStructured', 'geminiApiKey', 'claudeApiKey', 'groqApiKey', 'openrouterApiKey']);
    const hasResume = !!(data.resumeLatex || data.resumeStructured);
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
    t.className = 'toast ' + type;
    t.innerHTML = '<div class="toast-content"><span class="material-icons toast-icon">' + icons[type] + '</span><span class="toast-message">' + msg + '</span></div><button class="toast-close" onclick="this.parentElement.remove()"><span class="material-icons">close</span></button>';
    toastContainer.appendChild(t);
    setTimeout(() => { t.style.animation = 'slideOut 0.3s ease'; setTimeout(() => t.remove(), 300); }, ms);
  }

})();

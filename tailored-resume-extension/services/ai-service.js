/**
 * AI Service v4.0 — Model-Aware Resume Tailoring with Expert Guardrails
 * 
 * Features:
 * - Dynamic model selection across Gemini & Claude
 * - Expert-level recruiter/ATS prompts
 * - Fabrication prevention guardrails
 * - Fallback chain & descriptive error handling
 * - Progress callbacks for UI updates
 * 
 * @class AIService
 */

class AIService {
  constructor() {
    console.log('[AIService] Initializing v4.0');

    const conf = typeof window !== 'undefined' ? window.config : self.config;
    this.currentProvider = conf?.DEFAULT_PROVIDER || 'gemini';
    this.currentModelId = conf?.DEFAULT_GEMINI_MODEL || 'gemini-2.5-flash';

    this.apiKeys = { gemini: null, claude: null };
    this.guardrails = conf?.GUARDRAILS || {};
    this.generation = conf?.GENERATION || {};

    this.userInstructions = {
      customInstructions: '',
      focusAreas: [],
      preserveContent: [],
      restrictChanges: []
    };

    this.guardrailSettings = {
      strictMode: true,
      preserveEducation: true,
      preserveContact: true
    };

    // Rate limiting
    this._lastGenerateTime = 0;
    this._isGenerating = false;

    // Progress callback
    this._onProgress = null;

    this.loadSettings();
  }

  // ============================================
  // SETTINGS
  // ============================================

  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get([
        'geminiApiKey', 'claudeApiKey',
        'selectedProvider', 'selectedModelId',
        'systemPrompt', 'guardrailRules',
        'strictMode', 'preserveEducation', 'preserveContact'
      ]);

      this.apiKeys.gemini = settings.geminiApiKey || '';
      this.apiKeys.claude = settings.claudeApiKey || '';
      this.currentProvider = settings.selectedProvider || this.currentProvider;
      this.currentModelId = settings.selectedModelId || this.currentModelId;

      if (settings.systemPrompt) {
        this._customPrompt = settings.systemPrompt;
      } else {
        this._customPrompt = null;
      }

      this._guardrailRules = settings.guardrailRules || '';

      this.guardrailSettings = {
        strictMode: settings.strictMode !== false,
        preserveEducation: settings.preserveEducation !== false,
        preserveContact: settings.preserveContact !== false
      };

      console.log('[AIService] Settings loaded', {
        provider: this.currentProvider,
        model: this.currentModelId,
        hasGeminiKey: !!this.apiKeys.gemini,
        hasClaudeKey: !!this.apiKeys.claude
      });
    } catch (error) {
      console.error('[AIService] Settings load error:', error);
    }
  }

  setModel(provider, modelId) {
    this.currentProvider = provider;
    this.currentModelId = modelId;
    console.log('[AIService] Model set:', provider, modelId);
  }

  setUserInstructions(instructions) {
    this.userInstructions = { ...this.userInstructions, ...instructions };
  }

  onProgress(callback) {
    this._onProgress = callback;
  }

  _emitProgress(stage, message) {
    if (this._onProgress) this._onProgress(stage, message);
    console.log(`[AIService] ${stage}: ${message}`);
  }

  // ============================================
  // MAIN GENERATION
  // ============================================

  async generateTailoredResume(originalLatex, jobDesc, knowledgeBase = '') {
    // Rate limit check
    const now = Date.now();
    const cooldown = this.generation.cooldownMs || 3000;
    if (this._isGenerating) {
      throw new Error('Generation already in progress. Please wait.');
    }
    if (now - this._lastGenerateTime < cooldown) {
      throw new Error(`Please wait ${Math.ceil((cooldown - (now - this._lastGenerateTime)) / 1000)}s before generating again.`);
    }

    this._isGenerating = true;
    this._lastGenerateTime = now;

    try {
      // Step 1: Validate inputs
      this._emitProgress('validate', 'Validating inputs...');
      this._validateInputs(originalLatex, jobDesc);

      // Step 2: Build content inventory
      this._emitProgress('inventory', 'Analyzing resume content...');
      const contentInventory = this._buildContentInventory(originalLatex, knowledgeBase);

      // Step 3: Build expert prompt
      this._emitProgress('prompt', 'Building optimization strategy...');
      const prompt = this._buildExpertPrompt(originalLatex, jobDesc, knowledgeBase, contentInventory);

      // Step 4: Call AI with fallback
      this._emitProgress('generate', `Generating with ${this._getModelName()}...`);
      let result = await this._callWithFallback(prompt);

      // Step 5: Clean response
      this._emitProgress('clean', 'Cleaning output...');
      result = this._cleanLatexResponse(result);

      // Step 6: Validate output
      this._emitProgress('validate', 'Validating against guardrails...');
      const validation = this._validateOutput(originalLatex, result, contentInventory);

      if (!validation.valid) {
        console.warn('[AIService] Validation issues:', validation.errors);
        if (validation.canRetry) {
          this._emitProgress('retry', 'Fixing validation issues...');
          result = await this._attemptCorrection(originalLatex, result, validation.errors, jobDesc);
          result = this._cleanLatexResponse(result);
        } else {
          throw new Error(`Content validation failed: ${validation.errors.join('; ')}`);
        }
      }

      this._emitProgress('done', 'Resume tailored successfully!');
      return result;

    } catch (error) {
      this._emitProgress('error', error.message);
      throw this._friendlyError(error);
    } finally {
      this._isGenerating = false;
    }
  }

  _validateInputs(latex, jobDesc) {
    if (!latex || !latex.includes('\\documentclass')) {
      throw new Error('Please upload a valid LaTeX resume first.');
    }
    if (!jobDesc || jobDesc.trim().length < 20) {
      throw new Error('Please provide a job description (at least 20 characters).');
    }
    if (!this.apiKeys[this.currentProvider]) {
      const providerName = this.currentProvider === 'gemini' ? 'Gemini' : 'Claude';
      throw new Error(`No ${providerName} API key configured. Go to Settings → API Keys.`);
    }
  }

  // ============================================
  // EXPERT PROMPT (Recruiter + ATS + HM perspective)
  // ============================================

  _buildExpertPrompt(originalLatex, jobDesc, knowledgeBase, inventory) {
    const systemPrompt = this._customPrompt || this._getExpertSystemPrompt();
    const guardrailsBlock = this._getGuardrailsPrompt(inventory);
    const userBlock = this._formatUserInstructions();

    return `${systemPrompt}

${guardrailsBlock}

${userBlock}

---
## ORIGINAL RESUME (LaTeX):
\`\`\`latex
${originalLatex}
\`\`\`

---
## TARGET JOB DESCRIPTION:
${jobDesc}

---
## KNOWLEDGE BASE (Additional projects/experience — draw from here):
${knowledgeBase || 'None provided. Use ONLY content from the original resume.'}

---
## EXECUTE:
Apply your expert optimization now. Follow all guardrails strictly.
OUTPUT ONLY THE COMPLETE LATEX CODE. NO EXPLANATIONS. NO MARKDOWN FENCES.`;
  }

  _getExpertSystemPrompt() {
    return `You are a SENIOR TECHNICAL RECRUITER with 15+ years at Fortune 500 companies. You have personally reviewed 50,000+ resumes and know exactly what makes a resume pass ATS screens and catch a hiring manager's eye in the critical 6-second scan.

You are also an ATS (Applicant Tracking System) ENGINEER who understands keyword matching algorithms, section parsing, and scoring systems used by Greenhouse, Lever, Workday, Taleo, and iCIMS.

## YOUR OPTIMIZATION STRATEGY:

### 1. THE 6-SECOND SCAN RULE
A recruiter spends 6 seconds on initial scan. The TOP THIRD of the resume (name, summary, top skills, most recent role) must immediately signal "this person matches."
- Front-load the most relevant keywords from the JD
- Ensure the Skills section mirrors the JD's technology stack
- Most recent experience bullet points should echo the JD's requirements

### 2. ATS KEYWORD STRATEGY
- Use EXACT phrases from the job description — ATS does literal string matching
- Mirror the JD's terminology (if JD says "CI/CD pipelines," don't write "continuous integration")
- Include acronyms AND spelled-out forms (e.g., "Machine Learning (ML)")
- Place critical keywords in Skills section AND in experience bullet points (double-match)

### 3. ACHIEVEMENT FORMAT — STAR/XYZ
Every bullet point MUST follow: "Accomplished [X] as measured by [Y] by doing [Z]"
- GOOD: "Reduced API latency by 40% (from 800ms to 480ms) by implementing Redis caching layer"
- GOOD: "Increased user retention by 25% by redesigning onboarding flow using React and A/B testing"
- BAD: "Worked on API performance improvements" (no metric, no method)
- BAD: "Responsible for caching" (passive, no achievement)

### 4. PROJECT REPLACEMENT LOGIC
When knowledge base provides relevant projects:
- Calculate technology overlap with JD (threshold: 60%+)
- Replace the LEAST relevant resume project with the MOST relevant KB project
- Preserve the SAME LaTeX structure (\\resumeProjectHeading, \\resumeItem, etc)
- Include specific metrics from the KB project

### 5. SKILLS SECTION OPTIMIZATION
- Lead each category with JD-required skills
- Add skills from KB that match JD requirements
- Remove skills irrelevant to this specific role (they add noise)
- Keep total skill count reasonable (not a wall of text)

### 6. SECTION-SPECIFIC RULES
- **Summary/Objective**: Rewrite to mirror the JD's opening paragraph. Use their exact role title.
- **Experience**: Maximize keyword density in the 3 most recent roles. Use strong action verbs.
- **Projects**: Swap for KB projects with higher JD relevance. Keep same count.
- **Skills**: Mirror JD's tech stack. Lead with their top requirements.
- **Education**: ${this.guardrailSettings.preserveEducation ? 'DO NOT MODIFY — protected section.' : 'May add relevant coursework.'}
- **Contact**: ${this.guardrailSettings.preserveContact ? 'DO NOT MODIFY — protected section.' : 'Keep unchanged.'}

### 7. WHAT NEVER TO DO
- NEVER invent companies, roles, dates, or metrics not in the sources
- NEVER add technologies the candidate hasn't used (per resume + KB)
- NEVER change formatting structure or LaTeX packages
- NEVER remove sections entirely
- NEVER add fluff or generic phrases ("passionate team player," "detail-oriented")
- NEVER exceed ±20% of original resume length`;
  }

  _getGuardrailsPrompt(inventory) {
    const allowedTech = Array.from(inventory.technologies).slice(0, 40).join(', ');
    const allowedSkills = Array.from(inventory.skills).slice(0, 40).join(', ');
    const strict = this.guardrailSettings.strictMode;

    return `## GUARDRAILS — VIOLATION = REJECTION

### CONTENT SOURCE RESTRICTION ${strict ? '(STRICT MODE ON)' : ''}
${strict
        ? 'You may ONLY use content verbatim from the original resume or knowledge base. No paraphrasing beyond keyword insertion.'
        : 'Content must originate from the resume or knowledge base. Rewording for keyword alignment is allowed.'}

### VERIFIED TECHNOLOGIES (from sources):
${allowedTech || 'Use only what appears in the original resume'}

### VERIFIED SKILLS (from sources):
${allowedSkills || 'Use only what appears in the original resume'}

### LATEX INTEGRITY
- Preserve ALL \\documentclass, \\usepackage, page setup commands
- Keep ALL \\begin{document} ... \\end{document} structure
- Maintain exact same section ordering
- Do NOT add new LaTeX packages
- Keep date formats exactly as-is

### LENGTH: Output must be within ±20% of original length
### PROTECTED: ${this.guardrails.PROTECTED_SECTIONS?.join(', ') || 'education, contact, name'}
${this._guardrailRules ? `\n### USER HARD RULES (MUST FOLLOW — these override other guidance):\n${this._guardrailRules.split('\n').filter(l => l.trim()).map(l => `- ${l.trim()}`).join('\n')}` : ''}`;
  }

  _formatUserInstructions() {
    const { customInstructions, focusAreas, preserveContent, restrictChanges } = this.userInstructions;

    let block = '## USER INSTRUCTIONS:\n';

    if (customInstructions) block += `\n### Custom Directions:\n${customInstructions}\n`;
    if (focusAreas.length > 0) block += `\n### Prioritize These Sections:\n- ${focusAreas.join('\n- ')}\n`;
    if (preserveContent.length > 0) block += `\n### DO NOT CHANGE:\n- ${preserveContent.join('\n- ')}\n`;
    if (restrictChanges.length > 0) block += `\n### MINIMIZE CHANGES TO:\n- ${restrictChanges.join('\n- ')}\n`;

    if (!customInstructions && focusAreas.length === 0 && preserveContent.length === 0) {
      block += 'No specific instructions. Apply default expert optimization.\n';
    }

    return block;
  }

  // ============================================
  // CONTENT INVENTORY
  // ============================================

  _buildContentInventory(originalLatex, knowledgeBase) {
    const inventory = {
      skills: new Set(),
      technologies: new Set(),
      metrics: new Set(),
      companies: new Set(),
      projects: new Set(),
    };

    // Extract bold items (skills/keywords)
    const boldMatches = originalLatex.match(/\\textbf\{([^}]+)\}/g) || [];
    boldMatches.forEach(m => {
      const skill = m.replace(/\\textbf\{|\}/g, '').trim();
      if (skill.length > 1 && skill.length < 50) inventory.skills.add(skill.toLowerCase());
    });

    // Extract technologies
    const techPattern = /\b(Python|JavaScript|TypeScript|React|Next\.js|Node\.js|Express|Vue|Angular|Svelte|AWS|GCP|Azure|Docker|Kubernetes|Terraform|SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|GraphQL|REST|gRPC|Machine Learning|Deep Learning|NLP|Computer Vision|AI|TensorFlow|PyTorch|Scikit-learn|Go|Golang|Rust|Java|C\+\+|C#|Ruby|PHP|Swift|Kotlin|Scala|R|MATLAB|HTML|CSS|SASS|Tailwind|Bootstrap|Git|CI\/CD|Jenkins|GitHub Actions|Linux|Nginx|Apache|Kafka|RabbitMQ|Spring Boot|Django|Flask|FastAPI|Rails|\.NET|Unity|Figma|Tableau|Power BI|Spark|Hadoop|Snowflake|Databricks|Pandas|NumPy|OpenCV)\b/gi;

    const allText = originalLatex + '\n' + (knowledgeBase || '');
    const techMatches = allText.match(techPattern) || [];
    techMatches.forEach(t => inventory.technologies.add(t.toLowerCase()));

    // Extract metrics
    const metricMatches = originalLatex.match(/\d[\d,]*\s*(%|percent|users|customers|revenue|increase|decrease|improvement|reduction|savings|transactions|requests|latency|uptime)/gi) || [];
    metricMatches.forEach(m => inventory.metrics.add(m.toLowerCase()));

    // Extract from knowledge base
    if (knowledgeBase) {
      const kbTech = knowledgeBase.match(techPattern) || [];
      kbTech.forEach(t => inventory.technologies.add(t.toLowerCase()));

      const kbBold = knowledgeBase.match(/\*\*([^*]+)\*\*/g) || [];
      kbBold.forEach(m => {
        const skill = m.replace(/\*\*/g, '').trim();
        if (skill.length > 1 && skill.length < 50) inventory.skills.add(skill.toLowerCase());
      });
    }

    console.log('[AIService] Content inventory:', {
      skills: inventory.skills.size,
      technologies: inventory.technologies.size,
      metrics: inventory.metrics.size
    });

    return inventory;
  }

  // ============================================
  // AI CALLS WITH FALLBACK
  // ============================================

  async _callWithFallback(prompt) {
    try {
      return await this._callAI(prompt, this.currentProvider, this.currentModelId);
    } catch (primaryError) {
      console.warn('[AIService] Primary model failed:', primaryError.message);

      // Try recommended fallback
      const conf = typeof window !== 'undefined' ? window.config : self.config;
      const fallbackModel = conf?.getRecommended(this.currentProvider);
      if (fallbackModel && fallbackModel.id !== this.currentModelId) {
        this._emitProgress('fallback', `${this._getModelName()} failed. Trying ${fallbackModel.name}...`);
        try {
          return await this._callAI(prompt, this.currentProvider, fallbackModel.id);
        } catch (fallbackError) {
          throw new Error(`Both ${this._getModelName()} and ${fallbackModel.name} failed. ${fallbackError.message}`);
        }
      }

      throw primaryError;
    }
  }

  async _callAI(prompt, provider, modelId) {
    if (provider === 'claude') {
      return await this._callClaude(prompt, modelId);
    }
    return await this._callGemini(prompt, modelId);
  }

  async _callGemini(prompt, modelId) {
    const apiKey = this.apiKeys.gemini;
    if (!apiKey) throw new Error('Gemini API key not configured. Add it in Settings → API Keys.');

    const conf = typeof window !== 'undefined' ? window.config : self.config;
    const url = conf?.geminiUrl(modelId) ||
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

    const response = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.generation.temperature || 0.3,
          maxOutputTokens: this.generation.maxOutputTokens || 8192
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${response.status}`;
      if (response.status === 429) throw new Error(`Rate limited by Gemini. Please wait and try again.`);
      if (response.status === 401 || response.status === 403) throw new Error(`Invalid Gemini API key. Check Settings.`);
      throw new Error(`Gemini API error: ${msg}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini. Try a different model.');
    return text;
  }

  async _callClaude(prompt, modelId) {
    const apiKey = this.apiKeys.claude;
    if (!apiKey) throw new Error('Claude API key not configured. Add it in Settings → API Keys.');

    const conf = typeof window !== 'undefined' ? window.config : self.config;
    const endpoint = conf?.CLAUDE_ENDPOINT || 'https://api.anthropic.com/v1/messages';
    const version = conf?.ANTHROPIC_VERSION || '2023-06-01';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': version,
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: this.generation.maxOutputTokens || 8192,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${response.status}`;
      if (response.status === 429) throw new Error(`Rate limited by Claude. Please wait and try again.`);
      if (response.status === 401) throw new Error(`Invalid Claude API key. Check Settings.`);
      throw new Error(`Claude API error: ${msg}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  // ============================================
  // VALIDATION
  // ============================================

  _validateOutput(original, generated, inventory) {
    const errors = [];
    let canRetry = true;

    // 1. LaTeX structure
    const requiredPatterns = [/\\documentclass/, /\\begin\{document\}/, /\\end\{document\}/];
    for (const pattern of requiredPatterns) {
      if (!pattern.test(generated)) {
        errors.push('LaTeX structure corrupted (missing \\documentclass or document environment)');
        canRetry = false;
        break;
      }
    }

    // 2. Length deviation
    const deviation = Math.abs(generated.length - original.length) / original.length;
    if (deviation > (this.guardrails.MAX_LENGTH_DEVIATION || 0.20)) {
      errors.push(`Length deviation ${(deviation * 100).toFixed(0)}% exceeds ±20% limit`);
    }

    // 3. Fabrication detection
    const fabricationPatterns = [
      /\b(XYZ Company|ABC Corp|Sample Inc|Example LLC|Acme)\b/i,
      /\b(Lorem ipsum|placeholder|TODO|FIXME|INSERT)\b/i,
      /\b(\d{3,})\+?\s*(years? of experience)/i,
    ];
    for (const pattern of fabricationPatterns) {
      if (pattern.test(generated) && !pattern.test(original)) {
        errors.push('Possible fabricated content detected');
        break;
      }
    }

    // 4. Protected sections
    if (this.guardrailSettings.preserveEducation) {
      const eduPat = /\\section\{Education\}[\s\S]*?(?=\\section|\\end\{document\})/i;
      const origEdu = original.match(eduPat)?.[0];
      const genEdu = generated.match(eduPat)?.[0];
      if (origEdu && genEdu && this._similarity(origEdu, genEdu) < 0.7) {
        errors.push('Education section modified beyond limits');
      }
    }

    return { valid: errors.length === 0, errors, canRetry: canRetry && errors.length <= 2 };
  }

  _similarity(a, b) {
    const w1 = new Set(a.toLowerCase().split(/\s+/));
    const w2 = new Set(b.toLowerCase().split(/\s+/));
    const inter = new Set([...w1].filter(x => w2.has(x)));
    const union = new Set([...w1, ...w2]);
    return inter.size / union.size;
  }

  async _attemptCorrection(original, failed, errors, jobDesc) {
    const prompt = `The resume tailoring output had these issues:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Fix these issues. Keep all valid optimizations. Ensure LaTeX compiles. Do NOT fabricate.

ORIGINAL: \`\`\`latex\n${original}\n\`\`\`

FAILED OUTPUT: \`\`\`latex\n${failed}\n\`\`\`

OUTPUT ONLY THE CORRECTED LATEX CODE:`;

    return await this._callWithFallback(prompt);
  }

  // ============================================
  // UTILITIES
  // ============================================

  _cleanLatexResponse(text) {
    if (!text) return '';
    let cleaned = text
      .replace(/```latex\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[\s\S]*?(\\documentclass)/m, '$1')
      .replace(/\\end\{document\}[\s\S]*$/m, '\\end{document}')
      .trim();

    // Fix brace imbalance ("Too many }'s" / "Missing }" errors from pdflatex)
    let depth = 0;
    for (const ch of cleaned) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth > 0) {
      // More { than } — append missing closing braces before \end{document}
      const closers = '}'.repeat(depth);
      cleaned = cleaned.replace(/\\end\{document\}/, closers + '\n\\end{document}');
      console.warn(`[AIService] Fixed ${depth} unclosed brace(s)`);
    } else if (depth < 0) {
      // More } than { — remove excess trailing } before \end{document}
      let excess = Math.abs(depth);
      // Work backwards from \end{document} removing stray }
      const endIdx = cleaned.lastIndexOf('\\end{document}');
      if (endIdx > 0) {
        let before = cleaned.substring(0, endIdx);
        while (excess > 0) {
          const lastBrace = before.lastIndexOf('}');
          if (lastBrace === -1) break;
          // Check it's not part of a command like \end{...}
          const preceding = before.substring(Math.max(0, lastBrace - 20), lastBrace);
          if (/\\(?:end|begin|textbf|textit|section|subsection|href|url)\{[^}]*$/.test(preceding)) {
            break; // Don't remove command braces
          }
          before = before.substring(0, lastBrace) + before.substring(lastBrace + 1);
          excess--;
        }
        cleaned = before + cleaned.substring(endIdx);
        console.warn(`[AIService] Removed ${Math.abs(depth) - excess} excess closing brace(s)`);
      }
    }

    return cleaned;
  }

  _getModelName() {
    const conf = typeof window !== 'undefined' ? window.config : self.config;
    const model = conf?.getModel(this.currentProvider, this.currentModelId);
    return model?.name || this.currentModelId;
  }

  _friendlyError(error) {
    const msg = error.message || 'Unknown error';

    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return new Error('Network error. Check your internet connection and try again.');
    }
    if (msg.includes('API key')) {
      return new Error(msg);
    }
    if (msg.includes('Rate limit') || msg.includes('429')) {
      return new Error('Rate limited. Please wait a moment and try again.');
    }
    if (msg.includes('validation failed')) {
      return new Error(`${msg}. Try with a different model or simpler input.`);
    }

    return new Error(msg);
  }

  /** Get the default system prompt text */
  static getDefaultPrompt() {
    // Create a temporary instance to get the prompt
    const temp = Object.create(AIService.prototype);
    temp.guardrailSettings = { strictMode: true, preserveEducation: true, preserveContact: true };
    return temp._getExpertSystemPrompt();
  }

  /** Get current status for UI */
  getStatus() {
    return {
      provider: this.currentProvider,
      modelId: this.currentModelId,
      modelName: this._getModelName(),
      hasApiKey: !!this.apiKeys[this.currentProvider],
      isGenerating: this._isGenerating,
    };
  }
}

// Register globally
if (typeof window !== 'undefined') window.AIService = AIService;
if (typeof self !== 'undefined') self.AIService = AIService;
console.log('[AIService] v4.0 registered');

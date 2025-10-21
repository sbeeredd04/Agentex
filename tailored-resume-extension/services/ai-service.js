/**
 * Gemini AI Service for Resume Tailoring
 * 
 * This service handles all interactions with Google's Gemini AI API for
 * resume analysis and tailoring. It supports both single-pass and multi-agent
 * processing modes for optimizing resumes to match job descriptions.
 * 
 * @class AIService
 * @module services/ai-service
 */

class AIService {
  /**
   * Initialize the AI Service
   * Sets up Gemini API configuration and loads user settings
   */
  constructor() {
    console.log('[AIService] Initializing Gemini AI Service');
    
    // Initialize Gemini endpoint
    this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    // Initialize model configuration
    this.model = {
      name: 'gemini-2.0-flash',
      apiKey: null
    };

    // Initialize prompts with defaults
    this.prompts = {
      custom: this._getDefaultLatexPrompt(),
      jobAnalysis: this._getDefaultJobAnalysisPrompt(),
      projectsOptimization: this._getDefaultProjectsPrompt(),
      skillsEnhancement: this._getDefaultSkillsPrompt(),
      experienceRefinement: this._getDefaultExperiencePrompt(),
      finalPolish: this._getDefaultFinalPolishPrompt()
    };

    // Load settings from Chrome storage
    this.loadSettings();
  }

  /**
   * Load API keys and custom prompts from Chrome storage
   * @returns {Promise<void>}
   */
  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get([
        'geminiApiKey',
        'customPrompt',
        'jobAnalysisPrompt',
        'projectsOptimizationPrompt',
        'skillsEnhancementPrompt',
        'experienceRefinementPrompt',
        'finalPolishPrompt'
      ]);

      // Load API key
      this.model.apiKey = settings.geminiApiKey || window.config?.GEMINI_API_KEY;

      // Load custom prompts if available
      if (settings.customPrompt) this.prompts.custom = settings.customPrompt;
      if (settings.jobAnalysisPrompt) this.prompts.jobAnalysis = settings.jobAnalysisPrompt;
      if (settings.projectsOptimizationPrompt) this.prompts.projectsOptimization = settings.projectsOptimizationPrompt;
      if (settings.skillsEnhancementPrompt) this.prompts.skillsEnhancement = settings.skillsEnhancementPrompt;
      if (settings.experienceRefinementPrompt) this.prompts.experienceRefinement = settings.experienceRefinementPrompt;
      if (settings.finalPolishPrompt) this.prompts.finalPolish = settings.finalPolishPrompt;

      console.log('[AIService] Settings loaded successfully', {
        hasApiKey: !!this.model.apiKey,
        model: this.model.name
      });
    } catch (error) {
      console.error('[AIService] Error loading settings:', error);
    }
  }

  /**
   * Generate content using Gemini AI
   * @param {string} prompt - The prompt to send to Gemini
   * @returns {Promise<string>} Generated LaTeX content
   */
  async generateContent(prompt) {
    try {
      console.log('[AIService] Generating LaTeX content:', {
        promptLength: prompt.length,
        model: this.model.name
      });

      const response = await this._callGeminiAPI(prompt);
      return this._cleanLatexResponse(response);

    } catch (error) {
      console.error('[AIService] LaTeX generation error:', error);
      throw new Error(`Failed to generate LaTeX content: ${error.message}`);
    }
  }

  /**
   * Generate tailored resume using single-pass approach
   * @param {string} originalLatex - Original LaTeX resume code
   * @param {string} jobDesc - Job description
   * @param {string} knowledgeBase - Additional projects/experience
   * @returns {Promise<string>} Tailored LaTeX resume
   */
  async generateTailoredResume(originalLatex, jobDesc, knowledgeBase = '') {
    try {
      console.log('[AIService] Starting single-pass generation');

      const prompt = this.prompts.custom
        .replace('{originalLatex}', originalLatex)
        .replace('{jobDesc}', jobDesc)
        .replace('{knowledgeBase}', knowledgeBase || 'None provided');

      return await this.generateContent(prompt, 'latex');
    } catch (error) {
      console.error('[AIService] Tailored resume generation error:', error);
      throw error;
    }
  }

  /**
   * Generate tailored resume using multi-agent approach
   * @param {string} originalLatex - Original LaTeX resume code
   * @param {string} jobDesc - Job description
   * @param {string} knowledgeBase - Additional projects/experience
   * @returns {Promise<string>} Tailored LaTeX resume
   */
  async generateTailoredResumeMultiAgent(originalLatex, jobDesc, knowledgeBase = '') {
    try {
      console.log('[AIService] Starting multi-agent generation');

      const dispatchStatus = (step, message) => {
        document.dispatchEvent(new CustomEvent('aiServiceStatus', {
          detail: { step, totalSteps: 5, message }
        }));
      };

      // Step 1: Job Analysis
      dispatchStatus(1, 'Analyzing job description and knowledge base');
      
      const jobAnalysisPrompt = this.prompts.jobAnalysis
        .replace('{jobDesc}', jobDesc)
        .replace('{knowledgeBase}', knowledgeBase || 'None provided');
      
      const analysisResponse = await this._callGeminiAPI(jobAnalysisPrompt);
      
      // Parse the analysis JSON
      let analysis;
      try {
        const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        
        if (!analysis) {
          throw new Error('Failed to parse analysis response');
        }
      } catch (error) {
        console.warn('[AIService] Analysis parsing failed, falling back to single-pass:', error);
        return await this.generateTailoredResume(originalLatex, jobDesc, knowledgeBase);
      }
      
      // Extract sections from original resume
      const originalProjects = this._extractSection(originalLatex, 'Projects');
      const originalSkills = this._extractSection(originalLatex, 'Skills');
      const originalExperience = this._extractSection(originalLatex, 'Experience');
      
      // Step 2: Projects Optimization
      dispatchStatus(2, 'Optimizing projects section');
      
      const projectsPrompt = this.prompts.projectsOptimization
        .replace('{originalProjects}', originalProjects)
        .replace('{jobDesc}', jobDesc)
        .replace('{analysisProjects}', JSON.stringify(analysis.relevantProjects || [], null, 2))
        .replace('{requiredTechnologies}', (analysis.requiredTechnologies || []).join(', '))
        .replace('{keyMetrics}', (analysis.keyMetrics || []).join(', '));
      
      const optimizedProjects = await this._callGeminiAPI(projectsPrompt);
      
      // Step 3: Skills Enhancement
      dispatchStatus(3, 'Enhancing skills section');
      
      const skillsPrompt = this.prompts.skillsEnhancement
        .replace('{originalSkills}', originalSkills)
        .replace('{jobDesc}', jobDesc)
        .replace('{requiredTechnologies}', (analysis.requiredTechnologies || []).join(', '));
      
      const enhancedSkills = await this._callGeminiAPI(skillsPrompt);
      
      // Step 4: Experience Refinement
      dispatchStatus(4, 'Refining experience section');
      
      const experiencePrompt = this.prompts.experienceRefinement
        .replace('{originalExperience}', originalExperience)
        .replace('{jobDesc}', jobDesc)
        .replace('{experienceRequirements}', (analysis.experienceRequirements || []).join(', '))
        .replace('{requiredTechnologies}', (analysis.requiredTechnologies || []).join(', '))
        .replace('{keyMetrics}', (analysis.keyMetrics || []).join(', '));
      
      const refinedExperience = await this._callGeminiAPI(experiencePrompt);
      
      // Step 5: Final Polish
      dispatchStatus(5, 'Polishing final resume');
      
      const finalPrompt = this.prompts.finalPolish
        .replace('{originalLatex}', originalLatex)
        .replace('{optimizedProjects}', optimizedProjects)
        .replace('{enhancedSkills}', enhancedSkills)
        .replace('{refinedExperience}', refinedExperience)
        .replace('{jobDesc}', jobDesc);
      
      const finalResponse = await this._callGeminiAPI(finalPrompt);
      
      return this._cleanLatexResponse(finalResponse);
    } catch (error) {
      console.error('[AIService] Multi-agent generation error:', error);
      // Fall back to single-pass on error
      return await this.generateTailoredResume(originalLatex, jobDesc, knowledgeBase);
    }
  }

  /**
   * Call Gemini API with the provided prompt
   * @private
   * @param {string} prompt - The prompt to send
   * @returns {Promise<string>} API response text
   */
  async _callGeminiAPI(prompt) {
    console.log('[AIService] Calling Gemini API:', {
      promptPreview: prompt.substring(0, 100) + '...',
      promptLength: prompt.length
    });

    if (!this.model.apiKey) {
      throw new Error('Gemini API key not configured. Please add your API key in Settings.');
    }

    try {
      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }]
      };

      const response = await fetch(`${this.endpoint}?key=${this.model.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();
      
      console.log('[AIService] Gemini API Response:', {
        status: response.status,
        hasContent: !!responseData.candidates?.[0]?.content
      });

      if (!response.ok) {
        const errorMessage = responseData.error?.message || response.statusText;
        throw new Error(`Gemini API Error: ${errorMessage}`);
      }

      if (!responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('[AIService] Invalid response structure:', responseData);
        throw new Error('Invalid response from Gemini API');
      }

      const generatedContent = responseData.candidates[0].content.parts[0].text;
      
      console.log('[AIService] Generation successful:', {
        contentLength: generatedContent.length
      });

      return generatedContent;
    } catch (error) {
      console.error('[AIService] Gemini API call failed:', error);
      throw error;
    }
  }

  /**
   * Clean LaTeX response by removing markdown code blocks and extra formatting
   * @private
   * @param {string} text - Raw response text
   * @returns {string} Cleaned LaTeX code
   */
  _cleanLatexResponse(text) {
    console.log('[AIService] Cleaning LaTeX response');

    return text
      .replace(/```latex\n/g, '')
      .replace(/```\n?/g, '')
      .replace(/\\boxed{/g, '')
      .replace(/\{\\displaystyle\s+/g, '')
      .trim();
  }

  /**
   * Extract a specific section from LaTeX resume
   * @private
   * @param {string} latex - Complete LaTeX resume
   * @param {string} sectionName - Name of section to extract
   * @returns {string} Extracted section content
   */
  _extractSection(latex, sectionName) {
    try {
      // Look for section using LaTeX section markers
      const sectionRegex = new RegExp(
        `\\\\section\\{${sectionName}\\}([\\s\\S]*?)(?=\\\\section\\{|$)`,
        'i'
      );
      const match = latex.match(sectionRegex);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      
      // Return placeholder if section not found
      console.warn(`[AIService] Section "${sectionName}" not found, using placeholder`);
      return this._getPlaceholderSection(sectionName);
    } catch (error) {
      console.error(`[AIService] Error extracting ${sectionName} section:`, error);
      return this._getPlaceholderSection(sectionName);
    }
  }

  /**
   * Get placeholder content for missing sections
   * @private
   * @param {string} sectionName - Name of section
   * @returns {string} Placeholder LaTeX content
   */
  _getPlaceholderSection(sectionName) {
    const placeholders = {
      'Projects': `\\section{Projects}
\\resumeSubHeadingListStart
\\resumeProjectHeading
{\\textbf{Project Name} $|$ \\emph{Technologies}}{}
\\resumeItemListStart
\\resumeItem{\\textbf{Description} of the project.}
\\resumeItemListEnd
\\resumeSubHeadingListEnd`,
      'Skills': `\\section{Skills}
\\resumeItemListStart
\\resumeItem{\\textbf{Programming Languages:} Language1, Language2}
\\resumeItem{\\textbf{Frameworks:} Framework1, Framework2}
\\resumeItem{\\textbf{Tools:} Tool1, Tool2}
\\resumeItemListEnd`,
      'Experience': `\\section{Experience}
\\resumeSubHeadingListStart
\\resumeSubheading{Company Name}{Date Range}
{Job Title}{Location}
\\resumeItemListStart
\\resumeItem{Description of role and achievements}
\\resumeItemListEnd
\\resumeSubHeadingListEnd`
    };

    return placeholders[sectionName] || `\\section{${sectionName}}`;
  }

  // ========== Default Prompt Getters ==========

  /**
   * Get default LaTeX tailoring prompt
   * @private
   */
  _getDefaultLatexPrompt() {
    return `You are an expert ATS resume tailor for software engineering roles. Your mission is to optimize the resume to pass automated screening and secure interviews by:

## Primary Objectives
1. **Precision Alignment**: Rigorously match JD requirements using keywords/metrics from both resume and knowledge base
2. **Strategic Project Replacement**: CRITICAL - Replace existing projects with more relevant ones from the knowledge base when they:
  - Use the same or similar technology stack as mentioned in the JD
  - Demonstrate stronger metrics or achievements
  - Better align with the job responsibilities
3. **Content Preservation**: Maintain original resume structure/length while maximizing JD keyword density

## Project Replacement Protocol
1. First, analyze the job description to identify:
   - Required technologies and frameworks
   - Key responsibilities and achievements
   - Industry-specific requirements

2. Then, evaluate each project in the knowledge base:
   - Calculate relevance score based on technology alignment
   - Compare metrics and achievements with job requirements
   - Assess how well it demonstrates required skills

3. Replace existing projects when:
   - Knowledge base project has ≥70% technology overlap with JD
   - Knowledge base project demonstrates stronger metrics
   - Knowledge base project better aligns with the job responsibilities

## Execution Protocol
### Content Evaluation
1. Analyze JD for:
  - Required technologies (explicit and implied)
  - Personality cues (e.g., "proactive" → "self-initiated")
  - Performance metrics priorities

2. For each resume section:
  - Calculate relevance score to JD (keywords + metrics)
  - Compare with knowledge base equivalents
  - Replace ONLY if knowledge base item has:
    * ≥1.5x higher relevance score
    * Matching verb tense/context
    * Comparable character length (±15%)

### Optimization Rules
- **Tech Stack Adaptation** (Allowed):
  Example:
  React ↔ Next.js 
  Python ↔ FastAPI
  AWS ↔ GCP (if cloud mentioned)

- **Forbidden Adaptations**:
  Example:
  Frontend → Backend stacks

### XYZ Format Implementation
\\resumeItem{\\textbf{<JD Keyword>} used to \\textbf{<Action Verb>} \\emph{<Tech>} achieving \\textbf{<Metric>} via <Method>}

### Formatting Constraints
1. Preserve original:
  - Section order
  - Date ranges
  - Bullet count
  - Margin/padding
2. Modify ONLY text within \\resumeItem{} blocks
3. Strict 1-page enforcement

## CRITICAL PROJECT REPLACEMENT RULES
‼️ ALWAYS REPLACE existing projects with knowledge base projects that:
- Use the same or similar technology stack as mentioned in the JD
- Demonstrate stronger metrics or achievements
- Better align with the job responsibilities

‼️ NEVER:
- Invent unverified experiences
- Change section hierarchy
- Exceed original item length by >20%
- Remove JD-matched content

!! ALWAYS GIVE THE ENTIRE UPDATED LATEX CODE NOTHING ELSE ONLY THE LATEX CODE!!

Original Resume:
{originalLatex}

Job Description:
{jobDesc}

Knowledge Base / Additional Experience:
{knowledgeBase}`;
  }

  /**
   * Get default job analysis prompt
   * @private
   */
  _getDefaultJobAnalysisPrompt() {
    return `You are an expert resume analyzer. Your task is to analyze the job description and knowledge base to identify:
1. Key technologies and skills required by the job
2. Projects in the knowledge base that are most relevant to the job
3. Specific metrics and achievements that align with the job requirements
4. Experience requirements and responsibilities

Job Description:
{jobDesc}

Knowledge Base / Additional Experience:
{knowledgeBase}

Provide a structured analysis in JSON format with the following fields:
{
  "requiredTechnologies": ["tech1", "tech2", ...],
  "relevantProjects": [
    {
      "projectName": "Project Name",
      "technologies": ["tech1", "tech2", ...],
      "relevanceScore": 0-100,
      "keyMetrics": ["metric1", "metric2", ...]
    },
    ...
  ],
  "keyMetrics": ["metric1", "metric2", ...],
  "experienceRequirements": ["requirement1", "requirement2", ...],
  "optimizationTasks": [
    {
      "section": "projects",
      "task": "Replace projects with more relevant ones from knowledge base",
      "priority": 1-5
    },
    {
      "section": "skills",
      "task": "Add missing skills from job requirements",
      "priority": 1-5
    },
    {
      "section": "experience",
      "task": "Refine experience descriptions to match job requirements",
      "priority": 1-5
    }
  ]
}

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Get default projects optimization prompt
   * @private
   */
  _getDefaultProjectsPrompt() {
    return `You are an expert resume projects optimizer. Your task is to optimize the projects section of the resume by replacing existing projects with more relevant ones from the knowledge base.

Original Projects Section:
{originalProjects}

Job Description:
{jobDesc}

Relevant Projects from Analysis:
{analysisProjects}

Required Technologies:
{requiredTechnologies}

Key Metrics to Highlight:
{keyMetrics}

Your task is to:
1. Replace existing projects with more relevant ones from the knowledge base
2. Ensure the new projects use technologies mentioned in the job description
3. Include specific metrics and achievements that align with the job requirements
4. Maintain the same LaTeX formatting as the original projects section

Return ONLY the optimized projects section in LaTeX format, maintaining the same structure and formatting as the original.

VERY IMPORTANT: ALWAYS REPLACE if the knowledge base has project that uses the same tech stack as the JD or somehow relevant to the JD.`;
  }

  /**
   * Get default skills enhancement prompt
   * @private
   */
  _getDefaultSkillsPrompt() {
    return `You are an expert resume skills optimizer. Your task is to enhance the skills section of the resume by adding relevant skills from the job description.

Original Skills Section:
{originalSkills}

Job Description:
{jobDesc}

Required Technologies:
{requiredTechnologies}

Your task is to:
1. Add any missing skills from the job requirements
2. Organize skills by category (e.g., Programming Languages, Frameworks, Tools)
3. Prioritize skills mentioned in the job description
4. Maintain the same LaTeX formatting as the original skills section

Return ONLY the enhanced skills section in LaTeX format, maintaining the same structure and formatting as the original.`;
  }

  /**
   * Get default experience refinement prompt
   * @private
   */
  _getDefaultExperiencePrompt() {
    return `You are an expert resume experience optimizer. Your task is to refine the experience section of the resume to better align with the job requirements.

Original Experience Section:
{originalExperience}

Job Description:
{jobDesc}

Experience Requirements:
{experienceRequirements}

Required Technologies:
{requiredTechnologies}

Key Metrics to Highlight:
{keyMetrics}

Your task is to:
1. Refine experience descriptions to highlight relevant responsibilities and achievements
2. Use action verbs and specific metrics to quantify achievements
3. Emphasize experience with technologies mentioned in the job description
4. Maintain the same LaTeX formatting as the original experience section

Return ONLY the refined experience section in LaTeX format, maintaining the same structure and formatting as the original.`;
  }

  /**
   * Get default final polish prompt
   * @private
   */
  _getDefaultFinalPolishPrompt() {
    return `You are an expert resume finalizer. Your task is to polish the entire resume to ensure it is optimized for the job description and ATS systems.

Original Resume:
{originalLatex}

Optimized Projects Section:
{optimizedProjects}

Enhanced Skills Section:
{enhancedSkills}

Refined Experience Section:
{refinedExperience}

Job Description:
{jobDesc}

Your task is to:
1. Combine all optimized sections into a cohesive resume
2. Ensure consistent formatting and style throughout
3. Verify that all sections are properly aligned with the job requirements
4. Make final adjustments to improve ATS compatibility

Return ONLY the complete LaTeX resume code, maintaining the same structure and formatting as the original.

!! ALWAYS GIVE THE ENTIRE UPDATED LATEX CODE NOTHING ELSE ONLY THE LATEX CODE!!`;
  }
}

// Register the service globally for use in the extension
window.AIService = AIService;
console.log('[AIService] Gemini-only AI Service registered successfully');

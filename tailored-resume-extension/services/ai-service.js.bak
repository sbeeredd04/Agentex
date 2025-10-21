class AIService {
  constructor() {
    console.log('[AIService] Initializing Multi-Agent AI Service');
    
    // Initialize endpoints
    this.endpoints = {
      gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      groq: 'https://api.groq.com/openai/v1/chat/completions'
    };

    // Initialize models without API keys
    this.models = {
      gemini: {
        model: 'gemini-2.0-flash'
      },
      groq: {
        models: {
          'deepseek-r1-distill-qwen-32b': {},
          'deepseek-r1-distill-llama-70b': {}
        }
      }
    };

    // Load API keys and prompts
    this.loadSettings();
  }

  // Default prompts for multi-agent structure
  static DEFAULT_JOB_ANALYSIS_PROMPT = `You are an expert resume analyzer. Your task is to analyze the job description and knowledge base to identify:
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
}`;

  static DEFAULT_PROJECTS_OPTIMIZATION_PROMPT = `You are an expert resume projects optimizer. Your task is to optimize the projects section of the resume by replacing existing projects with more relevant ones from the knowledge base.

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

Return ONLY the optimized projects section in LaTeX format, maintaining the same structure and formatting as the original.`;

  static DEFAULT_SKILLS_ENHANCEMENT_PROMPT = `You are an expert resume skills optimizer. Your task is to enhance the skills section of the resume by adding relevant skills from the job description.

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

  static DEFAULT_EXPERIENCE_REFINEMENT_PROMPT = `You are an expert resume experience optimizer. Your task is to refine the experience section of the resume to better align with the job requirements.

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

  static DEFAULT_FINAL_POLISH_PROMPT = `You are an expert resume finalizer. Your task is to polish the entire resume to ensure it is optimized for the job description and ATS systems.

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

Return ONLY the complete LaTeX resume code, maintaining the same structure and formatting as the original.`;

  async loadSettings() {
    const settings = await chrome.storage.local.get([
      'geminiApiKey', 
      'groqApiKey',
      'customPrompt',
      'jobAnalysisPrompt',
      'projectsOptimizationPrompt',
      'skillsEnhancementPrompt',
      'experienceRefinementPrompt',
      'finalPolishPrompt'
    ]);

    // Set API keys
    this.models.gemini.apiKey = settings.geminiApiKey;
    this.models.groq.apiKey = settings.groqApiKey;

    // Set custom prompts or use defaults
    this.prompts = {
      custom: settings.customPrompt || AIService.DEFAULT_PROMPT,
      jobAnalysis: settings.jobAnalysisPrompt || AIService.DEFAULT_JOB_ANALYSIS_PROMPT,
      projectsOptimization: settings.projectsOptimizationPrompt || AIService.DEFAULT_PROJECTS_OPTIMIZATION_PROMPT,
      skillsEnhancement: settings.skillsEnhancementPrompt || AIService.DEFAULT_SKILLS_ENHANCEMENT_PROMPT,
      experienceRefinement: settings.experienceRefinementPrompt || AIService.DEFAULT_EXPERIENCE_REFINEMENT_PROMPT,
      finalPolish: settings.finalPolishPrompt || AIService.DEFAULT_FINAL_POLISH_PROMPT
    };
  }

  async generateWithCurrentModel(prompt) {
    console.log('[AIService] Generating with current model:', {
      type: this.currentModelSelection?.type,
      model: this.currentModelSelection?.model
    });

    if (this.currentModelSelection?.type === 'groq') {
      return await this._generateWithGroq(prompt, this.currentModelSelection.model);
    } else {
      return await this._generateWithGemini(prompt);
    }
  }

  async generateContent(prompt, contentType = 'latex', modelType = 'gemini', model = null) {
    try {
      console.log('[AIService] Generating content:', {
        contentType,
        modelType,
        model,
        promptLength: prompt.length
      });

      this.currentModelSelection = { type: modelType, model };

      // Add content type specific instructions
      let finalPrompt = prompt;
      if (contentType === 'docx') {
        finalPrompt += "\nIMPORTANT: Return ONLY plain text content without any formatting markers or LaTeX commands.";
        console.log('[AIService] Using DOCX-specific prompt');
      } else {
        console.log('[AIService] Using LaTeX-specific prompt');
      }

      const response = await this.generateWithCurrentModel(finalPrompt);
      
      return contentType === 'docx' ? 
        this.cleanDocxResponse(response) : 
        this.cleanLatexResponse(response);

    } catch (error) {
      console.error(`[AIService] ${contentType.toUpperCase()} Generation error:`, error);
      throw error;
    }
  }

  async _generateWithGemini(prompt) {
    console.log('[AIService] Gemini Generation Start:', {
      promptPreview: prompt.substring(0, 100) + '...',
      promptLength: prompt.length
    });

    try {
      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }]
      };

      console.log('[AIService] Gemini Request:', {
        endpoint: this.endpoints.gemini,
        requestBody: JSON.stringify(requestBody, null, 2)
      });

      const response = await fetch(`${this.endpoints.gemini}?key=${this.models.gemini.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();
      
      console.log('[AIService] Gemini Raw Response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${responseData.error?.message || response.statusText}`);
      }

      if (!responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('[AIService] Invalid Gemini response structure:', responseData);
        throw new Error('Invalid Gemini response structure');
      }

      const generatedContent = responseData.candidates[0].content.parts[0].text;
      
      console.log('[AIService] Gemini Generation Success:', {
        contentLength: generatedContent.length,
        contentPreview: '...' + generatedContent.substring(Math.max(0, generatedContent.length - 400))
      });

      return this._cleanResponse(generatedContent);
    } catch (error) {
      console.error('[AIService] Gemini Generation Error:', {
        error,
        stack: error.stack
      });
      throw error;
    }
  }

  async _generateWithGroq(prompt, specificModel) {
    const modelId = specificModel || 'deepseek-r1-distill-llama-70b';
    
    console.log('[AIService] Groq Generation Start:', {
      modelId,
      promptPreview: prompt.substring(0, 100) + '...',
      promptLength: prompt.length
    });

    try {
      const requestBody = {
        model: modelId,
        messages: [{
          role: "user",
          content: prompt
        }],
        reasoning_format: "hidden"
      };

      console.log('[AIService] Groq Request:', {
        endpoint: this.endpoints.groq,
        model: modelId,
        requestBody: JSON.stringify(requestBody, null, 2)
      });

      const response = await fetch(this.endpoints.groq, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.models.groq.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();
      
      console.log('[AIService] Groq Raw Response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      });

      if (!response.ok) {
        throw new Error(`Groq API Error: ${responseData.error?.message || response.statusText}`);
      }

      if (!responseData.choices?.[0]?.message?.content) {
        console.error('[AIService] Invalid Groq response structure:', responseData);
        throw new Error('Invalid Groq response structure');
      }

      const generatedContent = responseData.choices[0].message.content;
      
      console.log('[AIService] Groq Generation Success:', {
        contentLength: generatedContent.length,
        contentPreview: '...' + generatedContent.substring(Math.max(0, generatedContent.length - 400)),
        usage: responseData.usage,
        modelId
      });

      return this._cleanResponse(generatedContent);
    } catch (error) {
      console.error('[AIService] Groq Generation Error:', {
        error,
        modelId,
        stack: error.stack
      });
      throw error;
    }
  }

  _cleanResponse(text) {
    console.log('[AIService] Cleaning response:', {
      before: {
        length: text.length,
        preview: '...' + text.substring(Math.max(0, text.length - 400))
      }
    });

    const cleaned = text
      .replace(/```latex\n/g, '')
      .replace(/```\n?/g, '')
      .replace(/\\boxed{/g, '')
      .replace(/\{\\displaystyle\s+/g, '')
      .trim();

    console.log('[AIService] Cleaned response:', {
      after: {
        length: cleaned.length,
        preview: '...' + cleaned.substring(Math.max(0, cleaned.length - 400))
      }
    });

    return cleaned;
  }

  cleanDocxResponse(response) {
    // Remove any LaTeX commands or other formatting
    let cleaned = response.replace(/\\[a-zA-Z]+{([^}]*)}/g, '$1');
    cleaned = cleaned.replace(/\\[a-zA-Z]+/g, '');
    return cleaned.trim();
  }

  cleanLatexResponse(response) {
    return this._cleanResponse(response);
  }

  // New method for multi-agent resume generation
  async generateTailoredResume(originalLatex, jobDesc, knowledgeBase, modelType = 'gemini', model = null) {
    try {
      console.log('[AIService] Starting multi-agent resume generation');
      
      this.currentModelSelection = { type: modelType, model };
      
      // Helper function to dispatch status events
      const dispatchStatus = (step, message) => {
        const event = new CustomEvent('aiServiceStatus', {
          detail: {
            step,
            totalSteps: 5,
            message
          }
        });
        document.dispatchEvent(event);
      };
      
      // Check if knowledge base has content
      const hasKnowledgeBaseContent = knowledgeBase && knowledgeBase.trim().length > 0;
      console.log('[AIService] Knowledge base check:', { hasContent: hasKnowledgeBaseContent });
      
      // If knowledge base is empty, fall back to single-step generation
      if (!hasKnowledgeBaseContent) {
        console.log('[AIService] Knowledge base is empty, falling back to single-step generation');
        return this.generateContent(
          this.prompts.custom
            .replace('{originalLatex}', originalLatex)
            .replace('{jobDesc}', jobDesc)
            .replace('{knowledgeBase}', knowledgeBase),
          'latex',
          modelType,
          model
        );
      }
      
      // Step 1: Job Analysis
      dispatchStatus(1, 'Analyzing job description and knowledge base');
      
      const jobAnalysisPrompt = this.prompts.jobAnalysis
        .replace('{jobDesc}', jobDesc)
        .replace('{knowledgeBase}', knowledgeBase);
      
      const analysisResponse = await this.generateWithCurrentModel(jobAnalysisPrompt);
      
      // Parse the analysis JSON
      let analysis;
      try {
        const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (error) {
        // Fall back to single-step generation on parsing error
        return this.generateContent(
          this.prompts.custom
            .replace('{originalLatex}', originalLatex)
            .replace('{jobDesc}', jobDesc)
            .replace('{knowledgeBase}', knowledgeBase),
          'latex',
          modelType,
          model
        );
      }
      
      // Extract sections
      const originalProjects = this._extractProjectsSection(originalLatex);
      const originalSkills = this._extractSkillsSection(originalLatex);
      const originalExperience = this._extractExperienceSection(originalLatex);
      
      // Step 2: Projects Optimization
      dispatchStatus(2, 'Optimizing projects section');
      
      const projectsPrompt = this.prompts.projectsOptimization
        .replace('{originalProjects}', originalProjects)
        .replace('{jobDesc}', jobDesc)
        .replace('{analysisProjects}', JSON.stringify(analysis.relevantProjects, null, 2))
        .replace('{requiredTechnologies}', analysis.requiredTechnologies.join(', '))
        .replace('{keyMetrics}', analysis.keyMetrics.join(', '));
      
      const optimizedProjects = await this.generateWithCurrentModel(projectsPrompt);
      
      // Step 3: Skills Enhancement
      dispatchStatus(3, 'Enhancing skills section');
      
      const skillsPrompt = this.prompts.skillsEnhancement
        .replace('{originalSkills}', originalSkills)
        .replace('{jobDesc}', jobDesc)
        .replace('{requiredTechnologies}', analysis.requiredTechnologies.join(', '));
      
      const enhancedSkills = await this.generateWithCurrentModel(skillsPrompt);
      
      // Step 4: Experience Refinement
      dispatchStatus(4, 'Refining experience section');
      
      const experiencePrompt = this.prompts.experienceRefinement
        .replace('{originalExperience}', originalExperience)
        .replace('{jobDesc}', jobDesc)
        .replace('{experienceRequirements}', analysis.experienceRequirements.join(', '))
        .replace('{requiredTechnologies}', analysis.requiredTechnologies.join(', '))
        .replace('{keyMetrics}', analysis.keyMetrics.join(', '));
      
      const refinedExperience = await this.generateWithCurrentModel(experiencePrompt);
      
      // Step 5: Final Polish
      dispatchStatus(5, 'Polishing final resume');
      
      const finalPrompt = this.prompts.finalPolish
        .replace('{originalLatex}', originalLatex)
        .replace('{optimizedProjects}', optimizedProjects)
        .replace('{enhancedSkills}', enhancedSkills)
        .replace('{refinedExperience}', refinedExperience)
        .replace('{jobDesc}', jobDesc);
      
      const finalResponse = await this.generateWithCurrentModel(finalPrompt);
      
      return this.cleanLatexResponse(finalResponse);
    } catch (error) {
      console.error('[AIService] Multi-agent generation error:', error);
      // Fall back to single-step generation
      return this.generateContent(
        this.prompts.custom
          .replace('{originalLatex}', originalLatex)
          .replace('{jobDesc}', jobDesc)
          .replace('{knowledgeBase}', knowledgeBase),
        'latex',
        modelType,
        model
      );
    }
  }
  
  // Helper method to extract the projects section from LaTeX
  _extractProjectsSection(latex) {
    try {
      // Look for the projects section using common LaTeX section markers
      const projectSectionRegex = /\\section\{Projects\}([\s\S]*?)(?=\\section\{|$)/i;
      const match = latex.match(projectSectionRegex);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      
      // Fallback: look for any section that might contain projects
      const sectionRegex = /\\section\{([^}]*)\}([\s\S]*?)(?=\\section\{|$)/g;
      let sections = [];
      let sectionMatch;
      
      while ((sectionMatch = sectionRegex.exec(latex)) !== null) {
        const sectionTitle = sectionMatch[1].toLowerCase();
        if (sectionTitle.includes('project') || sectionTitle.includes('experience')) {
          sections.push(sectionMatch[0]);
        }
      }
      
      if (sections.length > 0) {
        return sections.join('\n\n');
      }
      
      // If we still can't find a projects section, return a placeholder
      return "\\section{Projects}\n\\resumeSubHeadingListStart\n\\resumeProjectHeading\n{\\textbf{Project Name} $|$ \\emph{Technologies}}{}\n\\resumeItemListStart\n\\resumeItem{\\textbf{Description} of the project.}\n\\resumeItemListEnd\n\\resumeSubHeadingListEnd";
    } catch (error) {
      console.error('[AIService] Error extracting projects section:', error);
      return "\\section{Projects}\n\\resumeSubHeadingListStart\n\\resumeProjectHeading\n{\\textbf{Project Name} $|$ \\emph{Technologies}}{}\n\\resumeItemListStart\n\\resumeItem{\\textbf{Description} of the project.}\n\\resumeItemListEnd\n\\resumeSubHeadingListEnd";
    }
  }
  
  // Helper method to extract the skills section from LaTeX
  _extractSkillsSection(latex) {
    try {
      // Look for the skills section using common LaTeX section markers
      const skillsSectionRegex = /\\section\{Skills\}([\s\S]*?)(?=\\section\{|$)/i;
      const match = latex.match(skillsSectionRegex);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      
      // Fallback: look for any section that might contain skills
      const sectionRegex = /\\section\{([^}]*)\}([\s\S]*?)(?=\\section\{|$)/g;
      let sections = [];
      let sectionMatch;
      
      while ((sectionMatch = sectionRegex.exec(latex)) !== null) {
        const sectionTitle = sectionMatch[1].toLowerCase();
        if (sectionTitle.includes('skill') || sectionTitle.includes('technical')) {
          sections.push(sectionMatch[0]);
        }
      }
      
      if (sections.length > 0) {
        return sections.join('\n\n');
      }
      
      // If we still can't find a skills section, return a placeholder
      return "\\section{Skills}\n\\resumeItemListStart\n\\resumeItem{\\textbf{Programming Languages:} Language1, Language2}\n\\resumeItem{\\textbf{Frameworks:} Framework1, Framework2}\n\\resumeItem{\\textbf{Tools:} Tool1, Tool2}\n\\resumeItemListEnd";
    } catch (error) {
      console.error('[AIService] Error extracting skills section:', error);
      return "\\section{Skills}\n\\resumeItemListStart\n\\resumeItem{\\textbf{Programming Languages:} Language1, Language2}\n\\resumeItem{\\textbf{Frameworks:} Framework1, Framework2}\n\\resumeItem{\\textbf{Tools:} Tool1, Tool2}\n\\resumeItemListEnd";
    }
  }
  
  // Helper method to extract the experience section from LaTeX
  _extractExperienceSection(latex) {
    try {
      // Look for the experience section using common LaTeX section markers
      const experienceSectionRegex = /\\section\{Experience\}([\s\S]*?)(?=\\section\{|$)/i;
      const match = latex.match(experienceSectionRegex);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      
      // Fallback: look for any section that might contain experience
      const sectionRegex = /\\section\{([^}]*)\}([\s\S]*?)(?=\\section\{|$)/g;
      let sections = [];
      let sectionMatch;
      
      while ((sectionMatch = sectionRegex.exec(latex)) !== null) {
        const sectionTitle = sectionMatch[1].toLowerCase();
        if (sectionTitle.includes('experience') || sectionTitle.includes('work') || sectionTitle.includes('employment')) {
          sections.push(sectionMatch[0]);
        }
      }
      
      if (sections.length > 0) {
        return sections.join('\n\n');
      }
      
      // If we still can't find an experience section, return a placeholder
      return "\\section{Experience}\n\\resumeSubHeadingListStart\n\\resumeSubheadingListEnd";
    } catch (error) {
      console.error('[AIService] Error extracting experience section:', error);
      return "\\section{Experience}\n\\resumeSubHeadingListStart\n\\resumeSubheadingListEnd";
    }
  }
}

// Register the service globally
window.AIService = AIService;
console.log('[AIService] Class registered globally'); 
class AIService {
  constructor() {
    console.log('[AIService] Initializing Multi-Model AI Service');
    
    // Initialize endpoints
    this.endpoints = {
      gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      groq: 'https://api.groq.com/openai/v1/chat/completions'
    };

    // Initialize models without API keys
    this.models = {
      gemini: {
        model: 'gemini-2.0-flash-thinking-exp-01-21'
      },
      groq: {
        models: {
          'deepseek-r1-distill-qwen-32b': {},
          'deepseek-r1-distill-llama-70b': {}
        }
      }
    };

    // Load API keys
    this.loadApiKeys();
  }

  // Default prompts for multi-step structure
  static DEFAULT_ANALYSIS_PROMPT = `You are an expert resume analyzer. Your task is to analyze the job description and knowledge base to identify:
1. Key technologies and skills required by the job
2. Projects in the knowledge base that are most relevant to the job
3. Specific metrics and achievements that align with the job requirements

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
  "keyMetrics": ["metric1", "metric2", ...]
}

Return ONLY the JSON object, no additional text.`;

  static DEFAULT_PROJECTS_PROMPT = `You are an expert resume project optimizer. Your task is to create an optimized projects section for a software engineering resume.

Original Projects Section:
{originalProjects}

Job Requirements:
{jobDesc}

Analysis of Relevant Projects:
{analysisProjects}

Required Technologies:
{requiredTechnologies}

Key Metrics to Highlight:
{keyMetrics}

Instructions:
1. Replace existing projects with more relevant ones from the analysis if they better match the job requirements
2. Ensure each project highlights technologies and metrics that align with the job description
3. Maintain the same LaTeX formatting and structure
4. Use the XYZ format: \\resumeItem{\\textbf{<JD Keyword>} used to \\textbf{<Action Verb>} \\emph{<Tech>} achieving \\textbf{<Metric>} via <Method>}
5. Return ONLY the optimized projects section in LaTeX format

VERY IMPORTANT: ALWAYS REPLACE if the knowledge base has project that uses the same tech stack as the JD or somehow relevant to the JD.`;

  static DEFAULT_FINAL_PROMPT = `You are an expert ATS resume tailor for software engineering roles. Your task is to create a final resume by replacing the projects section with the optimized version.

Original LaTeX Resume:
{originalLatex}

Optimized Projects Section:
{optimizedProjects}

Job Description:
{jobDesc}

Instructions:
1. Replace the projects section in the original resume with the optimized version
2. Ensure all LaTeX formatting is preserved
3. Return the complete resume with the updated projects section
4. Do not make any other changes to the resume

!! ALWAYS GIVE THE ENTIRE UPDATED LATEX CODE NOTHING ELSE ONLY THE LATEX CODE!!`;

  async loadApiKeys() {
    const keys = await chrome.storage.local.get(['geminiApiKey', 'groqApiKey']);
    this.models.gemini.apiKey = keys.geminiApiKey;
    this.models.groq.apiKey = keys.groqApiKey;

    console.log('[AIService] API keys loaded:', {
      gemini: Boolean(this.models.gemini.apiKey),
      groq: Boolean(this.models.groq.apiKey)
    });
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
      
      // Clean response based on content type
      if (contentType === 'docx') {
        console.log('[AIService] Cleaning DOCX response');
        return this.cleanDocxResponse(response);
      }
      console.log('[AIService] Cleaning LaTeX response');
      return this.cleanLatexResponse(response);

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

  // New method for multi-step resume generation
  async generateTailoredResume(originalLatex, jobDesc, knowledgeBase, modelType = 'gemini', model = null) {
    try {
      console.log('[AIService] Starting multi-step resume generation');
      
      this.currentModelSelection = { type: modelType, model };
      
      // Helper function to dispatch status events
      const dispatchStatus = (step, message) => {
        const event = new CustomEvent('aiServiceStatus', {
          detail: {
            step,
            totalSteps: 3,
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
          `You are an expert ATS resume tailor for software engineering roles. Your mission is to optimize the resume to pass automated screening and secure interviews.

Original LaTeX Resume:
${originalLatex}

Job Description:
${jobDesc}

VERY IMPORTANT: ALWAYS ADD any skills that are not already in the resume but are relevant to the JD to the skills section.

!! ALWAYS GIVE THE ENTIRE UPDATED LATEX CODE NOTHING ELSE ONLY THE LATEX CODE!!`,
          'latex',
          modelType,
          model
        );
      }
      
      // Get custom prompts from storage
      const prompts = await chrome.storage.local.get(['analysisPrompt', 'projectsPrompt', 'finalPrompt']);
      const analysisPromptTemplate = prompts.analysisPrompt || AIService.DEFAULT_ANALYSIS_PROMPT;
      const projectsPromptTemplate = prompts.projectsPrompt || AIService.DEFAULT_PROJECTS_PROMPT;
      const finalPromptTemplate = prompts.finalPrompt || AIService.DEFAULT_FINAL_PROMPT;
      
      // Step 1: Analyze job description and knowledge base
      dispatchStatus(1, 'Analyzing job description and knowledge base');
      console.log('[AIService] Step 1: Analyzing job and knowledge base');
      
      const analysisPrompt = analysisPromptTemplate
        .replace('{jobDesc}', jobDesc)
        .replace('{knowledgeBase}', knowledgeBase);
      
      const analysisResponse = await this.generateWithCurrentModel(analysisPrompt);
      
      // Parse the analysis JSON
      let analysis;
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract JSON from analysis response');
        }
      } catch (error) {
        console.error('[AIService] Failed to parse analysis JSON:', error);
        // Fall back to single-step generation
        return this.generateContent(
          `You are an expert ATS resume tailor for software engineering roles. Your mission is to optimize the resume to pass automated screening and secure interviews.

Original LaTeX Resume:
${originalLatex}

Job Description:
${jobDesc}

Knowledge Base / Additional Experience:
${knowledgeBase}

VERY IMPORTANT: ALWAYS REPLACE if the knowledge base has project that uses the same tech stack as the JD or somehow relevant to the JD.
VERY IMPORTANT: ALWAYS ADD any skills that are not already in the resume but are relevant to the JD to the skills section.

!! ALWAYS GIVE THE ENTIRE UPDATED LATEX CODE NOTHING ELSE ONLY THE LATEX CODE!!`,
          'latex',
          modelType,
          model
        );
      }
      
      // Check if there are relevant projects in the analysis
      const hasRelevantProjects = analysis.relevantProjects && analysis.relevantProjects.length > 0;
      console.log('[AIService] Relevant projects check:', { hasRelevantProjects });
      
      // If no relevant projects, fall back to single-step generation
      if (!hasRelevantProjects) {
        console.log('[AIService] No relevant projects found, falling back to single-step generation');
        return this.generateContent(
          `You are an expert ATS resume tailor for software engineering roles. Your mission is to optimize the resume to pass automated screening and secure interviews.

Original LaTeX Resume:
${originalLatex}

Job Description:
${jobDesc}

Knowledge Base / Additional Experience:
${knowledgeBase}

VERY IMPORTANT: ALWAYS REPLACE if the knowledge base has project that uses the same tech stack as the JD or somehow relevant to the JD.
VERY IMPORTANT: ALWAYS ADD any skills that are not already in the resume but are relevant to the JD to the skills section.

!! ALWAYS GIVE THE ENTIRE UPDATED LATEX CODE NOTHING ELSE ONLY THE LATEX CODE!!`,
          'latex',
          modelType,
          model
        );
      }
      
      // Step 2: Generate optimized projects section
      const originalProjects = this._extractProjectsSection(originalLatex);
      
      const projectsPrompt = projectsPromptTemplate
        .replace('{originalProjects}', originalProjects)
        .replace('{jobDesc}', jobDesc)
        .replace('{analysisProjects}', JSON.stringify(analysis.relevantProjects, null, 2))
        .replace('{requiredTechnologies}', analysis.requiredTechnologies.join(', '))
        .replace('{keyMetrics}', analysis.keyMetrics.join(', '));
      
      dispatchStatus(2, 'Optimizing projects section');
      console.log('[AIService] Step 2: Generating optimized projects section');
      const optimizedProjects = await this.generateWithCurrentModel(projectsPrompt);
      
      // Step 3: Generate final resume with optimized projects
      const finalPrompt = finalPromptTemplate
        .replace('{originalLatex}', originalLatex)
        .replace('{optimizedProjects}', optimizedProjects)
        .replace('{jobDesc}', jobDesc);
      
      dispatchStatus(3, 'Generating final resume');
      console.log('[AIService] Step 3: Generating final resume');
      const finalResponse = await this.generateWithCurrentModel(finalPrompt);
      
      return this.cleanLatexResponse(finalResponse);
    } catch (error) {
      console.error('[AIService] Multi-step generation error:', error);
      // Fall back to single-step generation
      return this.generateContent(
        `You are an expert ATS resume tailor for software engineering roles. Your mission is to optimize the resume to pass automated screening and secure interviews.

Original LaTeX Resume:
${originalLatex}

Job Description:
${jobDesc}

Knowledge Base / Additional Experience:
${knowledgeBase}

VERY IMPORTANT: ALWAYS REPLACE if the knowledge base has project that uses the same tech stack as the JD or somehow relevant to the JD.
VERY IMPORTANT: ALWAYS ADD any skills that are not already in the resume but are relevant to the JD to the skills section.

!! ALWAYS GIVE THE ENTIRE UPDATED LATEX CODE NOTHING ELSE ONLY THE LATEX CODE!!`,
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
}

// Register the service globally
window.AIService = AIService;
console.log('[AIService] Class registered globally'); 
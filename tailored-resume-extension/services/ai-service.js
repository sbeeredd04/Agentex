class AIService {
  constructor(apiKey) {
    console.log('Initializing AI Service');
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    this.apiKey = apiKey;
    this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    this.systemInstruction = `You are an expert ATS-optimized resume tailoring assistant. Your role is to:
      1. Analyze job descriptions thoroughly
      2. Identify key requirements, skills, and qualifications
      3. Modify LaTeX resumes to highlight relevant experience
      4. Ensure proper keyword optimization for ATS systems
      5. Maintain professional formatting and structure
      6. Preserve all LaTeX syntax and formatting
      Only output the modified LaTeX code without any additional explanations or markdown.`;
  }

  async generateContent(prompt) {
    console.log('Generating content, prompt length:', prompt.length);
    try {
      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${this.systemInstruction}\n\n${prompt}`
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from API');
      }

      let text = data.candidates[0].content.parts[0].text;
      
      // Clean up the response by removing Markdown code fences
      text = text.replace(/```latex\n/g, '').replace(/```\n?/g, '').trim();
      
      console.log('Generated content length:', text.length);
      return text;
    } catch (error) {
      console.error('Error in generateContent:', error);
      throw error;
    }
  }
}

window.AIService = AIService;
console.log('AI Service class registered globally'); 
# Gemini Prompts for Resume Analysis and Tailoring

This document contains all Gemini AI prompts used in the Agentex Resume Editor for analyzing and tailoring LaTeX resumes to job descriptions.

## Table of Contents

1. [LaTeX Resume Tailoring](#latex-resume-tailoring)
2. [Multi-Agent Pipeline Prompts](#multi-agent-pipeline-prompts)
   - [Job Analysis](#job-analysis)
   - [Projects Optimization](#projects-optimization)
   - [Skills Enhancement](#skills-enhancement)
   - [Experience Refinement](#experience-refinement)
   - [Final Polish](#final-polish)

---

## LaTeX Resume Tailoring

### Purpose
Single-pass comprehensive tailoring of LaTeX-formatted resumes to match job descriptions.

### Use Case
- User uploads a LaTeX (.tex) resume file
- User provides job description and optional knowledge base
- System generates optimized LaTeX resume in one pass

### Prompt Details

**Input Variables:**
- `{originalLatex}`: Complete LaTeX resume code
- `{jobDesc}`: Target job description
- `{knowledgeBase}`: Additional projects/experience (optional)

**Output:**
Complete LaTeX resume code with optimizations applied

**Key Features:**
- Strategic project replacement from knowledge base
- Keyword alignment with job requirements
- ATS optimization
- XYZ format for achievements (X accomplished Y measured by Z)
- Maintains original structure and formatting

**Example Usage:**
```javascript
const tailoredResume = await geminiService.tailorLatexResume(
  originalLatex,
  jobDescription,
  knowledgeBase
);
```

---

## Multi-Agent Pipeline Prompts

The multi-agent system breaks down resume optimization into specialized steps, each handled by a focused agent.

### Job Analysis

#### Purpose
Analyze job description and knowledge base to create optimization plan.

#### Input Variables
- `{jobDesc}`: Job description
- `{knowledgeBase}`: Additional experience/projects

#### Output
JSON object containing:
```json
{
  "requiredTechnologies": ["React", "Node.js", ...],
  "relevantProjects": [
    {
      "projectName": "E-commerce Platform",
      "technologies": ["React", "Redux", ...],
      "relevanceScore": 85,
      "keyMetrics": ["Increased sales by 40%", ...]
    }
  ],
  "keyMetrics": [...],
  "experienceRequirements": [...],
  "optimizationTasks": [
    {
      "section": "projects",
      "task": "Replace with relevant projects",
      "priority": 5
    }
  ]
}
```

#### Example Usage
```javascript
const analysis = await geminiService.analyzeJob(
  jobDescription,
  knowledgeBase
);
```

---

### Projects Optimization

#### Purpose
Replace existing projects with more relevant ones from knowledge base.

#### Input Variables
- `{originalProjects}`: Current projects section (LaTeX)
- `{jobDesc}`: Job description
- `{analysisProjects}`: Relevant projects from analysis
- `{requiredTechnologies}`: Technologies from analysis
- `{keyMetrics}`: Metrics to highlight

#### Output
Optimized projects section in LaTeX format

#### Key Rules
- Replace projects with ≥70% technology overlap
- Use same tech stack as job description
- Include specific metrics and achievements
- Maintain LaTeX formatting

#### Example Usage
```javascript
const optimizedProjects = await geminiService.optimizeProjects(
  originalProjects,
  jobDescription,
  analysisData
);
```

---

### Skills Enhancement

#### Purpose
Add missing skills from job requirements and reorganize skill categories.

#### Input Variables
- `{originalSkills}`: Current skills section (LaTeX)
- `{jobDesc}`: Job description
- `{requiredTechnologies}`: Technologies from analysis

#### Output
Enhanced skills section in LaTeX format

#### Key Features
- Add missing job-required skills
- Organize by category
- Prioritize JD-mentioned skills
- Maintain formatting

#### Example Usage
```javascript
const enhancedSkills = await geminiService.enhanceSkills(
  originalSkills,
  jobDescription,
  requiredTechnologies
);
```

---

### Experience Refinement

#### Purpose
Refine experience descriptions to align with job requirements.

#### Input Variables
- `{originalExperience}`: Current experience section (LaTeX)
- `{jobDesc}`: Job description
- `{experienceRequirements}`: Requirements from analysis
- `{requiredTechnologies}`: Technologies from analysis
- `{keyMetrics}`: Metrics to highlight

#### Output
Refined experience section in LaTeX format

#### Key Features
- Highlight relevant responsibilities
- Use action verbs and metrics
- Emphasize JD-related technologies
- Maintain formatting

#### Example Usage
```javascript
const refinedExperience = await geminiService.refineExperience(
  originalExperience,
  jobDescription,
  analysisData
);
```

---

### Final Polish

#### Purpose
Integrate all optimized sections into a cohesive, ATS-friendly resume.

#### Input Variables
- `{originalLatex}`: Original complete resume
- `{optimizedProjects}`: From projects optimization
- `{enhancedSkills}`: From skills enhancement
- `{refinedExperience}`: From experience refinement
- `{jobDesc}`: Job description

#### Output
Complete LaTeX resume with all optimizations applied

#### Key Features
- Combine all sections
- Ensure consistent formatting
- Verify JD alignment
- Final ATS adjustments

#### Example Usage
```javascript
const finalResume = await geminiService.finalPolish(
  originalLatex,
  optimizedProjects,
  enhancedSkills,
  refinedExperience,
  jobDescription
);
```

---

## Customizing Prompts

All prompts can be customized through the extension settings:

1. Click the Settings icon in the extension
2. Navigate to the Prompts tab
3. Edit any prompt to suit your needs
4. Click "Save Settings"
5. Click "Reset to Default" to restore original prompts

### Tips for Customization

- **Be Specific**: Add industry-specific requirements
- **Add Examples**: Include sample outputs for better results
- **Test Iteratively**: Make small changes and test
- **Keep Structure**: Maintain input/output variable format
- **Document Changes**: Note why you made modifications

---

## Prompt Engineering Best Practices

### For LaTeX Resumes
- Emphasize structure preservation
- Include formatting examples
- Specify XYZ achievement format
- Set clear boundaries (what NOT to change)

### For Multi-Agent System
- Break complex tasks into steps
- Provide clear input/output formats
- Use JSON for structured data
- Chain prompts logically

---

## Troubleshooting

### Issue: AI Changes Too Much
**Solution**: Add more "preserve" and "maintain" instructions, specify what NOT to change

### Issue: Output Format Wrong
**Solution**: Add explicit output format examples and instructions

### Issue: Not Enough Optimization
**Solution**: Increase emphasis on keyword matching and project replacement

### Issue: Loses Important Content
**Solution**: Add rules about minimum content preservation

---

## Version History

- **v2.0**: Gemini-only implementation with enhanced prompts
- **v1.x**: Multi-provider support (deprecated)

---

## Contributing

To suggest prompt improvements:
1. Test your changes thoroughly
2. Document the improvement
3. Submit via GitHub issues with examples
4. Include before/after comparisons

---

## Related Documentation

- [README.md](README.md) - Main project documentation
- [TESTING.md](TESTING.md) - Manual testing procedures
- [Architecture Documentation](docs/ARCHITECTURE.md) - System design

---

*Last Updated: 2025*
*Gemini Model: gemini-2.0-flash*

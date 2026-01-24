# Resume Tailoring Prompt Engineering Guide

## Overview
This document describes the optimal prompt architecture for tailoring resumes to job descriptions while preserving LaTeX formatting and document structure.

## Core Principles

### 1. Format Preservation
- **Never modify LaTeX structure**: Commands, environments, and document class must remain unchanged
- **Only update content**: Modify text within `\resumeItem{}`, `\resumeSubheading{}`, and similar content blocks
- **Preserve spacing**: Maintain original line breaks, indentation, and whitespace patterns

### 2. Relevance-Based Replacement
The AI should evaluate each section against the job description using:
- **Technology Stack Matching** (40% weight): Direct matches between JD requirements and knowledge base
- **Metric Strength** (30% weight): Quantifiable achievements (%, $, time saved, users impacted)
- **Responsibility Alignment** (30% weight): How well the experience matches job duties

### 3. ATS Optimization
- **Keyword Density**: Ensure critical JD keywords appear 2-3 times throughout resume
- **Action Verbs**: Use strong, measurable verbs (Developed, Implemented, Architected, Optimized)
- **XYZ Format**: "Accomplished [X] as measured by [Y] by doing [Z]"

## Prompt Architecture

### Stage 1: Analysis
```
Task: Analyze the job description and identify:
1. Required technologies (programming languages, frameworks, tools)
2. Key responsibilities and required experience
3. Metrics and quantifiable requirements
4. Industry-specific terminology
5. Soft skills and culture fit indicators

Output: Structured analysis in JSON format
```

### Stage 2: Content Evaluation
```
Task: For each section of the resume:
1. Calculate relevance score (0-100) based on:
   - Technology overlap with JD
   - Metric strength and relevance
   - Experience level match
2. Identify replacement candidates from knowledge base
3. Score each candidate using same criteria
4. Flag items for replacement if candidate score > current score + 20
```

### Stage 3: Strategic Replacement
```
Rules:
1. Replace projects when knowledge base has:
   - Same/similar tech stack as JD requirement
   - Stronger metrics (e.g., 50% improvement vs 20%)
   - Better responsibility alignment
   
2. Update bullet points to:
   - Lead with JD keywords
   - Use XYZ format for achievements
   - Include specific technologies from JD
   
3. Constraints:
   - Maintain original bullet count per section
   - Keep similar length (±20% character count)
   - Preserve verb tense consistency
   - Never exceed 1 page
```

### Stage 4: Polish and Validate
```
Final checks:
1. Ensure all LaTeX commands are properly closed
2. Verify no new packages or commands were added
3. Check keyword density for top 10 JD terms
4. Validate formatting consistency
5. Confirm 1-page constraint
```

## Best Practices for Each Section

### Projects Section
**Goal**: Replace generic projects with highly relevant ones

**Prompt Template**:
```
Analyze these projects from the knowledge base:
[knowledge base projects]

Job requires: [key technologies from JD]

For each resume project, check if knowledge base has a better match:
- Same/similar tech stack
- Stronger metrics
- More relevant to job duties

Replace if knowledge base project scores 20+ points higher.
Format: Maintain exact LaTeX structure, update only project name and bullets.
```

### Experience Section
**Goal**: Reframe responsibilities to match JD language

**Prompt Template**:
```
Job description emphasizes: [key phrases from JD]

For each bullet in experience section:
1. Identify relevant technologies already mentioned
2. Reframe using JD terminology
3. Add quantifiable metrics if available from knowledge base
4. Lead with action verbs from JD

Constraint: Must not invent new roles or dates
```

### Skills Section
**Goal**: Prioritize JD-relevant skills

**Prompt Template**:
```
Required skills from JD: [list]
Current resume skills: [list]
Additional skills from knowledge base: [list]

Actions:
1. Move JD-matched skills to front of each category
2. Add missing required skills if in knowledge base
3. Remove rarely-used skills if >15 skills per category
4. Maintain LaTeX formatting exactly
```

### Education & Certifications
**Goal**: Highlight relevant coursework and certifications

**Prompt Template**:
```
Keep structure unchanged.
If relevant coursework/certifications exist in knowledge base matching JD:
- Add to appropriate section
- Use same formatting as existing items
```

## Anti-Patterns to Avoid

### ❌ DON'T
1. Add new LaTeX packages or commands
2. Change document structure (sections, order, hierarchy)
3. Invent experiences or metrics not in resume/knowledge base
4. Modify dates, company names, or degree titles
5. Change formatting (fonts, spacing, margins)
6. Remove JD-matched content to make room for less relevant content
7. Exceed 1 page limit

### ✅ DO
1. Replace entire projects with better matches from knowledge base
2. Update bullet point language to use JD terminology
3. Add specific technologies from JD to existing bullets
4. Reorder skills to prioritize JD requirements
5. Use exact LaTeX syntax from original document
6. Preserve all formatting structure
7. Focus on high-impact changes (80/20 rule)

## Testing and Validation

### Automated Checks
1. **LaTeX Compilation**: Must compile without errors
2. **Page Count**: Must be exactly 1 page
3. **Keyword Match**: Top 10 JD keywords must appear in resume
4. **Structure**: Section count and order must match original
5. **Formatting**: Character count per section within ±20%

### Manual Review Checklist
- [ ] All content is truthful (from resume or knowledge base)
- [ ] Technology mentions match JD requirements
- [ ] Metrics are specific and impressive
- [ ] Language matches JD tone (formal vs casual)
- [ ] No LaTeX compilation errors
- [ ] PDF renders correctly at 1 page
- [ ] ATS-friendly formatting maintained

## Model-Specific Considerations

### Gemini 2.0 Flash
- **Strengths**: Fast processing, good at following structure
- **Optimization**: Include explicit formatting examples in prompt
- **Token limit**: ~8K output, plan accordingly

### Claude 3.5 Sonnet
- **Strengths**: Excellent at nuanced language, careful editing
- **Optimization**: Emphasize "preserve structure" constraints strongly
- **Token limit**: ~8K output, slightly more verbose

### Hybrid Approach
- Use **Claude** for initial analysis and content evaluation
- Use **Gemini** for final LaTeX generation (faster)
- Fallback to other model if primary fails

## Example Prompts

### Full Resume Tailoring (Single-Pass)
See `prompts/gemini-prompts.js` → `LATEX_TAILORING_PROMPT`

### Multi-Agent Approach
See prompts for:
- `JOB_ANALYSIS_PROMPT`
- `PROJECTS_OPTIMIZATION_PROMPT`
- `SKILLS_ENHANCEMENT_PROMPT`
- `EXPERIENCE_REFINEMENT_PROMPT`
- `FINAL_POLISH_PROMPT`

## Measuring Success

### Quantitative Metrics
1. **Keyword Match Rate**: (JD keywords in resume) / (total JD keywords)
   - Target: >80%
2. **Relevance Score**: Based on technology overlap and responsibility match
   - Target: >85/100
3. **ATS Compatibility**: Parsed correctly by ATS simulators
   - Target: 100% parse rate

### Qualitative Assessment
1. Resume reads naturally (not keyword-stuffed)
2. Achievements are compelling and specific
3. Technical depth matches JD requirements
4. Formatting is clean and professional

---

**Last Updated**: 2026-01-24
**Version**: 3.0 (Multi-Model Architecture)

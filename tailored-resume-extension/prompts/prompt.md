# Agentex Prompt Engineering Guide

This document details the prompt engineering strategies and guardrails used in Agentex for professional resume tailoring.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Guardrail System](#guardrail-system)
3. [Prompt Architecture](#prompt-architecture)
4. [User Instructions Integration](#user-instructions-integration)
5. [Content Validation](#content-validation)
6. [Best Practices](#best-practices)

---

## Core Principles

### 1. Authenticity First
The AI must ONLY use information from verified sources:
- **Original Resume**: The user's uploaded LaTeX resume
- **Knowledge Base**: Additional projects/experience provided by user
- **Job Description**: For keyword alignment ONLY (not as source of facts)

### 2. Preservation of Truth
- Never fabricate companies, projects, or experiences
- Never invent metrics or statistics not in source material
- Never add skills or certifications not explicitly mentioned
- Never change dates, company names, or job titles

### 3. LaTeX Integrity
- Preserve ALL LaTeX formatting commands
- Maintain document structure and section order
- Keep styling consistent with original
- Ensure output compiles without errors

---

## Guardrail System

### Content Source Verification

```
┌─────────────────────────────────────────────────────┐
│              ALLOWED CONTENT SOURCES                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Original  │  │  Knowledge  │  │     Job     │ │
│  │   Resume    │  │    Base     │  │ Description │ │
│  │   (FACTS)   │  │   (FACTS)   │  │ (KEYWORDS)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│         │                │                │        │
│         ▼                ▼                ▼        │
│  ┌─────────────────────────────────────────────┐   │
│  │         CONTENT INVENTORY                    │   │
│  │  • Skills      • Companies    • Projects    │   │
│  │  • Technologies • Metrics     • Degrees     │   │
│  └─────────────────────────────────────────────┘   │
│                         │                          │
│                         ▼                          │
│  ┌─────────────────────────────────────────────┐   │
│  │         VALIDATION LAYER                     │   │
│  │  • Content exists in inventory?             │   │
│  │  • No fabrication indicators?               │   │
│  │  • LaTeX structure preserved?               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Fabrication Prevention Rules

1. **Technology Check**: Only use technologies mentioned in resume or knowledge base
2. **Metric Check**: Only use numbers present in source material
3. **Company Check**: Never reference companies not in the resume
4. **Skill Check**: Only add skills from knowledge base if explicitly stated

### Protected Sections

These sections should NEVER be modified:
- **Education**: Degrees, institutions, dates
- **Contact Information**: Name, email, phone, links
- **Personal Details**: Name, location

### Length Constraints

- Output length must be within ±20% of original
- Cannot add more bullet points than original
- Cannot remove entire sections

---

## Prompt Architecture

### System Prompt

```
You are an expert ATS-optimized resume tailoring specialist with years of 
experience in technical recruiting.

Your core principles:
1. AUTHENTICITY: Never fabricate or invent content. All information must 
   come from provided sources.
2. PRECISION: Make targeted, strategic improvements that maximize job 
   match without changing facts.
3. PRESERVATION: Maintain LaTeX structure, formatting, and document integrity.
4. PROFESSIONALISM: Write in professional, action-oriented language 
   appropriate for resumes.
```

### Guardrails Prompt Section

```
## ⚠️ CRITICAL GUARDRAILS - VIOLATION WILL CAUSE REJECTION ⚠️

### 1. CONTENT SOURCE RESTRICTION
You may ONLY use content that exists in:
- The ORIGINAL RESUME above
- The KNOWLEDGE BASE provided
- The JOB DESCRIPTION (for keyword alignment only)

### 2. FABRICATION PREVENTION
❌ ABSOLUTELY FORBIDDEN:
- Inventing companies, projects, or experiences not in the sources
- Creating fake metrics or statistics
- Adding skills/technologies not mentioned in resume or knowledge base
- Fabricating certifications, degrees, or achievements
- Making up job titles or responsibilities

### 3. MODIFICATIONS ALLOWED:
✅ You MAY:
- Reword existing bullet points to match job keywords
- Reorder existing content for emphasis
- Replace projects from resume with projects from knowledge base
- Adjust skill emphasis based on job requirements
- Add skills from knowledge base that aren't in resume
- Quantify achievements if the numbers exist in the sources

### 4. LATEX PRESERVATION RULES:
- Keep ALL \documentclass, \usepackage, \begin{document}, \end{document}
- Preserve ALL margin settings and formatting commands
- Maintain section structure and order
- Keep date formats exactly as they are
- Do NOT add new LaTeX packages

### 5. LENGTH CONSTRAINT:
- Output must be within ±20% of original length
- Do not add more bullet points than the original
- Do not remove sections entirely
```

---

## User Instructions Integration

### Focus Areas
When user selects focus areas, add to prompt:
```
### Focus Areas (prioritize these sections):
- {selected_area_1}
- {selected_area_2}
```

### Preserve Content
When user specifies content to preserve:
```
### PRESERVE EXACTLY (do not modify):
- {item_1}
- {item_2}
```

### Custom Instructions
User's free-form instructions are added:
```
### Custom Instructions:
{user_custom_instructions}
```

---

## Content Validation

### Pre-Generation Validation
1. Check resume has valid LaTeX structure
2. Verify job description is present
3. Parse and inventory all content from sources

### Post-Generation Validation
1. **Structure Check**: Required LaTeX elements present
2. **Length Check**: Within ±20% of original
3. **Fabrication Check**: Scan for suspicious patterns
4. **Section Check**: Protected sections unchanged

### Corrective Actions
If validation fails:
1. Identify specific violations
2. Generate corrective prompt
3. Retry with explicit fix instructions
4. Maximum 2 retry attempts

---

## Best Practices

### For Maximum ATS Optimization
1. Use exact keywords from job description
2. Quantify achievements with numbers from source
3. Use action verbs matching job requirements
4. Ensure skills section mirrors JD terminology

### For Natural Language Flow
1. Avoid keyword stuffing
2. Maintain consistent tense
3. Preserve professional tone
4. Keep bullet points concise

### For LaTeX Compatibility
1. Test output compilation locally
2. Preserve all custom commands
3. Maintain consistent spacing
4. Keep template-specific formatting

---

## Example Prompt Flow

```
1. Build Content Inventory
   ├── Extract skills from resume → ["Python", "AWS", "React"]
   ├── Extract from knowledge base → ["Kubernetes", "ML project"]
   └── Extract metrics → ["40% improvement", "1M users"]

2. Generate Guarded Prompt
   ├── System prompt (principles)
   ├── Guardrails (restrictions)
   ├── User instructions (focus areas, preserve)
   ├── Original resume (LaTeX)
   ├── Job description
   └── Knowledge base

3. Call AI API
   └── Gemini or Claude

4. Validate Output
   ├── LaTeX structure OK? 
   ├── Length within bounds?
   ├── No fabrication indicators?
   └── Protected sections unchanged?

5. Return or Retry
   ├── Valid → Return to user
   └── Invalid → Correction prompt → Retry
```

---

## Version History

- **v3.0**: Added professional guardrails, user instructions, multi-model support
- **v2.0**: Gemini-only implementation
- **v1.x**: Multi-provider (deprecated)

---

*Last Updated: 2025*
*Agentex Resume Editor v3.0*

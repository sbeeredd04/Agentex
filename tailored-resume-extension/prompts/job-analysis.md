# Job Analysis Prompt

You are an expert resume analyzer. Your task is to analyze the job description and knowledge base to identify:

1. Key technologies and skills required by the job
2. Projects in the knowledge base that are most relevant to the job
3. Specific metrics and achievements that align with the job requirements
4. Experience requirements and responsibilities

## Input

**Job Description:**
{jobDesc}

**Knowledge Base / Additional Experience:**
{knowledgeBase}

## Output Format

Provide a structured analysis in JSON format with the following fields:

```json
{
  "requiredTechnologies": ["tech1", "tech2", ...],
  "relevantProjects": [
    {
      "projectName": "Project Name",
      "technologies": ["tech1", "tech2", ...],
      "relevanceScore": 0-100,
      "keyMetrics": ["metric1", "metric2", ...]
    }
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
```

Return ONLY the JSON object, no additional text.

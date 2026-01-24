# 🚀 Quick Start Guide - Agentex v3.0

## What's New in v3.0?

✨ **Multi-Model AI Support** - Choose between Gemini and Claude
🎨 **Professional Dark Theme** - Sleek purple gradient design  
📚 **Enhanced Prompting** - Optimized for better resume tailoring
⚡ **Latest Models** - Gemini 2.0 Flash & Claude 3.5 Sonnet

## Installation (5 minutes)

### Step 1: Load Extension
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `tailored-resume-extension` folder
6. Extension icon should appear in toolbar 🎉

### Step 2: Configure API Keys
1. Click the Agentex extension icon
2. Click the ⚙️ Settings button
3. Add your API key(s):
   - **Gemini**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **Claude** (optional): Get from [Anthropic Console](https://console.anthropic.com/settings/keys)
4. Click "Save Changes"

### Step 3: Test the Extension
1. Select AI Provider (Gemini or Claude)
2. Choose a model (recommended: Gemini 2.0 Flash or Claude 3.5 Sonnet)
3. Upload a LaTeX (.tex) resume file
4. Paste a job description
5. Add knowledge base text (optional but recommended)
6. Click "Generate Resume" 🚀

## Usage Tips

### For Best Results:
- **Use LaTeX format** - Only .tex files are supported
- **Add knowledge base** - Include extra projects and skills
- **Be specific** - Detailed job descriptions get better results
- **Try both models** - Gemini is faster, Claude is more nuanced

### Model Selection Guide:
```
Fast & Efficient → Gemini 2.0 Flash (Experimental)
Detailed & Nuanced → Claude 3.5 Sonnet
Budget Option → Gemini 1.5 Flash
Maximum Quality → Claude 3 Opus
```

## Troubleshooting

### Extension Won't Load
- Check Chrome version (need v90+)
- Verify all files are present in folder
- Check browser console for errors (F12)

### API Key Not Working
- Verify key is correct (no extra spaces)
- Check API quota hasn't been exceeded
- Try regenerating the key
- Make sure proper provider is selected

### Generation Fails
- Check internet connection
- Verify LaTeX file is valid
- Try shorter job description
- Switch to alternative model/provider

### Preview Not Showing
- Clear browser cache
- Reload extension
- Check if file uploaded successfully
- Try a simpler resume first

## Architecture Overview

```
┌─────────────────────────────────────┐
│         Chrome Extension             │
│                                      │
│  ┌────────────┐  ┌────────────────┐│
│  │    UI      │──│  AI Services   ││
│  │ (sidepanel)│  │  - Gemini      ││
│  └────────────┘  │  - Claude      ││
│                  └────────────────┘│
└──────────────────┬──────────────────┘
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
    ┌──────────┐      ┌──────────┐
    │  Gemini  │      │  Claude  │
    │   API    │      │   API    │
    └──────────┘      └──────────┘
```

## Key Features

### 1. Smart Project Replacement
- Analyzes job requirements
- Finds matching projects in knowledge base
- Replaces with ≥70% technology overlap

### 2. ATS Optimization
- Keyword density optimization
- Action verb enhancement
- XYZ format implementation

### 3. LaTeX Preservation
- Maintains original structure
- Preserves formatting
- Ensures 1-page constraint

### 4. Real-time Preview
- View raw LaTeX code
- See compiled PDF
- Compare original vs tailored

## File Structure

```
tailored-resume-extension/
├── manifest.json           # Extension configuration
├── sidepanel.html          # Main UI
├── sidepanel.js            # UI logic
├── style.css               # Dark theme styles
├── config.js               # Settings
├── services/
│   ├── ai-service.js       # Gemini integration
│   ├── claude-service.js   # Claude integration
│   ├── model-config.js     # Model configuration
│   └── file-handler.js     # File processing
├── prompts/
│   └── gemini-prompts.js   # AI prompts
└── server/
    └── serverManager.js    # PDF compilation
```

## Common Use Cases

### Use Case 1: Software Engineer
1. Upload software engineering resume (LaTeX)
2. Paste full-stack developer job description
3. Add projects using React, Node.js, Python to knowledge base
4. Generate with Gemini 2.0 Flash
5. Download tailored resume in 15 seconds ⚡

### Use Case 2: Data Scientist
1. Upload data science resume
2. Paste ML engineer position requirements
3. Add ML projects (TensorFlow, PyTorch) to knowledge base
4. Generate with Claude 3.5 Sonnet for nuanced language
5. Get highly tailored resume in 25 seconds 🎯

### Use Case 3: DevOps Engineer
1. Upload DevOps resume
2. Paste cloud engineer job posting
3. Add AWS/GCP/Azure projects to knowledge base
4. Use Gemini for technical keyword optimization
5. Perfect resume for ATS systems ✅

## Performance Expectations

| Task | Time | Notes |
|------|------|-------|
| File Upload | <1s | Instant |
| Gemini 2.0 Flash | 10-15s | Fastest |
| Claude 3.5 Sonnet | 20-30s | Best quality |
| PDF Compilation | 5-10s | Server-side |
| Download | <1s | Instant |

## Best Practices

### DO ✅
- Upload LaTeX resume files only
- Provide complete job descriptions
- Add relevant projects to knowledge base
- Review generated resume before using
- Test with multiple models to compare
- Keep API keys secure

### DON'T ❌
- Upload PDF or DOCX files (unsupported)
- Use partial/incomplete job descriptions
- Skip knowledge base (reduces quality)
- Share API keys publicly
- Exceed API rate limits
- Forget to save generated resume

## Advanced Features

### Custom Prompts
- Access Settings → Custom Prompt Template
- Modify prompts for industry-specific language
- Reset to defaults anytime
- Test and iterate

### Multi-Step Process
- Job Analysis
- Project Optimization
- Skills Enhancement
- Experience Refinement
- Final Polish

### Fallback System
- Automatic retry on failure
- Switch between providers
- Error handling and user feedback

## Getting Help

### Documentation
- `README.md` - Comprehensive guide
- `PROMPT_ENGINEERING.md` - Prompt optimization
- `ARCHITECTURE.md` - Technical details
- `TESTING.md` - Test procedures

### Support Channels
- GitHub Issues: Bug reports
- Email: Via GitHub profile
- Documentation: In-repo guides

## Success Metrics

After using Agentex, you should see:
- 📈 **80%+ keyword match** with job description
- ⚡ **50% faster** resume customization
- 🎯 **Higher ATS scores** (test with ATS simulators)
- 💼 **More interviews** (track your results!)

## Next Steps

1. ✅ Load extension in Chrome
2. ✅ Add API key(s)
3. ✅ Upload test resume
4. ✅ Try generating with sample job description
5. ✅ Compare original vs tailored version
6. ✅ Download and review
7. ✅ Apply to real jobs!

---

**Version**: 3.0  
**Updated**: 2026-01-24  
**Status**: Ready to Use! 🚀

**Questions?** Check `UPDATE_SUMMARY_V3.md` for detailed changes.

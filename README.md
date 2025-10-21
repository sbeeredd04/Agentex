# Agentex Resume Editor

**AI-Powered Resume Tailoring Chrome Extension**

Agentex is a Chrome extension that uses Google's Gemini AI to intelligently tailor your resume to specific job descriptions, helping you pass ATS (Applicant Tracking System) screenings and land more interviews.

## 🌟 Features

- **Smart Resume Tailoring**: Automatically optimize your resume for any job description
- **LaTeX-Only Format**: Works exclusively with LaTeX (.tex) resume files for professional typesetting
- **Gemini AI-Powered**: Leverages Google's latest Gemini 2.0 Flash model for intelligent optimization
- **Project Replacement**: Intelligently replaces resume projects with more relevant ones from your knowledge base
- **ATS Optimization**: Ensures your resume passes automated screening systems
- **Real-time Preview**: View your changes instantly with side-by-side comparison
- **PDF Generation**: Compile LaTeX resumes to PDF directly in the browser
- **Knowledge Base**: Maintain a repository of additional projects and experience to draw from

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Manual Testing](#manual-testing)
- [Customizing Prompts](#customizing-prompts)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/sbeeredd04/Agentex.git
   cd Agentex
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `tailored-resume-extension` directory

3. **Configure API Key**
   - Click the extension icon in Chrome
   - Click the Settings gear icon
   - Enter your Gemini API key (get one at [Google AI Studio](https://makersuite.google.com/app/apikey))
   - Click "Save Settings"

### From Chrome Web Store (Coming Soon)

_The extension will be available on the Chrome Web Store once it completes the review process._

## 🎯 Quick Start

1. **Open the Extension**
   - Click the Agentex icon in your Chrome toolbar
   - Or use keyboard shortcut: `Ctrl+Shift+Y` (Windows/Linux) or `Cmd+Shift+Y` (Mac)

2. **Upload Your Resume**
   - Click "Choose File" under "Resume Template"
   - Select your LaTeX (.tex) resume file
   - The file will be parsed and displayed in the preview

3. **Add Job Description**
   - Paste the target job description in the "Job Description" text area
   - The system will analyze requirements and keywords

4. **Add Knowledge Base (Optional)**
   - Add any additional projects or experience in the "Knowledge Base" section
   - This helps the AI find better project replacements

5. **Generate Tailored Resume**
   - Click the "Generate Tailored Resume" button
   - Wait for Gemini to process (usually 10-30 seconds)
   - Review the tailored version in the preview pane

6. **Download Results**
   - Switch to "Compiled" view to see the PDF version (LaTeX only)
   - Click "Download" to save your tailored resume

## 🔧 How It Works

### Single-Pass Mode (Default)

For most users, Agentex uses a single-pass approach:

1. **Analysis**: Gemini analyzes your resume, job description, and knowledge base
2. **Optimization**: AI identifies relevant projects, skills, and experiences
3. **Replacement**: Existing content is replaced with better matches from knowledge base
4. **Formatting**: Original structure and formatting are preserved
5. **Output**: Complete tailored resume ready for submission

### Multi-Agent Mode (Advanced)

For power users, enable multi-agent mode in settings for a more thorough approach:

1. **Job Analysis Agent**: Analyzes JD for requirements and priorities
2. **Projects Optimizer**: Replaces projects with relevant knowledge base entries
3. **Skills Enhancer**: Adds missing skills and reorganizes by relevance
4. **Experience Refiner**: Optimizes work experience descriptions
5. **Final Polish Agent**: Integrates all changes and ensures consistency

## 🏗️ Architecture

### Directory Structure

```
Agentex/
├── tailored-resume-extension/     # Main extension code
│   ├── manifest.json              # Chrome extension manifest
│   ├── background.js              # Service worker for extension
│   ├── sidepanel.html             # Main UI
│   ├── sidepanel.js               # UI logic
│   ├── config.js                  # Configuration module
│   ├── services/                  # Core services
│   │   ├── ai-service.js          # Gemini AI integration
│   │   ├── 
│   │   ├── 
│   │   └── file-handler.js        # File upload handling
│   ├── prompts/                   # AI prompts
│   │   └── gemini-prompts.js      # All Gemini prompts
│   ├── server/                    # LaTeX compilation server
│   │   ├── server.js              # Node.js server
│   │   └── serverManager.js       # Server communication
│   ├── lib/                       # Third-party libraries
│   │   └── vendor/                # Vendor scripts
│   └── icons/                     # Extension icons
├── prompt-resume.md               # Prompt documentation
└── README.md                      # This file
```

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **AI Service**: Google Gemini 2.0 Flash API
- **File Processing**: 
  - 
  - PizZip (ZIP handling)
  - 
- **LaTeX Compilation**: Node.js server with LaTeX toolchain
- **Chrome APIs**: Storage, Side Panel, Context Menus

### Key Components

#### AI Service (`services/ai-service.js`)
- Handles all Gemini API communication
- Manages prompt templates
- Implements response cleaning and validation
- Supports both single-pass and multi-agent modes

#### File Handler (`services/file-handler.js`)
- Detects LaTeX file type (.tex)
- Routes to appropriate service
- Validates file structure
- Manages file state

#### Server Manager (`server/serverManager.js`)
- Communicates with LaTeX compilation server
- Handles PDF generation
- Manages server health checks
- Implements retry logic

## ⚙️ Configuration

### API Keys

The extension requires a Gemini API key to function. You can configure it in two ways:

1. **Through Settings UI**
   - Click Settings icon → Enter API key → Save

2. **In config.js** (for development)
   ```javascript
   const config = {
     GEMINI_API_KEY: 'your-api-key-here',
     GEMINI_MODEL: 'gemini-2.0-flash'
   };
   ```

### Custom Prompts

All prompts can be customized through the Settings panel:

1. Open Settings
2. Navigate to "Prompts" tab
3. Edit the desired prompt
4. Save changes
5. Use "Reset to Default" to restore original prompts

See [prompt-resume.md](prompt-resume.md) for detailed prompt documentation.

### Server Configuration

For LaTeX compilation, the extension connects to a remote server:

```javascript
const config = {
  SERVER_URL: 'https://agentex.onrender.com'
};
```

To run your own server:
```bash
cd tailored-resume-extension/server
npm install
npm start
```

## 🧪 Manual Testing

### Prerequisites
- Chrome browser (v90+)
- Valid Gemini API key
- Sample LaTeX resume file (.tex)
- Job description text

### Test Cases

#### 1. Extension Installation
- [ ] Extension loads without errors
- [ ] Icon appears in toolbar
- [ ] Side panel opens when clicked
- [ ] Settings panel accessible

#### 2. File Upload - LaTeX
- [ ] Can select .tex file
- [ ] File name displays correctly
- [ ] Content appears in preview
- [ ] No errors in console

#### 4. Job Description Input
- [ ] Can paste job description
- [ ] Text persists across sessions
- [ ] No character limit issues
- [ ] Formatting preserved

#### 5. Knowledge Base
- [ ] Can add additional projects
- [ ] Text persists across sessions
- [ ] No character limit issues

#### 6. Resume Generation - LaTeX
- [ ] "Generate" button works
- [ ] Loading indicator shows
- [ ] Generation completes successfully
- [ ] Tailored version shows differences
- [ ] LaTeX structure preserved
- [ ] Can switch between original/tailored

#### 8. PDF Preview (LaTeX only)
- [ ] Can switch to "Compiled" view
- [ ] PDF generates successfully
- [ ] PDF displays in viewer
- [ ] Can zoom in/out
- [ ] Can download PDF

#### 9. Download Functionality
- [ ] Can download tailored LaTeX
- [ ] Can download compiled PDF
- [ ] Files open correctly

#### 10. Error Handling
- [ ] Invalid file format shows error
- [ ] Missing API key shows error
- [ ] Network errors handled gracefully
- [ ] Invalid LaTeX shows compilation error

#### 11. Settings Management
- [ ] Can open settings modal
- [ ] Can save API key
- [ ] Can edit prompts
- [ ] Can reset prompts
- [ ] Settings persist across sessions

#### 12. UI/UX
- [ ] All buttons work as expected
- [ ] Tooltips show helpful information
- [ ] Loading states are clear
- [ ] Success/error messages display
- [ ] Responsive layout works

### Acceptance Criteria

**Pass**: All test cases complete successfully
**Fail**: Any critical functionality (1-9) fails
**Warning**: UI/UX issues only

### Reporting Issues

When reporting bugs, include:
- Chrome version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
- Screenshots

## 🎨 Customizing Prompts

### Why Customize?

- Target specific industries (e.g., healthcare, finance)
- Emphasize certain skills or experiences
- Match company culture
- Improve ATS keyword matching

### How to Customize

1. **Open Settings** → Prompts tab
2. **Choose a prompt** to edit
3. **Modify the text**
   - Keep variable placeholders (e.g., `{jobDesc}`)
   - Maintain structure and formatting
   - Add industry-specific instructions
4. **Save and test**
5. **Reset if needed** using "Reset to Default"

### Examples

**For Tech Startups:**
```
Add emphasis on:
- Fast-paced environment experience
- Ownership and initiative
- Cross-functional collaboration
- Startup experience
```

**For Enterprise:**
```
Add emphasis on:
- Large-scale systems
- Team leadership
- Process improvement
- Enterprise tools and practices
```

See [prompt-resume.md](prompt-resume.md) for complete prompt documentation.

## 🐛 Troubleshooting

### Extension Won't Load
**Problem**: Extension shows errors when loading
**Solution**: 
- Check Chrome version (need 90+)
- Verify all files are present
- Check manifest.json for syntax errors
- Reload extension in chrome://extensions

### API Key Not Working
**Problem**: Gemini API errors
**Solution**:
- Verify API key is correct
- Check API key has quota remaining
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to check status
- Try regenerating the API key

### Preview Not Showing
**Problem**: File uploads but preview is blank
**Solution**:
- Check browser console for errors
- Verify file format (.tex only)
- Try a simpler test file
- Clear extension storage and retry

### PDF Compilation Fails
**Problem**: LaTeX won't compile to PDF
**Solution**:
- Check LaTeX syntax in preview
- Verify server is running
- Check network connection
- Look for compilation errors in LaTeX code

### Tailored Resume Looks Wrong
**Problem**: Output doesn't match expectations
**Solution**:
- Review job description for clarity
- Add more detail to knowledge base
- Try customizing prompts
- Use multi-agent mode for complex cases

### Performance Issues
**Problem**: Extension is slow
**Solution**:
- Check internet connection
- Gemini API may be slow (wait longer)
- Try shorter job descriptions
- Clear browser cache

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Reporting Bugs
- Use GitHub Issues
- Include reproduction steps
- Add screenshots if relevant
- Share console errors

### Suggesting Features
- Open a GitHub Issue
- Describe the use case
- Explain expected behavior
- Consider implementation complexity

### Code Contributions
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

### Coding Standards
- Use ES6+ JavaScript
- Add JSDoc comments
- Follow existing code style
- Test thoroughly before submitting

## 📄 License

[MIT License](LICENSE)

Copyright (c) 2025 Agentex

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 📞 Support

- **GitHub Issues**: [github.com/sbeeredd04/Agentex/issues](https://github.com/sbeeredd04/Agentex/issues)
- **Email**: [Contact through GitHub profile](https://github.com/sbeeredd04)

## 🙏 Acknowledgments

- **Google Gemini** for the powerful AI capabilities
- **Chrome Extensions Team** for the excellent platform
- **Open Source Community** for the libraries used

## 📊 Roadmap

- [ ] Chrome Web Store publication
- [ ] Support for more file formats (PDF input)
- [ ] Resume templates library
- [ ] Batch processing for multiple jobs
- [ ] Advanced analytics and insights
- [ ] Integration with job boards
- [ ] Resume scoring and recommendations

---

**Made with ❤️ for job seekers everywhere**

_Last Updated: 2025_

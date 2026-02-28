# Changelog

All notable changes to the Agentex Resume Editor project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025

### Major Changes
- **LaTeX-Only Implementation**: Removed all DOCX/Word document support
- **Simplified Architecture**: Streamlined codebase focused exclusively on LaTeX processing
- **Enhanced LaTeX Support**: Improved LaTeX-specific features and error handling

### Removed
- **DOCX Support**: All Word document processing removed
  - Removed `docx-service.js` and `docx-ai-service.js`
  - Removed Mammoth.js, PizZip, and Docxtemplater libraries
  - Removed DOCX-specific prompts and UI elements
  - Removed DOCX file upload support

### Changed
- **File Handler**: Now exclusively handles LaTeX (.tex) files
- **AI Service**: Removed DOCX-specific methods and prompts
- **UI**: Updated to accept only LaTeX files
- **Documentation**: Updated all docs to reflect LaTeX-only approach

### Rationale
The application now focuses exclusively on LaTeX for professional resume typesetting and ATS optimization. LaTeX provides superior typographic quality and is the industry standard for academic and technical resumes.

---

## [2.0.0] - 2025

### Major Changes
- **Gemini-Only Implementation**: Complete migration to Google Gemini AI
- **Architecture Overhaul**: Comprehensive refactoring for better maintainability
- **Enhanced Documentation**: Complete documentation suite added

### Added

#### Documentation
- **README.md**: Comprehensive project documentation (14.7 KB)
  - Installation and setup guide
  - Feature overview
  - Architecture documentation
  - Configuration guide
  - Troubleshooting section
  - Contributing guidelines

- **TESTING.md**: Manual testing guide (18 KB)
  - 16 comprehensive test suites
  - 40+ individual test cases
  - Step-by-step test procedures
  - Expected results and pass criteria
  - Bug reporting templates
  - Acceptance criteria

- **prompt-resume.md**: Gemini prompts documentation (8.5 KB)
  - All prompts with detailed descriptions
  - Usage examples for each prompt type
  - Customization guide
  - Best practices for prompt engineering

- **ARCHITECTURE.md**: System architecture documentation (11.5 KB)
  - High-level architecture overview
  - Component descriptions
  - Data flow diagrams
  - API integration details
  - Security considerations
  - Performance optimization strategies

- **CHANGELOG.md**: This file

#### Code Quality
- **JSDoc Comments**: Added comprehensive JSDoc comments to all major functions
  - `config.js`: Complete module documentation
  - `services/ai-service.js`: Full class and method documentation
  - `services/docx-ai-service.js`: Complete documentation
  - `services/file-handler.js`: Partial documentation

- **Error Messages**: Improved error messages throughout for better UX

- **Code Organization**: Better separation of concerns and modular structure

#### Configuration
- **prompts/gemini-prompts.js**: Centralized prompt management
- **Enhanced .gitignore**: Comprehensive ignore patterns

### Changed

#### Core Services
- **ai-service.js**: Complete rewrite (643 → 815 lines)
  - Removed all Groq integration code
  - Simplified to Gemini-only implementation
  - Improved error handling
  - Better logging and debugging
  - Cleaner method structure
  - Support for both single-pass and multi-agent modes

- **config.js**: Enhanced configuration module
  - Removed Groq API key
  - Added comprehensive JSDoc comments
  - Better organization with clear documentation

- **docx-ai-service.js**: Enhanced DOCX service
  - Added comprehensive JSDoc comments
  - Improved error handling
  - Better response cleaning

#### UI Components
- **sidepanel.js**: Major cleanup
  - Removed 45+ lines of Groq-related code
  - Simplified model selector
  - Updated API key management to Gemini-only
  - Improved validation logic
  - Added JSDoc comments to key functions

- **sidepanel.html**: UI simplification
  - Removed Groq model options from dropdown
  - Removed Groq API key input field
  - Updated model selector to show only Gemini
  - Added informative model description
  - Cleaner, more focused UI

### Removed
- **Groq Integration**: All Groq/Grok references and code removed
  - Groq API key field
  - Groq model selection options
  - Groq API endpoints
  - Groq-specific logic
  - Beta/disabled feature notices

- **Backup Files**: Removed temporary backup files
  - `ai-service.js.bak`

### Fixed
- API key validation now correctly requires only Gemini key
- Model selection simplified to avoid confusion
- Settings modal properly saves only Gemini configuration

### Security
- API keys properly stored in Chrome encrypted storage
- No sensitive data logged to console
- HTTPS-only API communication
- Enhanced .gitignore to exclude sensitive files

### Performance
- Reduced code complexity
- Faster model initialization
- Improved response handling

## [1.x] - Previous Versions

### Features (Deprecated)
- Multi-provider AI support (Gemini + Groq)
- Complex model selection logic
- Beta features for Groq models

---

## Migration Guide

### From v1.x to v2.0

#### For Users
1. **API Key Update**: Only Gemini API key is now required
   - Remove Groq API key from settings
   - Ensure Gemini API key is configured

2. **Model Selection**: Model selector now shows only Gemini
   - No action required
   - System automatically uses Gemini 2.0 Flash

3. **Settings**: Simplified settings panel
   - Only Gemini API key field
   - Custom prompts still available

#### For Developers
1. **Code Changes**:
   - All Groq references removed
   - AI service now extends only Gemini functionality
   - Update any custom integrations to use Gemini API

2. **Configuration**:
   - Update `config.js` to use new structure
   - Remove Groq API configuration

3. **Testing**:
   - Use TESTING.md for comprehensive test procedures
   - Verify all Gemini integration points

---

## Roadmap

### v2.1 (Planned)
- [ ] Chrome Web Store publication
- [ ] Performance optimizations
- [ ] Additional resume templates
- [ ] Improved PDF compilation

### v2.2 (Planned)
- [ ] Batch processing for multiple jobs
- [ ] Resume analytics and scoring
- [ ] Integration with job boards
- [ ] Cloud sync for settings

### v3.0 (Future)
- [ ] Support for more file formats (PDF input)
- [ ] Advanced AI features
- [ ] Collaboration features
- [ ] Mobile support

---

## Contributing

See [README.md](README.md) for contribution guidelines.

## License

MIT License - See LICENSE file for details

---

*Last Updated: 2025*

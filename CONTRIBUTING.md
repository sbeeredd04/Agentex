# Contributing to Agentex Resume Editor

Thank you for your interest in contributing to Agentex! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

Before creating an issue, please:
1. Check existing issues to avoid duplicates
2. Use the issue templates when available
3. Provide detailed information including:
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, Chrome version, etc.)
   - Error messages or screenshots

### Development Process

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/yourusername/Agentex.git
   cd Agentex
   ```

2. **Create a Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number
   ```

3. **Set Up Development Environment**:
   ```bash
   cd tailored-resume-extension/server
   npm install
   npm run dev
   ```

4. **Make Changes**:
   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed

5. **Test Your Changes**:
   - Load the extension in Chrome (developer mode)
   - Test all affected functionality
   - Run server tests if available

6. **Commit and Push**:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   git push origin your-branch-name
   ```

7. **Create Pull Request**:
   - Use the PR template
   - Provide clear description of changes
   - Link related issues

## 📝 Code Style Guidelines

### JavaScript

- Use ES6+ features and modern async/await patterns
- Use meaningful variable and function names
- Add JSDoc comments for functions and classes
- Handle errors properly with try-catch blocks

```javascript
/**
 * Process uploaded file and extract content
 * @param {File} file - The uploaded file
 * @returns {Promise<Object>} Processing result
 */
async function processFile(file) {
  try {
    // Implementation
  } catch (error) {
    console.error('[ProcessFile] Error:', error);
    throw error;
  }
}
```

### HTML/CSS

- Use semantic HTML elements
- Follow BEM naming convention for CSS classes
- Use CSS custom properties (variables) for consistency
- Ensure responsive design

### Extension Development

- Follow Chrome Extension best practices
- Use appropriate permissions (minimal required)
- Handle extension lifecycle events properly
- Implement proper error boundaries

## 🏗️ Architecture Guidelines

### Adding New Features

1. **AI Service Integration**:
   - Extend the `AIService` class
   - Add model-specific implementations
   - Update the model selector UI

2. **File Format Support**:
   - Create processor in `services/`
   - Update `FileHandler` class
   - Add appropriate UI elements

3. **Server Endpoints**:
   - Add routes in `server/server.js`
   - Implement proper CORS handling
   - Add request validation

### Component Structure

```
New Feature/
├── service/          # Core logic
├── ui/              # User interface
├── tests/           # Unit tests
└── docs/            # Documentation
```

## 🧪 Testing

### Manual Testing

1. **Extension Loading**:
   - Test installation and permissions
   - Verify side panel functionality
   - Check context menu integration

2. **File Processing**:
   - Test with various file formats
   - Verify error handling for invalid files
   - Check file size limits

3. **AI Integration**:
   - Test with different models
   - Verify API key management
   - Check error handling for API failures

4. **PDF Generation**:
   - Test LaTeX compilation
   - Test DOCX conversion
   - Verify output quality

### Automated Testing

Currently, the project relies on manual testing. We welcome contributions to add:
- Unit tests for core services
- Integration tests for API endpoints
- End-to-end tests for user workflows

## 🔒 Security Guidelines

### API Key Management

- Never commit API keys to the repository
- Use Chrome Storage API for secure storage
- Validate API keys before use

### File Processing

- Validate file types and sizes
- Use temporary files with unique names
- Clean up files after processing

### Server Security

- Implement proper CORS policies
- Validate all input data
- Use secure file handling practices

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for all public functions
- Document complex algorithms and business logic
- Update README for new features

### User Documentation

- Update usage instructions for new features
- Add troubleshooting information
- Include screenshots for UI changes

## 🐛 Issue Labels

- `bug`: Something isn't working correctly
- `enhancement`: New feature or improvement
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `security`: Security-related issues

## 🎯 Priority Guidelines

### High Priority
- Security vulnerabilities
- Data loss or corruption issues
- Extension breaking changes
- Server crashes

### Medium Priority
- Feature enhancements
- Performance improvements
- UI/UX improvements
- Documentation updates

### Low Priority
- Code refactoring
- Minor bug fixes
- Style improvements

## 📋 Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Manual testing completed
- [ ] All existing features work
- [ ] New features tested

## Screenshots
If applicable, add screenshots

## Additional Notes
Any additional information
```

## 🏆 Recognition

Contributors will be recognized in:
- README acknowledgments
- Release notes for significant contributions
- GitHub contributor statistics

## 📞 Getting Help

- Open an issue for questions
- Join discussions in existing issues
- Check the documentation first

## 📋 Checklist for Contributors

Before submitting your contribution:

- [ ] Code follows the style guidelines
- [ ] Self-review of the code completed
- [ ] Code is commented appropriately
- [ ] Documentation has been updated
- [ ] Changes generate no new warnings
- [ ] Manual testing has been performed
- [ ] Security implications have been considered

Thank you for contributing to Agentex! 🚀
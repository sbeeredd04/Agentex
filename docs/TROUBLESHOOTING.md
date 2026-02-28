# Troubleshooting & FAQ

This document provides solutions to common issues and frequently asked questions about Agentex Resume Editor.

## 🚨 Common Issues

### Extension Installation Issues

#### Issue: Extension won't load in Chrome
**Symptoms**: Extension fails to install or doesn't appear in chrome://extensions/

**Solutions**:
1. **Enable Developer Mode**:
   - Go to `chrome://extensions/`
   - Toggle "Developer mode" in the top right
   - Click "Load unpacked" and select the extension folder

2. **Check Manifest Syntax**:
   ```bash
   # Validate JSON syntax
   node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json')))"
   ```

3. **Clear Chrome Cache**:
   - Clear browsing data
   - Restart Chrome
   - Reload extension

#### Issue: Permission errors on installation
**Error**: "Could not load extension due to permission errors"

**Solutions**:
1. **Check File Permissions**:
   ```bash
   chmod -R 755 tailored-resume-extension/
   ```

2. **Run Chrome with Admin Rights** (Windows):
   - Right-click Chrome shortcut
   - Select "Run as administrator"

### Server Issues

#### Issue: Server won't start on port 3000
**Error**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
1. **Find and Kill Process**:
   ```bash
   # Find process using port 3000
   lsof -i :3000
   # Kill the process
   kill -9 <PID>
   ```

2. **Use Different Port**:
   ```bash
   export PORT=3001
   npm start
   ```

3. **Check for System Services**:
   ```bash
   # Check what's running on port 3000
   netstat -tlnp | grep :3000
   ```

#### Issue: LaTeX compilation fails
**Error**: `pdflatex: command not found`

**Solutions**:
1. **Install TeX Live (Ubuntu/Debian)**:
   ```bash
   sudo apt-get update
   sudo apt-get install texlive texlive-latex-extra texlive-fonts-recommended
   ```

2. **Install MacTeX (macOS)**:
   ```bash
   brew install --cask mactex
   # Add to PATH
   export PATH="/Library/TeX/texbin:$PATH"
   ```

3. **Install MiKTeX (Windows)**:
   - Download from https://miktex.org/
   - Ensure it's added to system PATH

#### Issue: DOCX conversion fails
**Error**: `LibreOffice conversion failed`

**Solutions**:
1. **Install LibreOffice**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install libreoffice
   
   # macOS
   brew install --cask libreoffice
   
   # Windows - Download from https://www.libreoffice.org/
   ```

2. **Check LibreOffice Path**:
   ```bash
   which libreoffice
   # Should return path to executable
   ```

3. **Restart Server** after LibreOffice installation

### AI Integration Issues

#### Issue: API key not working
**Error**: `API key not configured` or `Invalid API key`

**Solutions**:
1. **Verify API Key Format**:
   - Gemini keys start with `AIza`
   - Groq keys start with `gsk_`

2. **Check API Key Storage**:
   ```javascript
   // In browser console
   chrome.storage.local.get(['geminiApiKey', 'groqApiKey'], (result) => {
     console.log(result);
   });
   ```

3. **Re-enter API Keys**:
   - Open extension settings
   - Clear existing keys
   - Enter new valid keys

#### Issue: AI generation takes too long
**Symptoms**: Requests timeout or hang indefinitely

**Solutions**:
1. **Check Network Connection**
2. **Try Different Model**:
   - Switch from Groq to Gemini or vice versa
   - Use smaller models for faster response

3. **Reduce Content Length**:
   - Shorten job description
   - Simplify resume content

#### Issue: Poor AI optimization results
**Symptoms**: Generated content is not relevant or of poor quality

**Solutions**:
1. **Improve Input Quality**:
   - Provide detailed job description
   - Add relevant keywords to knowledge base
   - Use clear, well-formatted original resume

2. **Try Different Models**:
   - Gemini 2.0 Flash for comprehensive optimization
   - DeepSeek models for technical positions

3. **Refine Knowledge Base**:
   - Add specific achievements
   - Include relevant skills and technologies
   - Provide context for experiences

### File Processing Issues

#### Issue: File upload fails
**Error**: `Invalid file format` or `File processing failed`

**Solutions**:
1. **Check File Format**:
   - Only `.tex` and `.docx` files supported
   - Ensure file extension is correct

2. **Verify File Size**:
   ```bash
   # Check file size (should be < 10MB)
   ls -lh your-resume.docx
   ```

3. **Test File Integrity**:
   - Try opening file in native application
   - Check for corruption

#### Issue: DOCX content extraction fails
**Error**: `Failed to extract text from DOCX`

**Solutions**:
1. **Check DOCX Format**:
   - Ensure it's a valid DOCX file (not DOC)
   - Try saving as new DOCX from Word

2. **Simplify Document**:
   - Remove complex formatting
   - Avoid embedded objects
   - Use standard fonts

3. **Alternative Approach**:
   - Export as plain text and use LaTeX format

#### Issue: LaTeX parsing errors
**Error**: `LaTeX syntax error` or compilation fails

**Solutions**:
1. **Validate LaTeX Syntax**:
   ```latex
   % Ensure document has proper structure
   \documentclass{article}
   \begin{document}
   % Your content here
   \end{document}
   ```

2. **Check for Special Characters**:
   - Escape special characters: `& % $ # _ { }`
   - Use proper encoding (UTF-8)

3. **Test Locally**:
   ```bash
   pdflatex your-resume.tex
   ```

## ❓ Frequently Asked Questions

### General Questions

**Q: Is my resume data secure?**
A: Yes, all processing is done locally. Only AI prompts are sent to external services, not your complete resume.

**Q: Do I need to pay for AI services?**
A: You need your own API keys for Gemini and Groq services. Check their pricing models.

**Q: Can I use this offline?**
A: The local server works offline, but AI optimization requires internet connection for API calls.

**Q: What file formats are supported?**
A: Currently supports LaTeX (.tex) and DOCX (.docx) files.

### Technical Questions

**Q: Why does PDF generation take so long?**
A: LaTeX compilation and DOCX conversion can be resource-intensive. Processing time depends on document complexity and system specs.

**Q: Can I run this on a different port?**
A: Yes, set the `PORT` environment variable: `export PORT=3001`

**Q: Does this work on other browsers?**
A: Currently only Chrome is supported due to Chrome Extension API requirements.

**Q: Can I customize the AI prompts?**
A: Currently prompts are built-in, but you can modify the source code in `services/ai-service.js`.

### Troubleshooting Questions

**Q: Extension icon is grayed out**
A: This usually means the extension failed to load. Check the Chrome console for errors and reload the extension.

**Q: PDF download doesn't work**
A: Check that the server is running and accessible at `http://localhost:3000`. Also verify file compilation was successful.

**Q: AI generation fails silently**
A: Check browser console for errors. Often this is due to API key issues or network connectivity.

## 🔧 Diagnostic Tools

### Check System Requirements
```bash
#!/bin/bash
echo "=== System Diagnostics ==="

echo "Node.js version:"
node --version

echo "npm version:"
npm --version

echo "pdflatex available:"
which pdflatex

echo "LibreOffice available:"
which libreoffice

echo "Port 3000 available:"
netstat -tlnp | grep :3000

echo "Chrome Extensions:"
ls /Applications/Google\ Chrome.app 2>/dev/null || echo "Chrome path check needed"
```

### Debug Extension
```javascript
// Run in browser console
// Check extension status
chrome.management.getAll((extensions) => {
  console.log('Installed extensions:', extensions.filter(ext => ext.name.includes('Agentex')));
});

// Check storage
chrome.storage.local.get(null, (result) => {
  console.log('Extension storage:', result);
});

// Check permissions
chrome.permissions.getAll((permissions) => {
  console.log('Extension permissions:', permissions);
});
```

### Server Health Check
```bash
# Test server endpoints
curl -X GET http://localhost:3000/health
curl -X POST http://localhost:3000/compile \
  -H "Content-Type: application/json" \
  -d '{"latex": "\\documentclass{article}\\begin{document}Test\\end{document}"}'
```

## 📞 Getting Help

### Before Asking for Help
1. Check this troubleshooting guide
2. Review error messages carefully
3. Check browser console for errors
4. Verify system requirements are met
5. Try restarting the server and reloading the extension

### Where to Get Help
1. **GitHub Issues**: Report bugs and request features
2. **Discussions**: Ask questions and share tips
3. **Documentation**: Check API.md and README.md for details

### When Reporting Issues
Include:
- Operating system and version
- Chrome browser version
- Extension version
- Server logs
- Browser console errors
- Steps to reproduce the issue
- Expected vs actual behavior

### Log Collection
```bash
# Collect server logs
pm2 logs latex-server --lines 50

# Or if running directly
tail -f server/logs/combined.log

# Chrome extension logs
# Open Chrome DevTools in extension popup/side panel
# Check Console tab for errors
```

## 🔄 Recovery Procedures

### Reset Extension State
```javascript
// Clear all extension data
chrome.storage.local.clear(() => {
  console.log('Extension storage cleared');
  location.reload();
});
```

### Reset Server State
```bash
# Stop server
pm2 stop latex-server

# Clear temp files
rm -rf /tmp/pdf/*
rm -rf /tmp/*.tex /tmp/*.aux /tmp/*.log

# Restart server
pm2 start latex-server
```

### Complete Reinstall
```bash
# Remove extension from Chrome
# Delete extension files
rm -rf tailored-resume-extension

# Re-clone repository
git clone https://github.com/sbeeredd04/Agentex.git

# Reinstall dependencies
cd Agentex/tailored-resume-extension/server
npm install

# Restart setup
./setup.sh
```

---

If you continue to experience issues after following this guide, please open an issue on GitHub with detailed information about your problem.
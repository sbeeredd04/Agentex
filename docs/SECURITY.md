# Security Policy

## 🔒 Security Overview

Agentex Resume Editor prioritizes user security and data privacy. This document outlines our security measures, policies, and procedures.

## 🛡️ Security Measures

### Data Privacy

#### Local Processing
- **No External Data Storage**: User files and content are processed locally
- **Temporary File Handling**: Files are temporarily stored with UUID naming and cleaned up after processing
- **API Communication**: Only AI prompts and responses are sent to external AI services

#### API Key Management
- **Local Storage**: API keys are stored locally using Chrome Storage API
- **No Code Storage**: API keys are never hardcoded in the application
- **User Control**: Users manage their own API keys

### Network Security

#### CORS Policy
```javascript
// Allowed origins
const allowedOrigins = [
  'chrome-extension://jdinfdcbfmnnoanojkbokdhjpjognpmk',
  'https://agentex.vercel.app',
  'http://localhost:3000'
];
```

#### Local Server
- **Localhost Only**: Server runs on localhost (127.0.0.1) only
- **No External Access**: Server is not accessible from external networks
- **Port Isolation**: Uses dedicated port (3000) for API communication

### File Security

#### Upload Validation
```javascript
// Supported file types
const ALLOWED_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

// File size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

#### Temporary File Management
- **UUID Naming**: Files use UUID-based naming to prevent conflicts
- **Automatic Cleanup**: Files are automatically deleted after processing
- **Secure Directories**: Files stored in `/tmp` with appropriate permissions

```javascript
// File cleanup example
const extensions = ['.tex', '.log', '.aux', '.out'];
for (const ext of extensions) {
  await fs.unlink(path.join(TMP_DIR, `${fileId}${ext}`)).catch(() => {});
}
```

## 🔐 Authentication and Authorization

### Chrome Extension Permissions

#### Minimal Permissions
```json
{
  "permissions": [
    "activeTab",
    "scripting", 
    "sidePanel",
    "storage",
    "contextMenus",
    "unlimitedStorage"
  ]
}
```

#### Host Permissions
```json
{
  "host_permissions": [
    "http://localhost:3000/*",
    "https://agentex.vercel.app/*"
  ]
}
```

### API Security

#### Rate Limiting
- **Request Queuing**: Only one compilation request per client at a time
- **Timeout Protection**: 120-second timeout for long-running operations
- **Memory Limits**: 10MB limit for JSON payloads

#### Input Validation
```javascript
// Validate LaTeX input
if (!latex || typeof latex !== 'string') {
  return res.status(400).json({ 
    success: false, 
    error: 'Invalid LaTeX content' 
  });
}
```

## 🚨 Vulnerability Reporting

### Reporting Process

1. **Email**: Send security reports to [security email - to be added]
2. **Include**:
   - Detailed description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fixes (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Fix Timeline**: Varies based on severity

### Severity Levels

#### Critical
- Remote code execution
- Unauthorized file access
- API key exposure

#### High
- Local privilege escalation
- Data corruption
- Service denial

#### Medium
- Information disclosure
- Input validation bypass
- Minor security misconfigurations

#### Low
- Security best practice violations
- Minor information leaks

## 🛠️ Security Best Practices

### For Users

#### API Key Security
1. **Generate Dedicated Keys**: Use separate API keys for Agentex
2. **Regular Rotation**: Rotate API keys periodically
3. **Monitor Usage**: Check API usage for unusual activity
4. **Secure Storage**: Don't share or expose API keys

#### Safe Usage
1. **Trusted Content**: Only upload your own resume files
2. **Job Descriptions**: Verify job descriptions from legitimate sources
3. **Review Output**: Always review AI-generated content before use
4. **Local Network**: Use on trusted networks only

### For Developers

#### Secure Coding
```javascript
// Always validate inputs
function validateInput(input) {
  if (!input || typeof input !== 'string' || input.length > MAX_LENGTH) {
    throw new Error('Invalid input');
  }
  return input.trim();
}

// Handle errors securely
try {
  const result = await processFile(file);
} catch (error) {
  console.error('[Security] Processing error:', error.message); // Don't log sensitive data
  throw new Error('Processing failed'); // Generic error message
}
```

#### File Handling
```javascript
// Secure file operations
async function secureFileWrite(content, filePath) {
  // Validate file path
  if (!filePath.startsWith(TMP_DIR)) {
    throw new Error('Invalid file path');
  }
  
  // Write with proper permissions
  await fs.writeFile(filePath, content, { mode: 0o600 });
}
```

## 🔍 Security Monitoring

### Logging

#### What We Log
- File processing events
- API request/response metadata (not content)
- Error conditions
- Server startup/shutdown events

#### What We Don't Log
- File contents
- API keys
- Personal information
- User inputs

```javascript
// Example secure logging
console.log('[Server] File processed:', {
  fileId: fileId,
  type: file.mimetype,
  size: file.size,
  timestamp: Date.now()
  // Note: file content is NOT logged
});
```

### Error Handling

#### Secure Error Messages
```javascript
// Good: Generic error message
res.status(500).json({
  success: false,
  error: 'Processing failed'
});

// Bad: Exposing system details
res.status(500).json({
  success: false,
  error: error.stack // Contains system information
});
```

## 🔄 Security Updates

### Update Process

1. **Security Patches**: Immediate deployment for critical issues
2. **Version Updates**: Regular updates for dependencies
3. **Security Reviews**: Periodic security audits

### Notification

- **Critical**: Immediate notification to users
- **High**: Notification with next update
- **Medium/Low**: Included in release notes

## 🛡️ Compliance and Standards

### Web Security

#### Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
}
```

#### HTTPS Requirements
- **AI APIs**: All external API calls use HTTPS
- **Local Development**: HTTP allowed for localhost only
- **Production**: HTTPS enforced for all external resources

### Data Protection

#### GDPR Compliance
- **No Personal Data Storage**: Extension doesn't store personal data externally
- **User Control**: Users control all data processing
- **Right to Deletion**: Users can clear all local data

#### Privacy by Design
- **Minimal Data Collection**: Only necessary data is processed
- **Purpose Limitation**: Data used only for resume optimization
- **Transparency**: Clear information about data usage

## 🧪 Security Testing

### Regular Testing

#### Automated Checks
- Dependency vulnerability scanning
- Code quality analysis
- Permission auditing

#### Manual Testing
- Penetration testing for server endpoints
- File upload security testing
- API integration security review

### Security Checklist

- [ ] Input validation implemented
- [ ] Output sanitization in place
- [ ] Error messages don't expose sensitive information
- [ ] Files are properly cleaned up
- [ ] API keys are stored securely
- [ ] CORS policies are restrictive
- [ ] Dependencies are up to date
- [ ] Permissions are minimal

## 📋 Incident Response

### Response Plan

1. **Detection**: Identify security incident
2. **Assessment**: Evaluate impact and scope
3. **Containment**: Limit damage and exposure
4. **Eradication**: Remove vulnerability
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Document and improve

### Communication

- **Users**: Notify affected users promptly
- **Stakeholders**: Update relevant parties
- **Documentation**: Update security measures

## 🔗 Security Resources

### External Resources

- [Chrome Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Tools and Libraries

- **Helmet.js**: Security headers for Express
- **Rate Limiting**: Express rate limit middleware
- **Input Validation**: Joi or similar validation libraries

## 📞 Contact

For security-related questions or concerns:
- Create an issue with the `security` label
- Follow responsible disclosure practices
- Provide detailed information for faster resolution

---

**Remember**: Security is a shared responsibility. Users, developers, and maintainers all play a role in keeping Agentex secure.
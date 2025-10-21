# Manual Testing Guide for Agentex Resume Editor

This document provides comprehensive manual testing procedures to validate the functionality of the Agentex Resume Editor after making changes or updates.

## 📋 Test Prerequisites

### Required Items
- [ ] Chrome browser (version 90 or higher)
- [ ] Valid Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- [ ] Sample LaTeX resume file (.tex)
- [ ] Sample DOCX resume file (.docx)
- [ ] Sample job description text
- [ ] Optional: Additional projects/experience for knowledge base

### Setup Steps
1. Load the unpacked extension in Chrome
2. Configure your Gemini API key in Settings
3. Prepare test files in an accessible directory

---

## 🧪 Test Suites

### Suite 1: Extension Installation and Setup

#### Test 1.1: Extension Loading
**Objective**: Verify extension loads without errors

**Steps**:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `tailored-resume-extension` directory

**Expected Results**:
- ✅ Extension loads successfully
- ✅ No errors in console
- ✅ Extension icon appears in toolbar
- ✅ Extension shows as "Enabled"

**Pass Criteria**: All expected results met

---

#### Test 1.2: Side Panel Opens
**Objective**: Verify side panel functionality

**Steps**:
1. Click the Agentex icon in Chrome toolbar
2. Alternatively, use keyboard shortcut (`Ctrl+Shift+Y` or `Cmd+Shift+Y`)

**Expected Results**:
- ✅ Side panel opens on the right side
- ✅ All UI elements are visible
- ✅ No layout issues or overlapping elements
- ✅ Branding and logo appear correctly

**Pass Criteria**: Panel opens smoothly with all elements visible

---

#### Test 1.3: Settings Modal Access
**Objective**: Verify settings modal functionality

**Steps**:
1. Open the side panel
2. Click the Settings gear icon

**Expected Results**:
- ✅ Settings modal opens
- ✅ Modal has close button
- ✅ API key input field is visible
- ✅ Prompt sections are accessible
- ✅ Save button is present

**Pass Criteria**: Settings modal opens and displays correctly

---

### Suite 2: API Key Configuration

#### Test 2.1: API Key Input
**Objective**: Verify API key can be saved

**Steps**:
1. Open Settings
2. Enter a valid Gemini API key
3. Click "Save Settings"

**Expected Results**:
- ✅ Success message appears
- ✅ Modal closes
- ✅ API key persists across page reloads
- ✅ No errors in console

**Pass Criteria**: API key saves successfully

---

#### Test 2.2: Invalid API Key Handling
**Objective**: Verify error handling for invalid API keys

**Steps**:
1. Open Settings
2. Enter an invalid API key
3. Save settings
4. Try to generate a resume

**Expected Results**:
- ✅ Settings save without error
- ✅ Generation fails with clear error message
- ✅ Error indicates API key issue
- ✅ User can return to settings

**Pass Criteria**: Clear error message for invalid API key

---

### Suite 3: File Upload - LaTeX

#### Test 3.1: LaTeX File Selection
**Objective**: Verify LaTeX file can be uploaded

**Steps**:
1. Click "Choose File" button
2. Select a `.tex` file
3. Wait for upload to complete

**Expected Results**:
- ✅ File name displays below button
- ✅ Success indicator appears
- ✅ Content appears in raw preview
- ✅ LaTeX formatting is preserved
- ✅ No errors in console

**Pass Criteria**: File uploads and displays correctly

---

#### Test 3.2: LaTeX Content Validation
**Objective**: Verify LaTeX content is parsed correctly

**Steps**:
1. Upload a LaTeX resume
2. Check the raw preview
3. Look for sections (Experience, Projects, Skills)

**Expected Results**:
- ✅ All resume sections visible
- ✅ LaTeX commands preserved
- ✅ Formatting intact
- ✅ No missing content

**Pass Criteria**: Complete LaTeX content visible

---

#### Test 3.3: Invalid LaTeX File
**Objective**: Verify error handling for invalid files

**Steps**:
1. Try to upload a non-LaTeX file (e.g., `.txt`, `.pdf`)
2. Try to upload a corrupted `.tex` file

**Expected Results**:
- ✅ Error message appears
- ✅ Upload is rejected
- ✅ User can try again
- ✅ No system crash

**Pass Criteria**: Graceful error handling

---

### Suite 4: File Upload - DOCX

#### Test 4.1: DOCX File Selection
**Objective**: Verify DOCX file can be uploaded

**Steps**:
1. Click "Choose File" button
2. Select a `.docx` file
3. Wait for upload to complete

**Expected Results**:
- ✅ File name displays
- ✅ Success indicator appears
- ✅ Content extracted and shown in preview
- ✅ Basic formatting preserved
- ✅ No errors in console

**Pass Criteria**: DOCX uploads and content extracts

---

#### Test 4.2: DOCX Content Extraction
**Objective**: Verify DOCX parsing accuracy

**Steps**:
1. Upload a DOCX resume
2. Compare preview with original file
3. Check for missing sections or content

**Expected Results**:
- ✅ All text content extracted
- ✅ Section headers preserved
- ✅ Bullet points maintained
- ✅ Reasonable formatting
- ✅ No garbled text

**Pass Criteria**: Content matches original

---

### Suite 5: Job Description Input

#### Test 5.1: Job Description Entry
**Objective**: Verify job description input functionality

**Steps**:
1. Paste a job description in the text area
2. Reload the page
3. Check if text persists

**Expected Results**:
- ✅ Can paste long text without issues
- ✅ Text persists across reloads
- ✅ Formatting is maintained
- ✅ No character limit errors

**Pass Criteria**: Job description saves reliably

---

#### Test 5.2: Special Characters
**Objective**: Verify handling of special characters in JD

**Steps**:
1. Enter a job description with special characters
2. Include symbols, emojis, and Unicode
3. Generate resume with this input

**Expected Results**:
- ✅ Special characters accepted
- ✅ No parsing errors
- ✅ Generation works normally
- ✅ Output handles characters correctly

**Pass Criteria**: Special characters handled properly

---

### Suite 6: Knowledge Base

#### Test 6.1: Knowledge Base Entry
**Objective**: Verify knowledge base input

**Steps**:
1. Add additional projects in knowledge base
2. Include technologies and metrics
3. Reload page to test persistence

**Expected Results**:
- ✅ Text saves successfully
- ✅ Persists across sessions
- ✅ No character limits issues
- ✅ Formatting maintained

**Pass Criteria**: Knowledge base saves reliably

---

### Suite 7: Resume Generation - LaTeX

#### Test 7.1: Basic LaTeX Generation
**Objective**: Verify resume generation works

**Steps**:
1. Upload LaTeX resume
2. Add job description
3. Click "Generate Resume"
4. Wait for completion

**Expected Results**:
- ✅ Loading indicator shows
- ✅ Generation completes (10-30 seconds)
- ✅ Tailored resume appears
- ✅ Success message displays
- ✅ Can view tailored version

**Pass Criteria**: Generation succeeds

---

#### Test 7.2: LaTeX Structure Preservation
**Objective**: Verify LaTeX structure is maintained

**Steps**:
1. Generate tailored resume
2. Compare structure with original
3. Check LaTeX commands

**Expected Results**:
- ✅ Document structure preserved
- ✅ LaTeX commands intact
- ✅ Sections in same order
- ✅ Formatting consistent
- ✅ Compiles successfully

**Pass Criteria**: Structure preserved

---

#### Test 7.3: Project Replacement
**Objective**: Verify project replacement from knowledge base

**Steps**:
1. Upload resume with projects
2. Add relevant projects in knowledge base
3. Provide job description matching knowledge base
4. Generate resume

**Expected Results**:
- ✅ Irrelevant projects replaced
- ✅ Knowledge base projects used
- ✅ Technology alignment improved
- ✅ Metrics from knowledge base included

**Pass Criteria**: Projects replaced intelligently

---

#### Test 7.4: Keyword Optimization
**Objective**: Verify keyword optimization

**Steps**:
1. Note key technologies in job description
2. Generate tailored resume
3. Search for those keywords in output

**Expected Results**:
- ✅ Job description keywords present
- ✅ Skills section updated
- ✅ Project descriptions enhanced
- ✅ Experience refined

**Pass Criteria**: Keywords well-represented

---

### Suite 8: Resume Generation - DOCX

#### Test 8.1: Basic DOCX Generation
**Objective**: Verify DOCX resume generation

**Steps**:
1. Upload DOCX resume
2. Add job description
3. Click "Generate Resume"
4. Wait for completion

**Expected Results**:
- ✅ Loading indicator shows
- ✅ Generation completes
- ✅ Tailored version appears
- ✅ Success message displays
- ✅ Content updated

**Pass Criteria**: DOCX generation works

---

#### Test 8.2: DOCX Format Preservation
**Objective**: Verify formatting is preserved

**Steps**:
1. Generate tailored DOCX
2. Compare with original
3. Check formatting elements

**Expected Results**:
- ✅ Section headers maintained
- ✅ Bullet points preserved
- ✅ Dates unchanged
- ✅ Contact info intact
- ✅ Overall structure same

**Pass Criteria**: Format preserved

---

### Suite 9: Preview Functionality

#### Test 9.1: Preview Toggle
**Objective**: Verify preview switching

**Steps**:
1. Upload a resume
2. Switch between "Raw" and "Compiled" views
3. Test on both original and generated versions

**Expected Results**:
- ✅ Raw view shows text
- ✅ Compiled view shows PDF (LaTeX only)
- ✅ Smooth transitions
- ✅ No flickering or errors
- ✅ Content loads properly

**Pass Criteria**: Preview toggle works smoothly

---

#### Test 9.2: Original vs Generated Toggle
**Objective**: Verify version switching

**Steps**:
1. Generate tailored resume
2. Toggle between "Original" and "Generated"
3. Check content updates

**Expected Results**:
- ✅ Toggle switches versions
- ✅ Content updates correctly
- ✅ Labels clear
- ✅ No confusion about which version

**Pass Criteria**: Version toggle clear and functional

---

### Suite 10: PDF Compilation (LaTeX)

#### Test 10.1: PDF Generation
**Objective**: Verify LaTeX compiles to PDF

**Steps**:
1. Upload LaTeX resume
2. Switch to "Compiled" view
3. Wait for PDF to appear

**Expected Results**:
- ✅ PDF generates successfully
- ✅ PDF displays in viewer
- ✅ Rendering is correct
- ✅ All pages visible
- ✅ No missing content

**Pass Criteria**: PDF compiles and displays

---

#### Test 10.2: PDF Toolbar
**Objective**: Verify PDF viewer controls

**Steps**:
1. Generate PDF preview
2. Try zoom in/out
3. Test download button
4. Test print button

**Expected Results**:
- ✅ Zoom in works
- ✅ Zoom out works
- ✅ Download saves PDF
- ✅ Print opens dialog
- ✅ All controls responsive

**Pass Criteria**: All PDF controls work

---

#### Test 10.3: Compilation Errors
**Objective**: Verify LaTeX error handling

**Steps**:
1. Upload invalid LaTeX
2. Try to compile
3. Check error message

**Expected Results**:
- ✅ Error message appears
- ✅ Error is descriptive
- ✅ User can return to editing
- ✅ Retry option available

**Pass Criteria**: Errors handled gracefully

---

### Suite 11: Download Functionality

#### Test 11.1: Download LaTeX
**Objective**: Verify LaTeX download

**Steps**:
1. Generate tailored LaTeX resume
2. Click download (or save from preview)
3. Open downloaded file

**Expected Results**:
- ✅ File downloads
- ✅ Correct filename
- ✅ File opens in text editor
- ✅ Content is complete
- ✅ LaTeX is valid

**Pass Criteria**: Download works, file is valid

---

#### Test 11.2: Download DOCX
**Objective**: Verify DOCX download

**Steps**:
1. Generate tailored DOCX resume
2. Download the file
3. Open in Word or compatible editor

**Expected Results**:
- ✅ File downloads
- ✅ Correct filename
- ✅ Opens in Word/compatible
- ✅ Content complete
- ✅ Formatting preserved

**Pass Criteria**: DOCX download works properly

---

#### Test 11.3: Download PDF
**Objective**: Verify PDF download from compiled view

**Steps**:
1. Compile LaTeX resume
2. Download PDF
3. Open PDF in viewer

**Expected Results**:
- ✅ PDF downloads
- ✅ Correct filename
- ✅ Opens in PDF viewer
- ✅ Content renders correctly
- ✅ All pages present

**Pass Criteria**: PDF download works

---

### Suite 12: Custom Prompts

#### Test 12.1: Edit Custom Prompt
**Objective**: Verify custom prompt editing

**Steps**:
1. Open Settings
2. Navigate to Prompts tab
3. Edit LaTeX prompt
4. Save settings
5. Generate resume

**Expected Results**:
- ✅ Prompt saves
- ✅ Changes persist
- ✅ Generation uses custom prompt
- ✅ Output reflects changes

**Pass Criteria**: Custom prompts work

---

#### Test 12.2: Reset Prompt
**Objective**: Verify prompt reset functionality

**Steps**:
1. Edit a prompt
2. Click "Reset to Default"
3. Generate resume

**Expected Results**:
- ✅ Prompt resets to default
- ✅ Confirmation message appears
- ✅ Default behavior restored
- ✅ No errors

**Pass Criteria**: Reset works correctly

---

### Suite 13: Error Handling

#### Test 13.1: No API Key
**Objective**: Verify behavior without API key

**Steps**:
1. Clear API key from settings
2. Try to generate resume

**Expected Results**:
- ✅ Clear error message
- ✅ Directs user to settings
- ✅ No system crash
- ✅ Can add key and retry

**Pass Criteria**: Graceful error handling

---

#### Test 13.2: Network Errors
**Objective**: Verify handling of network issues

**Steps**:
1. Disconnect internet
2. Try to generate resume
3. Reconnect and retry

**Expected Results**:
- ✅ Network error detected
- ✅ Clear error message
- ✅ Retry option available
- ✅ Works after reconnection

**Pass Criteria**: Network errors handled

---

#### Test 13.3: Server Errors
**Objective**: Verify handling of server issues (LaTeX compilation)

**Steps**:
1. Use valid LaTeX
2. If server is down, note error handling

**Expected Results**:
- ✅ Server error detected
- ✅ User-friendly message
- ✅ Retry option available
- ✅ No data loss

**Pass Criteria**: Server errors handled gracefully

---

### Suite 14: UI/UX Testing

#### Test 14.1: Responsive Layout
**Objective**: Verify UI adapts to different sizes

**Steps**:
1. Resize Chrome window
2. Test at different widths
3. Check element positioning

**Expected Results**:
- ✅ Layout adapts smoothly
- ✅ No overlapping elements
- ✅ Scrolling works correctly
- ✅ All controls accessible

**Pass Criteria**: Responsive design works

---

#### Test 14.2: Loading States
**Objective**: Verify loading indicators

**Steps**:
1. Trigger various loading actions
2. Observe indicators
3. Check transitions

**Expected Results**:
- ✅ Loading spinners appear
- ✅ Progress messages clear
- ✅ Buttons disable during loading
- ✅ Smooth transitions

**Pass Criteria**: Loading states clear

---

#### Test 14.3: Success/Error Messages
**Objective**: Verify toast notifications

**Steps**:
1. Trigger success actions
2. Trigger error actions
3. Check message appearance

**Expected Results**:
- ✅ Success messages green
- ✅ Error messages red
- ✅ Messages auto-dismiss
- ✅ Close button works
- ✅ Messages readable

**Pass Criteria**: Notifications work well

---

### Suite 15: Performance Testing

#### Test 15.1: Large Files
**Objective**: Verify handling of large resumes

**Steps**:
1. Upload a large resume (10+ pages)
2. Generate tailored version
3. Monitor performance

**Expected Results**:
- ✅ File uploads successfully
- ✅ Generation completes
- ✅ No browser freezing
- ✅ Reasonable processing time
- ✅ Output is complete

**Pass Criteria**: Large files handled

---

#### Test 15.2: Multiple Generations
**Objective**: Verify repeated use

**Steps**:
1. Generate resume
2. Change job description
3. Generate again (repeat 5 times)

**Expected Results**:
- ✅ All generations succeed
- ✅ No performance degradation
- ✅ No memory leaks
- ✅ Consistent quality

**Pass Criteria**: Reliable repeated use

---

### Suite 16: Session Persistence

#### Test 16.1: Session Restore
**Objective**: Verify data persists across sessions

**Steps**:
1. Upload resume
2. Add job description and knowledge base
3. Close and reopen Chrome
4. Open extension

**Expected Results**:
- ✅ Job description persists
- ✅ Knowledge base persists
- ✅ File name shows
- ✅ Settings preserved

**Pass Criteria**: Session data persists

---

#### Test 16.2: Multiple Sessions
**Objective**: Verify data isolation

**Steps**:
1. Open extension in two Chrome windows
2. Upload different files in each
3. Check data separation

**Expected Results**:
- ✅ Each session independent
- ✅ No data crossover
- ✅ Both work correctly

**Pass Criteria**: Sessions properly isolated

---

## 📊 Test Report Template

```markdown
## Test Execution Report

**Date**: [Date]
**Tester**: [Name]
**Version**: [Extension Version]
**Chrome Version**: [Chrome Version]

### Summary
- Total Tests: [Number]
- Passed: [Number]
- Failed: [Number]
- Blocked: [Number]

### Critical Issues
- [Issue 1]
- [Issue 2]

### Non-Critical Issues
- [Issue 1]
- [Issue 2]

### Notes
[Any additional observations]

### Sign-off
- [ ] All critical functionality works
- [ ] No data loss observed
- [ ] Error handling adequate
- [ ] UI/UX acceptable
```

---

## 🔄 Regression Testing Checklist

After any code changes, run this quick checklist:

- [ ] Extension loads without errors
- [ ] Can upload LaTeX file
- [ ] Can upload DOCX file
- [ ] Can generate tailored resume
- [ ] API key works
- [ ] Settings save properly
- [ ] PDF compilation works (LaTeX)
- [ ] Download functionality works
- [ ] No console errors during normal use

---

## 📝 Bug Reporting Template

```markdown
**Title**: [Brief description]

**Priority**: [Critical/High/Medium/Low]

**Environment**:
- Chrome Version: 
- Extension Version:
- OS:

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Screenshots/Console Errors**:
[Attach if applicable]

**Additional Context**:
[Any other relevant information]
```

---

## ✅ Acceptance Criteria

The extension is considered **ready for release** when:

- [ ] All critical test suites pass
- [ ] No data loss in any scenario
- [ ] Error messages are clear and helpful
- [ ] UI is intuitive and responsive
- [ ] Performance is acceptable (< 30s generation time)
- [ ] Documentation is complete and accurate
- [ ] No security vulnerabilities
- [ ] API key handling is secure

---

**Last Updated**: 2025
**Test Version**: 2.0

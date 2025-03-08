const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

// Directory structure setup with detailed logging
const baseDir = path.join(__dirname, '..');
const dataDir = path.join(baseDir, 'data');
const originalTexDir = path.join(dataDir, 'originals');
const generatedTexDir = path.join(dataDir, 'generated');
const pdfDir = path.join(dataDir, 'pdf');

console.log('[Server] Directory structure initialized:', {
  baseDir,
  dataDir,
  originalTexDir,
  generatedTexDir,
  pdfDir,
  exists: {
    baseDir: fs.existsSync(baseDir),
    dataDir: fs.existsSync(dataDir),
    originalTexDir: fs.existsSync(originalTexDir),
    generatedTexDir: fs.existsSync(generatedTexDir),
    pdfDir: fs.existsSync(pdfDir)
  }
});

// Create directories with logging
[dataDir, originalTexDir, generatedTexDir, pdfDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[Server] Created missing directory: ${dir}`);
  } else {
    console.log(`[Server] Directory exists: ${dir}`);
  }
});

// Clean temp directory function
function cleanTempDirectory() {
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(tempDir, file));
    });
    console.log('Cleaned temp directory');
  }
}

// Update the LaTeX check and compile commands to use full path
const PDFLATEX_PATH = '/Library/TeX/texbin/pdflatex';

// Check LaTeX installation
app.get('/check-latex', (req, res) => {
  exec(`${PDFLATEX_PATH} --version`, (error, stdout, stderr) => {
    if (error) {
      console.error('LaTeX check error:', error);
      return res.status(500).json({ 
        installed: false, 
        error: error.message 
      });
    }
    res.json({ 
      installed: true, 
      version: stdout.split('\n')[0] 
    });
  });
});

// Add this helper function at the top of the file
function sanitizeLatexContent(latex) {
  return latex
    // Fix common LaTeX syntax errors
    .replace(/\{:\s/g, '{: ')  // Fix spacing after colons in braces
    .replace(/\s*&\s*/g, ' \\& ')  // Replace standalone & with \&
    .replace(/([^\\])%/g, '$1\\%')  // Escape % not preceded by \
    .replace(/([^\\])_/g, '$1\\_')  // Escape _ not preceded by \
    .replace(/\\textbf\{([^}]*)\}\{/g, '\\textbf{$1} {') // Fix textbf syntax
    .replace(/\}\{:/g, '} {: '); // Fix brace-colon spacing
}

/**
 * Endpoint to compile LaTeX to PDF
 */
app.post('/compile', async (req, res) => {
  const { latex, type = 'original', filename } = req.body;
  
  console.log('[Server] Compile request received:', {
    type,
    filename,
    contentLength: latex?.length,
    contentPreview: latex?.substring(0, 100)
  });

  try {
    if (!latex || typeof latex !== 'string') {
      throw new Error('Invalid LaTeX content');
    }

    // Validate LaTeX structure
    if (!latex.includes('\\documentclass') || 
        !latex.includes('\\begin{document}') || 
        !latex.includes('\\end{document}')) {
      throw new Error('Invalid LaTeX structure');
    }

    // Apply enhanced sanitization
    const sanitizedLatex = sanitizeLatexContent(latex);

    // Log the differences for debugging
    console.log('[Server] LaTeX sanitization results:', {
      originalLength: latex.length,
      sanitizedLength: sanitizedLatex.length,
      changes: {
        ampersands: (latex.match(/&/g) || []).length,
        sanitizedAmpersands: (sanitizedLatex.match(/\\&/g) || []).length,
        textbfCount: (latex.match(/\\textbf\{/g) || []).length,
        sanitizedTextbfCount: (sanitizedLatex.match(/\\textbf\{/g) || []).length
      }
    });

    // Write sanitized content to file
    const safeName = filename?.replace(/[^a-zA-Z0-9-_.]/g, '_') || 'resume.tex';
    const texPath = path.join(
      type === 'original' ? originalTexDir : generatedTexDir,
      `${safeName}${type === 'generated' ? '_generated' : ''}.tex`
    );
    const outputPath = path.join(pdfDir, `${safeName}${type === 'generated' ? '_generated' : ''}.pdf`);

    console.log('[Server] File paths resolved:', {
      baseName: safeName,
      texPath,
      outputPath,
      type,
      exists: {
        tex: fs.existsSync(texPath),
        pdf: fs.existsSync(outputPath)
      }
    });

    await fs.promises.writeFile(texPath, sanitizedLatex, 'utf8');
    console.log('[Server] LaTeX source written:', {
      path: texPath,
      size: sanitizedLatex.length,
      timestamp: new Date().toISOString()
    });

    const cmd = `${PDFLATEX_PATH} -interaction=nonstopmode -output-directory "${pdfDir}" "${texPath}"`;
    console.log('[Server] Executing pdflatex:', {
      command: cmd,
      inputFile: texPath,
      outputDir: pdfDir,
      timestamp: new Date().toISOString()
    });

    exec(cmd, (error, stdout, stderr) => {
      console.log('[Server] Compilation completed:', {
        success: !error,
        hasStderr: !!stderr,
        hasStdout: !!stdout,
        outputExists: fs.existsSync(outputPath),
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.error('[Server] LaTeX compilation error:', {
          error: error.message,
          stderr,
          stdout,
          texPath,
          outputPath
        });
        return res.status(500).json({
          success: false,
          error: 'LaTeX compilation failed',
          details: stderr || stdout || error.message
        });
      }

      if (fs.existsSync(outputPath)) {
        const pdfUrl = `/output/${path.basename(outputPath)}`;
        const stats = fs.statSync(outputPath);
        console.log('[Server] PDF generated successfully:', {
          pdfUrl,
          outputPath,
          fileSize: stats.size,
          modified: stats.mtime,
          timestamp: new Date().toISOString()
        });
        res.json({
          success: true,
          pdfUrl,
          downloadUrl: `http://localhost:${PORT}${pdfUrl}`,
          filename: path.basename(outputPath)
        });
      } else {
        console.error('[Server] PDF file not created:', {
          expectedPath: outputPath,
          texFileExists: fs.existsSync(texPath),
          texFileSize: fs.existsSync(texPath) ? fs.statSync(texPath).size : null,
          pdfDirContents: fs.readdirSync(pdfDir)
        });
        res.status(500).json({
          success: false,
          error: 'PDF was not created'
        });
      }
    });
  } catch (error) {
    console.error('[Server] Server error:', {
      message: error.message,
      stack: error.stack,
      texPath,
      outputPath,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message
    });
  }
});

// Add file saving endpoint
app.post('/save-original', async (req, res) => {
  const { latex, filename } = req.body;
  console.log('[Server] Save original request received:', {
    filename,
    contentLength: latex?.length,
    timestamp: new Date().toISOString()
  });

  if (!latex || !filename) {
    return res.status(400).json({ 
      success: false, 
      error: 'LaTeX content and filename are required' 
    });
  }

  const safeName = filename.replace(/[^a-zA-Z0-9-_.]/g, '_');
  const filePath = path.join(originalTexDir, safeName);

  try {
    await fs.promises.writeFile(filePath, latex, 'utf8');
    console.log('[Server] File saved successfully:', {
      path: filePath,
      size: latex.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      path: filePath,
      filename: safeName
    });
  } catch (error) {
    console.error('[Server] Error saving file:', {
      error: error.message,
      path: filePath,
      filename: safeName
    });
    res.status(500).json({
      success: false,
      error: 'Failed to save file',
      details: error.message
    });
  }
});

// Save generated LaTeX file with reference to original
app.post('/save-generated', (req, res) => {
  const { latex, originalFilename } = req.body;
  
  console.log('[Server] Received generated content:', {
    originalFilename,
    contentLength: latex?.length,
    contentPreview: latex?.substring(0, 200) + '...',
    timestamp: new Date().toISOString()
  });

  // Compare with original if available
  const originalPath = path.join(originalTexDir, originalFilename);
  if (fs.existsSync(originalPath)) {
    const originalContent = fs.readFileSync(originalPath, 'utf8');
    console.log('[Server] Comparison with original:', {
      originalLength: originalContent.length,
      generatedLength: latex?.length,
      isDifferent: originalContent !== latex,
      timestamp: new Date().toISOString()
    });
  }

  const baseName = path.parse(originalFilename || 'resume.tex').name;
  const generatedName = `${baseName}_generated.tex`;
  const filePath = path.join(generatedTexDir, generatedName);
  
  try {
    fs.writeFileSync(filePath, latex, 'utf8');
    console.log('[Server] Generated LaTeX file saved:', {
      path: filePath,
      size: latex.length,
      originalFilename,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      filename: generatedName,
      originalFilename,
      path: filePath
    });
  } catch (error) {
    console.error('[Server] Error saving generated file:', {
      error: error.message,
      filename: generatedName,
      originalFilename,
      path: filePath
    });
    res.status(500).json({
      success: false,
      error: 'Failed to save generated file'
    });
  }
});

// Create directory endpoint
app.post('/createDirectory', async (req, res) => {
  try {
    console.log('Creating directory:', req.body.path);
    const dirPath = path.join(baseDir, req.body.path);
    await fs.promises.mkdir(dirPath, { recursive: true });
    console.log('Directory created successfully:', dirPath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save file endpoint
app.post('/saveFile', async (req, res) => {
  try {
    console.log('Saving file:', req.body.path);
    const filePath = path.join(baseDir, req.body.path);
    await fs.promises.writeFile(filePath, req.body.content);
    console.log('File saved successfully:', filePath);
    res.json({ success: true, path: req.body.path });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup endpoint
app.post('/cleanup', async (req, res) => {
  try {
    console.log('Cleaning up directory:', req.body.path);
    const dirPath = path.join(baseDir, req.body.path);
    const files = await fs.promises.readdir(dirPath);
    
    for (const file of files) {
      await fs.promises.unlink(path.join(dirPath, file));
    }
    
    console.log('Cleanup completed successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error cleaning up directory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update static file serving
app.use('/output', express.static(pdfDir, {
  setHeaders: (res, path) => {
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline');
  }
}));

// Add download endpoint
app.get('/download/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const pdfPath = path.join(pdfDir, filename);
  
  console.log('[Server] Download request:', {
    type,
    filename,
    pdfPath,
    exists: fs.existsSync(pdfPath)
  });

  if (fs.existsSync(pdfPath)) {
    res.download(pdfPath, filename);
  } else {
    res.status(404).json({ error: 'PDF file not found' });
  }
});

// List existing templates
app.get('/list-templates', async (req, res) => {
  console.log('[Server] Received request to list templates');
  console.log('[Server] Original TeX directory:', originalTexDir);
  
  try {
    const files = await fs.promises.readdir(originalTexDir);
    console.log('[Server] All files in directory:', files);
    
    const texFiles = files.filter(file => file.endsWith('.tex'));
    console.log('[Server] Filtered .tex files:', texFiles);
    
    const templates = await Promise.all(texFiles.map(async file => {
      const filePath = path.join(originalTexDir, file);
      console.log('[Server] Processing file:', {
        name: file,
        path: filePath,
        exists: await fs.promises.access(filePath).then(() => true).catch(() => false)
      });
      
      try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        console.log('[Server] Successfully read file:', {
          name: file,
          contentLength: content.length
        });
        
        return {
          name: file,
          path: filePath,
          preview: content.slice(0, 100) // First 100 characters as preview
        };
      } catch (error) {
        console.error('[Server] Error reading file:', {
          file,
          error: error.message,
          stack: error.stack
        });
        return null;
      }
    }));

    const validTemplates = templates.filter(t => t !== null);
    console.log('[Server] Valid templates found:', {
      total: validTemplates.length,
      templates: validTemplates.map(t => ({
        name: t.name,
        path: t.path,
        previewLength: t.preview.length
      }))
    });
    
    res.json({ success: true, templates: validTemplates });
  } catch (error) {
    console.error('[Server] Error in list-templates:', {
      error: error.message,
      stack: error.stack,
      directory: originalTexDir
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list templates',
      details: error.message 
    });
  }
});

// Load template content
app.get('/load-template', async (req, res) => {
  const templatePath = req.query.path;
  console.log('[Server] Received load template request:', {
    path: templatePath,
    query: req.query
  });
  
  try {
    if (!templatePath) {
      console.error('[Server] No template path provided');
      return res.status(400).json({ success: false, error: 'Template path is required' });
    }

    console.log('[Server] Checking file existence:', templatePath);
    const exists = await fs.promises.access(templatePath)
      .then(() => true)
      .catch(() => false);
    
    if (!exists) {
      console.error('[Server] Template file not found:', templatePath);
      return res.status(404).json({ success: false, error: 'Template file not found' });
    }

    const content = await fs.promises.readFile(templatePath, 'utf8');
    console.log('[Server] Successfully loaded template:', {
      path: templatePath,
      contentLength: content.length,
      previewContent: content.slice(0, 50) + '...'
    });
    
    res.json({ success: true, content });
  } catch (error) {
    console.error('[Server] Error loading template:', {
      path: templatePath,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load template',
      details: error.message 
    });
  }
});

// Delete template
app.post('/delete-template', async (req, res) => {
  const { path } = req.body;
  try {
    await fs.promises.unlink(path);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

/**
 * Server startup
 */
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Test page available at http://localhost:${PORT}/test.html`);
}); 
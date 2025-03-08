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

/**
 * Endpoint to compile LaTeX to PDF
 */
app.post('/compile', async (req, res) => {
  const { latex, type = 'original', filename } = req.body;
  console.log('[Server] Compile request received:', {
    type,
    filename,
    contentLength: latex?.length,
    timestamp: new Date().toISOString()
  });

  if (!latex) {
    return res.status(400).json({ 
      success: false, 
      error: 'LaTeX source is required' 
    });
  }

  const safeName = filename?.replace(/[^a-zA-Z0-9-_.]/g, '_') || 'resume.tex';
  const baseName = path.parse(safeName).name;
  const texPath = path.join(
    type === 'original' ? originalTexDir : generatedTexDir,
    `${baseName}${type === 'generated' ? '_generated' : ''}.tex`
  );
  const outputPath = path.join(pdfDir, `${baseName}${type === 'generated' ? '_generated' : ''}.pdf`);

  console.log('[Server] File paths resolved:', {
    baseName,
    texPath,
    outputPath,
    type,
    exists: {
      tex: fs.existsSync(texPath),
      pdf: fs.existsSync(outputPath)
    }
  });

  try {
    await fs.promises.writeFile(texPath, latex, 'utf8');
    console.log('[Server] LaTeX source written:', {
      path: texPath,
      size: latex.length,
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
  console.log('[Server] Saving generated LaTeX file:', {
    originalFilename,
    contentLength: latex?.length,
    timestamp: new Date().toISOString()
  });

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
  try {
    const files = await fs.promises.readdir(originalTexDir);
    const templates = await Promise.all(files.map(async file => {
      const path = path.join(originalTexDir, file);
      const content = await fs.promises.readFile(path, 'utf8');
      return {
        name: file,
        path,
        preview: content.slice(0, 100) // First 100 characters as preview
      };
    }));
    
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list templates' });
  }
});

// Load template content
app.get('/load-template', async (req, res) => {
  const { path } = req.query;
  try {
    const content = await fs.promises.readFile(path, 'utf8');
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load template' });
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
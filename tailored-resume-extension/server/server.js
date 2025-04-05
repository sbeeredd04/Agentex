const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const libre = require('libreoffice-convert');
const util = require('util');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define allowed origins
const allowedOrigins = [
  'chrome-extension://jdinfdcbfmnnoanojkbokdhjpjognpmk',
  'https://agentex.vercel.app',
  'http://localhost:3000',
  'https://agentex.onrender.com'
];

// Platform-independent pdflatex path
const PDFLATEX_PATH = process.platform === 'darwin' 
  ? '/Library/TeX/texbin/pdflatex'
  : '/usr/bin/pdflatex';

const TMP_DIR = '/tmp';
const PDF_DIR = '/tmp/pdf';

const convertAsync = util.promisify(libre.convert);

// Function to check if pdflatex is installed
async function checkPdfLatex() {
  return new Promise((resolve) => {
    exec('which pdflatex', (error, stdout, stderr) => {
      if (error) {
        console.error('[Server] pdflatex not found:', error);
        resolve(false);
      } else {
        console.log('[Server] pdflatex found at:', stdout.trim());
        resolve(true);
      }
    });
  });
}

// Function to escape LaTeX special characters
function escapeLatexSpecialChars(text) {
  // Don't escape backslashes in LaTeX commands
  return text.replace(/([#$%&_{}~^])/g, '\\$1');
}

// Function to validate LaTeX content
function validateLatexContent(latex) {
  // Basic validation - just check if it's a non-empty string
  if (!latex || typeof latex !== 'string') {
    return {
      isValid: false,
      errors: ['LaTeX content is required']
    };
  }
  return {
    isValid: true,
    errors: []
  };
}

// Function to clean up temporary files
async function cleanupFiles(fileId) {
  const extensions = ['.tex', '.log', '.aux', '.out', '.pdf'];
  for (const ext of extensions) {
    try {
      const filePath = path.join(TMP_DIR, `${fileId}${ext}`);
      await fs.unlink(filePath).catch(() => {});
      const pdfPath = path.join(PDF_DIR, `${fileId}${ext}`);
      await fs.unlink(pdfPath).catch(() => {});
    } catch (err) {
      console.error(`[Server] Cleanup error for ${fileId}${ext}:`, err);
    }
  }
  console.log('[Server] Cleanup completed');
}

// More permissive CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Origin, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

async function initializeDirectories() {
  await fs.mkdir(TMP_DIR, { recursive: true });
  await fs.mkdir(PDF_DIR, { recursive: true });
  console.log('[Server] Directories initialized');
}

const compileHandler = async (req, res) => {
  console.log('[Server] Compile request received');
  const fileId = uuidv4();
  
  try {
    // Check if pdflatex is installed
    const pdflatexInstalled = await checkPdfLatex();
    if (!pdflatexInstalled) {
      throw new Error('LaTeX compilation is not available - pdflatex not installed');
    }

    const { latex } = req.body;
    if (!latex) {
      return res.status(400).json({ 
        success: false, 
        error: 'LaTeX source is required' 
      });
    }

    // Write the LaTeX content directly without modification
    const texPath = path.join(TMP_DIR, `${fileId}.tex`);
    const outputPath = path.join(PDF_DIR, `${fileId}.pdf`);
    
    await fs.writeFile(texPath, latex, 'utf8');
    console.log('[Server] LaTeX file written successfully:', {
      path: texPath,
      size: latex.length
    });

    // Create output directory if it doesn't exist
    await fs.mkdir(PDF_DIR, { recursive: true });

    // Use 'pdflatex' command directly (found in PATH) instead of absolute path
    const cmd = `cd "${TMP_DIR}" && pdflatex -interaction=nonstopmode -output-directory="${PDF_DIR}" "${texPath}"`;
    
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error && !stdout.includes('Output written on')) {
          console.error('[Server] Compilation error:', {
            error,
            stdout,
            stderr
          });
          reject({ error, stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });

    const pdfExists = await fs.stat(outputPath).catch(() => false);
    if (!pdfExists) {
      throw new Error('PDF compilation failed: ' + stderr);
    }

    const pdfContent = await fs.readFile(outputPath);
    console.log('[Server] PDF generated successfully:', {
      size: pdfContent.length,
      path: outputPath
    });

    res.contentType('application/pdf');
    res.send(pdfContent);

  } catch (error) {
    console.error('[Server] Error:', error);
    let errorMessage = error.message || 'Server error';
    let errorDetails = error.stderr || error.stdout || '';
    
    if (errorDetails.includes('! LaTeX Error:')) {
      const match = errorDetails.match(/! LaTeX Error: (.*?)\./);
      if (match) {
        errorMessage = match[1];
      }
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  } finally {
    await cleanupFiles(fileId);
  }
};

app.post('/compile', compileHandler);

app.post('/save-docx', upload.single('file'), async (req, res) => {
  try {
    console.log('[Server] Received DOCX upload request:', {
      hasFile: !!req.file,
      contentType: req.file?.mimetype,
      originalName: req.file?.originalname,
      size: req.file?.size
    });

    if (!req.file) {
      throw new Error('No file uploaded');
    }

    if (req.file.size === 0) {
      throw new Error('Uploaded file is empty');
    }

    const fileId = uuidv4();
    const filePath = path.join(TMP_DIR, `${fileId}.docx`);
    
    await fs.writeFile(filePath, req.file.buffer);
    const stats = await fs.stat(filePath);
    
    console.log('[Server] DOCX file saved:', {
      id: fileId,
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      content: req.file.buffer.length > 0 ? 'Present' : 'Empty'
    });
    
    res.json({ 
      success: true, 
      fileId,
      message: 'File saved successfully',
      details: {
        size: stats.size,
        path: filePath
      }
    });
  } catch (error) {
    console.error('[Server] Save DOCX error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: {
        code: error.code,
        syscall: error.syscall
      }
    });
  }
});

app.post('/compile-docx', async (req, res) => {
  try {
    const { fileId, options } = req.body;
    console.log('[Server][CompileDocx] Starting compilation:', {
      fileId,
      options,
      timestamp: new Date().toISOString()
    });

    if (!fileId) {
      throw new Error('File ID is required');
    }

    const inputPath = path.join(TMP_DIR, `${fileId}.docx`);
    const outputPath = path.join(PDF_DIR, `${fileId}.pdf`);

    // Verify input file exists and has content
    const fileStats = await fs.stat(inputPath).catch(() => null);
    console.log('[Server][CompileDocx] Input file check:', {
      exists: !!fileStats,
      size: fileStats?.size,
      path: inputPath,
      timestamp: new Date().toISOString()
    });

    if (!fileStats) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    if (fileStats.size === 0) {
      throw new Error('Input file is empty');
    }

    // Verify input file content
    const docxContent = await fs.readFile(inputPath);
    console.log('[Server][CompileDocx] DOCX content check:', {
      contentSize: docxContent.length,
      hasContent: docxContent.length > 0,
      timestamp: new Date().toISOString()
    });

    // Set up conversion options
    const conversionOptions = [
      '--headless',
      '--convert-to', 'pdf:writer_pdf_Export',
      '--outdir', PDF_DIR
    ];

    // Add formatting options if provided
    if (options?.format) {
      const { margins, pageSize, preserveFormatting } = options.format;
      if (preserveFormatting) {
        conversionOptions.push('--convert-to-pdf-options');
        conversionOptions.push('PreserveFormFields=true');
      }
      if (margins) {
        conversionOptions.push('--convert-to-pdf-options');
        conversionOptions.push(`Margins=${Object.values(margins).join(',')}`);
      }
      if (pageSize) {
        conversionOptions.push('--convert-to-pdf-options');
        conversionOptions.push(`PageSize=${pageSize}`);
      }
    }

    console.log('[Server][CompileDocx] Conversion setup:', {
      command: 'soffice',
      options: conversionOptions,
      inputFile: inputPath,
      timestamp: new Date().toISOString()
    });

    // Execute conversion with detailed logging
    const conversionResult = await new Promise((resolve, reject) => {
      exec(`soffice ${conversionOptions.join(' ')} "${inputPath}"`, (error, stdout, stderr) => {
        console.log('[Server][CompileDocx] Conversion process:', {
          hasError: !!error,
          stdout: stdout || 'No output',
          stderr: stderr || 'No errors',
          timestamp: new Date().toISOString()
        });

        if (error) {
          reject(new Error(`PDF conversion failed: ${stderr || error.message}`));
        } else {
          resolve({ stdout, stderr });
        }
      });
    });

    // Verify PDF was created
    const pdfStats = await fs.stat(outputPath).catch(() => null);
    console.log('[Server][CompileDocx] PDF verification:', {
      exists: !!pdfStats,
      size: pdfStats?.size,
      path: outputPath,
      timestamp: new Date().toISOString()
    });

    if (!pdfStats || pdfStats.size === 0) {
      throw new Error('PDF generation failed or produced empty file');
    }

    // Read and send the PDF
    const pdfContent = await fs.readFile(outputPath);
    console.log('[Server][CompileDocx] Sending PDF:', {
      contentSize: pdfContent.length,
      timestamp: new Date().toISOString()
    });

    res.type('application/pdf').send(pdfContent);

    // Cleanup files
    await Promise.all([
      fs.unlink(inputPath).catch(err => {
        console.error('[Server][CompileDocx] Cleanup error (input):', err);
      }),
      fs.unlink(outputPath).catch(err => {
        console.error('[Server][CompileDocx] Cleanup error (output):', err);
      })
    ]);

    console.log('[Server][CompileDocx] Process complete');

  } catch (error) {
    console.error('[Server][CompileDocx] Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack
    });
  }
});

app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  res.status(500).json({
    success: false,
    error: 'Server error',
    details: err.message
  });
});

// Initialize server
async function initializeServer() {
  try {
    // Create required directories
    await fs.mkdir(TMP_DIR, { recursive: true });
    await fs.mkdir(PDF_DIR, { recursive: true });
    console.log('[Server] Directories initialized');

    // Check for pdflatex
    const pdflatexInstalled = await checkPdfLatex();
    if (!pdflatexInstalled) {
      console.error('[Server] WARNING: pdflatex is not installed. PDF compilation will not work!');
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('[Server] Initialization complete');
    });
  } catch (error) {
    console.error('[Server] Initialization error:', error);
    process.exit(1);
  }
}

initializeServer();

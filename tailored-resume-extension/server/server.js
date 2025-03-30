const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const libre = require('libreoffice-convert');
const util = require('util');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define allowed origins
const allowedOrigins = [
  'chrome-extension://jdinfdcbfmnnoanojkbokdhjpjognpmk',
  'https://agentex.vercel.app',
  'http://localhost:3000'
];

const PDFLATEX_PATH = '/Library/TeX/texbin/pdflatex';
const TMP_DIR = '/tmp';
const PDF_DIR = '/tmp/pdf';

const convertAsync = util.promisify(libre.convert);

// CORS middleware
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes(req.headers.origin) ? req.headers.origin : allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

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
    const { latex } = req.body;
    if (!latex) {
      return res.status(400).json({ 
        success: false, 
        error: 'LaTeX source is required' 
      });
    }

    // Validate LaTeX content
    console.log('[Server] Validating LaTeX content:', {
      contentLength: latex.length,
      hasDocumentClass: latex.includes('\\documentclass'),
      hasBeginDocument: latex.includes('\\begin{document}'),
      hasEndDocument: latex.includes('\\end{document}')
    });

    // Ensure content is a complete LaTeX document
    let processedLatex = latex;
    if (!latex.includes('\\documentclass')) {
      processedLatex = `\\documentclass{article}
\\usepackage{latexsym}
\\usepackage{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage[empty]{fullpage}
\\usepackage{color}
\\definecolor{linkcolour}{rgb}{0,0.2,0.6}
\\hypersetup{colorlinks,breaklinks,urlcolor=linkcolour,linkcolor=linkcolour}

\\begin{document}
${latex}
\\end{document}`;
    }

    const texPath = path.join(TMP_DIR, `${fileId}.tex`);
    const outputPath = path.join(PDF_DIR, `${fileId}.pdf`);

    await fs.writeFile(texPath, processedLatex, 'utf8');
    console.log('[Server] LaTeX file written successfully:', {
      path: texPath,
      size: processedLatex.length,
      documentStructure: {
        hasDocumentClass: processedLatex.includes('\\documentclass'),
        hasBeginDocument: processedLatex.includes('\\begin{document}'),
        hasEndDocument: processedLatex.includes('\\end{document}')
      }
    });

    const cmd = `cd "${TMP_DIR}" && ${PDFLATEX_PATH} -interaction=nonstopmode -output-directory="${PDF_DIR}" "${texPath}"`;
    
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
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
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
      details: error.stderr || error.stdout || ''
    });
  } finally {
    // Cleanup
    try {
      const extensions = ['.tex', '.log', '.aux', '.out'];
      for (const ext of extensions) {
        const filePath = path.join(TMP_DIR, `${fileId}${ext}`);
        await fs.unlink(filePath).catch(() => {});
      }
      console.log('[Server] Cleanup completed');
    } catch (err) {
      console.error('[Server] Cleanup error:', err);
    }
  }
};

app.post('/compile', allowCors(compileHandler));

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
    if (!fileId) {
      throw new Error('File ID is required');
    }

    const inputPath = path.join(TMP_DIR, `${fileId}.docx`);
    const outputPath = path.join(PDF_DIR, `${fileId}.pdf`);

    console.log('[Server] Starting DOCX to PDF conversion:', {
      fileId,
      inputPath,
      outputPath,
      options
    });

    // Verify input file exists
    const fileStats = await fs.stat(inputPath).catch(() => null);
    if (!fileStats) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Convert DOCX to PDF using LibreOffice with formatting options
    const conversionOptions = [
      '--headless',
      '--convert-to', 'pdf:writer_pdf_Export',
      '--outdir', PDF_DIR
    ];

    if (options?.fitToPage) {
      conversionOptions.push('--convert-to-pdf-options');
      conversionOptions.push('ScaleTo=100');
    }

    await new Promise((resolve, reject) => {
      exec(`soffice ${conversionOptions.join(' ')} "${inputPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error('[Server] Conversion error:', error);
          reject(new Error('PDF conversion failed'));
        } else {
          resolve();
        }
      });
    });

    // Read and send the PDF
    const pdfContent = await fs.readFile(outputPath);
    res.type('application/pdf').send(pdfContent);

    // Cleanup
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(outputPath).catch(() => {})
    ]);

  } catch (error) {
    console.error('[Server] DOCX compilation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
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

initializeDirectories().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

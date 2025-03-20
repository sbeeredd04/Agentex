const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Define allowed origins
const allowedOrigins = [
  'chrome-extension://jdinfdcbfmnnoanojkbokdhjpjognpmk',
  'https://agentex.vercel.app',
  'http://localhost:3000'
];

const PDFLATEX_PATH = '/Library/TeX/texbin/pdflatex';
const TMP_DIR = '/tmp';
const PDF_DIR = '/tmp/pdf';

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

    const texPath = path.join(TMP_DIR, `${fileId}.tex`);
    const outputPath = path.join(PDF_DIR, `${fileId}.pdf`);

    await fs.writeFile(texPath, latex, 'utf8');
    console.log('[Server] LaTeX file written successfully');

    const cmd = `cd "${TMP_DIR}" && ${PDFLATEX_PATH} -interaction=nonstopmode -output-directory="${PDF_DIR}" "${texPath}"`;
    
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('[Server] Compilation error:', error);
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

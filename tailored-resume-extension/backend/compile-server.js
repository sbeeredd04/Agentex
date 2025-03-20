const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PDFLATEX_PATH = '/Library/TeX/texbin/pdflatex';
const TMP_DIR = '/tmp';
const PDF_DIR = '/tmp/pdf';

// Initialize directories
async function initDirectories() {
  await fs.mkdir(TMP_DIR, { recursive: true });
  await fs.mkdir(PDF_DIR, { recursive: true });
  console.log('[CompileServer] Directories initialized');
}

// Compile LaTeX to PDF
app.post('/compile', async (req, res) => {
  const { latex } = req.body;
  const fileId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const texPath = path.join(TMP_DIR, `${fileId}.tex`);
  const outputPath = path.join(PDF_DIR, `${fileId}.pdf`);

  try {
    // Save LaTeX content
    await fs.writeFile(texPath, latex, 'utf8');
    console.log('[CompileServer] LaTeX file saved:', texPath);

    // Compile to PDF
    const cmd = `cd "${TMP_DIR}" && ${PDFLATEX_PATH} -interaction=nonstopmode -output-directory="${PDF_DIR}" "${texPath}"`;
    
    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('[CompileServer] Compilation error:', error);
          reject(new Error('LaTeX compilation failed'));
        } else {
          resolve();
        }
      });
    });

    // Read the generated PDF
    const pdfContent = await fs.readFile(outputPath);
    
    // Cleanup files
    const extensions = ['.tex', '.log', '.aux', '.out'];
    for (const ext of extensions) {
      await fs.unlink(path.join(TMP_DIR, `${fileId}${ext}`)).catch(console.error);
    }
    await fs.unlink(outputPath).catch(console.error);

    // Send PDF content
    res.status(200).send({
      success: true,
      pdf: pdfContent.toString('base64')
    });

  } catch (error) {
    console.error('[CompileServer] Error:', error);
    res.status(500).send({
      success: false,
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
initDirectories().then(() => {
  app.listen(PORT, () => {
    console.log(`[CompileServer] Server running on port ${PORT}`);
  });
}); 
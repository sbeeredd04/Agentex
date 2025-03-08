class FileManager {
  constructor() {
    console.log('[FileManager] Initializing with structure:', {
      baseDir: this.baseDir,
      folders: this.folders
    });
    this.baseDir = 'data';
    this.folders = {
      original: `${this.baseDir}/original`,
      generated: `${this.baseDir}/generated`,
      temp: `${this.baseDir}/temp`,
      pdf: `${this.baseDir}/pdf`
    };
    console.log('[FileManager] Folder structure:', this.folders);
  }

  async initializeFolders() {
    console.log('Initializing folder structure');
    try {
      // Create base directory if it doesn't exist
      await this.createDirectory(this.baseDir);
      console.log('Base directory created');
      
      // Create all required subdirectories
      for (const [key, path] of Object.entries(this.folders)) {
        await this.createDirectory(path);
        console.log(`Created directory: ${path}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing folders:', error);
      throw new Error(`Failed to initialize folders: ${error.message}`);
    }
  }

  async createDirectory(path) {
    console.log(`Creating directory: ${path}`);
    try {
      const response = await fetch('http://localhost:3000/createDirectory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Server reported failure');
      }

      console.log(`Directory created successfully: ${path}`);
      return true;
    } catch (error) {
      console.error(`Error creating directory ${path}:`, error);
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  async saveFile(content, filename, folder = 'temp') {
    console.log('[FileManager] Save request:', {
      filename,
      folder,
      targetDir: this.folders[folder],
      contentLength: content.length
    });
    console.log(`[FileManager] Saving file: ${filename} to ${folder} folder`);
    console.log(`[FileManager] Target directory: ${this.folders[folder]}`);
    try {
      const path = `${this.folders[folder]}/${filename}`;
      console.log(`[FileManager] Full file path: ${path}`);
      const response = await fetch('http://localhost:3000/saveFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
      });

      if (!response.ok) {
        console.error(`[FileManager] Failed to save file: ${filename}, status: ${response.status}`);
        throw new Error(`Failed to save file: ${filename}`);
      }

      console.log(`[FileManager] File saved at: ${path}`);
      return path;
    } catch (error) {
      console.error(`[FileManager] Error saving file ${filename}:`, error);
      throw error;
    }
  }

  async cleanupTemp() {
    console.log('Cleaning up temporary files');
    try {
      const response = await fetch('http://localhost:3000/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: this.folders.temp })
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup temporary files');
      }

      return true;
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
      throw error;
    }
  }
}

window.FileManager = FileManager;
console.log('FileManager registered globally');
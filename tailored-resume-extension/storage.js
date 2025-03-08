// Storage management for resumes, cover letters, and knowledge base
class StorageManager {
  constructor() {
    console.log('Initializing StorageManager');
    this.defaultResume = null;
    this.defaultCoverLetter = null;
    this.resumes = new Map();
    this.coverLetters = new Map();
    this.knowledgeBase = new Set();
    this.savedJobs = new Map();
    this.experiences = new Set();
    this.projects = new Set();
    this.skills = new Set();
    this.loadFromStorage();
  }

  async loadFromStorage() {
    try {
      const data = await chrome.storage.local.get([
        'defaultResume',
        'defaultCoverLetter',
        'resumes',
        'coverLetters',
        'knowledgeBase',
        'savedJobs',
        'experiences',
        'projects',
        'skills'
      ]);
      
      this.defaultResume = data.defaultResume || null;
      this.defaultCoverLetter = data.defaultCoverLetter || null;
      
      // Convert objects back to Maps
      this.resumes = new Map(Object.entries(data.resumes || {}));
      this.coverLetters = new Map(Object.entries(data.coverLetters || {}));
      this.savedJobs = new Map(Object.entries(data.savedJobs || {}));
      
      // Convert array back to Set
      this.knowledgeBase = new Set(data.knowledgeBase || []);
      this.experiences = new Set(data.experiences || []);
      this.projects = new Set(data.projects || []);
      this.skills = new Set(data.skills || []);
      
      console.log("Storage loaded successfully");
    } catch (error) {
      console.error("Error loading from storage:", error);
    }
  }

  async saveResume(name, content, isDefault = false) {
    console.log('[Storage] Saving resume:', {
      name,
      contentLength: content.length,
      isDefault,
      existingCount: this.resumes.size
    });

    this.resumes.set(name, {
      content,
      timestamp: Date.now(),
      isDefault
    });

    if (isDefault) {
      this.defaultResume = name;
      
      // Reset other resumes' default flag
      for (const [key, data] of this.resumes.entries()) {
        if (key !== name && data.isDefault) {
          this.resumes.set(key, { ...data, isDefault: false });
        }
      }
    }

    await this.syncStorage();

    // After saving
    console.log('[Storage] Resume saved:', {
      name,
      timestamp: Date.now(),
      totalResumes: this.resumes.size,
      defaultResume: this.defaultResume
    });

    return true;
  }

  async saveCoverLetter(name, content, isDefault = false) {
    this.coverLetters.set(name, {
      content,
      timestamp: Date.now(),
      isDefault
    });

    if (isDefault) {
      this.defaultCoverLetter = name;
      
      // Reset other cover letters' default flag
      for (const [key, data] of this.coverLetters.entries()) {
        if (key !== name && data.isDefault) {
          this.coverLetters.set(key, { ...data, isDefault: false });
        }
      }
    }

    await this.syncStorage();
    return true;
  }

  async deleteResume(name) {
    if (!this.resumes.has(name)) {
      return false;
    }
    
    this.resumes.delete(name);
    if (this.defaultResume === name) {
      this.defaultResume = null;
      
      // If there are other resumes, set the most recent one as default
      if (this.resumes.size > 0) {
        const mostRecent = [...this.resumes.entries()]
          .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];
        
        if (mostRecent) {
          this.defaultResume = mostRecent[0];
          this.resumes.set(mostRecent[0], { 
            ...mostRecent[1], 
            isDefault: true 
          });
        }
      }
    }
    
    await this.syncStorage();
    return true;
  }

  async deleteCoverLetter(name) {
    if (!this.coverLetters.has(name)) {
      return false;
    }
    
    this.coverLetters.delete(name);
    if (this.defaultCoverLetter === name) {
      this.defaultCoverLetter = null;
      
      // If there are other cover letters, set the most recent one as default
      if (this.coverLetters.size > 0) {
        const mostRecent = [...this.coverLetters.entries()]
          .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];
        
        if (mostRecent) {
          this.defaultCoverLetter = mostRecent[0];
          this.coverLetters.set(mostRecent[0], { 
            ...mostRecent[1], 
            isDefault: true 
          });
        }
      }
    }
    
    await this.syncStorage();
    return true;
  }

  async addKnowledgeItem(item) {
    if (!item || item.trim() === '' || this.knowledgeBase.has(item)) {
      return false;
    }
    
    this.knowledgeBase.add(item.trim());
    await this.syncStorage();
    return true;
  }

  async removeKnowledgeItem(item) {
    const result = this.knowledgeBase.delete(item);
    if (result) {
      await this.syncStorage();
    }
    return result;
  }

  async saveJob(title, description) {
    if (!title || !description) {
      return false;
    }
    
    this.savedJobs.set(title, {
      description,
      timestamp: Date.now()
    });
    
    await this.syncStorage();
    return true;
  }

  async deleteJob(title) {
    const result = this.savedJobs.delete(title);
    if (result) {
      await this.syncStorage();
    }
    return result;
  }

  async syncStorage() {
    try {
      await chrome.storage.local.set({
        defaultResume: this.defaultResume,
        defaultCoverLetter: this.defaultCoverLetter,
        resumes: Object.fromEntries(this.resumes),
        coverLetters: Object.fromEntries(this.coverLetters),
        knowledgeBase: Array.from(this.knowledgeBase),
        savedJobs: Object.fromEntries(this.savedJobs),
        experiences: Array.from(this.experiences),
        projects: Array.from(this.projects),
        skills: Array.from(this.skills)
      });
      console.log("Storage synced successfully");
      return true;
    } catch (error) {
      console.error("Error syncing storage:", error);
      return false;
    }
  }

  getDefaultResume() {
    if (!this.defaultResume || !this.resumes.has(this.defaultResume)) {
      return null;
    }
    
    return {
      name: this.defaultResume,
      ...this.resumes.get(this.defaultResume)
    };
  }

  getDefaultCoverLetter() {
    if (!this.defaultCoverLetter || !this.coverLetters.has(this.defaultCoverLetter)) {
      return null;
    }
    
    return {
      name: this.defaultCoverLetter,
      ...this.coverLetters.get(this.defaultCoverLetter)
    };
  }

  clearKnowledgeBase() {
    console.log('Clearing knowledge base');
    this.knowledgeBase = new Set();
    this.experiences = new Set();
    this.projects = new Set();
    this.skills = new Set();
  }

  addExperience(exp) {
    console.log('Adding experience:', exp.company);
    this.experiences.add(exp);
    this.knowledgeBase.add(`Experience: ${exp.position} at ${exp.company}`);
  }

  addProject(proj) {
    console.log('Adding project:', proj.name);
    this.projects.add(proj);
    this.knowledgeBase.add(`Project: ${proj.name} (${proj.technologies})`);
  }

  addSkill(skill) {
    console.log('Adding skill:', skill.name);
    this.skills.add(skill);
    this.knowledgeBase.add(`${skill.category}: ${skill.name}`);
  }
}

// Make it available globally
window.StorageManager = StorageManager;
console.log('StorageManager registered globally'); 
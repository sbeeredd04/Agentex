/**
 * Resume Editor Controller
 *
 * Manages the structured resume editor: accordion sections, repeatable cards,
 * tag inputs, and auto-save to chrome.storage.local.
 */
const ResumeEditor = {
  data: null,
  container: null,
  saveTimeout: null,

  init(container) {
    this.container = container;
    if (!container) return;
    this.setupAccordions();
    this.setupAddButtons();
    this.loadFromStorage();
  },

  setupAccordions() {
    this.container.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        header.closest('.accordion-section').classList.toggle('open');
      });
    });
  },

  setupAddButtons() {
    this.container.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.addEntry(btn.dataset.add);
      });
    });
  },

  async loadFromStorage() {
    const { resumeStructured } = await chrome.storage.local.get('resumeStructured');
    if (resumeStructured) {
      this.setData(resumeStructured);
    }
  },

  setData(data) {
    this.data = data;
    this.render();
    const emptyEl = document.getElementById('editor-empty');
    const contentEl = document.getElementById('editor-content');
    if (emptyEl) emptyEl.setAttribute('hidden', '');
    if (contentEl) contentEl.removeAttribute('hidden');
  },

  render() {
    if (!this.data || !this.container) return;

    // Contact fields
    this.container.querySelectorAll('[data-field^="contact."]').forEach(input => {
      const field = input.dataset.field.split('.')[1];
      input.value = this.data.contact?.[field] || '';
      // Remove old listeners by cloning
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
      newInput.addEventListener('input', () => {
        if (!this.data.contact) this.data.contact = {};
        this.data.contact[field] = newInput.value;
        this.scheduleSave();
      });
    });

    // Summary
    const summaryField = this.container.querySelector('[data-field="summary"]');
    if (summaryField) {
      summaryField.value = this.data.summary || '';
      const newSummary = summaryField.cloneNode(true);
      summaryField.parentNode.replaceChild(newSummary, summaryField);
      newSummary.addEventListener('input', () => {
        this.data.summary = newSummary.value;
        this.scheduleSave();
      });
    }

    // Repeatable sections
    this.renderRepeatable('experience', this.data.experience, this.renderExperienceCard.bind(this));
    this.renderRepeatable('education', this.data.education, this.renderEducationCard.bind(this));
    this.renderRepeatable('certifications', this.data.certifications, this.renderCertificationCard.bind(this));
    this.renderRepeatable('projects', this.data.projects, this.renderProjectCard.bind(this));

    // Tag inputs
    this.renderTagInput('skills.technical', this.data.skills?.technical || []);
    this.renderTagInput('skills.soft', this.data.skills?.soft || []);
    this.renderTagInput('skills.languages', this.data.skills?.languages || []);
  },

  renderRepeatable(section, items, cardRenderer) {
    const list = document.getElementById(section + '-list');
    if (!list) return;
    list.innerHTML = '';
    (items || []).forEach((item, index) => {
      const card = cardRenderer(item, index, section);
      list.appendChild(card);
    });
  },

  renderExperienceCard(item, index, section) {
    return this.createCard(section, index, [
      { label: 'Title', field: 'title', value: item.title },
      { label: 'Company', field: 'company', value: item.company },
      { label: 'Location', field: 'location', value: item.location },
      { label: 'Start Date', field: 'startDate', value: item.startDate },
      { label: 'End Date', field: 'endDate', value: item.endDate },
      { label: 'Description', field: 'description', value: item.description, type: 'textarea' }
    ]);
  },

  renderEducationCard(item, index, section) {
    return this.createCard(section, index, [
      { label: 'Institution', field: 'institution', value: item.institution },
      { label: 'Degree', field: 'degree', value: item.degree },
      { label: 'Field', field: 'field', value: item.field },
      { label: 'Start Date', field: 'startDate', value: item.startDate },
      { label: 'End Date', field: 'endDate', value: item.endDate },
      { label: 'GPA', field: 'gpa', value: item.gpa }
    ]);
  },

  renderCertificationCard(item, index, section) {
    return this.createCard(section, index, [
      { label: 'Name', field: 'name', value: item.name },
      { label: 'Issuer', field: 'issuer', value: item.issuer },
      { label: 'Date', field: 'date', value: item.date }
    ]);
  },

  renderProjectCard(item, index, section) {
    return this.createCard(section, index, [
      { label: 'Name', field: 'name', value: item.name },
      { label: 'Description', field: 'description', value: item.description, type: 'textarea' },
      { label: 'URL', field: 'url', value: item.url }
    ]);
  },

  createCard(section, index, fields) {
    const card = document.createElement('div');
    card.className = 'repeatable-card';
    card.dataset.index = index;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'card-remove';
    removeBtn.innerHTML = '<span class="material-icons">close</span>';
    removeBtn.addEventListener('click', () => {
      this.data[section].splice(index, 1);
      this.scheduleSave();
      this.render();
    });
    card.appendChild(removeBtn);

    const grid = document.createElement('div');
    grid.className = 'form-grid';

    fields.forEach(f => {
      const div = document.createElement('div');
      div.className = 'form-field';
      if (f.type === 'textarea') div.style.gridColumn = '1 / -1';

      const label = document.createElement('label');
      label.textContent = f.label;
      div.appendChild(label);

      const input = f.type === 'textarea'
        ? document.createElement('textarea')
        : document.createElement('input');
      input.value = f.value || '';
      if (f.type === 'textarea') input.rows = 3;

      input.addEventListener('input', () => {
        this.data[section][index][f.field] = input.value;
        this.scheduleSave();
      });

      div.appendChild(input);
      grid.appendChild(div);
    });

    card.appendChild(grid);
    return card;
  },

  renderTagInput(fieldPath, tags) {
    const container = this.container.querySelector('[data-field="' + fieldPath + '"]');
    if (!container) return;

    container.innerHTML = '';
    const [section, subfield] = fieldPath.split('.');

    tags.forEach((tag, i) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = tag;

      const remove = document.createElement('span');
      remove.className = 'tag-remove';
      remove.textContent = '\u00d7';
      remove.addEventListener('click', () => {
        this.data[section][subfield].splice(i, 1);
        this.scheduleSave();
        this.renderTagInput(fieldPath, this.data[section][subfield]);
      });

      tagEl.appendChild(remove);
      container.appendChild(tagEl);
    });

    const input = document.createElement('input');
    input.className = 'tag-input-field';
    input.placeholder = container.dataset.placeholder || 'Add...';
    input.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
        e.preventDefault();
        if (!this.data[section]) this.data[section] = {};
        if (!this.data[section][subfield]) this.data[section][subfield] = [];
        this.data[section][subfield].push(input.value.trim());
        this.scheduleSave();
        this.renderTagInput(fieldPath, this.data[section][subfield]);
      }
    });
    container.appendChild(input);
  },

  addEntry(section) {
    const templates = {
      experience: { title: '', company: '', location: '', startDate: '', endDate: '', description: '', highlights: [] },
      education: { institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '', highlights: [] },
      certifications: { name: '', issuer: '', date: '' },
      projects: { name: '', description: '', technologies: [], url: '' }
    };

    if (!this.data[section]) this.data[section] = [];
    this.data[section].push({ ...templates[section] });
    this.scheduleSave();
    this.render();
  },

  scheduleSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.save(), 500);
  },

  async save() {
    if (!this.data) return;
    await chrome.storage.local.set({ resumeStructured: this.data });
  },

  getData() {
    return this.data;
  }
};

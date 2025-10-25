/**
 * Simple Markdown Parser for Job Description and Knowledge Base
 * Converts markdown to HTML for preview and processes for AI consumption
 */

class MarkdownParser {
  /**
   * Convert markdown text to HTML
   * @param {string} markdown - Markdown text
   * @returns {string} HTML output
   */
  static toHTML(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/_(.*?)_/gim, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>');
    
    // Lists
    html = html.replace(/^\s*\n\*/gim, '<ul>\n*');
    html = html.replace(/^(\*.+)\s*\n([^\*])/gim, '$1\n</ul>\n\n$2');
    html = html.replace(/^\*(.+)/gim, '<li>$1</li>');
    
    // Ordered lists
    html = html.replace(/^\s*\n\d\./gim, '<ol>\n1.');
    html = html.replace(/^(\d\..+)\s*\n([^\d\.])/gim, '$1\n</ol>\n\n$2');
    html = html.replace(/^\d\.(.+)/gim, '<li>$1</li>');
    
    // Code blocks
    html = html.replace(/```(.*?)```/gims, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`(.*?)`/gim, '<code>$1</code>');
    
    // Line breaks
    html = html.replace(/\n\n/gim, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Blockquotes
    html = html.replace(/^\> (.+)/gim, '<blockquote>$1</blockquote>');
    
    return html;
  }
  
  /**
   * Clean markdown for AI processing
   * Removes formatting but keeps structure
   * @param {string} markdown - Markdown text
   * @returns {string} Cleaned text
   */
  static toPlainText(markdown) {
    if (!markdown) return '';
    
    let text = markdown;
    
    // Remove code blocks
    text = text.replace(/```.*?```/gims, '');
    
    // Remove inline code
    text = text.replace(/`(.*?)`/gim, '$1');
    
    // Remove links but keep text
    text = text.replace(/\[(.*?)\]\(.*?\)/gim, '$1');
    
    // Remove bold/italic markers
    text = text.replace(/\*\*(.*?)\*\*/gim, '$1');
    text = text.replace(/__(.*?)__/gim, '$1');
    text = text.replace(/\*(.*?)\*/gim, '$1');
    text = text.replace(/_(.*?)_/gim, '$1');
    
    // Remove header markers
    text = text.replace(/^#{1,6}\s+/gim, '');
    
    // Remove blockquote markers
    text = text.replace(/^\>\s+/gim, '');
    
    // Clean up extra whitespace
    text = text.replace(/\n{3,}/gim, '\n\n');
    
    return text.trim();
  }
  
  /**
   * Validate markdown syntax
   * @param {string} markdown - Markdown text
   * @returns {Object} Validation result
   */
  static validate(markdown) {
    const issues = [];
    
    // Check for unclosed code blocks
    const codeBlocks = (markdown.match(/```/g) || []).length;
    if (codeBlocks % 2 !== 0) {
      issues.push('Unclosed code block detected');
    }
    
    // Check for malformed links
    const malformedLinks = markdown.match(/\[([^\]]+)\]\([^\)]*$/gm);
    if (malformedLinks) {
      issues.push('Malformed link detected');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Get preview of markdown content
   * @param {string} markdown - Markdown text
   * @param {number} length - Max length of preview
   * @returns {string} Preview text
   */
  static getPreview(markdown, length = 100) {
    const plainText = this.toPlainText(markdown);
    return plainText.length > length 
      ? plainText.substring(0, length) + '...'
      : plainText;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MarkdownParser = MarkdownParser;
}

// ******************************************************
// EMAIL TEMPLATES — load HTML files and inject variables
// ******************************************************

const fs = require('fs');
const path = require('path');

const templateCache = new Map();

const templatesDir = path.join(__dirname, '../templates/emails');

/**
 * Load an HTML email template and replace `{{key}}` placeholders.
 *
 * @param {string} name - Template filename without extension, e.g. "password-reset"
 * @param {Record<string, string>} variables - Values to inject into the template
 */
function renderEmailTemplate(name, variables) {
  if (!templateCache.has(name)) {
    const filePath = path.join(templatesDir, `${name}.html`);
    templateCache.set(name, fs.readFileSync(filePath, 'utf8'));
  }

  let html = templateCache.get(name);

  for (const [key, value] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  return html;
}

module.exports = {
  renderEmailTemplate,
};

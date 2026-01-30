// Reusable input validation and sanitization utilities (ESM)
// Provides simple rules for common fields and safe sanitizers for HTML, SQL-ish strings, filenames, and JSON.
import sanitizeHtml from 'sanitize-html';

export class InputValidator {
  constructor() {
    this.rules = {
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      phone: /^(\+?963|0)?9[0-9]{8}$/, // Syrian mobile numbers
      nationalId: /^[0-9]{11}$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      arabic: /^[\u0600-\u06FF\s]+$/,
      url: /^https?:\/\/.+$/,
      date: /^\d{4}-\d{2}-\d{2}$/
    };
  }

  validate(input, type, options = {}) {
    const value = (typeof input === 'string') ? input : (input == null ? '' : String(input));
    const trimmed = options?.preserveWhitespace ? value : value.trim();

    if (!trimmed && options.required) {
      return { valid: false, error: 'الحقل مطلوب' };
    }

    if (options.minLength && trimmed.length < options.minLength) {
      return { valid: false, error: `الحد الأدنى ${options.minLength} حرف` };
    }

    if (options.maxLength && trimmed.length > options.maxLength) {
      return { valid: false, error: `الحد الأقصى ${options.maxLength} حرف` };
    }

    if (type && this.rules[type] && trimmed) {
      if (!this.rules[type].test(trimmed)) {
        return { valid: false, error: `تنسيق ${type} غير صحيح` };
      }
    }

    if (typeof options.custom === 'function') {
      const r = options.custom(trimmed);
      if (!r || r.valid === false) return r || { valid: false, error: 'قيمة غير صالحة' };
    }

    return { valid: true, sanitized: this.sanitize(trimmed, options.sanitizeAs || type) };
  }

  sanitize(input, type) {
    const value = (typeof input === 'string') ? input : (input == null ? '' : String(input));
    switch (type) {
      case 'html':
        return this.sanitizeHTML(value);
      case 'sql':
        return this.sanitizeSQL(value);
      case 'filename':
        return this.sanitizeFilename(value);
      case 'json':
        return this.sanitizeJSON(value);
      default:
        return value
          .replace(/[<>]/g, '') // strip angle brackets
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
    }
  }

  sanitizeHTML(html) {
    return sanitizeHtml(html, {
      allowedTags: ['p','br','strong','em','u','a','ul','ol','li','blockquote','h3','h4','span'],
      allowedAttributes: { a: ['href','target'], span: ['style'] },
      allowedSchemes: ['http','https','mailto'],
      allowProtocolRelative: false,
      allowedStyles: { '*': { 'text-align': [/^left$/,/^right$/,/^center$/] } }
    });
  }

  sanitizeSQL(input) {
    return input
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)\b/gi, '');
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '_')
      .replace(/^\./, '_')
      .substring(0, 255);
  }

  sanitizeJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed);
    } catch {
      return '{}';
    }
  }

  // Validate and sanitize an object against a schema
  // schema: { field: { type, required, minLength, maxLength, custom, sanitizeAs } }
  validateObject(schema, data) {
    const errors = {};
    const sanitized = {};
    let ok = true;
    for (const [field, rules] of Object.entries(schema || {})) {
      const res = this.validate(data?.[field], rules.type, rules);
      if (!res.valid) {
        ok = false;
        errors[field] = res.error || 'قيمة غير صالحة';
      } else {
        sanitized[field] = res.sanitized;
      }
    }
    return { valid: ok, errors, sanitized };
  }
}

export const inputValidator = new InputValidator();

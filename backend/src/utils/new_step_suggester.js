const fs = require('fs');

function buildReferenceDisplayText(referenceText, fallbackLabel = 'Step') {
  const rawReference = normalizeReferenceText(referenceText);
  if (rawReference) return rawReference;
  return titleCase(fallbackLabel) || fallbackLabel;
}

function buildReferenceValue(referenceText, fallbackValue = 'Value') {
  const rawReference = normalizeReferenceText(referenceText);
  if (rawReference) return rawReference;
  return fallbackValue;
}

function buildStepIdentifierFromReference(referenceText, suffix, fallback = 'step') {
  const rawReference = normalizeReferenceText(referenceText);
  const base = toPascalCase(rawReference, fallback);
  const normalizedBase = base.toLowerCase();
  const normalizedSuffix = String(suffix || '').toLowerCase();
  if (!normalizedSuffix || normalizedBase.endsWith(normalizedSuffix)) {
    return base;
  }
  return `${base}${suffix}`;
}

function buildGenericStepIdentifier(role, fallback = 'step') {
  const normalizedRole = String(role || '').toLowerCase().trim();
  if (normalizedRole === 'radio') return 'stepOption';
  if (normalizedRole === 'checkbox') return 'stepCheckbox';
  if (normalizedRole === 'textbox') return 'stepField';
  if (normalizedRole === 'searchbox') return 'stepSearch';
  if (normalizedRole === 'combobox') return 'stepDropdown';
  if (normalizedRole === 'button') return 'stepButton';
  if (normalizedRole === 'link') return 'stepLink';
  return String(fallback || 'step').trim() || 'step';
}

function buildRoleSnippet(referenceText, options = {}) {
  const role = String(options.role || '').trim();
  const fallbackLabel = options.fallbackLabel || 'Step';
  const identifier = String(options.identifier || buildGenericStepIdentifier(role, options.suffix || 'step')).trim() || 'step';
  const locatorName = escapeSingleQuotedText(buildReferenceDisplayText(referenceText, fallbackLabel));
  const lines = [`const ${identifier} = page.getByRole('${role}', { name: '${locatorName}' });`];

  if (options.expectVisible) {
    lines.push(`await expect(${identifier}).toBeVisible();`);
  }
  if (options.expectEditable) {
    lines.push(`await expect(${identifier}).toBeEditable();`);
  }
  if (options.expectEnabled) {
    lines.push(`await expect(${identifier}).toBeEnabled();`);
  }
  if (options.fillReference) {
    lines.push(`await ${identifier}.fill('${escapeSingleQuotedText(buildReferenceValue(referenceText))}');`);
  }
  if (options.selectReference) {
    const selectedValue = escapeSingleQuotedText(buildReferenceValue(referenceText, 'Option'));
    lines.push(`await ${identifier}.selectOption('${selectedValue}');`);
    lines.push(`await expect(${identifier}).toHaveValue('${selectedValue}');`);
  }
  if (options.actionMethod) {
    lines.push(`await ${identifier}.${options.actionMethod}();`);
  }

  return lines.join('\n');
}

function buildFileUploadSnippet(referenceText, options = {}) {
  const identifier = String(options.identifier || 'stepUpload').trim() || 'stepUpload';
  const lines = [`const ${identifier} = page.locator('input[type="file"]');`];
  if (options.expectVisible !== false) {
    lines.push(`await expect(${identifier}).toBeVisible();`);
  }
  lines.push(`await ${identifier}.setInputFiles('path/to/file.pdf');`);
  return lines.join('\n');
}

function buildReferenceCode(template, referenceText) {
  if (typeof template.buildCode === 'function') {
    return template.buildCode(referenceText);
  }
  return `// Reference: ${normalizeReferenceText(referenceText) || template.label || 'Step'}\n`;
}

const STEP_TEMPLATES = {
  inputs: [
    {
      id: 'textbox',
      type: 'textbox-step',
      label: 'Input field',
      description: 'Insert a textbox locator, fill it, and verify the value.',
      keywords: ['text', 'input', 'field', 'name', 'email', 'password', 'username', 'search'],
      buildCode: (referenceText) => buildRoleSnippet(referenceText, {
        role: 'textbox',
        identifier: 'stepField',
        fallbackLabel: 'Input field',
        expectVisible: true,
        expectEditable: true,
        fillReference: true,
      }),
    },
    {
      id: 'textarea',
      type: 'textarea-step',
      label: 'Textarea',
      description: 'Insert a textarea locator, fill it, and verify the value.',
      keywords: ['text area', 'textarea', 'comment', 'message', 'notes', 'description'],
      buildCode: (referenceText) => buildRoleSnippet(referenceText, {
        role: 'textbox',
        identifier: 'stepArea',
        fallbackLabel: 'Textarea',
        expectEditable: true,
        fillReference: true,
      }),
    },
    {
      id: 'searchbox',
      type: 'searchbox-step',
      label: 'Search box',
      description: 'Insert a search box locator, fill it, and verify the value.',
      keywords: ['search', 'find', 'lookup', 'filter'],
      buildCode: (referenceText) => buildRoleSnippet(referenceText, {
        role: 'searchbox',
        identifier: 'stepSearch',
        fallbackLabel: 'Search',
        expectVisible: true,
        expectEditable: true,
      }),
    },
    {
      id: 'file-upload',
      type: 'file-upload-step',
      label: 'File upload',
      description: 'Insert a file input step and upload a file.',
      keywords: ['upload', 'file', 'attach', 'document', 'image', 'pdf', 'browse'],
      buildCode: (referenceText) => buildFileUploadSnippet(referenceText, {
        identifier: 'stepUpload',
      }),
    },
  ],
  choices: [
    {
      id: 'radio',
      type: 'radio-step',
      label: 'Radio button',
      description: 'Insert a radio control and select it.',
      keywords: ['radio', 'option', 'choice', 'select one'],
      buildCode: (referenceText) => buildRoleSnippet(referenceText, {
        role: 'radio',
        identifier: 'stepOption',
        fallbackLabel: 'Radio option',
        actionMethod: 'check',
      }),
    },
    {
      id: 'checkbox',
      type: 'checkbox-step',
      label: 'Checkbox',
      description: 'Insert a checkbox control and select it.',
      keywords: ['checkbox', 'agree', 'accept', 'terms', 'subscribe', 'remember'],
      buildCode: (referenceText) => buildRoleSnippet(referenceText, {
        role: 'checkbox',
        identifier: 'stepCheckbox',
        fallbackLabel: 'Checkbox option',
        actionMethod: 'check',
      }),
    },
  ],
  selects: [
    {
      id: 'combobox',
      type: 'combobox-step',
      label: 'Dropdown select',
      description: 'Insert a dropdown locator and readiness checks.',
      keywords: ['dropdown', 'select', 'combobox', 'choose', 'pick', 'option'],
      buildCode: (referenceText) => buildRoleSnippet(referenceText, {
        role: 'combobox',
        identifier: 'stepDropdown',
        fallbackLabel: 'Dropdown',
        expectVisible: true,
        expectEnabled: true,
      }),
    },
    {
      id: 'option',
      type: 'select-option-step',
      label: 'Select option',
      description: 'Insert a dropdown locator and select an option.',
      keywords: ['dropdown', 'select', 'option', 'choose', 'pick'],
      buildCode: (referenceText) => buildRoleSnippet(referenceText, {
        role: 'combobox',
        identifier: 'stepDropdown',
        fallbackLabel: 'Dropdown',
        selectReference: true,
      }),
    },
  ],
  actions: [
    {
      id: 'button',
      type: 'button-step',
      label: 'Button click',
      description: 'Insert a button locator, visibility check, and click.',
      keywords: ['button', 'click', 'submit', 'save', 'continue', 'next', 'start', 'finish'],
      buildCode: (referenceText) => buildRoleSnippet(referenceText, {
        role: 'button',
        identifier: 'stepButton',
        fallbackLabel: 'Button label',
        expectVisible: true,
        actionMethod: 'click',
      }),
    },
    {
      id: 'link',
      type: 'link-step',
      label: 'Link click',
      description: 'Insert a link locator, visibility check, and click.',
      keywords: ['link', 'navigate', 'open', 'go to', 'visit'],
      buildCode: (referenceText) => buildRoleSnippet(referenceText, {
        role: 'link',
        identifier: 'stepLink',
        fallbackLabel: 'Link label',
        expectVisible: true,
        actionMethod: 'click',
      }),
    },
  ],
};

const CATEGORY_ORDER = ['inputs', 'choices', 'selects', 'actions'];

function isTestDeclarationLine(line) {
  return /^\s*test(?:\.describe)?\s*\(/.test(String(line || ''));
}

function normalizeCategory(value) {
  const category = String(value || '').toLowerCase().trim();
  if (CATEGORY_ORDER.includes(category)) {
    return category;
  }
  return 'inputs';
}

function inferCategoryFromLine(line) {
  const text = String(line || '').toLowerCase();
  if (/(checkbox|radio|\\.check\\(\\)|\\.uncheck\\(\\))/i.test(text)) return 'choices';
  if (/selectoption|combobox|dropdown|select\(/i.test(text)) return 'selects';
  if (/click\(|getbyrole\('button'|getbyrole\("button"|getbyrole\('link'|getbyrole\("link"/i.test(text)) return 'actions';
  return 'inputs';
}

function inferCategoryFromHint(hintText) {
  const text = String(hintText || '').toLowerCase();
  if (!text.trim()) return '';
  if (/(checkbox|radio|toggle|agree|accept|subscribe|remember)/i.test(text)) return 'choices';
  if (/(dropdown|select|combobox|choose|pick|option)/i.test(text)) return 'selects';
  if (/(button|click|submit|save|continue|next|open|navigate|go to|visit)/i.test(text)) return 'actions';
  if (/(upload|file|attach|document|image|pdf|browse)/i.test(text)) return 'inputs';
  if (/(search|find|lookup|filter|email|password|username|text|input|field|textarea|comment|message)/i.test(text)) return 'inputs';
  return '';
}

function normalizeTokens(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeReferenceText(hintText) {
  return String(hintText || '').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  return normalizeTokens(value)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function toPascalCase(value, fallback = 'step') {
  const tokens = normalizeTokens(value);
  if (!tokens.length) return fallback;
  return tokens.map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join('');
}

function escapeSingleQuotedText(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildSuggestionLabel(templateId, referenceText, fallbackLabel) {
  const label = buildReferenceDisplayText(referenceText, fallbackLabel);
  return label || fallbackLabel;
}

function buildSuggestionDescription(templateId, referenceText, fallbackDescription) {
  const rawReference = normalizeReferenceText(referenceText);
  if (!rawReference) {
    return fallbackDescription;
  }
  return `Use "${rawReference}" as the reference text for this step.`;
}

function scoreTemplate(item, hintText) {
  const hint = String(hintText || '').toLowerCase();
  if (!hint.trim()) return 0;

  const keywords = Array.isArray(item.keywords) ? item.keywords : [];
  let score = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = String(keyword || '').toLowerCase().trim();
    if (!normalizedKeyword) continue;
    if (hint.includes(normalizedKeyword)) {
      score += normalizedKeyword.includes(' ') ? 3 : 2;
    }
  }

  const tokens = normalizeTokens(hint);
  if (tokens.includes(item.id)) score += 4;
  if (tokens.includes(item.type)) score += 4;
  if (tokens.includes(item.category)) score += 2;
  if (tokens.some((token) => item.label.toLowerCase().includes(token))) score += 2;

  return score;
}

function countBraces(line) {
  const text = String(line || '');
  const opens = (text.match(/\{/g) || []).length;
  const closes = (text.match(/\}/g) || []).length;
  return opens - closes;
}

function isInsideTestBlock(lineNumber, allLines) {
  const currentIndex = Number(lineNumber);
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || !Array.isArray(allLines) || !allLines.length) {
    return false;
  }

  let startIndex = -1;
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (isTestDeclarationLine(allLines[index])) {
      startIndex = index;
      break;
    }
  }
  if (startIndex < 0) {
    return false;
  }

  let braceDepth = 0;
  for (let index = startIndex; index < currentIndex; index += 1) {
    braceDepth += countBraces(allLines[index]);
  }
  return braceDepth > 0;
}

function buildSuggestions(category, hintText = '') {
  const key = normalizeCategory(category);
  const templates = STEP_TEMPLATES[key] || STEP_TEMPLATES.inputs;
  const referenceText = normalizeReferenceText(hintText);
  const scored = templates.map((item, index) => ({
    ...item,
    _index: index,
    _score: scoreTemplate(item, hintText),
  }));
  scored.sort((left, right) => {
    if (right._score !== left._score) {
      return right._score - left._score;
    }
    return left._index - right._index;
  });
  return scored.map(({ _index, _score, ...item }) => ({
    id: item.id,
    type: item.type,
    category: key,
    label: buildSuggestionLabel(item.id, referenceText, item.label),
    description: buildSuggestionDescription(item.id, referenceText, item.description),
    code: buildReferenceCode(item, referenceText),
    referenceText,
  }));
}

class NewStepSuggesterService {
  suggestSteps(payload = {}) {
    const hintText = String(payload.hintText || '').trim();
    const inferredCategory = inferCategoryFromHint(hintText) || inferCategoryFromLine(payload.line || '');
    const category = normalizeCategory(payload.category || inferredCategory);
    const allLines = Array.isArray(payload.allLines) ? payload.allLines : [];
    const lineNumber = Number(payload.lineNumber || 0);
    const inTestBlock = isInsideTestBlock(lineNumber, allLines);
    if (!inTestBlock) {
      return {
        category,
        inTestBlock,
        reason: 'Add new step suggestions are available only inside the `test(...)` body.',
        suggestions: [],
      };
    }
    return {
      category,
      inTestBlock,
      reason: hintText ? 'Suggestions are ordered using your text hint.' : '',
      suggestions: buildSuggestions(category, hintText),
    };
  }

  suggestForLine(line, lineNumber, allLines = [], category = '', hintText = '') {
    const result = this.suggestSteps({ line, lineNumber, allLines, category, hintText });
    return {
      lineNumber: Number(lineNumber) || 0,
      line: String(line || ''),
      suggestions: result.suggestions,
      category: result.category,
      inTestBlock: Boolean(result.inTestBlock),
      reason: result.reason || '',
    };
  }

  suggestForScript(scriptText, options = {}) {
    const lines = String(scriptText || '').split(/\r?\n/);
    const results = [];
    lines.forEach((line, index) => {
      const category = normalizeCategory(options.category || inferCategoryFromLine(line));
      const suggestionSet = this.suggestForLine(line, index + 1, lines, category, options.hintText || '');
      if (suggestionSet.suggestions.length) {
        results.push(suggestionSet);
      }
    });
    return results;
  }
}

function main() {
  const input = fs.readFileSync(0, 'utf8').trim();
  const payload = input ? JSON.parse(input) : {};
  const service = new NewStepSuggesterService();

  let response;
  if (payload.mode === 'script') {
    response = {
      results: service.suggestForScript(payload.scriptText || '', {
        category: String(payload.category || ''),
        hintText: String(payload.hintText || ''),
      }),
    };
  } else {
    const suggestionSet = service.suggestForLine(
      payload.line || '',
      Number(payload.lineNumber || 0),
      Array.isArray(payload.allLines) ? payload.allLines : [],
      payload.category || '',
      String(payload.hintText || ''),
    );
    response = {
      suggestions: suggestionSet.suggestions,
      category: suggestionSet.category,
    };
  }

  process.stdout.write(JSON.stringify(response));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(error.stack || String(error));
    process.exit(1);
  }
}

module.exports = {
  NewStepSuggesterService,
  buildSuggestions,
  inferCategoryFromLine,
  isInsideTestBlock,
};

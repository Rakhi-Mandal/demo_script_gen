const fs = require('fs');
const path = require('path');

const SKIP_PREFIXES = ['//', '/*', 'import ', 'const ', 'let ', 'test(', 'test.describe'];
const PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'assertion_suggester_prompt.py');

class CodeContext {
  constructor({
    previous_line = '',
    next_line = '',
    previous_lines = [],
    is_in_test_block = false,
    is_after_navigation = false,
    is_before_expect = false,
    is_in_form_context = false,
    is_in_modal_context = false,
  } = {}) {
    this.previous_line = previous_line;
    this.next_line = next_line;
    this.previous_lines = previous_lines;
    this.is_in_test_block = is_in_test_block;
    this.is_after_navigation = is_after_navigation;
    this.is_before_expect = is_before_expect;
    this.is_in_form_context = is_in_form_context;
    this.is_in_modal_context = is_in_modal_context;
  }
}

class AssertionSuggesterService {
  constructor() {
    this.prompt = getAssertionSuggesterPrompt();
  }

  suggestAssertions(line, lineNumber, allLines) {
    const trimmed = (line || '').trim();
    if (this.shouldSkipLine(trimmed) || this.isExpectLine(trimmed)) {
      return [];
    }

    if (!this.isInTestBlock(lineNumber, allLines)) {
      return [];
    }

    const context = this.getContext(lineNumber, allLines);
    const locatorMap = this.buildLocatorMap(allLines);
    let suggestions = [];

    if (this.isNavigationLine(trimmed)) {
      suggestions = suggestions.concat(this.getNavigationAssertions(trimmed));
    }
    if (this.isClickLine(trimmed)) {
      suggestions = suggestions.concat(this.getClickAssertions(trimmed, context, locatorMap));
    }
    if (this.isFillLine(trimmed)) {
      suggestions = suggestions.concat(this.getFillAssertions(trimmed, locatorMap));
    }
    if (this.isSelectLine(trimmed)) {
      suggestions = suggestions.concat(this.getSelectAssertions(trimmed, locatorMap));
    }
    if (this.isCheckboxLine(trimmed)) {
      suggestions = suggestions.concat(this.getCheckboxAssertions(trimmed, locatorMap));
    }
    if (this.isGetByRoleLine(trimmed)) {
      suggestions = suggestions.concat(this.getByRoleAssertions(trimmed));
    }
    if (this.isLocatorLine(trimmed) && !this.isClickLine(trimmed)) {
      suggestions = suggestions.concat(this.getLocatorAssertions(trimmed));
    }
    if (this.isExpectLine(trimmed)) {
      suggestions = suggestions.concat(this.getAdditionalExpectAssertions(trimmed));
    }

    suggestions = suggestions.concat(this.getContextualAssertions(context));
    const filterTarget = this.isNavigationLine(trimmed) ? this.extractNavigationTarget(trimmed) : '';
    suggestions = this.filterExistingAssertions(trimmed, lineNumber, allLines, locatorMap, suggestions, filterTarget);
    return this.rankAndDeduplicate(suggestions);
  }

  suggestForScript(scriptText) {
    const lines = String(scriptText || '').split(/\r?\n/);
    const results = [];
    lines.forEach((line, index) => {
      const suggestions = this.suggestAssertions(line, index, lines);
      if (suggestions.length) {
        results.push({
          lineNumber: index + 1,
          line,
          suggestions,
        });
      }
    });
    return results;
  }

  shouldSkipLine(line) {
    return !line || SKIP_PREFIXES.some((prefix) => line.startsWith(prefix)) || line === '}' || line === '{';
  }

  getContext(lineNumber, allLines) {
    const previousLine = lineNumber > 0 ? (allLines[lineNumber - 1] || '').trim() : '';
    const nextLine = lineNumber < allLines.length - 1 ? (allLines[lineNumber + 1] || '').trim() : '';
    const previousTwo = lineNumber > 1 ? (allLines[lineNumber - 2] || '').trim() : '';
    return new CodeContext({
      previous_line: previousLine,
      next_line: nextLine,
      previous_lines: [previousTwo, previousLine].filter(Boolean),
      is_in_test_block: this.isInTestBlock(lineNumber, allLines),
      is_after_navigation: this.isNavigationLine(previousLine),
      is_before_expect: nextLine.includes('expect('),
      is_in_form_context: this.detectFormContext(lineNumber, allLines),
      is_in_modal_context: this.detectModalContext(lineNumber, allLines),
    });
  }

  isInTestBlock(lineNumber, allLines) {
    for (let index = lineNumber; index >= 0; index -= 1) {
      if ((allLines[index] || '').includes('test(') || (allLines[index] || '').includes('test.describe(')) {
        return true;
      }
    }
    return false;
  }

  detectFormContext(lineNumber, allLines) {
    return this.getLineRange(lineNumber, allLines, 5).some((line) =>
      ['fill(', 'type(', 'pressSequentially(', 'input', 'form', '[type="submit"]'].some((token) => line.includes(token))
    );
  }

  detectModalContext(lineNumber, allLines) {
    return this.getLineRange(lineNumber, allLines, 5).some((line) =>
      ['dialog', 'modal', '[role="dialog"]'].some((token) => line.includes(token))
    );
  }

  getLineRange(lineNumber, allLines, radius) {
    const start = Math.max(0, lineNumber - radius);
    const end = Math.min(allLines.length, lineNumber + radius + 1);
    return allLines.slice(start, end).map((line) => (line || '').trim());
  }

  buildLocatorMap(allLines) {
    const locatorMap = {};
    const assignmentPattern = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);?$/;
    allLines.forEach((rawLine) => {
      const line = (rawLine || '').trim();
      const match = assignmentPattern.exec(line);
      if (!match) return;
      const name = match[1];
      const expression = match[2].trim();
      if (this.looksLikeLocatorExpression(expression)) {
        locatorMap[name] = expression;
      }
    });
    return locatorMap;
  }

  buildReverseLocatorMap(locatorMap) {
    const reverseMap = {};
    Object.entries(locatorMap).forEach(([name, expression]) => {
      const normalizedExpression = this._normalizeText(expression);
      if (!reverseMap[normalizedExpression]) {
        reverseMap[normalizedExpression] = new Set();
      }
      reverseMap[normalizedExpression].add(name);
    });
    return reverseMap;
  }

  looksLikeLocatorExpression(expression) {
    return ['page.locator(', 'page.getBy', '.locator(', '.getBy'].some((token) => expression.includes(token));
  }

  isNavigationLine(line) {
    return line.includes('.goto(') || line.includes('.navigate(');
  }

  isClickLine(line) {
    return line.includes('.click()');
  }

  isFillLine(line) {
    return ['.fill(', '.type(', '.pressSequentially('].some((token) => line.includes(token));
  }

  isSelectLine(line) {
    return line.includes('.selectOption(');
  }

  isCheckboxLine(line) {
    return ['.check()', '.uncheck()', '.setChecked('].some((token) => line.includes(token));
  }

  isGetByRoleLine(line) {
    return line.includes('.getByRole(');
  }

  isLocatorLine(line) {
    return ['.locator(', '.getByText(', '.getByLabel(', '.getByPlaceholder(', '.getByTestId('].some((token) => line.includes(token));
  }

  isWaitLine(line) {
    return line.includes('.waitFor') || line.includes('waitForTimeout') || line.includes('waitForLoadState');
  }

  isExpectLine(line) {
    return line.includes('expect(');
  }

  extractNavigationTarget(line) {
    const match = /\.goto\((.+?)\)/.exec(line);
    if (!match) return '';
    let target = match[1].trim();
    if (target.endsWith(';')) {
      target = target.slice(0, -1).trimEnd();
    }
    return target;
  }

  formatNavigationTarget(target) {
    if (!target) return "''";
    if ((target.startsWith("'") && target.endsWith("'")) || (target.startsWith('"') && target.endsWith('"'))) {
      return target;
    }
    return target;
  }

  extractLocatorFromLine(line) {
    const patterns = [
      /(page\.locator\([^)]+\))/,
      /(page\.getByRole\([^)]+(?:\{[^}]+\})?\))/,
      /(page\.getBy\w+\([^)]+\))/,
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(line);
      if (match) return match[1];
    }
    return '';
  }

  extractActionTargetName(line) {
    const match = /(?:await\s+)?([A-Za-z_$][\w$]*)\.(?:fill|type|pressSequentially|click|check|uncheck|setChecked|selectOption)\(/.exec(line);
    return match ? match[1] : '';
  }

  resolveTargetExpression(line, locatorMap) {
    const directLocator = this.extractLocatorFromLine(line);
    if (directLocator) return directLocator;
    const targetName = this.extractActionTargetName(line);
    if (targetName) return locatorMap[targetName] || targetName;
    return '';
  }

  normalizeLocatorExpression(expression) {
    let text = (expression || '').trim();
    if (text.endsWith(';')) {
      text = text.slice(0, -1).trimEnd();
    }
    return text;
  }

  extractExpectTarget(line) {
    const match = /expect\((.+?)\)/.exec(line);
    return match ? this.normalizeLocatorExpression(match[1].trim()) : '';
  }

  extractExpectMatcher(line) {
    const match = /\)\.(to[A-Za-z0-9_.]+(?:\([^)]*\))?)\s*;?$/.exec(line.trim());
    return match ? match[1].trim() : '';
  }

  extractWaitForUrlTarget(line) {
    const match = /\.waitForURL\((.+?)\)/.exec(line);
    if (!match) return '';
    return this.normalizeLocatorExpression(match[1].trim());
  }

  extractToHaveUrlTarget(line) {
    const match = /\.toHaveURL\((.+?)\)/.exec(line);
    if (!match) return '';
    return this.normalizeLocatorExpression(match[1].trim());
  }

  isUrlAssertionLine(line) {
    return line.includes('.toHaveURL(') || line.includes('.waitForURL(');
  }

  hasExistingUrlAssertion(allLines, target, ignoreLineNumber = -1) {
    const normalizedTarget = this._normalizeText(this.normalizeLocatorExpression(target));
    if (!normalizedTarget) return false;

    return allLines.some((rawLine, index) => {
      if (index === ignoreLineNumber) {
        return false;
      }
      const line = String(rawLine || '').trim();
      if (!this.isUrlAssertionLine(line)) {
        return false;
      }

      const lineTargets = [
        this.extractToHaveUrlTarget(line),
        this.extractWaitForUrlTarget(line),
      ]
        .filter(Boolean)
        .map((value) => this._normalizeText(this.normalizeLocatorExpression(value)));

      return lineTargets.some((value) => value && value === normalizedTarget);
    });
  }

  expandEquivalentTargets(expression, locatorMap, reverseMap) {
    const seed = this.normalizeLocatorExpression(expression);
    if (!seed) return new Set();

    const queue = [seed];
    const seen = new Set();
    const equivalents = new Set();

    while (queue.length) {
      const current = this.normalizeLocatorExpression(queue.pop());
      if (!current || seen.has(current)) continue;
      seen.add(current);
      equivalents.add(current);

      const mapped = locatorMap[current];
      if (mapped) queue.push(mapped);

      const normalizedCurrent = this._normalizeText(current);
      const aliases = reverseMap[normalizedCurrent] || new Set();
      aliases.forEach((alias) => {
        if (!seen.has(alias)) queue.push(alias);
      });
    }

    return equivalents;
  }

  extractFillValue(line) {
    for (const pattern of [/fill\((.+?)\)/, /type\((.+?)\)/, /pressSequentially\((.+?)\)/]) {
      const match = pattern.exec(line);
      if (match) return match[1].trim();
    }
    return '';
  }

  extractSelectValue(line) {
    const match = /selectOption\((.+?)\)/.exec(line);
    return match ? match[1].trim() : '';
  }

  extractRole(line) {
    const match = /getByRole\(['"](.+?)['"]/.exec(line);
    return match ? match[1] : '';
  }

  extractId(line) {
    const match = /id['"]\s*:\s*['"](.+?)['"]/.exec(line);
    return match ? match[1] : '';
  }

  detectElementType(line) {
    if (line.includes("'button'") || line.includes('"button"')) return 'button';
    if (line.includes("'link'") || line.includes('"link"')) return 'link';
    if (line.includes("'textbox'") || line.includes('"textbox"')) return 'textbox';
    return 'element';
  }

  isEmailField(line) {
    return line.includes('email') || line.includes('@') || line.includes('[type="email"]');
  }

  isPhoneField(line) {
    return line.includes('phone') || line.includes('tel') || line.includes('[type="tel"]');
  }

  isPasswordField(line) {
    return line.includes('password') || line.includes('[type="password"]');
  }

  getNavigationAssertions(line) {
    const url = this.extractNavigationTarget(line);
    if (!url) {
      return [
        this._template('navigation', 'page_load', "await page.waitForLoadState('domcontentloaded');"),
        this._template('navigation', 'title_verification', 'await expect(page).toHaveTitle(/expected title/);'),
      ];
    }
    return [
      this._template('navigation', 'url_verification', `await expect(page).toHaveURL(${this.formatNavigationTarget(url)});`),
      this._template('navigation', 'title_verification', 'await expect(page).toHaveTitle(/expected title/);'),
      this._template('navigation', 'page_load', "await page.waitForLoadState('domcontentloaded');"),
    ];
  }

  getClickAssertions(line, context, locatorMap) {
    const locator = this.resolveTargetExpression(line, locatorMap);
    if (!locator) return [];
    const elementType = this.detectElementType(line);
    const suggestions = [
      this._template('click', 'element_visible_before', `await expect(${locator}).toBeVisible();`),
      this._template('click', 'element_enabled', `await expect(${locator}).toBeEnabled();`),
    ];
    if (['button', 'link'].includes(elementType)) {
      suggestions.push(this._template('click', 'button_text', `await expect(${locator}).toContainText(/.+/);`));
    }
    suggestions.push(this._template('click', 'wait_after_click', "await page.waitForLoadState('networkidle');"));
    if (context.is_in_modal_context) {
      suggestions.push(this._template('click', 'modal_appears', 'await expect(page.locator(\'[role="dialog"], .modal\')).toBeVisible();'));
    }
    return suggestions;
  }

  getFillAssertions(line, locatorMap) {
    const locator = this.resolveTargetExpression(line, locatorMap);
    const value = this.extractFillValue(line);
    if (!locator || !value) return [];

    const suggestions = [
      this._template('fill', 'input_value', `await expect(${locator}).toHaveValue(${value});`),
      this._template('fill', 'input_enabled', `await expect(${locator}).toBeEnabled();`),
    ];
    if (this.isEmailField(line)) {
      suggestions.push(this._template('fill', 'email_format', `await expect(${locator}).toHaveValue(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/);`));
    }
    if (this.isPhoneField(line)) {
      suggestions.push(this._template('fill', 'phone_format', `await expect(${locator}).toHaveValue(/^[\\d\\s()+-]+$/);`));
    }
    if (this.isPasswordField(line)) {
      suggestions.push(this._template('fill', 'password_masked', `await expect(${locator}).toHaveAttribute('type', 'password');`));
    }
    return suggestions;
  }

  getSelectAssertions(line, locatorMap) {
    const locator = this.resolveTargetExpression(line, locatorMap);
    const selectedValue = this.extractSelectValue(line);
    if (!locator || !selectedValue) return [];
    return [
      this._template('select', 'selected_value', `await expect(${locator}).toHaveValue(${selectedValue});`),
      this._template('select', 'dropdown_enabled', `await expect(${locator}).toBeEnabled();`),
    ];
  }

  getCheckboxAssertions(line, locatorMap) {
    const locator = this.resolveTargetExpression(line, locatorMap);
    if (!locator) return [];
    const checking = line.includes('.check()');
    return [
      this._template('checkbox', checking ? 'checked' : 'unchecked', `await expect(${locator}).${checking ? 'toBeChecked' : 'not.toBeChecked'}();`),
      this._template('checkbox', 'enabled', `await expect(${locator}).toBeEnabled();`),
    ];
  }

  getByRoleAssertions(line) {
    const locator = this.extractLocatorFromLine(line);
    if (!locator) return [];
    const role = this.extractRole(line);
    const suggestions = [
      this._template('locator', 'visible', `await expect(${locator}).toBeVisible();`),
      this._template('locator', 'enabled', `await expect(${locator}).toBeEnabled();`),
    ];
    if (role) {
      suggestions.push({
        type: 'role-attribute',
        label: 'Verify role',
        description: 'Check the ARIA role used on this line',
        code: `await expect(${locator}).toHaveAttribute('role', '${role}');`,
        confidence: 'medium',
      });
    }
    if (role === 'button') {
      suggestions.push({
        type: 'button-not-pressed',
        label: 'Verify button is not pressed',
        description: 'Useful for toggle buttons that stay in the off state',
        code: `await expect(${locator}).toHaveAttribute('aria-pressed', 'false');`,
        confidence: 'low',
      });
    }
    return suggestions;
  }

  getLocatorAssertions(line) {
    const locator = this.extractLocatorFromLine(line);
    if (!locator) return [];
    return [
      this._template('locator', 'visible', `await expect(${locator}).toBeVisible();`),
      this._template('locator', 'attached', `await expect(${locator}).toBeAttached();`),
    ];
  }

  getAdditionalExpectAssertions(line) {
    return [
      {
        type: 'soft-assertion',
        label: 'Convert to Soft Assertion',
        description: 'Continue test even if this fails',
        code: line.replace('expect(', 'expect.soft('),
        confidence: 'low',
      },
    ];
  }

  getContextualAssertions(context) {
    const suggestions = [];
    if (context.is_after_navigation) {
      suggestions.push(this._template('context', 'page_ready', "await expect(page.locator('body')).toBeVisible();"));
    }
    if (context.is_in_modal_context) {
      suggestions.push(this._template('context', 'modal_overlay', "await expect(page.locator('.modal-backdrop, [class*=\"overlay\"]')).toBeVisible();"));
    }
    return suggestions;
  }

  filterExistingAssertions(line, lineNumber, allLines, locatorMap, suggestions, explicitTarget = '') {
    let target = this.resolveTargetExpression(line, locatorMap);
    if (!target) {
      target = explicitTarget || '';
    }
    if (!target) return suggestions;

    const reverseMap = this.buildReverseLocatorMap(locatorMap);
    const targetEquivalents = this.expandEquivalentTargets(target, locatorMap, reverseMap);
    const normalizedFullScript = this._normalizeText(allLines.join('\n'));
    const window = this.getLineRange(lineNumber, allLines, 3);
    const nearbyText = window.join('\n');
    const existingExpectations = window
      .filter((lineText) => lineText.includes('expect('))
      .map((lineText) => [this.extractExpectTarget(lineText), this.extractExpectMatcher(lineText)]);

    const filtered = [];
    for (const suggestion of suggestions) {
      const code = String(suggestion.code || '').trim();
      if (!code) {
        filtered.push(suggestion);
        continue;
      }

      const normalizedCode = this._normalizeText(code);
      if (normalizedCode && normalizedFullScript.includes(normalizedCode)) {
        continue;
      }

      if (this.isUrlAssertionLine(code)) {
        const suggestionTarget = this.extractToHaveUrlTarget(code) || this.extractWaitForUrlTarget(code) || this.extractNavigationTarget(code);
        if (suggestionTarget && this.hasExistingUrlAssertion(allLines, suggestionTarget, lineNumber)) {
          continue;
        }
      }

      if (nearbyText.includes(code)) {
        continue;
      }

      const suggestionTarget = this.extractExpectTarget(code);
      const suggestionMatcher = this.extractExpectMatcher(code);
      const suggestionEquivalents = suggestionTarget ? this.expandEquivalentTargets(suggestionTarget, locatorMap, reverseMap) : new Set();
      if (suggestionTarget && suggestionMatcher) {
        const duplicate = existingExpectations.some(([existingTarget, existingMatcher]) =>
          existingMatcher === suggestionMatcher &&
          existingTarget &&
          this.expandEquivalentTargets(existingTarget, locatorMap, reverseMap).size > 0 &&
          [...this.expandEquivalentTargets(existingTarget, locatorMap, reverseMap)].some((value) =>
            [...(suggestionEquivalents.size ? suggestionEquivalents : targetEquivalents)].includes(value)
          )
        );
        if (duplicate) continue;
      }

      filtered.push(suggestion);
    }

    return filtered;
  }

  _normalizeText(value) {
    return String(value || '').replace(/\s+/g, '');
  }

  _template(category, key, code) {
    const template = (((this.prompt || {})[category] || {})[key] || {});
    return {
      type: template.type || key.replace(/_/g, '-'),
      label: template.label || key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
      description: template.description || '',
      code,
      confidence: template.confidence || 'low',
    };
  }

  rankAndDeduplicate(suggestions) {
    const unique = [];
    const seenCodes = new Set();
    for (const suggestion of suggestions) {
      const code = suggestion.code || '';
      if (seenCodes.has(code)) continue;
      seenCodes.add(code);
      unique.push(suggestion);
    }

    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    return unique.sort((a, b) => (confidenceOrder[b.confidence || 'low'] || 1) - (confidenceOrder[a.confidence || 'low'] || 1));
  }
}

function getAssertionSuggesterPrompt() {
  const promptSource = fs.readFileSync(PROMPT_PATH, 'utf8');
  const match = promptSource.match(/return\s+"""([\s\S]*?)"""/);
  if (!match) {
    throw new Error(`Unable to extract prompt from ${PROMPT_PATH}`);
  }
  return JSON.parse(match[1]);
}

function main() {
  const input = fs.readFileSync(0, 'utf8').trim();
  const payload = input ? JSON.parse(input) : {};
  const service = new AssertionSuggesterService();
  let response;

  if (payload.mode === 'script') {
    response = { results: service.suggestForScript(payload.scriptText || '') };
  } else {
    response = {
      suggestions: service.suggestAssertions(payload.line || '', Number(payload.lineNumber || 0), Array.isArray(payload.allLines) ? payload.allLines : []),
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
  AssertionSuggesterService,
  CodeContext,
};

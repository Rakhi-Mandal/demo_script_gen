const resultEl = document.getElementById('result');
const statusEl = document.getElementById('status-pill');
const workflowProgressEl = document.getElementById('workflow-progress');
const artifactsSummaryEl = document.getElementById('artifacts-summary');
const llmUsageSummaryEl = document.getElementById('llm-usage-summary');
const codegenListEl = document.getElementById('codegen-list');
const specListEl = document.getElementById('spec-list');
const projectPathEl = document.getElementById('project-path');
const recordFormMessageEl = document.getElementById('record-form-message');
const projectSelectEl = document.getElementById('project-select');
const projectCreateNameEl = document.getElementById('project-create-name');
const projectCreateLocationEl = document.getElementById('project-create-location');
const projectGithubUrlEl = document.getElementById('project-github-url');
const createProjectButtonEl = document.getElementById('create-project');
const browseProjectLocationButtonEl = document.getElementById('browse-project-location');
const projectListEl = document.getElementById('project-list');
const refreshProjectsButtonEl = document.getElementById('refresh-projects');
const projectPathStatusEl = document.getElementById('project-path-status');
const saveProjectPathButtonEl = document.getElementById('save-project-path');
const browseProjectPathButtonEl = document.getElementById('browse-project-path');
const recordTestTypeEl = document.getElementById('record-test-type');
const latestCodegenPathEl = document.getElementById('latest-codegen-path');
const latestCodegenContentEl = document.getElementById('latest-codegen-content');
const latestAiPathEl = document.getElementById('latest-ai-path');
const latestAiContentEl = document.getElementById('latest-ai-content');
const latestTestDataPathEl = document.getElementById('latest-testdata-path');
const latestTestDataContentEl = document.getElementById('latest-testdata-content');
const relatedListEl = document.getElementById('related-list');
const relatedEmptyEl = document.getElementById('related-empty');
const refreshRelatedButtonEl = document.getElementById('refresh-related');
const assertionPopupEl = document.getElementById('assertion-popup');
const assertionPopupTitleEl = document.getElementById('assertion-popup-title');
const assertionPopupModeToggleEl = document.getElementById('assertion-popup-mode-toggle');
const assertionPopupMetaEl = document.getElementById('assertion-popup-meta');
const assertionPopupBodyEl = document.getElementById('assertion-popup-body');
const assertionPopupCloseEl = document.getElementById('assertion-popup-close');
let activeJobSocket = null;
let activePickerSocket = null;
let activeSetupSocket = null;
let activeRunSocket = null;
let activeJobPollTimer = null;
const relatedScriptRecords = new Map();
let currentAssertionContext = null;
const DEFAULT_API_ORIGIN = 'http://localhost:8000';
const PROJECT_PATH_STORAGE_KEY = 'playwrightWorkflowProjectPath';

// Persist per-project Browser Mode and Execution dropdown choices across re-renders.
// Keyed by project path. Lost on page refresh (deliberate per user request).
window.__projectUIPrefs = window.__projectUIPrefs || new Map();

function rememberProjectPref(projectPath, key, value) {
  if (!projectPath) return;
  const existing = window.__projectUIPrefs.get(projectPath) || {};
  existing[key] = value;
  window.__projectUIPrefs.set(projectPath, existing);
}

function getProjectPref(projectPath, key, defaultValue) {
  const prefs = window.__projectUIPrefs.get(projectPath) || {};
  return prefs[key] != null ? prefs[key] : defaultValue;
}

// Auto-save dropdown changes via event delegation (fires whenever any project-local-mode
// or project-local-execution dropdown changes anywhere on the page)
document.addEventListener('change', (e) => {
  const target = e.target;
  if (!target || !target.classList) return;
  const card = target.closest && target.closest('.project-card');
  if (!card) return;
  const projectPath = card.querySelector('[data-project-path]')?.dataset?.projectPath;
  if (!projectPath) return;
  if (target.classList.contains('project-local-mode')) {
    rememberProjectPref(projectPath, 'browserMode', target.value);
  } else if (target.classList.contains('project-local-execution')) {
    rememberProjectPref(projectPath, 'execution', target.value);
  } else if (target.classList.contains('project-jenkins-mode')) {
    rememberProjectPref(projectPath, 'jenkinsBrowserMode', target.value);
  } else if (target.classList.contains('project-jenkins-execution')) {
    rememberProjectPref(projectPath, 'jenkinsExecution', target.value);
  }
});

// After loadProjects re-renders the cards, restore saved dropdown values
function restoreProjectDropdowns() {
  document.querySelectorAll('.project-card').forEach((card) => {
    const projectPath = card.querySelector('[data-project-path]')?.dataset?.projectPath;
    if (!projectPath) return;
    const prefs = window.__projectUIPrefs.get(projectPath);
    if (!prefs) return;
    const fields = [
      ['browserMode', '.project-local-mode'],
      ['execution', '.project-local-execution'],
      ['jenkinsBrowserMode', '.project-jenkins-mode'],
      ['jenkinsExecution', '.project-jenkins-execution'],
    ];
    for (const [key, selector] of fields) {
      const el = card.querySelector(selector);
      if (el && prefs[key] != null) el.value = prefs[key];
    }
  });
}

// Watch DOM mutations under project-list and restore dropdowns after re-render
(function setupDropdownRestore() {
  const observer = new MutationObserver(() => {
    clearTimeout(window.__restoreDropdownsTimer);
    window.__restoreDropdownsTimer = setTimeout(restoreProjectDropdowns, 50);
  });
  const target = document.getElementById('project-list');
  if (target) observer.observe(target, { childList: true, subtree: true });
  else {
    // DOM not ready yet â€” observe later
    document.addEventListener('DOMContentLoaded', () => {
      const t = document.getElementById('project-list');
      if (t) observer.observe(t, { childList: true, subtree: true });
    });
  }
});

function resolveApiOrigin() {
  const params = new URLSearchParams(window.location.search);
  const queryOrigin = params.get('apiBase') || params.get('apiOrigin');
  const storedOrigin = window.localStorage.getItem('playwrightWorkflowApiOrigin');
  const candidate = queryOrigin || storedOrigin;

  if (candidate) {
    try {
      return new URL(candidate).origin;
    } catch {
      // Ignore invalid custom value and fall through to auto-detection.
    }
  }

  if (window.location.protocol === 'file:') {
    return DEFAULT_API_ORIGIN;
  }

  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalHost && window.location.port && window.location.port !== '8000') {
    return DEFAULT_API_ORIGIN;
  }

  return window.location.origin;
}

const API_ORIGIN = resolveApiOrigin();

function apiUrl(pathname) {
  return new URL(pathname, `${API_ORIGIN}/`).toString();
}

function apiUrlWithParams(pathname, params = {}) {
  const url = new URL(pathname, `${API_ORIGIN}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function reportHtmlUrl(value) {
  return value ? apiUrl(value) : '';
}

function reportFileUrl(value) {
  return apiUrlWithParams('/api/reports/file', { reportPath: value });
}

function reportDownloadUrl(value) {
  return apiUrlWithParams('/api/reports/download', { reportPath: value });
}

function jobSocketUrl(jobId) {
  const api = new URL(API_ORIGIN);
  const protocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${api.host}/ws/jobs?jobId=${encodeURIComponent(jobId)}`;
}

function wsUrl(pathname) {
  const api = new URL(API_ORIGIN);
  const protocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${api.host}${pathname}`;
}

function setRelatedEmptyState(message, visible = true) {
  if (!relatedEmptyEl) return;
  relatedEmptyEl.textContent = message || '';
  relatedEmptyEl.hidden = !visible;
  relatedEmptyEl.style.display = visible ? 'block' : 'none';
}

function relatedRecordId(item, index) {
  return String(
    item?.recordId
    || item?.id
    || item?.key
    || item?.filePath
    || item?.generatedPath
    || item?.testName
    || `related-${index}`
  );
}

function relatedRecordTitle(item, index) {
  return String(
    item?.testName
    || item?.name
    || item?.scriptName
    || item?.generatedPath
    || item?.filePath
    || item?.title
    || `Saved script ${index + 1}`
  );
}

function relatedRecordContent(item) {
  return String(
    item?.refinedSpec?.content
    || item?.content
    || item?.script
    || item?.aiContent
    || item?.refinedContent
    || ''
  );
}

function relatedRecordBrowsers(item) {
  const value = item?.projects || item?.browsers || item?.browserProjects || ['chromium'];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return ['chromium'];
}

function renderRelatedScripts(items = []) {
  if (!relatedListEl) return;

  relatedScriptRecords.clear();
  const records = Array.isArray(items) ? items : [];

  if (!records.length) {
    relatedListEl.innerHTML = '';
    setRelatedEmptyState('No ChromaDB script history found yet.', true);
    return;
  }

  setRelatedEmptyState('', false);
  relatedListEl.innerHTML = records.map((item, index) => {
    const recordId = relatedRecordId(item, index);
    const title = relatedRecordTitle(item, index);
    const content = relatedRecordContent(item);
    const browsers = relatedRecordBrowsers(item);
    const summaryParts = [
      item?.projectPath ? `Project: ${item.projectPath}` : '',
      item?.generatedPath ? `Path: ${item.generatedPath}` : '',
      item?.createdAt ? `Saved: ${formatProjectDate(item.createdAt)}` : item?.timestamp ? `Saved: ${formatProjectDate(item.timestamp)}` : '',
    ].filter(Boolean);

    relatedScriptRecords.set(recordId, {
      ...item,
      recordId,
      refinedSpec: {
        ...(item?.refinedSpec || {}),
        content,
      },
      testName: item?.testName || title,
      generatedPath: item?.generatedPath || item?.filePath || '',
    });

    return `
      <article class="related-card">
        <div class="panel-label">Saved Script</div>
        <h3>${escapeHtml(title)}</h3>
        <div class="related-meta">
          ${summaryParts.map((part) => `<div>${escapeHtml(part)}</div>`).join('')}
        </div>
        <div class="related-browser-grid">
          ${['chromium', 'chrome', 'msedge', 'firefox', 'webkit'].map((browser) => `
            <label>
              <input type="checkbox" name="related-projects" value="${escapeHtml(browser)}"${browsers.includes(browser) ? ' checked' : ''} />
              <span>${escapeHtml(browser)}</span>
            </label>
          `).join('')}
          <label>
            <input type="checkbox" name="related-headed"${item?.headed === false ? '' : ' checked'} />
            <span>Headed</span>
          </label>
        </div>
        <div class="related-run">
          <button class="button button-primary related-execute" type="button" data-record-id="${escapeHtml(recordId)}">Run Saved Spec</button>
          <span class="related-headed">Saved ChromaDB record</span>
        </div>
        <details class="related-script">
          <summary>Saved spec content</summary>
          <pre>${escapeHtml(content || 'No saved script content available.')}</pre>
        </details>
        <pre class="related-run-output" hidden></pre>
      </article>
    `;
  }).join('');
}

function setStatus(mode, text) {
  statusEl.className = `status-pill status-${mode}`;
  statusEl.textContent = text;
}

function compactLongText(value, maxLength = 1200) {
  const text = String(value || '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n... truncated ${text.length - maxLength} characters.`;
}

function compactResultPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const copy = JSON.parse(JSON.stringify(payload));
  const result = copy.job?.result || copy.result;
  if (result && typeof result === 'object') {
    for (const key of ['recordStdout', 'recordStderr', 'refineStdout', 'refineStderr']) {
      if (result[key]) {
        result[key] = compactLongText(result[key]);
      }
    }
  }
  return copy;
}

function showResult(payload) {
  resultEl.textContent = JSON.stringify(compactResultPayload(payload), null, 2);
  const usage = payload?.job?.result?.llmUsage || payload?.result?.llmUsage || payload?.llmUsage || null;
  if (usage) {
    renderLlmUsageSummary(usage);
  }
}

function formatTokenCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count.toLocaleString() : '0';
}

function formatCostValue(value) {
  const cost = Number(value);
  if (!Number.isFinite(cost)) {
    return 'Not available';
  }
  return `$${cost.toFixed(6)}`;
}

function renderLlmUsageSummary(usage) {
  if (!llmUsageSummaryEl) return;

  if (!usage || typeof usage !== 'object') {
    llmUsageSummaryEl.innerHTML = '<div class="artifact-summary">No LLM usage recorded yet.</div>';
    return;
  }

  const provider = String(usage.provider || 'anthropic').trim();
  const model = String(usage.model || '').trim();
  const calls = Number(usage.calls || 0);
  const inputTokens = formatTokenCount(usage.inputTokens ?? usage.promptTokens ?? usage.prompt_tokens ?? 0);
  const outputTokens = formatTokenCount(usage.outputTokens ?? usage.completionTokens ?? usage.completion_tokens ?? 0);
  const totalTokens = formatTokenCount(usage.totalTokens ?? usage.total_tokens ?? 0);
  const estimatedCost = formatCostValue(usage.estimatedCost);

  llmUsageSummaryEl.innerHTML = `
    <div class="project-report-panel">
      <div>
        <strong>${escapeHtml(provider)}${model ? ` | ${escapeHtml(model)}` : ''}</strong>
        <div class="project-path">${escapeHtml(calls ? `${calls} call${calls === 1 ? '' : 's'}` : 'No usage calls yet')}</div>
      </div>
      <div class="project-report-actions">
        <div class="artifact-summary">Prompt tokens: ${escapeHtml(inputTokens)}</div>
        <div class="artifact-summary">Completion tokens: ${escapeHtml(outputTokens)}</div>
        <div class="artifact-summary">Total tokens: ${escapeHtml(totalTokens)}</div>
        <div class="artifact-summary">Estimated cost: ${escapeHtml(estimatedCost)}</div>
      </div>
    </div>
  `;
}

function showRecordFormMessage(message, mode = 'error') {
  if (!recordFormMessageEl) return;
  const text = String(message || '').trim();
  recordFormMessageEl.textContent = text;
  recordFormMessageEl.className = `form-message form-message-${mode}`;
  recordFormMessageEl.hidden = !text;
}

function normalizeApiPayload(payload, response) {
  const normalized = payload && typeof payload === 'object' ? { ...payload } : {};
  normalized.ok = response.ok;
  if (!response.ok && !normalized.error) {
    normalized.error = normalized.detail || `Request failed with status ${response.status}.`;
  }
  return normalized;
}

function formatProgressTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderWorkflowProgress(job) {
  if (!workflowProgressEl) return;

  const items = job?.progress || [];
  if (!items.length) {
    workflowProgressEl.hidden = true;
    workflowProgressEl.innerHTML = '';
    return;
  }

  workflowProgressEl.hidden = false;
  workflowProgressEl.innerHTML = items.map((item, index) => {
    const status = item.status === 'completed'
      ? 'success'
      : item.status === 'failed' || item.status === 'error'
        ? 'error'
        : 'running';
    const isLatest = index === items.length - 1;
    return `
      <div class="progress-row progress-${status}${isLatest ? ' is-current' : ''}">
        <span class="progress-dot" aria-hidden="true"></span>
        <span class="progress-message">${escapeHtml(item.message || 'Working')}</span>
        <span class="progress-time">${escapeHtml(formatProgressTime(item.timestamp))}</span>
      </div>
    `;
  }).join('');
}

function setProjectPathStatus(path) {
  const value = String(path || '').trim();
  projectPathStatusEl.textContent = value || 'Not configured';
  projectPathStatusEl.hidden = false;
}

function renderProjectOptions(items = [], selectedPath = '') {
  if (!projectSelectEl) return;

  const currentValue = selectedPath || projectSelectEl.value || projectPathEl.value.trim();
  projectSelectEl.innerHTML = '<option value="">Select</option>';

  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.path || '';
    const location = item.workspacePath || item.path || '';
    option.textContent = item.name && location ? `${item.name} - ${location}` : item.name || location || 'Project';
    projectSelectEl.appendChild(option);
  }

  if (currentValue && items.some((item) => item.path === currentValue)) {
    projectSelectEl.value = currentValue;
  }
}

function formatProjectDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function renderReportSummary(summary = {}) {
  const total = Number(summary.total || 0);
  const passed = Number(summary.passed || 0);
  const failed = Number(summary.failed || 0);
  const skipped = Number(summary.skipped || 0);
  if (!total && !passed && !failed && !skipped) {
    return 'No summary yet';
  }
  return `${total} total | ${passed} passed | ${failed} failed | ${skipped} skipped`;
}

function renderProjectReportActions(project) {
  const reports = project.reports || [];
  const latestReport = project.latestReport || reports[0] || null;
  if (!latestReport) {
    return '<div class="artifact-summary">No reports generated yet. Run a spec, sanity, or regression suite to create reports.</div>';
  }

  const actions = [];
  if (latestReport.htmlUrl) {
    actions.push(`<a class="button button-primary" href="${escapeHtml(reportHtmlUrl(latestReport.htmlUrl))}" target="_blank" rel="noopener">Open HTML Report</a>`);
  }
  if (latestReport.allureHtmlUrl) {
    actions.push(`<a class="button button-primary" href="${escapeHtml(reportHtmlUrl(latestReport.allureHtmlUrl))}" target="_blank" rel="noopener">Open Allure Report</a>`);
  }
  if (latestReport.allureResults) {
    actions.push(`<a class="button button-secondary" href="${escapeHtml(reportDownloadUrl(latestReport.allureResults))}">Download Allure Results</a>`);
  }
  if (latestReport.json) {
    actions.push(`<a class="button button-secondary" href="${escapeHtml(reportFileUrl(latestReport.json))}" target="_blank" rel="noopener">Open JSON</a>`);
  }
  if (latestReport.runPath) {
    actions.push(`<a class="button button-secondary" href="${escapeHtml(reportDownloadUrl(latestReport.runPath))}">Download Run</a>`);
  }

  return `
    <div class="project-report-panel">
      <div>
        <strong>Latest Report</strong>
        <div class="project-path">${escapeHtml(latestReport.runName || 'latest')} | ${escapeHtml(renderReportSummary(latestReport.summary || {}))}</div>
      </div>
      <div class="project-report-actions">${actions.join('')}</div>
    </div>
  `;
}

function renderProjectList(items = []) {
  if (!projectListEl) return;

  const projects = items || [];
  if (!projects.length) {
    projectListEl.innerHTML = '<div class="artifact-summary">No projects found yet.</div>';
    return;
  }

  projectListEl.innerHTML = projects.map((project) => {
    const files = project.files || [];
    const specs = files.filter((file) => file.isSpec || file.isScript);
    const testDataFile = files.find((file) => file.isJson && file.name === 'test-data.json') || files.find((file) => file.isJson);
    const selectedSpec = specs[0] || null;
    const reportPanel = renderProjectReportActions(project);
    const specOptions = specs.map((file) => {
      const label = `${file.suite || 'project'}: ${file.relativePath || file.name}`;
      return `<option value="${escapeHtml(file.path || '')}">${escapeHtml(label)}</option>`;
    }).join('');
    const selectedSpecPanel = selectedSpec
      ? `
        <div class="project-file-panel project-spec-panel" data-file-path="${escapeHtml(selectedSpec.path || '')}" data-project-path="${escapeHtml(project.path || '')}" data-files="${escapeHtml(JSON.stringify(specs))}">
          <div class="project-file-toolbar">
            <label>
              <span>Spec File</span>
              <select class="project-spec-select">${specOptions}</select>
            </label>
          </div>
          <details class="related-script project-code-panel" open>
            <summary>${escapeHtml(selectedSpec.relativePath || selectedSpec.name)}</summary>
            <pre data-script-text="${escapeHtml(normalizeScriptText(selectedSpec.content || ''))}" data-script-raw-text="${escapeHtml(normalizeScriptText(selectedSpec.content || ''))}" data-script-saved-text="${escapeHtml(normalizeScriptText(selectedSpec.content || ''))}">${renderScriptLines(selectedSpec.content || '', selectedSpec.relativePath || selectedSpec.name || 'Selected spec')}</pre>
          </details>
          <div class="project-file-actions">
            <button class="button button-secondary script-edit" type="button" data-file-path="${escapeHtml(selectedSpec.path)}">Edit</button>
            <button class="button button-secondary script-save" type="button" data-file-path="${escapeHtml(selectedSpec.path)}" hidden>Save</button>
            <button class="button button-primary script-run" type="button" data-file-path="${escapeHtml(selectedSpec.path)}" data-project-path="${escapeHtml(project.path || '')}">Run</button>
            <button class="button button-secondary script-set-priority" type="button" data-file-path="${escapeHtml(selectedSpec.path)}" data-project-path="${escapeHtml(project.path || '')}">${/^\d{2}_/.test(selectedSpec.name || '') ? `âš  Priority ${parseInt((selectedSpec.name || '').slice(0, 2), 10)}` : 'Set Priority'}</button>
            <button class="button button-secondary script-download" type="button" data-file-path="${escapeHtml(selectedSpec.path)}">Download</button>
          </div>
        </div>
      `
      : '<div class="artifact-summary">No spec files found yet. Record a flow to create the next test case.</div>';
    const testDataPanel = testDataFile
      ? `
        <div class="project-file-panel project-testdata-panel" data-file-path="${escapeHtml(testDataFile.path || '')}" data-project-path="${escapeHtml(project.path || '')}">
          <details class="related-script project-code-panel" open>
            <summary>Test Data JSON: ${escapeHtml(testDataFile.relativePath || testDataFile.name)}</summary>
            <pre data-script-text="${escapeHtml(normalizeScriptText(testDataFile.content || ''))}" data-script-raw-text="${escapeHtml(normalizeScriptText(testDataFile.content || ''))}" data-script-saved-text="${escapeHtml(normalizeScriptText(testDataFile.content || ''))}">${escapeHtml(testDataFile.content || '')}</pre>
          </details>
          <div class="project-file-actions">
            <button class="button button-secondary script-edit" type="button" data-file-path="${escapeHtml(testDataFile.path)}">Edit</button>
            <button class="button button-secondary script-save" type="button" data-file-path="${escapeHtml(testDataFile.path)}" hidden>Save</button>
            <button class="button button-secondary script-download" type="button" data-file-path="${escapeHtml(testDataFile.path)}">Download</button>
          </div>
        </div>
      `
      : '<div class="artifact-summary">No test-data.json file found yet.</div>';
    const fakerPanel = renderProjectFakerFields(project);
    return `
      <article class="project-card">
        <div class="project-card-head">
          <div>
            <h3>${escapeHtml(project.name || 'Project')}</h3>
            <div class="project-path">${escapeHtml(project.workspacePath || project.path || '')}</div>
          </div>
          <div class="project-actions">
            <button class="button button-secondary project-download" type="button" data-project-path="${escapeHtml(project.path)}">Download Framework</button>
            <label class="project-local-execution-label" style="display:flex;align-items:center;gap:6px;">
              <span>Execution</span>
              <select class="project-local-execution">
                <option value="parallel" selected>Parallel</option>
                <option value="sequential">Sequential</option>
              </select>
            </label>
            <label class="project-local-mode-label" style="display:flex;align-items:center;gap:6px;">
              <span>Browser Mode</span>
                <select class="project-local-mode">
                <option value="headless" selected>Headless</option>
                <option value="headed">Headed</option>
              </select>
            </label>
            <button class="button button-secondary project-run" type="button" data-project-path="${escapeHtml(project.path)}" data-test-type="sanity">Run Sanity</button>
            <button class="button button-primary project-run" type="button" data-project-path="${escapeHtml(project.path)}" data-test-type="regression">Run Regression</button>
            <button class="button button-primary project-git-actions" type="button"
              data-project-path="${escapeHtml(project.path)}"
              data-project-name="${escapeHtml(project.name || '')}"
              data-jenkins-job-name="${escapeHtml(project.jenkinsJobName || '')}">Git Actions</button>
              <button class="button button-secondary project-flaky-tests" type="button"
              data-project-path="${escapeHtml(project.path)}"
              data-project-name="${escapeHtml(project.name || '')}">📊 Flaky Tests</button>
          </div>
        </div>
        <div class="project-meta">
          <span>${Number(project.fileCount || 0)} files</span>
          <span>${Number(project.specCount || 0)} specs</span>
          <span>Latest: ${escapeHtml(formatProjectDate(project.updatedAt))}</span>
        </div>
        ${reportPanel}
        <div class="project-files">
          ${selectedSpecPanel}
          ${testDataPanel}
        </div>
         <div class="project-faker-section">
          ${fakerPanel}
        </div>
      </article>
    `;
  }).join('');

  projectListEl.querySelectorAll('.project-code-panel pre').forEach((pre) => {
    if (pre.dataset.scriptRawText == null) {
      const rawText = normalizeScriptText(pre.dataset.scriptText || '');
      pre.dataset.scriptRawText = rawText;
      if (!pre.dataset.scriptText) {
        pre.dataset.scriptText = rawText;
      }
    }
    const panel = pre.closest('.project-file-panel');
    if (panel && panel.classList.contains('project-spec-panel')) {
      setUnsavedState(panel, false);
    }
  });
}

function getConfiguredProjectPath() {
  return projectPathEl.value.trim();
}

async function resolveSelectedProjectPath(options = {}) {
  const directValue = (projectSelectEl?.value || projectPathEl.value || '').trim();
  if (directValue) {
    projectPathEl.value = directValue;
    return directValue;
  }

  const payload = await loadProjects({ silent: true, ...options });
  const items = payload?.items || [];
  const selectedPath = payload?.selectedProjectPath || '';
  const fallbackPath = selectedPath || (items.length === 1 ? items[0].path : '');

  if (fallbackPath) {
    projectPathEl.value = fallbackPath;
    if (projectSelectEl) {
      projectSelectEl.value = fallbackPath;
    }
    setProjectPathStatus(fallbackPath);
  }

  return fallbackPath;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderLatestFiles(payload = {}) {
  latestCodegenContentEl.classList.remove('is-loading');
  latestAiContentEl.classList.remove('is-loading');
  latestTestDataContentEl.classList.remove('is-loading');
  latestCodegenPathEl.textContent = payload.latestCodegenPath || 'No masked codegen file yet';
  const localPath = payload.latestGeneratedSpecPath || 'No AI file yet';
  const projectCopyPath = payload.projectCopyPath ? ` | Project copy: ${payload.projectCopyPath}` : '';
  latestAiPathEl.textContent = `${localPath}${projectCopyPath}`;
  latestTestDataPathEl.textContent = payload.latestTestDataPath || 'No test data file yet';
  const maskedCodegenContent = payload.latestCodegenContent || '{ "message": "Latest masked codegen content will appear here after recording." }';
  setScriptPreviewContent(latestCodegenContentEl, maskedCodegenContent, 'Latest masked codegen');
  const aiContent = payload.latestGeneratedSpecContent || '{ "message": "Latest AI-generated file content will appear here after generation." }';
  setScriptPreviewContent(latestAiContentEl, aiContent, 'Latest AI spec');
  latestTestDataContentEl.textContent = payload.latestTestDataContent || '{ "message": "Latest test data content will appear here after generation." }';
}

function renderLatestFilesLoading(message = 'Fetching latest masked files') {
  latestCodegenPathEl.textContent = message;
  latestAiPathEl.textContent = 'Fetching latest generated files';
  latestTestDataPathEl.textContent = 'Fetching latest test data';
  latestCodegenContentEl.classList.add('is-loading');
  latestAiContentEl.classList.add('is-loading');
  latestTestDataContentEl.classList.add('is-loading');
  latestCodegenContentEl.textContent = `${message}...`;
  latestAiContentEl.textContent = 'Loading generated spec...';
  latestTestDataContentEl.textContent = 'Loading test data...';
}

function progressJson(status, message) {
  return JSON.stringify({ status, message }, null, 2);
}

function renderLatestFilesProgress({
  codegenPath = 'Preparing latest masked codegen',
  codegenMessage = 'Waiting for recorder output.',
  aiPath = 'Waiting for latest AI file',
  aiMessage = 'AI generation has not started yet.',
  testDataPath = 'Waiting for latest test data',
  testDataMessage = 'Test data will appear after masking.',
} = {}) {
  latestCodegenContentEl.classList.add('is-loading');
  latestAiContentEl.classList.add('is-loading');
  latestTestDataContentEl.classList.add('is-loading');
  latestCodegenPathEl.textContent = codegenPath;
  latestAiPathEl.textContent = aiPath;
  latestTestDataPathEl.textContent = testDataPath;
  latestCodegenContentEl.textContent = progressJson('running', codegenMessage);
  latestAiContentEl.textContent = progressJson('running', aiMessage);
  latestTestDataContentEl.textContent = progressJson('running', testDataMessage);
}

function renderJobLatestFiles(job) {
  const result = job.result || {};
  const lastProgress = (job.progress || []).at(-1);
  const progressStep = lastProgress?.step || job.step;

  if (job.status === 'failed') {
    renderLatestFilesProgress({
      codegenPath: 'Workflow failed',
      codegenMessage: job.error || job.message || 'Recording or masking failed.',
      aiPath: 'AI file not generated',
      aiMessage: job.error || job.message || 'AI generation did not complete.',
      testDataPath: 'Test data not generated',
      testDataMessage: job.error || job.message || 'Test data was not completed.',
    });
    return;
  }

  if (result.maskedCodegenContent || result.aiSpecContent || result.testDataContent) {
    renderLatestFiles({
      latestCodegenPath: result.maskedCodegenPath || result.codegenPath || 'Script masked',
      latestGeneratedSpecPath: result.outputPath || 'AI modifying script',
      projectCopyPath: result.projectCopyPath || null,
      latestCodegenContent: result.maskedCodegenContent || result.codegenContent || progressJson('running', 'Script captured. Masking codegen now.'),
      latestMaskedTracePath: result.maskedTracePath || null,
      latestTestDataPath: result.testDataPath || 'Extracting latest test data',
      latestTestDataContent: result.testDataContent || progressJson('running', 'Test data extraction is still running.'),
      latestGeneratedSpecContent: result.aiSpecContent || progressJson('running', 'AI is modifying the recorded script.'),
    });
    if (!result.aiSpecContent) latestAiContentEl.classList.add('is-loading');
    if (!result.testDataContent) latestTestDataContentEl.classList.add('is-loading');
    return;
  }

  if (job.step === 'recording') {
    renderLatestFilesProgress({
      codegenPath: 'Recording script',
      codegenMessage: progressStep === 'recording'
        ? 'Recorder window is open. Capture your actions and close the browser when done.'
        : job.message || 'Recording is active.',
      aiPath: 'Waiting for recording',
      aiMessage: 'AI will start after the browser recording is closed.',
      testDataPath: 'Waiting for masking',
      testDataMessage: 'Test data will be extracted after script masking.',
    });
    return;
  }

  if (job.step === 'recording_done') {
    renderLatestFilesProgress({
      codegenPath: 'Script recorded',
      codegenMessage: 'Script captured. Masking codegen and trace now.',
      aiPath: 'Preparing AI generation',
      aiMessage: 'AI modification will start after masked files are prepared.',
      testDataPath: 'Preparing test data',
      testDataMessage: 'Sensitive values are being extracted for test data.',
    });
    return;
  }

  if (job.step === 'refining') {
    renderLatestFilesProgress({
      codegenPath: result.maskedCodegenPath || result.codegenPath || 'Script masking in progress',
      codegenMessage: 'Script recorded. Masking codegen and trace.',
      aiPath: result.outputPath || 'AI modifying script',
      aiMessage: 'AI is modifying the recorded Playwright script.',
      testDataPath: result.testDataPath || 'Extracting test data',
      testDataMessage: 'Test data is being generated from masked values.',
    });
    return;
  }

  if (job.step === 'finalizing') {
    renderLatestFilesProgress({
      codegenPath: result.maskedCodegenPath || 'Script masked',
      codegenMessage: 'Masked script is ready. Finalizing generated files.',
      aiPath: result.outputPath || 'AI file generated',
      aiMessage: 'AI modification is done. Saving the generated spec.',
      testDataPath: result.testDataPath || 'Test data generated',
      testDataMessage: 'Saving test data.',
    });
  }
}

async function callApi(url, options = {}) {
  const { silent = false, ...fetchOptions } = options;
  if (!silent) {
    setStatus('running', 'Working');
  }
  const response = await fetch(apiUrl(url), {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
    },
    ...fetchOptions,
  });
  const contentType = response.headers.get('content-type') || '';
  let payload;

  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = {
      ok: response.ok,
      error: text || `Unexpected ${response.status} response from API.`,
    };
  }

  const normalizedPayload = normalizeApiPayload(payload, response);

  if (!silent) {
    showResult(normalizedPayload);
    setStatus(response.ok ? 'success' : 'error', response.ok ? 'Success' : 'Error');
  }
  return normalizedPayload;
}

function closeActiveJobSocket() {
  if (activeJobSocket) {
    activeJobSocket.close();
    activeJobSocket = null;
  }
  if (activeJobPollTimer) {
    window.clearInterval(activeJobPollTimer);
    activeJobPollTimer = null;
  }
}

function closeActiveSetupSocket() {
  if (activeSetupSocket) {
    activeSetupSocket.close();
    activeSetupSocket = null;
  }
}

function closeActiveRunSocket() {
  if (activeRunSocket) {
    activeRunSocket.close();
    activeRunSocket = null;
  }
}

function applyJobUpdate(job) {
  renderWorkflowProgress(job);
  showResult({ ok: job.status === 'completed', job });
  renderLlmUsageSummary(job?.result?.llmUsage || null);

  if (job.status === 'running') {
    renderJobLatestFiles(job);
  }

  if (job.status === 'completed') {
    setStatus('success', 'AI File Ready');
    closeActiveJobSocket();
    renderLatestFiles({
      latestCodegenPath: job.result?.maskedCodegenPath || job.result?.codegenPath || null,
      latestGeneratedSpecPath: job.result?.outputPath || null,
      projectCopyPath: job.result?.projectCopyPath || null,
      latestCodegenContent: job.result?.maskedCodegenContent || job.result?.codegenContent || null,
      latestMaskedTracePath: job.result?.maskedTracePath || null,
      latestTestDataPath: job.result?.projectCopyTestDataPath || job.result?.testDataPath || null,
      latestTestDataContent: job.result?.projectCopyTestDataContent || job.result?.testDataContent || null,
      latestGeneratedSpecContent: job.result?.aiSpecContent || null,
    });
    loadProjects({ silent: true });
    return;
  }

  if (job.status === 'failed') {
    setStatus('error', 'Workflow Failed');
    closeActiveJobSocket();
    return;
  }

  const stepLabel = job.step === 'recording'
    ? 'Recording'
    : job.step === 'recording_done'
      ? 'Recording Saved'
      : job.step === 'refining'
        ? 'AI Generating'
        : job.step === 'file_detected'
          ? 'AI File Found'
          : job.step === 'finalizing'
            ? 'Finalizing'
            : 'Working';
  setStatus('running', stepLabel);
}

function watchJob(jobId) {
  closeActiveJobSocket();
  activeJobSocket = new WebSocket(jobSocketUrl(jobId));

  activeJobSocket.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    if (payload.type === 'job.update' && payload.job) {
      applyJobUpdate(payload.job);
    }
  };

  activeJobSocket.onerror = () => {
    setStatus('error', 'WebSocket Error');
  };

  activeJobSocket.onclose = () => {
    activeJobSocket = null;
  };

  activeJobPollTimer = window.setInterval(async () => {
    try {
      const response = await fetch(apiUrl(`/api/jobs/${encodeURIComponent(jobId)}`), {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          closeActiveJobSocket();
        }
        return;
      }

      const payload = await response.json();
      if (payload?.job) {
        applyJobUpdate(payload.job);
        if (payload.job.status === 'completed' || payload.job.status === 'failed') {
          closeActiveJobSocket();
        }
      }
    } catch {
      // Ignore polling errors and keep the websocket path as primary.
    }
  }, 2000);
}

function cleanPayload(entries) {
  return Object.fromEntries(
    Object.entries(entries).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );
}

function renderList(target, items, emptyText) {
  if (!target) return;
  target.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.textContent = emptyText;
    target.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    target.appendChild(li);
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitScriptLines(text) {
  return String(text || '').replace(/\r\n/g, '\n').split('\n');
}

function renderScriptLines(text, sourceId = '') {
  const lines = splitScriptLines(text);
  const sourceAttr = sourceId ? ` data-script-source="${escapeHtml(sourceId)}"` : '';
  return lines.map((line, index) => {
    const display = line || '\u00a0';
    return `<span class="script-line" data-line-number="${index + 1}"${sourceAttr}><span class="script-line-number">${index + 1}</span><span class="script-line-text">${escapeHtml(display)}</span></span>`;
  }).join('');
}

function normalizeScriptText(text) {
  return String(text || '').replace(/\r\n/g, '\n').trimEnd();
}

function setScriptPreviewContent(el, text, sourceId = '', options = {}) {
  if (!el) return;
  const normalizedText = normalizeScriptText(text);
  el.dataset.scriptRawText = normalizedText;
  el.dataset.scriptText = normalizedText;
  el.dataset.scriptSource = sourceId || '';
  const panel = el.closest('.project-file-panel');
  if (options.markSaved !== false) {
    el.dataset.scriptSavedText = normalizedText;
    if (panel) {
      panel.dataset.scriptSavedText = normalizedText;
    }
  }
  if (el.isContentEditable) {
    el.textContent = normalizedText;
    return;
  }
  el.innerHTML = renderScriptLines(normalizedText, sourceId);
}

function getScriptPreviewSourceLabel(preEl) {
  if (!preEl) return 'Script';
  const panel = preEl.closest('.project-file-panel, .related-card, .panel');
  const summary = preEl.closest('details')?.querySelector('summary');
  if (summary?.textContent) return summary.textContent.trim();
  const title = panel?.querySelector('h3, h2')?.textContent?.trim();
  return title || preEl.dataset.scriptSource || 'Script';
}

function showAssertionPopup() {
  if (assertionPopupEl) {
    assertionPopupEl.hidden = false;
  }
}

function renderAssertionPopupChooser() {
  if (!assertionPopupBodyEl) return;
  assertionPopupBodyEl.innerHTML = `
    <div class="assertion-popup-choice-grid">
      <button class="button button-primary assertion-popup-choice-button" type="button" data-mode="assertions">Add assertions</button>
      <button class="button button-secondary assertion-popup-choice-button" type="button" data-mode="steps">Add new step</button>
    </div>
  `;
}

function hideAssertionPopup() {
  if (assertionPopupEl) {
    assertionPopupEl.hidden = true;
  }
  currentAssertionContext = null;
  window.currentAssertionContext = null;
}


function setUnsavedState(panel, isDirty) {
  if (!panel) return;
  if (!panel.classList.contains('project-spec-panel')) {
    const saveButton = panel.querySelector('.script-save');
    if (saveButton) {
      saveButton.hidden = !isDirty;
    }
    return;
  }
  const saveButton = panel.querySelector('.script-save');
  const badge = panel.querySelector('.unsaved-badge');
  let badgeEl = badge;
  if (isDirty && !badgeEl) {
    badgeEl = document.createElement('span');
    badgeEl.className = 'unsaved-badge';
    badgeEl.textContent = 'Unsaved changes';
    const actions = panel.querySelector('.project-file-actions');
    const editButton = panel.querySelector('.script-edit');
    if (actions && editButton) {
      actions.insertBefore(badgeEl, editButton);
    } else if (actions) {
      actions.prepend(badgeEl);
    }
  } else if (!isDirty && badgeEl) {
    badgeEl.remove();
    badgeEl = null;
  }
  if (saveButton) {
    saveButton.hidden = !isDirty;
  }
}

function getPlainScriptText(preEl) {
  if (!preEl) return '';
  if (preEl.dataset.scriptRawText != null) {
    return String(preEl.dataset.scriptRawText || '');
  }
  if (preEl.isContentEditable) {
    return String(preEl.textContent || '');
  }
  return String(preEl.dataset.scriptText || preEl.textContent || '');
}

function isSuggestionEligibleLine(lineText) {
  const trimmed = String(lineText || '').trim();
  if (!trimmed) return false;
  if (/^(?:\/\/|\/\*|\*|\*\/)/.test(trimmed)) return false;
  if (/^(?:import\s|export\s)/.test(trimmed)) return false;
  if (/^(?:test(?:\.describe)?\s*\(|describe\s*\()/i.test(trimmed)) return false;
  if (/^[{};]+$/.test(trimmed)) return false;
  return true;
}

function syncProjectSpecDirtyState(panel) {
  if (!panel || !panel.classList.contains('project-spec-panel')) return;
  const codePanel = panel.querySelector('.project-code-panel pre');
  if (!codePanel) return;

  const editor = getFileEditor(panel);
  const currentText = editor
    ? normalizeScriptText(editor.value || '')
    : normalizeScriptText(getPlainScriptText(codePanel));
  const savedText = normalizeScriptText(panel.dataset.scriptSavedText || codePanel.dataset.scriptSavedText || '');
  setUnsavedState(panel, currentText !== savedText);
}

function showScriptForEditing(preEl, content, sourceLabel = '') {
  if (!preEl) return;
  preEl.dataset.scriptRawText = normalizeScriptText(content);
  preEl.dataset.scriptText = normalizeScriptText(content);
  if (sourceLabel) {
    preEl.dataset.scriptSource = sourceLabel;
  }
  const panel = preEl.closest('.project-file-panel');
  syncProjectSpecDirtyState(panel);
}

function insertAssertionIntoScript(preEl, lineNumber, code) {
  if (!preEl) return false;
  const panel = preEl.closest('.project-file-panel');
  if (!panel) return false;

  const currentText = String(
    preEl.dataset.scriptRawText ??
    preEl.dataset.scriptText ??
    preEl.textContent ??
    ''
  );
  const lines = splitScriptLines(currentText);
  const index = Number(lineNumber);
  if (!Number.isInteger(index) || index < 1 || index > lines.length) return false;

  const currentLine = lines[index - 1] || '';
  const indentMatch = currentLine.match(/^\s*/);
  const indent = indentMatch ? indentMatch[0] : '';
  const insertion = String(code || '')
    .split(/\r?\n/)
    .map((entry) => (entry ? `${indent}${entry}` : entry))
    .join('\n');

  const updatedLines = [
    ...lines.slice(0, index),
    insertion,
    ...lines.slice(index),
  ];
  const updatedText = normalizeScriptText(updatedLines.join('\n'));
  const sourceLabel = getScriptPreviewSourceLabel(preEl);
  showScriptForEditing(preEl, updatedText, sourceLabel);
  setScriptPreviewContent(preEl, updatedText, sourceLabel, { markSaved: false });
  syncProjectSpecDirtyState(panel);
  showResult({ ok: true, message: 'Assertion inserted. You can add more suggestions and save when ready.' });
  setStatus('info', 'Assertion Inserted');
  return true;
}

async function openAssertionPopupForLine(preEl, lineNumber) {
  if (!preEl) return;
  if (preEl.closest('.project-testdata-panel')) {
    return;
  }
  const scriptText = String(
    preEl.dataset.scriptRawText ??
    preEl.dataset.scriptText ??
    preEl.textContent ??
    ''
  );
  const lines = splitScriptLines(scriptText);
  const index = Number(lineNumber);
  if (!scriptText || Number.isNaN(index) || index < 1 || index > lines.length) return;

  const lineText = lines[index - 1] || '';
  if (!isSuggestionEligibleLine(lineText)) {
    hideAssertionPopup();
    return;
  }
  const sourceLabel = getScriptPreviewSourceLabel(preEl);
  const lineEl = preEl.querySelector(`.script-line[data-line-number="${index}"]`) || preEl;
  const rect = lineEl.getBoundingClientRect();
  currentAssertionContext = { preEl, lineNumber: index, sourceLabel, lineText, allLines: lines, scriptText };
  window.currentAssertionContext = currentAssertionContext;
  const suggester = window.newStepSuggester;
  if (suggester) {
    suggester.setHeader(sourceLabel, index, lineText);
    if (typeof suggester.hide === 'function') {
      suggester.hide();
    }
    suggester.show();
  }
  showAssertionPopup();
  renderAssertionPopupChooser();

  const popupWidth = 460;
  const estimatedHeight = 360;
  const belowTop = rect.bottom + 12;
  const aboveTop = rect.top - estimatedHeight - 12;
  const top = belowTop + estimatedHeight > window.innerHeight ? Math.max(16, aboveTop) : Math.min(window.innerHeight - 24, belowTop);
  const left = Math.min(window.innerWidth - popupWidth - 16, Math.max(16, rect.left));
  assertionPopupEl.style.top = `${Math.max(16, top)}px`;
  assertionPopupEl.style.left = `${left}px`;
  assertionPopupEl.style.maxWidth = `${popupWidth}px`;

}

function bootNewStepSuggester() {
  const popupEl = assertionPopupEl;
  if (!popupEl || typeof callApi !== 'function' || typeof insertAssertionIntoScript !== 'function' || typeof openAssertionPopupForLine !== 'function') {
    return null;
  }

  const controller = initNewStepSuggester({
    popupEl,
    titleEl: assertionPopupTitleEl,
    metaEl: assertionPopupMetaEl,
    bodyEl: assertionPopupBodyEl,
    modeToggleEl: assertionPopupModeToggleEl,
    panelLabelEl: popupEl.querySelector('.panel-label'),
    escapeHtml,
    insertIntoScript: insertAssertionIntoScript,
    reopenPopupForContext: async (context) => {
      if (context?.preEl && context.lineNumber) {
        await openAssertionPopupForLine(context.preEl, context.lineNumber);
      }
    },
    getContext: () => window.currentAssertionContext || currentAssertionContext || null,
    callApi,
  });

  window.newStepSuggester = controller;
  return controller;
}

window.escapeHtml = escapeHtml;
window.callApi = callApi;
window.insertAssertionIntoScript = insertAssertionIntoScript;
window.openAssertionPopupForLine = openAssertionPopupForLine;
window.hideAssertionPopup = hideAssertionPopup;
window.currentAssertionContext = currentAssertionContext;
bootNewStepSuggester();

async function loadArtifacts(options = {}) {
  const payload = await callApi('/api/artifacts', { method: 'GET', ...options });
  const latest = payload.latest;

  if (artifactsSummaryEl) {
    artifactsSummaryEl.innerHTML = latest
      ? [
          `<div><strong>Latest trace:</strong> ${latest.tracePath}</div>`,
          `<div><strong>Latest codegen:</strong> ${latest.codegenPath}</div>`,
          `<div><strong>Masked trace:</strong> ${latest.maskedTracePath || '-'}</div>`,
          `<div><strong>Masked codegen:</strong> ${latest.maskedCodegenPath || '-'}</div>`,
          `<div><strong>Test data:</strong> ${latest.testDataPath || '-'}</div>`,
          `<div><strong>Artifact stamp:</strong> ${latest.stamp}</div>`,
        ].join('')
      : '<div>No recorded artifacts found yet.</div>';
  }

  renderList(codegenListEl, [...(payload.actionFiles || []), ...(payload.codegenFiles || [])], 'No codegen files yet.');
  renderList(specListEl, payload.generatedSpecs || [], 'No generated specs yet.');

  renderLatestFiles(payload);
}

async function loadTestTypes(options = {}) {
  const payload = await callApi('/api/test-types', { method: 'GET', ...options });
  const items = payload.items || [];
  if (!recordTestTypeEl || !items.length) return payload;

  const currentValue = recordTestTypeEl.value;
  recordTestTypeEl.innerHTML = '';
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.value || '';
    option.textContent = item.label || item.value || 'General';
    recordTestTypeEl.appendChild(option);
  }
  recordTestTypeEl.value = items.some((item) => (item.value || '') === currentValue) ? currentValue : '';
  return payload;
}

async function saveProjectPath(options = {}) {
  const projectPath = getConfiguredProjectPath();
  const payload = await callApi('/api/project-path', {
    method: 'POST',
    body: JSON.stringify({ projectPath }),
    ...options,
  });

  const resolvedPath = payload.projectPath || '';
  if (resolvedPath) {
    window.localStorage.setItem(PROJECT_PATH_STORAGE_KEY, resolvedPath);
  } else {
    window.localStorage.removeItem(PROJECT_PATH_STORAGE_KEY);
  }
  projectPathEl.value = resolvedPath;
  setProjectPathStatus(resolvedPath);
  return payload;
}

async function loadProjects(options = {}) {
  const payload = await callApi('/api/projects', { method: 'GET', ...options });
  const items = payload.items || [];
  renderProjectOptions(items, payload.selectedProjectPath || projectPathEl.value.trim());
  renderProjectList(items);
  return payload;
}

async function createProject() {
  const projectName = projectCreateNameEl?.value.trim() || '';
  const parentPath = projectCreateLocationEl?.value.trim() || '';
  const githubUrl = projectGithubUrlEl?.value.trim() || '';
  if (!projectName && !githubUrl) {
    showResult({ ok: false, error: 'Enter a project name or GitHub URL first.' });
    setStatus('error', 'Error');
    return null;
  }

  const payload = await callApi('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ projectName, parentPath, githubUrl }),
  });

  if (!payload?.ok) {
    const message = payload?.error || payload?.detail || 'Project could not be created.';
    showResult({ ok: false, error: message });
    setProjectPathStatus(message);
    setStatus('error', 'Project Exists');
    return payload;
  }

  if (payload?.projectPath) {
    projectPathEl.value = payload.projectPath;
    setProjectPathStatus(payload.projectPath);
    window.localStorage.setItem(PROJECT_PATH_STORAGE_KEY, payload.projectPath);
    renderProjectOptions(payload.items || [], payload.projectPath);
    renderProjectList(payload.items || []);
    await setupProjectPath(payload.projectPath);
    if (projectCreateNameEl) {
      projectCreateNameEl.value = '';
    }
    if (projectGithubUrlEl) {
      projectGithubUrlEl.value = '';
    }
  }

  return payload;
}

function downloadProject(projectPath) {
  window.location.href = apiUrlWithParams('/api/projects/download', { projectPath });
}

async function downloadSelectedProjectFramework(button) {
  if (button) {
    button.disabled = true;
  }

  try {
    const selectedProjectPath = await resolveSelectedProjectPath({ silent: true });
    if (!selectedProjectPath) {
      showResult({ ok: false, error: 'Select a project before downloading the framework.' });
      setStatus('error', 'Select Project');
      return;
    }

    setProjectPathStatus(selectedProjectPath);
    showResult({
      ok: true,
      message: 'Starting framework download.',
      projectPath: selectedProjectPath,
    });
    downloadProject(selectedProjectPath);
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

async function pushProjectChanges(button) {
  if (!button) return null;
  const card = button.closest('.project-card');
  const commitInput = card?.querySelector('.project-commit-message');
  const projectPath = String(button.dataset.projectPath || '').trim();
  const commitMessage = String(commitInput?.value || '').trim();

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Pushing';

  try {
    if (!projectPath) {
      showResult({ ok: false, error: 'Project path is missing.' });
      setStatus('error', 'Push Failed');
      return null;
    }
    if (!commitMessage) {
      showResult({ ok: false, error: 'Commit message is required.' });
      setStatus('error', 'Message Required');
      return null;
    }

    setStatus('running', 'Committing');
    showResult({
      ok: true,
      message: 'Committing and pushing project changes...',
      projectPath,
      commitMessage,
    });

    const response = await callApi('/api/projects/push', {
      method: 'POST',
      body: JSON.stringify({ projectPath, commitMessage }),
    });

    if (!response?.ok) {
      const message = response?.error || response?.detail || 'Unable to push project changes.';
      showResult({ ok: false, error: message, projectPath, commitMessage });
      setStatus('error', 'Push Failed');
      return response;
    }

    showResult({
      ok: true,
      message: response.message || 'Project changes pushed.',
      projectPath,
      commitMessage,
      branch: response.branch || '',
      changed: response.changed ?? true,
    });
    setStatus('success', 'Pushed');
    await loadProjects({ silent: true });
    return response;
  } finally {
    button.disabled = false;
    button.textContent = originalText || 'Commit & Push';
  }
}

async function getSelectedProjectContext(options = {}) {
  const selectedProjectPath = String(await resolveSelectedProjectPath({ silent: true, ...options }) || '').trim();
  if (!selectedProjectPath) {
    return { selectedProjectPath: '', project: null };
  }

  const payload = await loadProjects({ silent: true, ...options });
  const project = (payload.items || []).find((item) => String(item.path || '').trim() === selectedProjectPath) || null;
  return { selectedProjectPath, project };
}

async function getProjectContext(projectPath = '', options = {}) {
  const explicitPath = String(projectPath || '').trim();
  const selectedProjectPath = explicitPath || String(await resolveSelectedProjectPath({ silent: true, ...options }) || '').trim();
  if (!selectedProjectPath) {
    return { selectedProjectPath: '', project: null };
  }

  const payload = await loadProjects({ silent: true, ...options });
  const project = (payload.items || []).find((item) => String(item.path || '').trim() === selectedProjectPath) || null;
  return { selectedProjectPath, project };
}

async function createSelectedProjectJenkinsJob(button) {
  if (button) {
    button.disabled = true;
  }

  try {
    const { selectedProjectPath, project } = await getSelectedProjectContext({ silent: true });
    if (!selectedProjectPath) {
      showResult({ ok: false, error: 'Select a project before creating the Jenkins job.' });
      setStatus('error', 'Select Project');
      return;
    }

    const payload = {
      projectPath: selectedProjectPath,
      jobName: project?.jenkinsJobName || project?.name || '',
      githubUrl: project?.githubUrl || '',
      branchName: 'main',
      jenkinsfilePath: 'Jenkinsfile',
    };

    if (!payload.githubUrl) {
      showResult({ ok: false, error: 'Add a GitHub URL to the project before creating the Jenkins job.' });
      setStatus('error', 'GitHub URL Needed');
      return;
    }

    setStatus('running', 'Creating Jenkins Job');
    showResult({
      ok: true,
      message: 'Creating Jenkins job for the selected project.',
      payload,
    });

    const response = await callApi('/api/jenkins/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response?.ok) {
      const message = response?.error || response?.detail || 'Unable to create Jenkins job.';
      showResult({ ok: false, error: message, payload });
      setStatus('error', 'Job Create Failed');
      return response;
    }

    setStatus('success', 'Job Ready');
    showResult({
      ok: true,
      message: 'Jenkins job created.',
      payload,
    });
    await loadProjects({ silent: true });
    return response;
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

async function createProjectJenkinsJob(button) {
  if (!button) return null;
  const projectPath = String(button.dataset.projectPath || '').trim();
  if (!projectPath) {
    showResult({ ok: false, error: 'Project path is missing.' });
    setStatus('error', 'Job Create Failed');
    return null;
  }

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Creating';

  try {
    const { project } = await getProjectContext(projectPath, { silent: true });
    const card = button.closest('.project-card');
    const jobInput = card?.querySelector('.project-jenkins-job-name');
    const jobName = String(jobInput?.value || project?.jenkinsJobName || project?.name || '').trim();
    const payload = {
      projectPath,
      jobName,
      githubUrl: project?.githubUrl || undefined,
      branchName: 'main',
      jenkinsfilePath: 'Jenkinsfile',
    };

    if (!payload.githubUrl) {
      showResult({ ok: false, error: 'Add a GitHub URL to the project before creating the Jenkins job.' });
      setStatus('error', 'GitHub URL Needed');
      return null;
    }

    setStatus('running', 'Creating Jenkins Job');
    showResult({
      ok: true,
      message: 'Creating Jenkins job for this project.',
      payload,
    });

    const response = await callApi('/api/jenkins/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response?.ok) {
      const message = response?.error || response?.detail || 'Unable to create Jenkins job.';
      showResult({ ok: false, error: message, payload });
      setStatus('error', 'Job Create Failed');
      return response;
    }

    setStatus('success', 'Job Ready');
    showResult({
      ok: true,
      message: 'Jenkins job created.',
      payload,
    });
    await loadProjects({ silent: true });
    return response;
  } finally {
    button.disabled = false;
    button.textContent = originalText || 'Create Job';
  }
}

function downloadScript(filePath) {
  window.location.href = apiUrlWithParams('/api/projects/file/download', { filePath });
}

function getFileEditor(panel) {
  return panel?.querySelector('.file-editor') || null;
}

function ensureFileEditor(panel, codePanel) {
  if (!panel || !codePanel) return null;
  let editor = getFileEditor(panel);
  if (!editor) {
    editor = document.createElement('textarea');
    editor.className = 'file-editor';
    editor.spellcheck = false;
    editor.wrap = 'off';
    editor.setAttribute('aria-label', 'File editor');
    codePanel.insertAdjacentElement('afterend', editor);
  }
  editor.hidden = false;
  codePanel.hidden = true;
  return editor;
}

function hideFileEditor(panel, codePanel) {
  const editor = getFileEditor(panel);
  if (editor) {
    editor.remove();
  }
  if (codePanel) {
    codePanel.hidden = false;
  }
}

async function editScript(button) {
  const filePath = button.dataset.filePath || '';
  const panel = button.closest('.project-file-panel');
  if (!panel || !filePath) return;

  const codePanel = panel.querySelector('.project-code-panel pre');
  if (!codePanel) return;

  if (getFileEditor(panel)) {
    getFileEditor(panel).focus();
    return;
  }

  button.disabled = true;
  try {
    const payload = await callApi(apiUrlWithParams('/api/projects/file', { filePath }), {
      method: 'GET',
      silent: true,
    });
    const editor = ensureFileEditor(panel, codePanel);
    if (editor) {
      editor.value = payload.content || '';
      editor.focus();
    }
    button.textContent = 'Editing';
    const saveButton = panel.querySelector('.script-save');
    if (saveButton) {
      saveButton.hidden = false;
    }
    setStatus('idle', 'Editing');
  } catch (error) {
    showResult({ ok: false, error: error.message || String(error) });
    setStatus('error', 'Edit Failed');
  } finally {
    button.disabled = false;
  }
}

async function saveScript(button) {
  const filePath = button.dataset.filePath || '';
  const panel = button.closest('.project-file-panel');
  const codePanel = panel?.querySelector('.project-code-panel pre');
  if (!panel || !codePanel || !filePath) return;
 
  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = 'Saving...';
  setStatus('info', 'Saving script and regenerating healed version... (may take up to 30s)');
 
  try {
    const editor = getFileEditor(panel);
    const content = editor ? String(editor.value || '') : getPlainScriptText(codePanel);
    const payload = await callApi('/api/projects/file', {
      method: 'POST',
      body: JSON.stringify({ filePath, content }),
      silent: true,
    });
 
    // Show appropriate result based on what happened with the heal regen
    if (payload && payload.healedRegenerated) {
      showResult({
        ok: true,
        message: payload.message || 'Script saved.',
        filePath: payload.filePath,
        healedPath: payload.healedPath,
      });
      setStatus('warning', 'Script Saved · Healed Version NOT Updated');
    } else if (payload && payload.healSkipped) {
      // Not a plain spec under sanity/regression â€” no heal regen needed
      showResult({
        ok: true,
        message: payload.message || 'Script saved.',
        filePath: payload.filePath,
      });
      setStatus('success', 'Script Saved');
    } else if (payload && payload.healError) {
      // Save succeeded but heal regen failed â€” warn the user
      showResult({
        ok: true,
        message: payload.message || 'Script saved. Healed regen failed.',
        filePath: payload.filePath,
        warning: `Healed version was NOT updated: ${payload.healError}`,
      });
      setStatus('warning', 'Script Saved Ãƒâ€šÃ‚Â· Healed Version NOT Updated');
    } else {
      showResult(payload);
      setStatus('success', 'Script Saved');
    }
 
    codePanel.dataset.scriptText = normalizeScriptText(content);
    codePanel.dataset.scriptRawText = normalizeScriptText(content);
    codePanel.dataset.scriptSavedText = normalizeScriptText(content);
    setScriptPreviewContent(codePanel, content, payload?.relativePath || payload?.name || filePath);
    hideFileEditor(panel, codePanel);
    button.hidden = true;
    if (panel.classList.contains('project-spec-panel')) {
      try {
        const freshPayload = await callApi(apiUrlWithParams('/api/projects/file', { filePath }), {
          method: 'GET',
          silent: true,
        });
        if (freshPayload?.content !== undefined) {
          setScriptPreviewContent(codePanel, freshPayload.content || '', freshPayload.relativePath || freshPayload.name || filePath);
        }
      } catch {
        // If the refresh fails, keep the saved state and let the user continue.
      }
    }
    syncProjectSpecDirtyState(panel);
    await loadProjects({ silent: true });
  } catch (error) {
    showResult({ ok: false, error: error.message || String(error) });
    setStatus('error', 'Save Failed');
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function updateSelectedProjectSpec(selectEl) {
  const panel = selectEl.closest('.project-spec-panel');
  if (!panel) return;

  let files = [];
  try {
    files = JSON.parse(panel.dataset.files || '[]');
  } catch {
    files = [];
  }

  const selectedFile = files.find((file) => file.path === selectEl.value) || files[0];
  if (!selectedFile) return;

  panel.dataset.filePath = selectedFile.path || '';
  const summary = panel.querySelector('.project-code-panel summary');
  const pre = panel.querySelector('.project-code-panel pre');
  if (summary) {
    summary.textContent = selectedFile.relativePath || selectedFile.name || 'Selected spec';
  }
  if (pre) {
    setScriptPreviewContent(pre, selectedFile.content, selectedFile.relativePath || selectedFile.name || 'Selected spec');
    pre.classList.remove('is-editing');
  }

  panel.querySelectorAll('[data-file-path]').forEach((element) => {
    element.dataset.filePath = selectedFile.path || '';
  });

  const saveButton = panel.querySelector('.script-save');
  if (saveButton) {
    saveButton.hidden = true;
  }
  const editButton = panel.querySelector('.script-edit');
  if (editButton) {
    editButton.textContent = 'Edit';
  }
  setUnsavedState(panel, false);
}

async function browseProjectCreateLocation() {
  if (activePickerSocket) {
    activePickerSocket.close();
    activePickerSocket = null;
  }

  setStatus('running', 'Opening Picker');
  showResult({ ok: true, message: 'Choose where the new project folder should be created...' });

  const currentPath = projectCreateLocationEl?.value.trim() || getConfiguredProjectPath();

  return await new Promise((resolve) => {
    const socket = new WebSocket(wsUrl('/ws/pick-path'));
    activePickerSocket = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        mode: 'directory',
        initialPath: currentPath || undefined,
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        showResult(payload);

        if (payload.type === 'picker_opening') {
          setStatus('running', 'Opening Picker');
          return;
        }

        if (payload.type === 'picker_selected') {
          if (projectCreateLocationEl) {
            projectCreateLocationEl.value = payload.projectPath || '';
          }
          projectPathEl.value = '';
          if (projectSelectEl) {
            projectSelectEl.value = '';
          }
          setProjectPathStatus('Location selected. Create Project to use it.');
          setStatus('success', 'Location Selected');
          socket.close();
          resolve(payload);
          return;
        }

        if (payload.type === 'picker_cancelled') {
          setStatus('idle', 'Picker Cancelled');
          socket.close();
          resolve(payload);
          return;
        }

        if (payload.type === 'picker_error') {
          setStatus('error', 'Picker Error');
          socket.close();
          resolve(payload);
        }
      } catch (error) {
        showResult({ ok: false, error: error.message || String(error) });
        setStatus('error', 'Picker Error');
        socket.close();
        resolve(null);
      }
    };

    socket.onerror = () => {
      setStatus('error', 'Picker Error');
      showResult({ ok: false, error: 'Picker WebSocket error' });
      resolve(null);
    };

    socket.onclose = () => {
      if (activePickerSocket === socket) {
        activePickerSocket = null;
      }
    };
  });
}

async function runScriptFile(button) {
  const filePath = button.dataset.filePath || '';
  const row = button.closest('.project-file-panel');
  const projectPath = button.dataset.projectPath || row?.dataset.projectPath || '';
  const codePanel = row?.querySelector('.project-code-panel pre');

  // Find the project card to read Browser Mode + Execution dropdowns
  const projectCard = button.closest('.project-card');
  const modeInput = projectCard?.querySelector('.project-local-mode');
  const executionInput = projectCard?.querySelector('.project-local-execution');
  const headed = modeInput?.value === 'headed';
  const execution = executionInput?.value || 'parallel';

  if (!filePath || !projectPath) {
    showResult({ ok: false, error: 'Missing project or spec file path.' });
    setStatus('error', 'Run Failed');
    return null;
  }

  if (codePanel?.isContentEditable) {
    showResult({ ok: false, error: 'Save this test case before running it.' });
    setStatus('error', 'Save First');
    return null;
  }

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Running';

  try {
    projectPathEl.value = projectPath;
    const projectPathPayload = await saveProjectPath({ silent: true });
    if (!projectPathPayload?.projectPath) {
      showResult({ ok: false, error: 'Select a valid project before running this test case.' });
      setStatus('error', 'Select Project');
      return null;
    }

    return await runProjectTests({
      projectPath: projectPathPayload.projectPath,
      specPath: filePath,
      projects: ['chromium'],
      headed,
      execution,
    }, {
      onDone: (message) => {
        showResult({
          ...message,
          command: `npx playwright test ${filePath} --project=chromium --headed`,
          projectPath: projectPathPayload.projectPath,
        });

        const looksLikeFailure =
          message?.ok === false ||
          message?.status === 'failed' ||
          (typeof message?.message === 'string' &&
            /fail|error/i.test(message.message));

        loadProjects({ silent: true });

        if (looksLikeFailure) {
          attachInlineHealForFile({
            specPath: filePath,
            projectPath: projectPathPayload.projectPath,
          });
          hideHealUI();
        } else {
          forgetHealNeeded(filePath);
          removeInlineHealButton(row);
          hideHealUI();
        }
      },
    });
  } finally {
    button.disabled = false;
    button.textContent = originalText || 'Run';
  }
}

async function setupProjectPath(folderPath) {
  const selectedPath = String(folderPath || '').trim();
  if (!selectedPath) return null;

  closeActiveSetupSocket();
  setStatus('running', 'Setting Up');
  showResult({ ok: true, message: 'Preparing framework folder...', projectPath: selectedPath });

  return await new Promise((resolve) => {
    const socket = new WebSocket(wsUrl('/api/project/setup'));
    activeSetupSocket = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ folder_path: selectedPath }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        showResult(payload);

        if (payload.type === 'setup_log') {
          setStatus('running', 'Setting Up');
          return;
        }

        if (payload.type === 'setup_done') {
          setStatus('success', 'Framework Ready');
          socket.close();
          resolve(payload);
          return;
        }

        if (payload.type === 'setup_error') {
          setStatus('error', 'Setup Failed');
          socket.close();
          resolve(payload);
        }
      } catch (error) {
        showResult({ ok: false, error: error.message || String(error) });
        setStatus('error', 'Setup Failed');
        socket.close();
        resolve(null);
      }
    };

    socket.onerror = () => {
      setStatus('error', 'Setup Failed');
      showResult({ ok: false, error: 'Setup WebSocket error' });
      resolve(null);
    };

    socket.onclose = () => {
      if (activeSetupSocket === socket) {
        activeSetupSocket = null;
      }
    };
  });
}

async function runProjectTests(payload, options = {}) {
  closeActiveRunSocket();
  setStatus('running', 'Running Tests');
  showResult({ ok: true, message: 'Starting test run...', payload });

  return await new Promise((resolve) => {
    const socket = new WebSocket(wsUrl('/api/project/run'));
    activeRunSocket = socket;
    const logLines = [];

    socket.onopen = () => {
      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'log') {
          if (message.line) {
            logLines.push(message.line);
          }
          if (typeof options.onLog === 'function') {
            options.onLog(logLines, message);
          }
          showResult({
            ok: true,
            type: 'log',
            logs: logLines.slice(-200),
          });
          return;
        }

        if (message.type === 'done') {
          setStatus(message.ok ? 'success' : 'error', message.ok ? 'Passed' : 'Failed');
          if (typeof options.onDone === 'function') {
            options.onDone({ ...message, logs: logLines });
          }
          showResult({
            ...message,
            logs: logLines,
          });
          socket.close();
          resolve(message);
          return;
        }

        if (message.type === 'error') {
          setStatus('error', 'Run Failed');
          if (typeof options.onDone === 'function') {
            options.onDone({ ...message, logs: logLines });
          }
          showResult({
            ...message,
            logs: logLines,
          });
          socket.close();
          resolve(message);
        }
      } catch (error) {
        setStatus('error', 'Run Failed');
        showResult({ ok: false, error: error.message || String(error) });
        socket.close();
        resolve(null);
      }
    };

    socket.onerror = () => {
      setStatus('error', 'Run Failed');
      showResult({ ok: false, error: 'Run WebSocket error' });
      resolve(null);
    };

    socket.onclose = () => {
      if (activeRunSocket === socket) {
        activeRunSocket = null;
      }
    };
  });
}

async function runTaggedSuite(testType, button, projectPath = '') {
  const normalizedTestType = testType === 'smoke' ? 'sanity' : testType;
  const label = normalizedTestType === 'regression' ? 'Regression' : 'Sanity';

  if (button) {
    button.disabled = true;
  }

  // Read Execution dropdown from the project card
  const card = button?.closest('.project-card');
  const executionInput = card?.querySelector('.project-local-execution');
  const execution = executionInput?.value || 'parallel';
  const modeInput = card?.querySelector('.project-local-mode');
  const headed = modeInput?.value === 'headed';

  try {
    const selectedProjectPath = String(projectPath || '').trim() || await resolveSelectedProjectPath({ silent: true });
    if (!selectedProjectPath) {
      showResult({ ok: false, error: `Select a project before running ${label}.` });
      setStatus('error', 'Select Project');
      return null;
    }

    projectPathEl.value = selectedProjectPath;
    const projectPathPayload = await saveProjectPath({ silent: true });
    if (!projectPathPayload?.projectPath) {
      showResult({ ok: false, error: `Select a valid project before running ${label}.` });
      setStatus('error', 'Select Project');
      return null;
    }

    return await runProjectTests({
      projectPath: projectPathPayload.projectPath,
      specPath: normalizedTestType,
      projects: ['chromium'],
      headed,
      execution,
    }, {
      onDone: (message) => {
        const workersFlag = execution === 'sequential' ? '--workers=1' : '--workers=4';
        const modeFlag = headed ? '--headed' : '';
        showResult({
          ...message,
          command: `npx playwright test ${normalizedTestType} --project=chromium ${modeFlag} ${workersFlag}`.replace(/\s+/g, ' ').trim(),
          projectPath: projectPathPayload.projectPath,
          execution,
          headed,
        });

        // Show "Heal & Rerun Failed" if any tests failed AND we have a report.json path
        const failed = Number(message?.summary?.failed || 0);
        const reportJsonPath = message?.reports?.json || '';
        if (failed > 0 && reportJsonPath) {
          renderHealRerunButton({
            projectPath: projectPathPayload.projectPath,
            reportJsonPath,
            headed,
            execution,
          });
        } else {
          removeHealRerunButton();
        }

        loadProjects({ silent: true });
      },
    });
  } finally {
    if (button) {
      button.disabled = false;
    }
    if (statusEl.textContent === 'Running Tests') {
      setStatus('idle', `${label} Finished`);
    }
  }
}

async function setSpecPriority(button) {
  const specPath = button.dataset.filePath || '';
  if (!specPath) {
    showResult({ ok: false, error: 'Spec file path missing for set-priority.' });
    return;
  }

  button.disabled = true;
  try {
    const response = await callApi('/api/projects/set-priority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specPath }),
    }).then(r => r.json());

    if (!response.ok) {
      const message = response.error || response.detail || 'Set Priority failed.';
      showResult({ ok: false, error: message });
      setStatus('error', 'Priority Failed');
      return;
    }

    if (response.alreadyPrioritized) {
      showResult({
        ok: true,
        message: `Already has priority ${response.priority}: ${response.fileName}`,
      });
    } else {
      showResult({
        ok: true,
        message: `Set priority ${response.priority}: ${response.fileName}`,
      });
      setStatus('success', `Priority ${response.priority}`);
    }

    // Reload projects so the renamed file appears
    await loadProjects({ silent: true });
  } catch (err) {
    showResult({ ok: false, error: err.message || String(err) });
    setStatus('error', 'Priority Failed');
  } finally {
    button.disabled = false;
  }
}

async function triggerJenkinsSuiteRun(testType, button, projectPath = '') {
  const normalizedTestType = testType === 'smoke' ? 'sanity' : testType;
  const label = normalizedTestType === 'regression' ? 'Regression' : 'Sanity';

  if (button) {
    button.disabled = true;
  }

  try {
    const selectedProjectPath = String(projectPath || '').trim();
    const context = await getProjectContext(selectedProjectPath, { silent: true });
    const project = context?.project;
    const card = button?.closest('.project-card');
    const jobInput = card?.querySelector('.project-jenkins-job-name');
    const jobName = String(jobInput?.value || project?.jenkinsJobName || project?.name || '').trim();
    const modeInput = card?.querySelector('.project-jenkins-mode');
    const headed = modeInput?.value === 'headed';
    const executionInput = card?.querySelector('.project-jenkins-execution');
    const execution = executionInput?.value || 'parallel';
    const resolvedProjectPath = context?.selectedProjectPath || selectedProjectPath || '';
    const payload = {
      testType: normalizedTestType,
      projectPath: resolvedProjectPath || undefined,
      jobName,
      browser: 'chromium',
      headed,
      execution,
    };

    setStatus('running', `Jenkins ${label}`);
    showResult({ ok: true, message: `Triggering Jenkins ${label.toLowerCase()} run...`, payload });

    const response = await callApi('/api/jenkins/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = response.error || response.detail || `Unable to trigger Jenkins ${label.toLowerCase()} run.`;
      setStatus('error', `${label} Failed`);
      showResult({ ok: false, error: message, payload });
      return response;
    }

    setStatus('success', `${label} Queued`);
    showResult({
      ok: true,
      message: `Jenkins ${label.toLowerCase()} run queued.`,
      payload,
      queueUrl: response.queueUrl || '',
      status: response.status,
    });
    return response;
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

function getRelatedRunProjects(card) {
  return Array.from(card.querySelectorAll('input[name="related-projects"]:checked'))
    .map((input) => input.value)
    .filter(Boolean);
}

async function executeRelatedScript(button) {
  const card = button.closest('.related-card');
  const output = card?.querySelector('.related-run-output');
  const record = relatedScriptRecords.get(button.dataset.recordId || '');
  if (!card || !record || !record.refinedSpec?.content) {
    showResult({ ok: false, error: 'No saved AI spec content found for this ChromaDB record.' });
    setStatus('error', 'Run Failed');
    return;
  }

  const projectPathPayload = await saveProjectPath({ silent: true });
  if (!projectPathPayload?.projectPath) {
    showResult({ ok: false, error: 'Set the framework location before running the saved ChromaDB spec.' });
    setStatus('error', 'Error');
    return;
  }

  const projects = getRelatedRunProjects(card);
  if (!projects.length) {
    showResult({ ok: false, error: 'Select at least one browser for this saved ChromaDB spec.' });
    setStatus('error', 'Error');
    return;
  }

  button.disabled = true;
  if (output) {
    output.hidden = false;
    output.textContent = '{ "message": "Starting saved ChromaDB spec run..." }';
  }

  const result = await runProjectTests({
    specContent: record.refinedSpec.content,
    specName: record.testName || record.generatedPath || 'chroma-saved-spec',
    projects,
    headed: card.querySelector('input[name="related-headed"]')?.checked !== false,
  }, {
    onLog: (logs) => {
      if (output) {
        output.textContent = JSON.stringify({ running: true, logs: logs.slice(-80) }, null, 2);
      }
    },
    onDone: (message) => {
      if (output) {
        output.textContent = JSON.stringify(message, null, 2);
      }
    },
  });

  button.disabled = false;
  return result;
}

async function browseProjectPath(mode = 'directory') {
  if (activePickerSocket) {
    activePickerSocket.close();
    activePickerSocket = null;
  }

  setStatus('running', 'Opening Picker');
  showResult({ ok: true, message: 'Opening native path picker...' });

  const currentPath = getConfiguredProjectPath();

  return await new Promise((resolve) => {
    const socket = new WebSocket(wsUrl('/ws/pick-path'));
    activePickerSocket = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        mode,
        initialPath: currentPath || undefined,
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        showResult(payload);

        if (payload.type === 'picker_opening') {
          setStatus('running', 'Opening Picker');
          return;
        }

        if (payload.type === 'picker_selected') {
          projectPathEl.value = payload.projectPath || '';
          setStatus('success', 'Path Selected');
          const savePayload = await saveProjectPath();
          await setupProjectPath(savePayload?.projectPath || payload.projectPath || '');
          socket.close();
          resolve(payload);
          return;
        }

        if (payload.type === 'picker_cancelled') {
          setStatus('idle', 'Picker Cancelled');
          socket.close();
          resolve(payload);
          return;
        }

        if (payload.type === 'picker_error') {
          setStatus('error', 'Picker Error');
          socket.close();
          resolve(payload);
        }
      } catch (error) {
        showResult({ ok: false, error: error.message || String(error) });
        setStatus('error', 'Picker Error');
        socket.close();
        resolve(null);
      }
    };

    socket.onerror = () => {
      setStatus('error', 'Picker Error');
      showResult({ ok: false, error: 'Picker WebSocket error' });
      resolve(null);
    };

    socket.onclose = () => {
      if (activePickerSocket === socket) {
        activePickerSocket = null;
      }
    };
  });
}

async function loadProjectPath(options = {}) {
  const storedPath = window.localStorage.getItem(PROJECT_PATH_STORAGE_KEY);
  if (storedPath && !projectPathEl.value.trim()) {
    projectPathEl.value = storedPath;
  }

  let payload = await callApi('/api/project-path', { method: 'GET', ...options });
  if (!payload.projectPath && storedPath) {
    payload = await callApi('/api/project-path', {
      method: 'POST',
      body: JSON.stringify({ projectPath: storedPath }),
      ...options,
      silent: true,
    });
  }

  const resolvedPath = payload.projectPath || projectPathEl.value.trim() || '';
  if (resolvedPath) {
    projectPathEl.value = resolvedPath;
    window.localStorage.setItem(PROJECT_PATH_STORAGE_KEY, resolvedPath);
  }
  setProjectPathStatus(resolvedPath);
  if (projectSelectEl && resolvedPath) {
    projectSelectEl.value = resolvedPath;
  }
  return payload;
}



document.getElementById('record-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  showRecordFormMessage('');
  setStatus('running', 'Starting');
  renderWorkflowProgress({
    progress: [
      {
        status: 'running',
        message: 'Starting recorder workflow. Preparing project and connecting to backend...',
        timestamp: new Date().toISOString(),
      },
    ],
  });
  renderLatestFilesProgress({
    codegenPath: 'Starting recorder',
    codegenMessage: 'Preparing the recorder. The latest masked codegen panel is reserved for this run.',
    aiPath: 'Waiting for recording',
    aiMessage: 'AI will modify the script after recording is done.',
    testDataPath: 'Waiting for masking',
    testDataMessage: 'Latest test data will appear after masking.',
  });

  const pendingLocation = projectCreateLocationEl?.value.trim() || '';
  const pendingName = projectCreateNameEl?.value.trim() || '';
  if (pendingLocation && pendingName && !getConfiguredProjectPath()) {
    const createPayload = await createProject();
    if (!createPayload?.projectPath) {
      showRecordFormMessage(createPayload?.error || createPayload?.detail || 'Project could not be created.');
      return;
    }
  } else if (pendingLocation && !getConfiguredProjectPath()) {
    const message = 'Create the project in the selected local location before generating.';
    showResult({ ok: false, error: message });
    showRecordFormMessage(message);
    setStatus('error', 'Create Project');
    return;
  }
  await saveProjectPath();
  const payload = cleanPayload({
    projectPath: getConfiguredProjectPath(),
    url: document.getElementById('record-url').value.trim(),
    browser: document.getElementById('record-browser').value,
    viewportWidth: document.getElementById('record-viewport-width')?.value.trim(),
    viewportHeight: document.getElementById('record-viewport-height')?.value.trim(),
    fileName: document.getElementById('record-output-name').value.trim(),
    testName: document.getElementById('record-test-name').value.trim(),
    testType: recordTestTypeEl?.value || '',
  });

  const response = await callApi('/api/record-and-refine', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = response.error || response.detail || 'A test file with this output name already exists in the selected project.';
    showRecordFormMessage(message);
    setStatus('error', 'Duplicate Test');
    renderWorkflowProgress({
      progress: [
        {
          status: 'failed',
          message,
          timestamp: new Date().toISOString(),
        },
      ],
    });
    return;
  }

  if (response.jobId) {
    setStatus('running', 'Recording');
    renderWorkflowProgress({
      progress: [
        {
          status: 'running',
          message: response.message || 'Workflow queued. Connecting to live progress...',
          timestamp: new Date().toISOString(),
        },
      ],
    });
    renderLatestFilesProgress({
      codegenPath: 'Recording script',
      codegenMessage: 'Recorder is starting. Latest masked codegen will appear for this run only.',
      aiPath: 'Waiting for recording',
      aiMessage: 'AI will modify the script after recording is done.',
      testDataPath: 'Waiting for masking',
      testDataMessage: 'Latest test data will appear after masking.',
    });
    watchJob(response.jobId);
  } else {
    await loadArtifacts();
  }
});

const refreshArtifactsButtonEl = document.getElementById('refresh-artifacts');

if (refreshArtifactsButtonEl) {
  refreshArtifactsButtonEl.addEventListener('click', loadArtifacts);
}
if (refreshProjectsButtonEl) {
  refreshProjectsButtonEl.addEventListener('click', () => loadProjects());
}
  if (projectListEl) {
    projectListEl.addEventListener('change', (event) => {
      const select = event.target.closest('.project-spec-select');
      if (select) {
        updateSelectedProjectSpec(select);
        return;
      }

      const fakerToggle = event.target.closest('.project-faker-mode-select');
      if (fakerToggle) {
        const panel = fakerToggle.closest('.project-faker-panel');
        if (panel) {
          markProjectFakerDirty(panel);
        }
      }
    });

    projectListEl.addEventListener('click', async (event) => {
      const button = event.target.closest('.project-run');
      if (button) {
        runTaggedSuite(button.dataset.testType || 'sanity', button, button.dataset.projectPath || '');
        return;
      }

      const jenkinsRunButton = event.target.closest('.project-jenkins-run');
      if (jenkinsRunButton) {
        triggerJenkinsSuiteRun(jenkinsRunButton.dataset.testType || 'sanity', jenkinsRunButton, jenkinsRunButton.dataset.projectPath || '');
        return;
      }

      const createJenkinsButton = event.target.closest('.project-create-jenkins-job');
      if (createJenkinsButton) {
        createProjectJenkinsJob(createJenkinsButton);
        return;
      }

      const pushButton = event.target.closest('.project-push');
      if (pushButton) {
        pushProjectChanges(pushButton);
        return;
      }

      const downloadFrameworkButton = event.target.closest('.project-download');
      if (downloadFrameworkButton) {
        downloadProject(downloadFrameworkButton.dataset.projectPath || '');
        return;
      }

      const editButton = event.target.closest('.script-edit');
      if (editButton) {
        editScript(editButton);
        return;
      }

      const saveButton = event.target.closest('.script-save');
      if (saveButton) {
        saveScript(saveButton);
        return;
      }

      const runScriptButton = event.target.closest('.script-run');
      if (runScriptButton) {
        runScriptFile(runScriptButton);
        return;
      }
      const setPriorityButton = event.target.closest('.script-set-priority');
      if (setPriorityButton) {
        setSpecPriority(setPriorityButton);
        return;
      }

      const downloadScriptButton = event.target.closest('.script-download');
      if (downloadScriptButton) {
        downloadScript(downloadScriptButton.dataset.filePath || '');
        return;
      }

    const fakerConfirmButton = event.target.closest('.project-faker-confirm');
    if (fakerConfirmButton) {
      const panel = fakerConfirmButton.closest('.project-faker-panel');
      if (panel) {
        await saveProjectFakerFields(panel);
      }
    }
  });
}
if (relatedListEl) {
  relatedListEl.addEventListener('click', (event) => {
    const button = event.target.closest('.related-execute');
    if (button) {
      executeRelatedScript(button);
    }
  });
}
if (saveProjectPathButtonEl) {
  saveProjectPathButtonEl.addEventListener('click', saveProjectPath);
}
if (browseProjectPathButtonEl) {
  browseProjectPathButtonEl.addEventListener('click', () => browseProjectPath('directory'));
}
if (browseProjectLocationButtonEl) {
  browseProjectLocationButtonEl.addEventListener('click', browseProjectCreateLocation);
}
if (projectSelectEl) {
  projectSelectEl.addEventListener('change', () => {
    projectPathEl.value = projectSelectEl.value || projectPathEl.value.trim();
    setProjectPathStatus(projectPathEl.value.trim());
    if (projectSelectEl.value) {
      saveProjectPath({ silent: true });
    }
  });
}
if (createProjectButtonEl) {
  createProjectButtonEl.addEventListener('click', createProject);
}
document.addEventListener('click', async (event) => {
  const closeTarget = event.target.closest('#assertion-popup-close');
  if (closeTarget) {
    hideAssertionPopup();
    return;
  }

  const insertTarget = event.target.closest('.assertion-insert-button');
  if (insertTarget) {
    const code = insertTarget.dataset.insertCode || '';
    const context = currentAssertionContext;
    if (context?.preEl && context.lineNumber && code) {
      const inserted = insertAssertionIntoScript(context.preEl, context.lineNumber, code);
      if (inserted) {
        await openAssertionPopupForLine(context.preEl, context.lineNumber);
      }
    }
    return;
  }
});

document.addEventListener('input', (event) => {
  const fileEditor = event.target?.closest?.('.file-editor');
  if (fileEditor) {
    syncProjectSpecDirtyState(fileEditor.closest('.project-file-panel'));
    return;
  }
  const codePanel = event.target?.closest?.('.project-code-panel pre');
  if (!codePanel) return;
  codePanel.dataset.scriptRawText = normalizeScriptText(codePanel.textContent || '');
  syncProjectSpecDirtyState(codePanel.closest('.project-file-panel'));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideAssertionPopup();
  }
});

async function bootstrapPage() {
  setStatus('running', 'Loading Files');
  renderLatestFilesLoading();

  const projectPathResult = await Promise.allSettled([
    loadProjectPath({ silent: true }),
  ]);
  await loadProjects({ silent: true });

  const bootTasks = await Promise.allSettled([
    loadTestTypes({ silent: true }),
    loadArtifacts({ silent: true }),
  ]);

  const bootErrors = [...projectPathResult, ...bootTasks]
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason?.message || String(result.reason));
  if (bootErrors.length) {
    showResult({ ok: false, error: bootErrors.join('\n') });
    setStatus('error', 'Load Error');
  } else {
    showResult({ ok: true, message: 'Files loaded.', apiOrigin: API_ORIGIN });
    setStatus('idle', 'Ready');
  }
}

bootstrapPage();


// =====================================================================
// INLINE HEAL â€” runs the .healed.spec.js file when test fails
// =====================================================================

const healResultPanelEl = document.getElementById('heal-result-panel');
const healResultTitleEl = document.getElementById('heal-result-title');
const healResultSummaryEl = document.getElementById('heal-result-summary');
const healResultDetailsEl = document.getElementById('heal-result-details');

let healButtonEl = null;
let showHealDetailsBtnEl = null;
let lastHealedRunContext = null;

function hideHealUI() {
  if (healResultPanelEl) healResultPanelEl.hidden = true;
  if (healButtonEl) healButtonEl.hidden = true;
  if (showHealDetailsBtnEl) showHealDetailsBtnEl.hidden = true;
}

function showHealPanel() {
  if (!healResultPanelEl) return;
  healResultPanelEl.hidden = false;
  healResultPanelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setHealStatus(text, mode) {
  if (healResultTitleEl) healResultTitleEl.textContent = text;
  if (healResultSummaryEl) healResultSummaryEl.className = `artifact-summary heal-${mode || 'info'}`;
}

function setHealSummary(text) {
  if (healResultSummaryEl) healResultSummaryEl.textContent = text;
}

function clearHealLog() {
  if (healResultDetailsEl) healResultDetailsEl.textContent = '';
}

function appendHealLog(line) {
  if (!healResultDetailsEl) return;
  healResultDetailsEl.textContent += String(line || '') + '\n';
  healResultDetailsEl.scrollTop = healResultDetailsEl.scrollHeight;
}

function ensureHealButton() {
  if (healButtonEl) return healButtonEl;
  if (!healResultPanelEl) return null;

  const btn = document.createElement('button');
  btn.id = 'heal-button';
  btn.type = 'button';
  btn.className = 'button button-primary';
  btn.style.marginTop = '8px';
  btn.style.marginRight = '8px';
  btn.textContent = '🩹 Heal';
  btn.hidden = true;
  if (healResultSummaryEl && healResultSummaryEl.parentNode) {
    healResultSummaryEl.parentNode.appendChild(btn);
  } else {
    healResultPanelEl.appendChild(btn);
  }
  healButtonEl = btn;
  return btn;
}

function ensureShowHealDetailsButton() {
  if (showHealDetailsBtnEl) return showHealDetailsBtnEl;
  if (!healResultPanelEl) return null;

  const btn = document.createElement('button');
  btn.id = 'show-heal-details-btn';
  btn.type = 'button';
  btn.className = 'button button-secondary';
  btn.style.marginTop = '8px';
  btn.textContent = 'Show Heal Details';
  btn.hidden = true;
  btn.addEventListener('click', loadAndShowHeals);
  if (healResultSummaryEl && healResultSummaryEl.parentNode) {
    healResultSummaryEl.parentNode.appendChild(btn);
  } else {
    healResultPanelEl.appendChild(btn);
  }
  showHealDetailsBtnEl = btn;
  return btn;
}

// Track which spec paths need a Heal button so we can re-add after re-renders
const _pendingHealForSpec = new Map(); // specPath -> { projectPath }

function rememberHealNeeded(specPath, projectPath) {
  _pendingHealForSpec.set(specPath, { projectPath });
}

function forgetHealNeeded(specPath) {
  _pendingHealForSpec.delete(specPath);
}

function showInlineHealButton({ specPath, projectPath, row, button }) {
  if (row && row.querySelector(`button[data-heal-for="${CSS.escape(specPath)}"]`)) {
    return;
  }
  removeInlineHealButton(row);

  const inlineBtn = document.createElement('button');
  inlineBtn.type = 'button';
  inlineBtn.className = 'button button-primary inline-heal-btn';
  inlineBtn.textContent = '🩹 Heal';
  inlineBtn.style.marginLeft = '8px';
  inlineBtn.dataset.healInline = 'true';
  inlineBtn.dataset.healFor = specPath;

  inlineBtn.addEventListener('click', async () => {
    inlineBtn.disabled = true;
    inlineBtn.textContent = '🩹 Healing...';
    try {
      forgetHealNeeded(specPath); // user clicked it, no need to re-add
      await runHealOnSpec({ specPath, projectPath });
    } finally {
      inlineBtn.textContent = '🩹 Heal';
      inlineBtn.disabled = false;
    }
  });

  if (button && button.parentNode) {
    button.parentNode.insertBefore(inlineBtn, button.nextSibling);
  } else if (row) {
    row.appendChild(inlineBtn);
  }
}

function removeInlineHealButton(row) {
  if (!row) return;
  row.querySelectorAll('button[data-heal-inline="true"]').forEach((btn) => btn.remove());
}

function attachInlineHealForFile({ specPath, projectPath }) {
  rememberHealNeeded(specPath, projectPath);
  reattachAllPendingHealButtons();
}

function reattachAllPendingHealButtons() {
  if (_pendingHealForSpec.size === 0) return;

  for (const [specPath, ctx] of _pendingHealForSpec.entries()) {
    // Skip if button already attached for this spec
    if (document.querySelector(`button[data-heal-for="${CSS.escape(specPath)}"]`)) {
      continue;
    }

    const runBtn = document.querySelector(`button[data-file-path="${CSS.escape(specPath)}"]`);
    if (!runBtn) continue;
    const row = runBtn.closest('.project-file-panel') || runBtn.parentElement;
    showInlineHealButton({ specPath, projectPath: ctx.projectPath, row, button: runBtn });
  }
}

// Watch for any DOM change, then re-attach pending heal buttons
(function setupHealButtonAutoReattach() {
  const observer = new MutationObserver(() => {
    if (_pendingHealForSpec.size === 0) return;
    // Throttle so we don't fire on every tiny mutation
    clearTimeout(window.__healReattachTimer);
    window.__healReattachTimer = setTimeout(reattachAllPendingHealButtons, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

function showHealButtonAfterFailure({ specPath, projectPath }) {
  showHealPanel();
  setHealStatus('Test failed â€” heal available', 'info');
  setHealSummary('Click Heal to run the heal-wrapped version of this test.');
  clearHealLog();

  const btn = ensureHealButton();
  if (!btn) return;
  btn.hidden = false;
  btn.disabled = false;

  // Replace the node to detach previous click handlers
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);
  healButtonEl = fresh;

  fresh.addEventListener('click', () => {
    runHealOnSpec({ specPath, projectPath });
  });

  if (showHealDetailsBtnEl) showHealDetailsBtnEl.hidden = true;
}

async function applyHealsToSourceFiles({ projectPath, plainSpecPath }) {
  appendHealLog('[ui] applying healed locators to source files...');
  try {
    const resp = await fetch(apiUrl('/api/apply-heals'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, plainSpecPath }),
    });
    const data = await resp.json();
    if (!data.ok) {
      appendHealLog(`[ui] âš  apply-heals failed: ${data.error || 'unknown error'}`);
      return;
    }
    if (data.applied === 0) {
      appendHealLog('[ui] â„¹ no locators to apply (no actionable heals in this run).');
      return;
    }
    appendHealLog(`[ui] âœ… ${data.message}`);
    for (const change of data.changes || []) {
      appendHealLog(`    â€¢ [${change.step}] ${change.original_locator} â†’ ${change.healed_locator}`);
    }
    if (data.backups && data.backups.length > 0) {
      appendHealLog(`[ui] backups created: ${data.backups.length}`);
    }
    if (data.errors && data.errors.length > 0) {
      for (const err of data.errors) {
        appendHealLog(`[ui] âš  ${err}`);
      }
    }
  } catch (error) {
    appendHealLog(`[ui] âš  apply-heals request failed: ${error.message || error}`);
  }
}

async function runHealOnSpec({ specPath, projectPath }) {
  // Show the bottom heal panel for status/details
  showHealPanel();
  if (healButtonEl) healButtonEl.disabled = true;
  setHealStatus('Looking up healed version...', 'info');
  setHealSummary('Resolving the healed copy of this spec...');
  clearHealLog();
  if (showHealDetailsBtnEl) showHealDetailsBtnEl.hidden = true;
  const oldDetails = document.getElementById('inline-heals-block');
  if (oldDetails) oldDetails.remove();
  appendHealLog('[ui] looking up healed spec...');
 
  let healedAbsPath = '';
  try {
    const resp = await fetch(apiUrl('/api/find-healed-spec'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specPath, projectPath }),
    });
    const data = await resp.json();
    if (!data.ok) {
      setHealStatus('No healed spec available', 'error');
      setHealSummary(data.reason || 'Healed spec not found.');
      appendHealLog('[ui] ' + (data.reason || 'no healed spec'));
      if (healButtonEl) healButtonEl.disabled = false;
      return;
    }
    healedAbsPath = data.healedPath;
  } catch (e) {
    setHealStatus('Lookup failed', 'error');
    setHealSummary('Could not reach the heal-lookup endpoint: ' + e.message);
    if (healButtonEl) healButtonEl.disabled = false;
    return;
  }
 
  appendHealLog(`[ui] running healed spec: ${healedAbsPath}`);
  setHealStatus('Running healed test...', 'info');
  setHealSummary(`Running ${healedAbsPath.split(/[\\\/]/).pop()} with inline self-healing...`);
 
  try {
    // Read the project card dropdowns instead of hardcoded headed:true
    const card = document.querySelector(`[data-project-path="${CSS.escape(projectPath)}"]`)?.closest('.project-card');
    const modeInput = card?.querySelector('.project-local-mode');
    const executionInput = card?.querySelector('.project-local-execution');
    const headed = modeInput?.value === 'headed';
    const execution = executionInput?.value || 'parallel';

    await runProjectTests({
      projectPath,
      specPath: healedAbsPath,
      projects: ['chromium'],
      headed,
      execution,
    }, {
      onLog: (logs) => {
        const recent = logs.slice(-5);
        for (const line of recent) {
          if (line && line.includes('[inline-heal]')) {
            appendHealLog(line);
          }
        }
      },
      onDone: (message) => {
        const failed =
          message?.ok === false ||
          message?.status === 'failed' ||
          (typeof message?.message === 'string' && /fail|error/i.test(message.message));
 
        lastHealedRunContext = { specPath, projectPath, healedAbsPath };
 
        if (failed) {
          setHealStatus('Healed test still failing', 'error');
          setHealSummary('Healed test still failed. Click "Show Heal Details" to see what was attempted.');
          appendHealLog('healed test FAILED');
        } else {
          setHealStatus('Healed test passed', 'success');
          setHealSummary('Healed test PASSED. Click "Show Heal Details" to see what was healed.');
          appendHealLog('healed test PASSED');
        }
 
        // Apply healed locators back to source spec files (both plain and healed).
        // Fire-and-forget â€” logs are appended to the same heal panel.
        applyHealsToSourceFiles({
          projectPath,
          plainSpecPath: specPath,
        }).catch((err) => {
          appendHealLog(`[ui] apply-heals error: ${err.message || err}`);
        });
 
        const detailsBtn = ensureShowHealDetailsButton();
        if (detailsBtn) detailsBtn.hidden = false;
 
        if (healButtonEl) {
          healButtonEl.hidden = true;
          healButtonEl.disabled = false;
        }
      },
    });
  } catch (e) {
    setHealStatus('Healed run error', 'error');
    setHealSummary('Healed test run threw: ' + e.message);
    if (healButtonEl) {
      healButtonEl.disabled = false;
    }
  }
}
 

async function loadAndShowHeals() {
  if (!lastHealedRunContext) {
    appendHealLog('[ui] no heal context yet');
    return;
  }
  const { projectPath } = lastHealedRunContext;
  appendHealLog('[ui] loading inline_heals.json...');

  let resp;
  try {
    const url = apiUrl('/api/inline-heals?projectPath=' + encodeURIComponent(projectPath));
    resp = await callApi(url, { method: 'GET' });
  } catch (e) {
    appendHealLog('[ui] inline-heals fetch failed: ' + e.message);
    return;
  }

  // callApi already parses JSON - resp IS the data
  const data = resp;
  if (!data || typeof data !== 'object') {
    appendHealLog('[ui] inline-heals returned non-JSON');
    return;
  }

  if (!data.ok) {
    appendHealLog('[ui] inline-heals failed: ' + (data.reason || 'unknown'));
    return;
  }

  renderInlineHeals(data.heals || [], data.totalHeals || 0);
}

function renderInlineHeals(heals, total) {
  let block = document.getElementById('inline-heals-block');
  if (!block) {
    block = document.createElement('pre');
    block.id = 'inline-heals-block';
    block.className = 'result';
    block.style.marginTop = '12px';
    block.style.maxHeight = '400px';
    block.style.overflowY = 'auto';
    if (healResultPanelEl) healResultPanelEl.appendChild(block);
  }

  if (!heals.length) {
    block.textContent = '(No inline heals recorded for this run â€” all locators worked on first try, or healing logs are missing.)';
    return;
  }

  const lines = [`ðŸ©¹ Inline Heals â€” ${total} locator(s) healed during this run:\n`];
  for (let i = 0; i < heals.length; i++) {
    const h = heals[i];
    lines.push(`Heal #${i + 1}`);
    if (h.step) lines.push(`  Step: ${h.step}`);
    if (h.action) lines.push(`  Action: ${h.action}`);
    if (h.original_locator) lines.push(`  Ã¢ÂÅ’ Original: ${h.original_locator}`);
    if (h.healed_locator) lines.push(`  âœ… Healed:   ${h.healed_locator}`);
    lines.push('');
  }
  block.textContent = lines.join('\n');

}
// =========================================================================
// Git Actions Modal â€” open/close + wire all inner buttons
// =========================================================================
document.addEventListener('DOMContentLoaded', function setupGitActionsModal() {
  const modal = document.getElementById('gitActionsModal');
  if (!modal) {
    console.warn('[git-actions] modal element not found in DOM');
    return;
  }

  const closeBtn = document.getElementById('gaModalClose');
  const initGitBtn = document.getElementById('gaInitGitBtn');
  const gitStatusLabel = document.getElementById('gaGitStatusLabel');
  const commitMessageInput = document.getElementById('gaCommitMessage');
  const commitPushBtn = document.getElementById('gaCommitPushBtn');
  const jenkinsJobInput = document.getElementById('gaJenkinsJobName');
  const jenkinsModeSelect = document.getElementById('gaJenkinsMode');
  const jenkinsExecSelect = document.getElementById('gaJenkinsExecution');
  const createJobBtn = document.getElementById('gaCreateJobBtn');
  const jenkinsRunSanityBtn = document.getElementById('gaJenkinsRunSanityBtn');
  const jenkinsRunRegressionBtn = document.getElementById('gaJenkinsRunRegressionBtn');
  const remoteStatusLabel = document.getElementById('gaRemoteStatusLabel');
  const pullLatestBtn = document.getElementById('gaPullLatestBtn');
  const pushHint = document.getElementById('gaPushHint');

  let currentProject = { path: '', name: '', jenkinsJobName: '' };

  function openModal(project) {
    currentProject = {
      path: project.path || '',
      name: project.name || '',
      jenkinsJobName: project.jenkinsJobName || '',
    };
    // Re-render Jenkins report buttons for the newly-selected project (from cache)
  refreshJenkinsReportButtonsForProject();
  if (jenkinsJobInput) jenkinsJobInput.value = currentProject.jenkinsJobName;
    // Clear any stale Jenkins status messages from a previous project
    const _stale_status = document.getElementById('jenkinsCreateStatus');
    if (_stale_status) { _stale_status.textContent = ''; _stale_status.className = 'ga-hint'; }
    const _stale_check = document.getElementById('gaJenkinsJobNameStatus');
    if (_stale_check) { _stale_check.textContent = ''; _stale_check.style.color = ''; }
    // Show banner if this project already has a Jenkins job
    const banner = document.getElementById('gaJenkinsExistingBanner');
    if (banner) {
      if (currentProject.jenkinsJobName) {
        banner.textContent = 'i  This project already has a Jenkins job: "' + currentProject.jenkinsJobName + '". You can create another with a different name if needed.';
        banner.style.display = 'block';
      } else {
        banner.textContent = '';
        banner.style.display = 'none';
      }
    }
    if (gitStatusLabel) {
      gitStatusLabel.textContent = 'Checking status...';
      gitStatusLabel.className = 'ga-hint';
    }
    if (initGitBtn) initGitBtn.disabled = true;
    // Reset GitHub URL input (will be revealed if needed by fetchGitStatus)
    const ghWrap = document.getElementById('gaGithubUrlWrap');
    const ghInput = document.getElementById('gaGithubUrlInput');
    if (ghWrap) ghWrap.style.display = 'none';
    if (ghInput) { ghInput.value = ''; ghInput.disabled = false; }
    // Reset push section state
    if (remoteStatusLabel) {
      remoteStatusLabel.textContent = 'Checking remote status...';
      remoteStatusLabel.className = 'ga-hint';
    }
    if (pullLatestBtn) pullLatestBtn.hidden = true;
    if (commitPushBtn) commitPushBtn.disabled = true;  // disable until remote check finishes
    if (pushHint) pushHint.textContent = '';
    modal.hidden = false;
    fetchGitStatus();
    fetchRemoteStatus();
  }

  function closeModal() {
    modal.hidden = true;
  }

  async function fetchGitStatus() {
    try {
      const url = `/api/projects/git-status?projectPath=${encodeURIComponent(currentProject.path)}`;
      const data = await callApi(url);
      const isInit = !!data.git_initialized;
      if (gitStatusLabel) {
        if (isInit) {
          gitStatusLabel.textContent = 'Git is already initialized';
          gitStatusLabel.className = 'ga-hint ga-hint-ok';
        } else {
          gitStatusLabel.textContent = 'Git not initialized yet';
          gitStatusLabel.className = 'ga-hint ga-hint-warn';
        }
      }
      if (initGitBtn) initGitBtn.disabled = isInit;
      const ghWrap = document.getElementById('gaGithubUrlWrap');
      const ghInput = document.getElementById('gaGithubUrlInput');
      if (ghWrap && ghInput) {
        if (!isInit) {
          ghWrap.style.display = '';
          ghWrap.hidden = false;
          ghInput.value = '';
          ghInput.disabled = false;
        } else {
          ghWrap.style.display = 'none';
          ghWrap.hidden = true;
        }
      }
    } catch (err) {
      console.error('git-status fetch failed', err);
      if (gitStatusLabel) gitStatusLabel.textContent = 'Failed to check status';
      if (initGitBtn) initGitBtn.disabled = false;
    }
  }

async function fetchRemoteStatus() {
    if (!currentProject.path) return;
    try {
      const url = `/api/projects/git-remote-status?projectPath=${encodeURIComponent(currentProject.path)}&branch=main`;
      const data = await callApi(url);

      if (!data.ok) {
        if (remoteStatusLabel) {
          remoteStatusLabel.textContent = 'Remote status unavailable: ' + (data.error || 'unknown');
          remoteStatusLabel.className = 'ga-hint ga-hint-warn';
        }
        return;
      }

      if (data.status === 'no_remote') {
        if (remoteStatusLabel) {
          remoteStatusLabel.textContent = 'No remote configured for this project';
          remoteStatusLabel.className = 'ga-hint';
        }
        if (pullLatestBtn) pullLatestBtn.hidden = true;
        if (commitPushBtn) commitPushBtn.disabled = false;
        if (pushHint) pushHint.textContent = '';
        return;
      }

      // Handle no_commits / no_local_branch / no_initial_commit â€” fresh repo, allow push
      if (data.status === 'no_commits' || data.status === 'no_local_branch' || data.status === 'no_initial_commit' || data.status === 'no_remote_branch') {
        if (remoteStatusLabel) {
          remoteStatusLabel.textContent = 'No commits yet. Make your first commit & push.';
          remoteStatusLabel.className = 'ga-hint';
        }
        if (pullLatestBtn) pullLatestBtn.hidden = true;
        if (commitPushBtn) commitPushBtn.disabled = false;
        if (pushHint) pushHint.textContent = '';
        return;
      }

      // Show last commit info
      const ts = data.last_commit_at ? new Date(data.last_commit_at).toLocaleString() : '';
      const by = data.last_commit_author ? ' by ' + data.last_commit_author : '';
      const msg = data.last_commit_message ? ' â€” "' + data.last_commit_message + '"' : '';
      const lastCommit = ts ? `Remote last commit: ${ts}${by}${msg}` : '';

      const isBehindOrDiverged = data.status === 'behind' || data.status === 'diverged';

      if (data.status === 'up_to_date') {
        if (remoteStatusLabel) {
          remoteStatusLabel.textContent = 'âœ“ Local is up to date with remote. ' + lastCommit;
          remoteStatusLabel.className = 'ga-hint ga-hint-ok';
        }
        if (pullLatestBtn) { pullLatestBtn.hidden = true; pullLatestBtn.disabled = true; }
        if (commitPushBtn) commitPushBtn.disabled = false;
        if (pushHint) pushHint.textContent = '';
      } else if (data.status === 'ahead') {
        if (remoteStatusLabel) {
          remoteStatusLabel.textContent = `Your local is ahead by ${data.ahead} commit(s). Ready to push. ` + lastCommit;
          remoteStatusLabel.className = 'ga-hint ga-hint-ok';
        }
        if (pullLatestBtn) { pullLatestBtn.hidden = true; pullLatestBtn.disabled = true; }
        if (commitPushBtn) commitPushBtn.disabled = false;
        if (pushHint) pushHint.textContent = '';
      } else if (isBehindOrDiverged) {
        const detail = data.status === 'diverged'
          ? `Diverged â€” remote has ${data.behind} commit(s), local has ${data.ahead} commit(s)`
          : `Remote is ahead by ${data.behind} commit(s)`;
        if (remoteStatusLabel) {
          remoteStatusLabel.textContent = 'âš  ' + detail + '. ' + lastCommit;
          remoteStatusLabel.className = 'ga-hint ga-hint-warn';
        }
        if (pullLatestBtn) {
          pullLatestBtn.hidden = false;
          pullLatestBtn.disabled = false;
        }
        if (commitPushBtn) commitPushBtn.disabled = true;
        if (pushHint) {
          pushHint.textContent = 'Please pull the latest code before push';
          pushHint.className = 'ga-hint ga-hint-warn';
        }
      }
    } catch (err) {
      console.error('git-remote-status failed', err);
      if (remoteStatusLabel) {
        remoteStatusLabel.textContent = 'Failed to check remote status';
        remoteStatusLabel.className = 'ga-hint ga-hint-warn';
      }
    }
  }


  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.project-git-actions');
    if (!btn) return;
    event.preventDefault();
    openModal({
      path: btn.dataset.projectPath || '',
      name: btn.dataset.projectName || '',
      jenkinsJobName: btn.dataset.jenkinsJobName || '',
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  if (initGitBtn) {
    initGitBtn.addEventListener('click', async () => {
      if (!currentProject.path) return;
      initGitBtn.disabled = true;
      const originalText = initGitBtn.textContent;
      initGitBtn.textContent = 'Initializing...';
      try {
        const ghInput = document.getElementById('gaGithubUrlInput');
        const githubUrl = (ghInput && !ghInput.disabled) ? (ghInput.value || '').trim() : '';
        const data = await callApi('/api/projects/git-init', {
          method: 'POST',
          body: JSON.stringify({ projectPath: currentProject.path, githubUrl }),
        });
        if (data.ok) {
          if (gitStatusLabel) {
            gitStatusLabel.textContent = 'Git initialized';
            gitStatusLabel.className = 'ga-hint ga-hint-ok';
          }
        } else {
          throw new Error(data.detail || data.error || 'Init failed');
        }
      } catch (err) {
        console.error('git-init failed', err);
        if (gitStatusLabel) {
          gitStatusLabel.textContent = 'Failed: ' + err.message;
          gitStatusLabel.className = 'ga-hint ga-hint-warn';
        }
        initGitBtn.disabled = false;
      } finally {
        initGitBtn.textContent = originalText;
      }
    });
  }

  if (pullLatestBtn) {
    pullLatestBtn.addEventListener('click', async () => {
      if (!currentProject.path) return;
      pullLatestBtn.disabled = true;
      const originalText = pullLatestBtn.textContent;
      pullLatestBtn.textContent = 'Pulling...';
      try {
        const data = await callApi('/api/projects/git-pull-latest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: currentProject.path, branch: 'main' }),
        });
        if (!data.ok) {
          const errMsg = data.detail || data.error || data.hint || 'unknown error';
          if (remoteStatusLabel) {
            remoteStatusLabel.textContent = 'âœ— Pull failed: ' + errMsg;
            remoteStatusLabel.className = 'ga-hint';
            remoteStatusLabel.style.color = '#b91c1c';
          }
          pullLatestBtn.disabled = false;
          pullLatestBtn.textContent = originalText;
          return;
        }
        // Pull succeeded: enable Commit & Push, disable Pull, hide warning
        if (remoteStatusLabel) {
          remoteStatusLabel.textContent = 'âœ“ Pulled latest code. Ready to commit & push.';
          remoteStatusLabel.className = 'ga-hint ga-hint-ok';
        }
        pullLatestBtn.textContent = 'Pulled âœ“';
        pullLatestBtn.disabled = true;
        if (commitPushBtn) commitPushBtn.disabled = false;
        if (pushHint) {
          pushHint.textContent = '';
          pushHint.className = 'ga-hint';
        }
        setTimeout(() => {
          if (pullLatestBtn) {
            pullLatestBtn.hidden = true;
            pullLatestBtn.textContent = originalText;
          }
        }, 1500);
      } catch (err) {
        if (remoteStatusLabel) {
          remoteStatusLabel.textContent = 'âœ— Pull failed: ' + (err.message || err);
          remoteStatusLabel.className = 'ga-hint';
          remoteStatusLabel.style.color = '#b91c1c';
        }
        pullLatestBtn.disabled = false;
        pullLatestBtn.textContent = originalText;
      }
    });
  }

  if (commitPushBtn) {
    commitPushBtn.addEventListener('click', async () => {
      if (!currentProject.path) return;
      const commitMessage = (commitMessageInput?.value || '').trim();
      if (!commitMessage) {
        alert('Please enter a commit message');
        return;
      }
      commitPushBtn.disabled = true;
      const originalText = commitPushBtn.textContent;
      commitPushBtn.textContent = 'Pushing...';
      try {
        // Use the safe-push endpoint (will refuse if remote is ahead)
        const data = await callApi('/api/projects/git-safe-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: currentProject.path,
            commitMessage,
            branch: 'main',
          }),
        });
        if (!data.ok) {
          alert('Push failed: ' + (data.detail || data.error || data.hint || 'unknown error'));
          // Re-check remote status to refresh UI
          await fetchRemoteStatus();
        } else {
          commitPushBtn.textContent = 'Pushed âœ“';
          // Refresh status
          setTimeout(async () => {
            await fetchRemoteStatus();
            commitPushBtn.textContent = originalText;
          }, 1500);
        }
      } catch (err) {
        alert('Push failed: ' + err.message);
      } finally {
        if (commitPushBtn.textContent === 'Pushing...') {
          commitPushBtn.textContent = originalText;
        }
        commitPushBtn.disabled = false;
      }
    });
  }

 if (createJobBtn) {
    // Find or create a status element next to the button
    function getJenkinsStatusEl() {
      let el = document.getElementById('jenkinsCreateStatus');
      if (!el && createJobBtn.parentNode) {
        el = document.createElement('div');
        el.id = 'jenkinsCreateStatus';
        el.className = 'ga-hint';
        el.style.marginTop = '6px';
        el.style.fontSize = '13px';
        createJobBtn.parentNode.insertBefore(el, createJobBtn.nextSibling);
      }
      return el;
    }

    function setJenkinsCreateStatus(message, type) {
      const el = getJenkinsStatusEl();
      if (!el) return;
      el.textContent = message || '';
      // Use the same color cues as Git status (green/red)
      el.style.color = type === 'error' ? '#b91c1c' : (type === 'success' ? '#15803d' : '');
    }

    createJobBtn.addEventListener('click', async () => {
      if (!currentProject.path) return;
      const jobName = (jenkinsJobInput?.value || '').trim();
      if (!jobName) {
        setJenkinsCreateStatus('Please enter a Jenkins job name.', 'error');
        return;
      }
      setJenkinsCreateStatus('');
      createJobBtn.disabled = true;
      const originalText = createJobBtn.textContent;
      createJobBtn.textContent = 'Creating...';
      try {
        const data = await callApi('/api/jenkins/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: currentProject.path,
            jobName,
            jenkinsfilePath: 'Jenkinsfile',
          }),
        });
        if (!data.ok) {
          const msg = data.detail || data.error || 'unknown error';
          setJenkinsCreateStatus(msg, 'error');
          createJobBtn.textContent = originalText;
        } else {
          setJenkinsCreateStatus(`Job '${jobName}' created successfully.`, 'success');
          createJobBtn.textContent = 'Created';
          setTimeout(() => { createJobBtn.textContent = originalText; }, 1500);
        }
      } catch (err) {
        setJenkinsCreateStatus('Create Job failed: ' + (err.message || err), 'error');
        createJobBtn.textContent = originalText;
      } finally {
        createJobBtn.disabled = false;
      }
    });
  }

  function wireJenkinsRunButton(btn, testType) {
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!currentProject.path) return;
      const jobName = (jenkinsJobInput?.value || '').trim();
      if (!jobName) {
        setJenkinsCreateStatus('Please enter a Jenkins job name.', 'error');
        return;
      }
      setJenkinsCreateStatus('');
      removeJenkinsReportButtons();
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'Running...';
      try {
        const data = await callApi('/api/jenkins/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: currentProject.path,
            jobName,
            testType,
            browser: 'chromium',
            headed: (jenkinsModeSelect?.value || 'headless') === 'headed',
            execution: jenkinsExecSelect?.value || 'parallel',
          }),
        });
        if (!data.ok) {
          const msg = data.detail || data.error || 'unknown error';
          setJenkinsCreateStatus(`Run ${testType} failed: ${msg}`, 'error');
          btn.textContent = originalText;
          btn.disabled = false;
        } else {
          const runId = data.runId || null;
          window._lastJenkinsRunId = runId;
          setJenkinsCreateStatus(`${testType} build triggered â€” polling Jenkins for completion...`, 'success');
          btn.textContent = 'Running on Jenkins';
          if (runId) {
            pollJenkinsRunStatus(runId, btn, originalText);
          } else {
            setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
          }
        }
      } catch (err) {
        setJenkinsCreateStatus(`Run ${testType} failed: ${err.message || err}`, 'error');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

  function removeJenkinsReportButtons() {
    const wrap = document.getElementById('jenkinsReportsWrap');
    if (wrap) wrap.remove();
  }

  // Called whenever the user switches projects.
  // Removes any stale buttons, then re-renders from cache if the new
  // project has a saved Jenkins run.
  function refreshJenkinsReportButtonsForProject() {
    removeJenkinsReportButtons();
    const projectName = (currentProject && currentProject.name) || '';
    if (!projectName) return;
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem('jenkinsReportButtonsByProject') || '{}'); }
    catch { cache = {}; }
    const saved = cache[projectName];
    if (saved && (saved.jenkins_html_report_url || saved.jenkins_allure_report_url || saved.jenkins_build_url)) {
      showJenkinsReportButtons(saved);
    }
  }

  // Per-project cache of the latest Jenkins run info, keyed by project name.
  // Persisted to localStorage so it survives page reloads.
  const LS_KEY_JENKINS_CACHE = 'jenkinsReportButtonsByProject';
  function _loadJenkinsCache() {
    try { return JSON.parse(localStorage.getItem(LS_KEY_JENKINS_CACHE) || '{}'); }
    catch { return {}; }
  }
  function _saveJenkinsCache(cache) {
    try { localStorage.setItem(LS_KEY_JENKINS_CACHE, JSON.stringify(cache)); } catch {}
  }

  function showJenkinsReportButtons(info) {
    removeJenkinsReportButtons();
    const statusEl = document.getElementById('jenkinsCreateStatus');
    if (!statusEl || !statusEl.parentNode) return;

    // Determine which project this run belongs to.
    // Prefer the current active project's name; fall back to jenkins_job_name.
    const projectName = (currentProject && currentProject.name) || info.jenkins_job_name || '';

    // Cache it so switching to this project later re-shows the buttons.
    if (projectName) {
      const cache = _loadJenkinsCache();
      cache[projectName] = {
        jenkins_html_report_url: info.jenkins_html_report_url || null,
        jenkins_allure_report_url: info.jenkins_allure_report_url || null,
        jenkins_build_url: info.jenkins_build_url || null,
        run_id: info.run_id || null,
      };
      _saveJenkinsCache(cache);
    }

    const wrap = document.createElement('div');
    wrap.id = 'jenkinsReportsWrap';
    wrap.dataset.projectName = projectName;
    wrap.style.marginTop = '10px';
    wrap.style.display = 'flex';
    wrap.style.gap = '8px';
    wrap.style.flexWrap = 'wrap';

    if (info.jenkins_html_report_url) {
      const a = document.createElement('a');
      a.href = info.jenkins_html_report_url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'button button-secondary';
      a.textContent = 'View HTML Report';
      wrap.appendChild(a);
    }
    if (info.jenkins_allure_report_url) {
      const a = document.createElement('a');
      a.href = info.jenkins_allure_report_url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'button button-secondary';
      a.textContent = 'View Allure Report';
      wrap.appendChild(a);
    }
    if (info.jenkins_build_url) {
      const a = document.createElement('a');
      a.href = info.jenkins_build_url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'button button-secondary';
      a.textContent = 'View Jenkins Build';
      wrap.appendChild(a);
    }

    statusEl.parentNode.insertBefore(wrap, statusEl.nextSibling);
  }

  // WebSocket-based Jenkins run watcher (replaces the old polling loop).
  // Connects to /api/jenkins/watch/{run_id} and waits for one 'done' message,
  // then shows the report buttons. Falls back to a one-time REST fetch if WS fails.
  async function pollJenkinsRunStatus(runId, btn, originalText) {
    const resetBtn = () => {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    };

    const finalize = (data) => {
      const status = (data.status || '').toLowerCase();
      if (status === 'passed') {
        setJenkinsCreateStatus('Build PASSED on Jenkins.', 'success');
      } else {
        setJenkinsCreateStatus('Build FAILED on Jenkins.', 'error');
      }
      showJenkinsReportButtons(data);
      resetBtn();
    };

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${location.host}/api/jenkins/watch/${encodeURIComponent(runId)}`;

    try {
      const ws = new WebSocket(wsUrl);
      let gotDone = false;

      ws.onopen = () => {
        setJenkinsCreateStatus(`Build in progress on Jenkins... (run_id ${runId.slice(0,8)})`, 'success');
      };

      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          if (m.type === 'progress') {
            setJenkinsCreateStatus(`Build in progress on Jenkins... (${m.status || 'running'})`, 'success');
          } else if (m.type === 'done') {
            gotDone = true;
            finalize(m);
            ws.close();
          } else if (m.type === 'timeout') {
            setJenkinsCreateStatus('Watch timed out. Check Jenkins directly.', 'error');
            resetBtn();
            ws.close();
          } else if (m.type === 'error') {
            setJenkinsCreateStatus('Watch error: ' + (m.message || 'unknown'), 'error');
            resetBtn();
            ws.close();
          }
        } catch (e) {
          console.warn('jenkins-watch: bad message', ev.data);
        }
      };

      ws.onerror = () => {
        console.error('jenkins-watch WebSocket error - falling back to REST fetch');
      };

      ws.onclose = async () => {
        if (gotDone) return;
        // Fallback: do a single GET in case WS closed prematurely
        try {
          const data = await callApi(`/api/jenkins/run/${encodeURIComponent(runId)}`);
          if (data.ok && ['passed', 'failed'].includes((data.status || '').toLowerCase())) {
            finalize(data);
          } else {
            setJenkinsCreateStatus('Connection lost. Refresh to see final status.', 'error');
            resetBtn();
          }
        } catch (e) {
          resetBtn();
        }
      };
    } catch (e) {
      console.error('jenkins-watch: failed to open WebSocket', e);
      resetBtn();
    }
  }
  wireJenkinsRunButton(jenkinsRunSanityBtn, 'sanity');
  wireJenkinsRunButton(jenkinsRunRegressionBtn, 'regression');
});

// =====================================================================
// HEAL & RERUN FAILED â€” suite-level heal rerun (Run Sanity/Regression)
// =====================================================================

let _healRerunBtn = null;
let _healRerunShowDetailsBtn = null;
let _lastHealRerunRunId = null;
let _lastHealRerunEventCount = 0;

function removeHealRerunButton() {
  if (_healRerunBtn) {
    _healRerunBtn.remove();
    _healRerunBtn = null;
  }
  if (_healRerunShowDetailsBtn) {
    _healRerunShowDetailsBtn.remove();
    _healRerunShowDetailsBtn = null;
  }
}

function renderHealRerunButton({ projectPath, reportJsonPath, headed, execution }) {
  removeHealRerunButton();

  // Attach below the result panel (use resultEl's parent)
  const resultPanel = (typeof resultEl !== 'undefined') ? resultEl : document.getElementById('result');
  if (!resultPanel || !resultPanel.parentNode) return;

  const wrap = document.createElement('div');
  wrap.id = 'heal-rerun-actions';
  wrap.style.marginTop = '12px';
  wrap.style.display = 'flex';
  wrap.style.gap = '8px';
  wrap.style.alignItems = 'center';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'button button-primary';
  btn.textContent = '🩹 Heal & Rerun Failed';
  btn.addEventListener('click', () => {
    triggerHealRerun({ projectPath, reportJsonPath, headed, execution, btn });
  });
  wrap.appendChild(btn);
  _healRerunBtn = wrap;

  resultPanel.parentNode.insertBefore(wrap, resultPanel.nextSibling);
}

function showHealRerunDetailsButton() {
  if (_healRerunShowDetailsBtn) return;
  if (!_healRerunBtn) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'button button-secondary';
  btn.textContent = 'ðŸ‘ Show Healed Elements';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Loading...';
    try {
      const data = await callApi('/api/heal-events', { run_id: _lastHealRerunRunId || '' });
      const events = (data && data.events) || [];
      openHealedElementsModal(events);
    } catch (e) {
      openHealedElementsModal([]);
      console.error('heal-events fetch failed', e);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
  _healRerunBtn.appendChild(btn);
  _healRerunShowDetailsBtn = btn;
}

async function triggerHealRerun({ projectPath, reportJsonPath, headed, execution, btn }) {
  if (btn) { btn.disabled = true; btn.textContent = 'ðŸ©¹ Running heal rerun...'; }
  setStatus('running', 'Heal Rerun');

  const logLines = [];
  const payload = { projectPath, reportJsonPath, headed, execution };

  return new Promise((resolve) => {
    const socket = new WebSocket(wsUrl('/api/project/heal-rerun'));
    socket.onopen = () => socket.send(JSON.stringify(payload));

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'log') {
          if (msg.line) logLines.push(msg.line);
          showResult({ ok: true, type: 'log', logs: logLines.slice(-200), section: 'Heal Rerun' });
          return;
        }
        if (msg.type === 'done') {
          setStatus(msg.ok ? 'success' : 'error', msg.ok ? 'Heal Rerun OK' : 'Heal Rerun Failed');
          _lastHealRerunRunId = msg.runId || null;
          _lastHealRerunEventCount = Number(msg.healEventCount || 0);

          showResult({
            section: 'Heal Rerun',
            ok: msg.ok,
            message: msg.message,
            healedFiles: msg.healedFiles,
            summary: msg.summary,
            healEventCount: _lastHealRerunEventCount,
            logs: logLines,
          });

          if (_lastHealRerunRunId && _lastHealRerunEventCount > 0) {
            showHealRerunDetailsButton();
          }

          if (btn) { btn.disabled = false; btn.textContent = 'ðŸ©¹ Heal & Rerun Failed'; }
          socket.close();
          resolve(msg);
          return;
        }
        if (msg.type === 'error') {
          setStatus('error', 'Heal Rerun Failed');
          showResult({ ok: false, error: msg.message, logs: logLines });
          if (btn) { btn.disabled = false; btn.textContent = 'ðŸ©¹ Heal & Rerun Failed'; }
          socket.close();
          resolve(msg);
        }
      } catch (e) {
        console.error('heal-rerun parse error', e);
      }
    };

    socket.onerror = () => {
      setStatus('error', 'Heal Rerun Failed');
      showResult({ ok: false, error: 'WebSocket connection failed.' });
      if (btn) { btn.disabled = false; btn.textContent = 'ðŸ©¹ Heal & Rerun Failed'; }
      resolve(null);
    };
  });
}

function openHealedElementsModal(events) {
  const existing = document.getElementById('healed-elements-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'healed-elements-modal';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.5)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  const card = document.createElement('div');
  card.style.background = 'white';
  card.style.borderRadius = '12px';
  card.style.padding = '20px';
  card.style.minWidth = '720px';
  card.style.maxWidth = '95vw';
  card.style.maxHeight = '85vh';
  card.style.overflowY = 'auto';
  card.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';

  const title = document.createElement('h3');
  title.textContent = 'Healed Elements';
  title.style.marginTop = '0';
  card.appendChild(title);

  if (!events || events.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No heal events recorded for this run.';
    card.appendChild(p);
  } else {
    // Group events by execution (so each test_case appears once with its steps)
    const grouped = new Map();
    for (const ev of events) {
      const key = ev.execution_id || 'no-exec';
      if (!grouped.has(key)) {
        grouped.set(key, {
          test_case_key: ev.test_case_key,
          test_name: ev.test_name,
          spec_relpath: ev.spec_relpath,
          execution_status: ev.execution_status,
          steps: [],
        });
      }
      grouped.get(key).steps.push(ev);
    }

    for (const [, group] of grouped) {
      const groupBox = document.createElement('div');
      groupBox.style.marginTop = '16px';
      groupBox.style.padding = '12px';
      groupBox.style.border = '1px solid #e5e5e5';
      groupBox.style.borderRadius = '8px';
      groupBox.style.background = '#fafafa';

      const header = document.createElement('div');
      header.style.fontWeight = '600';
      header.style.marginBottom = '8px';
      header.innerHTML = `
        ${escapeHtml(group.test_case_key || 'TC-?')} â€” ${escapeHtml(group.test_name || 'Test')}
        <span style="font-weight: normal; color: #666; margin-left: 8px;">
          [${escapeHtml(group.execution_status || 'unknown')}]
        </span>
      `;
      groupBox.appendChild(header);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '13px';

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="background: #f0f0f0;">
          <th style="text-align: left; padding: 6px; border-bottom: 1px solid #ddd;">Step</th>
          <th style="text-align: left; padding: 6px; border-bottom: 1px solid #ddd;">Action</th>
          <th style="text-align: left; padding: 6px; border-bottom: 1px solid #ddd;">Original Locator</th>
          <th style="text-align: left; padding: 6px; border-bottom: 1px solid #ddd;">Healed Locator</th>
          <th style="text-align: left; padding: 6px; border-bottom: 1px solid #ddd;">Status</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const step of group.steps) {
        const tr = document.createElement('tr');
        tr.style.background = step.status === 'healed' ? '#f0fdf4' : '#fff7ed';
        tr.innerHTML = `
          <td style="padding: 6px; border-bottom: 1px solid #eee; vertical-align: top;">${escapeHtml(step.step_label || '')}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; vertical-align: top;">${escapeHtml(step.action || '')}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; vertical-align: top; font-family: monospace; word-break: break-all;">${escapeHtml(step.original_locator || '')}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; vertical-align: top; font-family: monospace; word-break: break-all;">
            ${escapeHtml(step.healed_locator || '')}
            ${step.healed_description ? `<div style="color:#666; font-family: sans-serif; margin-top:4px;">${escapeHtml(step.healed_description)}</div>` : ''}
          </td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; vertical-align: top;">
            <span style="padding: 2px 8px; border-radius: 12px; font-size: 11px; background: ${step.status === 'healed' ? '#22c55e' : '#ef4444'}; color: white;">
              ${escapeHtml(step.status || 'unknown')}
            </span>
          </td>
        `;
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      groupBox.appendChild(table);
      card.appendChild(groupBox);
    }
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'button button-secondary';
  close.textContent = 'Close';
  close.style.marginTop = '16px';
  close.addEventListener('click', () => overlay.remove());
  card.appendChild(close);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function formatFakerFieldValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function renderProjectFakerFields(project) {
  const fields = Array.isArray(project?.testDataFields) ? project.testDataFields : [];
  const selectedCount = fields.filter((field) => field?.selected || field?.mode === 'fake').length;
  const confirmationState = selectedCount > 0 ? 'Ready to continue' : 'No random fields selected';
  if (!fields.length) {
    return '<div class="artifact-summary">No test-data.json file found yet.</div>';
  }

  const items = fields.map((field) => {
    const fieldKey = field.key || '';
    const isChecked = Boolean(field?.selected || field?.mode === 'fake');
    return `
      <div class="project-faker-field">
        <div class="project-faker-field-copy">
          <strong>${escapeHtml(fieldKey)}</strong>
        </div>
        <label class="project-faker-mode project-faker-toggle">
          <input class="project-faker-mode-select" type="checkbox" data-project-path="${escapeHtml(project.path || '')}" data-field-key="${escapeHtml(fieldKey)}"${isChecked ? ' checked' : ''} />
        </label>
      </div>
    `;
  }).join('');

  return `
    <details class="project-faker-panel project-code-panel" data-project-path="${escapeHtml(project.path || '')}" data-dirty="false" data-confirmed="false">
      <summary>
        Random Fields
        <span class="project-faker-count">${selectedCount} of ${fields.length} selected</span>
      </summary>
      <div class="project-faker-fields" data-selected-count="${selectedCount}" data-total-count="${fields.length}">
        ${items}
      </div>
      <div class="project-faker-actions">
        <span class="project-faker-hint">Check a field to use faker data for it, then confirm and continue.</span>
        <span class="project-faker-status" data-project-faker-status="${escapeHtml(confirmationState)}">${escapeHtml(confirmationState)}</span>
        <button class="button button-primary project-faker-save project-faker-confirm" type="button" data-project-path="${escapeHtml(project.path || '')}"${selectedCount > 0 ? '' : ' disabled'}>Confirm &amp; Continue</button>
      </div>
    </details>
  `;
}
function updateProjectFakerSummary(panel) {
  if (!panel) return;
  const selectedCount = Array.from(panel.querySelectorAll('.project-faker-mode-select'))
    .filter((select) => select.checked).length;
  const totalCount = panel.querySelectorAll('.project-faker-mode-select').length;
  const summary = panel.querySelector('.project-faker-count');
  if (summary) {
    summary.textContent = `${selectedCount} of ${totalCount} selected`;
  }
  const status = panel.querySelector('.project-faker-status');
  if (status) {
    if (panel.dataset.dirty === 'true') {
      status.textContent = 'Unsaved changes';
    } else if (panel.dataset.confirmed === 'true') {
      status.textContent = 'Confirmed';
    } else if (selectedCount > 0) {
      status.textContent = 'Ready to continue';
    } else {
      status.textContent = 'No random fields selected';
    }
  }
  const fieldWrap = panel.querySelector('.project-faker-fields');
  if (fieldWrap) {
    fieldWrap.dataset.selectedCount = String(selectedCount);
    fieldWrap.dataset.totalCount = String(totalCount);
  }
  const confirmButton = panel.querySelector('.project-faker-confirm');
  if (confirmButton) {
    confirmButton.disabled = selectedCount === 0;
  }
}

function getSelectedProjectFakerFieldModes(panel) {
  if (!panel) return [];
  return Array.from(panel.querySelectorAll('.project-faker-mode-select'))
    .reduce((acc, select) => {
      const fieldKey = String(select.dataset.fieldKey || '').trim();
      if (!fieldKey || !select.checked) {
        return acc;
      }
      acc[fieldKey] = 'fake';
      return acc;
    }, {});
}

async function saveProjectFakerFields(panel) {
  if (!panel) return null;
  const projectPath = String(panel.dataset.projectPath || '').trim();
  if (!projectPath) {
    showResult({ ok: false, error: 'Project path is missing.' });
    setStatus('error', 'Save Failed');
    return null;
  }

  const payload = {
    projectPath,
    fields: getSelectedProjectFakerFieldModes(panel),
  };

  setStatus('running', 'Confirming Random Fields');
  try {
    const response = await callApi('/api/projects/faker-fields', {
      method: 'POST',
      body: JSON.stringify(payload),
      silent: true,
    });

    if (!response?.ok) {
      const message = response?.error || response?.detail || 'Unable to save faker field selections.';
      showResult({ ok: false, error: message, payload });
      setStatus('error', 'Save Failed');
      return response;
    }

    panel.dataset.dirty = 'false';
    panel.dataset.confirmed = 'true';
    updateProjectFakerSummary(panel);
    showResult({
      ok: true,
      message: response.message || 'Faker field selections confirmed.',
      projectPath,
      fields: response.fakerFields || Object.keys(payload.fields),
      fakerFieldModes: response.fakerFieldModes || payload.fields,
    });
    setStatus('success', 'Random Fields Confirmed');
    return response;
  } catch (error) {
    const message = error?.message || String(error) || 'Unable to save faker field selections.';
    showResult({ ok: false, error: message, payload });
    setStatus('error', 'Save Failed');
    return null;
  }
}

function markProjectFakerDirty(panel) {
  if (!panel) return;
  panel.dataset.dirty = 'true';
  panel.dataset.confirmed = 'false';
  updateProjectFakerSummary(panel);
}

function requireConfirmedProjectFaker(panel) {
  if (!panel) return true;
  if (panel.dataset.dirty === 'true') {
    panel.open = true;
    showResult({
      ok: false,
      error: 'Confirm the Random Fields selection before using Sanity or Regression.',
      projectPath: panel.dataset.projectPath || '',
    });
    setStatus('error', 'Confirm Random Fields');
    return false;
  }
  return true;
}

function initNewStepSuggester(deps) {
  const popupEl = deps.popupEl;
  const titleEl = deps.titleEl;
  const metaEl = deps.metaEl;
  const bodyEl = deps.bodyEl;
  const modeToggleEl = deps.modeToggleEl;
  const panelLabelEl = deps.panelLabelEl;
  const escapeHtml = deps.escapeHtml;
  const insertIntoScript = deps.insertIntoScript;
  const reopenPopupForContext = deps.reopenPopupForContext;
  const getContext = deps.getContext;
  const callApiFn = deps.callApi;

  const state = {
    mode: 'chooser',
    stepCategory: 'inputs',
    stepHint: '',
    stepAppliedHint: '',
    header: { sourceLabel: 'Script', lineNumber: 1, lineText: '' },
    assertionSuggestions: [],
    stepSuggestions: [],
    assertionLoading: false,
    stepLoading: false,
    stepMessage: '',
  };
  let stepRequestSeq = 0;

  function getContextScriptText(context) {
    return String(
      context?.scriptText
      || context?.preEl?.dataset?.scriptRawText
      || context?.preEl?.dataset?.scriptText
      || context?.preEl?.textContent
      || ''
    );
  }

  function getResultForLine(results, lineNumber) {
    const items = Array.isArray(results) ? results : [];
    if (!items.length) return null;
    const targetLine = Number(lineNumber || 0);
    if (!Number.isFinite(targetLine) || targetLine <= 0) {
      return null;
    }
    return items.find((item) => Number(item?.lineNumber || 0) === targetLine) || null;
  }

  function renderHeader() {
    if (titleEl) titleEl.textContent = `${state.header.sourceLabel} | Line ${state.header.lineNumber}`;
    if (metaEl) metaEl.textContent = state.header.lineText || '';
  }

  function renderModeToggle() {
    if (panelLabelEl) {
      panelLabelEl.textContent = state.mode === 'steps' ? 'Steps' : state.mode === 'assertions' ? 'Assertions' : 'Choose action';
    }
    if (modeToggleEl) {
      modeToggleEl.hidden = state.mode === 'chooser';
      modeToggleEl.textContent = 'Back';
    }
  }

  function syncPopupMode() {
    if (popupEl) popupEl.dataset.mode = state.mode;
  }

  function renderLoading(message) {
    if (bodyEl) bodyEl.innerHTML = `<div class="artifact-summary">${escapeHtml(message)}</div>`;
  }

  function renderChooser() {
    if (!bodyEl) return;
    bodyEl.innerHTML = `
      <div class="assertion-popup-choice-grid">
        <button class="button button-primary assertion-popup-choice-button" type="button" data-mode="assertions">Add assertions</button>
        <button class="button button-secondary assertion-popup-choice-button" type="button" data-mode="steps">Add new step</button>
      </div>
    `;
  }

  function renderAssertions() {
    if (!bodyEl) return;
    const items = Array.isArray(state.assertionSuggestions) ? state.assertionSuggestions : [];
    if (state.assertionLoading) {
      renderLoading('Fetching assertion suggestions...');
      return;
    }
    if (!items.length) {
      bodyEl.innerHTML = '<div class="artifact-summary">No suggestions found for this step.</div>';
      return;
    }
    bodyEl.innerHTML = items.map((item) => `
      <article class="assertion-popup-card">
        <div class="assertion-card-head">
          <span class="assertion-card-label">${escapeHtml(item.label || item.type || 'Suggestion')}</span>
          <span class="assertion-card-confidence">${escapeHtml(item.confidence || 'unknown')}</span>
        </div>
        <div class="hint">${escapeHtml(item.description || '')}</div>
        <code>${escapeHtml(item.code || '')}</code>
        <div class="assertion-popup-actions">
          <button class="button button-primary assertion-insert-button" type="button" data-insert-code="${escapeHtml(item.code || '')}">Add to script</button>
        </div>
      </article>
    `).join('');
  }

  function renderSteps() {
    if (!bodyEl) return;
    const currentCategory = getNewStepSuggesterCategory(state.stepCategory);
    const categoriesHtml = NEW_STEP_SUGGESTER_CATEGORIES
      .map((category) => `<option value="${escapeHtml(category.value)}"${category.value === currentCategory.value ? ' selected' : ''}>${escapeHtml(category.label)}</option>`)
      .join('');
    const hintValue = String(state.stepHint || '');
    const hintMessage = state.stepAppliedHint
      ? 'Suggestions are matched to your applied reference text and step group.'
      : 'Optionally type a short step reference and click Apply to customize the suggestions.';
    const items = Array.isArray(state.stepSuggestions) ? state.stepSuggestions : [];

    if (state.stepLoading) {
      bodyEl.innerHTML = `
        <div class="assertion-popup-step-toolbar">
          <label class="assertion-popup-step-label" for="assertion-popup-step-hint">Step reference</label>
          <div class="assertion-popup-step-input-row">
            <input id="assertion-popup-step-hint" class="assertion-popup-step-input" type="text" value="${escapeHtml(hintValue)}" placeholder="e.g. login button, email field, upload file" autocomplete="off" />
            <button id="assertion-popup-step-refresh" class="button button-secondary assertion-popup-step-refresh" type="button">Apply</button>
          </div>
          <label class="assertion-popup-step-label" for="assertion-popup-step-category">Step group</label>
          <select id="assertion-popup-step-category" class="assertion-popup-step-select">${categoriesHtml}</select>
          <div class="hint assertion-popup-step-hint">Loading step suggestions...</div>
        </div>
        <div class="artifact-summary">Fetching new step suggestions...</div>
      `;
      syncStepToolbarControls(currentCategory, hintValue);
      return;
    }

    bodyEl.innerHTML = `
      <div class="assertion-popup-step-toolbar">
        <label class="assertion-popup-step-label" for="assertion-popup-step-hint">Step reference (optional)</label>
        <div class="assertion-popup-step-input-row">
          <input id="assertion-popup-step-hint" class="assertion-popup-step-input" type="text" value="${escapeHtml(hintValue)}" placeholder="e.g. login button, email field, upload file" autocomplete="off" />
          <button id="assertion-popup-step-refresh" class="button button-secondary assertion-popup-step-refresh" type="button">Apply</button>
        </div>
        <label class="assertion-popup-step-label" for="assertion-popup-step-category">Step group</label>
        <select id="assertion-popup-step-category" class="assertion-popup-step-select">${categoriesHtml}</select>
        <div class="hint assertion-popup-step-hint">${escapeHtml(hintMessage)}</div>
      </div>
      ${state.stepMessage ? `<div class="artifact-summary">${escapeHtml(state.stepMessage)}</div>` : ''}
      <div class="assertion-popup-step-grid">
        ${
          items.length
            ? items.map((option) => `
                <article class="assertion-popup-card assertion-step-card" data-insert-code="${escapeHtml(option.code || '')}">
                  <div class="assertion-card-head">
                    <span class="assertion-card-label">${escapeHtml(option.label || 'Step')}</span>
                    <span class="assertion-card-confidence">${escapeHtml(option.confidence || 'low')}</span>
                  </div>
                  <div class="hint">${escapeHtml(option.description || '')}</div>
                  <code>${escapeHtml(option.code || '')}</code>
                  <div class="assertion-popup-actions">
                    <button class="button button-primary assertion-step-insert-button" type="button" data-insert-code="${escapeHtml(option.code || '')}">Add step</button>
                  </div>
                </article>
              `).join('')
            : '<div class="artifact-summary">No step suggestions found for this category.</div>'
        }
      </div>
    `;
    syncStepToolbarControls(currentCategory, hintValue);
  }

  function syncStepToolbarControls(currentCategory, hintValue) {
    const stepCategoryEl = bodyEl?.querySelector('#assertion-popup-step-category');
    const stepHintEl = bodyEl?.querySelector('#assertion-popup-step-hint');
    const refreshButtonEl = bodyEl?.querySelector('#assertion-popup-step-refresh');
    if (stepCategoryEl) {
      stepCategoryEl.value = currentCategory.value;
      stepCategoryEl.onchange = (event) => {
        state.stepCategory = getNewStepSuggesterCategory(String(event.target.value || '')).value;
        state.stepAppliedHint = String(state.stepHint || '').trim();
        if (state.mode === 'steps') {
          void loadStepSuggestions({ category: state.stepCategory, hintText: state.stepHint });
        } else {
          render();
        }
      };
    }
    if (stepHintEl) {
      stepHintEl.value = hintValue;
      stepHintEl.oninput = (event) => {
        state.stepHint = String(event.target.value || '');
      };
    }
    if (refreshButtonEl) {
      refreshButtonEl.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const currentHint = String(stepHintEl?.value || '').trim();
        const currentCategoryValue = getNewStepSuggesterCategory(String(stepCategoryEl?.value || state.stepCategory || '')).value;
        state.stepHint = currentHint;
        state.stepAppliedHint = currentHint;
        state.stepCategory = currentCategoryValue;
        void loadStepSuggestions({ category: currentCategoryValue, hintText: currentHint });
      };
    }
  }

  function render() {
    syncPopupMode();
    renderModeToggle();
    renderHeader();
    if (state.mode === 'steps') {
      renderSteps();
    } else if (state.mode === 'assertions') {
      renderAssertions();
    } else {
      renderChooser();
    }
  }

  function setHeader(sourceLabel, lineNumber, lineText) {
    state.header = { sourceLabel: sourceLabel || 'Script', lineNumber: lineNumber || 1, lineText: lineText || '' };
    renderHeader();
  }

  function setAssertionLoading() {
    state.assertionLoading = true;
    render();
  }

  function setAssertionSuggestions(suggestions) {
    state.assertionLoading = false;
    state.assertionSuggestions = Array.isArray(suggestions) ? suggestions : [];
    if (state.mode === 'assertions') render();
  }

  function setStepSuggestions(suggestions, message = '') {
    state.stepLoading = false;
    state.stepMessage = String(message || '');
    state.stepSuggestions = Array.isArray(suggestions) ? suggestions : [];
    if (state.mode === 'steps') render();
  }

  function show() {
    if (popupEl) popupEl.hidden = false;
  }

  function hide() {
    if (popupEl) popupEl.hidden = true;
    state.mode = 'chooser';
    state.stepCategory = 'inputs';
    state.stepHint = '';
    state.stepAppliedHint = '';
    state.stepLoading = false;
    state.stepMessage = '';
    state.assertionLoading = false;
    state.assertionSuggestions = [];
    state.stepSuggestions = [];
    syncPopupMode();
  }

  async function loadAssertionSuggestions() {
    const context = typeof getContext === 'function' ? getContext() : null;
    const lineNumber = Number(context?.lineNumber || state.header.lineNumber || 1);
    const scriptText = getContextScriptText(context);
    const payload = {
      scriptText,
      line: String(context?.lineText || state.header.lineText || ''),
      lineNumber: Number.isFinite(lineNumber) ? lineNumber - 1 : 0,
      allLines: Array.isArray(context?.allLines) ? context.allLines : [],
    };
    setAssertionLoading();
    try {
      if (typeof callApiFn !== 'function') throw new Error('API client is not ready yet.');
      const response = await callApiFn('/api/assertion-suggestions', { method: 'POST', body: JSON.stringify(payload), silent: true });
      if (!response?.ok) throw new Error(response?.error || response?.detail || 'Failed to load assertion suggestions.');
      const matchedResult = getResultForLine(response.results, lineNumber);
      setAssertionSuggestions(matchedResult?.suggestions || []);
    } catch (error) {
      state.assertionLoading = false;
      state.assertionSuggestions = [];
      render();
      if (bodyEl && popupEl?.hidden === false) {
        bodyEl.innerHTML = `<div class="artifact-summary">${escapeHtml(error.message || String(error))}</div>`;
      }
    }
  }

  async function loadStepSuggestions(options = {}) {
    const context = typeof getContext === 'function' ? getContext() : null;
    const lineNumber = Number(context?.lineNumber || state.header.lineNumber || 1);
    const scriptText = getContextScriptText(context);
    const hintText = String(options.hintText ?? state.stepHint ?? '').trim();
    const categoryValue = getNewStepSuggesterCategory(String(options.category ?? state.stepCategory ?? '')).value;
    const requestSeq = ++stepRequestSeq;
    const payload = {
      scriptText,
      line: String(context?.lineText || state.header.lineText || ''),
      lineNumber: Number.isFinite(lineNumber) ? lineNumber : 1,
      allLines: Array.isArray(context?.allLines) ? context.allLines : [],
      category: categoryValue,
      hintText,
    };
    state.stepLoading = true;
    state.stepMessage = '';
    render();
    try {
      if (typeof callApiFn !== 'function') throw new Error('API client is not ready yet.');
      const response = await callApiFn('/api/new-step-suggestions', { method: 'POST', body: JSON.stringify(payload), silent: true });
      if (!response?.ok) throw new Error(response?.error || response?.detail || 'Failed to load new step suggestions.');
      if (requestSeq !== stepRequestSeq) return;
      const matchedResult = getResultForLine(response.results, lineNumber);
      setStepSuggestions(matchedResult?.suggestions || [], matchedResult?.reason || '');
    } catch (error) {
      if (requestSeq !== stepRequestSeq) return;
      state.stepLoading = false;
      state.stepMessage = error?.message || String(error);
      state.stepSuggestions = [];
      render();
    }
  }

  async function setMode(mode) {
    state.mode = mode === 'steps' ? 'steps' : 'assertions';
    renderModeToggle();
    renderHeader();
    if (state.mode === 'steps') {
      state.stepAppliedHint = '';
      await loadStepSuggestions({ category: state.stepCategory, hintText: state.stepHint });
    } else {
      await loadAssertionSuggestions();
    }
  }

  async function insertCode(code) {
    const context = typeof getContext === 'function' ? getContext() : null;
    if (!context?.preEl || !context.lineNumber || !code) return false;
    const inserted = insertIntoScript(context.preEl, context.lineNumber, code);
    if (!inserted) return false;
    if (state.mode === 'assertions' && typeof reopenPopupForContext === 'function') {
      await reopenPopupForContext(context);
    } else if (state.mode === 'steps') {
      await loadStepSuggestions({ category: state.stepCategory, hintText: state.stepHint });
    }
    return true;
  }

  async function handleDocumentClick(event) {
    const choiceTarget = event.target.closest('.assertion-popup-choice-button');
    if (choiceTarget) {
      await setMode(String(choiceTarget.dataset.mode || 'assertions'));
      return true;
    }
    const modeToggleTarget = event.target.closest('#assertion-popup-mode-toggle');
    if (modeToggleTarget) {
      state.mode = 'chooser';
      state.assertionLoading = false;
      state.stepLoading = false;
      state.stepMessage = '';
      render();
      return true;
    }
    const closeTarget = event.target.closest('#assertion-popup-close');
    if (closeTarget) {
      hide();
      return true;
    }
    const activeInsertTarget = event.target.closest('.assertion-insert-button,.assertion-step-insert-button,.assertion-step-card');
    if (activeInsertTarget) {
      await insertCode(activeInsertTarget.dataset.insertCode || '');
      return true;
    }
    return false;
  }

  const controller = {
    handleDocumentClick,
    setMode,
    show,
    hide,
    setHeader,
    loadAssertionSuggestions,
    loadStepSuggestions,
  };
  window.newStepSuggester = controller;
  return controller;
}

window.initNewStepSuggester = initNewStepSuggester;

document.addEventListener('click', async (event) => {
  if (window.newStepSuggester && await window.newStepSuggester.handleDocumentClick(event)) {
    return;
  }

  const popupTarget = event.target.closest('#assertion-popup');
  const lineEl = event.target.closest('.script-line');
  if (!lineEl || !lineEl.dataset.lineNumber) {
    if (!popupTarget) hideAssertionPopup();
    return;
  }

  const previewEl = lineEl.closest('.script-preview, pre');
  if (!previewEl || previewEl.isContentEditable || previewEl.closest('.project-testdata-panel')) return;

  await openAssertionPopupForLine(previewEl, Number(lineEl.dataset.lineNumber));
});

const NEW_STEP_SUGGESTER_CATEGORIES = [
  { value: 'inputs', label: 'Input Fields' },
  { value: 'choices', label: 'Choices' },
  { value: 'selects', label: 'Dropdowns' },
  { value: 'actions', label: 'Actions' },
];

function getNewStepSuggesterCategory(value) {
  return NEW_STEP_SUGGESTER_CATEGORIES.find((item) => item.value === value) || NEW_STEP_SUGGESTER_CATEGORIES[0];
}

// =====================================================================
// FLAKY TESTS MODAL
// =====================================================================
document.addEventListener('DOMContentLoaded', function setupFlakyTestsModal() {
  console.log('[flaky-init] DOMContentLoaded running...');
  const modal = document.getElementById('flakyTestsModal');
  console.log('[flaky-init] modal element:', modal);
  if (!modal) { console.log('[flaky-init] EXIT: no modal'); return; }
  console.log('[flaky-init] wiring click handler');
  const closeBtn = document.getElementById('flakyModalClose');
  const titleEl = document.getElementById('flakyModalTitle');
  const statusEl = document.getElementById('flakyModalStatus');
  const tbody = document.getElementById('flakyModalTbody');
  const summaryEl = document.getElementById('flakyModalSummary');

  function closeFlakyModal() { modal.hidden = true; }
  if (closeBtn) closeBtn.addEventListener('click', closeFlakyModal);
  modal.addEventListener('click', function(e) { if (e.target === modal) closeFlakyModal(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !modal.hidden) closeFlakyModal();
  });

  function scoreColor(score, totalRuns) {
    if (totalRuns < 3) return '#94a3b8';
    if (score <= 0.05) return '#15803d';
    if (score >= 0.7) return '#b91c1c';
    if (score >= 0.3) return '#d97706';
    return '#ca8a04';
  }

  function fmtDate(iso) {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleString(); }
    catch (e) { return iso; }
  }


  function renderSummary(s) {
    if (!summaryEl) return;
    if (!s) { summaryEl.innerHTML = ''; return; }
    const cards = [
      { label: 'Total Tests', value: s.total_tests, color: '#1e293b', bg: '#f1f5f9' },
      { label: 'Total Runs', value: s.total_runs, color: '#1e293b', bg: '#f1f5f9' },
      { label: 'Flaky', value: s.flaky_count, color: '#d97706', bg: '#fef3c7' },
      { label: 'Failed', value: s.failed_count, color: '#b91c1c', bg: '#fee2e2' },
      { label: 'Stable', value: s.stable_count, color: '#15803d', bg: '#dcfce7' },
      { label: 'Recovering', value: s.recovering_count, color: '#0369a1', bg: '#dbeafe' },
      { label: 'First Run', value: s.first_run_count, color: '#475569', bg: '#e2e8f0' },
    ];
    summaryEl.innerHTML = cards.map(function(c) {
      return '<div style="background:' + c.bg + '; color:' + c.color + '; padding:8px 14px; border-radius:8px; min-width:90px; text-align:center; border: 1px solid rgba(0,0,0,0.05);">'
           + '<div style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; opacity:0.7;">' + c.label + '</div>'
           + '<div style="font-size:22px; font-weight:700; margin-top:2px;">' + Number(c.value || 0) + '</div>'
           + '</div>';
    }).join('');
  }

  async function openFlakyModal(projectPath, projectName) {
    if (titleEl) titleEl.textContent = 'Flaky Tests - ' + (projectName || 'Project');
    if (statusEl) { statusEl.textContent = 'Loading...'; statusEl.style.color = ''; }
    if (tbody) tbody.innerHTML = '';
    if (summaryEl) summaryEl.innerHTML = '';
    modal.hidden = false;

    try {
      const resp = await fetch(apiUrl('/api/flakiness?projectPath=' + encodeURIComponent(projectPath)));
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        if (statusEl) { statusEl.textContent = 'Error: ' + (data.error || 'unknown'); statusEl.style.color = '#b91c1c'; }
        return;
      }
      if (!data.found) {
        if (statusEl) { statusEl.textContent = 'Project not yet tracked in DB. Run some tests first.'; statusEl.style.color = '#b45309'; }
        return;
      }
      const items = data.items || [];
      if (items.length === 0) {
        if (statusEl) { statusEl.textContent = 'No test executions recorded yet.'; statusEl.style.color = '#475569'; }
        return;
      }
      if (statusEl) { statusEl.textContent = items.length + ' test(s) tracked.'; statusEl.style.color = '#15803d'; }
      renderSummary(data.summary);

      items.sort(function(a, b) { return Number(b.flaky_score) - Number(a.flaky_score); });

      const rows = items.map(function(it) {
        const score = Number(it.flaky_score || 0);
        const total = Number(it.total_runs || 0);
        const color = scoreColor(score, total);
        const pct = (score * 100).toFixed(1);
        const flakyBadge = it.is_flaky
          ? '<span style="background:#fef3c7; color:#92400e; padding:2px 6px; border-radius:4px; font-size:11px; margin-left:6px;">FLAKY</span>'
          : '';
        const statusLower = (it.last_status || '').toLowerCase();
        const statusColor = statusLower === 'passed' ? '#15803d'
                          : (statusLower === 'failed' || statusLower === 'timedout' || statusLower === 'interrupted') ? '#b91c1c'
                          : '#475569';
        return [
          '<tr style="border-bottom: 1px solid #e5e7eb;">',
          '<td style="padding: 8px;">' + escapeHtml(it.test_case_key || '-') + '</td>',
          '<td style="padding: 8px;">' + escapeHtml(it.test_name || '-') + flakyBadge + '</td>',
          '<td style="padding: 8px; color:#64748b; font-size:12px;">' + escapeHtml(it.spec_relpath || '-') + '</td>',
          '<td style="padding: 8px; text-align:right;">' + total + '</td>',
          '<td style="padding: 8px; text-align:right; color:#15803d;">' + Number(it.passed_count || 0) + '</td>',
          '<td style="padding: 8px; text-align:right; color:#b91c1c;">' + Number(it.failed_count || 0) + '</td>',
          '<td style="padding: 8px; text-align:right;"><span style="color:' + color + '; font-weight:600;">' + pct + '%</span></td>',
          '<td style="padding: 8px; color:' + statusColor + '; text-transform:uppercase; font-size:12px; font-weight:600;">' + escapeHtml(it.last_status || '-') + '</td>',
          '<td style="padding: 8px; font-size:12px;">' + escapeHtml(fmtDate(it.last_run_at)) + '</td>',
          '</tr>'
        ].join('');
      }).join('');

      if (tbody) tbody.innerHTML = rows;
    } catch (err) {
      if (statusEl) { statusEl.textContent = 'Failed: ' + (err.message || err); statusEl.style.color = '#b91c1c'; }
    }
  }

  document.addEventListener('click', function(event) {
    const btn = event.target.closest('.project-flaky-tests');
    if (!btn) return;
    event.preventDefault();
    const projectPath = btn.dataset.projectPath || '';
    const projectName = btn.dataset.projectName || '';
    if (!projectPath) return;
    openFlakyModal(projectPath, projectName);
  });
});
﻿// =====================================================================
// LIVE DUPLICATE NAME CHECK (project create + file name)
// =====================================================================
document.addEventListener('DOMContentLoaded', function setupNameDuplicateChecks() {
  function debounce(fn, ms) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function setStatus(el, kind, text) {
    if (!el) return;
    el.textContent = text || '';
    if (kind === 'ok')         el.style.color = '#15803d';
    else if (kind === 'bad')   el.style.color = '#b91c1c';
    else if (kind === 'wait')  el.style.color = '#64748b';
    else                       el.style.color = '';
  }

  // ---- Project name check ----
  const projInput  = document.getElementById('project-create-name');
  const projStatus = document.getElementById('project-create-name-status');
  if (projInput && projStatus) {
    const checkProj = debounce(async () => {
      const val = projInput.value.trim();
      if (!val) { setStatus(projStatus, '', ''); return; }
      setStatus(projStatus, 'wait', 'Checking...');
      try {
        const parentPath = (document.getElementById('project-create-location')?.value || '').trim();
        const url = '/api/projects/check-name?name=' + encodeURIComponent(val)
                  + (parentPath ? '&parentPath=' + encodeURIComponent(parentPath) : '');
        const resp = await fetch(url);
        const data = await resp.json();
        if (!data.ok) { setStatus(projStatus, 'bad', 'Error'); return; }
        if (data.exists) setStatus(projStatus, 'bad', '\u2717 ' + data.message);
        else             setStatus(projStatus, 'ok',  '\u2713 ' + (data.message || 'Available'));
      } catch (e) {
        setStatus(projStatus, 'bad', 'Check failed');
      }
    }, 400);
    projInput.addEventListener('input', checkProj);
    projInput.addEventListener('blur',  checkProj);
    const locInput = document.getElementById('project-create-location');
    if (locInput) locInput.addEventListener('input', checkProj);
  }

  // ---- File name check (depends on currently selected project from dropdown) ----
  const fileInput   = document.getElementById('record-output-name');
  const fileStatus  = document.getElementById('record-output-name-status');
  const projSelect  = document.getElementById('project-select');
  const testTypeSel = document.getElementById('record-test-type');
  if (fileInput && fileStatus) {
    const checkFile = debounce(async () => {
      const fileVal = fileInput.value.trim();
      if (!fileVal) { setStatus(fileStatus, '', ''); return; }
      const projName = (projSelect && projSelect.value) ? projSelect.value.split(/[\\\/]/).pop() : '';
      if (!projName) { setStatus(fileStatus, 'wait', 'Select a project first'); return; }
      const testType = (testTypeSel && testTypeSel.value) ? testTypeSel.value : 'sanity';
      setStatus(fileStatus, 'wait', 'Checking...');
      try {
        const url = '/api/projects/check-filename?projectName=' + encodeURIComponent(projName)
                  + '&fileName=' + encodeURIComponent(fileVal)
                  + '&testType=' + encodeURIComponent(testType);
        const resp = await fetch(url);
        const data = await resp.json();
        if (!data.ok) { setStatus(fileStatus, 'bad', 'Error'); return; }
        if (data.exists) setStatus(fileStatus, 'bad', '\u2717 ' + data.message);
        else             setStatus(fileStatus, 'ok',  '\u2713 ' + (data.message || 'Available'));
      } catch (e) {
        setStatus(fileStatus, 'bad', 'Check failed');
      }
    }, 400);
    fileInput.addEventListener('input', checkFile);
    fileInput.addEventListener('blur',  checkFile);
    if (testTypeSel) testTypeSel.addEventListener('change', checkFile);
    if (projSelect)  projSelect.addEventListener('change',  checkFile);
  }
});


// ============================================================
// Jenkins job name live duplicate check
// ============================================================
document.addEventListener('DOMContentLoaded', function setupJenkinsJobNameCheck() {
  function debounce(fn, ms) { let t; return function(...a) { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  const input  = document.getElementById('gaJenkinsJobName');
  const status = document.getElementById('gaJenkinsJobNameStatus');
  if (!input || !status) return;
  function set(kind, msg) {
    status.textContent = msg || '';
    status.style.color = (kind === 'ok') ? '#15803d' : (kind === 'bad') ? '#b91c1c' : (kind === 'wait') ? '#64748b' : '';
  }
  const check = debounce(async () => {
    const v = input.value.trim();
    if (!v) { set('', ''); return; }
    set('wait', 'Checking...');
    try {
      const resp = await fetch('/api/jenkins/check-job?jobName=' + encodeURIComponent(v));
      const data = await resp.json();
      if (!data.ok) { set('bad', data.message || 'Error'); return; }
      if (data.exists) set('bad', '\u2717 ' + data.message);
      else             set('ok',  '\u2713 ' + (data.message || 'Available'));
    } catch (e) { set('bad', 'Check failed'); }
  }, 400);
  input.addEventListener('input', check);
  input.addEventListener('blur',  check);
});

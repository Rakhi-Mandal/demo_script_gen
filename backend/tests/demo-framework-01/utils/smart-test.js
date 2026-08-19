const fs = require("node:fs");
const path = require("node:path");
const {
  test: base,
  expect
}
= require("@playwright/test");
const {
  createSmartClickPage,
  SMART_CLICK_BYPASS,
  SMART_LOCATOR_UNWRAP
}
= require("./smart-click");
const INITIAL_ACTIONABILITY_TIMEOUT_MS = 1000;
const CURRENT_LOCATOR_MAX_ATTEMPTS = 3;
const CLICK_RETRY_DELAY_MS = 300;
const RETRY_ACTIONABILITY_TIMEOUT_MS = 3000;
const REAL_CLICK_TIMEOUT_MS = 15000;
const PAGE_READY_TIMEOUT_MS = 15000;
const POST_CLICK_NAVIGATION_GRACE_MS = 15000;
const PAGE_TRANSITION_LOCATOR_TIMEOUT_MS = 30000;
const CURRENT_LOCATOR_ACTIONABILITY_TIMEOUT_MS = 30000;
const PAGE_TRANSITION_WAIT_SLICE_MS = 1000;
const PAGE_TRANSITION_POLL_INTERVAL_MS = 100;
const DEFAULT_CODEGEN_OUTPUT_DIR = path.resolve(__dirname, "../../../codegen-output");
function delay(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}
function formatError(error) {
  try {
    return String(error instanceof Error ? error.message: error).replace(/\s+/g, " ").trim();
  } catch (_) {
    return "Unprintable error";
  }
}
function safeLog(message) {
  try {
    console.log(message);
  } catch (_) {
    // Diagnostic output must never affect an action result.
  }
}
function safeWarn(message) {
  try {
    console.warn(message);
  } catch (_) {
    // Diagnostic output must never affect an action result.
  }
}
function preserveError(error, fallbackMessage = "Unknown staged action failure") {
  if (error instanceof Error) {
    return error;
  }
  try {
    return new Error(error == null ? fallbackMessage: String(error));
  } catch (_) {
    return new Error(fallbackMessage);
  }
}
async function containAttempt(stage, operation) {
  try {
    return {
      ok: true,
      value: await operation(),
      error: null
    };
  } catch (error) {
    const containedError = preserveError(error, `${stage} failed without an Error object`);
    return {
      ok: false,
      value: undefined,
      error: containedError
    };
  }
}
function normalizeSelector(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  if (/^xpath=/i.test(trimmed)) {
    return "xpath=" + trimmed.replace(/^xpath=/i, "");
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("(")) {
    return `xpath=${trimmed}`;
  }
  return trimmed;
}
function isXPathSelector(value) {
  return /^xpath=/i.test(normalizeSelector(value));
}
function isLocatorLike(value) {
  return Boolean(value && typeof value === "object" && typeof value.click === "function" && typeof value.count === "function"
  && typeof value.locator === "function");
}
function isDirectory(directoryPath) {
  try {
    return fs.statSync(directoryPath).isDirectory();
  } catch {
    return false;
  }
}
function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}
function getParentDirectories(startingPath) {
  const directories = [];
  let current = path.resolve(startingPath);
  if (isFile(current)) {
    current = path.dirname(current);
  } while (true) {
    directories.push(current);
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return directories;
}
function findCodegenOutputDirectory(startingPaths) {
  const configuredDirectory = process.env.PW_CODEGEN_OUTPUT_DIR?.trim();
  if (configuredDirectory) {
    const resolvedDirectory = path.resolve(configuredDirectory);
    return isDirectory(resolvedDirectory) ? resolvedDirectory: "";
  }
  if (isDirectory(DEFAULT_CODEGEN_OUTPUT_DIR)) {
    return DEFAULT_CODEGEN_OUTPUT_DIR;
  }
  for (const startingPath of startingPaths) {
    if (!startingPath) {
      continue;
    }
    for (const currentDirectory of getParentDirectories(startingPath)) {
      const directCandidate = path.join(currentDirectory, "codegen-output");
      const backendCandidate = path.join(currentDirectory, "backend", "codegen-output");
      if (isDirectory(directCandidate)) {
        return directCandidate;
      }
      if (isDirectory(backendCandidate)) {
        return backendCandidate;
      }
    }
  }
  return "";
}
function decodeJavaScriptStringLiteral(literal) {
  if (typeof literal !== "string" || literal.length < 2) {
    return null;
  }
  const quote = literal[0];
  if (quote !== '"' && quote !== "'") {
    return null;
  }
  if (literal[literal.length - 1] !== quote) {
    return null;
  }
  if (quote === '"') {
    try {
      return JSON.parse(literal);
    } catch {
      return null;
    }
  }
  let result = "";
  let escaped = false;
  for (let index = 1; index < literal.length - 1; index += 1) {
    const character = literal[index];
    if (!escaped) {
      if (character === "\\") {
        escaped = true;
        continue;
      }
      result += character;
      continue;
    }
    escaped = false;
    switch (character) {
      case "n": result += "\n";
      break;
      case "r": result += "\r";
      break;
      case "t": result += "\t";
      break;
      case "b": result += "\b";
      break;
      case "f": result += "\f";
      break;
      case "v": result += "\v";
      break;
      case "0": result += "\0";
      break;
      case "\\": result += "\\";
      break;
      case "'": result += "'";
      break;
      case '"': result += '"';
      break;
      default: result += character;
      break;
    }
  }
  return escaped ? null: result;
}
function normalizeLocatorExpression(expression) {
  const trimmed = String(expression || "").trim();
  if (!trimmed || !trimmed.startsWith("page.") || /[\r\n]/.test(trimmed)) {
    return "";
  }
  const locatorMatch = trimmed.match(/^page\.locator\(\s*((?:"(?:\\.|[^"\\])*")|(?:'(?:\\.|[^'\\])*'))\s*\)$/);
  if (!locatorMatch) {
    return trimmed;
  }
  const decoded = decodeJavaScriptStringLiteral(locatorMatch[1]);
  if (decoded === null) {
    return "";
  }
  return `page.locator(${JSON.stringify(normalizeSelector(decoded))})`;
}
function inspectCodegenPositionFallback(locatorExpression) {
  const expression = String(locatorExpression || "");
  const firstCalls = expression.match(/\.first\s*\(\s*\)/g) || [];
  const lastCalls = expression.match(/\.last\s*\(\s*\)/g) || [];
  const nthCalls = expression.match(/\.nth\s*\([^)]*\)/g) || [];
  const totalCalls = firstCalls.length + lastCalls.length + nthCalls.length;
  if (totalCalls === 0) {
    return {
      valid: true,
      positional: false,
      ordinal: null
    };
  }
  if (totalCalls !== 1 || lastCalls.length) {
    return {
      valid: false,
      positional: true,
      ordinal: null
    };
  }
  if (firstCalls.length === 1) {
    return {
      valid: true,
      positional: true,
      ordinal: 1
    };
  }
  const nthArgument = nthCalls[0].replace(/^\.nth\s*\(/, "").replace(/\)\s*$/, "").trim();
  if (!/^\d+$/.test(nthArgument)) {
    return {
      valid: false,
      positional: true,
      ordinal: null
    };
  }
  const ordinal = Number(nthArgument) + 1;
  return {
    valid: ordinal >= 1 && ordinal <= 3,
    positional: true,
    ordinal
  };
}
function validatedTraceCodegenExpression(action) {
  const comparison = action?.codegenComparison;
  const passesUsabilityGate = comparison?.validationMode === "passive-same-control"
  ? comparison.codegenEnabled === true: comparison?.codegenActionable === true;
  if (!comparison || typeof comparison !== "object" || comparison.compared !== true || comparison.agrees !== true
  || comparison.codegenUsable !== true || comparison.codegenVisible !== true || !passesUsabilityGate
  || !["same-element", "same-interactive-control"].includes(comparison.relationship)
  || comparison.algorithmMatchCount !== 1 || comparison.codegenMatchCount !== 1 || comparison.selectedSource !== "codegen"
  || comparison.algorithmXPathRetained !== false) {
    return "";
  }
  const selected = String(comparison.selectedLocatorExpression || "").trim();
  const compared = String(comparison.locatorExpression || "").trim();
  if (!selected || selected !== compared || selected.length > 20000 || /[\r\n]/.test(selected)
  || !selected.startsWith("page.") || /\.(?:click|fill)\s*\(/.test(selected)
  || !inspectCodegenPositionFallback(selected).valid) {
    return "";
  }
  return normalizeLocatorExpression(selected);
}
function validatedTraceSemanticExpression(action) {
  const comparison = action?.liveSemanticComparison;
  const passesUsabilityGate = comparison?.validationMode === "passive-same-control"
  ? comparison.semanticEnabled === true: comparison?.semanticActionable === true;
  if (!comparison || typeof comparison !== "object" || comparison.compared !== true || comparison.agrees !== true
  || comparison.semanticUsable !== true || comparison.semanticVisible !== true || !passesUsabilityGate
  || !["same-element", "same-interactive-control"].includes(comparison.relationship)
  || comparison.algorithmMatchCount !== 1 || comparison.semanticMatchCount !== 1 || comparison.selectedSource !== "semantic"
  || comparison.algorithmXPathRetained !== false) {
    return "";
  }
  const selected = String(comparison.selectedLocatorExpression || "").trim();
  if (!selected || selected.length > 20000 || /[\r\n]/.test(selected) || !selected.startsWith("page.")
  || /\.(?:click|fill)\s*\(/.test(selected)
  || !/\.(?:getByRole|getByLabel|getByText|getByPlaceholder|getByTestId|getByAltText|getByTitle)\s*\(/.test(selected)) {
    return "";
  }
  return normalizeLocatorExpression(selected);
}
function traceClickLocatorExpression(action) {
  const codegenExpression = validatedTraceCodegenExpression(action);
  const codegenPosition = inspectCodegenPositionFallback(codegenExpression);
  if (codegenExpression && !codegenPosition.positional) {
    return codegenExpression;
  }
  const semanticExpression = validatedTraceSemanticExpression(action);
  if (semanticExpression) {
    return semanticExpression;
  }
  if (codegenExpression && codegenPosition.valid && codegenPosition.positional) {
    return codegenExpression;
  }
  const selector = normalizeSelector(action?.selector);
  return isXPathSelector(selector) ? `page.locator(${JSON.stringify(selector)})`: "";
}
function extractClickLocatorExpressionsFromSource(sourceText) {
  const expressions = [];
  const variables = new Map();
  for (const rawLine of String(sourceText || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    const declaration = line.match(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*(page\..+);\s*$/);
    if (declaration) {
      const expression = normalizeLocatorExpression(declaration[2]);
      if (expression) {
        variables.set(declaration[1], expression);
      }
      continue;
    }
    const variableClick = line.match(/^await\s+([A-Za-z_$][\w$]*)\.click\s*\(/);
    if (variableClick && variables.has(variableClick[1])) {
      expressions.push(variables.get(variableClick[1]));
      continue;
    }
    const directClick = line.match(/^await\s+(page\..+)\.click\s*\(/);
    if (directClick) {
      const expression = normalizeLocatorExpression(directClick[1]);
      if (expression) {
        expressions.push(expression);
      }
    }
  }
  return expressions;
}
function extractClickLocatorExpressionsFromFile(testFilePath) {
  if (!testFilePath || !isFile(testFilePath)) {
    return[];
  }
  try {
    return extractClickLocatorExpressionsFromSource(fs.readFileSync(testFilePath, "utf8"));
  } catch {
    return[];
  }
}
function listActionsFiles(codegenOutputDirectory) {
  if (!codegenOutputDirectory || !isDirectory(codegenOutputDirectory)) {
    return[];
  }
  try {
    return fs.readdirSync(codegenOutputDirectory, {
      withFileTypes: true
    }).filter(entry => {
      return(entry.isFile() && /^actions(?:-.*)?\.json$/i.test(entry.name));
    }).map(entry => {
      const filePath = path.join(codegenOutputDirectory, entry.name);
      return {
        filePath,
        modifiedAt: fs.statSync(filePath).mtimeMs
      };
    }).sort((first, second) => {
      return(second.modifiedAt - first.modifiedAt);
    });
  } catch {
    return[];
  }
}
function readActionsFile(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(parsed)) {
      return {
        valid: false,
        reason: "JSON root is not an array",
        actions: [],
        clickSelectors: []
      };
    }
    const clickActions = parsed.filter(action => {
      return action?.action === "click";
    });
    if (!clickActions.length) {
      return {
        valid: false,
        reason: "contains no click actions",
        actions: [],
        clickSelectors: []
      };
    }
    const clickSelectors = [];
    for (const action of clickActions) {
      const selector = normalizeSelector(action.selector);
      if (!selector) {
        return {
          valid: false,
          reason: "contains a click without a selector",
          actions: [],
          clickSelectors: []
        };
      }
      if (!isXPathSelector(selector)) {
        return {
          valid: false,
          reason: "contains a click whose selector is not XPath",
          actions: [],
          clickSelectors: []
        };
      }
      action.selector = selector;
      const locatorExpression = traceClickLocatorExpression(action);
      if (!locatorExpression) {
        return {
          valid: false,
          reason: "contains a click without a usable selected locator",
          actions: [],
          clickSelectors: []
        };
      }
      clickSelectors.push(locatorExpression);
    }
    return {
      valid: true,
      reason: "",
      actions: parsed,
      clickSelectors
    };
  } catch (error) {
    return {
      valid: false,
      reason: formatError(error),
      actions: [],
      clickSelectors: []
    };
  }
}
function selectorsMatchExactly(first, second) {
  if (first.length !== second.length) {
    return false;
  }
  return first.every((selector, index) => {
    return selector === second[index];
  });
}
function compactTraceValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}
function traceFrameIdentity(action) {
  try {
    return JSON.stringify(Array.isArray(action?.frameChain) ? action.frameChain: []);
  } catch {
    return "[]";
  }
}
function traceElementIdentity(action) {
  const element = action?.element || action?.elementBeforeInput || action?.elementAfterInput || {};
  const attributes = element?.attributes && typeof element.attributes === "object" ? element.attributes: {};
  const tagName = compactTraceValue(element.tagName || element.tag || "");
  const stableNames = [
    "id",
    "data-testid",
    "data-test",
    "data-qa",
    "data-cy",
    "name",
    "aria-label",
    "data-label",
    "placeholder",
    "href",
    "type"
  ];
  const stableParts = stableNames.map(name => {
    const value = compactTraceValue(attributes[name] ?? element[name]);
    return value ? `${name}=${value}`: "";
  }).filter(Boolean);
  return tagName && stableParts.length ? `${traceFrameIdentity(action)}|${tagName}|${stableParts.join("|")}`: "";
}
function parseTracePointerGesture(action) {
  const gestureId = String(action?.gestureId || action?.clickId || "").trim();
  const parts = gestureId.split(":");
  if (!/^(?:pointer|recovered-pointer)$/i.test(parts[0] || "") || parts.length < 6) {
    return null;
  }
  const timestamp = Number(parts[1]);
  const x = Number(parts[parts.length - 2]);
  const y = Number(parts[parts.length - 1]);
  if (!Number.isFinite(timestamp) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return {
    timestamp,
    x,
    y,
    pointerType: compactTraceValue(parts[3]),
    button: Number(parts[4])
  };
}
function traceClickControlText(action) {
  for (const value of[
    action?.text,
    action?.element?.normalizedText,
    action?.element?.accessibleNameCandidates?.[0]
  ]) {
    const normalized = compactTraceValue(value).replace(/\b\d+\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
    if (normalized) {
      return normalized;
    }
  }
  return "";
}
function traceActionsLookLikeUnlabelledRecorderReplay(left, right) {
  const leftGesture = parseTracePointerGesture(left);
  const rightGesture = parseTracePointerGesture(right);
  if (!leftGesture || !rightGesture || leftGesture.pointerType !== rightGesture.pointerType
  || leftGesture.button !== rightGesture.button) {
    return false;
  }
  const ordered = leftGesture.timestamp <= rightGesture.timestamp ?[
    {
      action: left,
      gesture: leftGesture
    },
    {
      action: right,
      gesture: rightGesture
    }
  ]:[
    {
      action: right,
      gesture: rightGesture
    },
    {
      action: left,
      gesture: leftGesture
    }
  ];
  const original = ordered[0];
  const candidate = ordered[1];
  const elapsed = candidate.gesture.timestamp - original.gesture.timestamp;
  const distance = Math.hypot(candidate.gesture.x - original.gesture.x, candidate.gesture.y - original.gesture.y);
  if (elapsed <= 0 || elapsed > 900000 || distance > 40) {
    return false;
  }
  const originalText = traceClickControlText(original.action);
  const candidateText = traceClickControlText(candidate.action);
  const textAgrees = !!originalText && !!candidateText && (originalText === candidateText
  || originalText.includes(candidateText) || candidateText.includes(originalText));
  return textAgrees && original.action?.codegenComparison?.consumed !== true
  && candidate.action?.codegenComparison?.consumed === true
  && /\.click\s*\(/.test(String(candidate.action?.codegenComparison?.line || ""));
}
function traceActionsIdentifySameControl(left, right) {
  if (!left || !right || traceFrameIdentity(left) !== traceFrameIdentity(right)) {
    return false;
  }
  const leftSelector = normalizeSelector(left.selector);
  const rightSelector = normalizeSelector(right.selector);
  if (leftSelector && leftSelector === rightSelector) {
    return true;
  }
  const leftGestureId = compactTraceValue(left?.gestureId || left?.clickId);
  const rightGestureId = compactTraceValue(right?.gestureId || right?.clickId);
  if (leftGestureId && leftGestureId === rightGestureId) {
    return true;
  }
  if ((compactTraceValue(left?.recorderReplayOfGestureId) === rightGestureId && rightGestureId)
  || (compactTraceValue(right?.recorderReplayOfGestureId) === leftGestureId && leftGestureId)) {
    return true;
  }
  /*
   * Shared control metadata is not globally unique. Two calendar buttons can
   * both be aria-label="Choose Date" while their recorded XPaths are anchored
   * to different fields. If both selectors exist and disagree, preserve both
   * actions instead of allowing either metadata or the missing-marker replay
   * heuristic to omit one. Explicit gesture/replay links were handled above.
   */
  if (leftSelector && rightSelector) {
    return false;
  }
  if (traceActionsLookLikeUnlabelledRecorderReplay(left, right)) {
    return true;
  }
  const leftIdentity = traceElementIdentity(left);
  return !!leftIdentity && leftIdentity === traceElementIdentity(right);
}
function traceActionBreaksClickAlignment(action) {
  const actionKind = compactTraceValue(action?.action);
  return new Set([
    "click",
    "input",
    "fill",
    "change",
    "valuecommit",
    "value-commit",
    "select",
    "selectoption",
    "select-option",
    "file-upload",
    "fileupload",
    "setinputfiles",
    "press",
    "hover",
    "navigation"
  ]).has(actionKind);
}
function hasOnlyIgnoredActionsBetween(actions, firstIndex, secondIndex) {
  const start = Math.min(firstIndex, secondIndex) + 1;
  const end = Math.max(firstIndex, secondIndex);
  for (let index = start; index < end; index += 1) {
    if (traceActionBreaksClickAlignment(actions[index])) {
      return false;
    }
  }
  return true;
}
function isSafelyOmittableTraceClick(actions, skippedEntry, selectedEntries) {
  const action = skippedEntry.action;
  const gestureId = compactTraceValue(action?.gestureId || action?.clickId);
  const replayOfGestureId = compactTraceValue(action?.recorderReplayOfGestureId);
  if (replayOfGestureId) {
    return true;
  }
  if (gestureId && selectedEntries.some(entry => {
    return compactTraceValue(entry.action?.recorderReplayOfGestureId) === gestureId;
  })) {
    return true;
  }
  const adjacentSelected = selectedEntries.some(entry => {
    return traceActionsIdentifySameControl(action, entry.action)
    && hasOnlyIgnoredActionsBetween(actions, entry.actionIndex, skippedEntry.actionIndex);
  });
  if (adjacentSelected) {
    return true;
  }
  let nextAction = null;
  for (let index = skippedEntry.actionIndex + 1; index < actions.length; index += 1) {
    if (!traceActionBreaksClickAlignment(actions[index])) {
      continue;
    }
    nextAction = actions[index];
    break;
  }
  return ["input", "fill", "change"].includes(compactTraceValue(nextAction?.action))
  && (compactTraceValue(nextAction?.sourceGestureId) === gestureId
  || traceActionsIdentifySameControl(action, nextAction));
}
function alignTraceActionsToSpecClicks(actions, specClickExpressions) {
  if (!Array.isArray(actions) || !Array.isArray(specClickExpressions)
  || !specClickExpressions.length) {
    return null;
  }
  const traceClicks = actions.map((action, actionIndex) => {
    return {
      action,
      actionIndex,
      expression: action?.action === "click" ? traceClickLocatorExpression(action): ""
    };
  }).filter(entry => {
    return !!entry.expression;
  });
  const selectedActionIndexes = new Set();
  const selectedEntries = [];
  let traceCursor = 0;
  for (const specExpression of specClickExpressions) {
    let matchedEntry = null;
    while (traceCursor < traceClicks.length) {
      const candidate = traceClicks[traceCursor];
      traceCursor += 1;
      if (candidate.expression === specExpression) {
        matchedEntry = candidate;
        break;
      }
    }
    if (!matchedEntry) {
      return null;
    }
    selectedActionIndexes.add(matchedEntry.actionIndex);
    selectedEntries.push(matchedEntry);
  }
  const skippedEntries = traceClicks.filter(entry => {
    return !selectedActionIndexes.has(entry.actionIndex);
  });
  if (!skippedEntries.every(entry => {
    return isSafelyOmittableTraceClick(actions, entry, selectedEntries);
  })) {
    return null;
  }
  const alignedActions = actions.filter((action, actionIndex) => {
    return action?.action !== "click" || selectedActionIndexes.has(actionIndex);
  });
  return {
    actions: alignedActions,
    matchedClickCount: selectedActionIndexes.size,
    skippedTraceClickCount: traceClicks.length - selectedActionIndexes.size
  };
}
function resolveOptionalTraceActions({
  startingPaths,
  testFilePath
}) {
  const specClickSelectors = extractClickLocatorExpressionsFromFile(testFilePath);
  if (!specClickSelectors.length) {
    return {
      actionsPath: "",
      actions: [],
      selectionReason: "trace disabled; the spec has no parseable locator-variable or direct clicks"
    };
  }
  const configuredFile = process.env.PW_ACTIONS_PATH?.trim();
  if (configuredFile) {
    const resolvedFile = path.resolve(configuredFile);
    if (!isFile(resolvedFile)) {
      return {
        actionsPath: "",
        actions: [],
        selectionReason: `trace disabled; PW_ACTIONS_PATH is not a file: ${resolvedFile}`
      };
    }
    const inspected = readActionsFile(resolvedFile);
    if (!inspected.valid) {
      return {
        actionsPath: "",
        actions: [],
        selectionReason: `trace disabled; configured actions file is invalid: ${inspected.reason}`
      };
    }
    const aligned = selectorsMatchExactly(specClickSelectors, inspected.clickSelectors) ? {
      actions: inspected.actions,
      matchedClickCount: specClickSelectors.length,
      skippedTraceClickCount: 0
    }: alignTraceActionsToSpecClicks(inspected.actions, specClickSelectors);
    if (!aligned) {
      return {
        actionsPath: "",
        actions: [],
        selectionReason: "trace disabled; configured actions file cannot be aligned to this spec's ordered clicks"
      };
    }
    return {
      actionsPath: resolvedFile,
      actions: aligned.actions,
      selectionReason: aligned.skippedTraceClickCount
      ? `PW_ACTIONS_PATH ordered click alignment; ignored ${aligned.skippedTraceClickCount} trace-only duplicate/redundant clicks`
      : "PW_ACTIONS_PATH exact click-sequence match"
    };
  }
  const codegenOutputDirectory = findCodegenOutputDirectory(startingPaths);
  if (!codegenOutputDirectory) {
    return {
      actionsPath: "",
      actions: [],
      selectionReason: "trace disabled; codegen-output directory was not found"
    };
  }
  let bestAligned = null;
  for (const fileEntry of listActionsFiles(codegenOutputDirectory)) {
    const inspected = readActionsFile(fileEntry.filePath);
    if (!inspected.valid) {
      continue;
    }
    if (selectorsMatchExactly(specClickSelectors, inspected.clickSelectors)) {
      return {
        actionsPath: fileEntry.filePath,
        actions: inspected.actions,
        selectionReason: `exact selected-locator sequence match; ${inspected.clickSelectors.length} clicks`
      };
    }
    const aligned = alignTraceActionsToSpecClicks(inspected.actions, specClickSelectors);
    if (aligned && (!bestAligned || aligned.skippedTraceClickCount < bestAligned.aligned.skippedTraceClickCount)) {
      bestAligned = {
        fileEntry,
        aligned
      };
    }
  }
  if (bestAligned) {
    return {
      actionsPath: bestAligned.fileEntry.filePath,
      actions: bestAligned.aligned.actions,
      selectionReason: `ordered selected-locator alignment; ${bestAligned.aligned.matchedClickCount} generated clicks mapped and ${bestAligned.aligned.skippedTraceClickCount} trace-only duplicate/redundant clicks ignored`
    };
  }
  return {
    actionsPath: "",
    actions: [],
    selectionReason: "trace disabled; no actions JSON exactly matched this spec"
  };
}
async function waitForPageReadiness(page, timeout) {
  const deadline = Date.now() + Math.max(1, timeout);
  let lastReadyState = "unavailable";
  while (Date.now() < deadline) {
    const remaining = Math.max(1, deadline - Date.now());
    try {
      await page.waitForLoadState("domcontentloaded", {
        timeout: Math.min(remaining, PAGE_TRANSITION_WAIT_SLICE_MS)
      });
    } catch {
      // A navigation can replace the execution context while it is loading.
    }
    try {
      lastReadyState = await page.evaluate(() => document.readyState);
    } catch {
      lastReadyState = "unavailable";
    }
    if ([
      "interactive",
      "complete"
    ].includes(lastReadyState)) {
      return {
        ready: true,
        readyState: lastReadyState
      };
    }
    const waitMs = Math.min(PAGE_TRANSITION_POLL_INTERVAL_MS, Math.max(0, deadline - Date.now()));
    if (waitMs > 0) {
      await delay(waitMs);
    }
  }
  return {
    ready: false,
    readyState: lastReadyState
  };
}
async function locatorCurrentlyAbsent(locator) {
  try {
    return await locator.count() < 1;
  } catch {
    /* A destroyed execution context is also a page-transition signal. */
    return true;
  }
}
async function waitForCurrentLocatorAfterPageTransition({
  page,
  locator,
  timeout
}) {
  const startedAt = Date.now();
  const deadline = startedAt + Math.max(1, timeout);
  let lastCount = 0;
  let lastReadyState = "unavailable";
  let lastError = null;
  while (Date.now() < deadline) {
    const readiness = await waitForPageReadiness(page, Math.min(PAGE_TRANSITION_WAIT_SLICE_MS, Math.max(1, deadline - Date.now())));
    lastReadyState = readiness.readyState;
    try {
      lastCount = await locator.count();
      if (lastCount > 0) {
        await waitForPageReadiness(page, Math.min(PAGE_READY_TIMEOUT_MS, Math.max(1, deadline - Date.now())));
        return {
          attached: true,
          count: lastCount,
          readyState: lastReadyState,
          elapsedMs: Date.now() - startedAt
        };
      }
    } catch (error) {
      lastError = error;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      break;
    }
    try {
      await locator.waitFor({
        state: "attached",
        timeout: Math.min(PAGE_TRANSITION_WAIT_SLICE_MS, remaining)
      });
      lastCount = await locator.count().catch(() => 0);
      if (lastCount > 0) {
        const finalReadiness = await waitForPageReadiness(page, Math.min(PAGE_READY_TIMEOUT_MS, Math.max(1, deadline - Date.now())));
        return {
          attached: true,
          count: lastCount,
          readyState: finalReadiness.readyState,
          elapsedMs: Date.now() - startedAt
        };
      }
    } catch (error) {
      lastError = error;
    }
    const waitMs = Math.min(PAGE_TRANSITION_POLL_INTERVAL_MS, Math.max(0, deadline - Date.now()));
    if (waitMs > 0) {
      await delay(waitMs);
    }
  }
  return {
    attached: false,
    count: lastCount,
    readyState: lastReadyState,
    elapsedMs: Date.now() - startedAt,
    lastError
  };
}
async function inspectPreviousLocatorRecovery(locator, timeout) {
  const count = await locator.count();
  if (count !== 1) {
    return {
      shouldReplay: false,
      reason: `previous locator currently resolves to ${count} elements`
    };
  }
  await locator.waitFor({
    state: "attached",
    timeout
  });
  return locator.evaluate(element => {
    const expanded = String(element.getAttribute("aria-expanded") || "").toLowerCase();
    const hasPopup = String(element.getAttribute("aria-haspopup") || "").toLowerCase();
    const controls = String(element.getAttribute("aria-controls") || "").trim();
    if (expanded === "true") {
      return {
        shouldReplay: false,
        reason: "previous locator is an already-expanded toggle"
      };
    }
    if (expanded === "false") {
      return {
        shouldReplay: true,
        reason: "previous locator is a collapsed toggle"
      };
    }
    if (controls) {
      const controlled = element.ownerDocument.getElementById(controls);
      if (controlled) {
        const style = controlled.ownerDocument.defaultView.getComputedStyle(controlled);
        const rect = controlled.getBoundingClientRect();
        const controlledIsOpen = style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        return {
          shouldReplay: !controlledIsOpen,
          reason: controlledIsOpen ? "controlled popup is already open": "controlled popup is closed"
        };
      }
    }
    if ([
      "dialog",
      "grid",
      "listbox",
      "menu",
      "tree"
    ].includes(hasPopup)) {
      return {
        shouldReplay: false,
        reason: `previous locator is a popup toggle with unknown open state (${hasPopup})`
      };
    }
    return {
      shouldReplay: true,
      reason: "previous locator is not identified as a stateful toggle"
    };
  });
}
function createAttemptOptions(options, {
  trial,
  timeout,
  noWaitAfter
}) {
  const result = {
    ...options,
    trial,
    timeout
  };
  if (noWaitAfter !== undefined) {
    result.noWaitAfter = noWaitAfter;
  }
  return result;
}
async function findActionableCandidate({
  locator,
  options,
  timeout,
  traceMode
}) {
  if (traceMode) {
    await locator.click(createAttemptOptions(options, {
      trial: true,
      timeout,
      noWaitAfter: true
    }));
    return locator;
  }
  let count = await locator.count();
  if (count < 1) {
    await locator.waitFor({
      state: "attached",
      timeout
    });
    count = await locator.count();
  }
  if (count < 1) {
    throw new Error("Locator resolved to no elements");
  }
  if (count === 1) {
    await locator.click(createAttemptOptions(options, {
      trial: true,
      timeout,
      noWaitAfter: true
    }));
    return locator;
  }
  const successfulCandidates = [];
  const failures = [];
  const startedAt = Date.now();
  const deadline = startedAt + timeout;
  for (let index = 0; index < count; index += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      break;
    }
    const remainingCandidates = Math.max(1, count - index);
    const candidateTimeout = Math.max(1, Math.floor(remaining / remainingCandidates));
    const candidate = locator.nth(index);
    try {
      await candidate.click(createAttemptOptions(options, {
        trial: true,
        timeout: candidateTimeout,
        noWaitAfter: true
      }));
      successfulCandidates.push({
        index,
        locator: candidate
      });
    } catch (error) {
      failures.push(`candidate ${index + 1}: ${formatError(error)}`);
    }
  }
  if (successfulCandidates.length === 1) {
    return successfulCandidates[0].locator;
  }
  if (successfulCandidates.length > 1) {
    throw new Error((`Locator resolved to ${count} elements and ` + `${successfulCandidates.length} were actionable. ` + "The click is ambiguous."));
  }
  throw new Error([
    `Locator resolved to ${count} elements, but none became actionable.`,
    ...failures
  ].join("\n"));
}
async function executePreparedClick({
  page,
  locator,
  options,
  selectorHint,
  actionabilityTimeout,
  traceMode
}) {
  await waitForPageReadiness(page, Math.min(PAGE_READY_TIMEOUT_MS, actionabilityTimeout, 2000));
  const probeStartedAt = Date.now();
  /*
   * Trace-aware clicks resolve and validate the recorded target inside
   * smart-click.js. A second outer trial before every real click duplicated
   * the work, competed with responsive hover state, and added seconds of lag.
   * Keep trial probing for explicit assertions and for ordinary locators.
   */
  const preparedLocator = traceMode && options.trial !== true
  ? locator: await findActionableCandidate({
      locator,
      options,
      timeout: actionabilityTimeout,
      traceMode
    });
  if (options.trial === true) {
    return;
  }
  const requestedTimeout = Number(options.timeout);
  const realClickTimeout = Math.max(REAL_CLICK_TIMEOUT_MS, Number.isFinite(requestedTimeout) && requestedTimeout > 0 ? requestedTimeout: 0);
  await preparedLocator.click(createAttemptOptions(options, {
    trial: false,
    timeout: realClickTimeout,
    /*
     * Trace clicks resolve inside smart-click.js; ordinary clicks may have
     * been actionability-probed above. In either case, end the physical-action
     * boundary as soon as Playwright dispatches the click. Navigation and
     * readiness are observed separately so a post-dispatch navigation timeout
     * cannot cause a second physical click.
     */
    noWaitAfter: true
  }));
  const postClickOutcome = await containAttempt("post-click readiness observation", async() => {
    await delay(100);
    await waitForPageReadiness(page, POST_CLICK_NAVIGATION_GRACE_MS);
  });
  if (!postClickOutcome.ok) {
    try {
      safeWarn([
        "[smart-test]",
        "Post-click readiness error contained after the real click succeeded.",
        `selector=${selectorHint || "(unknown)"}`,
        `reason=${formatError(postClickOutcome.error)}`,
        "The click will not be repeated."
      ].join(" "));
    } catch (_) {
      // Reporting must never turn a successful physical click into a retry.
    }
  }
  try {
    safeLog([
      "[smart-test]",
      "Prepared click succeeded.",
      `selector=${selectorHint || "(unknown)"}`,
      `probeElapsedMs=${Date.now() - probeStartedAt}`,
      `realClickTimeoutMs=${realClickTimeout}`
    ].join(" "));
  } catch (_) {
    // Reporting must never turn a successful physical click into a retry.
  }
}
async function waitForCurrentLocatorActionability({
  page,
  locator,
  options,
  selectorHint,
  traceMode,
  timeout
}) {
  const startedAt = Date.now();
  await executePreparedClick({
    page,
    locator,
    options: {
      ...options,
      trial: true
    },
    selectorHint,
    actionabilityTimeout: timeout,
    traceMode
  });
  return {
    actionable: true,
    elapsedMs: Date.now() - startedAt
  };
}
async function executePreparedFill({
  page,
  locator,
  value,
  options,
  selectorHint,
  timeout
}) {
  await waitForPageReadiness(page, Math.min(PAGE_READY_TIMEOUT_MS, timeout, 2000));
  const requestedTimeout = Number(options.timeout);
  const fillTimeout = Math.max(timeout, Number.isFinite(requestedTimeout) && requestedTimeout > 0 ? requestedTimeout: 0);
  await locator.fill(value, {
    ...options,
    timeout: fillTimeout
  });
  try {
    safeLog([
      "[smart-test]",
      "Prepared fill succeeded.",
      `selector=${selectorHint || "(unknown)"}`,
      `timeoutMs=${fillTimeout}`
    ].join(" "));
  } catch (_) {
    // Reporting must never turn a successful fill into a retry.
  }
}
function createDelayedClickRetryPage(page, {
  rawPage,
  traceEnabled
}) {
  let previousSuccessfulClick = null;
  const locatorFactoryNames = new Set([
    "locator",
    "getByRole",
    "getByText",
    "getByLabel",
    "getByPlaceholder",
    "getByAltText",
    "getByTitle",
    "getByTestId"
  ]);
  function createLocatorFactoryHint(factoryName, args, fallback) {
    if (factoryName === "locator" && typeof args[0] === "string") {
      return normalizeSelector(args[0]);
    }
    if (!locatorFactoryNames.has(factoryName)) {
      return fallback;
    }
    try {
      const renderedArguments = args.map(argument => {
        if (argument instanceof RegExp) {
          return argument.toString();
        }
        const serialized = JSON.stringify(argument);
        return serialized === undefined ? String(argument): serialized;
      }).join(", ");
      return `${String(factoryName)}(${renderedArguments})`.slice(0, 1000);
    } catch {
      return `${String(factoryName)}(...)`;
    }
  }
  function wrapLocator(locator, selectorHint) {
    return new Proxy(locator, {
      get(target, property) {
        if (property === SMART_LOCATOR_UNWRAP) {
          return target;
        }
        /* Keep Playwright locator assertions compatible with this Proxy. */
        if (property === "constructor") {
          return Reflect.get(target, property, target);
        }
        if (property === "click") {
          return async(options = {
          }) => {
            const traceMode = traceEnabled === true;
            if (options.trial === true) {
              const requestedTimeout = Number(options.timeout);
              const trialTimeout = Number.isFinite(requestedTimeout) && requestedTimeout > 0
              ? requestedTimeout: RETRY_ACTIONABILITY_TIMEOUT_MS;
              const trialOutcome = await containAttempt("single assertion trial", () => {
                return executePreparedClick({
                  page: rawPage,
                  locator: target,
                  options,
                  selectorHint,
                  actionabilityTimeout: trialTimeout,
                  traceMode
                });
              });
              if (trialOutcome.ok) {
                return trialOutcome.value;
              }
              throw preserveError(trialOutcome.error, "Visibility assertion trial failed");
            }
            let initialError = null;
            let lastCurrentError = null;
            let transitionWaitPerformed = false;
            let actionabilityWaitPerformed = false;
            for (let attempt = 1; attempt <= CURRENT_LOCATOR_MAX_ATTEMPTS; attempt += 1) {
              const outcome = await containAttempt(`current locator attempt ${attempt}`, async() => {
                return executePreparedClick({
                  page: rawPage,
                  locator: target,
                  options,
                  selectorHint,
                  actionabilityTimeout: attempt === 1 ? INITIAL_ACTIONABILITY_TIMEOUT_MS: RETRY_ACTIONABILITY_TIMEOUT_MS,
                  traceMode
                });
              });
              if (outcome.ok) {
                if (options.trial !== true) {
                  previousSuccessfulClick = {
                    locator: target,
                    selectorHint,
                    options: {
                      ...options,
                      trial: false
                    },
                    traceMode
                  };
                }
                return outcome.value;
              }
              if (!initialError) {
                initialError = outcome.error;
              }
              lastCurrentError = outcome.error;
              if (attempt === 1 && !transitionWaitPerformed && await locatorCurrentlyAbsent(target)) {
                transitionWaitPerformed = true;
                safeWarn([
                  "[smart-test]",
                  "Current locator is absent after the initial attempt.",
                  `selector=${selectorHint || "(unknown)"}`,
                  `waitingForPageTransitionMs=${PAGE_TRANSITION_LOCATOR_TIMEOUT_MS}`,
                  "Waiting for document readiness and re-resolving the same live locator before recovery."
                ].join(" "));
                const transitionOutcome = await containAttempt("current locator page-transition wait", () => {
                  return waitForCurrentLocatorAfterPageTransition({
                    page: rawPage,
                    locator: target,
                    timeout: PAGE_TRANSITION_LOCATOR_TIMEOUT_MS
                  });
                });
                if (transitionOutcome.ok && transitionOutcome.value.attached) {
                  safeLog([
                    "[smart-test]",
                    "Current locator appeared after page-transition waiting.",
                    `selector=${selectorHint || "(unknown)"}`,
                    `matchCount=${transitionOutcome.value.count}`,
                    `readyState=${transitionOutcome.value.readyState}`,
                    `elapsedMs=${transitionOutcome.value.elapsedMs}`,
                    "Continuing with the current locator; no stale locator was replayed."
                  ].join(" "));
                } else {
                  const details = transitionOutcome.ok ? transitionOutcome.value: null;
                  safeWarn([
                    "[smart-test]",
                    "Current locator did not appear during page-transition waiting.",
                    `selector=${selectorHint || "(unknown)"}`,
                    `readyState=${details?.readyState || "unavailable"}`,
                    `elapsedMs=${details?.elapsedMs || PAGE_TRANSITION_LOCATOR_TIMEOUT_MS}`,
                    `reason=${transitionOutcome.ok ? formatError(details?.lastError || "locator remained absent"): formatError(transitionOutcome.error)}`,
                    "Continuing with bounded current-locator retries."
                  ].join(" "));
                }
              }
              if (attempt === 1 && !actionabilityWaitPerformed && !await locatorCurrentlyAbsent(target)) {
                actionabilityWaitPerformed = true;
                safeWarn([
                  "[smart-test]",
                  "Current locator exists but the initial actionability probe failed.",
                  `selector=${selectorHint || "(unknown)"}`,
                  `waitingForActionabilityMs=${CURRENT_LOCATOR_ACTIONABILITY_TIMEOUT_MS}`,
                  "Waiting for the same live control to become visible, enabled, and stable before any previous-locator recovery."
                ].join(" "));
                const actionabilityOutcome = await containAttempt("current locator extended actionability wait", () => {
                  return waitForCurrentLocatorActionability({
                    page: rawPage,
                    locator: target,
                    options,
                    selectorHint,
                    traceMode,
                    timeout: CURRENT_LOCATOR_ACTIONABILITY_TIMEOUT_MS
                  });
                });
                if (actionabilityOutcome.ok) {
                  safeLog([
                    "[smart-test]",
                    "Current locator became actionable during the extended wait.",
                    `selector=${selectorHint || "(unknown)"}`,
                    `elapsedMs=${actionabilityOutcome.value.elapsedMs}`,
                    "Continuing with the current locator; no physical click was dispatched by the wait."
                  ].join(" "));
                } else {
                  safeWarn([
                    "[smart-test]",
                    "Current locator remained non-actionable during the extended wait.",
                    `selector=${selectorHint || "(unknown)"}`,
                    `reason=${formatError(actionabilityOutcome.error)}`,
                    "Continuing with bounded current-locator retries."
                  ].join(" "));
                }
              }
              safeWarn([
                "[smart-test]",
                "Prepared click failure contained.",
                `attempt=${attempt}`,
                `selector=${selectorHint || "(unknown)"}`,
                `reason=${formatError(outcome.error)}`,
                attempt < CURRENT_LOCATOR_MAX_ATTEMPTS ? `waitingMs=${CLICK_RETRY_DELAY_MS}`: "current-attempts-exhausted=true",
                attempt < CURRENT_LOCATOR_MAX_ATTEMPTS ? "Re-resolving the same live locator.": "Proceeding to recovery."
              ].join(" "));
              if (attempt >= CURRENT_LOCATOR_MAX_ATTEMPTS) {
                break;
              }
              await containAttempt("current locator retry delay", () => {
                return delay(CLICK_RETRY_DELAY_MS);
              });
            }
            await containAttempt("pre-recovery delay", () => {
              return delay(CLICK_RETRY_DELAY_MS);
            });
            const currentLocatorAbsentBeforePreviousRecovery = await locatorCurrentlyAbsent(target);
            if (previousSuccessfulClick && currentLocatorAbsentBeforePreviousRecovery) {
              const previous = previousSuccessfulClick;
              safeWarn([
                "[smart-test]",
                "All three current-locator attempts failed.",
                `currentSelector=${selectorHint || "(unknown)"}`,
                `previousSelector=${previous.selectorHint || "(unknown)"}`,
                "Inspecting the previous locator; it will be replayed at most once and only when state-safe."
              ].join(" "));
              const replayDecisionOutcome = await containAttempt("previous locator state inspection", () => {
                return inspectPreviousLocatorRecovery(previous.locator, RETRY_ACTIONABILITY_TIMEOUT_MS);
              });
              if (!replayDecisionOutcome.ok) {
                safeWarn([
                  "[smart-test]",
                  "Previous-locator state inspection failure contained.",
                  `selector=${previous.selectorHint || "(unknown)"}`,
                  `reason=${formatError(replayDecisionOutcome.error)}`,
                  "Continuing to the final current-locator attempt."
                ].join(" "));
              } else if (!replayDecisionOutcome.value.shouldReplay) {
                safeWarn([
                  "[smart-test]",
                  "Previous-locator physical replay skipped.",
                  `selector=${previous.selectorHint || "(unknown)"}`,
                  `reason=${replayDecisionOutcome.value.reason}`,
                  "This prevents an already-open toggle from being closed."
                ].join(" "));
              } else {
                const previousOutcome = await containAttempt("previous successful locator recovery", () => {
                  return executePreparedClick({
                    page: rawPage,
                    locator: previous.locator,
                    options: {
                      ...previous.options,
                      ...(previous.traceMode ? {
                        [SMART_CLICK_BYPASS]: true
                      }: {})
                    },
                    selectorHint: previous.selectorHint,
                    actionabilityTimeout: RETRY_ACTIONABILITY_TIMEOUT_MS,
                    traceMode: previous.traceMode
                  });
                });
                if (!previousOutcome.ok) {
                  safeWarn([
                    "[smart-test]",
                    "Previous-locator recovery failure contained.",
                    `selector=${previous.selectorHint || "(unknown)"}`,
                    `reason=${formatError(previousOutcome.error)}`,
                    "Continuing to the final current-locator attempt."
                  ].join(" "));
                }
              }
              await containAttempt("post-previous-locator delay", () => {
                return delay(CLICK_RETRY_DELAY_MS);
              });
            } else if (previousSuccessfulClick) {
              safeWarn([
                "[smart-test]",
                "Previous-locator physical replay skipped.",
                `currentSelector=${selectorHint || "(unknown)"}`,
                `previousSelector=${previousSuccessfulClick.selectorHint || "(unknown)"}`,
                "The intended current locator exists and is being kept authoritative, even though it is not yet actionable."
              ].join(" "));
            }
            const finalOutcome = await containAttempt("final current locator attempt", () => {
              return executePreparedClick({
                page: rawPage,
                locator: target,
                options,
                selectorHint,
                actionabilityTimeout: RETRY_ACTIONABILITY_TIMEOUT_MS,
                traceMode
              });
            });
            if (finalOutcome.ok) {
              previousSuccessfulClick = {
                locator: target,
                selectorHint,
                options: {
                  ...options,
                  trial: false
                },
                traceMode
              };
              return finalOutcome.value;
            }
            safeWarn([
              "[smart-test]",
              "Final current-locator failure contained.",
              `selector=${selectorHint || "(unknown)"}`,
              `reason=${formatError(finalOutcome.error)}`,
              "Rethrowing the most recent current-locator failure after reload-aware waiting."
            ].join(" "));
            throw preserveError(finalOutcome.error || lastCurrentError || initialError, "All staged click attempts failed");
          };
        }
        if (property === "fill") {
          return async(value, options = {
          }) => {
            let initialError = null;
            let lastInputError = null;
            let transitionWaitPerformed = false;
            for (let attempt = 1; attempt <= CURRENT_LOCATOR_MAX_ATTEMPTS; attempt += 1) {
              const outcome = await containAttempt(`input locator attempt ${attempt}`, () => {
                return executePreparedFill({
                  page: rawPage,
                  locator: target,
                  value,
                  options,
                  selectorHint,
                  timeout: attempt === 1 ? INITIAL_ACTIONABILITY_TIMEOUT_MS: RETRY_ACTIONABILITY_TIMEOUT_MS
                });
              });
              if (outcome.ok) {
                return outcome.value;
              }
              if (!initialError) {
                initialError = outcome.error;
              }
              lastInputError = outcome.error;
              if (attempt === 1 && !transitionWaitPerformed && await locatorCurrentlyAbsent(target)) {
                transitionWaitPerformed = true;
                safeWarn([
                  "[smart-test]",
                  "Input locator is absent after the initial attempt.",
                  `selector=${selectorHint || "(unknown)"}`,
                  `waitingForPageTransitionMs=${PAGE_TRANSITION_LOCATOR_TIMEOUT_MS}`,
                  "Waiting for document readiness and re-resolving the same live input locator."
                ].join(" "));
                const transitionOutcome = await containAttempt("input locator page-transition wait", () => {
                  return waitForCurrentLocatorAfterPageTransition({
                    page: rawPage,
                    locator: target,
                    timeout: PAGE_TRANSITION_LOCATOR_TIMEOUT_MS
                  });
                });
                if (transitionOutcome.ok && transitionOutcome.value.attached) {
                  safeLog([
                    "[smart-test]",
                    "Input locator appeared after page-transition waiting.",
                    `selector=${selectorHint || "(unknown)"}`,
                    `matchCount=${transitionOutcome.value.count}`,
                    `readyState=${transitionOutcome.value.readyState}`,
                    `elapsedMs=${transitionOutcome.value.elapsedMs}`
                  ].join(" "));
                } else {
                  const details = transitionOutcome.ok ? transitionOutcome.value: null;
                  safeWarn([
                    "[smart-test]",
                    "Input locator did not appear during page-transition waiting.",
                    `selector=${selectorHint || "(unknown)"}`,
                    `readyState=${details?.readyState || "unavailable"}`,
                    `elapsedMs=${details?.elapsedMs || PAGE_TRANSITION_LOCATOR_TIMEOUT_MS}`,
                    `reason=${transitionOutcome.ok ? formatError(details?.lastError || "locator remained absent"): formatError(transitionOutcome.error)}`,
                    "Continuing with bounded input retries."
                  ].join(" "));
                }
              }
              safeWarn([
                "[smart-test]",
                "Prepared fill failure contained.",
                `attempt=${attempt}`,
                `selector=${selectorHint || "(unknown)"}`,
                `reason=${formatError(outcome.error)}`,
                attempt < CURRENT_LOCATOR_MAX_ATTEMPTS ? `waitingMs=${CLICK_RETRY_DELAY_MS}`: "input-attempts-exhausted=true",
                attempt < CURRENT_LOCATOR_MAX_ATTEMPTS ? "Retrying only the same input target.": "Rethrowing the most recent input failure after reload-aware waiting."
              ].join(" "));
              if (attempt < CURRENT_LOCATOR_MAX_ATTEMPTS) {
                await containAttempt("input locator retry delay", () => {
                  return delay(CLICK_RETRY_DELAY_MS);
                });
              }
            }
            throw preserveError(lastInputError || initialError, "All staged fill attempts failed");
          };
        }
        const value = Reflect.get(target, property, target);
        if (typeof value !== "function") {
          return value;
        }
        return(...args) => {
          const result = value.apply(target, args);
          if (isLocatorLike(result)) {
            const nextSelectorHint = createLocatorFactoryHint(property, args, selectorHint);
            return wrapLocator(result, nextSelectorHint);
          }
          if (property === "frameLocator" && result) {
            return wrapFrameLocator(result);
          }
          return result;
        };
      }
    });
  }
  function wrapFrameLocator(frameLocator) {
    return new Proxy(frameLocator, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        if (typeof value !== "function") {
          return value;
        }
        if (property === "frameLocator") {
          return(...args) => {
            return wrapFrameLocator(value.apply(target, args));
          };
        }
        if (locatorFactoryNames.has(property)) {
          return(...args) => {
            const locator = value.apply(target, args);
            const selectorHint = createLocatorFactoryHint(property, args, undefined);
            return wrapLocator(locator, selectorHint);
          };
        }
        return value.bind(target);
      }
    });
  }
  return new Proxy(page, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof value !== "function") {
        return value;
      }
      if (property === "frameLocator") {
        return(...args) => {
          return wrapFrameLocator(value.apply(target, args));
        };
      }
      if (locatorFactoryNames.has(property)) {
        return(...args) => {
          const locator = value.apply(target, args);
          const selectorHint = createLocatorFactoryHint(property, args, undefined);
          return wrapLocator(locator, selectorHint);
        };
      }
      return value.bind(target);
    }
  });
}
const test = base.extend({
  page: async({
    page
  }, use, testInfo) => {
    const testFilePath = testInfo.file ? path.resolve(testInfo.file): "";
    const {
      actionsPath,
      actions,
      selectionReason
    }
    = resolveOptionalTraceActions({
      startingPaths: [
        process.cwd(),
        testInfo.config.rootDir,
        testFilePath,
        testFilePath ? path.dirname(testFilePath): "",
        __dirname
      ],
      testFilePath
    });
    const recordedClickCount = actions.filter(action => {
      return action?.action === "click";
    }).length;
    const traceMode = recordedClickCount > 0;
    safeLog(`[smart-click] Implementation: ${require.resolve("./smart-click")}`);
    safeLog(`[smart-click] Executing spec: ${testFilePath || "(unknown)"}`);
    safeLog(`[smart-click] Trace mode: ${traceMode ? "enabled" : "disabled"}`);
    safeLog(`[smart-click] Trace selection: ${selectionReason}`);
    if (actionsPath) {
      safeLog(`[smart-click] Actions file: ${actionsPath}`);
    }
    safeLog(`[smart-click] Recorded clicks: ${recordedClickCount}`);
    safeLog([
      "[smart-test]",
      ("maximum locator attempts=" + `${CURRENT_LOCATOR_MAX_ATTEMPTS}`),
      "recovery sequence=extended current-locator wait; state-safe previous locator only when current remains absent; then current locator once",
      "fill recovery=same resolved input only; no previous-click replay",
      ("initial actionability timeout=" + `${INITIAL_ACTIONABILITY_TIMEOUT_MS}ms`),
      ("retry delay=" + `${CLICK_RETRY_DELAY_MS}ms`),
      ("retry actionability timeout=" + `${RETRY_ACTIONABILITY_TIMEOUT_MS}ms`),
      ("real click timeout=" + `${REAL_CLICK_TIMEOUT_MS}ms minimum`),
      ("zero-match page-transition wait=" + `${PAGE_TRANSITION_LOCATOR_TIMEOUT_MS}ms maximum before recovery`),
      ("present-but-non-actionable wait=" + `${CURRENT_LOCATOR_ACTIONABILITY_TIMEOUT_MS}ms maximum before recovery`)
    ].join(" "));
    const traceAwarePage = traceMode ? createSmartClickPage(page, actions, {
      testFilePath,
      actionsPath,
      alignedTrace: true
    }): page;
    const retryPage = createDelayedClickRetryPage(traceAwarePage, {
      rawPage: page,
      traceEnabled: traceMode
    });
    await use(retryPage);
  }
});
function unwrapSmartLocator(value) {
  let current = value;
  const visited = new Set();
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || (typeof current !== "object" && typeof current !== "function") || visited.has(current)) {
      break;
    }
    visited.add(current);
    let next;
    try {
      next = current[SMART_LOCATOR_UNWRAP];
    } catch (_) {
      break;
    }
    if (!next || next === current) {
      break;
    }
    current = next;
  }
  return current;
}

async function assertAnyVisibleEditableCandidate(
  smartLocator,
  timeout
) {
  const locator = unwrapSmartLocator(smartLocator);
  const deadline = Date.now() + timeout;
  let lastCount = 0;
  do {
    lastCount = await locator.count().catch(() => 0);
    const maximumCandidates = Math.min(lastCount, 50);
    for (let index = 0; index < maximumCandidates; index += 1) {
      const candidate = locator.nth(index);
      const [visible, editable] = await Promise.all([
        candidate.isVisible().catch(() => false),
        candidate.isEditable().catch(() => false)
      ]);
      if (visible && editable) {
        safeLog([
          "[smart-test]",
          "Prepared legacy editable assertion succeeded without strict-mode resolution.",
          `matchedCount=${lastCount}`,
          `selectedIndex=${index}`
        ].join(" "));
        return;
      }
    }
    if (Date.now() >= deadline) {
      break;
    }
    await delay(Math.min(50, Math.max(1, deadline - Date.now())));
  } while (Date.now() < deadline);
  throw new Error(`No visible editable candidate was found among ${lastCount} locator match(es) within ${timeout}ms`);
}

/*
 * A generated visibility assertion immediately precedes click(). Passing an
 * XPath with duplicate DOM matches straight to Playwright makes strict mode
 * fail before the smart click resolver can select the recorded live element.
 *
 * For toBeVisible(), run the wrapped locator's non-mutating trial click. That
 * invokes the exact same trace metadata, ordered-match and actionability
 * resolver as the following click, without dispatching a physical click or
 * consuming the recorded action. Other matchers still receive the genuine
 * Playwright Locator.
 */
function wrapSmartLocatorMatchers(matcher, smartLocator) {
  return new Proxy(matcher, {
    get(target, property) {
      if (property === "toBeVisible") {
        return async(options = {
        }) => {
          if (options?.visible === false) {
            return target.toBeVisible(options);
          }
          const requestedTimeout = Number(options?.timeout);
          const timeout = Number.isFinite(requestedTimeout) && requestedTimeout > 0
          ? requestedTimeout: RETRY_ACTIONABILITY_TIMEOUT_MS;
          await smartLocator.click({
            trial: true,
            timeout
          });
          safeLog([
            "[smart-test]",
            "Prepared visibility assertion succeeded through click resolution.",
            `timeoutMs=${timeout}`
          ].join(" "));
        };
      }
      if (property === "toBeEditable") {
        return async(options = {
        }) => {
          if (options?.editable === false) {
            return target.toBeEditable(options);
          }
          const requestedTimeout = Number(options?.timeout);
          const timeout = Number.isFinite(requestedTimeout) && requestedTimeout > 0
          ? requestedTimeout: RETRY_ACTIONABILITY_TIMEOUT_MS;
          return assertAnyVisibleEditableCandidate(smartLocator, timeout);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target): value;
    }
  });
}
const smartExpect = new Proxy(expect, {
  apply(target, thisArgument, argumentsList) {
    const smartCandidate = argumentsList[0];
    const nextArguments = [...argumentsList];
    if (nextArguments.length) {
      nextArguments[0] = unwrapSmartLocator(nextArguments[0]);
    }
    const matcher = Reflect.apply(target, thisArgument, nextArguments);
    return smartCandidate && smartCandidate !== nextArguments[0]
    && typeof smartCandidate.click === "function"
    ? wrapSmartLocatorMatchers(matcher, smartCandidate): matcher;
  }
});

exports.test = test;
exports.expect = smartExpect;

function injectListeners() {
  const RECORDER_INSTALL_ATTRIBUTE = "data-pw-recorder-listeners-installed";
  const RECORDER_LISTENER_VERSION = "2026-08-18-svg-composite-owner-v51";
  const POINTER_CLICK_MAX_AGE_MS = 60000;
  const POINTER_CLICK_MAX_TRAVEL_PX = 32;
  const POINTER_POST_UP_RETENTION_MS = 1500;
  const CLICK_GESTURE_RETENTION_MS = 5000;
  const RECORDER_CLICK_REPLAY_MAX_AGE_MS = 650;
  const NATIVE_CLICK_CORRELATION_MAX_AGE_MS = 1200;
  const NATIVE_CLICK_CORRELATION_MAX_DISTANCE_PX = 3;
  const GRAPH_ATTRIBUTE_NAME_QUARANTINE = new Set([
    "wire:key",
    "wire:id",
    "wire:snapshot",
    "wire:effects",
    "wire:initial-data",
    "x-data",
    "x-init",
    "x-show",
    "x-model",
    "x-modelable",
    "x-effect",
    "x-ref",
    "x-if",
    "x-for",
    "x-id",
    "x-teleport",
    "x-cloak",
    "x-ignore",
    "x-collapse",
    "icon-class",
  ]);
  const GRAPH_ATTRIBUTE_NAME_PREFIX_QUARANTINE = Object.freeze([
    "wire:",
    "x-on:",
    "x-bind:",
    "x-transition",
    "x-model.",
    "v-on:",
    "v-bind:",
    "@",
    ":",
  ]);
  const GRAPH_ATTRIBUTE_VALUE_QUARANTINE = Object.freeze([
    "pv_id",
  ]);
  const GRAPH_GENERATED_RUNTIME_VALUE_PATTERNS = Object.freeze([
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    /(?:^|[-_:./])\d{8,}(?=$|[-_:./])/,
    /^(?:ember|react-select|headlessui|radix|mui|downshift)(?:[-_:].*)?$/i,
    /^:r[a-z0-9_-]*:?$/i,
    /^tippy-\d+$/i,
  ]);
  const GRAPH_MUTABLE_STATE_ATTRIBUTE_NAMES = new Set([
    "value",
    "checked",
    "selected",
    "disabled",
    "readonly",
    "hidden",
    "open",
    "tabindex",
    "aria-activedescendant",
    "aria-busy",
    "aria-checked",
    "aria-current",
    "aria-describedby",
    "aria-disabled",
    "aria-expanded",
    "aria-hidden",
    "aria-invalid",
    "aria-pressed",
    "aria-selected",
    "aria-valuemax",
    "aria-valuemin",
    "aria-valuenow",
    "aria-valuetext",
    "data-p",
    "data-state",
    "data-headlessui-state",
    "data-highlighted",
    "data-selected",
    "data-checked",
    "data-active",
    "data-open",
  ]);
  const GRAPH_XPATH_MAX_COST = 18;
  const GRAPH_XPATH_MAX_VISITED = 5000;
  const GRAPH_XPATH_MAX_SIBLINGS_PER_LEVEL = 256;
  const GRAPH_XPATH_MAX_PEER_CHILDREN_PER_RING = 512;
  const GRAPH_DOWNWARD_MAX_DEPTH = 6;
  const GRAPH_DOWNWARD_MAX_VISITED = 1200;
  const GRAPH_XPATH_MAX_ANCHORS = 160;
  const GRAPH_XPATH_MAX_GENERATED = 3000;
  const GRAPH_XPATH_MAX_LENGTH = 720;
  const SELECTOR_PRIMARY_SLICE_STEPS = 12;
  const SELECTOR_DOWNWARD_SLICE_STEPS = 8;
  const SELECTOR_SLICE_MAX_MS = 2;
  const SELECTOR_DISPATCH_SETTLE_MAX_MS = 14;
  const SELECTOR_DISPATCH_SETTLE_MAX_ROUNDS = 6;
  const LINEAR_SCAN_MAX_ANCESTOR_DEPTH = 32;
  const LINEAR_SCAN_MAX_VISITED = 5000;
  const LINEAR_SCAN_MAX_SIBLINGS_PER_RING = 256;
  const LINEAR_SCAN_MAX_PEER_CHILDREN_PER_RING = 512;
  const LINEAR_SCAN_DOWNWARD_MAX_DEPTH = 6;
  const LINEAR_SCAN_DOWNWARD_MAX_VISITED = 1200;
  const LINEAR_SCAN_MAX_ANCHOR_XPATHS = 3;
  const LINEAR_SCAN_MAX_ANCHOR_CANDIDATES = 5;
  const LINEAR_SCAN_MAX_TARGET_NODE_TESTS = 32;
  const LINEAR_SCAN_MAX_GENERATED = 3500;
  const FAST_XPATH_MAX_MS = 6;
  const FAST_XPATH_MAX_CANDIDATES = 96;
  const FAST_XPATH_MAX_ATTRIBUTES = 12;
  const FAST_XPATH_ATTRIBUTE_PRIORITY = Object.freeze([
    "data-testid",
    "data-test",
    "data-qa",
    "data-cy",
    "data-label",
    "id",
    "name",
    "aria-label",
    "placeholder",
    "title",
    "x-tooltip",
    "href",
    "role",
    "type",
  ]);
  const STRICT_CONTEXT_ELEMENT_TAGS = new Set([
    "li",
    "option",
  ]);
  const STRICT_CONTEXT_ELEMENT_ROLES = new Set([
    "listitem",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "treeitem",
  ]);
  const STRICT_CONTEXT_LOCAL_ATTRIBUTE_NAMES = new Set([
    "data-value",
    "aria-posinset",
  ]);
  const STRICT_CONTEXT_GLOBAL_ATTRIBUTE_NAMES = Object.freeze([
    "id",
    "data-testid",
    "data-test",
    "data-qa",
    "data-cy",
  ]);
  const LOCAL_CONTROL_RECOVERY_MAX_MS = 4;
  const LOCAL_CONTROL_RECOVERY_MAX_ANCHORS = 24;
  const LOCAL_CONTROL_RECOVERY_MAX_GENERATED = 64;
  const GRAPH_CLASS_RECOVERY_MAX_TOKENS = 12;
  const GRAPH_CLASS_RECOVERY_TOKEN_QUARANTINE_PATTERNS = Object.freeze([
    /px/i,
  ]);
  const GRAPH_CLASS_RECOVERY_MAX_VARIANTS_PER_NODE = 28;
  const GRAPH_CLASS_RECOVERY_DIRECT_MAX_VARIANTS = 8;
  const GRAPH_CLASS_RECOVERY_TARGET_VARIANTS_PER_ANCHOR = 28;
  const GRAPH_CLASS_RECOVERY_STABLE_ANCESTOR_MAX_VARIANTS = 24;
  const GRAPH_CLASS_RECOVERY_CLASS_ANCESTOR_MAX_VARIANTS = 12;
  const GRAPH_CLASS_RECOVERY_MAX_GENERATED = 420;
  const GRAPH_CLASS_RECOVERY_MAX_MS = 18;
  const SINGLE_INDEX_FALLBACK_MAX_MATCHES = 3;
  const SINGLE_INDEX_FALLBACK_MAX_BASE_CANDIDATES = 64;
  const SINGLE_INDEX_FALLBACK_MAX_TARGET_VARIANTS = 24;
  const SINGLE_INDEX_FALLBACK_MAX_ANCHOR_VARIANTS = 20;
  const SINGLE_INDEX_FALLBACK_MAX_VARIANTS_PER_ANCESTOR = 4;
  const CONTEXTUAL_XPATH_MAX_VISITED = 600;
  const CONTEXTUAL_XPATH_MAX_ANCHORS = 72;
  const CONTEXTUAL_XPATH_MAX_GENERATED = 1200;
  const CONTEXTUAL_XPATH_MAX_BASE_PREDICATES = 12;
  const CONTEXTUAL_XPATH_MAX_VARIANTS_PER_NODE = 36;
  const GRAPH_EDGE_COST = {
    PARENT: 1,
    PREVIOUS_SIBLING: 2,
    NEXT_SIBLING: 2,
    CHILD: 3,
  };
  const GRAPH_TRAVERSAL_PRIORITY = {
    SELF: 0,
    SIBLING_PEERS: 1,
    ASCEND_TO_PARENT: 2,
    DESCEND_BELOW: 3,
  };
  const GRAPH_SCOPED_RECOVERY_MAX_ANCESTOR_DEPTH = 32;
  const GRAPH_STRUCTURAL_ANCHOR_TAGS = new Set([
    "nav",
    "main",
    "aside",
    "header",
    "footer",
    "form",
    "section",
    "article",
    "dialog",
    "menu",
    "table",
    "thead",
    "tbody",
    "ul",
    "ol",
  ]);
  const installedRecorderVersion = window.__PW_RECORDER_LISTENERS_VERSION__ || document.documentElement?.getAttribute(RECORDER_INSTALL_ATTRIBUTE)
  || null;
  const recorderAlreadyInstalled = window.__PW_RECORDER_LISTENERS_INSTALLED__ || !!installedRecorderVersion;
  if (recorderAlreadyInstalled) {
    console.warn("[recorder] Listeners are already installed. Duplicate installation skipped.", {
      installedVersion: installedRecorderVersion || "legacy",
      requestedVersion: RECORDER_LISTENER_VERSION,
      reloadRequired: installedRecorderVersion !== RECORDER_LISTENER_VERSION,
    });
    return;
  }
  window.__PW_RECORDER_LISTENERS_INSTALLED__ = true;
  window.__PW_RECORDER_LISTENERS_VERSION__ = RECORDER_LISTENER_VERSION;
  document.documentElement?.setAttribute(RECORDER_INSTALL_ATTRIBUTE, RECORDER_LISTENER_VERSION);
  function isRecorderOverlayElement(element) {
    if (!(element instanceof Element)) {
      return false;
    }
    let current = element;
    const visited = new Set();
    while (current instanceof Element && !visited.has(current)) {
      visited.add(current);
      if (current.tagName?.toLowerCase() === "x-pw-glass") {
        return true;
      }
      const root = current.getRootNode?.();
      if (root && root.host instanceof Element && root.host !== current) {
        current = root.host;
        continue;
      }
      current = current.parentElement;
    }
    return false;
  }
  function getClickStateOwner() {
    try {
      const topWindow = window.top;
      void topWindow.location.href;
      return topWindow;
    } catch {
      return window;
    }
  }
  const clickStateOwner = getClickStateOwner();
  if (!clickStateOwner.__PW_RECORDED_CLICK_GESTURES__ || typeof clickStateOwner.__PW_RECORDED_CLICK_GESTURES__ !== "object") {
    clickStateOwner.__PW_RECORDED_CLICK_GESTURES__ = Object.create(null);
  }
  function getRecordedClickGestures() {
    let gestures = clickStateOwner.__PW_RECORDED_CLICK_GESTURES__;
    if (!gestures || typeof gestures !== "object") {
      gestures = Object.create(null);
      clickStateOwner.__PW_RECORDED_CLICK_GESTURES__ = gestures;
    }
    return gestures;
  }
  function cleanupRecordedClickGestures() {
    const gestures = getRecordedClickGestures();
    const now = Date.now();
    for (const[gestureId, recordedAt,]of Object.entries(gestures)) {
      if (!Number.isFinite(recordedAt) || now - recordedAt > CLICK_GESTURE_RETENTION_MS) {
        delete gestures[gestureId];
      }
    }
  }
  function reserveClickGesture(gestureId) {
    if (!gestureId) {
      return false;
    }
    cleanupRecordedClickGestures();
    const gestures = getRecordedClickGestures();
    if (Object.prototype.hasOwnProperty.call(gestures, gestureId)) {
      return false;
    }
    gestures[gestureId] = Date.now();
    return true;
  }
  function releaseClickGesture(gestureId) {
    if (!gestureId) {
      return;
    }
    const gestures = getRecordedClickGestures();
    delete gestures[gestureId];
  }
  function getAbsoluteEventTimestamp(event) {
    const relativeTimestamp = Number.isFinite(event?.timeStamp) ? event.timeStamp: performance.now();
    const timeOrigin = Number.isFinite(performance.timeOrigin) ? performance.timeOrigin: (Date.now() - performance.now());
    return Math.round((timeOrigin + relativeTimestamp) * 1000);
  }
  function createPointerGestureId(event) {
    return[
      "pointer",
      getAbsoluteEventTimestamp(event),
      Number.isFinite(event?.pointerId) ? event.pointerId: 0,
      String(event?.pointerType || "mouse"),
      Number.isFinite(event?.button) ? event.button: 0,
      Number.isFinite(event?.clientX) ? Math.round(event.clientX): 0,
      Number.isFinite(event?.clientY) ? Math.round(event.clientY): 0,
    ].join(":");
  }
  function createRecoveredPointerClickGestureId(event, snapshot) {
    return[
      "recovered-pointer",
      getAbsoluteEventTimestamp(event),
      Number.isFinite(event?.clientX) ? Math.round(event.clientX): 0,
      Number.isFinite(event?.clientY) ? Math.round(event.clientY): 0,
      snapshot?.selector || "",
    ].join(":");
  }
  function createKeyboardGestureId(event, snapshot) {
    return[
      "keyboard",
      getAbsoluteEventTimestamp(event),
      snapshot?.target?.localName || snapshot?.target?.tagName || "",
      snapshot?.selector || "",
    ].join(":");
  }
  function omitNullFields(value) {
    if (Array.isArray(value)) {
      const cleanedItems = value.map(omitNullFields).filter(item => item !== null);
      return cleanedItems.length ? cleanedItems: null;
    }
    if (value && typeof value === "object") {
      const cleanedEntries = Object.entries(value).map(([
        key,
        entryValue,
      ]) => [
        key,
        omitNullFields(entryValue),
      ]).filter(([
        ,
        entryValue,
      ]) => entryValue !== null);
      return cleanedEntries.length ? Object.fromEntries(cleanedEntries): null;
    }
    return value === undefined ? null: value;
  }
  function isRealUserFrame() {
    try {
      const url = location.href.toLowerCase();
      return!(url.includes("googleads") || url.includes("doubleclick") || url.includes("recaptcha") || url.includes("openx.net")
      || url.includes("google-bidout") || url.includes("googlesyndication") || url.includes("googleadservices")
      || url.includes("googletagservices") || url.includes("adservice.google") || url.includes("adnxs") || url.includes("rubiconproject")
      || url.includes("pubmatic") || url.includes("criteo") || url.includes("taboola") || url.includes("outbrain"));
    } catch {
      return false;
    }
  }
  function getAttributeValue(element, attributeName) {
    return(element?.getAttribute?.(attributeName) || "");
  }
  function isGraphAttributeNameQuarantined(attributeName) {
    const normalizedName = String(attributeName || "").trim().toLowerCase();
    if (!normalizedName) {
      return false;
    }
    if (GRAPH_ATTRIBUTE_NAME_QUARANTINE.has(normalizedName)) {
      return true;
    }
    return GRAPH_ATTRIBUTE_NAME_PREFIX_QUARANTINE.some(prefix => {
      return normalizedName.startsWith(String(prefix || "").toLowerCase());
    });
  }
  function countCaseTransitions(value) {
    const text = String(value || "");
    let transitions = 0;
    let previousKind = "";
    for (const character of text) {
      let currentKind = "";
      if (/[A-Z]/.test(character)) {
        currentKind = "upper";
      } else if (/[a-z]/.test(character)) {
        currentKind = "lower";
      } else {
        continue;
      }
      if (previousKind && previousKind !== currentKind) {
        transitions += 1;
      }
      previousKind = currentKind;
    }
    return transitions;
  }
  function looksLikeGeneratedAlphaNumericToken(token) {
    const value = String(token || "");
    if (value.length < 16 || !/^[A-Za-z0-9]+$/.test(value)) {
      return false;
    }
    const uppercaseCount = (value.match(/[A-Z]/g) || []).length;
    const lowercaseCount = (value.match(/[a-z]/g) || []).length;
    const digitCount = (value.match(/\d/g) || []).length;
    const letterCount = uppercaseCount + lowercaseCount;
    if (uppercaseCount < 3 || lowercaseCount < 3 || digitCount < 1 || letterCount < 8) {
      return false;
    }
    const uppercaseRatio = uppercaseCount / letterCount;
    if (uppercaseRatio < 0.2) {
      return false;
    }
    if (countCaseTransitions(value) < 5) {
      return false;
    }
    if (new Set(value).size < 10) {
      return false;
    }
    return true;
  }
  function isGraphGeneratedRuntimeValue(value) {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      return false;
    }
    if (GRAPH_GENERATED_RUNTIME_VALUE_PATTERNS.some(pattern => {
      return pattern.test(normalizedValue);
    })) {
      return true;
    }
    const hexadecimalTokens = normalizedValue.match(/[0-9a-f]{10,}/gi) || [];
    for (const token of hexadecimalTokens) {
      if (/[a-f]/i.test(token) && /\d/.test(token)) {
        return true;
      }
    }
    const alphaNumericTokens = normalizedValue.match(/[A-Za-z0-9]{16,}/g) || [];
    for (const token of alphaNumericTokens) {
      if (looksLikeGeneratedAlphaNumericToken(token)) {
        return true;
      }
    }
    return false;
  }
  function isGraphAttributeValueQuarantined(value) {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      return false;
    }
    if (isGraphGeneratedRuntimeValue(normalizedValue)) {
      return true;
    }
    const lowerCaseValue = normalizedValue.toLowerCase();
    return GRAPH_ATTRIBUTE_VALUE_QUARANTINE.some(fragment => {
      const normalizedFragment = String(fragment || "").trim().toLowerCase();
      return(!!normalizedFragment && lowerCaseValue.includes(normalizedFragment));
    });
  }
  function isGraphMutableStateAttributeName(attributeName) {
    const normalizedName = String(attributeName || "").trim().toLowerCase();
    if (!normalizedName) {
      return false;
    }
    return(GRAPH_MUTABLE_STATE_ATTRIBUTE_NAMES.has(normalizedName) || normalizedName.startsWith("data-p-"));
  }
  function isGraphAttributeRejected(attributeName, attributeValue) {
    return(isGraphAttributeNameQuarantined(attributeName) || isGraphMutableStateAttributeName(attributeName)
    || isGraphAttributeValueQuarantined(attributeValue));
  }
  function getNonQuarantinedAttributeValue(element, attributeName) {
    const value = getAttributeValue(element, attributeName);
    return isGraphAttributeRejected(attributeName, value) ? "": value;
  }
  function getNonQuarantinedAttributes(element) {
    return Array.from(element?.attributes || []).filter(attribute => {
      const attributeName = String(attribute?.name || "").trim().toLowerCase();
      if (!attributeName) {
        return false;
      }
      if (attributeName === RECORDER_INSTALL_ATTRIBUTE || attributeName.startsWith("data-pw-recorder-")) {
        return false;
      }
      return!isGraphAttributeRejected(attributeName, attribute.value);
    });
  }
  function getElementText(element) {
    return(element?.innerText?.replace(/\s+/g, " ").trim() || "");
  }
  function normalizeGraphTextValue(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
  function isRepeatedCompositeGraphText(value) {
    const text = normalizeGraphTextValue(value);
    if (text.length < 2 || text.length % 2 !== 0) {
      return false;
    }
    const half = text.length / 2;
    return text.slice(0, half) === text.slice(half);
  }
  function getGraphTextProfile(element) {
    if (!(element instanceof Element)) {
      return null;
    }
    const fullText = normalizeGraphTextValue(element.textContent);
    if (!fullText) {
      return null;
    }
    const directTextParts = Array.from(element.childNodes || []).filter(node => {
      return node.nodeType === Node.TEXT_NODE && !!normalizeGraphTextValue(node.nodeValue);
    }).map(node => normalizeGraphTextValue(node.nodeValue));
    if (directTextParts.length > 1 || (directTextParts.length === 1 && element.children.length > 0)) {
      const directText = directTextParts[0];
      if (isRepeatedCompositeGraphText(directText)) {
        return null;
      }
      return {
        value: directText,
        exactPredicate: `text()[normalize-space()=${xpathLiteral(directText)}]`,
        containsPredicate: snippet => `text()[contains(normalize-space(), ${xpathLiteral(snippet)})]`,
        mode: "direct-text-node",
      };
    }
    if (element.children.length === 0) {
      if (isRepeatedCompositeGraphText(fullText)) {
        return null;
      }
      return {
        value: fullText,
        exactPredicate: `normalize-space(.)=${xpathLiteral(fullText)}`,
        containsPredicate: snippet => `contains(normalize-space(.), ${xpathLiteral(snippet)})`,
        mode: "leaf-text",
      };
    }
    const tagName = String(element.localName || element.tagName || "").toLowerCase();
    const role = String(element.getAttribute("role") || "").toLowerCase();
    const ownsSemanticDescendantText = [
      "button",
      "a",
      "label",
      "option",
      "li",
      "summary",
      "legend",
      "th",
    ].includes(tagName) || [
      "button",
      "link",
      "menuitem",
      "option",
      "tab",
    ].includes(role);
    if (!ownsSemanticDescendantText || isRepeatedCompositeGraphText(fullText)
    || element.querySelector("input, textarea, select, button, [contenteditable='true']")) {
      return null;
    }
    return {
      value: fullText,
      exactPredicate: `normalize-space(.)=${xpathLiteral(fullText)}`,
      containsPredicate: snippet => `contains(normalize-space(.), ${xpathLiteral(snippet)})`,
      mode: "semantic-descendant-text",
    };
  }
  function getGraphNormalizedText(element) {
    return getGraphTextProfile(element)?.value || "";
  }
  function xpathLiteral(value) {
    value = String(value);
    if (!value.includes("'")) {
      return `'${value}'`;
    }
    if (!value.includes('"')) {
      return `"${value}"`;
    }
    return("concat(" + value.split("'").map(part => {
      return `'${part}'`;
    }).join(', "\'", ') + ")");
  }
  function getXPathTag(element) {
    const tag = element.localName || element.tagName.toLowerCase();
    if (element.namespaceURI === "http://www.w3.org/2000/svg") {
      return(`*[local-name()=` + `${xpathLiteral(
          tag
        )}]`);
    }
    return tag;
  }
  function matchesOnlyElement(xpath, targetElement) {
    try {
      const doc = targetElement?.ownerDocument || document;
      const result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return(result.snapshotLength === 1 && result.snapshotItem(0) === targetElement);
    } catch {
      return false;
    }
  }
  function xpathContainsElement(xpath, targetElement) {
    try {
      const doc = targetElement?.ownerDocument || document;
      const result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let index = 0; index < result.snapshotLength; index += 1) {
        if (result.snapshotItem(index) === targetElement) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
  function matchesOnlyElementInScope(scopeElement, relativeXPath, targetElement) {
    try {
      const doc = targetElement?.ownerDocument || document;
      const result = doc.evaluate(relativeXPath, scopeElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return(result.snapshotLength === 1 && result.snapshotItem(0) === targetElement);
    } catch {
      return false;
    }
  }
  function xpathContainsElementInScope(scopeElement, relativeXPath, targetElement) {
    try {
      const doc = targetElement?.ownerDocument || document;
      const result = doc.evaluate(relativeXPath, scopeElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let index = 0; index < result.snapshotLength; index += 1) {
        if (result.snapshotItem(index) === targetElement) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
  function isSvgElement(element) {
    return(!!element && typeof element.tagName === "string" && (element.tagName.toLowerCase() === "svg" || element.namespaceURI === "http://www.w3.org/2000/svg"));
  }
  function isSvgInteractionOwner(element) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return false;
    }
    const tagName = String(element.localName || element.tagName || "").toLowerCase();
    if ([
      "a",
      "button",
      "input",
      "label",
      "option",
      "select",
      "summary",
      "textarea",
    ].includes(tagName)) {
      return true;
    }
    const role = String(element.getAttribute("role") || "").trim().toLowerCase();
    if ([
      "button",
      "checkbox",
      "combobox",
      "link",
      "listbox",
      "menuitem",
      "option",
      "radio",
      "switch",
      "tab",
      "treeitem",
    ].includes(role)) {
      return true;
    }
    const ariaHasPopup = String(element.getAttribute("aria-haspopup") || "").trim().toLowerCase();
    if (ariaHasPopup && ariaHasPopup !== "false") {
      return true;
    }
    const primeComponentName = String(element.getAttribute("data-pc-name") || "").trim().toLowerCase();
    const primeComponentSection = String(element.getAttribute("data-pc-section") || "").trim().toLowerCase();
    if ((primeComponentSection === "root" || !primeComponentSection) &&[
      "autocomplete",
      "cascadeselect",
      "dropdown",
      "multiselect",
      "select",
      "treeselect",
    ].includes(primeComponentName)) {
      return true;
    }
    return typeof element.onclick === "function" || element.hasAttribute("onclick")
    || (element.hasAttribute("tabindex") && Number(element.getAttribute("tabindex")) >= 0);
  }
  function getNearestSvgRoot(element) {
    if (!isSvgElement(element)) {
      return null;
    }
    let current = element;
    while (current instanceof Element && isSvgElement(current)) {
      if (String(current.localName || current.tagName || "").toLowerCase() === "svg") {
        return current;
      }
      current = current.parentElement;
    }
    return element;
  }
  function getRecordableSvgClickTarget(element) {
    if (!isSvgElement(element)) {
      return element instanceof Element ? element: null;
    }
    if (isSvgInteractionOwner(element)) {
      return element;
    }
    const svgRoot = getNearestSvgRoot(element);
    let current = element.parentElement;
    let depth = 0;
    while (current instanceof Element && depth < 16) {
      if (isRecorderOverlayElement(current)) {
        return null;
      }
      if (isSvgInteractionOwner(current)) {
        return current;
      }
      const tagName = String(current.localName || current.tagName || "").toLowerCase();
      if (tagName === "html" || tagName === "body") {
        break;
      }
      current = current.parentElement;
      depth += 1;
    }
    /*
     * XPath cannot cross a ShadowRoot. Promote an SVG hit inside shadow DOM to
     * the first reachable host, or to an outer interactive owner of that host.
     */
    let shadowCandidate = element;
    let documentReachableHost = null;
    depth = 0;
    while (shadowCandidate instanceof Element && depth < 16) {
      const root = shadowCandidate.getRootNode?.();
      if (root === shadowCandidate.ownerDocument) {
        break;
      }
      const host = root?.host;
      if (!(host instanceof Element) || isRecorderOverlayElement(host)) {
        return null;
      }
      documentReachableHost = host;
      shadowCandidate = host;
      depth += 1;
    }
    if (documentReachableHost instanceof Element
    && documentReachableHost.getRootNode?.() === documentReachableHost.ownerDocument) {
      current = documentReachableHost;
      depth = 0;
      while (current instanceof Element && depth < 16) {
        if (isSvgInteractionOwner(current)) {
          return current;
        }
        const parent = current.parentElement;
        if (!(parent instanceof Element)) {
          break;
        }
        current = parent;
        depth += 1;
      }
      return documentReachableHost;
    }
    if (svgRoot instanceof Element && svgRoot.getRootNode?.() === svgRoot.ownerDocument) {
      return svgRoot;
    }
    return svgRoot || element;
  }
  function getXPathFriendlyTarget(element) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return null;
    }
    if (!isSvgElement(element)) {
      return element;
    }
    let current = element;
    while (current && current.parentElement) {
      current = current.parentElement;
      if (isRecorderOverlayElement(current)) {
        return null;
      }
      if (!isSvgElement(current)) {
        return current;
      }
    }
    return element;
  }
  function getChoiceInputNeighborText(element) {
    if (!(element instanceof HTMLInputElement)) {
      return "";
    }
    const type = getAttributeValue(element, "type").toLowerCase();
    if (type !== "radio" && type !== "checkbox") {
      return "";
    }
    const labelText = getElementText(element.closest("label"));
    if (labelText) {
      return labelText.slice(0, 120);
    }
    const labelledBy = getNonQuarantinedAttributeValue(element, "aria-labelledby");
    if (labelledBy) {
      const text = labelledBy.split(/\s+/).map(id => {
        return getElementText(document.getElementById(id));
      }).filter(Boolean).join(" ");
      if (text) {
        return text.slice(0, 120);
      }
    }
    const blockText = getElementText(element.closest('tr, [role="row"], li, [role="option"]'));
    if (blockText) {
      return blockText.slice(0, 120);
    }
    let current = element.parentElement;
    for (let depth = 0; current && depth < 4; depth += 1, current = current.parentElement) {
      const text = getElementText(current);
      if (text && text.length <= 120) {
        return text;
      }
    }
    return "";
  }
  function isGraphAttributeEligible(attribute) {
    if (!attribute) {
      return false;
    }
    const name = String(attribute.name || "").trim().toLowerCase();
    const value = String(attribute.value || "");
    const trimmedValue = value.trim();
    if (!name || !trimmedValue) {
      return false;
    }
    if (isGraphAttributeRejected(name, trimmedValue)) {
      return false;
    }
    if (name === RECORDER_INSTALL_ATTRIBUTE || name.startsWith("data-pw-recorder-")) {
      return false;
    }
    if (/^on[a-z]/i.test(name)) {
      return false;
    }
    if (name === "style" || name === "class") {
      return false;
    }
    if (trimmedValue.length > 220) {
      return false;
    }
    return true;
  }
  function getGraphAttributeStabilityPenalty(attribute) {
    const name = String(attribute.name || "").trim().toLowerCase();
    const value = String(attribute.value || "").trim();
    if (isGraphAttributeRejected(name, value)) {
      return Number.POSITIVE_INFINITY;
    }
    let penalty = 0;
    if (value.length <= 2) {
      penalty += 7;
    }
    if (value.length > 80) {
      penalty += 6;
    }
    if (value.length > 140) {
      penalty += 10;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      penalty += 28;
    }
    if (/^[0-9a-f_-]{14,}$/i.test(value)) {
      penalty += 20;
    }
    if (/\d{5,}/.test(value)) {
      penalty += 14;
    }
    const digitCount = (value.match(/\d/g) || []).length;
    if (value.length >= 6 && digitCount / value.length > 0.5) {
      penalty += 12;
    }
    if (/[?&#=]/.test(value)) {
      penalty += 6;
    }
    if (/^(true|false|null|undefined|none|on|off)$/i.test(value)) {
      penalty += 9;
    }
    if (name.length <= 2) {
      penalty += 2;
    }
    return penalty;
  }
  function getGraphTextStabilityPenalty(text) {
    const value = String(text || "").trim();
    let penalty = 40;
    if (value.length <= 3) {
      penalty += 12;
    }
    if (value.length > 60) {
      penalty += 5;
    }
    if (/\d{5,}/.test(value)) {
      penalty += 16;
    }
    const digitCount = (value.match(/\d/g) || []).length;
    if (value.length >= 6 && digitCount / value.length > 0.4) {
      penalty += 12;
    }
    if (/\b\d{1,2}[/:.-]\d{1,2}[/:.-]\d{2,4}\b/.test(value) || /\b\d{1,2}:\d{2}\b/.test(value)) {
      penalty += 14;
    }
    return penalty;
  }
  function getGraphElementKindKey(element) {
    return(`${element.namespaceURI || ""}` + "\u0000" + `${element.localName || ""}`);
  }
  function createGraphAttributeKey(element, attributeName, attributeValue) {
    return(`${getGraphElementKindKey(
        element
      )}` + "\u0000attribute\u0000" + `${attributeName}` + "\u0000" + `${attributeValue}`);
  }
  function createGraphTextKey(element, normalizedText) {
    return(`${getGraphElementKindKey(
        element
      )}` + "\u0000normalize-space\u0000" + `${normalizedText}`);
  }
  const graphElementIdentityMap = new WeakMap();
  let graphElementIdentitySequence = 0;
  function getGraphElementIdentity(element) {
    if (!(element instanceof Element)) {
      return 0;
    }
    let identity = graphElementIdentityMap.get(element);
    if (!identity) {
      graphElementIdentitySequence += 1;
      identity = graphElementIdentitySequence;
      graphElementIdentityMap.set(element, identity);
    }
    return identity;
  }
  function getGraphCandidateStorageKey(candidate) {
    return(`${candidate.key}` + "\u0000node\u0000" + `${getGraphElementIdentity(
        candidate.element
      )}`);
  }
  function compareGraphTraversalPath(leftPath, rightPath) {
    const length = Math.max(leftPath.length, rightPath.length);
    for (let index = 0; index < length; index += 1) {
      const leftValue = index < leftPath.length ? leftPath[index]: - 1;
      const rightValue = index < rightPath.length ? rightPath[index]: - 1;
      if (leftValue !== rightValue) {
        return(leftValue - rightValue);
      }
    }
    return 0;
  }
  function cloneGraphTraversalPath(path) {
    return Array.isArray(path) ? path.slice(): [];
  }
  function addLocalGraphCandidate(candidates, candidate) {
    if (candidate.kind === "attribute" && isGraphAttributeRejected(candidate.attributeName, candidate.attributeValue)) {
      return;
    }
    const storageKey = getGraphCandidateStorageKey(candidate);
    const existing = candidates.get(storageKey);
    if (!existing) {
      candidates.set(storageKey, candidate);
      return;
    }
    const pathComparison = compareGraphTraversalPath(candidate.traversalPath, existing.traversalPath);
    if (pathComparison < 0 || (pathComparison === 0 && candidate.graphCost < existing.graphCost)) {
      candidates.set(storageKey, candidate);
    }
  }
  function isGraphSearchElementAllowed(element, target) {
    if (!(element instanceof Element) || !element.isConnected || element.ownerDocument !== target.ownerDocument
    || isRecorderOverlayElement(element)) {
      return false;
    }
    if (element.tagName === "HTML" || element.tagName === "BODY") {
      return false;
    }
    return true;
  }
  function getGraphEdge(from, to, type) {
    return {
      from,
      to,
      type,
      cost: GRAPH_EDGE_COST[type],
    };
  }
  function collectGraphCandidatesFromState(state, candidates, traversalOrder) {
    for (const attribute of Array.from(state.element.attributes || [])) {
      if (!isGraphAttributeEligible(attribute)) {
        continue;
      }
      const value = String(attribute.value);
      if (isGraphAttributeRejected(attribute.name, value)) {
        continue;
      }
      const key = createGraphAttributeKey(state.element, attribute.name, value);
      addLocalGraphCandidate(candidates, {
        kind: "attribute",
        key,
        element: state.element,
        attributeName: attribute.name,
        attributeValue: value,
        graphCost: state.cost,
        traversalOrder,
        traversalPath: cloneGraphTraversalPath(state.traversalPath),
        stabilityPenalty: getGraphAttributeStabilityPenalty(attribute),
        pathFromTarget: state.pathFromTarget.slice(),
      });
    }
    const textProfile = getGraphTextProfile(state.element);
    const normalizedText = textProfile?.value || "";
    if (textProfile && normalizedText.length <= 80) {
      const key = createGraphTextKey(state.element, normalizedText);
      addLocalGraphCandidate(candidates, {
        kind: "text",
        key,
        element: state.element,
        textValue: normalizedText,
        textPredicate: textProfile.exactPredicate,
        textContainsPredicate: textProfile.containsPredicate,
        textMode: textProfile.mode,
        graphCost: state.cost,
        traversalOrder,
        traversalPath: cloneGraphTraversalPath(state.traversalPath),
        stabilityPenalty: getGraphTextStabilityPenalty(normalizedText),
        pathFromTarget: state.pathFromTarget.slice(),
      });
    }
  }
  function getSurroundingGraphSiblingEntries(element, basePathFromTarget, baseCost) {
    const entries = [];
    let previous = element?.previousElementSibling || null;
    let next = element?.nextElementSibling || null;
    let previousFrom = element;
    let nextFrom = element;
    let previousPath = basePathFromTarget.slice();
    let nextPath = basePathFromTarget.slice();
    let distance = 1;
    while ((previous || next) && entries.length < GRAPH_XPATH_MAX_SIBLINGS_PER_LEVEL) {
      if (previous) {
        const edge = getGraphEdge(previousFrom, previous, "PREVIOUS_SIBLING");
        previousPath = [
          ...previousPath,
          edge,
        ];
        entries.push({
          element: previous,
          cost: baseCost + GRAPH_EDGE_COST.PREVIOUS_SIBLING,
          pathFromTarget: previousPath.slice(),
          distance,
          directionPriority: 0,
        });
        previousFrom = previous;
        previous = previous.previousElementSibling;
      }
      if (next && entries.length < GRAPH_XPATH_MAX_SIBLINGS_PER_LEVEL) {
        const edge = getGraphEdge(nextFrom, next, "NEXT_SIBLING");
        nextPath = [
          ...nextPath,
          edge,
        ];
        entries.push({
          element: next,
          cost: baseCost + GRAPH_EDGE_COST.NEXT_SIBLING,
          pathFromTarget: nextPath.slice(),
          distance,
          directionPriority: 1,
        });
        nextFrom = next;
        next = next.nextElementSibling;
      }
      distance += 1;
    }
    return entries;
  }
  /*
   * Deterministic upward-only rings:
   * target -> target siblings -> parent -> parent siblings -> each parent's
   * peer's direct children -> grandparent...
   * Peer children are inspected as anchors, but traversal never enters their
   * children or grandchildren.
   */
  function * iterateHierarchicalGraphStates(target, cancellation = null) {
    const visited = new Set();
    let yieldedCount = 0;
    let current = target;
    let currentCost = 0;
    let currentPathFromTarget = [];
    let ancestorLevel = 0;
    while (isGraphSearchElementAllowed(current, target) && yieldedCount < GRAPH_XPATH_MAX_VISITED
    && ancestorLevel <= GRAPH_SCOPED_RECOVERY_MAX_ANCESTOR_DEPTH) {
      if (cancellation?.cancelled) {
        return;
      }
      if (!visited.has(current) && currentCost <= GRAPH_XPATH_MAX_COST) {
        visited.add(current);
        yieldedCount += 1;
        yield {
          element: current,
          cost: currentCost,
          isAncestor: ancestorLevel > 0,
          traversalPath: ancestorLevel === 0 ? []: [
            GRAPH_TRAVERSAL_PRIORITY.ASCEND_TO_PARENT,
            ancestorLevel,
            0,
          ],
          pathFromTarget: currentPathFromTarget.slice(),
          sequence: yieldedCount,
        };
      }
      const siblingEntries = getSurroundingGraphSiblingEntries(current, currentPathFromTarget, currentCost).filter(entry => {
        return entry.cost <= GRAPH_XPATH_MAX_COST && isGraphSearchElementAllowed(entry.element, target);
      });
      for (const entry of siblingEntries) {
        if (cancellation?.cancelled || yieldedCount >= GRAPH_XPATH_MAX_VISITED) {
          return;
        }
        if (visited.has(entry.element)) {
          continue;
        }
        visited.add(entry.element);
        yieldedCount += 1;
        yield {
          element: entry.element,
          cost: entry.cost,
          isAncestor: false,
          traversalPath: ancestorLevel === 0 ? [
            GRAPH_TRAVERSAL_PRIORITY.SIBLING_PEERS,
            entry.distance,
            entry.directionPriority,
          ]: [
            GRAPH_TRAVERSAL_PRIORITY.ASCEND_TO_PARENT,
            ancestorLevel,
            1,
            entry.distance,
            entry.directionPriority,
          ],
          pathFromTarget: entry.pathFromTarget.slice(),
          sequence: yieldedCount,
        };
      }
      if (ancestorLevel > 0) {
        let peerChildrenScanned = 0;
        for (let peerIndex = 0; peerIndex < siblingEntries.length; peerIndex += 1) {
          const peerEntry = siblingEntries[peerIndex];
          const peerChildren = Array.from(peerEntry.element.children || []);
          for (let childIndex = 0; childIndex < peerChildren.length; childIndex += 1) {
            if (cancellation?.cancelled || yieldedCount >= GRAPH_XPATH_MAX_VISITED
            || peerChildrenScanned >= GRAPH_XPATH_MAX_PEER_CHILDREN_PER_RING) {
              break;
            }
            peerChildrenScanned += 1;
            const child = peerChildren[childIndex];
            const childCost = peerEntry.cost + GRAPH_EDGE_COST.CHILD;
            if (childCost > GRAPH_XPATH_MAX_COST || visited.has(child) || !isGraphSearchElementAllowed(child, target)) {
              continue;
            }
            visited.add(child);
            yieldedCount += 1;
            yield {
              element: child,
              cost: childCost,
              isAncestor: false,
              traversalPath: [
                GRAPH_TRAVERSAL_PRIORITY.ASCEND_TO_PARENT,
                ancestorLevel,
                2,
                peerIndex,
                childIndex,
              ],
              pathFromTarget: [
                ...peerEntry.pathFromTarget,
                getGraphEdge(peerEntry.element, child, "CHILD"),
              ],
              sequence: yieldedCount,
            };
          }
          if (cancellation?.cancelled) {
            return;
          }
          if (peerChildrenScanned >= GRAPH_XPATH_MAX_PEER_CHILDREN_PER_RING || yieldedCount >= GRAPH_XPATH_MAX_VISITED) {
            break;
          }
        }
      }
      const parent = current.parentElement;
      if (!isGraphSearchElementAllowed(parent, target)) {
        break;
      }
      currentPathFromTarget = [
        ...currentPathFromTarget,
        getGraphEdge(current, parent, "PARENT"),
      ];
      currentCost += GRAPH_EDGE_COST.PARENT;
      current = parent;
      ancestorLevel += 1;
    }
  }
  /*
   * Independent downward breadth-first traversal. It runs against the same
   * immutable pointerdown document as the upward graph. A leaf target simply
   * produces no downward states and finishes immediately.
   */
  function * iterateDownwardGraphStates(target, cancellation = null) {
    if (!(target instanceof Element) || isRecorderOverlayElement(target)) {
      return;
    }
    const queue = [];
    const visited = new Set([
      target,
    ]);
    const enqueueChildren = (parent, depth, parentPath) => {
      if (depth > GRAPH_DOWNWARD_MAX_DEPTH || queue.length >= GRAPH_DOWNWARD_MAX_VISITED) {
        return;
      }
      for (const child of Array.from(parent.children || [])) {
        if (queue.length >= GRAPH_DOWNWARD_MAX_VISITED) {
          break;
        }
        if (visited.has(child) || !isGraphSearchElementAllowed(child, target)) {
          continue;
        }
        visited.add(child);
        queue.push({
          element: child,
          depth,
          pathFromTarget: [
            ...parentPath,
            getGraphEdge(parent, child, "CHILD"),
          ],
        });
      }
    };
    enqueueChildren(target, 1, []);
    for (let queueIndex = 0; queueIndex < queue.length && queueIndex < GRAPH_DOWNWARD_MAX_VISITED; queueIndex += 1) {
      if (cancellation?.cancelled) {
        return;
      }
      const entry = queue[queueIndex];
      yield {
        element: entry.element,
        cost: entry.depth * GRAPH_EDGE_COST.CHILD,
        isAncestor: false,
        traversalPath: [
          GRAPH_TRAVERSAL_PRIORITY.DESCEND_BELOW,
          entry.depth,
          queueIndex,
        ],
        pathFromTarget: entry.pathFromTarget.slice(),
        sequence: queueIndex + 1,
      };
      if (entry.depth < GRAPH_DOWNWARD_MAX_DEPTH) {
        enqueueChildren(entry.element, entry.depth + 1, entry.pathFromTarget);
      }
    }
  }
  function collectGraphCandidates(target) {
    const candidates = new Map();
    let traversalOrder = 0;
    for (const state of iterateHierarchicalGraphStates(target)) {
      collectGraphCandidatesFromState(state, candidates, traversalOrder);
      traversalOrder += 1;
    }
    if (traversalOrder >= GRAPH_XPATH_MAX_VISITED) {
      console.warn("[graph-recorder] Graph traversal reached the hard visited-element ceiling:", GRAPH_XPATH_MAX_VISITED);
    }
    return candidates;
  }
  function getGraphTextSnippet(value) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    if (normalized.length < 12) {
      return "";
    }
    const tentative = normalized.slice(0, 48);
    const lastSpace = tentative.lastIndexOf(" ");
    if (lastSpace >= 16) {
      return tentative.slice(0, lastSpace).trim();
    }
    return tentative.trim();
  }
  function deriveGraphStableFragments(rawValue) {
    const value = String(rawValue || "").trim();
    if (isGraphAttributeValueQuarantined(value)) {
      return[];
    }
    if (value.length < 6) {
      return[];
    }
    const fragments = new Set();
    const addFragment = fragment => {
      const cleaned = String(fragment || "").replace(/^[\s_.:/?#&=-]+|[\s_.:/?#&=-]+$/g, "").trim();
      if (!cleaned || isGraphAttributeValueQuarantined(cleaned)) {
        return;
      }
      if (cleaned.length < 5 || cleaned.length >= value.length || /^\d+$/.test(cleaned)) {
        return;
      }
      fragments.add(cleaned);
    };
    for (const fragment of value.split(/(?:\d{2,}|[0-9a-f]{10,}|[?&#=]+)/gi)) {
      addFragment(fragment);
    }
    for (const fragment of value.split(/[\s_.:/?#&=-]+/)) {
      addFragment(fragment);
    }
    const prefixMatch = value.match(/^[^\d]{5,}/);
    if (prefixMatch) {
      addFragment(prefixMatch[0]);
    }
    const suffixMatch = value.match(/[^\d]{5,}$/);
    if (suffixMatch) {
      addFragment(suffixMatch[0]);
    }
    return Array.from(fragments).sort((left, right) => right.length - left.length).slice(0, 3);
  }
  function canUseDirectXPathAttributeName(attributeName) {
    const name = String(attributeName || "").trim();
    if (!name) {
      return false;
    }
    if (/[\s:;]/.test(name)) {
      return false;
    }
    return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(name);
  }
  function getGraphExactAttributePredicate(attributeName, attributeValue) {
    const name = String(attributeName || "").trim();
    if (isGraphAttributeRejected(name, attributeValue)) {
      return "";
    }
    if (canUseDirectXPathAttributeName(name)) {
      return(`@${name}=` + `${xpathLiteral(
          attributeValue
        )}`);
    }
    return(`@*[name()=` + `${xpathLiteral(
        name
      )}` + ` and .=` + `${xpathLiteral(
        attributeValue
      )}]`);
  }
  function getGraphStartsWithAttributePredicate(attributeName, fragment) {
    const name = String(attributeName || "").trim();
    if (isGraphAttributeRejected(name, fragment)) {
      return "";
    }
    if (canUseDirectXPathAttributeName(name)) {
      return(`starts-with(` + `@${name}, ` + `${xpathLiteral(
          fragment
        )})`);
    }
    return(`@*[name()=` + `${xpathLiteral(
        name
      )}` + ` and starts-with(., ` + `${xpathLiteral(
        fragment
      )})]`);
  }
  function getGraphContainsAttributePredicate(attributeName, fragments) {
    const name = String(attributeName || "").trim();
    if (isGraphAttributeNameQuarantined(name) || isGraphMutableStateAttributeName(name) || fragments.some(fragment => {
      return isGraphAttributeValueQuarantined(fragment);
    })) {
      return "";
    }
    if (canUseDirectXPathAttributeName(name)) {
      return fragments.map(fragment => {
        return(`contains(` + `@${name}, ` + `${xpathLiteral(
                fragment
              )})`);
      }).join(" and ");
    }
    const conditions = fragments.map(fragment => {
      return(`contains(., ` + `${xpathLiteral(
              fragment
            )})`);
    });
    return(`@*[name()=` + `${xpathLiteral(
        name
      )}` + ` and ` + `${conditions.join(
        " and "
      )}]`);
  }
  function isAcceptableGraphXPath(xpath) {
    return(!!xpath && xpath.length <= GRAPH_XPATH_MAX_LENGTH);
  }
  function containsNumericPosition(xpath) {
    const text = String(xpath || "");
    return(/\[\s*\d+\s*\]/.test(text) || /\[\s*position\s*\(/i.test(text) || /\[\s*last\s*\(/i.test(text));
  }
  function containsExplicitChildAxis(xpath) {
    return /\/child::/i.test(String(xpath || ""));
  }
  function containsBlacklistedClassRecoveryToken(xpath) {
    const text = String(xpath || "");
    if (!/@class/i.test(text)) {
      return false;
    }
    return GRAPH_CLASS_RECOVERY_TOKEN_QUARANTINE_PATTERNS.some(pattern => pattern.test(text));
  }
  function isAbsoluteDocumentFallbackXPath(xpath) {
    return /^\/html(?:\[|\/|$)/i.test(String(xpath || "").trim());
  }
  function isContextDependentSelectorTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }
    const tagName = String(target.localName || target.tagName || "").toLowerCase();
    const role = String(target.getAttribute("role") || "").trim().toLowerCase();
    if (STRICT_CONTEXT_ELEMENT_TAGS.has(tagName) || STRICT_CONTEXT_ELEMENT_ROLES.has(role)) {
      return true;
    }
    for (const attributeName of STRICT_CONTEXT_LOCAL_ATTRIBUTE_NAMES) {
      if (target.hasAttribute(attributeName)) {
        return true;
      }
    }
    return false;
  }
  function xpathReferencesAttribute(xpath, attributeName) {
    const escapedName = escapeRegularExpression(attributeName);
    return new RegExp(`@${escapedName}(?=[\\s=\\]\\),])`, "i").test(String(xpath || ""));
  }
  function xpathHasStableGlobalIdentity(xpath) {
    return STRICT_CONTEXT_GLOBAL_ATTRIBUTE_NAMES.some(attributeName => {
      return xpathReferencesAttribute(xpath, attributeName);
    });
  }
  function xpathHasAdditionalUnquotedPathStep(xpath) {
    const text = String(xpath || "").trim();
    const remainder = text.startsWith("//") ? text.slice(2): text;
    let quote = "";
    for (const character of remainder) {
      if (quote) {
        if (character === quote) {
          quote = "";
        }
        continue;
      }
      if (character === "'" || character === '"') {
        quote = character;
        continue;
      }
      if (character === "/") {
        return true;
      }
    }
    return false;
  }
  function passesStrictContextStabilityPolicy(xpath, target) {
    if (!(target instanceof Element) || !isContextDependentSelectorTarget(target)) {
      return true;
    }
    /*
     * Local option values/text are commonly cloned into another hidden or
     * subsequently opened dropdown. They are not globally stable identities.
     * A strong globally intended attribute may stand alone; everything else
     * must be tied to an ancestor/sibling/nearby-anchor path.
     */
    return xpathHasStableGlobalIdentity(xpath) || xpathHasAdditionalUnquotedPathStep(xpath);
  }
  function escapeRegularExpression(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function containsQuarantinedAttributeValue(xpath) {
    const xpathText = String(xpath || "");
    const normalizedXPath = xpathText.toLowerCase();
    if (!normalizedXPath) {
      return false;
    }
    for (const attributeName of GRAPH_ATTRIBUTE_NAME_QUARANTINE) {
      const escapedName = escapeRegularExpression(attributeName);
      const directAttributePattern = new RegExp(`@${escapedName}` + `(?=[\\s=\\]\\),])`, "i");
      const nameFunctionPattern = new RegExp(`name\\(\\)\\s*=\\s*` + `(?:'${escapedName}'|` + `"${escapedName}")`, "i");
      if (directAttributePattern.test(xpathText) || nameFunctionPattern.test(xpathText)) {
        return true;
      }
    }
    const nameFunctionLiteralPattern = /name\(\)\s*=\s*(?:'([^']*)'|"([^"]*)")/gi;
    let nameMatch;
    while ((nameMatch = nameFunctionLiteralPattern.exec(xpathText)) !== null) {
      const attributeName = nameMatch[1] ?? nameMatch[2] ?? "";
      if (isGraphAttributeNameQuarantined(attributeName)) {
        return true;
      }
    }
    const quotedLiteralPattern = /'([^']*)'|"([^"]*)"/g;
    let match;
    while ((match = quotedLiteralPattern.exec(xpathText)) !== null) {
      const literal = match[1] ?? match[2] ?? "";
      if (isGraphAttributeNameQuarantined(literal) || isGraphAttributeValueQuarantined(literal)) {
        return true;
      }
    }
    return GRAPH_ATTRIBUTE_VALUE_QUARANTINE.some(fragment => {
      const normalizedFragment = String(fragment || "").trim().toLowerCase();
      return(!!normalizedFragment && normalizedXPath.includes(normalizedFragment));
    });
  }
  function containsMutableStateAttributeReference(xpath) {
    const normalizedXPath = String(xpath || "").toLowerCase();
    if (!normalizedXPath) {
      return false;
    }
    if (/@data-p(?:\b|-)/i.test(normalizedXPath)) {
      return true;
    }
    for (const attributeName of GRAPH_MUTABLE_STATE_ATTRIBUTE_NAMES) {
      const escapedName = escapeRegularExpression(attributeName);
      const directAttributePattern = new RegExp(`@${escapedName}(?=[\\s=\\]\\),])`, "i");
      if (directAttributePattern.test(normalizedXPath)) {
        return true;
      }
      if (normalizedXPath.includes(`name()='${attributeName}'`) || normalizedXPath.includes(`name()="${attributeName}"`)) {
        return true;
      }
    }
    return false;
  }
  function isSafeFinalGraphXPath(xpath, target = null) {
    if (!xpath || !isAcceptableGraphXPath(xpath) || containsNumericPosition(xpath) || containsExplicitChildAxis(xpath)
    || containsBlacklistedClassRecoveryToken(xpath) || isAbsoluteDocumentFallbackXPath(xpath) || containsQuarantinedAttributeValue(xpath)
    || containsMutableStateAttributeReference(xpath)) {
      return false;
    }
    if (target instanceof Element && (!passesStrictContextStabilityPolicy(xpath, target)
    || !matchesOnlyElement(xpath, target))) {
      return false;
    }
    return true;
  }
  function pushGraphVariant(variants, seen, variant) {
    if (!variant?.xpath || seen.has(variant.xpath) || !isSafeFinalGraphXPath(variant.xpath)) {
      return;
    }
    seen.add(variant.xpath);
    variants.push(variant);
  }
  function appendScopedGraphAnchorVariants(element, variants, seen) {
    const scopedVariants = getGraphScopedNodeVariants(element, false);
    for (const scopedVariant of scopedVariants) {
      const xpath = `//${scopedVariant.nodeTest}`;
      if (!xpathContainsElement(xpath, element)) {
        continue;
      }
      pushGraphVariant(variants, seen, {
        xpath,
        score: scopedVariant.score + 4,
        strategy: `graph-node-${scopedVariant.strategy}`,
      });
    }
  }
  function getGraphAnchorVariants(candidate) {
    const variants = [];
    const seen = new Set();
    const element = candidate.element;
    const tag = getXPathTag(element);
    if (candidate.kind === "text") {
      const exactTextXPath = candidate.textPredicate ? `//${tag}[${candidate.textPredicate}]`: "";
      if (xpathContainsElement(exactTextXPath, element)) {
        pushGraphVariant(variants, seen, {
          xpath: exactTextXPath,
          score: 0,
          strategy: "normalize-space-anchor",
        });
      }
      const snippet = getGraphTextSnippet(candidate.textValue);
      if (snippet && snippet !== candidate.textValue) {
        const containsTextPredicate = typeof candidate.textContainsPredicate === "function" ? candidate.textContainsPredicate(snippet): "";
        const containsTextXPath = containsTextPredicate ? `//${tag}[${containsTextPredicate}]`: "";
        if (xpathContainsElement(containsTextXPath, element)) {
          pushGraphVariant(variants, seen, {
            xpath: containsTextXPath,
            score: 12,
            strategy: "contains-normalized-text-anchor",
          });
        }
      }
      appendScopedGraphAnchorVariants(element, variants, seen);
      return variants;
    }
    if (isGraphAttributeRejected(candidate.attributeName, candidate.attributeValue)) {
      return variants;
    }
    const exactPredicate = getGraphExactAttributePredicate(candidate.attributeName, candidate.attributeValue);
    if (!exactPredicate) {
      return variants;
    }
    const exactXPath = `//${tag}` + `[` + `${exactPredicate}]`;
    if (xpathContainsElement(exactXPath, element)) {
      pushGraphVariant(variants, seen, {
        xpath: exactXPath,
        score: 0,
        strategy: "exact-attribute-anchor",
      });
    }
    const fragments = deriveGraphStableFragments(candidate.attributeValue);
    for (const fragment of fragments) {
      if (isGraphAttributeValueQuarantined(fragment)) {
        continue;
      }
      if (String(candidate.attributeValue).startsWith(fragment)) {
        const startsWithPredicate = getGraphStartsWithAttributePredicate(candidate.attributeName, fragment);
        if (startsWithPredicate) {
          const startsWithXPath = `//${tag}` + `[` + `${startsWithPredicate}]`;
          if (xpathContainsElement(startsWithXPath, element)) {
            pushGraphVariant(variants, seen, {
              xpath: startsWithXPath,
              score: 8,
              strategy: "starts-with-attribute-anchor",
            });
          }
        }
      }
      const containsPredicate = getGraphContainsAttributePredicate(candidate.attributeName, [
        fragment,
      ]);
      if (containsPredicate) {
        const containsXPath = `//${tag}` + `[` + `${containsPredicate}]`;
        if (xpathContainsElement(containsXPath, element)) {
          pushGraphVariant(variants, seen, {
            xpath: containsXPath,
            score: 10,
            strategy: "contains-attribute-anchor",
          });
        }
      }
    }
    if (fragments.length >= 2) {
      const combinedPredicate = getGraphContainsAttributePredicate(candidate.attributeName, fragments.slice(0, 2));
      if (combinedPredicate) {
        const combinedXPath = `//${tag}` + `[` + `${combinedPredicate}]`;
        if (xpathContainsElement(combinedXPath, element)) {
          pushGraphVariant(variants, seen, {
            xpath: combinedXPath,
            score: 9,
            strategy: "multi-contains-attribute-anchor",
          });
        }
      }
    }
    appendScopedGraphAnchorVariants(element, variants, seen);
    return variants;
  }
  function getGraphScopedNodeVariants(element, allowText = false) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return[];
    }
    const tag = getXPathTag(element);
    const variants = [];
    const seen = new Set();
    const pushVariant = (nodeTest, score, strategy) => {
      if (!nodeTest || seen.has(nodeTest) || containsNumericPosition(nodeTest) || containsQuarantinedAttributeValue(nodeTest)
      || containsMutableStateAttributeReference(nodeTest)) {
        return;
      }
      seen.add(nodeTest);
      variants.push({
        nodeTest,
        score,
        strategy,
      });
    };
    const attributes = Array.from(element.attributes || []).filter(isGraphAttributeEligible).filter(attribute => {
      return!isGraphAttributeRejected(attribute.name, attribute.value);
    }).map(attribute => {
      return {
        attribute,
        penalty: getGraphAttributeStabilityPenalty(attribute),
      };
    }).filter(candidate => {
      return Number.isFinite(candidate.penalty);
    }).sort((left, right) => left.penalty - right.penalty);
    for (const {
      attribute,
      penalty,
    }
    of attributes) {
      const exactPredicate = getGraphExactAttributePredicate(attribute.name, attribute.value);
      if (exactPredicate) {
        pushVariant(`${tag}[` + `${exactPredicate}]`, penalty, "scoped-exact-attribute");
      }
      const fragments = deriveGraphStableFragments(attribute.value);
      for (const fragment of fragments) {
        if (isGraphAttributeValueQuarantined(fragment)) {
          continue;
        }
        if (String(attribute.value).startsWith(fragment)) {
          const startsWithPredicate = getGraphStartsWithAttributePredicate(attribute.name, fragment);
          if (startsWithPredicate) {
            pushVariant(`${tag}[` + `${startsWithPredicate}]`, penalty + 10, "scoped-starts-with-attribute");
          }
        }
        const containsPredicate = getGraphContainsAttributePredicate(attribute.name, [
          fragment,
        ]);
        if (containsPredicate) {
          pushVariant(`${tag}[` + `${containsPredicate}]`, penalty + 14, "scoped-contains-attribute");
        }
      }
    }
    const combinationAttributes = attributes.slice(0, 12);
    for (let leftIndex = 0; leftIndex < combinationAttributes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < combinationAttributes.length; rightIndex += 1) {
        const left = combinationAttributes[leftIndex];
        const right = combinationAttributes[rightIndex];
        const leftPredicate = getGraphExactAttributePredicate(left.attribute.name, left.attribute.value);
        const rightPredicate = getGraphExactAttributePredicate(right.attribute.name, right.attribute.value);
        if (!leftPredicate || !rightPredicate) {
          continue;
        }
        pushVariant(`${tag}[` + `${leftPredicate} and ${rightPredicate}]`, left.penalty + right.penalty + 3, "scoped-two-attribute");
      }
    }
    if (allowText) {
      const textProfile = getGraphTextProfile(element);
      const normalizedText = textProfile?.value || "";
      if (textProfile && normalizedText.length <= 80) {
        pushVariant(`${tag}[${textProfile.exactPredicate}]`, 100, `scoped-${textProfile.mode}`);
        for (const {
          attribute,
          penalty,
        }
        of attributes.slice(0, 8)) {
          const exactPredicate = getGraphExactAttributePredicate(attribute.name, attribute.value);
          if (!exactPredicate) {
            continue;
          }
          pushVariant(`${tag}[${exactPredicate} and ${textProfile.exactPredicate}]`,
          penalty + 55, "scoped-attribute-and-text");
        }
      }
      const snippet = getGraphTextSnippet(normalizedText);
      if (snippet && textProfile) {
        pushVariant(`${tag}[${textProfile.containsPredicate(snippet)}]`, 115, "scoped-contains-normalized-text");
      }
    }
    return variants.sort((left, right) => left.score - right.score).slice(0, 64);
  }
  function getDirectTargetGraphXPath(element, maxVariants = 64, candidateIsAllowed = null) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return "";
    }
    const variants = getGraphScopedNodeVariants(element, true).slice(0, Math.max(1, maxVariants));
    for (const variant of variants) {
      const xpath = `//${variant.nodeTest}`;
      if (isSafeFinalGraphXPath(xpath, element)
      && (!candidateIsAllowed || candidateIsAllowed(xpath, "direct", [element]))) {
        return xpath;
      }
    }
    return "";
  }
  function getFastXPathAttributePriority(attributeName) {
    const normalizedName = String(attributeName || "").trim().toLowerCase();
    const priority = FAST_XPATH_ATTRIBUTE_PRIORITY.indexOf(normalizedName);
    return priority >= 0 ? priority: FAST_XPATH_ATTRIBUTE_PRIORITY.length + 1;
  }
  function getFastXPathAttributes(element) {
    if (!(element instanceof Element)) {
      return [];
    }
    return Array.from(element.attributes || []).filter(isGraphAttributeEligible).map(attribute => {
      return {
        name: attribute.name,
        value: attribute.value,
        predicate: getGraphExactAttributePredicate(attribute.name, attribute.value),
        priority: getFastXPathAttributePriority(attribute.name),
        stabilityPenalty: getGraphAttributeStabilityPenalty(attribute),
      };
    }).filter(attribute => {
      return !!attribute.predicate && Number.isFinite(attribute.stabilityPenalty);
    }).sort((left, right) => {
      return left.priority - right.priority || left.stabilityPenalty - right.stabilityPenalty
      || left.name.localeCompare(right.name);
    }).slice(0, FAST_XPATH_MAX_ATTRIBUTES);
  }
  function getFastClickXPath(element, candidateIsAllowed = null) {
    const diagnostics = {
      attempted: true,
      candidatesChecked: 0,
      elapsedMs: 0,
      exhaustedTimeBudget: false,
      exhaustedCandidateBudget: false,
      winningMethod: null,
      strictWholeDocumentValidation: true,
      hiddenElementsIncluded: true,
      contextDependentTarget: false,
      strictContextCandidatesRejected: 0,
    };
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return {
        xpath: "",
        strategy: "unresolved",
        diagnostics,
      };
    }
    const startedAt = getSelectorSearchNow();
    diagnostics.contextDependentTarget = isContextDependentSelectorTarget(element);
    const tag = getXPathTag(element);
    const attributes = getFastXPathAttributes(element);
    const seen = new Set();
    const timeRemaining = () => {
      const elapsedMs = getSelectorSearchNow() - startedAt;
      diagnostics.elapsedMs = elapsedMs;
      if (elapsedMs >= FAST_XPATH_MAX_MS) {
        diagnostics.exhaustedTimeBudget = true;
        return false;
      }
      return true;
    };
    const tryCandidate = (xpath, method) => {
      if (!xpath || seen.has(xpath)) {
        return "";
      }
      if (diagnostics.candidatesChecked >= FAST_XPATH_MAX_CANDIDATES) {
        diagnostics.exhaustedCandidateBudget = true;
        return "";
      }
      if (!timeRemaining()) {
        return "";
      }
      seen.add(xpath);
      diagnostics.candidatesChecked += 1;
      if (!isSafeFinalGraphXPath(xpath, element)
      || (candidateIsAllowed && !candidateIsAllowed(xpath, method, [element]))) {
        if (!passesStrictContextStabilityPolicy(xpath, element)) {
          diagnostics.strictContextCandidatesRejected += 1;
        }
        return "";
      }
      diagnostics.winningMethod = method;
      diagnostics.elapsedMs = getSelectorSearchNow() - startedAt;
      return xpath;
    };
    for (const attribute of attributes) {
      const xpath = tryCandidate(`//${tag}[${attribute.predicate}]`, "single-attribute");
      if (xpath) {
        return {
          xpath,
          strategy: "primary",
          diagnostics,
        };
      }
    }
    const textProfile = getGraphTextProfile(element);
    if (textProfile?.value && textProfile.value.length <= 80) {
      const textXPath = tryCandidate(`//${tag}[${textProfile.exactPredicate}]`, textProfile.mode);
      if (textXPath) {
        return {
          xpath: textXPath,
          strategy: "primary",
          diagnostics,
        };
      }
      for (const attribute of attributes.slice(0, 8)) {
        const xpath = tryCandidate(`//${tag}[${attribute.predicate} and ${textProfile.exactPredicate}]`,
        "attribute-and-text");
        if (xpath) {
          return {
            xpath,
            strategy: "primary",
            diagnostics,
          };
        }
      }
    }
    for (let leftIndex = 0; leftIndex < attributes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < attributes.length; rightIndex += 1) {
        const xpath = tryCandidate(`//${tag}[${attributes[leftIndex].predicate} and ${attributes[rightIndex].predicate}]`,
        "two-attribute");
        if (xpath) {
          return {
            xpath,
            strategy: "primary",
            diagnostics,
          };
        }
        if (diagnostics.exhaustedTimeBudget || diagnostics.exhaustedCandidateBudget) {
          break;
        }
      }
      if (diagnostics.exhaustedTimeBudget || diagnostics.exhaustedCandidateBudget) {
        break;
      }
    }
    if (!diagnostics.exhaustedTimeBudget && !diagnostics.exhaustedCandidateBudget) {
      outer: for (let firstIndex = 0; firstIndex < attributes.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < attributes.length; secondIndex += 1) {
          for (let thirdIndex = secondIndex + 1; thirdIndex < attributes.length; thirdIndex += 1) {
            const xpath = tryCandidate(`//${tag}[${attributes[firstIndex].predicate} and ${attributes[secondIndex].predicate}`
            + ` and ${attributes[thirdIndex].predicate}]`, "three-attribute");
            if (xpath) {
              return {
                xpath,
                strategy: "primary",
                diagnostics,
              };
            }
            if (diagnostics.exhaustedTimeBudget || diagnostics.exhaustedCandidateBudget) {
              break outer;
            }
          }
        }
      }
    }
    diagnostics.elapsedMs = getSelectorSearchNow() - startedAt;
    return {
      xpath: "",
      strategy: "unresolved",
      diagnostics,
    };
  }
  function findLocalControlRelationshipXPath(target, candidateIsAllowed = null) {
    if (!(target instanceof Element) || isRecorderOverlayElement(target)) {
      return "";
    }
    const startedAt = getSelectorSearchNow();
    const targetVariants = getGraphScopedNodeVariants(target, false).slice(0, 8);
    if (!targetVariants.length) {
      return "";
    }
    const anchors = [];
    const seen = new Set([
      target,
    ]);
    const pushAnchor = element => {
      if (!(element instanceof Element) || seen.has(element) || isRecorderOverlayElement(element)) {
        return;
      }
      const tagName = element.tagName?.toLowerCase();
      if (tagName === "html" || tagName === "body") {
        return;
      }
      seen.add(element);
      anchors.push(element);
    };
    const parent = target.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(element => element !== target).sort((left, right) => {
        const rank = element => [
          "input",
          "textarea",
          "select",
          "label",
          "button",
        ].indexOf(element.tagName?.toLowerCase()) + 1 || 99;
        return rank(left) - rank(right);
      });
      siblings.forEach(pushAnchor);
    }
    let ancestor = parent;
    let depth = 0;
    while (ancestor instanceof Element && depth < 8 && anchors.length < LOCAL_CONTROL_RECOVERY_MAX_ANCHORS) {
      pushAnchor(ancestor);
      Array.from(ancestor.children).forEach(pushAnchor);
      ancestor = ancestor.parentElement;
      depth += 1;
    }
    let generated = 0;
    for (const anchor of anchors.slice(0, LOCAL_CONTROL_RECOVERY_MAX_ANCHORS)) {
      if (getSelectorSearchNow() - startedAt >= LOCAL_CONTROL_RECOVERY_MAX_MS || generated >= LOCAL_CONTROL_RECOVERY_MAX_GENERATED) {
        break;
      }
      const anchorXPath = getDirectTargetGraphXPath(anchor, 4);
      if (!anchorXPath) {
        continue;
      }
      for (const targetVariant of targetVariants) {
        if (getSelectorSearchNow() - startedAt >= LOCAL_CONTROL_RECOVERY_MAX_MS || generated >= LOCAL_CONTROL_RECOVERY_MAX_GENERATED) {
          break;
        }
        const nodeTest = targetVariant.nodeTest;
        const candidates = [];
        if (anchor.contains(target)) {
          candidates.push(`${anchorXPath}//${nodeTest}`);
        }
        if (anchor.parentElement && anchor.parentElement === target.parentElement) {
          const position = anchor.compareDocumentPosition(target);
          if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
            candidates.push(`${anchorXPath}/following-sibling::${nodeTest}`);
          }
          if (position & Node.DOCUMENT_POSITION_PRECEDING) {
            candidates.push(`${anchorXPath}/preceding-sibling::${nodeTest}`);
          }
        }
        const position = anchor.compareDocumentPosition(target);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
          candidates.push(`${anchorXPath}/following::${nodeTest}`);
        }
        if (position & Node.DOCUMENT_POSITION_PRECEDING) {
          candidates.push(`${anchorXPath}/preceding::${nodeTest}`);
        }
        for (const xpath of candidates) {
          generated += 1;
          if (isSafeFinalGraphXPath(xpath, target)
          && (!candidateIsAllowed || candidateIsAllowed(xpath, "local-relationship", [anchor, target]))) {
            return xpath;
          }
          if (generated >= LOCAL_CONTROL_RECOVERY_MAX_GENERATED) {
            break;
          }
        }
      }
    }
    return "";
  }
  /*
   * A bare container such as <td class="px-3 py-2"> may have no stable
   * identity of its own while a descendant does. Resolve that descendant
   * through its surrounding DOM, then walk back to the exact clicked
   * container. This phase is semantic and runs before indexed/structural
   * fallbacks.
   */
  function findDescendantBackReferenceXPath(target, candidateIsAllowed = null) {
    const outcome = {
      xpath: "",
      visited: 0,
      generated: 0,
      linearSteps: 0,
      descendantXPath: "",
      descendantStrategy: null,
    };
    if (!(target instanceof Element) || isRecorderOverlayElement(target)) {
      return outcome;
    }
    const targetTag = getXPathTag(target);
    const descendantCancellation = {
      cancelled: false,
    };
    const maxDescendants = 48;
    const maxGenerated = 512;
    const maxLinearSteps = 800;
    const maxLinearStepsPerDescendant = 220;
    for (const entry of iterateLinearDownwardElements(target, descendantCancellation)) {
      if (outcome.visited >= maxDescendants || outcome.generated >= maxGenerated
      || outcome.linearSteps >= maxLinearSteps) {
        break;
      }
      const descendant = entry.element;
      outcome.visited += 1;
      const descendantCandidates = [];
      const seen = new Set();
      let processedCandidateCount = 0;
      const queue = (xpath, strategy) => {
        if (!xpath || seen.has(xpath) || isAbsoluteDocumentFallbackXPath(xpath)
        || containsNumericPosition(xpath)) {
          return;
        }
        seen.add(xpath);
        descendantCandidates.push({
          xpath,
          strategy,
        });
      };
      const tryQueuedBackReferences = () => {
        while (processedCandidateCount < descendantCandidates.length && outcome.generated < maxGenerated) {
          const descendantCandidate = descendantCandidates[processedCandidateCount];
          processedCandidateCount += 1;
          const xpath = `${descendantCandidate.xpath}/ancestor::${targetTag}`;
          outcome.generated += 1;
          if (!isSafeFinalGraphXPath(xpath, target)
          || (candidateIsAllowed && !candidateIsAllowed(xpath, "descendant-back-reference", [descendant, target]))) {
            continue;
          }
          outcome.xpath = xpath;
          outcome.descendantXPath = descendantCandidate.xpath;
          outcome.descendantStrategy = descendantCandidate.strategy;
          return true;
        }
        return false;
      };
      const fast = getFastClickXPath(descendant);
      queue(fast.xpath, "descendant-fast");
      queue(getDirectTargetGraphXPath(descendant, 64), "descendant-direct");
      queue(findLocalControlRelationshipXPath(descendant), "descendant-local-relationship");
      if (tryQueuedBackReferences()) {
        return outcome;
      }

      /*
       * The descendant may also be non-unique by itself. Give it a small
       * upward/surrounding scan so a unique row label or nearby cell can
       * identify it, then climb from that exact descendant back to target.
       * This is the missing case behind paths such as a bare table cell whose
       * only useful identity is a child company name plus a sibling RFP id.
       */
      const linearCancellation = {
        cancelled: false,
      };
      const linearStatistics = {
        visited: 0,
        generated: 0,
      };
      const linearIterator = createLinearXPathSearch(descendant, "upward", linearCancellation,
      new Map(), linearStatistics);
      let descendantLinearSteps = 0;
      while (descendantLinearSteps < maxLinearStepsPerDescendant
      && outcome.linearSteps < maxLinearSteps && outcome.generated < maxGenerated) {
        const next = linearIterator.next();
        descendantLinearSteps += 1;
        outcome.linearSteps += 1;
        if (next.done) {
          queue(next.value, "descendant-linear-upward");
          break;
        }
      }
      linearCancellation.cancelled = true;
      outcome.generated += linearStatistics.generated;
      if (tryQueuedBackReferences()) {
        return outcome;
      }
    }
    return outcome;
  }
  function buildGraphPredicateChain(anchor, target, allowText = false) {
    if (!(anchor instanceof Element) || !(target instanceof Element)) {
      return null;
    }
    if (anchor === target) {
      return {
        suffix: "",
        score: 0,
        strategies: [],
      };
    }
    if (!anchor.contains(target)) {
      return null;
    }
    const memo = new Map();
    function solve(scopeElement) {
      if (scopeElement === target) {
        return {
          suffix: "",
          score: 0,
          strategies: [],
        };
      }
      if (memo.has(scopeElement)) {
        return memo.get(scopeElement);
      }
      const lineage = [];
      let current = target;
      while (current && current !== scopeElement) {
        lineage.push(current);
        current = current.parentElement;
      }
      if (current !== scopeElement) {
        memo.set(scopeElement, null);
        return null;
      }
      let bestResult = null;
      for (const waypoint of lineage) {
        const waypointVariants = getGraphScopedNodeVariants(waypoint, allowText);
        for (const waypointVariant of waypointVariants) {
          const relativeXPath = `.//${waypointVariant.nodeTest}`;
          if (containsQuarantinedAttributeValue(relativeXPath) || containsMutableStateAttributeReference(relativeXPath)) {
            continue;
          }
          if (!xpathContainsElementInScope(scopeElement, relativeXPath, waypoint)) {
            continue;
          }
          const remainder = waypoint === target ? {
            suffix: "",
            score: 0,
            strategies: [],
          }
          : solve(waypoint);
          if (!remainder) {
            continue;
          }
          const result = {
            suffix: `//${waypointVariant.nodeTest}` + remainder.suffix,
            score: waypointVariant.score + remainder.score + 2,
            strategies: [
              waypointVariant.strategy,
              ...remainder.strategies,
            ],
          };
          if (containsNumericPosition(result.suffix) || containsQuarantinedAttributeValue(result.suffix) || containsMutableStateAttributeReference(result.suffix)) {
            continue;
          }
          if (!bestResult || result.score < bestResult.score || (result.score === bestResult.score && result.suffix.length < bestResult.suffix.length)) {
            bestResult = result;
          }
        }
      }
      memo.set(scopeElement, bestResult);
      return bestResult;
    }
    return solve(anchor);
  }
  function getUniqueStructuralGraphAnchorXPath(element) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return "";
    }
    const tagName = String(element.localName || "").trim().toLowerCase();
    if (!GRAPH_STRUCTURAL_ANCHOR_TAGS.has(tagName)) {
      return "";
    }
    const xpath = `//${getXPathTag(
        element
      )}`;
    return isSafeFinalGraphXPath(xpath, element) ? xpath: "";
  }
  function getGraphScopedRecoveryAnchorXPath(element) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return "";
    }
    const directXPath = getDirectTargetGraphXPath(element);
    if (directXPath) {
      return directXPath;
    }
    return getUniqueStructuralGraphAnchorXPath(element);
  }
  function findScopedGraphRecoveryXPath(target) {
    if (!(target instanceof Element) || isRecorderOverlayElement(target)) {
      return "";
    }
    let ancestor = target.parentElement;
    let depth = 0;
    while (ancestor instanceof Element && depth < GRAPH_SCOPED_RECOVERY_MAX_ANCESTOR_DEPTH) {
      const ancestorTag = ancestor.tagName?.toLowerCase();
      if (ancestorTag === "html" || ancestorTag === "body") {
        break;
      }
      if (isRecorderOverlayElement(ancestor)) {
        break;
      }
      const anchorXPath = getGraphScopedRecoveryAnchorXPath(ancestor);
      if (anchorXPath) {
        let chain = buildGraphPredicateChain(ancestor, target, false);
        if (chain?.suffix) {
          const xpath = anchorXPath + chain.suffix;
          if (isSafeFinalGraphXPath(xpath, target)) {
            return xpath;
          }
        }
        chain = buildGraphPredicateChain(ancestor, target, true);
        if (chain?.suffix) {
          const xpath = anchorXPath + chain.suffix;
          if (isSafeFinalGraphXPath(xpath, target)) {
            return xpath;
          }
        }
      }
      ancestor = ancestor.parentElement;
      depth += 1;
    }
    return "";
  }
  function buildGraphAxisPredicateChain(anchor, target, axis, allowText = false) {
    if (!(anchor instanceof Element) || !(target instanceof Element) || !axis) {
      return null;
    }
    const lineage = [];
    let current = target;
    while (current && current.tagName !== "HTML" && current.tagName !== "BODY") {
      lineage.push(current);
      current = current.parentElement;
    }
    let bestResult = null;
    for (const waypoint of lineage) {
      const waypointVariants = getGraphScopedNodeVariants(waypoint, allowText);
      for (const waypointVariant of waypointVariants) {
        const relativeXPath = `${axis}::${waypointVariant.nodeTest}`;
        if (containsQuarantinedAttributeValue(relativeXPath) || containsMutableStateAttributeReference(relativeXPath)) {
          continue;
        }
        if (!xpathContainsElementInScope(anchor, relativeXPath, waypoint)) {
          continue;
        }
        const remainder = waypoint === target ? {
          suffix: "",
          score: 0,
          strategies: [],
        }
        : buildGraphPredicateChain(waypoint, target, allowText);
        if (!remainder) {
          continue;
        }
        const result = {
          suffix: `/${axis}::` + `${waypointVariant.nodeTest}` + remainder.suffix,
          score: waypointVariant.score + remainder.score + 35,
          strategies: [
            `${axis}-axis`,
            waypointVariant.strategy,
            ...remainder.strategies,
          ],
        };
        if (containsNumericPosition(result.suffix) || containsQuarantinedAttributeValue(result.suffix) || containsMutableStateAttributeReference(result.suffix)) {
          continue;
        }
        if (!bestResult || result.score < bestResult.score || (result.score === bestResult.score && result.suffix.length < bestResult.suffix.length)) {
          bestResult = result;
        }
      }
    }
    return bestResult;
  }
  function getGraphRelationVariants(candidate, target, allowText = false) {
    const anchor = candidate.element;
    const variants = [];
    const seen = new Set();
    const pushRelation = (suffix, score, strategy) => {
      const key = `${suffix}\u0000${strategy}`;
      if (seen.has(key) || containsNumericPosition(suffix) || containsQuarantinedAttributeValue(suffix) || containsMutableStateAttributeReference(suffix)) {
        return;
      }
      seen.add(key);
      variants.push({
        suffix,
        score,
        strategy,
      });
    };
    if (anchor === target) {
      pushRelation("", 0, "anchor-is-target");
      return variants;
    }
    if (anchor.contains(target)) {
      const chain = buildGraphPredicateChain(anchor, target, allowText);
      if (chain?.suffix) {
        pushRelation(chain.suffix, chain.score, allowText ? "predicate-chain-with-text-fallback": "attribute-predicate-chain");
      }
    }
    if (target.contains(anchor)) {
      const targetVariants = getGraphScopedNodeVariants(target, allowText);
      for (const targetVariant of targetVariants) {
        pushRelation(`/ancestor::${targetVariant.nodeTest}`, targetVariant.score + 12, "predicate-ancestor-axis");
      }
    }
    const position = anchor.compareDocumentPosition(target);
    const targetIsFollowing = !!(position & Node.DOCUMENT_POSITION_FOLLOWING);
    const targetIsPreceding = !!(position & Node.DOCUMENT_POSITION_PRECEDING);
    if (anchor.parentElement && anchor.parentElement === target.parentElement) {
      const siblingAxis = targetIsFollowing ? "following-sibling": "preceding-sibling";
      const targetVariants = getGraphScopedNodeVariants(target, allowText);
      for (const targetVariant of targetVariants) {
        pushRelation(`/${siblingAxis}::` + `${targetVariant.nodeTest}`, targetVariant.score + 14, `${siblingAxis}-predicate`);
      }
    }
    if (!anchor.contains(target) && !target.contains(anchor)) {
      const axis = targetIsFollowing ? "following": targetIsPreceding ? "preceding": "";
      if (axis) {
        const axisChain = buildGraphAxisPredicateChain(anchor, target, axis, allowText);
        if (axisChain?.suffix) {
          pushRelation(axisChain.suffix, axisChain.score, `${axis}-predicate-chain`);
        }
      }
    }
    return variants;
  }
  function compareGraphCandidatesByTraversal(left, right) {
    const traversalComparison = compareGraphTraversalPath(left.traversalPath, right.traversalPath);
    if (traversalComparison !== 0) {
      return traversalComparison;
    }
    if (left.traversalOrder !== right.traversalOrder) {
      return(left.traversalOrder - right.traversalOrder);
    }
    const leftScore = left.graphCost * 12 + left.stabilityPenalty;
    const rightScore = right.graphCost * 12 + right.stabilityPenalty;
    if (leftScore !== rightScore) {
      return(leftScore - rightScore);
    }
    return(left.pathFromTarget.length - right.pathFromTarget.length);
  }
  function findBestGraphXPathForCandidates(target, candidates, allowTextRelations = false) {
    if (!candidates.size) {
      return "";
    }
    const rankedCandidates = Array.from(candidates.values()).filter(candidate => {
      return!(candidate.kind === "attribute" && isGraphAttributeRejected(candidate.attributeName, candidate.attributeValue));
    }).sort(compareGraphCandidatesByTraversal).slice(0, GRAPH_XPATH_MAX_ANCHORS);
    const generated = new Set();
    let generatedCount = 0;
    let bestResult = null;
    outer: for (const candidate of rankedCandidates) {
      const anchorVariants = getGraphAnchorVariants(candidate);
      const relationVariants = getGraphRelationVariants(candidate, target, allowTextRelations);
      for (const anchorVariant of anchorVariants) {
        for (const relationVariant of relationVariants) {
          if (generatedCount >= GRAPH_XPATH_MAX_GENERATED) {
            break outer;
          }
          const xpath = anchorVariant.xpath + relationVariant.suffix;
          if (generated.has(xpath) || !isSafeFinalGraphXPath(xpath)) {
            continue;
          }
          generated.add(xpath);
          generatedCount += 1;
          if (!matchesOnlyElement(xpath, target)) {
            continue;
          }
          let score = candidate.stabilityPenalty + anchorVariant.score + relationVariant.score + xpath.length / 100;
          if (xpath.includes("/following::") || xpath.includes("/preceding::")) {
            score += 10;
          }
          if (xpath.includes("contains(")) {
            score += 4;
          }
          if (xpath.includes("normalize-space(")) {
            score += 8;
          }
          if (!bestResult) {
            bestResult = {
              xpath,
              score,
              traversalPath: candidate.traversalPath,
              traversalOrder: candidate.traversalOrder,
            };
            continue;
          }
          const traversalComparison = compareGraphTraversalPath(candidate.traversalPath, bestResult.traversalPath);
          if (traversalComparison < 0 || (traversalComparison === 0 && candidate.traversalOrder < bestResult.traversalOrder)
          || (traversalComparison === 0 && candidate.traversalOrder === bestResult.traversalOrder && score < bestResult.score)) {
            bestResult = {
              xpath,
              score,
              traversalPath: candidate.traversalPath,
              traversalOrder: candidate.traversalOrder,
            };
          }
        }
      }
    }
    if (generatedCount >= GRAPH_XPATH_MAX_GENERATED) {
      console.debug("[graph-recorder] XPath generation reached bounded candidate ceiling:", GRAPH_XPATH_MAX_GENERATED);
    }
    return(bestResult?.xpath || "");
  }
  function splitGraphCandidates(candidates) {
    const attributeCandidates = new Map();
    const textCandidates = new Map();
    for (const[key, candidate,]of candidates) {
      if (candidate.kind === "attribute") {
        if (isGraphAttributeRejected(candidate.attributeName, candidate.attributeValue)) {
          continue;
        }
        attributeCandidates.set(key, candidate);
      } else if (candidate.kind === "text") {
        textCandidates.set(key, candidate);
      }
    }
    return {
      attributeCandidates,
      textCandidates,
    };
  }
  function findBestGraphXPath(target) {
    if (!(target instanceof Element) || isRecorderOverlayElement(target)) {
      return "";
    }
    const candidates = collectGraphCandidates(target);
    if (candidates.size) {
      const {
        attributeCandidates,
        textCandidates,
      }
      = splitGraphCandidates(candidates);
      let xpath = findBestGraphXPathForCandidates(target, attributeCandidates, false);
      if (isSafeFinalGraphXPath(xpath, target)) {
        return xpath;
      }
      xpath = findBestGraphXPathForCandidates(target, attributeCandidates, true);
      if (isSafeFinalGraphXPath(xpath, target)) {
        return xpath;
      }
      xpath = findBestGraphXPathForCandidates(target, textCandidates, false);
      if (isSafeFinalGraphXPath(xpath, target)) {
        return xpath;
      }
      xpath = findBestGraphXPathForCandidates(target, textCandidates, true);
      if (isSafeFinalGraphXPath(xpath, target)) {
        return xpath;
      }
    }
    const scopedXPath = findScopedGraphRecoveryXPath(target);
    return isSafeFinalGraphXPath(scopedXPath, target) ? scopedXPath: "";
  }
  function getNormalClickXPath(element) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return "";
    }
    const graphXPath = findBestGraphXPath(element);
    if (isSafeFinalGraphXPath(graphXPath, element)) {
      return graphXPath;
    }
    return "";
  }
  function * createPrimaryCandidateCollectionSearch(target, cancellation) {
    const candidates = new Map();
    let traversalOrder = 0;
    for (const state of iterateHierarchicalGraphStates(target, cancellation)) {
      if (cancellation.cancelled) {
        return null;
      }
      collectGraphCandidatesFromState(state, candidates, traversalOrder);
      traversalOrder += 1;
      yield null;
    }
    return candidates;
  }
  function * createPrimaryCandidateEvaluationSearch(target, candidates, allowTextRelations, cancellation) {
    if (!candidates.size) {
      return "";
    }
    const rankedCandidates = Array.from(candidates.values()).filter(candidate => {
      return!(candidate.kind === "attribute" && isGraphAttributeRejected(candidate.attributeName, candidate.attributeValue));
    }).sort(compareGraphCandidatesByTraversal).slice(0, GRAPH_XPATH_MAX_ANCHORS);
    const generated = new Set();
    let generatedCount = 0;
    let bestResult = null;
    outer: for (const candidate of rankedCandidates) {
      if (cancellation.cancelled) {
        return "";
      }
      const anchorVariants = getGraphAnchorVariants(candidate);
      const relationVariants = getGraphRelationVariants(candidate, target, allowTextRelations);
      for (const anchorVariant of anchorVariants) {
        for (const relationVariant of relationVariants) {
          if (cancellation.cancelled || generatedCount >= GRAPH_XPATH_MAX_GENERATED) {
            break outer;
          }
          const xpath = anchorVariant.xpath + relationVariant.suffix;
          if (!generated.has(xpath) && isSafeFinalGraphXPath(xpath)) {
            generated.add(xpath);
            generatedCount += 1;
            if (matchesOnlyElement(xpath, target)) {
              let score = candidate.stabilityPenalty + anchorVariant.score + relationVariant.score + xpath.length / 100;
              if (xpath.includes("/following::") || xpath.includes("/preceding::")) {
                score += 10;
              }
              if (xpath.includes("contains(")) {
                score += 4;
              }
              if (xpath.includes("normalize-space(")) {
                score += 8;
              }
              if (!bestResult) {
                bestResult = {
                  xpath,
                  score,
                  traversalPath: candidate.traversalPath,
                  traversalOrder: candidate.traversalOrder,
                };
              } else {
                const traversalComparison = compareGraphTraversalPath(candidate.traversalPath, bestResult.traversalPath);
                if (traversalComparison < 0 || (traversalComparison === 0 && candidate.traversalOrder < bestResult.traversalOrder)
                || (traversalComparison === 0 && candidate.traversalOrder === bestResult.traversalOrder && score < bestResult.score)) {
                  bestResult = {
                    xpath,
                    score,
                    traversalPath: candidate.traversalPath,
                    traversalOrder: candidate.traversalOrder,
                  };
                }
              }
            }
          }
          yield null;
        }
      }
      yield null;
    }
    return(bestResult?.xpath || "");
  }
  function * createPrimaryScopedRecoverySearch(target, cancellation) {
    let ancestor = target.parentElement;
    let depth = 0;
    while (ancestor instanceof Element && depth < GRAPH_SCOPED_RECOVERY_MAX_ANCESTOR_DEPTH) {
      if (cancellation.cancelled) {
        return "";
      }
      const ancestorTag = ancestor.tagName?.toLowerCase();
      if (ancestorTag === "html" || ancestorTag === "body" || isRecorderOverlayElement(ancestor)) {
        break;
      }
      const anchorXPath = getGraphScopedRecoveryAnchorXPath(ancestor);
      yield null;
      if (anchorXPath) {
        for (const allowText of[
          false,
          true,
        ]) {
          if (cancellation.cancelled) {
            return "";
          }
          const chain = buildGraphPredicateChain(ancestor, target, allowText);
          if (chain?.suffix) {
            const xpath = anchorXPath + chain.suffix;
            if (isSafeFinalGraphXPath(xpath, target)) {
              return xpath;
            }
          }
          yield null;
        }
      }
      ancestor = ancestor.parentElement;
      depth += 1;
    }
    return "";
  }
  function * createDownwardXPathSearch(target, cancellation) {
    if (cancellation.cancelled || !(target instanceof Element) || isRecorderOverlayElement(target)) {
      return "";
    }
    const candidates = new Map();
    let traversalOrder = 0;
    for (const state of iterateDownwardGraphStates(target, cancellation)) {
      if (cancellation.cancelled) {
        return "";
      }
      collectGraphCandidatesFromState(state, candidates, traversalOrder);
      traversalOrder += 1;
      yield null;
    }
    if (!candidates.size) {
      return "";
    }
    const {
      attributeCandidates,
      textCandidates,
    }
    = splitGraphCandidates(candidates);
    const phases = [
      [
        attributeCandidates,
        false,
      ],
      [
        attributeCandidates,
        true,
      ],
      [
        textCandidates,
        false,
      ],
      [
        textCandidates,
        true,
      ],
    ];
    for (const[phaseCandidates, allowTextRelations,]of phases) {
      const xpath = yield * createPrimaryCandidateEvaluationSearch(target, phaseCandidates, allowTextRelations, cancellation);
      if (isSafeFinalGraphXPath(xpath, target)) {
        return xpath;
      }
    }
    return "";
  }
  function * createPrimaryXPathSearch(target, cancellation) {
    if (cancellation.cancelled || !(target instanceof Element) || isRecorderOverlayElement(target)) {
      return "";
    }
    const directXPath = getDirectTargetGraphXPath(target);
    if (isSafeFinalGraphXPath(directXPath, target)) {
      return directXPath;
    }
    const localControlXPath = findLocalControlRelationshipXPath(target);
    if (isSafeFinalGraphXPath(localControlXPath, target)) {
      return localControlXPath;
    }
    yield null;
    const candidates = yield * createPrimaryCandidateCollectionSearch(target, cancellation);
    if (cancellation.cancelled || !candidates) {
      return "";
    }
    const {
      attributeCandidates,
      textCandidates,
    }
    = splitGraphCandidates(candidates);
    const phases = [
      [
        attributeCandidates,
        false,
      ],
      [
        attributeCandidates,
        true,
      ],
      [
        textCandidates,
        false,
      ],
      [
        textCandidates,
        true,
      ],
    ];
    for (const[phaseCandidates, allowTextRelations,]of phases) {
      const xpath = yield * createPrimaryCandidateEvaluationSearch(target, phaseCandidates, allowTextRelations, cancellation);
      if (isSafeFinalGraphXPath(xpath, target)) {
        return xpath;
      }
    }
    return yield * createPrimaryScopedRecoverySearch(target, cancellation);
  }
  function createContextualMinHeap(comparator) {
    const values = [];
    function push(value) {
      values.push(value);
      let index = values.length - 1;
      while (index > 0) {
        const parentIndex = Math.floor((index - 1) / 2);
        if (comparator(values[parentIndex], values[index]) <= 0) {
          break;
        }[values[parentIndex], values[index],] = [
          values[index],
          values[parentIndex],
        ];
        index = parentIndex;
      }
    }
    function pop() {
      if (!values.length) {
        return null;
      }
      const first = values[0];
      const last = values.pop();
      if (values.length && last) {
        values[0] = last;
        let index = 0;
        while (true) {
          const leftIndex = index * 2 + 1;
          const rightIndex = leftIndex + 1;
          let smallestIndex = index;
          if (leftIndex < values.length && comparator(values[leftIndex], values[smallestIndex]) < 0) {
            smallestIndex = leftIndex;
          }
          if (rightIndex < values.length && comparator(values[rightIndex], values[smallestIndex]) < 0) {
            smallestIndex = rightIndex;
          }
          if (smallestIndex === index) {
            break;
          }[values[index], values[smallestIndex],] = [
            values[smallestIndex],
            values[index],
          ];
          index = smallestIndex;
        }
      }
      return first;
    }
    return {
      push,
      pop,
      get size() {
        return values.length;
      },
    };
  }
  function getContextualPredicateMatchCount(element, predicate) {
    if (!(element instanceof Element) || !predicate) {
      return Number.POSITIVE_INFINITY;
    }
    try {
      const doc = element.ownerDocument || document;
      const xpath = `//${getXPathTag(
          element
        )}[${predicate}]`;
      const result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return result.snapshotLength;
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }
  function compareContextualBasePredicates(left, right) {
    if (left.stability !== right.stability) {
      return(left.stability - right.stability);
    }
    if (left.matchCount !== right.matchCount) {
      return(left.matchCount - right.matchCount);
    }
    if (left.simplicity !== right.simplicity) {
      return(left.simplicity - right.simplicity);
    }
    return left.signature.localeCompare(right.signature);
  }
  function getContextualBasePredicates(element) {
    const predicates = [];
    for (const attribute of Array.from(element.attributes || [])) {
      if (!isGraphAttributeEligible(attribute)) {
        continue;
      }
      const expression = getGraphExactAttributePredicate(attribute.name, attribute.value);
      if (!expression) {
        continue;
      }
      const stability = getGraphAttributeStabilityPenalty(attribute);
      if (!Number.isFinite(stability)) {
        continue;
      }
      predicates.push({
        expression,
        kind: "attribute",
        signature: `attribute:${attribute.name}` + `=${attribute.value}`,
        stability,
        matchCount: getContextualPredicateMatchCount(element, expression),
        simplicity: expression.length,
      });
    }
    const textProfile = getGraphTextProfile(element);
    const normalizedText = textProfile?.value || "";
    if (textProfile && normalizedText.length <= 80) {
      const expression = textProfile.exactPredicate;
      predicates.push({
        expression,
        kind: "text",
        signature: `text:${textProfile.mode}:${normalizedText}`,
        stability: getGraphTextStabilityPenalty(normalizedText),
        matchCount: getContextualPredicateMatchCount(element, expression),
        simplicity: expression.length,
      });
    }
    return predicates.sort(compareContextualBasePredicates).slice(0, CONTEXTUAL_XPATH_MAX_BASE_PREDICATES).map((predicate, index) => {
      return {
        ...predicate,
        rank: index,
        score: predicate.stability * 1000000 + Math.min(predicate.matchCount, 9999) * 100 + predicate.simplicity,
      };
    });
  }
  function * createContextualNodeVariantIterator(element) {
    const predicates = getContextualBasePredicates(element);
    let yieldedCount = 0;
    for (const predicate of predicates) {
      if (yieldedCount >= CONTEXTUAL_XPATH_MAX_VARIANTS_PER_NODE) {
        return;
      }
      yieldedCount += 1;
      yield {
        predicate: predicate.expression,
        signature: predicate.signature,
        kind: predicate.kind,
        score: predicate.score,
      };
    }
    const pairHeap = createContextualMinHeap((left, right) => {
      if (left.score !== right.score) {
        return(left.score - right.score);
      }
      return left.sequence - right.sequence;
    });
    let pairSequence = 0;
    for (let leftIndex = 0; leftIndex < predicates.length - 1; leftIndex += 1) {
      const rightIndex = leftIndex + 1;
      pairHeap.push({
        leftIndex,
        rightIndex,
        score: predicates[leftIndex].score + predicates[rightIndex].score,
        sequence: pairSequence,
      });
      pairSequence += 1;
    } while (pairHeap.size && yieldedCount < CONTEXTUAL_XPATH_MAX_VARIANTS_PER_NODE) {
      const pair = pairHeap.pop();
      if (!pair) {
        break;
      }
      const left = predicates[pair.leftIndex];
      const right = predicates[pair.rightIndex];
      if (!(left.kind === "text" && right.kind === "text")) {
        yieldedCount += 1;
        yield {
          predicate: `${left.expression} and ` + `${right.expression}`,
          signature: `${left.signature}&` + `${right.signature}`,
          kind: "pair",
          score: pair.score + 25,
        };
      }
      const nextRightIndex = pair.rightIndex + 1;
      if (nextRightIndex < predicates.length) {
        pairHeap.push({
          leftIndex: pair.leftIndex,
          rightIndex: nextRightIndex,
          score: predicates[pair.leftIndex].score + predicates[nextRightIndex].score,
          sequence: pairSequence,
        });
        pairSequence += 1;
      }
    }
    const tag = getXPathTag(element);
    if (yieldedCount < CONTEXTUAL_XPATH_MAX_VARIANTS_PER_NODE && matchesOnlyElement(`//${tag}`, element)) {
      yield {
        predicate: "",
        signature: `unique-tag:${tag}`,
        kind: "tag",
        score: Number.MAX_SAFE_INTEGER / 4,
      };
    }
  }
  function createLazyContextualVariantSource(element) {
    const iterator = createContextualNodeVariantIterator(element);
    const values = [];
    let done = false;
    function get(index) {
      while (!done && values.length <= index) {
        const next = iterator.next();
        if (next.done) {
          done = true;
          break;
        }
        values.push(next.value);
      }
      return values[index] || null;
    }
    return {
      get,
    };
  }
  function * createLazyContextualProductIterator(anchor, target) {
    const anchorSource = createLazyContextualVariantSource(anchor);
    const targetSource = createLazyContextualVariantSource(target);
    const firstAnchor = anchorSource.get(0);
    const firstTarget = targetSource.get(0);
    if (!firstAnchor || !firstTarget) {
      return;
    }
    const heap = createContextualMinHeap((left, right) => {
      if (left.score !== right.score) {
        return(left.score - right.score);
      }
      return left.sequence - right.sequence;
    });
    const queued = new Set([
      "0:0",
    ]);
    let sequence = 0;
    heap.push({
      anchorIndex: 0,
      targetIndex: 0,
      score: firstAnchor.score + firstTarget.score,
      sequence,
    });
    sequence += 1;
    while (heap.size) {
      const state = heap.pop();
      if (!state) {
        break;
      }
      const anchorVariant = anchorSource.get(state.anchorIndex);
      const targetVariant = targetSource.get(state.targetIndex);
      if (anchorVariant && targetVariant) {
        yield {
          anchorVariant,
          targetVariant,
          score: state.score,
        };
      }
      const neighbors = [
        [
          state.anchorIndex + 1,
          state.targetIndex,
        ],
        [
          state.anchorIndex,
          state.targetIndex + 1,
        ],
      ];
      for (const[anchorIndex, targetIndex,]of neighbors) {
        const key = `${anchorIndex}:` + `${targetIndex}`;
        if (queued.has(key)) {
          continue;
        }
        const nextAnchor = anchorSource.get(anchorIndex);
        const nextTarget = targetSource.get(targetIndex);
        if (!nextAnchor || !nextTarget) {
          continue;
        }
        queued.add(key);
        heap.push({
          anchorIndex,
          targetIndex,
          score: nextAnchor.score + nextTarget.score,
          sequence,
        });
        sequence += 1;
      }
    }
  }
  function getContextualNodeTest(element, predicate) {
    return(`${getXPathTag(
        element
      )}` + (predicate ? `[${predicate}]`: ""));
  }
  function getContextualRelationshipSuffixes(state, target, targetVariant) {
    const suffixes = [];
    const path = state.relationshipPath || [];
    if (!path.length) {
      return suffixes;
    }
    const targetNodeTest = getContextualNodeTest(target, targetVariant.predicate);
    if (path.every(step => step.axis === "child")) {
      suffixes.push(`//${targetNodeTest}`);
    }
    const exactSuffix = path.map(step => {
      const predicate = step.element === target ? targetVariant.predicate: "";
      const nodeTest = getContextualNodeTest(step.element, predicate);
      switch (step.axis) {
        case "following-sibling": return(`/following-sibling::` + `${nodeTest}`);
        case "preceding-sibling": return(`/preceding-sibling::` + `${nodeTest}`);
        case "parent": return(`/parent::` + `${nodeTest}`);
        default: return(`/` + `${nodeTest}`);
      }
    }).join("");
    if (exactSuffix && !suffixes.includes(exactSuffix)) {
      suffixes.push(exactSuffix);
    }
    return suffixes;
  }
  function * createContextualCandidatesForState(state, target) {
    const anchor = state.element;
    if (anchor === target) {
      const iterator = createContextualNodeVariantIterator(target);
      for (const targetVariant of iterator) {
        yield(`//` + `${getContextualNodeTest(
            target,
            targetVariant.predicate
          )}`);
      }
      return;
    }
    const productIterator = createLazyContextualProductIterator(anchor, target);
    for (const {
      anchorVariant,
      targetVariant,
    }
    of productIterator) {
      if (getGraphElementKindKey(anchor) === getGraphElementKindKey(target) && anchorVariant.signature === targetVariant.signature) {
        continue;
      }
      const anchorXPath = `//` + `${getContextualNodeTest(
          anchor,
          anchorVariant.predicate
        )}`;
      for (const suffix of getContextualRelationshipSuffixes(state, target, targetVariant)) {
        yield(anchorXPath + suffix);
      }
    }
  }
  function getContextualRelationshipPathFromGraphPath(pathFromTarget) {
    return Array.from(pathFromTarget || []).reverse().map(edge => {
      switch (edge?.type) {
        case "PARENT": return {
          axis: "child",
          element: edge.from,
        };
        case "PREVIOUS_SIBLING": return {
          axis: "following-sibling",
          element: edge.from,
        };
        case "NEXT_SIBLING": return {
          axis: "preceding-sibling",
          element: edge.from,
        };
        case "CHILD": return {
          axis: "parent",
          element: edge.from,
        };
        default: return null;
      }
    }).filter(Boolean);
  }
  function * createContextualXPathSearch(target, cancellation) {
    if (!(target instanceof Element) || isRecorderOverlayElement(target)) {
      return "";
    }
    let visitedCount = 0;
    let generatedCount = 0;
    let anchorCount = 0;
    for (const graphState of iterateHierarchicalGraphStates(target, cancellation)) {
      if (visitedCount >= CONTEXTUAL_XPATH_MAX_VISITED || generatedCount >= CONTEXTUAL_XPATH_MAX_GENERATED
      || anchorCount >= CONTEXTUAL_XPATH_MAX_ANCHORS) {
        break;
      }
      if (cancellation.cancelled) {
        return "";
      }
      const state = {
        ...graphState,
        relationshipPath: getContextualRelationshipPathFromGraphPath(graphState.pathFromTarget),
      };
      visitedCount += 1;
      anchorCount += 1;
      let stateVariantCount = 0;
      for (const xpath of createContextualCandidatesForState(state, target)) {
        if (cancellation.cancelled) {
          return "";
        }
        if (generatedCount >= CONTEXTUAL_XPATH_MAX_GENERATED || stateVariantCount >= CONTEXTUAL_XPATH_MAX_VARIANTS_PER_NODE) {
          break;
        }
        generatedCount += 1;
        stateVariantCount += 1;
        if (isSafeFinalGraphXPath(xpath, target)) {
          return xpath;
        }
        yield null;
      }
      yield null;
    }
    return "";
  }
  function getGraphClassRecoveryTokenPredicate(token) {
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) {
      return "";
    }
    return(`contains(concat(' ', normalize-space(@class), ' '), ` + `${xpathLiteral(
        ` ${normalizedToken} `
      )})`);
  }
  function getGraphClassRecoveryTokens(element, tokenCountCache) {
    if (!(element instanceof Element)) {
      return[];
    }
    const ownerDocument = element.ownerDocument || document;
    const tokens = Array.from(new Set(String(element.getAttribute("class") || "").split(/\s+/).map(token => token.trim()).filter(token => {
      if (!token || token.length > 80) {
        return false;
      }
      if (GRAPH_CLASS_RECOVERY_TOKEN_QUARANTINE_PATTERNS.some(pattern => pattern.test(token))) {
        return false;
      }
      return!/^(?:active|selected|open|closed|checked|disabled|enabled|focused|hovered)$/i.test(token);
    })));
    return tokens.map(token => {
      let matchCount = tokenCountCache.get(token);
      if (!Number.isFinite(matchCount)) {
        try {
          matchCount = ownerDocument.getElementsByClassName(token).length;
        } catch {
          matchCount = Number.MAX_SAFE_INTEGER;
        }
        tokenCountCache.set(token, matchCount);
      }
      const generatedLookingPenalty = /[\[\]{}]|\d{5,}|^[a-f\d]{8,}$/i.test(token) ? 80: 0;
      return {
        token,
        matchCount,
        score: matchCount * 12 + generatedLookingPenalty + Math.min(token.length, 60),
      };
    }).sort((left, right) => left.score - right.score || left.token.length - right.token.length || left.token.localeCompare(right.token)).slice(0,
    GRAPH_CLASS_RECOVERY_MAX_TOKENS);
  }
  function getGraphClassRecoveryNodeVariants(element, allowText, tokenCountCache) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return[];
    }
    const tag = getXPathTag(element);
    const classVariants = [];
    const classSeen = new Set();
    const pushClassVariant = (nodeTest, score, strategy) => {
      if (!nodeTest || classSeen.has(nodeTest) || containsNumericPosition(nodeTest) || containsQuarantinedAttributeValue(nodeTest)
      || containsMutableStateAttributeReference(nodeTest)) {
        return;
      }
      classSeen.add(nodeTest);
      classVariants.push({
        nodeTest,
        score,
        strategy,
      });
    };
    const tokenCandidates = getGraphClassRecoveryTokens(element, tokenCountCache);
    const textProfile = allowText ? getGraphTextProfile(element): null;
    const normalizedText = textProfile?.value || "";
    const exactTextPredicate = textProfile && normalizedText.length <= 100 ? textProfile.exactPredicate: "";
    const stableAttributes = Array.from(element.attributes || []).filter(isGraphAttributeEligible).map(attribute => ({
      attribute,
      penalty: getGraphAttributeStabilityPenalty(attribute),
    })).filter(candidate => Number.isFinite(candidate.penalty)).sort((left, right) => left.penalty - right.penalty).slice(0, 4);
    for (const tokenCandidate of tokenCandidates) {
      const classPredicate = getGraphClassRecoveryTokenPredicate(tokenCandidate.token);
      if (!classPredicate) {
        continue;
      }
      pushClassVariant(`${tag}[${classPredicate}]`, tokenCandidate.score + 180, "class-token-recovery");
      if (exactTextPredicate) {
        pushClassVariant(`${tag}[${classPredicate} and ${exactTextPredicate}]`, tokenCandidate.score + 130, "class-token-and-text-recovery");
      }
      for (const {
        attribute,
        penalty,
      }
      of stableAttributes) {
        const attributePredicate = getGraphExactAttributePredicate(attribute.name, attribute.value);
        if (attributePredicate) {
          pushClassVariant(`${tag}[${classPredicate} and ${attributePredicate}]`, tokenCandidate.score + penalty + 115, "class-token-and-attribute-recovery");
        }
      }
    }
    const pairCandidates = tokenCandidates.slice(0, 8);
    for (let leftIndex = 0; leftIndex < pairCandidates.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < pairCandidates.length; rightIndex += 1) {
        const left = pairCandidates[leftIndex];
        const right = pairCandidates[rightIndex];
        const leftPredicate = getGraphClassRecoveryTokenPredicate(left.token);
        const rightPredicate = getGraphClassRecoveryTokenPredicate(right.token);
        if (!leftPredicate || !rightPredicate) {
          continue;
        }
        const pairPredicate = `${leftPredicate} and ` + `${rightPredicate}`;
        pushClassVariant(`${tag}[${pairPredicate}]`, left.score + right.score + 220, "class-token-pair-recovery");
        if (exactTextPredicate) {
          pushClassVariant(`${tag}[${pairPredicate} and ${exactTextPredicate}]`, left.score + right.score + 160, "class-token-pair-and-text-recovery");
        }
      }
    }
    const stableVariants = getGraphScopedNodeVariants(element, allowText).slice(0, 12);
    return[
      ...classVariants.sort((left, right) => left.score - right.score || left.nodeTest.length - right.nodeTest.length).slice(0,
      16),
      ...stableVariants,
    ].slice(0, GRAPH_CLASS_RECOVERY_MAX_VARIANTS_PER_NODE);
  }
  function findNonPositionalClassRecoveryXPath(target, candidateIsAllowed = null) {
    const outcome = {
      xpath: "",
      generated: 0,
    };
    if (!(target instanceof Element) || isRecorderOverlayElement(target)) {
      return outcome;
    }
    const startedAt = getSelectorSearchNow();
    const tokenCountCache = new Map();
    const targetVariants = getGraphClassRecoveryNodeVariants(target, true, tokenCountCache);
    const isBudgetAvailable = () => (outcome.generated < GRAPH_CLASS_RECOVERY_MAX_GENERATED && getSelectorSearchNow() - startedAt < GRAPH_CLASS_RECOVERY_MAX_MS);
    const tryXPath = xpath => {
      if (!isBudgetAvailable()) {
        return false;
      }
      outcome.generated += 1;
      if (isSafeFinalGraphXPath(xpath, target)
      && (!candidateIsAllowed || candidateIsAllowed(xpath, "class-token", [target]))) {
        outcome.xpath = xpath;
        return true;
      }
      return false;
    };
    for (const targetVariant of targetVariants.slice(0, GRAPH_CLASS_RECOVERY_DIRECT_MAX_VARIANTS)) {
      if (tryXPath(`//${targetVariant.nodeTest}`)) {
        return outcome;
      }
    }
    const ancestors = [];
    let ancestor = target.parentElement;
    let depth = 0;
    while (ancestor instanceof Element && depth < GRAPH_SCOPED_RECOVERY_MAX_ANCESTOR_DEPTH) {
      const ancestorTag = ancestor.tagName?.toLowerCase();
      if (ancestorTag === "html" || ancestorTag === "body" || isRecorderOverlayElement(ancestor)) {
        break;
      }
      ancestors.push({
        element: ancestor,
        depth,
      });
      ancestor = ancestor.parentElement;
      depth += 1;
    }
    const contextualTargetVariants = targetVariants.slice(0, GRAPH_CLASS_RECOVERY_TARGET_VARIANTS_PER_ANCHOR);
    const stableAncestorCandidates = [];
    const stableAncestorSeen = new Set();
    for (const ancestorEntry of ancestors) {
      const stableVariants = getGraphScopedNodeVariants(ancestorEntry.element, false).slice(0, 4);
      for (const stableVariant of stableVariants) {
        if (stableAncestorSeen.has(stableVariant.nodeTest)) {
          continue;
        }
        stableAncestorSeen.add(stableVariant.nodeTest);
        stableAncestorCandidates.push({
          nodeTest: stableVariant.nodeTest,
          score: (Number.isFinite(stableVariant.score) ? stableVariant.score: 1000) + ancestorEntry.depth * 3,
        });
      }
    }
    stableAncestorCandidates.sort((left, right) => left.score - right.score || left.nodeTest.length - right.nodeTest.length);
    for (const ancestorVariant of stableAncestorCandidates.slice(0, GRAPH_CLASS_RECOVERY_STABLE_ANCESTOR_MAX_VARIANTS)) {
      for (const targetVariant of contextualTargetVariants) {
        if (tryXPath(`//${ancestorVariant.nodeTest}` + `//${targetVariant.nodeTest}`)) {
          return outcome;
        }
        if (!isBudgetAvailable()) {
          return outcome;
        }
      }
    }
    const classAncestorCandidates = [];
    const classAncestorSeen = new Set();
    for (const ancestorEntry of ancestors) {
      if (!isBudgetAvailable()) {
        return outcome;
      }
      const classVariants = getGraphClassRecoveryNodeVariants(ancestorEntry.element, false, tokenCountCache).filter(variant => String(variant.strategy
      || "").startsWith("class-token")).slice(0, 2);
      for (const classVariant of classVariants) {
        if (classAncestorSeen.has(classVariant.nodeTest)) {
          continue;
        }
        classAncestorSeen.add(classVariant.nodeTest);
        classAncestorCandidates.push({
          nodeTest: classVariant.nodeTest,
          score: classVariant.score + ancestorEntry.depth * 6,
        });
      }
    }
    classAncestorCandidates.sort((left, right) => left.score - right.score || left.nodeTest.length - right.nodeTest.length);
    for (const ancestorVariant of classAncestorCandidates.slice(0, GRAPH_CLASS_RECOVERY_CLASS_ANCESTOR_MAX_VARIANTS)) {
      for (const targetVariant of contextualTargetVariants) {
        if (tryXPath(`//${ancestorVariant.nodeTest}` + `//${targetVariant.nodeTest}`)) {
          return outcome;
        }
        if (!isBudgetAvailable()) {
          return outcome;
        }
      }
    }
    return outcome;
  }
  function isSafeSingleIndexBaseXPath(xpath) {
    return(!!xpath && isAcceptableGraphXPath(xpath) && !containsNumericPosition(xpath) && !containsExplicitChildAxis(xpath)
    && !containsBlacklistedClassRecoveryToken(xpath) && !isAbsoluteDocumentFallbackXPath(xpath) && !containsQuarantinedAttributeValue(xpath)
    && !containsMutableStateAttributeReference(xpath));
  }
  function isSafeFinalSingleIndexedXPath(xpath, target) {
    const text = String(xpath || "").trim();
    const match = /^\(([\s\S]+)\)\[\s*([1-3])\s*\]$/.exec(text);
    if (!match || !isAcceptableGraphXPath(text) || !isSafeSingleIndexBaseXPath(match[1])) {
      return false;
    }
    return matchesOnlyElement(text, target);
  }
  function isSameStructuralNodeKind(left, right) {
    return(left instanceof Element && right instanceof Element
    && String(left.localName || left.tagName || "").toLowerCase() === String(right.localName || right.tagName || "").toLowerCase()
    && String(left.namespaceURI || "") === String(right.namespaceURI || ""));
  }
  function buildGuaranteedStructuralXPath(target) {
    if (!(target instanceof Element) || isRecorderOverlayElement(target)) {
      return "";
    }
    const ownerDocument = target.ownerDocument || document;
    if (!(ownerDocument.documentElement instanceof Element) || target.getRootNode?.() !== ownerDocument) {
      return "";
    }
    const steps = [];
    let current = target;
    while (current instanceof Element) {
      let ordinal = 1;
      let sibling = current.previousElementSibling;
      while (sibling instanceof Element) {
        if (isSameStructuralNodeKind(sibling, current)) {
          ordinal += 1;
        }
        sibling = sibling.previousElementSibling;
      }
      steps.unshift(`${getXPathTag(current)}[${ordinal}]`);
      if (current === ownerDocument.documentElement) {
        break;
      }
      current = current.parentElement;
    }
    if (current !== ownerDocument.documentElement || !steps.length) {
      return "";
    }
    return `/${steps.join("/")}`;
  }
  function isSafeFinalStructuralXPath(xpath, target) {
    const text = String(xpath || "").trim();
    if (!text || !(target instanceof Element)) {
      return false;
    }
    const expected = buildGuaranteedStructuralXPath(target);
    return !!expected && text === expected && matchesOnlyElement(text, target);
  }
  function inspectSingleIndexBaseXPath(baseXPath, target) {
    if (!isSafeSingleIndexBaseXPath(baseXPath) || !(target instanceof Element)) {
      return null;
    }
    try {
      const ownerDocument = target.ownerDocument || document;
      const result = ownerDocument.evaluate(baseXPath, ownerDocument, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const matchCount = result.snapshotLength;
      if (matchCount < 1 || matchCount > SINGLE_INDEX_FALLBACK_MAX_MATCHES) {
        return null;
      }
      let targetIndex = - 1;
      for (let index = 0; index < matchCount; index += 1) {
        const match = result.snapshotItem(index);
        if (match === target) {
          targetIndex = index;
        }
      }
      if (targetIndex < 0) {
        return null;
      }
      if (matchCount === 1) {
        return isSafeFinalGraphXPath(baseXPath, target) ? {
          nonIndexedXPath: baseXPath,
          indexedXPath: "",
          baseXPath,
          matchCount,
          ordinal: null,
        }
        : null;
      }
      const ordinal = targetIndex + 1;
      if (ordinal < 1 || ordinal > SINGLE_INDEX_FALLBACK_MAX_MATCHES) {
        return null;
      }
      const indexedXPath = `(${baseXPath})[${ordinal}]`;
      if (!isSafeFinalSingleIndexedXPath(indexedXPath, target)) {
        return null;
      }
      return {
        nonIndexedXPath: "",
        indexedXPath,
        baseXPath,
        matchCount,
        ordinal,
      };
    } catch {
      return null;
    }
  }
  function prepareBoundedSemanticFallback(target, candidateIsAllowed = null) {
    const outcome = {
      nonIndexedXPath: "",
      indexedXPath: "",
      baseXPath: "",
      matchCount: null,
      ordinal: null,
      candidatesChecked: 0,
    };
    if (!(target instanceof Element) || isRecorderOverlayElement(target)) {
      return outcome;
    }
    const targetVariants = getGraphScopedNodeVariants(target, true).slice(0, SINGLE_INDEX_FALLBACK_MAX_TARGET_VARIANTS);
    if (!targetVariants.length) {
      return outcome;
    }
    const anchorCandidates = [];
    const anchorSeen = new Set();
    let ancestor = target.parentElement;
    let depth = 0;
    while (ancestor instanceof Element && depth < GRAPH_SCOPED_RECOVERY_MAX_ANCESTOR_DEPTH) {
      const ancestorTag = ancestor.tagName?.toLowerCase();
      if (ancestorTag === "html" || ancestorTag === "body" || isRecorderOverlayElement(ancestor)) {
        break;
      }
      const ancestorVariants = getGraphScopedNodeVariants(ancestor, false).slice(0, SINGLE_INDEX_FALLBACK_MAX_VARIANTS_PER_ANCESTOR);
      for (const ancestorVariant of ancestorVariants) {
        const anchorXPath = `//${ancestorVariant.nodeTest}`;
        if (anchorSeen.has(anchorXPath) || !matchesOnlyElement(anchorXPath, ancestor)) {
          continue;
        }
        anchorSeen.add(anchorXPath);
        anchorCandidates.push({
          xpath: anchorXPath,
          score: ancestorVariant.score + depth * 3,
        });
      }
      ancestor = ancestor.parentElement;
      depth += 1;
    }
    anchorCandidates.sort((left, right) => left.score - right.score || left.xpath.length - right.xpath.length);
    const baseCandidates = [];
    const baseSeen = new Set();
    const pushBaseCandidate = xpath => {
      if (!xpath || baseSeen.has(xpath) || !isSafeSingleIndexBaseXPath(xpath)) {
        return;
      }
      baseSeen.add(xpath);
      baseCandidates.push(xpath);
    };
    for (const anchorCandidate of anchorCandidates.slice(0, SINGLE_INDEX_FALLBACK_MAX_ANCHOR_VARIANTS)) {
      for (const targetVariant of targetVariants) {
        pushBaseCandidate(`${anchorCandidate.xpath}` + `//${targetVariant.nodeTest}`);
      }
    }
    for (const targetVariant of targetVariants) {
      pushBaseCandidate(`//${targetVariant.nodeTest}`);
    }
    for (const baseXPath of baseCandidates) {
      if (outcome.candidatesChecked >= SINGLE_INDEX_FALLBACK_MAX_BASE_CANDIDATES) {
        break;
      }
      outcome.candidatesChecked += 1;
      const inspected = inspectSingleIndexBaseXPath(baseXPath, target);
      if (!inspected) {
        continue;
      }
      if (inspected.nonIndexedXPath
      && (!candidateIsAllowed || candidateIsAllowed(inspected.nonIndexedXPath, "semantic"))) {
        return {
          ...outcome,
          ...inspected,
        };
      }
      if (inspected.indexedXPath && !outcome.indexedXPath
      && (!candidateIsAllowed || candidateIsAllowed(inspected.indexedXPath, "indexed"))) {
        outcome.indexedXPath = inspected.indexedXPath;
        outcome.baseXPath = inspected.baseXPath;
        outcome.matchCount = inspected.matchCount;
        outcome.ordinal = inspected.ordinal;
      }
    }
    return outcome;
  }
  function prepareClickSnapshotIndexFallback(target) {
    const outcome = {
      nonIndexedXPath: "",
      indexedXPath: "",
      baseXPath: "",
      matchCount: null,
      ordinal: null,
      candidatesChecked: 0,
    };
    if (!(target instanceof Element) || isRecorderOverlayElement(target)) {
      return outcome;
    }
    const variants = getGraphScopedNodeVariants(target, true).slice(0, 12);
    for (const variant of variants) {
      const baseXPath = `//${variant.nodeTest}`;
      if (!isSafeSingleIndexBaseXPath(baseXPath)) {
        continue;
      }
      outcome.candidatesChecked += 1;
      const inspected = inspectSingleIndexBaseXPath(baseXPath, target);
      if (!inspected) {
        continue;
      }
      if (inspected.nonIndexedXPath) {
        return {
          ...outcome,
          ...inspected,
        };
      }
      if (inspected.indexedXPath && !outcome.indexedXPath) {
        outcome.indexedXPath = inspected.indexedXPath;
        outcome.baseXPath = inspected.baseXPath;
        outcome.matchCount = inspected.matchCount;
        outcome.ordinal = inspected.ordinal;
      }
    }
    return outcome;
  }
  function getSelectorSearchNow() {
    return typeof performance?.now === "function" ? performance.now(): Date.now();
  }
  function advanceSelectorSearch(iterator, cancellation, maxSteps, diagnostics, diagnosticStepKey) {
    if (!iterator || cancellation.cancelled) {
      return {
        done: true,
        xpath: "",
      };
    }
    const startedAt = getSelectorSearchNow();
    for (let step = 0; step < maxSteps; step += 1) {
      if (cancellation.cancelled) {
        return {
          done: true,
          xpath: "",
        };
      }
      const next = iterator.next();
      diagnostics[diagnosticStepKey] += 1;
      if (next.done) {
        return {
          done: true,
          xpath: typeof next.value === "string" ? next.value: "",
        };
      }
      if (getSelectorSearchNow() - startedAt >= SELECTOR_SLICE_MAX_MS) {
        break;
      }
    }
    return {
      done: false,
      xpath: "",
    };
  }
  function cancelSelectorIterator(iterator, cancellation) {
    cancellation.cancelled = true;
    try {
      iterator?.return?.();
    } catch {
    }
  }
  function isLinearScanElementAllowed(element, target) {
    if (!(element instanceof Element) || !(target instanceof Element) || !element.isConnected
    || element.ownerDocument !== target.ownerDocument || isRecorderOverlayElement(element)) {
      return false;
    }
    const tagName = String(element.tagName || "").toLowerCase();
    return tagName !== "html" && tagName !== "body";
  }
  function getSurroundingLinearSiblings(element) {
    const siblings = [];
    let previous = element?.previousElementSibling || null;
    let next = element?.nextElementSibling || null;
    while ((previous || next) && siblings.length < LINEAR_SCAN_MAX_SIBLINGS_PER_RING) {
      if (previous) {
        siblings.push(previous);
        previous = previous.previousElementSibling;
      }
      if (next && siblings.length < LINEAR_SCAN_MAX_SIBLINGS_PER_RING) {
        siblings.push(next);
        next = next.nextElementSibling;
      }
    }
    return siblings;
  }
  /*
   * A deterministic DOM walk, not a weighted graph:
   * target -> target siblings -> parent -> parent peers -> each peer's direct
   * children -> grandparent, repeating the same ring until the document root.
   */
  function * iterateLinearUpwardElements(target, cancellation = null) {
    if (!isLinearScanElementAllowed(target, target)) {
      return;
    }
    const visited = new Set();
    let visitedCount = 0;
    const emit = function * (element, source, ancestorDepth) {
      if (cancellation?.cancelled || visitedCount >= LINEAR_SCAN_MAX_VISITED || visited.has(element)
      || !isLinearScanElementAllowed(element, target)) {
        return;
      }
      visited.add(element);
      visitedCount += 1;
      yield {
        element,
        source,
        ancestorDepth,
      };
    };
    yield * emit(target, "target", 0);
    for (const sibling of getSurroundingLinearSiblings(target)) {
      if (cancellation?.cancelled || visitedCount >= LINEAR_SCAN_MAX_VISITED) {
        return;
      }
      yield * emit(sibling, "target-sibling", 0);
    }
    let ancestor = target.parentElement;
    let ancestorDepth = 1;
    while (isLinearScanElementAllowed(ancestor, target) && ancestorDepth <= LINEAR_SCAN_MAX_ANCESTOR_DEPTH
    && visitedCount < LINEAR_SCAN_MAX_VISITED) {
      if (cancellation?.cancelled) {
        return;
      }
      yield * emit(ancestor, "ancestor", ancestorDepth);
      const peers = getSurroundingLinearSiblings(ancestor);
      for (const peer of peers) {
        if (cancellation?.cancelled || visitedCount >= LINEAR_SCAN_MAX_VISITED) {
          return;
        }
        yield * emit(peer, "ancestor-peer", ancestorDepth);
      }
      let peerChildrenVisited = 0;
      for (const peer of peers) {
        for (const child of Array.from(peer.children || [])) {
          if (cancellation?.cancelled || visitedCount >= LINEAR_SCAN_MAX_VISITED
          || peerChildrenVisited >= LINEAR_SCAN_MAX_PEER_CHILDREN_PER_RING) {
            break;
          }
          peerChildrenVisited += 1;
          yield * emit(child, "ancestor-peer-child", ancestorDepth);
        }
        if (peerChildrenVisited >= LINEAR_SCAN_MAX_PEER_CHILDREN_PER_RING) {
          break;
        }
      }
      ancestor = ancestor.parentElement;
      ancestorDepth += 1;
    }
  }
  /*
   * The independent downward walk is breadth-first. It ends immediately for
   * leaf targets and never spills into siblings or ancestors.
   */
  function * iterateLinearDownwardElements(target, cancellation = null) {
    if (!isLinearScanElementAllowed(target, target)) {
      return;
    }
    const queue = [];
    for (const child of Array.from(target.children || [])) {
      if (queue.length >= LINEAR_SCAN_DOWNWARD_MAX_VISITED) {
        break;
      }
      queue.push({
        element: child,
        depth: 1,
      });
    }
    const visited = new Set();
    for (let index = 0; index < queue.length && index < LINEAR_SCAN_DOWNWARD_MAX_VISITED; index += 1) {
      if (cancellation?.cancelled) {
        return;
      }
      const entry = queue[index];
      if (visited.has(entry.element) || !isLinearScanElementAllowed(entry.element, target)) {
        continue;
      }
      visited.add(entry.element);
      yield {
        element: entry.element,
        source: "target-descendant",
        ancestorDepth: - entry.depth,
      };
      if (entry.depth >= LINEAR_SCAN_DOWNWARD_MAX_DEPTH) {
        continue;
      }
      for (const child of Array.from(entry.element.children || [])) {
        if (queue.length >= LINEAR_SCAN_DOWNWARD_MAX_VISITED) {
          break;
        }
        queue.push({
          element: child,
          depth: entry.depth + 1,
        });
      }
    }
  }
  function getLinearTargetNodeTests(target) {
    if (!(target instanceof Element)) {
      return [];
    }
    const tag = getXPathTag(target);
    const attributes = getFastXPathAttributes(target);
    const tests = [];
    const seen = new Set();
    const push = nodeTest => {
      const xpath = `//${nodeTest}`;
      if (!nodeTest || seen.has(nodeTest) || !isSafeFinalGraphXPath(xpath)) {
        return;
      }
      seen.add(nodeTest);
      tests.push(nodeTest);
    };
    for (const attribute of attributes) {
      push(`${tag}[${attribute.predicate}]`);
    }
    const textProfile = getGraphTextProfile(target);
    if (textProfile?.value && textProfile.value.length <= 80) {
      push(`${tag}[${textProfile.exactPredicate}]`);
      for (const attribute of attributes.slice(0, 8)) {
        push(`${tag}[${attribute.predicate} and ${textProfile.exactPredicate}]`);
      }
    }
    push(tag);
    for (let leftIndex = 0; leftIndex < attributes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < attributes.length; rightIndex += 1) {
        push(`${tag}[${attributes[leftIndex].predicate} and ${attributes[rightIndex].predicate}]`);
        if (tests.length >= LINEAR_SCAN_MAX_TARGET_NODE_TESTS) {
          return tests;
        }
      }
    }
    outer: for (let firstIndex = 0; firstIndex < attributes.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < attributes.length; secondIndex += 1) {
        for (let thirdIndex = secondIndex + 1; thirdIndex < attributes.length; thirdIndex += 1) {
          push(`${tag}[${attributes[firstIndex].predicate} and ${attributes[secondIndex].predicate}`
          + ` and ${attributes[thirdIndex].predicate}]`);
          if (tests.length >= LINEAR_SCAN_MAX_TARGET_NODE_TESTS) {
            break outer;
          }
        }
      }
    }
    return tests.slice(0, LINEAR_SCAN_MAX_TARGET_NODE_TESTS);
  }
  function isMeaningfulLinearRelationshipNodeTest(nodeTest, target) {
    const text = String(nodeTest || "").trim();
    if (!text || !(target instanceof Element) || text === getXPathTag(target)) {
      return false;
    }
    const openingBracket = text.indexOf("[");
    const predicateText = openingBracket >= 0 ? text.slice(openingBracket): "";
    if (!predicateText) {
      return false;
    }
    const isSingleGenericControlAttribute = /^\[\s*@(type|role)\s*=([\s\S]+)\]$/i.test(predicateText)
    && !/\s+and\s+/i.test(predicateText);
    return!isSingleGenericControlAttribute;
  }
  function getLinearUniqueXPathElement(xpath, ownerDocument, cache) {
    if (cache.has(xpath)) {
      return cache.get(xpath);
    }
    let uniqueElement = null;
    try {
      const result = ownerDocument.evaluate(xpath, ownerDocument, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      if (result.snapshotLength === 1 && result.snapshotItem(0) instanceof Element) {
        uniqueElement = result.snapshotItem(0);
      }
    } catch {
    }
    cache.set(xpath, uniqueElement);
    return uniqueElement;
  }
  function getLinearSimpleAnchorXpaths(element, uniquenessCache) {
    if (!(element instanceof Element)) {
      return [];
    }
    const ownerDocument = element.ownerDocument || document;
    const tag = getXPathTag(element);
    const candidateXpaths = [];
    const candidates = [];
    const seen = new Set();
    const queue = xpath => {
      if (!xpath || seen.has(xpath) || candidateXpaths.length >= LINEAR_SCAN_MAX_ANCHOR_CANDIDATES
      || !isSafeFinalGraphXPath(xpath)) {
        return;
      }
      seen.add(xpath);
      candidateXpaths.push(xpath);
    };
    for (const attribute of getFastXPathAttributes(element).slice(0, 3)) {
      queue(`//${tag}[${attribute.predicate}]`);
    }
    const normalizedText = normalizeGraphTextValue(element.textContent);
    if (normalizedText && normalizedText.length <= 80 && !isRepeatedCompositeGraphText(normalizedText)) {
      queue(`//${tag}[normalize-space(.)=${xpathLiteral(normalizedText)}]`);
    }
    queue(`//${tag}`);
    for (const xpath of candidateXpaths) {
      if (getLinearUniqueXPathElement(xpath, ownerDocument, uniquenessCache) === element) {
        candidates.push(xpath);
      }
      if (candidates.length >= LINEAR_SCAN_MAX_ANCHOR_XPATHS) {
        break;
      }
    }
    return candidates;
  }
  function * iterateLinearRelationshipCandidates(anchor, target, targetNodeTests, uniquenessCache) {
    if (anchor === target) {
      for (const targetNodeTest of targetNodeTests) {
        yield `//${targetNodeTest}`;
      }
      return;
    }
    const anchorXpaths = getLinearSimpleAnchorXpaths(anchor, uniquenessCache);
    if (!anchorXpaths.length) {
      return;
    }
    const anchorContainsTarget = anchor.contains(target);
    const targetContainsAnchor = target.contains(anchor);
    const sharesParent = !!anchor.parentElement && anchor.parentElement === target.parentElement;
    const position = anchor.compareDocumentPosition(target);
    const meaningfulTargetNodeTests = targetNodeTests.filter(nodeTest => {
      return isMeaningfulLinearRelationshipNodeTest(nodeTest, target);
    });
    for (const anchorXPath of anchorXpaths) {
    const relationshipTargetNodeTests = anchorContainsTarget || targetContainsAnchor || sharesParent
      ? targetNodeTests: meaningfulTargetNodeTests;
      for (const targetNodeTest of relationshipTargetNodeTests) {
        if (sharesParent) {
          if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
            yield `${anchorXPath}/following-sibling::${targetNodeTest}`;
          }
          if (position & Node.DOCUMENT_POSITION_PRECEDING) {
            yield `${anchorXPath}/preceding-sibling::${targetNodeTest}`;
          }
          continue;
        }
        if (anchorContainsTarget) {
          yield `${anchorXPath}//${targetNodeTest}`;
          continue;
        }
        if (targetContainsAnchor) {
          yield `${anchorXPath}/ancestor::${targetNodeTest}`;
          continue;
        }
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
          yield `${anchorXPath}/following::${targetNodeTest}`;
        }
        if (position & Node.DOCUMENT_POSITION_PRECEDING) {
          yield `${anchorXPath}/preceding::${targetNodeTest}`;
        }
      }
    }
  }
  function * createLinearXPathSearch(target, direction, cancellation, uniquenessCache, statistics, candidateIsAllowed = null) {
    const targetNodeTests = getLinearTargetNodeTests(target);
    if (!targetNodeTests.length) {
      return "";
    }
    const elementIterator = direction === "downward" ? iterateLinearDownwardElements(target, cancellation)
    : iterateLinearUpwardElements(target, cancellation);
    const seenXpaths = new Set();
    for (const entry of elementIterator) {
      if (cancellation.cancelled || statistics.generated >= LINEAR_SCAN_MAX_GENERATED) {
        return "";
      }
      statistics.visited += 1;
      yield null;
      for (const xpath of iterateLinearRelationshipCandidates(entry.element, target, targetNodeTests, uniquenessCache)) {
        if (cancellation.cancelled || statistics.generated >= LINEAR_SCAN_MAX_GENERATED) {
          return "";
        }
        if (!xpath || seenXpaths.has(xpath)) {
          continue;
        }
        seenXpaths.add(xpath);
        statistics.generated += 1;
        if (isSafeFinalGraphXPath(xpath, target)
        && (!candidateIsAllowed || candidateIsAllowed(xpath, direction, [entry.element, target]))) {
          return xpath;
        }
        yield null;
      }
    }
    return "";
  }
  function createLinearSelectorSearch(target, candidateIsAllowed = null) {
    let boundedSemanticFallback = null;
    const upwardCancellation = {
      cancelled: false,
    };
    const downwardCancellation = {
      cancelled: false,
    };
    const uniquenessCache = new Map();
    const upwardStatistics = {
      visited: 0,
      generated: 0,
    };
    const downwardStatistics = {
      visited: 0,
      generated: 0,
    };
    const upwardIterator = createLinearXPathSearch(target, "upward", upwardCancellation, uniquenessCache, upwardStatistics,
    candidateIsAllowed);
    const downwardIterator = createLinearXPathSearch(target, "downward", downwardCancellation, uniquenessCache, downwardStatistics,
    candidateIsAllowed);
    let scheduledTimer = null;
    let settled = false;
    let result = null;
    const settleListeners = new Set();
    const diagnostics = {
      upwardSteps: 0,
      downwardSteps: 0,
      upwardVisited: 0,
      downwardVisited: 0,
      upwardGenerated: 0,
      downwardGenerated: 0,
      upwardDone: false,
      downwardDone: false,
      dispatchSettleRounds: 0,
      classRecoveryGenerated: 0,
      nonPositionalRecovery: null,
      semanticFallbackPrepared: false,
      semanticFallbackAttempted: false,
      semanticFallbackCandidatesChecked: 0,
      descendantBackReferenceAttempted: false,
      descendantBackReferenceUsed: false,
      descendantBackReferenceVisited: 0,
      descendantBackReferenceGenerated: 0,
      descendantBackReferenceLinearSteps: 0,
      descendantBackReferenceSourceXPath: null,
      descendantBackReferenceSourceStrategy: null,
      indexedFallbackPrepared: false,
      indexedFallbackUsed: false,
      indexedFallbackMatchCount: null,
      indexedFallbackOrdinal: null,
      structuralFallbackUsed: false,
      traversalPolicy: "interleaved-linear-upward-and-downward-then-descendant-back-reference-before-positional-fallbacks",
      losingSearchCancelled: false,
    };
    function getBoundedSemanticFallback() {
      if (!boundedSemanticFallback) {
        boundedSemanticFallback = prepareBoundedSemanticFallback(target, candidateIsAllowed);
      }
      diagnostics.semanticFallbackPrepared = !!boundedSemanticFallback.nonIndexedXPath;
      diagnostics.semanticFallbackCandidatesChecked = boundedSemanticFallback.candidatesChecked;
      diagnostics.indexedFallbackPrepared = !!boundedSemanticFallback.indexedXPath;
      diagnostics.indexedFallbackMatchCount = boundedSemanticFallback.matchCount;
      diagnostics.indexedFallbackOrdinal = boundedSemanticFallback.ordinal;
      return boundedSemanticFallback;
    }
    function setCapturedSemanticFallback(fallback) {
      if (settled || boundedSemanticFallback || !fallback) {
        return;
      }
      if (fallback.nonIndexedXPath || fallback.indexedXPath) {
        boundedSemanticFallback = {
          ...fallback,
        };
      }
    }
    function clearScheduledRound() {
      if (scheduledTimer !== null) {
        clearTimeout(scheduledTimer);
        scheduledTimer = null;
      }
    }
    function finish(strategy, xpath) {
      if (settled) {
        return result;
      }
      const isPreparedIndexedXPath = strategy === "indexed" && !!boundedSemanticFallback && !!xpath
      && xpath === boundedSemanticFallback.indexedXPath && boundedSemanticFallback.ordinal >= 1
      && boundedSemanticFallback.ordinal <= SINGLE_INDEX_FALLBACK_MAX_MATCHES
      && xpath === `(${boundedSemanticFallback.baseXPath})` + `[${boundedSemanticFallback.ordinal}]`
      && isSafeSingleIndexBaseXPath(boundedSemanticFallback.baseXPath);
      const isPreparedStructuralXPath = strategy === "structural" && isSafeFinalStructuralXPath(xpath, target);
      const safeXPath = (isPreparedIndexedXPath || isPreparedStructuralXPath
      || (strategy !== "unresolved" && strategy !== "indexed" && strategy !== "structural"
      && isSafeFinalGraphXPath(xpath, target))) ? xpath: "";
      const winningStrategy = safeXPath ? strategy: "unresolved";
      settled = true;
      clearScheduledRound();
      if (winningStrategy === "primary") {
        cancelSelectorIterator(downwardIterator, downwardCancellation);
        diagnostics.losingSearchCancelled = !diagnostics.downwardDone;
      } else if (winningStrategy === "downward") {
        cancelSelectorIterator(upwardIterator, upwardCancellation);
        diagnostics.losingSearchCancelled = !diagnostics.upwardDone;
      } else {
        if (winningStrategy === "indexed" && (!diagnostics.upwardDone || !diagnostics.downwardDone)) {
          diagnostics.losingSearchCancelled = true;
        }
        cancelSelectorIterator(upwardIterator, upwardCancellation);
        cancelSelectorIterator(downwardIterator, downwardCancellation);
      }
      diagnostics.upwardVisited = upwardStatistics.visited;
      diagnostics.downwardVisited = downwardStatistics.visited;
      diagnostics.upwardGenerated = upwardStatistics.generated;
      diagnostics.downwardGenerated = downwardStatistics.generated;
      result = {
        xpath: safeXPath,
        strategy: winningStrategy,
      };
      for (const listener of settleListeners) {
        try {
          listener(result);
        } catch {
        }
      }
      settleListeners.clear();
      return result;
    }
    function finishWithFinalRecovery() {
      const semanticFallback = getBoundedSemanticFallback();
      if (semanticFallback.nonIndexedXPath) {
        diagnostics.nonPositionalRecovery = "bounded-semantic";
        return finish("primary", semanticFallback.nonIndexedXPath);
      }
      diagnostics.descendantBackReferenceAttempted = true;
      const descendantRecovery = findDescendantBackReferenceXPath(target, candidateIsAllowed);
      diagnostics.descendantBackReferenceVisited = descendantRecovery.visited;
      diagnostics.descendantBackReferenceGenerated = descendantRecovery.generated;
      diagnostics.descendantBackReferenceLinearSteps = descendantRecovery.linearSteps;
      diagnostics.descendantBackReferenceSourceXPath = descendantRecovery.descendantXPath || null;
      diagnostics.descendantBackReferenceSourceStrategy = descendantRecovery.descendantStrategy;
      if (descendantRecovery.xpath) {
        diagnostics.descendantBackReferenceUsed = true;
        diagnostics.nonPositionalRecovery = "descendant-back-reference";
        return finish("descendant-back-reference", descendantRecovery.xpath);
      }
      const recovery = findNonPositionalClassRecoveryXPath(target, candidateIsAllowed);
      diagnostics.classRecoveryGenerated = recovery.generated;
      if (recovery.xpath) {
        diagnostics.nonPositionalRecovery = "class-token";
        return finish("primary", recovery.xpath);
      }
      if (semanticFallback.indexedXPath) {
        diagnostics.indexedFallbackUsed = true;
        return finish("indexed", semanticFallback.indexedXPath);
      }
      const structuralXPath = buildGuaranteedStructuralXPath(target);
      if (structuralXPath) {
        diagnostics.structuralFallbackUsed = true;
        return finish("structural", structuralXPath);
      }
      return finish("unresolved", "");
    }
    function scheduleRound() {
      if (settled || scheduledTimer !== null) {
        return;
      }
      scheduledTimer = setTimeout(() => {
        scheduledTimer = null;
        runRound(true);
      }, 0);
    }
    function runRound(shouldScheduleNext = true) {
      if (settled) {
        return result;
      }
      clearScheduledRound();
      if (!diagnostics.upwardDone) {
        const upwardProgress = advanceSelectorSearch(upwardIterator, upwardCancellation, SELECTOR_PRIMARY_SLICE_STEPS, diagnostics,
        "upwardSteps");
        diagnostics.upwardDone = upwardProgress.done;
        if (upwardProgress.xpath) {
          return finish("primary", upwardProgress.xpath);
        }
      }
      if (!diagnostics.downwardDone) {
        const downwardProgress = advanceSelectorSearch(downwardIterator, downwardCancellation, SELECTOR_DOWNWARD_SLICE_STEPS, diagnostics,
        "downwardSteps");
        diagnostics.downwardDone = downwardProgress.done;
        if (downwardProgress.xpath) {
          return finish("downward", downwardProgress.xpath);
        }
      }
      diagnostics.upwardVisited = upwardStatistics.visited;
      diagnostics.downwardVisited = downwardStatistics.visited;
      diagnostics.upwardGenerated = upwardStatistics.generated;
      diagnostics.downwardGenerated = downwardStatistics.generated;
      if (diagnostics.upwardDone && diagnostics.downwardDone) {
        diagnostics.semanticFallbackAttempted = true;
        return finishWithFinalRecovery();
      }
      if (shouldScheduleNext) {
        scheduleRound();
      }
      return null;
    }
    function start() {
      return runRound(true);
    }
    function settleForDispatch() {
      clearScheduledRound();
      const settleStartedAt = getSelectorSearchNow();
      while (!settled && diagnostics.dispatchSettleRounds < SELECTOR_DISPATCH_SETTLE_MAX_ROUNDS && getSelectorSearchNow() - settleStartedAt < SELECTOR_DISPATCH_SETTLE_MAX_MS) {
        diagnostics.dispatchSettleRounds += 1;
        runRound(false);
      }
      if (!settled) {
        finishWithFinalRecovery();
      }
      return result;
    }
    function drainToCompletion() {
      clearScheduledRound();
      while (!settled) {
        runRound(false);
      }
      return result;
    }
    function cancel() {
      if (!settled) {
        finish("unresolved", "");
      }
    }
    function whenSettled() {
      if (settled) {
        return Promise.resolve(result);
      }
      return new Promise(resolve => {
        settleListeners.add(resolve);
        scheduleRound();
      });
    }
    function getDiagnostics() {
      return {
        ...diagnostics,
        strategy: result?.strategy || null,
      };
    }
    return {
      start,
      runRound,
      settleForDispatch,
      drainToCompletion,
      whenSettled,
      setCapturedSemanticFallback,
      cancel,
      getDiagnostics,
      get result() {
        return result;
      },
    };
  }
  function getClickXPathResult(element) {
    const fastResult = getFastClickXPath(element);
    if (fastResult.xpath) {
      return {
        xpath: fastResult.xpath,
        strategy: "primary",
        diagnostics: {
          fastXPathSearch: fastResult.diagnostics,
        },
      };
    }
    const primaryXPath = getNormalClickXPath(element);
    if (primaryXPath) {
      return {
        xpath: primaryXPath,
        strategy: "primary",
      };
    }
    return {
      xpath: "",
      strategy: "unresolved",
    };
  }
  function getSelector(element) {
    const target = getXPathFriendlyTarget(element);
    if (!target || isRecorderOverlayElement(target)) {
      return "";
    }
    if (target.tagName === "BODY" && target.isContentEditable) {
      return "xpath=//body";
    }
    if (target.tagName === "HTML" || target.tagName === "BODY") {
      return "";
    }
    const directResult = getFastClickXPath(target);
    if (directResult.xpath && isSafeFinalGraphXPath(directResult.xpath, target)) {
      return `xpath=${directResult.xpath}`;
    }
    const localXPath = findLocalControlRelationshipXPath(target);
    if (isSafeFinalGraphXPath(localXPath, target)) {
      return `xpath=${localXPath}`;
    }
    /*
     * Non-click actions run inside focus/change/input handling. Keep their
     * semantic search inside the dispatch budget so they cannot stall the next
     * pointer or Codegen hover update.
     */
    const selectorSearch = createLinearSelectorSearch(target);
    const linearResult = selectorSearch.settleForDispatch();
    if (linearResult?.xpath && linearResult.strategy !== "structural") {
      return `xpath=${linearResult.xpath}`;
    }
    const structuralXPath = buildGuaranteedStructuralXPath(target);
    return isSafeFinalStructuralXPath(structuralXPath, target) ? `xpath=${structuralXPath}`: "";
  }
  function normalizeFillXPathIdentity(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  }
  function getFillSensitiveNormalizeSpaceExpressions(xpath) {
    const text = String(xpath || "");
    const normalizedTextCall = String.raw`normalize-space\s*\(\s*(?:\.|text\s*\(\s*\)|string\s*\(\s*\.\s*\))?\s*\)`;
    const literal = String.raw`(?:'[^']*'|"[^"]*"|concat\((?:[^()]|'[^']*'|"[^"]*")*\))`;
    const expressions = [];
    for (const source of [
      String.raw`${normalizedTextCall}\s*!?=\s*${literal}`,
      String.raw`${literal}\s*!?=\s*${normalizedTextCall}`,
      String.raw`(?:contains|starts-with)\s*\(\s*${normalizedTextCall}\s*,\s*${literal}\s*\)`,
    ]) {
      for (const match of text.matchAll(new RegExp(source, "gi"))) {
        expressions.push(match[0]);
      }
    }
    return expressions;
  }
  function fillXPathTextDependsOnChangedDom(xpath, introducedDomTextByElement, relatedElements = []) {
    const expressions = getFillSensitiveNormalizeSpaceExpressions(xpath);
    if (!introducedDomTextByElement?.size || !expressions.length) {
      return false;
    }
    const literalPattern = /'([^']*)'|"([^"]*)"/g;
    const expressionLiterals = [];
    for (const expression of expressions) {
      let match = null;
      while ((match = literalPattern.exec(expression)) !== null) {
        const literalText = normalizeFillXPathIdentity(match[1] ?? match[2] ?? "");
        if (literalText) {
          expressionLiterals.push(literalText);
        }
      }
      literalPattern.lastIndex = 0;
    }
    const elementsToInspect = Array.isArray(relatedElements) && relatedElements.length
    ? relatedElements: Array.from(introducedDomTextByElement.keys());
    for (const relatedElement of elementsToInspect) {
      if (!(relatedElement instanceof Element)) {
        continue;
      }
      let current = relatedElement;
      while (current && current.tagName !== "HTML" && current.tagName !== "BODY") {
        const introducedTexts = introducedDomTextByElement.get(current);
        if (introducedTexts && Array.from(introducedTexts).some(introducedText => {
          return expressionLiterals.some(literalText => introducedText === literalText
          || introducedText.includes(literalText) || literalText.includes(introducedText));
        })) {
          return true;
        }
        current = current.parentElement;
      }
    }
    return false;
  }
  function getLiveTextEntryLocator(element, introducedDomTextByElement = null,
  hasDomTextProvenance = false) {
    const target = getCanonicalTextEntryElement(element) || getXPathFriendlyTarget(element);
    if (!target || isRecorderOverlayElement(target)) {
      return {
        target: null,
        selector: "",
        xpath: "",
        strategy: "unresolved",
        diagnostics: {
          source: "live-input-element",
          reason: "invalid-live-target",
        },
      };
    }
    let valueDerivedTextCandidatesRejected = 0;
    const candidateIsAllowed = (xpath, strategy, relatedElements = null) => {
      const hasTextPredicate = getFillSensitiveNormalizeSpaceExpressions(xpath).length > 0;
      if ((hasTextPredicate && !hasDomTextProvenance)
      || fillXPathTextDependsOnChangedDom(xpath, introducedDomTextByElement, relatedElements)) {
        valueDerivedTextCandidatesRejected += 1;
        return false;
      }
      return true;
    };
    const fastResult = getFastClickXPath(target, candidateIsAllowed);
    if (isSafeFinalGraphXPath(fastResult.xpath, target)) {
      return {
        target,
        selector: `xpath=${fastResult.xpath}`,
        xpath: fastResult.xpath,
        strategy: "input-live-fast",
        diagnostics: {
          source: "live-input-element",
          uniqueAtCommit: true,
          indexed: false,
          fastXPathSearch: fastResult.diagnostics,
          valueDerivedTextCandidatesRejected,
          fillTextProvenance: hasDomTextProvenance ? "unchanged-during-fill-session": "unavailable",
          searchContinuedAfterRejection: valueDerivedTextCandidatesRejected > 0,
        },
      };
    }
    const directXPath = getDirectTargetGraphXPath(target, 64, candidateIsAllowed);
    if (isSafeFinalGraphXPath(directXPath, target)) {
      return {
        target,
        selector: `xpath=${directXPath}`,
        xpath: directXPath,
        strategy: "input-live-direct",
        diagnostics: {
          source: "live-input-element",
          uniqueAtCommit: true,
          indexed: false,
          valueDerivedTextCandidatesRejected,
          fillTextProvenance: hasDomTextProvenance ? "unchanged-during-fill-session": "unavailable",
          searchContinuedAfterRejection: valueDerivedTextCandidatesRejected > 0,
        },
      };
    }
    const localRelationshipXPath = findLocalControlRelationshipXPath(target, candidateIsAllowed);
    if (isSafeFinalGraphXPath(localRelationshipXPath, target)) {
      return {
        target,
        selector: `xpath=${localRelationshipXPath}`,
        xpath: localRelationshipXPath,
        strategy: "input-live-local-relationship",
        diagnostics: {
          source: "live-input-element",
          uniqueAtCommit: true,
          indexed: false,
          fastXPathSearch: fastResult.diagnostics,
          valueDerivedTextCandidatesRejected,
          fillTextProvenance: hasDomTextProvenance ? "unchanged-during-fill-session": "unavailable",
          searchContinuedAfterRejection: valueDerivedTextCandidatesRejected > 0,
        },
      };
    }
    const selectorSearch = createLinearSelectorSearch(target, candidateIsAllowed);
    let result = selectorSearch.start();
    if (!result) {
      /*
       * Input commit can run on the next pointerdown. Respect the dispatch
       * budget rather than freezing that new interaction for a full scan.
       */
      result = selectorSearch.settleForDispatch();
    }
    const xpath = String(result?.xpath || "");
    const baseStrategy = String(result?.strategy || "unresolved");
    const safe = baseStrategy === "indexed" ? isSafeFinalSingleIndexedXPath(xpath, target): baseStrategy === "structural"
    ? isSafeFinalStructuralXPath(xpath, target): isSafeFinalGraphXPath(xpath, target);
    if (!safe) {
      return {
        target,
        selector: "",
        xpath: "",
        strategy: "unresolved",
        diagnostics: {
          ...selectorSearch.getDiagnostics(),
          source: "live-input-element",
          uniqueAtCommit: false,
          fastXPathSearch: fastResult.diagnostics,
          valueDerivedTextCandidatesRejected,
          fillTextProvenance: hasDomTextProvenance ? "unchanged-during-fill-session": "unavailable",
          searchContinuedAfterRejection: valueDerivedTextCandidatesRejected > 0,
        },
      };
    }
    return {
      target,
      selector: `xpath=${xpath}`,
      xpath,
      strategy: `input-live-${baseStrategy}`,
      diagnostics: {
        ...selectorSearch.getDiagnostics(),
        source: "live-input-element",
        uniqueAtCommit: true,
        fastXPathSearch: fastResult.diagnostics,
        indexed: baseStrategy === "indexed",
        valueDerivedTextCandidatesRejected,
        fillTextProvenance: hasDomTextProvenance ? "unchanged-during-fill-session": "unavailable",
        searchContinuedAfterRejection: valueDerivedTextCandidatesRejected > 0,
      },
    };
  }
  function getIframeSelector(element) {
    if (!element || isRecorderOverlayElement(element)) {
      return "iframe";
    }
    const selector = getSelector(element);
    return(selector || "iframe");
  }
  function getImplicitAriaRole(element) {
    if (!(element instanceof Element)) {
      return "";
    }
    const explicitRole = String(element.getAttribute("role") || "").trim().toLowerCase();
    if (explicitRole) {
      return explicitRole.split(/\s+/)[0] || "";
    }
    const tag = String(element.localName || "").toLowerCase();
    const type = String(element.getAttribute("type") || "text").toLowerCase();
    if (tag === "button" || (tag === "input" && ["button", "submit", "reset", "image"].includes(type))) {
      return "button";
    }
    if (tag === "a" && element.hasAttribute("href")) {
      return "link";
    }
    if (tag === "textarea") {
      return "textbox";
    }
    if (tag === "input") {
      if (["checkbox", "radio", "range"].includes(type)) {
        return type === "range" ? "slider": type;
      }
      if (["email", "search", "tel", "text", "url"].includes(type)) {
        return type === "search" ? "searchbox": "textbox";
      }
      return "";
    }
    if (tag === "select") {
      return element.multiple || Number(element.getAttribute("size") || 0) > 1 ? "listbox": "combobox";
    }
    const rolesByTag = {
      option: "option",
      li: "listitem",
      ul: "list",
      ol: "list",
      table: "table",
      tr: "row",
      td: "cell",
      img: "img",
      nav: "navigation",
      main: "main",
      article: "article",
      aside: "complementary",
      progress: "progressbar",
    };
    if (/^h[1-6]$/.test(tag)) {
      return "heading";
    }
    if (tag === "th") {
      return String(element.getAttribute("scope") || "").toLowerCase() === "row" ? "rowheader": "columnheader";
    }
    return rolesByTag[tag] || "";
  }
  function getAriaLabelledByText(element) {
    if (!(element instanceof Element)) {
      return "";
    }
    const ids = String(element.getAttribute("aria-labelledby") || "").trim().split(/\s+/).filter(Boolean);
    return normalizeGraphTextValue(ids.map(id => element.ownerDocument?.getElementById(id)?.textContent || "").join(" "));
  }
  function getAssociatedLabelText(element) {
    if (!(element instanceof Element)) {
      return "";
    }
    const labels = Array.from(element.labels || []);
    const closestLabel = element.closest?.("label");
    if (closestLabel && !labels.includes(closestLabel)) {
      labels.push(closestLabel);
    }
    return normalizeGraphTextValue(labels.map(label => label.textContent || "").join(" "));
  }
  function getSemanticLocatorMetadata(element) {
    if (!(element instanceof Element)) {
      return {};
    }
    const normalizedText = normalizeGraphTextValue(element.textContent).slice(0, 240);
    const ariaLabel = normalizeGraphTextValue(element.getAttribute("aria-label")).slice(0, 240);
    const labelledByText = getAriaLabelledByText(element).slice(0, 240);
    const labelText = getAssociatedLabelText(element).slice(0, 240);
    const altText = normalizeGraphTextValue(element.getAttribute("alt")).slice(0, 240);
    const title = normalizeGraphTextValue(element.getAttribute("title")).slice(0, 240);
    const accessibleNameCandidates = Array.from(new Set([
      ariaLabel,
      labelledByText,
      labelText,
      altText,
      title,
      normalizedText,
    ].filter(Boolean))).slice(0, 8);
    return {
      inferredRole: getImplicitAriaRole(element) || null,
      ariaLabelledByText: labelledByText || null,
      labelText: labelText || null,
      altText: altText || null,
      title: title || null,
      normalizedText: normalizedText || null,
      accessibleNameCandidates: accessibleNameCandidates.length ? accessibleNameCandidates: null,
    };
  }
  function getElementAttributes(element) {
    if (!element || isRecorderOverlayElement(element)) {
      return {
      };
    }
    const type = getNonQuarantinedAttributeValue(element, "type");
    const safeAttributes = getNonQuarantinedAttributes(element);
    const semanticMetadata = getSemanticLocatorMetadata(element);
    const allAttributes = Object.fromEntries(safeAttributes.map(attribute => [
      attribute.name,
      attribute.value,
    ]));
    return {
      tagName: element.tagName?.toLowerCase() || null,
      attributes: Object.keys(allAttributes).length ? allAttributes: null,
      id: getNonQuarantinedAttributeValue(element, "id") || null,
      name: getNonQuarantinedAttributeValue(element, "name") || null,
      type: type || null,
      value: [
        "checkbox",
        "radio",
      ].includes(type) ? (getNonQuarantinedAttributeValue(element, "value") || null): null,
      neighborText: getChoiceInputNeighborText(element) || null,
      href: getNonQuarantinedAttributeValue(element, "href") || null,
      role: getNonQuarantinedAttributeValue(element, "role") || null,
      ariaLabel: getNonQuarantinedAttributeValue(element, "aria-label") || null,
      xTooltip: getNonQuarantinedAttributeValue(element, "x-tooltip") || null,
      wireClick: getNonQuarantinedAttributeValue(element, "wire:click") || null,
      testId: getNonQuarantinedAttributeValue(element, "data-testid") || null,
      dataTest: getNonQuarantinedAttributeValue(element, "data-test") || null,
      dataCy: getNonQuarantinedAttributeValue(element, "data-cy") || null,
      dataLabel: getNonQuarantinedAttributeValue(element, "data-label") || null,
      placeholder: getNonQuarantinedAttributeValue(element, "placeholder") || null,
      ...semanticMetadata,
    };
  }
  function prepareAction(data) {
    const frameChain = [];
    try {
      let currentWindow = window;
      while (currentWindow !== currentWindow.top) {
        const parentWindow = currentWindow.parent;
        const iframeElement = Array.from(parentWindow.document.querySelectorAll("iframe")).find(frame => {
          try {
            return(frame.contentWindow === currentWindow);
          } catch {
            return false;
          }
        });
        frameChain.unshift(iframeElement ? getIframeSelector(iframeElement): "iframe(unknown)");
        currentWindow = parentWindow;
      }
    } catch {
    }
    const shadowHosts = [];
    if (data.elementHandle) {
      try {
        let current = data.elementHandle;
        while (current) {
          const root = current.getRootNode?.();
          if (!root || !root.host) {
            break;
          }
          if (isRecorderOverlayElement(root.host)) {
            break;
          }
          shadowHosts.unshift(getSelector(root.host));
          current = root.host;
        }
      } catch {
      }
    }
    const enriched = Object.assign({
    }, data, {
      listenerVersion: RECORDER_LISTENER_VERSION,
      frameChain,
      isIframe: frameChain.length > 0,
      shadowHosts: shadowHosts.filter(Boolean),
      isShadowDom: shadowHosts.length > 0,
    });
    delete enriched.elementHandle;
    return omitNullFields(enriched);
  }
  function deliverSanitizedAction(sanitized) {
    if (typeof window.__captureAction === "function") {
      try {
        return Promise.resolve(window.__captureAction(sanitized)).then(result => {
          return {
            accepted: result !== false && result?.accepted !== false,
            delivered: true,
            transport: "frame-binding",
            result,
          };
        });
      } catch (error) {
        return Promise.reject(error);
      }
    }
    try {
      if (window.top !== window && typeof window.top.__captureAction === "function") {
        return Promise.resolve(window.top.__captureAction(sanitized)).then(result => {
          return {
            accepted: result !== false && result?.accepted !== false,
            delivered: true,
            transport: "top-binding",
            result,
          };
        });
      }
    } catch {
    }
    try {
      window.top.postMessage({
        __pwAction: true,
        data: sanitized,
      }, "*");
      return Promise.resolve({
        accepted: null,
        delivered: false,
        forwarded: true,
        transport: "post-message",
      });
    } catch (error) {
      return Promise.resolve({
        accepted: false,
        delivered: false,
        forwarded: false,
        reason: String(error?.message || error || "__captureAction binding is unavailable"),
      });
    }
  }
  let dispatchSlotSequence = 0;
  let nextDispatchSlotSequence = 1;
  let dispatchSlotFlushActive = false;
  const dispatchSlots = new Map();
  function reserveDispatchSlot() {
    const slot = {
      id: ++dispatchSlotSequence,
      ready: false,
      skipped: false,
      sanitized: null,
      resolve: null,
      reject: null,
      promise: null,
    };
    slot.promise = new Promise((resolve, reject) => {
      slot.resolve = resolve;
      slot.reject = reject;
    });
    dispatchSlots.set(slot.id, slot);
    return slot;
  }
  function flushDispatchSlots() {
    if (dispatchSlotFlushActive) {
      return;
    }
    dispatchSlotFlushActive = true;
    try {
      while (true) {
        const slot = dispatchSlots.get(nextDispatchSlotSequence);
        if (!slot || !slot.ready) {
          break;
        }
        dispatchSlots.delete(slot.id);
        nextDispatchSlotSequence += 1;
        const delivery = slot.skipped ? Promise.resolve({
          accepted: false,
          delivered: false,
          skipped: true,
          reason: "reserved-action-cancelled",
        }): deliverSanitizedAction(slot.sanitized);
        Promise.resolve(delivery).then(slot.resolve, slot.reject);
      }
    } finally {
      dispatchSlotFlushActive = false;
    }
  }
  function resolveDispatchSlot(slot, data) {
    if (!slot || slot.ready || !dispatchSlots.has(slot.id)) {
      return slot?.promise || Promise.resolve({
        accepted: false,
        delivered: false,
        reason: "invalid-dispatch-slot",
      });
    }
    try {
      slot.sanitized = prepareAction(data);
    } catch (error) {
      slot.skipped = true;
      slot.preparationError = error;
    }
    slot.ready = true;
    flushDispatchSlots();
    return slot.promise;
  }
  function cancelDispatchSlot(slot) {
    if (!slot || slot.ready || !dispatchSlots.has(slot.id)) {
      return slot?.promise || Promise.resolve({
        accepted: false,
        delivered: false,
        skipped: true,
      });
    }
    slot.skipped = true;
    slot.ready = true;
    flushDispatchSlots();
    return slot.promise;
  }
  function trackPendingActionDelivery(delivery) {
    const promise = Promise.resolve(delivery);
    pendingActionDeliveries.add(promise);
    promise.then(() => {
      pendingActionDeliveries.delete(promise);
    }, () => {
      pendingActionDeliveries.delete(promise);
    });
    return promise;
  }
  function dispatch(data) {
    const slot = reserveDispatchSlot();
    return trackPendingActionDelivery(resolveDispatchSlot(slot, data));
  }
  if (window === window.top && !window.__PW_ACTION_MESSAGE_LISTENER_INSTALLED__) {
    window.__PW_ACTION_MESSAGE_LISTENER_INSTALLED__ = true;
    if (!Array.isArray(window.__PW_PENDING_ACTION_MESSAGES__)) {
      window.__PW_PENDING_ACTION_MESSAGES__ = [];
    }
    let pendingActionFlushTimer = null;
    function schedulePendingActionFlush() {
      if (pendingActionFlushTimer) {
        return;
      }
      pendingActionFlushTimer = setTimeout(flushPendingActionMessages, 50);
    }
    function flushPendingActionMessages() {
      pendingActionFlushTimer = null;
      const queue = window.__PW_PENDING_ACTION_MESSAGES__;
      if (!Array.isArray(queue) || !queue.length) {
        return;
      }
      if (typeof window.__captureAction !== "function") {
        schedulePendingActionFlush();
        return;
      }
      const pending = queue.splice(0, queue.length);
      for (const data of pending) {
        try {
          Promise.resolve(window.__captureAction(data)).catch (error => {
            console.warn("[recorder] Queued TRACE action failed:", error);
          });
        } catch (error) {
          console.warn("[recorder] Queued TRACE action failed:", error);
        }
      }
    }
    window.addEventListener("message", event => {
      if (!event.data || event.data.__pwAction !== true || !event.data.data) {
        return;
      }
      if (typeof window.__captureAction === "function") {
        try {
          Promise.resolve(window.__captureAction(event.data.data)).catch (error => {
            console.warn("[recorder] Forwarded TRACE action failed:", error);
          });
        } catch (error) {
          console.warn("[recorder] Forwarded TRACE action failed:", error);
        }
        return;
      }
      if (window.__PW_PENDING_ACTION_MESSAGES__.length >= 1000) {
        window.__PW_PENDING_ACTION_MESSAGES__.shift();
      }
      window.__PW_PENDING_ACTION_MESSAGES__.push(event.data.data);
      schedulePendingActionFlush();
    });
  }
  const TEXT_ENTRY_POLL_INTERVAL_MS = 40;
  const TEXT_ENTRY_COMMIT_DELAY_MS = 100;
  const TEXT_ENTRY_REFRESH_DELAY_MS = 50;
  const TEXT_ENTRY_POINTER_CLICK_MAX_AGE_MS = POINTER_CLICK_MAX_AGE_MS;
  const TEXT_ENTRY_TEXT_CURSOR_VALUES = new Set([
    "text",
    "vertical-text",
  ]);
  const NON_TEXT_INPUT_TYPES = new Set([
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit",
  ]);
  let scrollTimer;
  let actionSequence = 0;
  let pendingPointerGesture = null;
  let recentRecordedPointerClick = null;
  let recentCompletedPointerGesture = null;
  const pendingClickResolutionByElement = new WeakMap();
  const pendingClickResolutionJobsByGesture = new Map();
  const pendingActionDeliveries = new Set();
  let suppressedRecorderReplay = null;
  let pendingTextEntryPointerIntent = null;
  let activeTextEntrySession = null;
  let pendingTextEntryFinalizeTimer = null;
  function getEventPath(event) {
    if (typeof event?.composedPath === "function") {
      return event.composedPath();
    }
    return[
      event?.target,
    ];
  }
  function eventOriginatesFromRecorderOverlay(event) {
    return getEventPath(event).some(item => item instanceof Element && isRecorderOverlayElement(item));
  }
  function getNonOverlayElementFromPoint(event, ownerDocument = document) {
    const clientX = Number(event?.clientX);
    const clientY = Number(event?.clientY);
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }
    try {
      const elements = typeof ownerDocument.elementsFromPoint === "function" ? ownerDocument.elementsFromPoint(clientX, clientY): [
        ownerDocument.elementFromPoint(clientX, clientY),
      ];
      for (const element of elements) {
        if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
          continue;
        }
        const tagName = element.tagName?.toLowerCase();
        if (tagName === "html" || tagName === "body") {
          continue;
        }
        return element;
      }
    } catch {
    }
    return null;
  }
  function getPhysicalPointerTarget(event) {
    const path = getEventPath(event);
    let firstElement = null;
    let overlayObserved = false;
    for (const item of path) {
      if (!(item instanceof Element)) {
        continue;
      }
      if (!firstElement) {
        firstElement = item;
      }
      if (isRecorderOverlayElement(item)) {
        overlayObserved = true;
        continue;
      }
      const tagName = item.tagName?.toLowerCase();
      if (!overlayObserved && tagName !== "html" && tagName !== "body") {
        return item;
      }
    }
    const ownerDocument = firstElement?.ownerDocument || document;
    const hitElement = getNonOverlayElementFromPoint(event, ownerDocument);
    if (hitElement) {
      return hitElement;
    }
    for (const item of path) {
      if (!(item instanceof Element) || isRecorderOverlayElement(item)) {
        continue;
      }
      const tagName = item.tagName?.toLowerCase();
      if (tagName === "html" || tagName === "body") {
        continue;
      }
      return item;
    }
    return null;
  }
  function getRecorderReplayTarget(event, rawElement) {
    if (!(rawElement instanceof Element)) {
      return null;
    }
    try {
      const exactTarget = getInnermostEventTarget(event, rawElement);
      if (exactTarget instanceof Element && !isRecorderOverlayElement(exactTarget)) {
        return exactTarget;
      }
    } catch {
    }
    return rawElement;
  }
  function getRecorderReplayTargetFingerprint(element) {
    if (!(element instanceof Element)) {
      return "";
    }
    const parts = [
      String(element.localName || element.tagName || "").toLowerCase(),
    ];
    for (const attributeName of[
      "id",
      "data-cy",
      "data-testid",
      "name",
      "type",
      "href",
      "role",
      "aria-label",
      "aria-haspopup",
      "title",
      "data-pc-name",
      "data-pc-section",
    ]) {
      const attributeValue = element.getAttribute(attributeName);
      if (attributeValue !== null) {
        parts.push(`${attributeName}=${attributeValue}`);
      }
    }
    const normalizedText = getGraphNormalizedText(element).slice(0, 120);
    if (normalizedText) {
      parts.push(`text=${normalizedText}`);
    }
    return parts.join("\u001f");
  }
  function getRecorderReplayInteractiveOwner(element) {
    if (!(element instanceof Element)) {
      return null;
    }
    try {
      return element.closest([
        "button",
        "a[href]",
        "input",
        "select",
        "textarea",
        "summary",
        "label",
        "[contenteditable]",
        "[role='button']",
        "[role='link']",
        "[role='menuitem']",
        "[role='option']",
        "[role='tab']",
        "[role='checkbox']",
        "[role='radio']",
        "[role='switch']",
        "[role='combobox']",
        "[aria-haspopup]:not([aria-haspopup='false'])",
        "[data-pc-name='autocomplete'][data-pc-section='root']",
        "[data-pc-name='cascadeselect'][data-pc-section='root']",
        "[data-pc-name='dropdown'][data-pc-section='root']",
        "[data-pc-name='multiselect'][data-pc-section='root']",
        "[data-pc-name='select'][data-pc-section='root']",
        "[data-pc-name='treeselect'][data-pc-section='root']",
      ].join(", ")) || element;
    } catch {
      return element;
    }
  }
  function recorderReplayTargetsMatch(remembered, target) {
    if (!remembered || !(target instanceof Element)) {
      return false;
    }
    if (remembered.target === target) {
      return true;
    }
    try {
      if (remembered.target instanceof Element && (remembered.target.contains(target) || target.contains(remembered.target))) {
        return true;
      }
    } catch {
    }
    const rememberedOwner = remembered.interactiveOwner instanceof Element
    ? remembered.interactiveOwner: getRecorderReplayInteractiveOwner(remembered.target);
    const targetOwner = getRecorderReplayInteractiveOwner(target);
    if (rememberedOwner instanceof Element && targetOwner instanceof Element) {
      if (rememberedOwner === targetOwner) {
        return true;
      }
      const ownerFingerprint = getRecorderReplayTargetFingerprint(targetOwner);
      if (ownerFingerprint && ownerFingerprint === remembered.interactiveOwnerFingerprint) {
        return true;
      }
    }
    const fingerprint = getRecorderReplayTargetFingerprint(target);
    return(!!fingerprint && fingerprint === remembered.fingerprint);
  }
  function isPointerNearElementCenter(event, element) {
    if (!(element instanceof Element)) {
      return false;
    }
    const clientX = Number(event?.clientX);
    const clientY = Number(event?.clientY);
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return false;
    }
    try {
      const rect = element.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return false;
      }
      const tolerance = Math.max(4, Math.min(8, Math.min(rect.width, rect.height) * 0.12));
      return(Math.abs(clientX - (rect.left + rect.width / 2)) <= tolerance && Math.abs(clientY - (rect.top + rect.height / 2)) <= tolerance);
    } catch {
      return false;
    }
  }
  function isPointerAtComputedReplayPoint(event, rawElement, canonicalTarget) {
    let current = rawElement instanceof Element ? rawElement: canonicalTarget;
    const visited = new Set();
    let depth = 0;
    while (current instanceof Element && !visited.has(current) && depth < 12) {
      visited.add(current);
      if (isPointerNearElementCenter(event, current)) {
        return true;
      }
      if (current === canonicalTarget) {
        break;
      }
      current = current.parentElement;
      depth += 1;
    }
    return(canonicalTarget instanceof Element && !visited.has(canonicalTarget) && isPointerNearElementCenter(event, canonicalTarget));
  }
  function rememberCompletedPointerGesture(snapshot, event, gestureId) {
    if (!(snapshot?.target instanceof Element) || !gestureId) {
      recentCompletedPointerGesture = null;
      return;
    }
    recentCompletedPointerGesture = {
      gestureId,
      target: snapshot.target,
      completedAt: Date.now(),
      clientX: Number.isFinite(event?.clientX) ? event.clientX: null,
      clientY: Number.isFinite(event?.clientY) ? event.clientY: null,
      button: Number.isFinite(event?.button) ? event.button: 0,
      consumed: false,
    };
  }
  function consumeNativeClickForCompletedPointerGesture(event, rawElement) {
    const completed = recentCompletedPointerGesture;
    recentCompletedPointerGesture = null;
    if (!completed || completed.consumed || Number(event?.detail) === 0) {
      return false;
    }
    const age = Date.now() - Number(completed.completedAt || 0);
    if (!Number.isFinite(age) || age < 0 || age > NATIVE_CLICK_CORRELATION_MAX_AGE_MS) {
      return false;
    }
    if (Number.isFinite(event?.button) && event.button !== completed.button) {
      return false;
    }
    const clickTarget = getInnermostEventTarget(event, rawElement);
    if (!(clickTarget instanceof Element) || clickTarget !== completed.target) {
      return false;
    }
    const clientX = Number(event?.clientX);
    const clientY = Number(event?.clientY);
    if (Number.isFinite(completed.clientX) && Number.isFinite(completed.clientY)
    && Number.isFinite(clientX) && Number.isFinite(clientY)
    && Math.hypot(clientX - completed.clientX, clientY - completed.clientY) > NATIVE_CLICK_CORRELATION_MAX_DISTANCE_PX) {
      return false;
    }
    completed.consumed = true;
    return true;
  }
  function rememberRecordedPointerClick(snapshot, event, gestureId, originatedOnRecorderOverlay = false) {
    const target = snapshot?.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (snapshot.recorderReplayOfGestureId) {
      /*
       * A labelled replay must not become the source of a replay chain. A
       * later genuine click can therefore establish its own candidate.
       */
      recentRecordedPointerClick = null;
      rememberCompletedPointerGesture(snapshot, event, gestureId);
      return;
    }
    recentRecordedPointerClick = {
      gestureId,
      originatedOnRecorderOverlay: originatedOnRecorderOverlay === true,
      target,
      fingerprint: getRecorderReplayTargetFingerprint(target),
      interactiveOwner: getRecorderReplayInteractiveOwner(target),
      interactiveOwnerFingerprint: getRecorderReplayTargetFingerprint(getRecorderReplayInteractiveOwner(target)),
      recordedAt: Date.now(),
      pointerId: Number.isFinite(event?.pointerId) ? event.pointerId: null,
      pointerType: String(event?.pointerType || "mouse"),
      button: Number.isFinite(event?.button) ? event.button: 0,
    };
    rememberCompletedPointerGesture(snapshot, event, gestureId);
  }
  function forgetRecordedPointerClick(gestureId) {
    if (recentRecordedPointerClick?.gestureId === gestureId) {
      recentRecordedPointerClick = null;
    }
    if (suppressedRecorderReplay?.sourceGestureId === gestureId) {
      clearSuppressedRecorderReplay();
    }
    if (recentCompletedPointerGesture?.gestureId === gestureId) {
      recentCompletedPointerGesture = null;
    }
  }
  function clearSuppressedRecorderReplay(replay = suppressedRecorderReplay) {
    if (!replay) {
      return;
    }
    if (replay.clearTimer) {
      clearTimeout(replay.clearTimer);
      replay.clearTimer = null;
    }
    if (suppressedRecorderReplay === replay) {
      suppressedRecorderReplay = null;
    }
  }
  function identifyRecorderReplaySourceGestureId(event, rawElement) {
    /*
     * Detect and LABEL a Playwright recorder replay without suppressing it.
     * The replay remains a normal click in the raw TRACE. The refinement step
     * can then remove it using explicit evidence instead of assuming that
     * every second click is a duplicate.
     */
    const remembered = recentRecordedPointerClick;
    if (!remembered) {
      return "";
    }
    if (Number(event?.detail) > 1) {
      /* A real second/third click in a multi-click sequence is not a replay. */
      return "";
    }
    const age = Date.now() - Number(remembered.recordedAt || 0);
    if (!Number.isFinite(age) || age < 0 || age > RECORDER_CLICK_REPLAY_MAX_AGE_MS) {
      recentRecordedPointerClick = null;
      return "";
    }
    if (remembered.pointerType && event?.pointerType && remembered.pointerType !== String(event.pointerType)) {
      return "";
    }
    if (Number.isFinite(event?.button) && event.button !== remembered.button) {
      return "";
    }
    const target = getRecorderReplayTarget(event, rawElement);
    const atReplayPoint = isPointerAtComputedReplayPoint(event, rawElement, target)
    || isPointerNearElementCenter(event, remembered.target)
    || isPointerNearElementCenter(event, remembered.interactiveOwner);
    if (!recorderReplayTargetsMatch(remembered, target) || !atReplayPoint) {
      return "";
    }
    recentRecordedPointerClick = null;
    return remembered.gestureId || "";
  }
  function consumeMatchingRecentRecordedClickReplay(event, rawElement) {
    void event;
    void rawElement;
    return false;
  }
  function isSuppressedRecorderReplayEvent(event, rawElement) {
    void event;
    void rawElement;
    return false;
  }
  function getEventElement(event) {
    for (const item of getEventPath(event)) {
      if (item instanceof Element && !isRecorderOverlayElement(item)) {
        return item;
      }
    }
    return(event?.target instanceof Element && !isRecorderOverlayElement(event.target)) ? event.target: null;
  }
  function isTextEntryElement(element) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return false;
    }
    if (element instanceof HTMLTextAreaElement) {
      return true;
    }
    if (element instanceof HTMLInputElement) {
      const type = String(element.type || element.getAttribute("type") || "text").trim().toLowerCase();
      return!NON_TEXT_INPUT_TYPES.has(type);
    }
    return(element.isContentEditable === true);
  }
  function getCanonicalTextEntryElement(element) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return null;
    }
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return isTextEntryElement(element) ? element: null;
    }
    if (element.isContentEditable !== true) {
      return null;
    }
    let current = element;
    while (current.parentElement && current.parentElement.isContentEditable === true && !isRecorderOverlayElement(current.parentElement)) {
      current = current.parentElement;
    }
    return current;
  }
  function getEventTextEntryElement(event) {
    const path = getEventPath(event);
    for (const item of path) {
      if (!(item instanceof Element) || isRecorderOverlayElement(item)) {
        continue;
      }
      const canonical = getCanonicalTextEntryElement(item);
      if (canonical) {
        return canonical;
      }
    }
    const element = getPhysicalPointerTarget(event) || getEventElement(event);
    if (!element) {
      return null;
    }
    const closest = element.closest("input, textarea, " + '[contenteditable="true"], ' + '[contenteditable=""], ' + "[contenteditable]");
    return(getCanonicalTextEntryElement(closest) || getCanonicalTextEntryElement(element));
  }
  function normalizeTextEntryValue(value) {
    let normalized = String(value ?? "").replace(/\r\n?/g, "\n");
    try {
      normalized = normalized.normalize("NFC");
    } catch {
    }
    return normalized;
  }
  function readTextEntryValue(element) {
    const canonical = getCanonicalTextEntryElement(element) || element;
    if (canonical instanceof HTMLInputElement || canonical instanceof HTMLTextAreaElement) {
      return normalizeTextEntryValue(canonical.value);
    }
    if (canonical instanceof Element && canonical.isContentEditable) {
      const normalized = normalizeTextEntryValue(canonical.innerText ?? canonical.textContent ?? "");
      return normalized.trim() ? normalized: "";
    }
    return "";
  }
  function getTextEntryInputType(element) {
    const canonical = getCanonicalTextEntryElement(element) || element;
    if (canonical instanceof HTMLInputElement) {
      return(String(canonical.type || "text").trim().toLowerCase() || "text");
    }
    if (canonical instanceof HTMLTextAreaElement) {
      return "textarea";
    }
    if (canonical instanceof Element && canonical.isContentEditable) {
      return "contenteditable";
    }
    return "text";
  }
  function getTextEntryControlKind(element) {
    const canonical = getCanonicalTextEntryElement(element) || element;
    if (!(canonical instanceof Element)) {
      return "text";
    }
    const role = String(canonical.getAttribute("role") || "").trim().toLowerCase();
    const className = typeof canonical.className === "string" ? canonical.className: String(canonical.getAttribute("class")
    || "");
    if (role === "spinbutton" || className.includes("p-inputnumber-input")) {
      return "primeng-inputnumber";
    }
    if (canonical instanceof HTMLTextAreaElement) {
      return "textarea";
    }
    if (canonical.isContentEditable) {
      return "contenteditable";
    }
    return "input";
  }
  function resolveElementFromRecordedSelector(selector, ownerDocument = document) {
    const value = String(selector || "");
    if (!value.startsWith("xpath=")) {
      return null;
    }
    const xpath = value.slice("xpath=".length);
    if (!xpath) {
      return null;
    }
    try {
      const result = ownerDocument.evaluate(xpath, ownerDocument, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      if (result.snapshotLength !== 1) {
        return null;
      }
      const resolved = result.snapshotItem(0);
      return(resolved instanceof Element && !isRecorderOverlayElement(resolved)) ? resolved: null;
    } catch {
      return null;
    }
  }
  function resolveTextEntrySessionElement(session) {
    if (!session) {
      return null;
    }
    if (session.element instanceof Element && session.element.isConnected && !isRecorderOverlayElement(session.element)) {
      const canonical = getCanonicalTextEntryElement(session.element);
      if (canonical) {
        session.element = canonical;
        return canonical;
      }
    }
    const ownerDocument = session.ownerDocument || document;
    const replacement = resolveElementFromRecordedSelector(session.trackingSelector, ownerDocument);
    const canonicalReplacement = getCanonicalTextEntryElement(replacement);
    if (canonicalReplacement) {
      session.element = canonicalReplacement;
      return canonicalReplacement;
    }
    return null;
  }
  function isTextEntrySessionForElement(session, element) {
    if (!session) {
      return false;
    }
    const canonicalElement = getCanonicalTextEntryElement(element);
    if (!canonicalElement) {
      return false;
    }
    const currentElement = resolveTextEntrySessionElement(session);
    const canonicalOriginal = getCanonicalTextEntryElement(session.originalElement) || session.originalElement;
    return(currentElement === canonicalElement || canonicalOriginal === canonicalElement);
  }
  function getDeepActiveElement(ownerDocument = document) {
    let activeElement = ownerDocument?.activeElement || null;
    const visited = new Set();
    while (activeElement instanceof Element && activeElement.shadowRoot?.activeElement instanceof Element
    && !visited.has(activeElement)) {
      visited.add(activeElement);
      activeElement = activeElement.shadowRoot.activeElement;
    }
    return(activeElement instanceof Element && !isRecorderOverlayElement(activeElement)) ? activeElement: null;
  }
  function isSelectionNodeInsideElement(node, element) {
    if (!node || !(element instanceof Element)) {
      return false;
    }
    if (node === element) {
      return true;
    }
    const nodeElement = node.nodeType === Node.ELEMENT_NODE ? node: node.parentElement;
    return(nodeElement instanceof Element && element.contains(nodeElement));
  }
  function isTextEntryFocused(element) {
    const canonicalElement = getCanonicalTextEntryElement(element);
    if (!canonicalElement) {
      return false;
    }
    const ownerDocument = canonicalElement.ownerDocument || document;
    const activeElement = getDeepActiveElement(ownerDocument);
    const canonicalActiveElement = getCanonicalTextEntryElement(activeElement);
    if (canonicalActiveElement === canonicalElement) {
      return true;
    }
    if (canonicalElement.isContentEditable && activeElement instanceof Element && canonicalElement.contains(activeElement)) {
      return true;
    }
    if (canonicalElement.isContentEditable) {
      try {
        const selection = ownerDocument.getSelection?.();
        if (selection && selection.rangeCount > 0 && isSelectionNodeInsideElement(selection.anchorNode, canonicalElement)
        && isSelectionNodeInsideElement(selection.focusNode, canonicalElement)) {
          return true;
        }
      } catch {
      }
    }
    return false;
  }
  function isTextEntryActuallyEditable(element) {
    const canonicalElement = getCanonicalTextEntryElement(element);
    if (!canonicalElement) {
      return false;
    }
    if (canonicalElement instanceof HTMLInputElement || canonicalElement instanceof HTMLTextAreaElement) {
      return!(canonicalElement.disabled || canonicalElement.readOnly);
    }
    return(canonicalElement.isContentEditable === true);
  }
  function getComputedCursorValue(element) {
    if (!(element instanceof Element)) {
      return "";
    }
    try {
      const view = element.ownerDocument?.defaultView || window;
      return String(view.getComputedStyle(element)?.cursor || "").trim().toLowerCase();
    } catch {
      return "";
    }
  }
  function hasExplicitTextCursor(element) {
    return TEXT_ENTRY_TEXT_CURSOR_VALUES.has(getComputedCursorValue(element));
  }
  function hasNativeInputCaret(element) {
    const canonicalElement = getCanonicalTextEntryElement(element);
    if (!(canonicalElement instanceof HTMLInputElement || canonicalElement instanceof HTMLTextAreaElement)) {
      return false;
    }
    if (!isTextEntryActuallyEditable(canonicalElement) || !isTextEntryFocused(canonicalElement)) {
      return false;
    }
    if (canonicalElement instanceof HTMLTextAreaElement) {
      return true;
    }
    try {
      const selectionStart = canonicalElement.selectionStart;
      const selectionEnd = canonicalElement.selectionEnd;
      if (Number.isInteger(selectionStart) && Number.isInteger(selectionEnd) && selectionStart >= 0 && selectionEnd >= 0) {
        return true;
      }
    } catch {
    }
    if (hasExplicitTextCursor(canonicalElement)) {
      return true;
    }
    return true;
  }
  function hasContentEditableCaret(element) {
    const canonicalElement = getCanonicalTextEntryElement(element);
    if (!(canonicalElement instanceof Element) || !canonicalElement.isContentEditable) {
      return false;
    }
    try {
      const ownerDocument = canonicalElement.ownerDocument || document;
      const selection = ownerDocument.getSelection?.();
      if (!selection || selection.rangeCount <= 0) {
        return false;
      }
      if (!isSelectionNodeInsideElement(selection.anchorNode, canonicalElement) || !isSelectionNodeInsideElement(selection.focusNode,
      canonicalElement)) {
        return false;
      }
      const range = selection.getRangeAt(0);
      return(isSelectionNodeInsideElement(range.startContainer, canonicalElement) && isSelectionNodeInsideElement(range.endContainer,
      canonicalElement));
    } catch {
      return false;
    }
  }
  function hasTextEntryCaretCapability(element) {
    const canonicalElement = getCanonicalTextEntryElement(element);
    if (!canonicalElement || !isTextEntryActuallyEditable(canonicalElement) || !isTextEntryFocused(canonicalElement)) {
      return false;
    }
    if (canonicalElement instanceof HTMLInputElement || canonicalElement instanceof HTMLTextAreaElement) {
      return hasNativeInputCaret(canonicalElement);
    }
    if (canonicalElement.isContentEditable) {
      return hasContentEditableCaret(canonicalElement);
    }
    return false;
  }
  function getPointerSurfaceElement(event) {
    return getPhysicalPointerTarget(event);
  }
  function getPointerHitElement(event) {
    const surfaceElement = getPointerSurfaceElement(event);
    const ownerDocument = surfaceElement?.ownerDocument || event?.target?.ownerDocument || document;
    return(getNonOverlayElementFromPoint(event, ownerDocument) || surfaceElement);
  }
  function getAssociatedLabelControl(element) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return null;
    }
    const label = element instanceof HTMLLabelElement ? element: element.closest("label");
    if (!(label instanceof HTMLLabelElement)) {
      return null;
    }
    const control = label.control instanceof Element ? label.control: null;
    return getCanonicalTextEntryElement(control);
  }
  function findSingleTextEntryDescendant(element) {
    if (!(element instanceof Element) || isRecorderOverlayElement(element)) {
      return null;
    }
    const uniqueCandidates = new Set();
    for (const candidate of Array.from(element.querySelectorAll("input, textarea, " + '[contenteditable="true"], ' + '[contenteditable=""], ' + "[contenteditable]"))) {
      const canonical = getCanonicalTextEntryElement(candidate);
      if (canonical) {
        uniqueCandidates.add(canonical);
      }
    }
    return uniqueCandidates.size === 1 ? Array.from(uniqueCandidates)[0]: null;
  }
  function resolveTextEntryFromPointerSurface(event) {
    const directTextEntry = getEventTextEntryElement(event);
    if (directTextEntry) {
      return directTextEntry;
    }
    const surfaceElement = getPointerSurfaceElement(event);
    if (!surfaceElement) {
      return null;
    }
    const labelControl = getAssociatedLabelControl(surfaceElement);
    if (labelControl) {
      return labelControl;
    }
    if (hasExplicitTextCursor(surfaceElement)) {
      return findSingleTextEntryDescendant(surfaceElement);
    }
    return null;
  }
  function isDirectPointerHitOnTextEntry(surfaceElement, textEntryElement) {
    if (!(surfaceElement instanceof Element) || isRecorderOverlayElement(surfaceElement)) {
      return false;
    }
    const canonicalTextEntry = getCanonicalTextEntryElement(textEntryElement);
    if (!canonicalTextEntry) {
      return false;
    }
    if (surfaceElement === canonicalTextEntry) {
      return true;
    }
    if (canonicalTextEntry.isContentEditable && canonicalTextEntry.contains(surfaceElement)) {
      return true;
    }
    return false;
  }
  function isLabelSurfaceForTextEntry(surfaceElement, textEntryElement) {
    if (!(surfaceElement instanceof Element)) {
      return false;
    }
    const canonicalTextEntry = getCanonicalTextEntryElement(textEntryElement);
    if (!canonicalTextEntry) {
      return false;
    }
    return(getAssociatedLabelControl(surfaceElement) === canonicalTextEntry);
  }
  function isWrapperSurfaceForTextEntry(surfaceElement, textEntryElement) {
    if (!(surfaceElement instanceof Element) || isRecorderOverlayElement(surfaceElement)) {
      return false;
    }
    const canonicalTextEntry = getCanonicalTextEntryElement(textEntryElement);
    if (!canonicalTextEntry) {
      return false;
    }
    return(surfaceElement !== canonicalTextEntry && surfaceElement.contains(canonicalTextEntry));
  }
  function hasTextCursorEvidenceInEventPath(event, textEntryElement = null) {
    const canonicalTextEntry = getCanonicalTextEntryElement(textEntryElement);
    for (const item of getEventPath(event)) {
      if (!(item instanceof Element) || isRecorderOverlayElement(item)) {
        continue;
      }
      if (hasExplicitTextCursor(item)) {
        return true;
      }
      if (canonicalTextEntry && item === canonicalTextEntry) {
        break;
      }
    }
    if (canonicalTextEntry && hasExplicitTextCursor(canonicalTextEntry)) {
      return true;
    }
    return false;
  }
  function buildPrivateTextEntryPointerIntent(event) {
    if (!event || event.isTrusted === false || event.button !== 0 || !isRealUserFrame()) {
      return null;
    }
    const surfaceElement = getPointerSurfaceElement(event);
    if (!surfaceElement) {
      return null;
    }
    const hitElement = getPointerHitElement(event);
    const textEntryElement = getCanonicalTextEntryElement(resolveTextEntryFromPointerSurface(event));
    return {
      surfaceElement,
      hitElement,
      textEntryElement,
      ownerDocument: surfaceElement.ownerDocument || document,
      createdAt: Date.now(),
      textCursorObserved: hasTextCursorEvidenceInEventPath(event, textEntryElement),
    };
  }
  function getFocusedTextEntryElement(ownerDocument = document) {
    const activeElement = getDeepActiveElement(ownerDocument);
    const canonicalActive = getCanonicalTextEntryElement(activeElement);
    if (canonicalActive) {
      return canonicalActive;
    }
    try {
      const selection = ownerDocument.getSelection?.();
      if (selection && selection.rangeCount > 0) {
        const candidateNode = selection.anchorNode || selection.focusNode;
        const candidateElement = candidateNode?.nodeType === Node.ELEMENT_NODE ? candidateNode: candidateNode?.parentElement;
        const canonicalSelectionHost = getCanonicalTextEntryElement(candidateElement);
        if (canonicalSelectionHost && canonicalSelectionHost.isContentEditable) {
          return canonicalSelectionHost;
        }
      }
    } catch {
    }
    return null;
  }
  function isPointerEvidenceRelatedToTextEntry(surfaceElement, hitElement, textEntryElement, textCursorObserved) {
    const canonicalTextEntry = getCanonicalTextEntryElement(textEntryElement);
    if (!canonicalTextEntry) {
      return false;
    }
    if (isDirectPointerHitOnTextEntry(hitElement, canonicalTextEntry)) {
      return true;
    }
    if (isDirectPointerHitOnTextEntry(surfaceElement, canonicalTextEntry)) {
      return true;
    }
    if (isLabelSurfaceForTextEntry(hitElement, canonicalTextEntry) || isLabelSurfaceForTextEntry(surfaceElement, canonicalTextEntry)) {
      return true;
    }
    if (textCursorObserved && (isWrapperSurfaceForTextEntry(hitElement, canonicalTextEntry) || isWrapperSurfaceForTextEntry(surfaceElement,
    canonicalTextEntry))) {
      return true;
    }
    return false;
  }
  function confirmPrivateTextEntryPointerActivation(event) {
    const intent = pendingTextEntryPointerIntent;
    if (!intent || !event || event.isTrusted === false) {
      return false;
    }
    if (event.type === "click" && event.detail === 0) {
      return false;
    }
    const age = Date.now() - Number(intent.createdAt || 0);
    if (!Number.isFinite(age) || age < 0 || age > TEXT_ENTRY_POINTER_CLICK_MAX_AGE_MS) {
      pendingTextEntryPointerIntent = null;
      return false;
    }
    const ownerDocument = intent.ownerDocument || document;
    const eventSurface = getPointerSurfaceElement(event) || intent.surfaceElement;
    const eventHit = getPointerHitElement(event) || intent.hitElement;
    const eventTextEntry = getCanonicalTextEntryElement(resolveTextEntryFromPointerSurface(event));
    const focusedTextEntry = getCanonicalTextEntryElement(getFocusedTextEntryElement(ownerDocument));
    const textEntryElement = getCanonicalTextEntryElement(eventTextEntry || intent.textEntryElement || focusedTextEntry);
    if (!textEntryElement) {
      return false;
    }
    if (!isTextEntryActuallyEditable(textEntryElement)) {
      return false;
    }
    if (!isTextEntryFocused(textEntryElement)) {
      return false;
    }
    if (focusedTextEntry && focusedTextEntry !== textEntryElement) {
      return false;
    }
    if (!hasTextEntryCaretCapability(textEntryElement)) {
      return false;
    }
    const textCursorObserved = intent.textCursorObserved || hasTextCursorEvidenceInEventPath(event, textEntryElement);
    if (!isPointerEvidenceRelatedToTextEntry(eventSurface, eventHit, textEntryElement, textCursorObserved)) {
      return false;
    }
    let session = activeTextEntrySession;
    if (!isTextEntrySessionForElement(session, textEntryElement)) {
      beginTextEntryTracking(textEntryElement, "implicit-text-entry");
      session = activeTextEntrySession;
    }
    if (!isTextEntrySessionForElement(session, textEntryElement)) {
      return false;
    }
    session.validatedPointerTextEntryClick = true;
    session.pointerClickConfirmedAt = Date.now();
    session.pointerClickElement = textEntryElement;
    if (!session.sourceGestureId) {
      session.sourceGestureId = String(pendingPointerGesture?.gestureId || "");
    }
    if (!session.sourceClickSelector) {
      session.sourceClickSelector = String(pendingPointerGesture?.pointerupSnapshot?.selector
      || pendingPointerGesture?.pointerdownSnapshot?.selector || "");
    }
    session.pointerClickDirectHit = isDirectPointerHitOnTextEntry(eventHit, textEntryElement) || isDirectPointerHitOnTextEntry(eventSurface,
    textEntryElement);
    session.pointerClickLabelAssociated = isLabelSurfaceForTextEntry(eventHit, textEntryElement) || isLabelSurfaceForTextEntry(eventSurface,
    textEntryElement);
    session.pointerClickTextCursorObserved = textCursorObserved;
    session.pointerClickFocusConfirmed = true;
    session.pointerClickCaretConfirmed = true;
    pendingTextEntryPointerIntent = null;
    return true;
  }
  function hasValidatedTextEntryClickEvidence(session, element) {
    const canonicalElement = getCanonicalTextEntryElement(element);
    if (!session || !canonicalElement || session.validatedPointerTextEntryClick !== true || session.pointerClickFocusConfirmed !== true
    || session.pointerClickCaretConfirmed !== true) {
      return false;
    }
    if (!isTextEntrySessionForElement(session, canonicalElement)) {
      return false;
    }
    const canonicalPointerElement = getCanonicalTextEntryElement(session.pointerClickElement);
    const canonicalOriginalElement = getCanonicalTextEntryElement(session.originalElement);
    if (canonicalPointerElement && canonicalPointerElement !== canonicalElement && canonicalPointerElement !== canonicalOriginalElement) {
      return false;
    }
    return true;
  }
  function clearTextEntryFinalizeTimer() {
    if (pendingTextEntryFinalizeTimer) {
      clearTimeout(pendingTextEntryFinalizeTimer);
      pendingTextEntryFinalizeTimer = null;
    }
  }
  function stopTextEntryPolling(session) {
    if (session?.pollTimer) {
      clearInterval(session.pollTimer);
      session.pollTimer = null;
    }
  }
  function rememberIntroducedDomText(session, element, introducedText) {
    const normalizedIntroducedText = normalizeFillXPathIdentity(introducedText);
    if (!normalizedIntroducedText) {
      return;
    }
    let current = element instanceof Element ? element: null;
    while (current && current.tagName !== "HTML" && current.tagName !== "BODY") {
      if (!isRecorderOverlayElement(current)) {
        const texts = session?.introducedDomTextByElement?.get(current) || new Set();
        texts.add(normalizedIntroducedText);
        session?.introducedDomTextByElement?.set(current, texts);
      }
      current = current.parentElement;
    }
  }
  function collectChangedDomTextElements(session, records) {
    for (const record of Array.from(records || [])) {
      if (record.type === "characterData") {
        const previousText = normalizeFillXPathIdentity(record.oldValue);
        const currentText = normalizeFillXPathIdentity(record.target?.nodeValue);
        if (currentText && currentText !== previousText) {
          rememberIntroducedDomText(session, record.target?.parentElement, currentText);
        }
        continue;
      }
      const addedEntries = Array.from(record.addedNodes || []).map(node => ({
        element: node.nodeType === Node.TEXT_NODE ? node.parentElement: node instanceof Element ? node: null,
        text: normalizeFillXPathIdentity(node.textContent || node.nodeValue),
      })).filter(entry => entry.element instanceof Element && entry.text);
      const addedText = normalizeFillXPathIdentity(addedEntries.map(entry => entry.text).join(" "));
      const removedText = normalizeFillXPathIdentity(Array.from(record.removedNodes || []).map(node => {
        return node.textContent || node.nodeValue || "";
      }).join(" "));
      if (addedText && addedText !== removedText) {
        for (const entry of addedEntries) {
          rememberIntroducedDomText(session, entry.element, entry.text);
        }
      }
    }
  }
  function startTextEntryDomTextObserver(session) {
    if (!session || session.domTextObserver) {
      return;
    }
    try {
      session.domTextObserver = new MutationObserver(records => {
        collectChangedDomTextElements(session, records);
      });
      session.domTextObserver.observe(session.ownerDocument.documentElement, {
        childList: true,
        characterData: true,
        characterDataOldValue: true,
        subtree: true,
      });
      session.domTextProvenanceObserved = true;
    } catch {
      session.domTextObserver = null;
      session.domTextProvenanceObserved = false;
    }
  }
  function stopTextEntryDomTextObserver(session) {
    try {
      collectChangedDomTextElements(session, session?.domTextObserver?.takeRecords?.() || []);
      session?.domTextObserver?.disconnect?.();
    } catch {
    }
    if (session) {
      session.domTextObserver = null;
    }
  }
  function refreshTextEntrySession(expectedElement = null, observedEvent = "") {
    const session = activeTextEntrySession;
    if (!session) {
      return;
    }
    const currentElement = resolveTextEntrySessionElement(session);
    if (!currentElement) {
      return;
    }
    const canonicalExpected = expectedElement ? getCanonicalTextEntryElement(expectedElement): null;
    const canonicalOriginal = getCanonicalTextEntryElement(session.originalElement);
    if (canonicalExpected && canonicalExpected !== currentElement && canonicalExpected !== canonicalOriginal) {
      return;
    }
    session.element = currentElement;
    session.latestValue = readTextEntryValue(currentElement);
    if (session.latestValue !== session.initialValue) {
      session.changed = true;
    }
    if (observedEvent) {
      session.lastObservedEvent = observedEvent;
    }
  }
  function scheduleTextEntryRefresh(element, observedEvent) {
    const canonicalElement = getCanonicalTextEntryElement(element);
    if (!canonicalElement) {
      return;
    }
    refreshTextEntrySession(canonicalElement, `${observedEvent}:immediate`);
    queueMicrotask(() => {
      refreshTextEntrySession(canonicalElement, `${observedEvent}:microtask`);
    });
    requestAnimationFrame(() => {
      refreshTextEntrySession(canonicalElement, `${observedEvent}:animation-frame`);
    });
    setTimeout(() => {
      refreshTextEntrySession(canonicalElement, `${observedEvent}:delayed`);
    }, TEXT_ENTRY_REFRESH_DELAY_MS);
  }
  function finishTextEntryTracking(reason = "finished") {
    clearTextEntryFinalizeTimer();
    const session = activeTextEntrySession;
    if (!session) {
      return;
    }
    activeTextEntrySession = null;
    stopTextEntryPolling(session);
    stopTextEntryDomTextObserver(session);
    const currentElement = resolveTextEntrySessionElement(session);
    const finalValue = currentElement ? readTextEntryValue(currentElement): session.latestValue;
    const normalizedFinalValue = normalizeTextEntryValue(finalValue);
    const normalizedInitialValue = normalizeTextEntryValue(session.initialValue);
    if (normalizedFinalValue === normalizedInitialValue) {
      return;
    }
    const elementForAction = getCanonicalTextEntryElement(currentElement || session.element || session.originalElement);
    if (!elementForAction) {
      return;
    }
    if (!hasValidatedTextEntryClickEvidence(session, elementForAction)) {
      console.debug("[input-recorder] Ignored value mutation because the field never passed physical-pointer/focus/caret validation.");
      return;
    }
    const liveLocator = getLiveTextEntryLocator(elementForAction, session.introducedDomTextByElement,
    session.domTextProvenanceObserved === true);
    const isResolvedInput = !!liveLocator.selector && !!liveLocator.xpath && liveLocator.diagnostics?.uniqueAtCommit === true;
    if (!isResolvedInput) {
      console.warn("[input-recorder] The changed field was preserved, but no unique live XPath could be resolved at input commit time:", {
        element: getElementAttributes(elementForAction),
        diagnostics: liveLocator.diagnostics,
      });
    }
    dispatch({
      action: "input",
      sequence: ++actionSequence,
      selector: isResolvedInput ? liveLocator.selector: null,
      xpath: isResolvedInput ? liveLocator.xpath: null,
      selectorStrategy: liveLocator.strategy,
      selectorSearchDiagnostics: liveLocator.diagnostics,
      locatorSource: "live-input-element",
      locatorGeneratedAtCommit: true,
      fillTextProvenance: session.domTextProvenanceObserved === true
      ? "dom-text-unchanged-during-fill-session": "unverified",
      changedDomTextElementCount: session.introducedDomTextByElement?.size || 0,
      unresolved: isResolvedInput ? null: true,
      elementHandle: elementForAction,
      value: normalizedFinalValue,
      hasValue: normalizedFinalValue.length > 0,
      inputType: getTextEntryInputType(elementForAction),
      controlKind: getTextEntryControlKind(elementForAction),
      normalized: true,
      commitReason: reason,
      lastObservedEvent: session.lastObservedEvent || null,
      sourceGestureId: session.sourceGestureId || null,
      sourceClickSelector: session.sourceClickSelector || null,
      elementBeforeInput: session.elementBeforeInput || null,
      elementAfterInput: getElementAttributes(elementForAction),
      element: getElementAttributes(elementForAction),
    }).catch (error => {
      console.warn("Normalized input dispatch failed:", error);
    });
  }
  function beginTextEntryTracking(element, reason = "focusin") {
    const canonicalElement = getCanonicalTextEntryElement(element);
    if (!canonicalElement || !isRealUserFrame()) {
      return;
    }
    element = canonicalElement;
    clearTextEntryFinalizeTimer();
    const activeElement = resolveTextEntrySessionElement(activeTextEntrySession);
    if (activeTextEntrySession && (activeElement === element || getCanonicalTextEntryElement(activeTextEntrySession.originalElement) === element)) {
      scheduleTextEntryRefresh(element, reason);
      return;
    }
    if (activeTextEntrySession) {
      finishTextEntryTracking("next-text-entry-focus");
    }
    const trackingXPath = getDirectTargetGraphXPath(element, 6);
    const initialValue = readTextEntryValue(element);
    const session = {
      element,
      originalElement: element,
      ownerDocument: element.ownerDocument || document,
      trackingSelector: isSafeFinalGraphXPath(trackingXPath, element) ? `xpath=${trackingXPath}`: "",
      elementBeforeInput: getElementAttributes(element),
      initialValue,
      latestValue: initialValue,
      changed: false,
      lastObservedEvent: reason,
      pollTimer: null,
      validatedPointerTextEntryClick: false,
      pointerClickConfirmedAt: null,
      pointerClickElement: null,
      pointerClickDirectHit: false,
      pointerClickLabelAssociated: false,
      pointerClickTextCursorObserved: false,
      pointerClickFocusConfirmed: false,
      pointerClickCaretConfirmed: false,
      sourceGestureId: "",
      sourceClickSelector: "",
      introducedDomTextByElement: new Map(),
      domTextObserver: null,
      domTextProvenanceObserved: false,
    };
    activeTextEntrySession = session;
    startTextEntryDomTextObserver(session);
    session.pollTimer = setInterval(() => {
      if (activeTextEntrySession !== session) {
        stopTextEntryPolling(session);
        return;
      }
      refreshTextEntrySession(null, "poll");
    }, TEXT_ENTRY_POLL_INTERVAL_MS);
    scheduleTextEntryRefresh(element, reason);
  }
  function scheduleTextEntryFinish(element, reason = "focusout") {
    const session = activeTextEntrySession;
    if (!session) {
      return;
    }
    const canonicalElement = element ? getCanonicalTextEntryElement(element): null;
    const currentElement = resolveTextEntrySessionElement(session);
    const canonicalOriginal = getCanonicalTextEntryElement(session.originalElement);
    if (canonicalElement && canonicalElement !== currentElement && canonicalElement !== canonicalOriginal) {
      return;
    }
    clearTextEntryFinalizeTimer();
    pendingTextEntryFinalizeTimer = setTimeout(() => {
      pendingTextEntryFinalizeTimer = null;
      if (activeTextEntrySession !== session) {
        return;
      }
      const resolvedElement = resolveTextEntrySessionElement(session);
      if (resolvedElement && isTextEntryFocused(resolvedElement)) {
        return;
      }
      refreshTextEntrySession(null, `${reason}:final`);
      finishTextEntryTracking(reason);
    }, TEXT_ENTRY_COMMIT_DELAY_MS);
  }
  function finishTextEntryBeforePointerTarget(event) {
    const session = activeTextEntrySession;
    if (!session) {
      return;
    }
    const nextTextEntry = getCanonicalTextEntryElement(getEventTextEntryElement(event));
    const currentElement = resolveTextEntrySessionElement(session);
    const canonicalOriginal = getCanonicalTextEntryElement(session.originalElement);
    if (nextTextEntry && (nextTextEntry === currentElement || nextTextEntry === canonicalOriginal)) {
      return;
    }
    refreshTextEntrySession(null, "next-pointerdown");
    finishTextEntryTracking("next-pointerdown");
  }
  function ensureTextEntrySessionForEvent(element, eventName) {
    const canonicalElement = getCanonicalTextEntryElement(element);
    if (!canonicalElement) {
      return;
    }
    const currentElement = resolveTextEntrySessionElement(activeTextEntrySession);
    const canonicalOriginal = getCanonicalTextEntryElement(activeTextEntrySession?.originalElement);
    if (!activeTextEntrySession || (currentElement !== canonicalElement && canonicalOriginal !== canonicalElement)) {
      beginTextEntryTracking(canonicalElement, eventName);
    }
    if (["beforeinput", "input", "compositionend", "change"].includes(eventName)) {
      startTextEntryDomTextObserver(activeTextEntrySession);
    }
    scheduleTextEntryRefresh(canonicalElement, eventName);
  }
  function getInnermostEventTarget(event, fallbackElement = null) {
    const eventPath = typeof event?.composedPath === "function" ? event.composedPath(): [];
    for (const pathItem of eventPath) {
      if (!(pathItem instanceof Element) || isRecorderOverlayElement(pathItem)) {
        continue;
      }
      const tagName = pathItem.tagName?.toLowerCase();
      if (tagName === "html" || tagName === "body") {
        continue;
      }
      return pathItem;
    }
    if (fallbackElement instanceof Element && !isRecorderOverlayElement(fallbackElement)) {
      const tagName = fallbackElement.tagName?.toLowerCase();
      if (tagName !== "html" && tagName !== "body") {
        return fallbackElement;
      }
    }
    return null;
  }
  let clickDomSnapshotVersion = 0;
  function getNodePathInsideRoot(root, target) {
    if (!root || !target) {
      return null;
    }
    const path = [];
    let current = target;
    while (current && current !== root) {
      const parent = current.parentNode;
      if (!parent) {
        return null;
      }
      const index = Array.prototype.indexOf.call(parent.childNodes, current);
      if (index < 0) {
        return null;
      }
      path.unshift(index);
      current = parent;
    }
    return current === root ? path: null;
  }
  function resolveNodePathInsideRoot(root, path) {
    let current = root;
    for (const index of path || []) {
      current = current?.childNodes?.[index] || null;
      if (!current) {
        return null;
      }
    }
    return current;
  }
  function captureHistoricalClickDocument(target, version) {
    if (!(target instanceof Element)) {
      return null;
    }
    const ownerDocument = target.ownerDocument || document;
    const sourceRoot = ownerDocument.documentElement;
    if (!(sourceRoot instanceof Element) || target.getRootNode?.() !== ownerDocument) {
      return null;
    }
    const targetPath = getNodePathInsideRoot(sourceRoot, target);
    if (!targetPath) {
      return null;
    }
    try {
      const detachedDocument = ownerDocument.implementation.createHTMLDocument(ownerDocument.title || "");
      const clonedRoot = detachedDocument.importNode(sourceRoot, true);
      detachedDocument.replaceChild(clonedRoot, detachedDocument.documentElement);
      const clonedTarget = resolveNodePathInsideRoot(clonedRoot, targetPath);
      if (!(clonedTarget instanceof Element)) {
        return null;
      }
      return {
        version,
        capturedAt: Date.now(),
        sourceUrl: String(ownerDocument.location?.href || location.href || ""),
        targetPath: Object.freeze(targetPath.slice()),
        target: clonedTarget,
        document: detachedDocument,
        elementCount: clonedRoot.getElementsByTagName("*").length + 1,
      };
    } catch (error) {
      console.warn("[click-recorder] Historical DOM capture failed before the page handled pointerdown:", error);
      return null;
    }
  }
  function createClickSnapshot(event, rawElement, inputMethod) {
    if (!(rawElement instanceof Element) || isRecorderOverlayElement(rawElement)) {
      return null;
    }
    const deepestElement = getInnermostEventTarget(event, rawElement);
    if (!deepestElement || !deepestElement.tagName || isRecorderOverlayElement(deepestElement)) {
      return null;
    }
    const element = getRecordableSvgClickTarget(deepestElement);
    if (!element || !element.tagName || isRecorderOverlayElement(element)) {
      return null;
    }
    const tagName = String(element.tagName || "").toLowerCase();
    if (tagName === "html" || tagName === "body" || tagName === "x-pw-glass") {
      return null;
    }
    const targetFingerprint = getRecorderReplayTargetFingerprint(element);
    const domSnapshot = Object.freeze({
      version: ++clickDomSnapshotVersion,
      capturedAt: Date.now(),
      targetFingerprint,
      signature: "gesture-start",
      nodes: Object.freeze([]),
    });
    const fastResult = getFastClickXPath(element);
    const fastCapturedXPathProof = fastResult.xpath ? Object.freeze(inspectXPathProofAgainstTarget(fastResult.xpath, element,
    fastResult.strategy, "unique-pointerdown-fast-proof", domSnapshot.version)): null;
    const fastXPath = fastCapturedXPathProof?.valid ? fastResult.xpath: "";
    const localRelationshipXPath = !fastXPath ? findLocalControlRelationshipXPath(element): "";
    const localRelationshipProof = localRelationshipXPath ? Object.freeze(inspectXPathProofAgainstTarget(localRelationshipXPath,
    element, "contextual", "unique-pointerdown-local-control-proof", domSnapshot.version)): null;
    const capturedLocalRelationshipXPath = localRelationshipProof?.valid ? localRelationshipXPath: "";
    const pointerdownStructuralXPath = buildGuaranteedStructuralXPath(element);
    const pointerdownStructuralProof = pointerdownStructuralXPath ? Object.freeze(inspectXPathProofAgainstTarget(pointerdownStructuralXPath,
    element, "structural", "unique-pointerdown-structural-rescue-proof", domSnapshot.version)): null;
    const historicalDomSnapshot = fastXPath || capturedLocalRelationshipXPath ? null: captureHistoricalClickDocument(element,
    domSnapshot.version);
    const immediateStructuralXPath = !fastXPath && !capturedLocalRelationshipXPath && !historicalDomSnapshot
    && pointerdownStructuralProof?.valid
    ? pointerdownStructuralXPath: "";
    const immediateXPath = fastXPath || capturedLocalRelationshipXPath || immediateStructuralXPath;
    const immediateStrategy = fastXPath ? fastResult.strategy: capturedLocalRelationshipXPath ? "contextual"
    : immediateXPath ? "structural": "unresolved";
    const capturedXPathProof = fastCapturedXPathProof?.valid ? fastCapturedXPathProof: localRelationshipProof?.valid
    ? localRelationshipProof: immediateStructuralXPath ? pointerdownStructuralProof: null;
    if (!immediateXPath && !historicalDomSnapshot) {
      console.error("[click-recorder] XPath search and structural capture both failed for this inaccessible target:", {
        domSnapshotVersion: domSnapshot.version,
        target: element,
        rootType: element.getRootNode?.()?.constructor?.name || "unknown",
      });
    }
    const selectorTarget = historicalDomSnapshot?.target || null;
    const selectorSearch = selectorTarget ? createLinearSelectorSearch(selectorTarget): null;
    const snapshot = {
      target: element,
      selectorTarget,
      inputMethod,
      normalXPath: immediateXPath,
      selector: immediateXPath ? `xpath=${immediateXPath}`: "",
      selectorStrategy: immediateStrategy,
      selectorSearch,
      selectorSearchStarted: false,
      capturedXPathProof,
      pointerdownStructuralXPath: pointerdownStructuralProof?.valid ? pointerdownStructuralXPath: "",
      pointerdownStructuralProof: pointerdownStructuralProof?.valid ? pointerdownStructuralProof: null,
      historicalDomSnapshot,
      domSnapshot,
      text: getGraphNormalizedText(element).slice(0, 100) || null,
      element: getElementAttributes(element),
      selectorSearchDiagnostics: {
        physicalHitTag: String(deepestElement.localName || deepestElement.tagName || "").toLowerCase(),
        svgTargetPromoted: deepestElement !== element,
        svgInteractionOwnerTag: deepestElement !== element
        ? String(element.localName || element.tagName || "").toLowerCase(): null,
        fastXPathSearch: fastResult.diagnostics,
        localControlRecoveryAttempted: !fastXPath,
        localControlRecoveryUsed: !!capturedLocalRelationshipXPath,
        localControlRecoveryXPath: capturedLocalRelationshipXPath || null,
        historicalDomCaptured: !!historicalDomSnapshot,
        historicalDomElementCount: historicalDomSnapshot?.elementCount || 0,
        historicalDomCaptureFailed: !fastXPath && !historicalDomSnapshot,
        emergencyStructuralFallbackUsed: immediateStrategy === "structural",
        pointerdownStructuralRescueCaptured: pointerdownStructuralProof?.valid === true,
        synchronousDomFreeze: false,
        synchronousHistoricalDomCapture: !!historicalDomSnapshot,
        selectorSearchDeferred: !!selectorSearch && !immediateXPath,
        selectorResolvedBeforeEventPropagation: !!immediateXPath,
      },
    };
    /*
     * The historical clone freezes the pointerdown DOM, so the expensive graph
     * walk does not need to freeze the live page as well. Run one bounded slice
     * now and continue the remaining work between browser tasks. Pointerup will
     * either use the completed result or reserve an ordered dispatch slot until
     * the frozen-snapshot search settles.
     */
    if (snapshot.selectorSearch && !snapshot.normalXPath) {
      snapshot.selectorSearchStarted = true;
      try {
        const immediateResult = snapshot.selectorSearch.start();
        if (immediateResult) {
          applySelectorSearchResultToSnapshot(snapshot, immediateResult);
        }
        snapshot.selectorSearchDiagnostics = {
          ...(snapshot.selectorSearchDiagnostics || {}),
          synchronousDomFreeze: false,
          selectorSearchDeferred: !snapshot.selectorSearch.result,
          selectorResolvedBeforeEventPropagation: !!snapshot.normalXPath,
        };
        if (immediateResult?.xpath && selectorTarget instanceof Element) {
          const immediateProof = inspectXPathProofAgainstTarget(immediateResult.xpath, selectorTarget,
          snapshot.selectorStrategy, "unique-initial-slice-pointerdown-snapshot-proof", domSnapshot.version);
          if (immediateProof.valid) {
            snapshot.capturedXPathProof = Object.freeze(immediateProof);
          } else {
            snapshot.normalXPath = "";
            snapshot.selector = "";
            snapshot.selectorStrategy = "unresolved";
            snapshot.selectorSearchDiagnostics = {
              ...(snapshot.selectorSearchDiagnostics || {}),
              selectorResolvedBeforeEventPropagation: false,
              initialSliceProofRejected: immediateProof,
            };
            restorePointerdownStructuralXPath(snapshot, "initial-slice-semantic-proof-rejected");
          }
        }
      } catch (error) {
        snapshot.selectorSearch?.cancel?.();
        snapshot.selectorSearchDiagnostics = {
          ...(snapshot.selectorSearchDiagnostics || {}),
          synchronousDomFreeze: false,
          selectorResolvedBeforeEventPropagation: false,
          deferredResolutionStartError: String(error?.message || error || "Unknown deferred XPath resolution error"),
        };
        console.error("[click-recorder] Time-sliced XPath resolution could not be started:", error);
        restorePointerdownStructuralXPath(snapshot, "deferred-search-start-threw");
      }
    }
    if (!snapshot.normalXPath && (!snapshot.selectorSearch || snapshot.selectorSearch.result)) {
      restorePointerdownStructuralXPath(snapshot, "initial-search-produced-no-xpath");
    }
    return snapshot;
  }
  function restorePointerdownStructuralXPath(snapshot, reason) {
    const xpath = String(snapshot?.pointerdownStructuralXPath || "").trim();
    const proof = snapshot?.pointerdownStructuralProof;
    if (!snapshot || !xpath || proof?.valid !== true || proof.xpath !== xpath || proof.strategy !== "structural") {
      return false;
    }
    snapshot.normalXPath = xpath;
    snapshot.selector = `xpath=${xpath}`;
    snapshot.selectorStrategy = "structural";
    snapshot.capturedXPathProof = proof;
    snapshot.selectorSearchDiagnostics = {
      ...(snapshot.selectorSearchDiagnostics || {}),
      pointerdownStructuralRescueUsed: true,
      pointerdownStructuralRescueReason: reason,
    };
    return true;
  }
  function startClickSnapshotSelectorSearch(snapshot) {
    if (!snapshot?.selectorSearch || snapshot.selectorSearchStarted) {
      return snapshot?.selectorSearch?.result || null;
    }
    snapshot.selectorSearchStarted = true;
    const immediateResult = snapshot.selectorSearch.start();
    if (immediateResult) {
      applySelectorSearchResultToSnapshot(snapshot, immediateResult);
    }
    return immediateResult;
  }
  function releaseClickSnapshotHistoricalDom(snapshot) {
    if (!snapshot) {
      return;
    }
    snapshot.selectorTarget = null;
    snapshot.historicalDomSnapshot = null;
    snapshot.selectorSearch = null;
  }
  function finishPendingClickResolutionJob(job, result) {
    if (!job || pendingClickResolutionJobsByGesture.get(job.gestureId) !== job) {
      return false;
    }
    pendingClickResolutionJobsByGesture.delete(job.gestureId);
    applySelectorSearchResultToSnapshot(job.snapshot, result);
    return recordClickSnapshot(job.snapshot, job.event, job.gestureId, job.sourceEvent,
    job.originatedOnRecorderOverlay, job.pendingState);
  }
  function drainPendingClickResolutionJobsSynchronously() {
    for (const job of Array.from(pendingClickResolutionJobsByGesture.values())) {
      try {
        const result = job.snapshot?.selectorSearch?.drainToCompletion?.();
        if (result) {
          finishPendingClickResolutionJob(job, result);
        }
      } catch (error) {
        console.error("[click-recorder] Final synchronous linear DOM scan failed:", {
          gestureId: job.gestureId,
          error,
        });
      }
    }
  }
  async function drainPendingRecorderWork() {
    while (pendingClickResolutionJobsByGesture.size) {
      const jobs = Array.from(pendingClickResolutionJobsByGesture.values());
      await Promise.allSettled(jobs.map(async job => {
        const result = await job.snapshot.selectorSearch.whenSettled();
        finishPendingClickResolutionJob(job, result);
      }));
    }
    while (pendingActionDeliveries.size) {
      await Promise.allSettled(Array.from(pendingActionDeliveries));
    }
    return {
      pendingClickSearches: pendingClickResolutionJobsByGesture.size,
      pendingDeliveries: pendingActionDeliveries.size,
      drained: pendingClickResolutionJobsByGesture.size === 0 && pendingActionDeliveries.size === 0,
    };
  }
  function applySelectorSearchResultToSnapshot(snapshot, result) {
    const xpath = result?.xpath || "";
    const strategy = xpath && (result?.strategy === "primary" || result?.strategy === "downward"
    || result?.strategy === "contextual" || result?.strategy === "descendant-back-reference"
    || result?.strategy === "indexed" || result?.strategy === "structural")
    ? result.strategy: "unresolved";
    snapshot.normalXPath = xpath;
    snapshot.selector = xpath ? `xpath=${xpath}`: "";
    snapshot.selectorStrategy = strategy;
    snapshot.selectorSearchDiagnostics = {
      ...(snapshot.selectorSearchDiagnostics || {}),
      ...(snapshot.selectorSearch?.getDiagnostics?.() || {
        strategy,
      }),
    };
    return snapshot;
  }
  function finalizeClickSnapshotSelector(snapshot) {
    if (!snapshot) {
      return snapshot;
    }
    const result = snapshot.selectorSearch?.result || {
      xpath: snapshot.normalXPath || "",
      strategy: snapshot.selectorStrategy || "unresolved",
    };
    if (!result?.xpath && snapshot.normalXPath && snapshot.capturedXPathProof?.valid === true
    && snapshot.capturedXPathProof.xpath === snapshot.normalXPath
    && snapshot.capturedXPathProof.strategy === snapshot.selectorStrategy) {
      return snapshot;
    }
    applySelectorSearchResultToSnapshot(snapshot, result);
    return snapshot;
  }
  function inspectXPathProofAgainstTarget(xpath, target, strategy, successReason, domSnapshotVersion = null) {
    const normalizedXPath = String(xpath || "").trim();
    if (!normalizedXPath || !(target instanceof Element)) {
      return {
        valid: false,
        reason: !normalizedXPath ? "missing-xpath": "missing-proof-target",
        matchCount: 0,
        matchedTarget: false,
        proofSource: successReason,
        domSnapshotVersion,
      };
    }
    const policyValid = strategy === "indexed" ? isSafeFinalSingleIndexedXPath(normalizedXPath, target): strategy === "structural"
    ? isSafeFinalStructuralXPath(normalizedXPath, target): isSafeFinalGraphXPath(normalizedXPath, target);
    if (!policyValid) {
      return {
        valid: false,
        reason: "xpath-failed-final-selector-policy",
        matchCount: null,
        matchedTarget: false,
        xpathEvaluated: false,
        proofSource: successReason,
        domSnapshotVersion,
      };
    }
    try {
      const ownerDocument = target.ownerDocument || document;
      const result = ownerDocument.evaluate(normalizedXPath, ownerDocument, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const matchCount = result.snapshotLength;
      const matchedTarget = matchCount === 1 && result.snapshotItem(0) === target;
      return {
        valid: matchedTarget,
        reason: matchedTarget ? successReason: matchCount === 0 ? "xpath-matched-zero-elements": matchCount === 1
        ? "xpath-matched-the-wrong-element": "xpath-matched-multiple-elements",
        matchCount,
        matchedTarget,
        xpath: normalizedXPath,
        strategy,
        proofSource: successReason,
        domSnapshotVersion,
        provenAt: Date.now(),
        xpathEvaluated: true,
        validatedAgainst: "complete-owner-document",
        hiddenElementsFiltered: false,
        targetConnected: target.isConnected,
      };
    } catch (error) {
      return {
        valid: false,
        reason: "xpath-evaluation-threw",
        matchCount: null,
        matchedTarget: false,
        xpathEvaluated: true,
        proofSource: successReason,
        domSnapshotVersion,
        error: String(error?.message || error || "Unknown XPath evaluation error"),
      };
    }
  }
  function proveClickSnapshotXPathAtCommit(snapshot) {
    const target = snapshot?.target;
    const xpath = String(snapshot?.normalXPath || "").trim();
    if (!xpath) {
      return {
        valid: false,
        reason: "missing-xpath",
        matchCount: 0,
        matchedTarget: false,
      };
    }
    let liveProof = null;
    if (target instanceof Element && target.isConnected) {
      liveProof = inspectXPathProofAgainstTarget(xpath, target, snapshot.selectorStrategy,
      "unique-live-target-proof", snapshot.domSnapshot?.version || null);
      /*
       * A connected target must pass the CURRENT owner-document proof. Never
       * replace a failed live proof with an earlier pointerdown/snapshot proof:
       * the page may have created another matching node in the meantime.
       */
      return liveProof;
    }
    const capturedProof = snapshot?.capturedXPathProof;
    if (capturedProof?.valid && capturedProof.xpath === xpath && capturedProof.strategy === snapshot.selectorStrategy) {
      return {
        ...capturedProof,
        reason: "unique-pointerdown-captured-proof",
      };
    }
    const historicalTarget = snapshot?.historicalDomSnapshot?.target;
    if (historicalTarget instanceof Element) {
      const historicalProof = inspectXPathProofAgainstTarget(xpath, historicalTarget, snapshot.selectorStrategy,
      "unique-pointerdown-snapshot-proof", snapshot.historicalDomSnapshot.version);
      if (historicalProof.valid) {
        return historicalProof;
      }
      return historicalProof;
    }
    return liveProof || {
      valid: false,
      reason: target instanceof Element ? "target-detached-without-historical-proof": "missing-proof-target",
      matchCount: 0,
      matchedTarget: false,
    };
  }
  function rebuildClickSnapshotSelectorFromCurrentDocument(snapshot) {
    const target = snapshot?.target;
    if (!(target instanceof Element) || !target.isConnected) {
      return null;
    }
    const previousSelector = snapshot.selector || "";
    const previousXPath = snapshot.normalXPath || "";
    const fastResult = getFastClickXPath(target);
    let result = fastResult.xpath ? {
      xpath: fastResult.xpath,
      strategy: "primary",
    }: null;
    let liveSearch = null;
    if (!result) {
      liveSearch = createLinearSelectorSearch(target);
      result = liveSearch.settleForDispatch();
    }
    applySelectorSearchResultToSnapshot(snapshot, result || {
      xpath: "",
      strategy: "unresolved",
    });
    snapshot.selectorSearchDiagnostics = {
      ...(snapshot.selectorSearchDiagnostics || {}),
      liveCommitRevalidationAttempted: true,
      liveCommitPreviousSelector: previousSelector || null,
      liveCommitPreviousXPath: previousXPath || null,
      liveCommitFastXPathSearch: fastResult.diagnostics,
      liveCommitSearchDiagnostics: liveSearch?.getDiagnostics?.() || null,
      liveCommitReplacementSelector: snapshot.selector || null,
    };
    return snapshot.normalXPath ? proveClickSnapshotXPathAtCommit(snapshot): null;
  }
  function getFreshestClickSnapshot(event, rawElement, inputMethod, previousSnapshot = null) {
    const currentDeepest = getInnermostEventTarget(event, rawElement);
    const currentTarget = currentDeepest instanceof Element
    ? getRecordableSvgClickTarget(currentDeepest): null;
    if (previousSnapshot?.target instanceof Element && previousSnapshot.target.isConnected
    && currentTarget === previousSnapshot.target) {
      /*
       * Reuse the expensive selector search only when the physical target is
       * still the exact same connected node. recordClickSnapshot performs a
       * new complete-owner-document proof before dispatch.
       */
      previousSnapshot.selectorSearchDiagnostics = {
        ...(previousSnapshot.selectorSearchDiagnostics || {}),
        pointerupTargetIdentityConfirmed: true,
        pointerupLiveRevalidationRequired: true,
      };
      return previousSnapshot;
    }
    let fresh = null;
    try {
      fresh = createClickSnapshot(event, rawElement, inputMethod);
    } catch (error) {
      console.warn("[click-recorder] Fresh DOM snapshot generation failed:", error);
    }
    if (fresh) {
      fresh.selectorSearchDiagnostics = {
        ...(fresh.selectorSearchDiagnostics || {}),
        refreshedAfterPointerdown: !!previousSnapshot,
        previousDomSnapshotVersion: previousSnapshot?.domSnapshot?.version || null,
        pointerupTargetIdentityConfirmed: false,
      };
      previousSnapshot?.selectorSearch?.cancel?.();
      releaseClickSnapshotHistoricalDom(previousSnapshot);
      return fresh;
    }
    if (previousSnapshot) {
      previousSnapshot.selectorSearchDiagnostics = {
        ...(previousSnapshot.selectorSearchDiagnostics || {}),
        refreshedAfterPointerdown: false,
        freshSnapshotUnavailable: true,
      };
      return previousSnapshot;
    }
    return null;
  }
  function recordClickSnapshot(snapshot, event, gestureId, sourceEvent, originatedOnRecorderOverlay = false, deferredState = null) {
    if (!snapshot || !gestureId || !(snapshot.target instanceof Element) || isRecorderOverlayElement(snapshot.target)) {
      console.warn("[click-recorder] Invalid click snapshot:", {
        snapshot,
        gestureId,
        sourceEvent,
      });
      return false;
    }
    if (!deferredState && snapshot.selectorSearch && !snapshot.selectorSearch?.result) {
      try {
        startClickSnapshotSelectorSearch(snapshot);
      } catch (error) {
        console.error("[click-recorder] Historical selector search could not be started after the gesture completed:", {
          gestureId,
          sourceEvent,
          error,
        });
        snapshot.selectorSearch?.cancel?.();
      }
    }
    finalizeClickSnapshotSelector(snapshot);
    let isResolvedClick = (snapshot.selectorStrategy === "primary" || snapshot.selectorStrategy === "downward"
    || snapshot.selectorStrategy === "contextual" || snapshot.selectorStrategy === "descendant-back-reference"
    || snapshot.selectorStrategy === "indexed"
    || snapshot.selectorStrategy === "structural")
    && !!snapshot.selector && !!snapshot.normalXPath;
    let selectorSearchSettled = !snapshot.selectorSearch || !!snapshot.selectorSearch?.result;
    let commitProof = isResolvedClick ? proveClickSnapshotXPathAtCommit(snapshot): null;
    const initiallyRejectedSelector = isResolvedClick && !commitProof?.valid ? snapshot.selector: "";
    const initiallyRejectedXPath = isResolvedClick && !commitProof?.valid ? snapshot.normalXPath: "";
    snapshot.commitXPathProof = commitProof;
    if (isResolvedClick && !commitProof?.valid) {
      const rejectedSelector = initiallyRejectedSelector || snapshot.selector;
      const rejectedXPath = initiallyRejectedXPath || snapshot.normalXPath;
      const rebuiltLiveProof = rebuildClickSnapshotSelectorFromCurrentDocument(snapshot);
      isResolvedClick = rebuiltLiveProof?.valid === true;
      if (isResolvedClick) {
        commitProof = rebuiltLiveProof;
        snapshot.commitXPathProof = commitProof;
      }
      const rescued = !isResolvedClick
      && restorePointerdownStructuralXPath(snapshot, "commit-proof-rejected-semantic-xpath");
      if (rescued) {
        commitProof = proveClickSnapshotXPathAtCommit(snapshot);
        snapshot.commitXPathProof = commitProof;
        isResolvedClick = commitProof?.valid === true;
      }
      if (!isResolvedClick) {
        snapshot.normalXPath = "";
        snapshot.selector = "";
        snapshot.selectorStrategy = "unresolved";
        snapshot.selectorSearchDiagnostics = {
          ...(snapshot.selectorSearchDiagnostics || {}),
          commitXPathProof: commitProof,
          rejectedSelector,
          rejectedXPath,
        };
        console.error("[click-recorder] Final XPath proof and pointerdown structural rescue both failed. Selector quarantined:", {
          gestureId,
          sourceEvent,
          rejectedSelector,
          commitProof,
        });
      } else {
        console.warn("[click-recorder] Semantic XPath failed its commit proof; the pointerdown structural proof preserved the click:", {
          gestureId,
          sourceEvent,
          rejectedSelector,
          selector: snapshot.selector,
        });
      }
    }
    const isRecoveredClick = sourceEvent === "recovered-click" || String(gestureId).startsWith("recovered-pointer:");
    const existingPending = pendingClickResolutionByElement.get(snapshot.target);
    if (isRecoveredClick && existingPending && existingPending.gestureId !== gestureId) {
      console.debug("[click-recorder] Recovered click matched a physical click whose snapshot selector is still resolving and was suppressed:", {
        sourceGestureId: existingPending.gestureId,
        recoveredGestureId: gestureId,
        domSnapshotVersion: existingPending.domSnapshotVersion,
      });
      return true;
    }
    /*
     * Do not deduplicate a recovered trusted click by target, XPath or visual
     * similarity. Those identities can suppress a second genuine user click.
     * The pending physical gesture and gestureId are the duplicate boundary.
     */
    if (!isResolvedClick && !selectorSearchSettled) {
      if (deferredState) {
        return true;
      }
      if (!reserveClickGesture(gestureId)) {
        console.debug("[click-recorder] Same physical gesture already reserved:", gestureId);
        return false;
      }
      const pendingState = {
        gestureId,
        sequence: ++actionSequence,
        dispatchSlot: reserveDispatchSlot(),
        domSnapshotVersion: snapshot.domSnapshot?.version || null,
        clickEvent: {
          sourceEvent,
          inputMethod: snapshot.inputMethod,
          pointerId: Number.isFinite(event?.pointerId) ? event.pointerId: null,
          pointerType: event?.pointerType || null,
          detail: Number.isFinite(event?.detail) ? event.detail: 0,
          button: Number.isFinite(event?.button) ? event.button: 0,
          clientX: Number.isFinite(event?.clientX) ? event.clientX: null,
          clientY: Number.isFinite(event?.clientY) ? event.clientY: null,
          altKey: !!event?.altKey,
          ctrlKey: !!event?.ctrlKey,
          metaKey: !!event?.metaKey,
          shiftKey: !!event?.shiftKey,
        },
      };
      pendingClickResolutionByElement.set(snapshot.target, pendingState);
      const pendingJob = {
        gestureId,
        snapshot,
        event,
        sourceEvent,
        originatedOnRecorderOverlay,
        pendingState,
      };
      pendingClickResolutionJobsByGesture.set(gestureId, pendingJob);
      console.debug("[click-recorder] Click DOM snapshot reserved; selector search will continue asynchronously without blocking the page:", {
        gestureId,
        sequence: pendingState.sequence,
        domSnapshotVersion: pendingState.domSnapshotVersion,
      });
      snapshot.selectorSearch.whenSettled().then(result => {
        finishPendingClickResolutionJob(pendingJob, result);
      }).catch(error => {
        pendingClickResolutionJobsByGesture.delete(gestureId);
        if (pendingClickResolutionByElement.get(snapshot.target)?.gestureId === gestureId) {
          pendingClickResolutionByElement.delete(snapshot.target);
        }
        cancelDispatchSlot(pendingState.dispatchSlot);
        releaseClickGesture(gestureId);
        forgetRecordedPointerClick(gestureId);
        releaseClickSnapshotHistoricalDom(snapshot);
        console.error("[click-recorder] Asynchronous snapshot selector search failed:", {
          gestureId,
          domSnapshotVersion: pendingState.domSnapshotVersion,
          error,
        });
      });
      return true;
    }
    if (!isResolvedClick) {
      if (pendingClickResolutionByElement.get(snapshot.target)?.gestureId === gestureId) {
        pendingClickResolutionByElement.delete(snapshot.target);
      }
      if (deferredState?.dispatchSlot) {
        cancelDispatchSlot(deferredState.dispatchSlot);
      }
      releaseClickGesture(gestureId);
      forgetRecordedPointerClick(gestureId);
      console.error("[click-recorder] Final selector search completed without a commit-proven unique XPath. The click was quarantined instead of poisoning TRACE:", {
        gestureId,
        sourceEvent,
        domSnapshotVersion: snapshot.domSnapshot?.version || null,
        element: snapshot.element,
        diagnostics: snapshot.selectorSearchDiagnostics,
      });
      releaseClickSnapshotHistoricalDom(snapshot);
      return false;
    }
    if (snapshot.commitXPathProof?.valid !== true) {
      if (deferredState?.dispatchSlot) {
        cancelDispatchSlot(deferredState.dispatchSlot);
      }
      releaseClickGesture(gestureId);
      forgetRecordedPointerClick(gestureId);
      console.error("[click-recorder] Dispatch invariant blocked a click without a valid final XPath proof:", {
        gestureId,
        sourceEvent,
        selector: snapshot.selector || null,
        commitXPathProof: snapshot.commitXPathProof || null,
      });
      releaseClickSnapshotHistoricalDom(snapshot);
      return false;
    }
    if (!deferredState && !reserveClickGesture(gestureId)) {
      console.debug("[click-recorder] Same physical gesture already reserved:", gestureId);
      return false;
    }
    if (pendingClickResolutionByElement.get(snapshot.target)?.gestureId === gestureId) {
      pendingClickResolutionByElement.delete(snapshot.target);
    }
    if (snapshot.inputMethod === "pointer" && (sourceEvent === "pointerup" || sourceEvent === "click-recovery"
    || sourceEvent === "multi-click-recovery")) {
      rememberRecordedPointerClick(snapshot, event, gestureId, originatedOnRecorderOverlay);
    }
    const sequence = deferredState?.sequence || ++actionSequence;
    const elementHandle = snapshot.target.isConnected && !isRecorderOverlayElement(snapshot.target) ? snapshot.target: null;
    const actionData = {
      action: "click",
      gestureId,
      clickId: gestureId,
      recorderReplayOfGestureId: snapshot.recorderReplayOfGestureId || null,
      physicalClickCount: Number.isFinite(snapshot.physicalClickCount) ? snapshot.physicalClickCount
      : Number.isFinite(event?.detail) ? event.detail: null,
      clickCapturedAt: Number.isFinite(snapshot.domSnapshot?.capturedAt)
      ? snapshot.domSnapshot.capturedAt: Date.now(),
      sequence,
      selector: snapshot.selector,
      xpath: snapshot.normalXPath,
      selectorStrategy: snapshot.selectorStrategy,
      selectorSearchDiagnostics: {
        ...snapshot.selectorSearchDiagnostics,
        asynchronousSnapshotSearch: !!deferredState,
        domSnapshotVersion: snapshot.domSnapshot?.version || null,
        commitXPathProof: snapshot.commitXPathProof,
      },
      elementHandle,
      text: snapshot.text,
      element: snapshot.element,
      clickEvent: deferredState?.clickEvent || {
        sourceEvent,
        inputMethod: snapshot.inputMethod,
        pointerId: Number.isFinite(event?.pointerId) ? event.pointerId: null,
        pointerType: event?.pointerType || null,
        detail: Number.isFinite(event?.detail) ? event.detail: 0,
        button: Number.isFinite(event?.button) ? event.button: 0,
        clientX: Number.isFinite(event?.clientX) ? event.clientX: null,
        clientY: Number.isFinite(event?.clientY) ? event.clientY: null,
        altKey: !!event?.altKey,
        ctrlKey: !!event?.ctrlKey,
        metaKey: !!event?.metaKey,
        shiftKey: !!event?.shiftKey,
      },
    };
    console.debug("[click-recorder] RESOLVED SELECTOR CLICK READY FOR ORDERED TRACE:", {
      gestureId,
      sequence,
      sourceEvent,
      selector: snapshot.selector,
      selectorStrategy: actionData.selectorStrategy,
      asynchronousSnapshotSearch: !!deferredState,
      element: snapshot.target,
    });
    releaseClickSnapshotHistoricalDom(snapshot);
    const delivery = deferredState?.dispatchSlot ? trackPendingActionDelivery(resolveDispatchSlot(deferredState.dispatchSlot, actionData))
    : dispatch(actionData);
    delivery.then(result => {
      if (result?.accepted === false) {
        releaseClickGesture(gestureId);
        forgetRecordedPointerClick(gestureId);
        console.error("[click-recorder] CLICK TRACE REJECTED:", {
          gestureId,
          sourceEvent,
          selector: snapshot.selector || null,
          selectorStrategy: actionData.selectorStrategy,
          result,
        });
        return;
      }
      console.debug("[click-recorder] CLICK TRACE ACCEPTED/DELIVERED:", {
        gestureId,
        sourceEvent,
        selector: snapshot.selector || null,
        selectorStrategy: actionData.selectorStrategy,
        transport: result?.transport || null,
        delivered: result?.delivered ?? null,
        forwarded: result?.forwarded ?? null,
      });
    }).catch (error => {
      releaseClickGesture(gestureId);
      forgetRecordedPointerClick(gestureId);
      console.error("[click-recorder] CLICK TRACE DELIVERY FAILED:", {
        gestureId,
        sourceEvent,
        selector: snapshot.selector || null,
        selectorStrategy: actionData.selectorStrategy,
        error,
      });
    });
    return true;
  }
  window.__PW_RECORDER_DRAIN_PENDING__ = drainPendingRecorderWork;
  window.addEventListener("beforeunload", () => {
    commitPendingPointerGestureBeforeLoss("pointerdown-beforeunload");
    drainPendingClickResolutionJobsSynchronously();
  }, true);
  window.addEventListener("pagehide", () => {
    commitPendingPointerGestureBeforeLoss("pointerdown-pagehide");
    drainPendingClickResolutionJobsSynchronously();
  }, true);
  function getPointerTravelDistance(gesture, event) {
    const startX = Number(gesture?.clientX);
    const startY = Number(gesture?.clientY);
    const endX = Number(event?.clientX);
    const endY = Number(event?.clientY);
    if (!Number.isFinite(startX) || !Number.isFinite(startY) || !Number.isFinite(endX) || !Number.isFinite(endY)) {
      return 0;
    }
    return Math.hypot(endX - startX, endY - startY);
  }
  function isPendingPointerGestureUsable(gesture, event = null) {
    if (!gesture) {
      return false;
    }
    const age = Date.now() - Number(gesture.createdAt || 0);
    if (!Number.isFinite(age) || age < 0 || age > POINTER_CLICK_MAX_AGE_MS) {
      return false;
    }
    if (event && Number.isFinite(event.pointerId) && Number.isFinite(gesture.pointerId) && event.pointerId !== gesture.pointerId) {
      return false;
    }
    return true;
  }
  function clearPointerGestureTimer(gesture) {
    if (gesture?.clearTimer) {
      clearTimeout(gesture.clearTimer);
      gesture.clearTimer = null;
    }
  }
  function commitPendingPointerGestureBeforeLoss(sourceEvent, event = null) {
    const gesture = pendingPointerGesture;
    if (!gesture || gesture.recorded || !gesture.pointerdownSnapshot) {
      return false;
    }
    const snapshot = gesture.pointerupSnapshot || gesture.pointerdownSnapshot;
    if (!snapshot.normalXPath) {
      restorePointerdownStructuralXPath(snapshot, `${sourceEvent}-before-loss`);
    }
    const physicalEvent = event || {
      pointerId: gesture.pointerId,
      pointerType: gesture.pointerType,
      button: 0,
      detail: 1,
      clientX: gesture.clientX,
      clientY: gesture.clientY,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    };
    gesture.recorded = recordClickSnapshot({
      ...snapshot,
      inputMethod: "pointer",
    }, physicalEvent, gesture.gestureId, sourceEvent, gesture.originatedOnRecorderOverlay === true);
    return gesture.recorded;
  }
  function clearPendingPointerGesture(gesture = pendingPointerGesture) {
    if (!gesture) {
      return;
    }
    clearPointerGestureTimer(gesture);
    if (!gesture.recorded) {
      gesture.pointerdownSnapshot?.selectorSearch?.cancel?.();
      if (gesture.pointerupSnapshot !== gesture.pointerdownSnapshot) {
        gesture.pointerupSnapshot?.selectorSearch?.cancel?.();
      }
    }
    if (pendingPointerGesture === gesture) {
      pendingPointerGesture = null;
    }
  }
  function schedulePointerGestureCleanup(gesture) {
    if (!gesture) {
      return;
    }
    clearPointerGestureTimer(gesture);
    gesture.clearTimer = setTimeout(() => {
      gesture.clearTimer = null;
      if (pendingPointerGesture === gesture) {
        pendingPointerGesture = null;
      }
    }, POINTER_POST_UP_RETENTION_MS);
  }
  window.addEventListener("pointerdown", event => {
    try {
      if (event.isTrusted === false || event.button !== 0 || !isRealUserFrame()) {
        return;
      }
      const originatedOnRecorderOverlay = eventOriginatesFromRecorderOverlay(event);
      recentCompletedPointerGesture = null;
      clearPendingPointerGesture();
      const rawElement = getPhysicalPointerTarget(event);
      if (!(rawElement instanceof Element) || isRecorderOverlayElement(rawElement)) {
        console.warn("[click-recorder] Trusted pointerdown occurred but no genuine application element could be resolved.");
        return;
      }
      const recorderReplayOfGestureId = identifyRecorderReplaySourceGestureId(event, rawElement);
      pendingTextEntryPointerIntent = buildPrivateTextEntryPointerIntent(event);
      finishTextEntryBeforePointerTarget(event);
      const gestureId = createPointerGestureId(event);
      let pointerdownSnapshot = null;
      try {
        pointerdownSnapshot = createClickSnapshot(event, rawElement, "pointer");
        if (pointerdownSnapshot && recorderReplayOfGestureId) {
          pointerdownSnapshot.recorderReplayOfGestureId = recorderReplayOfGestureId;
        }
        if (pointerdownSnapshot) {
          pointerdownSnapshot.physicalClickCount = Number.isFinite(event.detail) ? event.detail: null;
        }
      } catch (error) {
        console.warn("[click-recorder] Pointerdown DOM capture failed; gesture retained for pointerup/click recovery:", error);
      }
      pendingPointerGesture = {
        gestureId,
        pointerId: Number.isFinite(event.pointerId) ? event.pointerId: 0,
        pointerType: String(event.pointerType || "mouse"),
        clientX: Number.isFinite(event.clientX) ? event.clientX: null,
        clientY: Number.isFinite(event.clientY) ? event.clientY: null,
        createdAt: Date.now(),
        pointerdownTarget: rawElement,
        pointerdownSnapshot,
        pointerupSnapshot: null,
        pointerupSeen: false,
        physicalClickCount: Number.isFinite(event.detail) ? event.detail: null,
        recorderReplayOfGestureId,
        originatedOnRecorderOverlay,
        recorded: false,
        clearTimer: null,
      };
      console.debug("[click-recorder] POINTERDOWN OBSERVED:", {
        gestureId,
        target: rawElement,
        selector: pointerdownSnapshot?.selector || null,
        selectorStrategy: pointerdownSnapshot?.selectorStrategy || null,
      });
    } catch (error) {
      console.error("[click-recorder] Pointerdown capture failed:", error);
    }
  }, true);
  window.addEventListener("pointerup", event => {
    try {
      if (event.isTrusted === false || !isRealUserFrame()) {
        return;
      }
      const pointerupRawElement = getPhysicalPointerTarget(event);
      if (isSuppressedRecorderReplayEvent(event, pointerupRawElement)) {
        confirmPrivateTextEntryPointerActivation(event);
        console.debug("[click-recorder] Playwright recorder replay pointerup suppressed.");
        return;
      }
      confirmPrivateTextEntryPointerActivation(event);
      const gesture = pendingPointerGesture;
      if (!isPendingPointerGestureUsable(gesture, event)) {
        clearPendingPointerGesture(gesture);
        return;
      }
      gesture.pointerupSeen = true;
      const travel = getPointerTravelDistance(gesture, event);
      if (travel > POINTER_CLICK_MAX_TRAVEL_PX) {
        console.debug("[click-recorder] Gesture rejected as drag:", {
          gestureId: gesture.gestureId,
          travel,
        });
        clearPendingPointerGesture(gesture);
        return;
      }
      const rawElement = pointerupRawElement || gesture.pointerdownTarget;
      let snapshot = null;
      if (rawElement instanceof Element && !isRecorderOverlayElement(rawElement)) {
        snapshot = getFreshestClickSnapshot(event, rawElement, "pointer", gesture.pointerdownSnapshot);
      } else {
        snapshot = gesture.pointerdownSnapshot;
      }
      if (snapshot && gesture.recorderReplayOfGestureId) {
        snapshot.recorderReplayOfGestureId = gesture.recorderReplayOfGestureId;
      }
      if (snapshot) {
        snapshot.physicalClickCount = gesture.physicalClickCount;
      }
      gesture.pointerupSnapshot = snapshot;
      if (snapshot) {
        gesture.recorded = recordClickSnapshot({
          ...snapshot,
          inputMethod: "pointer",
        }, event, gesture.gestureId, "pointerup", gesture.originatedOnRecorderOverlay === true);
      } else {
        console.error("[click-recorder] Physical pointerup was confirmed, but no click target snapshot survived:", {
          gestureId: gesture.gestureId,
        });
      }
      schedulePointerGestureCleanup(gesture);
    } catch (error) {
      console.error("[click-recorder] Pointerup capture failed:", error);
    }
  }, true);
  window.addEventListener("pointercancel", event => {
    try {
      const replay = suppressedRecorderReplay;
      if (replay && (!Number.isFinite(event?.pointerId) || !Number.isFinite(replay.pointerId) || event.pointerId === replay.pointerId)) {
        clearSuppressedRecorderReplay(replay);
      }
      const gesture = pendingPointerGesture;
      if (gesture && (!Number.isFinite(event?.pointerId) || event.pointerId === gesture.pointerId)) {
        clearPendingPointerGesture(gesture);
      }
      pendingTextEntryPointerIntent = null;
    } catch {
      pendingPointerGesture = null;
      pendingTextEntryPointerIntent = null;
    }
  }, true);
  window.addEventListener("click", event => {
    try {
      if (event.isTrusted === false || !isRealUserFrame()) {
        return;
      }
      const rawElement = getPhysicalPointerTarget(event);
      if (consumeNativeClickForCompletedPointerGesture(event, rawElement)) {
        confirmPrivateTextEntryPointerActivation(event);
        clearPendingPointerGesture();
        console.debug("[click-recorder] Native click correlated to its already-recorded physical pointer gesture and suppressed.");
        return;
      }
      if (isSuppressedRecorderReplayEvent(event, rawElement)) {
        const replay = suppressedRecorderReplay;
        confirmPrivateTextEntryPointerActivation(event);
        clearSuppressedRecorderReplay();
        if (Number.isFinite(event.detail) && event.detail > 1 && replay?.gestureId) {
          const multiClickSnapshot = createClickSnapshot(event, rawElement, "pointer");
          if (multiClickSnapshot) {
            recordClickSnapshot(multiClickSnapshot, event, replay.gestureId, "multi-click-recovery", false);
          }
          console.debug("[click-recorder] Native multi-click preserved instead of treating it as a recorder replay.");
          return;
        }
        console.debug("[click-recorder] Playwright recorder replay click suppressed.");
        return;
      }
      const gesture = pendingPointerGesture;
      if (Number(event.detail) !== 0 && isPendingPointerGestureUsable(gesture) && gesture.recorded) {
        confirmPrivateTextEntryPointerActivation(event);
        clearPointerGestureTimer(gesture);
        console.debug("[click-recorder] Browser click matched already-recorded pointer gesture without consuming the replay guard:",
        {
          gestureId: gesture.gestureId,
          selector: gesture.pointerupSnapshot?.selector || gesture.pointerdownSnapshot?.selector || null,
          selectorStrategy: gesture.pointerupSnapshot?.selectorStrategy || gesture.pointerdownSnapshot?.selectorStrategy
          || null,
        });
        clearPendingPointerGesture(gesture);
        return;
      }
      if (consumeMatchingRecentRecordedClickReplay(event, rawElement)) {
        confirmPrivateTextEntryPointerActivation(event);
        clearPendingPointerGesture();
        console.debug("[click-recorder] Click-only Playwright recorder replay suppressed before trusted-click recovery.");
        return;
      }
      confirmPrivateTextEntryPointerActivation(event);
      if (event.detail === 0) {
        if (!(rawElement instanceof Element) || isRecorderOverlayElement(rawElement)) {
          return;
        }
        const keyboardSnapshot = createClickSnapshot(event, rawElement, "keyboard");
        if (!keyboardSnapshot) {
          console.warn("[click-recorder] Keyboard activation occurred but no valid application target snapshot could be produced.");
          return;
        }
        const gestureId = createKeyboardGestureId(event, keyboardSnapshot);
        recordClickSnapshot(keyboardSnapshot, event, gestureId, "keyboard-click");
        return;
      }
      if (isPendingPointerGestureUsable(gesture)) {
        clearPointerGestureTimer(gesture);
        if (gesture.recorded) {
          console.debug("[click-recorder] Browser click matched already-recorded pointer gesture:", {
            gestureId: gesture.gestureId,
            selector: gesture.pointerupSnapshot?.selector || gesture.pointerdownSnapshot?.selector || null,
            selectorStrategy: gesture.pointerupSnapshot?.selectorStrategy || gesture.pointerdownSnapshot?.selectorStrategy
            || null,
          });
          clearPendingPointerGesture(gesture);
          return;
        }
        let clickSnapshot = null;
        if (rawElement instanceof Element && !isRecorderOverlayElement(rawElement)) {
          const previousSnapshot = gesture.pointerupSnapshot || gesture.pointerdownSnapshot;
          clickSnapshot = getFreshestClickSnapshot(event, rawElement, "pointer", previousSnapshot);
        } else {
          clickSnapshot = gesture.pointerupSnapshot || gesture.pointerdownSnapshot;
        }
        if (clickSnapshot) {
          gesture.recorded = recordClickSnapshot(clickSnapshot, event, gesture.gestureId, "click-recovery", gesture.originatedOnRecorderOverlay === true);
        }
        clearPendingPointerGesture(gesture);
        return;
      }
      if (!(rawElement instanceof Element) || isRecorderOverlayElement(rawElement)) {
        console.warn("[click-recorder] Trusted click occurred but no genuine page target could be resolved.");
        return;
      }
      const recoveredSnapshot = createClickSnapshot(event, rawElement, "pointer-recovered");
      if (!recoveredSnapshot) {
        console.error("[click-recorder] Trusted click observed but no application target snapshot could be produced.");
        return;
      }
      const recoveredGestureId = createRecoveredPointerClickGestureId(event, recoveredSnapshot);
      recordClickSnapshot(recoveredSnapshot, event, recoveredGestureId, "recovered-click");
    } catch (error) {
      console.error("[click-recorder] Click capture failed:", error);
    }
  }, true);
  for (const eventName of[
    "beforeinput",
    "input",
    "compositionend",
  ]) {
    document.addEventListener(eventName, event => {
      try {
        if (event.isTrusted === false || !isRealUserFrame()) {
          return;
        }
        const element = getCanonicalTextEntryElement(getEventTextEntryElement(event));
        if (!element) {
          return;
        }
        ensureTextEntrySessionForEvent(element, eventName);
      } catch (error) {
        console.warn(`${eventName} input tracking failed:`, error);
      }
    }, true);
  }
  document.addEventListener("change", event => {
    const rawElement = getEventElement(event);
    if (!rawElement || !isRealUserFrame() || isRecorderOverlayElement(rawElement)) {
      return;
    }
    const textEntryElement = getCanonicalTextEntryElement(rawElement);
    if (textEntryElement) {
      ensureTextEntrySessionForEvent(textEntryElement, "change");
      return;
    }
    const element = rawElement;
    const selector = getSelector(element);
    if (!selector) {
      return;
    }
    if (element.tagName === "SELECT") {
      dispatch({
        action: "select",
        selector,
        elementHandle: element,
        value: element.value,
        label: element.options[element.selectedIndex]?.text || null,
        element: getElementAttributes(element),
      });
    }
    if (element.type === "checkbox" || element.type === "radio") {
      dispatch({
        action: element.type,
        selector,
        elementHandle: element,
        checked: element.checked,
        value: element.value || null,
        element: getElementAttributes(element),
      });
    }
    if (element.type === "file") {
      dispatch({
        action: "file-upload",
        selector,
        elementHandle: element,
        fileCount: element.files.length,
        fileNames: Array.from(element.files).map(file => {
          return file.name;
        }),
        element: getElementAttributes(element),
      });
    }
  }, true);
  window.addEventListener("load", () => {
    try {
      if (!isRealUserFrame()) {
        return;
      }
      dispatch({
        action: "navigation",
        url: location.href,
        title: document.title || null,
      });
    } catch {
    }
  });
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (!isRealUserFrame()) {
        return;
      }
      const maxScrollY = document.body.scrollHeight - window.innerHeight;
      dispatch({
        action: "scroll",
        maxScrollY,
        scrollPercent: Math.round((window.scrollY / (maxScrollY || 1)) * 100),
      });
    }, 800);
  });
  document.addEventListener("focusin", event => {
    const element = getEventElement(event);
    if (!element || !isRealUserFrame() || isRecorderOverlayElement(element)) {
      return;
    }
    const textEntryElement = getCanonicalTextEntryElement(getEventTextEntryElement(event));
    const isTextEntry = !!textEntryElement;
    const isSelect = element instanceof HTMLSelectElement;
    if (!isTextEntry && !isSelect) {
      return;
    }
    const focusedElement = isTextEntry ? textEntryElement: element;
    if (isTextEntry) {
      beginTextEntryTracking(focusedElement, "focusin");
    }
    if (isSuppressedRecorderReplayEvent(event, focusedElement)) {
      console.debug("[focus-recorder] Focus caused by the matching Playwright recorder replay was not recorded separately.");
      return;
    }
    if (isTextEntry) {
      return;
    }
    const selector = getSelector(focusedElement);
    if (!selector) {
      return;
    }
    dispatch({
      action: "focus",
      selector,
      elementHandle: focusedElement,
      element: getElementAttributes(focusedElement),
    });
  }, true);
  document.addEventListener("focusout", event => {
    try {
      if (!isRealUserFrame()) {
        return;
      }
      const element = getCanonicalTextEntryElement(getEventTextEntryElement(event));
      if (!element) {
        return;
      }
      scheduleTextEntryRefresh(element, "focusout");
      scheduleTextEntryFinish(element, "focusout");
    } catch (error) {
      console.warn("Focusout input tracking failed:", error);
    }
  }, true);
  window.addEventListener("pagehide", () => {
    try {
      drainPendingClickResolutionJobsSynchronously();
      if (activeTextEntrySession) {
        refreshTextEntrySession(null, "pagehide");
        finishTextEntryTracking("pagehide");
      }
    } catch (error) {
      console.warn("Pagehide input finalization failed:", error);
    }
  }, true);
  document.addEventListener("visibilitychange", () => {
    try {
      if (document.visibilityState === "hidden" && activeTextEntrySession) {
        refreshTextEntrySession(null, "visibility-hidden");
        finishTextEntryTracking("visibility-hidden");
      }
    } catch (error) {
      console.warn("Visibility input finalization failed:", error);
    }
  }, true);
}
module.exports = {
  injectListeners,
};

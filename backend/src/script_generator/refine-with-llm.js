const fs = require("fs");
const path = require("path");
const {
  spawnSync,
} = require("child_process");

const ROOT =
  path.resolve(
    __dirname,
    "..",
    ".."
  );

/*
 * Raw CODEGEN is deliberately not parsed again during refinement.
 *
 * record-trace.js already consumes the nearest live codegen click, ignores
 * codegen fills, compares that click with the listener's proven XPath, and
 * stores the validated selection on the TRACE click. The recorder also
 * derives getByRole/getByLabel/getByText/getByPlaceholder/getByTestId/
 * getByAltText/getByTitle candidates directly from the proven XPath target
 * and validates them live. This file uses proven Codegen first, then a proven
 * live semantic locator, and otherwise the listener XPath. The --codegen
 * argument remains accepted for compatibility, but this file does not re-read
 * or mutate it.
 *
 * TRACE is authoritative for:
 *
 * - action order
 * - navigation
 * - validated click locator selection, with XPath as the required fallback
 * - input XPaths
 * - input values
 * - testData keys
 * - select actions
 * - keyboard actions
 * - hover actions
 * - file-upload actions
 *
 * No LLM or remote model is used anywhere in this file.
 */
const RAW_CODEGEN_IS_NOT_REPARSED =
  true;

const TRACE_INDEX =
  Symbol(
    "traceIndex"
  );

const INPUT_ACTION_KINDS =
  new Set([
    "input",
    "fill",
    "change",
    "valuecommit",
    "value-commit",
    "textinput",
    "text-input",
    "inputchange",
    "input-change",
  ]);

const NON_TEXT_INPUT_TYPES =
  new Set([
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

const RECORDER_NOISE_ACTIONS =
  new Set([
    "focus",
    "focusin",
    "focus-in",
    "focusout",
    "focus-out",
    "blur",
    "beforeinput",
    "before-input",
    "keydown",
    "key-down",
    "keyup",
    "key-up",
    "keypress",
    "key-press",
    "compositionstart",
    "composition-start",
    "compositionupdate",
    "composition-update",
    "compositionend",
    "composition-end",
    "pointerdown",
    "pointer-down",
    "pointerup",
    "pointer-up",
    "pointermove",
    "pointer-move",
    "mousedown",
    "mouse-down",
    "mouseup",
    "mouse-up",
    "mousemove",
    "mouse-move",
    "mouseenter",
    "mouse-enter",
    "mouseleave",
    "mouse-leave",
    "mouseover",
    "mouse-over",
    "mouseout",
    "mouse-out",
    "touchstart",
    "touch-start",
    "touchend",
    "touch-end",
    "touchmove",
    "touch-move",
    "wheel",
    "scroll",
  ]);

function loadFile(
  filePath
) {
  return fs.readFileSync(
    filePath,
    "utf8"
  );
}

function resolveFromRoot(
  filePath
) {
  return path.isAbsolute(
    filePath
  )
    ? filePath
    : path.resolve(
        ROOT,
        filePath
      );
}

function parseArgs(
  argv
) {
  const args = {};

  for (
    const argument of argv
  ) {
    if (
      !argument.startsWith(
        "--"
      )
    ) {
      continue;
    }

    const [
      key,
      ...rest
    ] =
      argument
        .slice(2)
        .split("=");

    args[key] =
      rest.length
        ? rest.join("=")
        : "";
  }

  if (
    Object.prototype
      .hasOwnProperty.call(
        args,
        "help"
      ) ||
    Object.prototype
      .hasOwnProperty.call(
        args,
        "h"
      )
  ) {
    return {
      help:
        true,
    };
  }

  if (
    !args.trace ||
    !args.output
  ) {
    printHelp();

    throw new Error(
      "Missing required arguments: " +
      "--trace and --output."
    );
  }

  return args;
}

function printHelp() {
  console.log(
    [
      "Usage:",
      "",
      "node src/script_generator/refine-with-llm.js \\",
      "  --trace=<actions.json> \\",
      "  --output=<generated.spec.js> \\",
      "  [--codegen=<recorded.js>] \\",
      "  [--test-name=<name>]",
      "",
      "TRACE is the generation source.",
      "Live Codegen and semantic-locator validation metadata is consumed from TRACE.",
      "The raw CODEGEN file is not parsed again during refinement.",
      "No LLM or remote model is used.",
    ].join("\n")
  );
}

function compactActionValue(
  value
) {
  return String(
    value ??
    ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function normalizeRecordedInputValue(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function normalizeFillXPathIdentity(
  value
) {
  return String(
    value ??
    ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .toLowerCase();
}

function fillXPathLiteral(
  value
) {
  const text =
    String(
      value ??
      ""
    );

  if (
    !text.includes(
      "'"
    )
  ) {
    return `'${text}'`;
  }

  if (
    !text.includes(
      '"'
    )
  ) {
    return `"${text}"`;
  }

  return (
    "concat(" +
    text
      .split(
        "'"
      )
      .map(
        (part) =>
          `'${part}'`
      )
      .join(
        ', "\'", '
      ) +
    ")"
  );
}

function fillXPathTextDependsOnEnteredValue(
  selector,
  inputValue
) {
  const xpathText =
    String(
      selector ||
      ""
    );

  const normalizedValue =
    normalizeFillXPathIdentity(
      inputValue
    );

  const compactValue =
    String(
      inputValue ??
      ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  const fillTokens =
    new Set(
      normalizedValue.match(
        /[\p{L}]+|[\p{N}]+/gu
      ) || []
    );

  const normalizedTextCall =
    String.raw`normalize-space\s*\(\s*(?:\.|text\s*\(\s*\)|string\s*\(\s*\.\s*\))?\s*\)`;

  const xpathStringLiteral =
    String.raw`(?:'[^']*'|"[^"]*"|concat\((?:[^()]|'[^']*'|"[^"]*")*\))`;

  const expressions = [];

  for (
    const source of
    [
      String.raw`${normalizedTextCall}\s*!?=\s*${xpathStringLiteral}`,
      String.raw`${xpathStringLiteral}\s*!?=\s*${normalizedTextCall}`,
      String.raw`(?:contains|starts-with)\s*\(\s*${normalizedTextCall}\s*,\s*${xpathStringLiteral}\s*\)`,
    ]
  ) {
    for (
      const match of
      xpathText.matchAll(
        new RegExp(
          source,
          "gi"
        )
      )
    ) {
      expressions.push(
        match[0]
      );
    }
  }

  if (
    !normalizedValue ||
    !expressions.length
  ) {
    return false;
  }

  const literalPattern =
    /'([^']*)'|"([^"]*)"/g;

  for (
    const expression of
    expressions
  ) {
    if (
      compactValue &&
      expression.includes(
        fillXPathLiteral(
          compactValue
        )
      )
    ) {
      return true;
    }

    let match =
      null;

    while (
      (
        match =
          literalPattern.exec(
            expression
          )
      ) !== null
    ) {
      const literalTokens =
        normalizeFillXPathIdentity(
          match[1] ??
          match[2] ??
          ""
        ).match(
          /[\p{L}]+|[\p{N}]+/gu
        ) || [];

      if (
        literalTokens.some(
          (token) =>
            fillTokens.has(
              token
            )
        )
      ) {
        return true;
      }
    }

    literalPattern.lastIndex =
      0;
  }

  return false;
}

function hasIndependentFillTextProvenance(
  action
) {
  return (
    action
      ?.fillTextProvenance ===
    "dom-text-unchanged-during-fill-session"
  );
}

function getActionElement(
  action
) {
  return (
    action &&
    typeof action.element ===
      "object" &&
    !Array.isArray(
      action.element
    )
  )
    ? action.element
    : {};
}

function getActionKind(
  action
) {
  return compactActionValue(
    action?.action
  ).toLowerCase();
}

function getActionElementType(
  action
) {
  const element =
    getActionElement(
      action
    );

  return compactActionValue(
    element.type ||
    element.attributes?.type ||
    action?.inputType ||
    action?.elementType ||
    action?.type
  ).toLowerCase();
}

function getActionElementRole(
  action
) {
  const element =
    getActionElement(
      action
    );

  return compactActionValue(
    element.role ||
    element.attributes?.role ||
    action?.role
  ).toLowerCase();
}

function getActionTagName(
  action
) {
  const element =
    getActionElement(
      action
    );

  return compactActionValue(
    element.tagName ||
    element.tag ||
    action?.tagName ||
    action?.tag
  ).toLowerCase();
}

function getTraceActionValue(
  action
) {
  if (
    !action ||
    typeof action !==
      "object"
  ) {
    return "";
  }

  const element =
    getActionElement(
      action
    );

  const candidates = [
    action.value,
    action.input,
    action.typedText,
    action.textValue,
    action.currentValue,
    action.committedValue,
    action.newValue,
    element.value,
    element.currentValue,
  ];

  for (
    const candidate of
    candidates
  ) {
    if (
      candidate !==
        undefined &&
      candidate !==
        null
    ) {
      return normalizeRecordedInputValue(
        candidate
      );
    }
  }

  return "";
}

function getTraceSelectValue(
  action
) {
  if (
    !action ||
    typeof action !==
      "object"
  ) {
    return "";
  }

  const element =
    getActionElement(
      action
    );

  const candidates = [
    action.selectedValues,
    action.values,
    action.selectedValue,
    action.value,
    action.input,
    element.selectedValues,
    element.values,
    element.selectedValue,
    element.value,
  ];

  for (
    const candidate of
    candidates
  ) {
    if (
      candidate ===
        undefined ||
      candidate ===
        null
    ) {
      continue;
    }

    if (
      Array.isArray(
        candidate
      )
    ) {
      return candidate.map(
        (item) =>
          String(item)
      );
    }

    return String(candidate);
  }

  return "";
}

function getTraceFileValue(
  action
) {
  if (
    !action ||
    typeof action !==
      "object"
  ) {
    return "";
  }

  const element =
    getActionElement(
      action
    );

  const candidates = [
    action.files,
    action.filePaths,
    action.fileNames,
    action.paths,
    action.path,
    action.value,
    element.files,
    element.filePaths,
    element.fileNames,
    element.paths,
    element.path,
    element.value,
  ];

  for (
    const candidate of
    candidates
  ) {
    if (
      candidate ===
        undefined ||
      candidate ===
        null
    ) {
      continue;
    }

    if (
      Array.isArray(
        candidate
      )
    ) {
      const values =
        candidate
          .map(
            (item) => {
              if (
                typeof item ===
                "string"
              ) {
                return item;
              }

              if (
                item &&
                typeof item ===
                  "object"
              ) {
                return String(
                  item.path ||
                  item.filePath ||
                  item.name ||
                  ""
                );
              }

              return "";
            }
          )
          .filter(Boolean);

      if (
        values.length
      ) {
        return values;
      }

      continue;
    }

    if (
      candidate &&
      typeof candidate ===
        "object"
    ) {
      const objectPath =
        candidate.path ||
        candidate.filePath ||
        candidate.name;

      if (
        objectPath
      ) {
        return String(
          objectPath
        );
      }

      continue;
    }

    return String(candidate);
  }

  return "";
}

function isBooleanControlAction(
  action
) {
  if (
    !action ||
    typeof action !==
      "object"
  ) {
    return false;
  }

  const actionKind =
    getActionKind(
      action
    );

  const elementType =
    getActionElementType(
      action
    );

  const elementRole =
    getActionElementRole(
      action
    );

  const inputType =
    compactActionValue(
      action.inputType
    ).toLowerCase();

  return (
    [
      "checkbox",
      "radio",
      "check",
      "uncheck",
      "setchecked",
      "set-checked",
    ].includes(
      actionKind
    ) ||
    [
      "checkbox",
      "radio",
    ].includes(
      elementType
    ) ||
    [
      "checkbox",
      "radio",
    ].includes(
      inputType
    ) ||
    [
      "checkbox",
      "radio",
      "switch",
    ].includes(
      elementRole
    )
  );
}

function isSelectValueAction(
  action
) {
  if (
    !action ||
    typeof action !==
      "object"
  ) {
    return false;
  }

  if (
    isBooleanControlAction(
      action
    )
  ) {
    return false;
  }

  const actionKind =
    getActionKind(
      action
    );

  const tagName =
    getActionTagName(
      action
    );

  if (
    actionKind ===
      "select" ||
    actionKind ===
      "selectoption" ||
    actionKind ===
      "select-option"
  ) {
    return true;
  }

  return (
    tagName === "select" &&
    INPUT_ACTION_KINDS.has(
      actionKind
    )
  );
}

function isFileUploadAction(
  action
) {
  if (
    !action ||
    typeof action !==
      "object"
  ) {
    return false;
  }

  const actionKind =
    getActionKind(
      action
    );

  const tagName =
    getActionTagName(
      action
    );

  const elementType =
    getActionElementType(
      action
    );

  if (
    [
      "file-upload",
      "fileupload",
      "setinputfiles",
      "set-input-files",
    ].includes(
      actionKind
    )
  ) {
    return true;
  }

  return (
    tagName === "input" &&
    elementType === "file" &&
    INPUT_ACTION_KINDS.has(
      actionKind
    )
  );
}

function isInputValueAction(
  action
) {
  if (
    !action ||
    typeof action !==
      "object"
  ) {
    return false;
  }

  const actionKind =
    getActionKind(
      action
    );

  if (
    !INPUT_ACTION_KINDS.has(
      actionKind
    )
  ) {
    return false;
  }

  if (
    isBooleanControlAction(
      action
    ) ||
    isSelectValueAction(
      action
    ) ||
    isFileUploadAction(
      action
    )
  ) {
    return false;
  }

  const tagName =
    getActionTagName(
      action
    );

  const elementType =
    getActionElementType(
      action
    );

  const element =
    getActionElement(
      action
    );

  const contentEditable =
    compactActionValue(
      element.contentEditable ||
      element.attributes
        ?.contenteditable ||
      action.contentEditable
    ).toLowerCase();

  if (
    contentEditable ===
    "true"
  ) {
    return true;
  }

  if (
    tagName ===
    "textarea"
  ) {
    return true;
  }

  if (
    tagName ===
    "select"
  ) {
    return false;
  }

  if (
    tagName &&
    tagName !==
      "input"
  ) {
    /*
     * Recorder versions sometimes omit tagName for valid input actions.
     *
     * A known non-input tag should not be converted into fill(), unless the
     * element is contenteditable.
     */
    return false;
  }

  if (
    tagName ===
      "input" &&
    NON_TEXT_INPUT_TYPES.has(
      elementType
    )
  ) {
    return false;
  }

  return true;
}

function isRecorderNoiseAction(
  action
) {
  return RECORDER_NOISE_ACTIONS.has(
    getActionKind(
      action
    )
  );
}

function isHtmlSnippetValue(
  value
) {
  const text =
    String(
      value ??
      ""
    ).trim();

  if (
    !text ||
    text.length < 20
  ) {
    return false;
  }

  return /<\s*(?:button|div|span|input|form|a|label|select|textarea)\b[\s\S]*>/i.test(
    text
  );
}

function parseTraceActions(
  traceText
) {
  try {
    const parsed =
      JSON.parse(
        traceText
      );

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function parseIndexedTraceActions(
  traceText
) {
  const actions =
    parseTraceActions(
      traceText
    );

  actions.forEach(
    (
      action,
      traceIndex
    ) => {
      if (
        !action ||
        typeof action !==
          "object"
      ) {
        return;
      }

      Object.defineProperty(
        action,
        TRACE_INDEX,
        {
          value:
            traceIndex,

          enumerable:
            false,

          configurable:
            false,

          writable:
            false,
        }
      );
    }
  );

  return actions;
}

function getTraceIndex(
  action
) {
  const value =
    action?.[
      TRACE_INDEX
    ];

  return Number.isInteger(
    value
  )
    ? value
    : -1;
}

function actionFrameIdentity(
  action
) {
  if (
    !action ||
    !Array.isArray(
      action.frameChain
    )
  ) {
    return "";
  }

  return action.frameChain
    .map(
      (frame) =>
        compactActionValue(
          typeof frame ===
            "string"
            ? frame
            : (
                frame?.selector ||
                frame?.name ||
                frame?.title ||
                frame?.url
              )
        )
    )
    .filter(Boolean)
    .join(">");
}

function isGeneratedIdValue(
  value
) {
  const text =
    compactActionValue(
      value
    );

  if (
    !text
  ) {
    return false;
  }

  if (
    /^\d/.test(
      text
    )
  ) {
    return true;
  }

  if (
    /^[a-f0-9_-]{8,}$/i.test(
      text
    ) &&
    /\d/.test(
      text
    )
  ) {
    return true;
  }

  if (
    /\d{3,}/.test(
      text
    )
  ) {
    return true;
  }

  return /^(?:pv_id|ember|react-select|headlessui|radix|mui|:r)/i.test(
    text
  );
}

function getElementMetadataValue(
  element,
  directKey,
  attributeKey =
    directKey
) {
  return (
    element?.[
      directKey
    ] ??
    element?.attributes?.[
      attributeKey
    ] ??
    ""
  );
}

function actionStableControlIdentity(
  action
) {
  const element =
    getActionElement(
      action
    );

  const rawId =
    getElementMetadataValue(
      element,
      "id"
    );

  const stableId =
    rawId &&
    !isGeneratedIdValue(
      rawId
    )
      ? compactActionValue(
          rawId
        )
      : "";

  const attributes = [
    [
      "testId",
      getElementMetadataValue(
        element,
        "testId",
        "data-testid"
      ),
    ],
    [
      "dataTest",
      getElementMetadataValue(
        element,
        "dataTest",
        "data-test"
      ),
    ],
    [
      "dataCy",
      getElementMetadataValue(
        element,
        "dataCy",
        "data-cy"
      ),
    ],
    [
      "dataLabel",
      getElementMetadataValue(
        element,
        "dataLabel",
        "data-label"
      ),
    ],
    [
      "id",
      stableId,
    ],
    [
      "name",
      getElementMetadataValue(
        element,
        "name"
      ),
    ],
    [
      "ariaLabel",
      getElementMetadataValue(
        element,
        "ariaLabel",
        "aria-label"
      ),
    ],
    [
      "placeholder",
      getElementMetadataValue(
        element,
        "placeholder"
      ),
    ],
    [
      "title",
      getElementMetadataValue(
        element,
        "title"
      ),
    ],
  ]
    .map(
      ([
        key,
        value,
      ]) => [
        key,
        compactActionValue(
          value
        ),
      ]
    )
    .filter(
      ([
        ,
        value,
      ]) =>
        Boolean(
          value
        )
    );

  if (
    !attributes.length
  ) {
    return "";
  }

  return [
    getActionTagName(
      action
    ),

    getActionElementType(
      action
    ),

    getActionElementRole(
      action
    ),

    ...attributes.map(
      ([
        key,
        value,
      ]) =>
        `${key}=${value}`
    ),
  ].join("|");
}

function normalizeMutableXPathIdentity(
  selector
) {
  let normalized =
    compactActionValue(
      selector
    );

  if (
    !normalized
  ) {
    return "";
  }

  /*
   * This normalization is used only to determine whether multiple consecutive
   * TRACE events belong to the same physical input control.
   *
   * The XPath written to the generated Playwright script is never modified.
   *
   * Mutable value-state predicates are removed only from this comparison key.
   */
  normalized =
    normalized
      .replace(
        /\[\s*@(?:value|aria-valuenow|aria-valuetext|checked|aria-checked)\s*=\s*(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\]]+)\s*\]/gi,
        ""
      )
      .replace(
        /\s+and\s+@(?:value|aria-valuenow|aria-valuetext|checked|aria-checked)\s*=\s*(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*')/gi,
        ""
      )
      .replace(
        /@(?:value|aria-valuenow|aria-valuetext|checked|aria-checked)\s*=\s*(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*')\s+and\s+/gi,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  return normalized;
}

function controlIdentityKey(
  action
) {
  if (
    !action ||
    typeof action !==
      "object"
  ) {
    return "";
  }

  const frameIdentity =
    actionFrameIdentity(
      action
    );

  const frameKind =
    action.isIframe
      ? "iframe"
      : "page";

  const stableIdentity =
    actionStableControlIdentity(
      action
    );

  if (
    stableIdentity
  ) {
    return [
      frameIdentity,
      frameKind,
      stableIdentity,
    ].join("||");
  }

  return [
    frameIdentity,
    frameKind,

    normalizeMutableXPathIdentity(
      action.selector
    ),

    getActionTagName(
      action
    ),

    getActionElementType(
      action
    ),

    getActionElementRole(
      action
    ),
  ].join("||");
}

function sameControl(
  left,
  right
) {
  if (
    !left ||
    !right
  ) {
    return false;
  }

  const leftXPath =
    normalizeMutableXPathIdentity(
      recordedXPathForAction(
        left
      )
    );

  const rightXPath =
    normalizeMutableXPathIdentity(
      recordedXPathForAction(
        right
      )
    );

  /*
   * A shared label/name is not a unique control identity. Repeated widgets
   * commonly expose identical metadata (for example, both an arrival and a
   * departure calendar button can be aria-label="Choose Date"). When both
   * actions have recorded XPaths, those XPaths are the stronger evidence and
   * must agree before input/click cleanup can treat the actions as one control.
   */
  if (
    leftXPath &&
    rightXPath
  ) {
    return (
      leftXPath ===
      rightXPath
    );
  }

  const leftIdentity =
    controlIdentityKey(
      left
    );

  const rightIdentity =
    controlIdentityKey(
      right
    );

  return (
    Boolean(
      leftIdentity
    ) &&
    leftIdentity ===
      rightIdentity
  );
}

function actionIdentity(
  action
) {
  if (
    !action ||
    typeof action !==
      "object"
  ) {
    return "";
  }

  return [
    getActionKind(
      action
    ),

    normalizeMutableXPathIdentity(
      action.selector
    ),

    compactActionValue(
      action.text
    ),

    normalizeRecordedInputValue(
      getTraceActionValue(
        action
      )
    ),

    controlIdentityKey(
      action
    ),
  ].join("||");
}

function dedupeConsecutiveTraceActions(
  actions
) {
  if (
    !Array.isArray(
      actions
    )
  ) {
    return [];
  }

  const output = [];

  let previousIdentity =
    "";

  for (
    const action of actions
  ) {
    const actionKind =
      getActionKind(
        action
      );

    /*
     * Repeated click actions must not be identity-deduplicated here.
     *
     * Scenario-aware replay filtering is applied later by
     * removeDuplicateTraceClicks(). Keeping that policy separate prevents this
     * general cleanup pass from comparing XPath, text or element metadata.
     */
    if (
      actionKind ===
      "click"
    ) {
      output.push(
        action
      );

      previousIdentity =
        "";

      continue;
    }

    const identity =
      actionIdentity(
        action
      );

    if (
      identity &&
      identity ===
        previousIdentity
    ) {
      continue;
    }

    output.push(
      action
    );

    previousIdentity =
      identity;
  }

  return output;
}

function removeHtmlInputNoise(
  actions
) {
  if (
    !Array.isArray(
      actions
    )
  ) {
    return [];
  }

  const output = [];

  let removedHtmlAction =
    null;

  for (
    const action of actions
  ) {
    if (
      isInputValueAction(
        action
      ) &&
      isHtmlSnippetValue(
        getTraceActionValue(
          action
        )
      )
    ) {
      removedHtmlAction =
        action;

      continue;
    }

    if (
      removedHtmlAction &&
      isInputValueAction(
        action
      ) &&
      sameControl(
        removedHtmlAction,
        action
      ) &&
      getTraceActionValue(
        action
      ) === ""
    ) {
      continue;
    }

    removedHtmlAction =
      null;

    output.push(
      action
    );
  }

  return output;
}

function normalizeTraceActions(
  actions
) {
  const cleanedActions =
    removeHtmlInputNoise(
      dedupeConsecutiveTraceActions(
        actions
      )
    );

  const output = [];

  for (
    const action of
    cleanedActions
  ) {
    if (
      isRecorderNoiseAction(
        action
      )
    ) {
      continue;
    }

    if (
      isInputValueAction(
        action
      )
    ) {
      const previous =
        output.length
          ? output[
              output.length - 1
            ]
          : null;

      if (
        previous &&
        isInputValueAction(
          previous
        ) &&
        sameControl(
          previous,
          action
        )
      ) {
        /*
         * Keep only the latest value in one continuous input run.
         *
         * input("T")
         * input("Te")
         * input("Tes")
         *
         * becomes:
         *
         * fill("Tes")
         *
         * This does not merge separate fills that have another real action
         * between them.
         */
        output[
          output.length - 1
        ] =
          action;

        continue;
      }
    }

    output.push(
      action
    );
  }

  return output;
}

function clickXPathsClearlyIdentifySameTarget(
  left,
  right
) {
  const leftXPath =
    normalizeMutableXPathIdentity(
      recordedXPathForAction(
        left
      )
    );

  const rightXPath =
    normalizeMutableXPathIdentity(
      recordedXPathForAction(
        right
      )
    );

  if (
    !leftXPath ||
    !rightXPath
  ) {
    return false;
  }

  if (
    leftXPath ===
    rightXPath
  ) {
    return true;
  }

  /*
   * The replay can land on an inner child of the original control. An exact
   * XPath and that XPath's descendant still identify one control.
   */
  return (
    leftXPath.startsWith(
      `${rightXPath}/`
    ) ||
    rightXPath.startsWith(
      `${leftXPath}/`
    )
  );
}

function parsePointerGestureIdentity(
  action
) {
  const gestureId =
    compactActionValue(
      action?.gestureId ||
      action?.clickId
    );

  const parts =
    gestureId.split(":");

  if (
    !/^(?:pointer|recovered-pointer)$/i.test(
      parts[0] ||
      ""
    ) ||
    parts.length < 6
  ) {
    return null;
  }

  const timestamp =
    Number(parts[1]);

  const x =
    Number(parts[parts.length - 2]);

  const y =
    Number(parts[parts.length - 1]);

  if (
    !Number.isFinite(timestamp) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return null;
  }

  return {
    timestamp,
    x,
    y,
    pointerType:
      compactActionValue(
        parts[3]
      ).toLowerCase(),
    button:
      Number(parts[4]),
  };
}

function normalizedClickControlText(
  action
) {
  const candidates = [
    action?.text,
    action?.element?.normalizedText,
    action?.element?.accessibleNameCandidates?.[0],
  ];

  for (
    const candidate of candidates
  ) {
    const normalized =
      compactActionValue(
        candidate
      )
        .toLowerCase()
        .replace(
          /\b\d+\b/g,
          " "
        )
        .replace(
          /[^\p{L}\p{N}]+/gu,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function isLikelyUnlabelledRecorderReplayPair(
  original,
  candidate
) {
  const originalGesture =
    parsePointerGestureIdentity(
      original
    );

  const candidateGesture =
    parsePointerGestureIdentity(
      candidate
    );

  if (
    !originalGesture ||
    !candidateGesture ||
    originalGesture.pointerType !==
      candidateGesture.pointerType ||
    originalGesture.button !==
      candidateGesture.button
  ) {
    return false;
  }

  const elapsed =
    candidateGesture.timestamp -
    originalGesture.timestamp;

  const distance =
    Math.hypot(
      candidateGesture.x -
        originalGesture.x,
      candidateGesture.y -
        originalGesture.y
    );

  if (
    elapsed <= 0 ||
    elapsed > 900000 ||
    distance > 40
  ) {
    return false;
  }

  const originalText =
    normalizedClickControlText(
      original
    );

  const candidateText =
    normalizedClickControlText(
      candidate
    );

  if (
    !originalText ||
    !candidateText ||
    !(
      originalText ===
        candidateText ||
      originalText.includes(
        candidateText
      ) ||
      candidateText.includes(
        originalText
      )
    )
  ) {
    return false;
  }

  /*
   * In the missed-marker pattern the user's primary event is committed before
   * Codegen emits anything; the recorder echo then consumes the delayed click
   * line. Requiring that asymmetric evidence keeps ordinary adjacent clicks
   * from being collapsed merely because they happened near one another.
   */
  return Boolean(
    original?.codegenComparison
      ?.consumed !== true &&
    candidate?.codegenComparison
      ?.consumed === true &&
    /\.click\s*\(/.test(
      compactActionValue(
        candidate?.codegenComparison
          ?.line
      )
    )
  );
}

function clicksClearlyIdentifySameTarget(
  left,
  right
) {
  if (
    actionFrameIdentity(
      left
    ) !==
    actionFrameIdentity(
      right
    )
  ) {
    return false;
  }

  const leftGestureId =
    compactActionValue(
      left?.gestureId ||
      left?.clickId
    );

  const rightGestureId =
    compactActionValue(
      right?.gestureId ||
      right?.clickId
    );

  if (
    leftGestureId &&
    leftGestureId ===
      rightGestureId
  ) {
    return true;
  }

  const leftReplayOf =
    compactActionValue(
      left?.recorderReplayOfGestureId
    );

  const rightReplayOf =
    compactActionValue(
      right?.recorderReplayOfGestureId
    );

  if (
    (
      leftReplayOf &&
      leftReplayOf ===
        rightGestureId
    ) ||
    (
      rightReplayOf &&
      rightReplayOf ===
        leftGestureId
    )
  ) {
    return true;
  }

  const leftXPath =
    normalizeMutableXPathIdentity(
      recordedXPathForAction(
        left
      )
    );

  const rightXPath =
    normalizeMutableXPathIdentity(
      recordedXPathForAction(
        right
      )
    );

  if (
    leftXPath &&
    rightXPath
  ) {
    /*
     * Recorded selector disagreement is conclusive for unlabelled duplicate
     * cleanup. Do not let a repeated aria-label/name (such as two separate
     * "Choose Date" buttons) erase a real click and shift the following action
     * under the wrong control.
     *
     * Explicit gesture/replay links were handled above because a physical
     * click can legitimately be observed once on an inner node and once on
     * its owning control. Without that link, both XPaths must identify the
     * same node or an ancestor/descendant target.
     */
    return clickXPathsClearlyIdentifySameTarget(
      left,
      right
    );
  }

  const leftStableIdentity =
    actionStableControlIdentity(
      left
    );

  const rightStableIdentity =
    actionStableControlIdentity(
      right
    );

  if (
    leftStableIdentity &&
    leftStableIdentity ===
      rightStableIdentity
  ) {
    return true;
  }

  if (
    isLikelyUnlabelledRecorderReplayPair(
      left,
      right
    )
  ) {
    return true;
  }

  const leftX =
    Number(
      left?.clickEvent?.clientX
    );

  const leftY =
    Number(
      left?.clickEvent?.clientY
    );

  const rightX =
    Number(
      right?.clickEvent?.clientX
    );

  const rightY =
    Number(
      right?.clickEvent?.clientY
    );

  const leftText =
    compactActionValue(
      left?.text
    ).toLowerCase();

  const rightText =
    compactActionValue(
      right?.text
    ).toLowerCase();

  if (
    Number.isFinite(
      leftX
    ) &&
    Number.isFinite(
      leftY
    ) &&
    Number.isFinite(
      rightX
    ) &&
    Number.isFinite(
      rightY
    ) &&
    Math.hypot(
      leftX - rightX,
      leftY - rightY
    ) <= 2 &&
    leftText &&
    rightText &&
    (
      leftText ===
        rightText ||
      leftText.includes(
        rightText
      ) ||
      rightText.includes(
        leftText
      )
    )
  ) {
    return true;
  }

  return false;
}

function hasExplicitRecorderReplayMarker(
  action
) {
  return Boolean(
    compactActionValue(
      action?.recorderReplayOfGestureId
    )
  );
}

function isExplicitReplayOfClick(
  original,
  candidate
) {
  const replayOfGestureId =
    compactActionValue(
      candidate?.recorderReplayOfGestureId
    );

  const originalGestureId =
    compactActionValue(
      original?.gestureId ||
      original?.clickId
    );

  return Boolean(
    replayOfGestureId &&
    originalGestureId &&
    replayOfGestureId ===
      originalGestureId
  );
}

function recordedClickXPathQuality(
  action
) {
  const xpath =
    compactActionValue(
      recordedXPathForAction(
        action
      )
    );

  if (
    !xpath
  ) {
    return 0;
  }

  if (
    /^\/html(?:\[\s*1\s*\])?\//i.test(
      xpath
    ) ||
    compactActionValue(
      action?.selectorStrategy
    ).toLowerCase() ===
      "structural"
  ) {
    return 1;
  }

  if (
    /^\([\s\S]+\)\[\s*[1-3]\s*\]$/.test(
      xpath
    )
  ) {
    return 2;
  }

  return 3;
}

function isUnlabelledAdjacentDuplicateClick(
  original,
  candidate
) {
  /*
   * This is intentionally position + identity based, not time based. The
   * recorder can delay a replay for several seconds while selector work or a
   * navigation settles. An adjacent click is collapsed only when both records
   * still identify the same target/control in the same frame.
   */
  if (
    getActionKind(
      original
    ) !==
      "click" ||
    getActionKind(
      candidate
    ) !==
      "click"
  ) {
    return false;
  }

  return clicksClearlyIdentifySameTarget(
    original,
    candidate
  );
}

function isSamePhysicalClickGesture(
  original,
  candidate
) {
  const originalGestureId =
    compactActionValue(
      original?.gestureId ||
      original?.clickId
    );

  const candidateGestureId =
    compactActionValue(
      candidate?.gestureId ||
      candidate?.clickId
    );

  return Boolean(
    originalGestureId &&
    originalGestureId ===
      candidateGestureId
  );
}

function actionBreaksClickDuplicateCluster(
  action
) {
  const actionKind =
    getActionKind(
      action
    );

  if (
    actionKind ===
      "navigation"
  ) {
    return true;
  }

  if (
    isBooleanControlAction(
      action
    )
  ) {
    return false;
  }

  return (
    isSelectValueAction(
      action
    ) ||
    isFileUploadAction(
      action
    ) ||
    isInputValueAction(
      action
    ) ||
    actionKind ===
      "press" ||
    actionKind ===
      "hover"
  );
}

/*
 * Scenario-aware click normalization:
 *
 * 1. A listener-labelled recorder replay is merged into its original click.
 *    When it carries a stronger semantic XPath than an absolute structural
 *    original, the replay becomes the cluster's canonical record.
 * 2. Consecutive records for the same target become one click, including an
 *    unlabeled pair or a three-record duplicate cluster.
 * 3. A standalone click is always kept.
 * 4. Two different controls are both kept.
 * 5. Only a non-click action that becomes a real Playwright interaction closes
 *    the cluster. Recorder noise and ignored state events do not manufacture a
 *    second click in the generated test.
 */
function removeDuplicateTraceClicks(
  actions
) {
  if (
    !Array.isArray(
      actions
    )
  ) {
    return [];
  }

  const output = [];

  let previousClickCandidate =
    null;

  let previousClickOutputIndex =
    -1;

  let meaningfulActionSinceCandidate =
    false;

  for (
    const action of actions
  ) {
    const isClick =
      getActionKind(
        action
      ) ===
      "click";

    if (
      !isClick
    ) {
      output.push(
        action
      );

      if (
        previousClickCandidate &&
        actionBreaksClickDuplicateCluster(
          action
        )
      ) {
        meaningfulActionSinceCandidate =
          true;
      }

      continue;
    }

    const explicitReplay =
      previousClickCandidate &&
      isExplicitReplayOfClick(
        previousClickCandidate,
        action
      );

    const unlabelledAdjacentDuplicate =
      previousClickCandidate &&
      !meaningfulActionSinceCandidate &&
      isUnlabelledAdjacentDuplicateClick(
        previousClickCandidate,
        action
      );

    const samePhysicalGesture =
      previousClickCandidate &&
      isSamePhysicalClickGesture(
        previousClickCandidate,
        action
      );

    if (
      explicitReplay ||
      samePhysicalGesture ||
      unlabelledAdjacentDuplicate
    ) {
      /* Keep the strongest proven locator as this cluster's one click. */
      if (
        previousClickCandidate &&
        !meaningfulActionSinceCandidate &&
        previousClickOutputIndex >= 0 &&
        recordedClickXPathQuality(
          action
        ) >
          recordedClickXPathQuality(
            previousClickCandidate
          )
      ) {
        output[
          previousClickOutputIndex
        ] = action;

        previousClickCandidate =
          action;
      }

      continue;
    }

    previousClickOutputIndex =
      output.length;

    output.push(
      action
    );

    previousClickCandidate =
      action;

    meaningfulActionSinceCandidate =
      false;
  }

  return output;
}

/*
 * A text input does not need a separate Playwright click immediately before
 * fill(). fill() already focuses the resolved control. Collapse only the
 * exact adjacent click -> input case for the same recorded control; any
 * intervening meaningful action or different control preserves the click.
 */
function removeRedundantInputFocusClicks(
  actions
) {
  if (
    !Array.isArray(
      actions
    )
  ) {
    return [];
  }

  const output = [];

  for (
    let index = 0;
    index < actions.length;
    index += 1
  ) {
    const action =
      actions[index];

    const nextAction =
      actions[index + 1];

    if (
      getActionKind(
        action
      ) === "click" &&
      isInputValueAction(
        nextAction
      ) &&
      sameControl(
        action,
        nextAction
      )
    ) {
      continue;
    }

    output.push(
      action
    );
  }

  return output;
}

function recordedXPathForAction(
  action
) {
  const selector =
    typeof action?.selector ===
      "string"
      ? action.selector.trim()
      : "";

  return selector.startsWith(
    "xpath="
  )
    ? selector
    : "";
}

function assertTraceXPath(
  action,
  actionLabel
) {
  const selector =
    recordedXPathForAction(
      action
    );

  if (
    !selector
  ) {
    const traceStep =
      getTraceIndex(
        action
      ) + 1;

    throw new Error(
      `TRACE ${actionLabel} at step ` +
      `${traceStep} does not contain a selector ` +
      `beginning with xpath=.`
    );
  }

  return selector;
}

function inspectCodegenPositionFallback(
  locatorExpression
) {
  const expression =
    String(
      locatorExpression ||
      ""
    );

  const firstCalls =
    expression.match(
      /\.first\s*\(\s*\)/g
    ) ||
    [];

  const lastCalls =
    expression.match(
      /\.last\s*\(\s*\)/g
    ) ||
    [];

  const nthCalls =
    expression.match(
      /\.nth\s*\([^)]*\)/g
    ) ||
    [];

  const totalCalls =
    firstCalls.length +
    lastCalls.length +
    nthCalls.length;

  if (
    totalCalls ===
    0
  ) {
    return {
      valid:
        true,

      positional:
        false,

      ordinal:
        null,
    };
  }

  if (
    totalCalls !==
      1 ||
    lastCalls.length
  ) {
    return {
      valid:
        false,

      positional:
        true,

      ordinal:
        null,
    };
  }

  if (
    firstCalls.length ===
    1
  ) {
    return {
      valid:
        true,

      positional:
        true,

      ordinal:
        1,
    };
  }

  const nthArgument =
    nthCalls[0]
      .replace(
        /^\.nth\s*\(/,
        ""
      )
      .replace(
        /\)\s*$/,
        ""
      )
      .trim();

  if (
    !/^\d+$/.test(
      nthArgument
    )
  ) {
    return {
      valid:
        false,

      positional:
        true,

      ordinal:
        null,
    };
  }

  const ordinal =
    Number(
      nthArgument
    ) +
    1;

  return {
    valid:
      ordinal >=
        1 &&
      ordinal <=
        3,

    positional:
      true,

    ordinal,
  };
}

function validatedCodegenClickLocatorExpression(
  action
) {
  const comparison =
    action?.codegenComparison;

  const passesUsabilityGate =
    comparison?.validationMode ===
      "passive-same-control"
      ? comparison.codegenEnabled ===
        true
      : comparison?.codegenActionable ===
        true;

  if (
    !comparison ||
    typeof comparison !==
      "object" ||
    comparison.compared !==
      true ||
    comparison.agrees !==
      true ||
    comparison.codegenUsable !==
      true ||
    comparison.codegenVisible !==
      true ||
    !passesUsabilityGate ||
    ![
      "same-element",
      "same-interactive-control",
    ].includes(
      comparison.relationship
    ) ||
    comparison.algorithmMatchCount !==
      1 ||
    comparison.codegenMatchCount !==
      1 ||
    comparison.selectedSource !==
      "codegen" ||
    comparison.algorithmXPathRetained !==
      false
  ) {
    return "";
  }

  const selectedExpression =
    typeof comparison
      .selectedLocatorExpression ===
        "string"
      ? comparison
          .selectedLocatorExpression
          .trim()
      : "";

  const comparedExpression =
    typeof comparison
      .locatorExpression ===
        "string"
      ? comparison
          .locatorExpression
          .trim()
      : "";

  if (
    !selectedExpression ||
    selectedExpression !==
      comparedExpression ||
    selectedExpression.length >
      20000 ||
    /[\r\n]/.test(
      selectedExpression
    ) ||
    !selectedExpression.startsWith(
      "page."
    ) ||
    /\.(?:click|fill)\s*\(/.test(
      selectedExpression
    )
  ) {
    return "";
  }

  if (
    !inspectCodegenPositionFallback(
      selectedExpression
    ).valid
  ) {
    return "";
  }

  return selectedExpression;
}

function validatedLiveSemanticClickLocatorExpression(
  action
) {
  const comparison =
    action?.liveSemanticComparison;

  const passesUsabilityGate =
    comparison?.validationMode ===
      "passive-same-control"
      ? comparison.semanticEnabled ===
        true
      : comparison?.semanticActionable ===
        true;

  if (
    !comparison ||
    typeof comparison !==
      "object" ||
    comparison.compared !==
      true ||
    comparison.agrees !==
      true ||
    comparison.semanticUsable !==
      true ||
    comparison.semanticVisible !==
      true ||
    !passesUsabilityGate ||
    ![
      "same-element",
      "same-interactive-control",
    ].includes(
      comparison.relationship
    ) ||
    comparison.algorithmMatchCount !==
      1 ||
    comparison.semanticMatchCount !==
      1 ||
    comparison.selectedSource !==
      "semantic" ||
    comparison.algorithmXPathRetained !==
      false
  ) {
    return "";
  }

  const selectedExpression =
    typeof comparison
      .selectedLocatorExpression ===
        "string"
      ? comparison
          .selectedLocatorExpression
          .trim()
      : "";

  if (
    !selectedExpression ||
    selectedExpression.length >
      20000 ||
    /[\r\n]/.test(
      selectedExpression
    ) ||
    !selectedExpression.startsWith(
      "page."
    ) ||
    /\.(?:click|fill)\s*\(/.test(
      selectedExpression
    ) ||
    !/\.(?:getByRole|getByLabel|getByText|getByPlaceholder|getByTestId|getByAltText|getByTitle)\s*\(/.test(
      selectedExpression
    )
  ) {
    return "";
  }

  return selectedExpression;
}

function chooseClickLocator(
  action,
  algorithmSelector
) {
  const codegenExpression =
    validatedCodegenClickLocatorExpression(
      action
    );

  const codegenPosition =
    inspectCodegenPositionFallback(
      codegenExpression
    );

  if (
    codegenExpression &&
    !codegenPosition.positional
  ) {
    return {
      locatorSource:
        "codegen",

      locatorExpression:
        codegenExpression,
    };
  }

  const semanticExpression =
    validatedLiveSemanticClickLocatorExpression(
      action
    );

  if (
    semanticExpression
  ) {
    return {
      locatorSource:
        "live-semantic",

      locatorExpression:
        semanticExpression,
    };
  }

  if (
    codegenExpression &&
    codegenPosition.valid &&
    codegenPosition.positional
  ) {
    return {
      locatorSource:
        "codegen-position-fallback",

      locatorExpression:
        codegenExpression,
    };
  }

  return {
    locatorSource:
      "xpath",

    locatorExpression:
      `page.locator(${JSON.stringify(
        algorithmSelector
      )})`,
  };
}

function titleCaseToken(
  value
) {
  const text =
    String(
      value ||
      ""
    )
      .replace(
        /[^a-zA-Z0-9]+/g,
        " "
      )
      .trim();

  if (
    !text
  ) {
    return "";
  }

  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (token) =>
        token
          .charAt(0)
          .toUpperCase() +
        token.slice(1)
    )
    .join("");
}

function toLowerCamelKey(
  value
) {
  const title =
    titleCaseToken(
      value
    );

  if (
    !title
  ) {
    return "";
  }

  let key =
    title
      .charAt(0)
      .toLowerCase() +
    title.slice(1);

  key =
    key.replace(
      /^[^A-Za-z_$]+/,
      ""
    );

  key =
    key.replace(
      /[^A-Za-z0-9_$]/g,
      ""
    );

  return key;
}

function isMeaningfulTestDataKey(
  key
) {
  const text =
    String(
      key ||
      ""
    ).trim();

  if (
    !/^[A-Za-z_$][\w$]*$/.test(
      text
    )
  ) {
    return false;
  }

  if (
    isGeneratedIdValue(
      text
    )
  ) {
    return false;
  }

  const lower =
    text.toLowerCase();

  return ![
    "input",
    "textbox",
    "field",
    "value",
    "text",
    "button",
    "submit",
    "unknown",
  ].includes(
    lower
  );
}

function isUsernameHintText(
  value
) {
  const text =
    String(
      value ||
      ""
    ).toLowerCase();

  return (
    text.includes(
      "user-name"
    ) ||
    text.includes(
      "username"
    ) ||
    text.includes(
      "user name"
    ) ||
    text.includes(
      "sign in name"
    ) ||
    text.includes(
      "signinname"
    )
  );
}

function getObjectSensitivityHint(
  object
) {
  if (
    !object ||
    typeof object !==
      "object" ||
    Array.isArray(
      object
    )
  ) {
    return "";
  }

  const element =
    getActionElement(
      object
    );

  const hints = [
    object.inputType,
    object.type,
    object.name,
    object.id,
    object.placeholder,
    object.label,
    object.title,
    object.text,

    getElementMetadataValue(
      element,
      "name"
    ),

    getElementMetadataValue(
      element,
      "id"
    ),

    getElementMetadataValue(
      element,
      "testId",
      "data-testid"
    ),

    getElementMetadataValue(
      element,
      "dataTest",
      "data-test"
    ),

    getElementMetadataValue(
      element,
      "dataCy",
      "data-cy"
    ),

    getElementMetadataValue(
      element,
      "dataLabel",
      "data-label"
    ),

    getElementMetadataValue(
      element,
      "ariaLabel",
      "aria-label"
    ),

    getElementMetadataValue(
      element,
      "placeholder"
    ),

    getElementMetadataValue(
      element,
      "title"
    ),

    getElementMetadataValue(
      element,
      "type"
    ),

    getElementMetadataValue(
      element,
      "role"
    ),
  ]
    .filter(
      (value) =>
        typeof value ===
        "string"
    )
    .join(" ")
    .toLowerCase();

  if (
    !hints
  ) {
    return "";
  }

  if (
    isUsernameHintText(
      hints
    )
  ) {
    return "username";
  }

  if (
    hints.includes(
      "website"
    ) ||
    hints.includes(
      "web site"
    )
  ) {
    return "website";
  }

  if (
    hints.includes(
      "email"
    )
  ) {
    return "email";
  }

  if (
    hints.includes(
      "password"
    ) ||
    /\bpass\b/.test(
      hints
    )
  ) {
    return "password";
  }

  if (
    hints.includes(
      "phone"
    ) ||
    hints.includes(
      "mobile"
    ) ||
    /\btel\b/.test(
      hints
    )
  ) {
    return "phone";
  }

  if (
    hints.includes(
      "card"
    ) ||
    hints.includes(
      "credit"
    ) ||
    hints.includes(
      "cc-number"
    )
  ) {
    return "cardNumber";
  }

  if (
    hints.includes(
      "postal"
    ) ||
    hints.includes(
      "zip"
    )
  ) {
    return "postalCode";
  }

  if (
    hints.includes(
      "otp"
    )
  ) {
    return "otp";
  }

  return "";
}

function getTraceFieldSemanticSource(
  action
) {
  const element =
    getActionElement(
      action
    );

  const rawId =
    getElementMetadataValue(
      element,
      "id"
    );

  const stableId =
    rawId &&
    !isGeneratedIdValue(
      rawId
    )
      ? rawId
      : "";

  const candidates = [
    getElementMetadataValue(
      element,
      "placeholder"
    ),

    getElementMetadataValue(
      element,
      "ariaLabel",
      "aria-label"
    ),

    getElementMetadataValue(
      element,
      "dataLabel",
      "data-label"
    ),

    getElementMetadataValue(
      element,
      "name"
    ),

    getElementMetadataValue(
      element,
      "testId",
      "data-testid"
    ),

    getElementMetadataValue(
      element,
      "dataTest",
      "data-test"
    ),

    getElementMetadataValue(
      element,
      "dataCy",
      "data-cy"
    ),

    stableId,

    getElementMetadataValue(
      element,
      "title"
    ),

    action.placeholder,
    action.ariaLabel,
    action.dataLabel,
    action.name,
    action.label,
    action.title,
  ];

  for (
    const candidate of
    candidates
  ) {
    const text =
      compactActionValue(
        candidate
      );

    if (
      text
    ) {
      return text;
    }
  }

  const role =
    getActionElementRole(
      action
    );

  if (
    role ===
    "searchbox"
  ) {
    return "search";
  }

  return "";
}

function deriveTraceDataKeyBase(
  action,
  ordinal
) {
  const sensitivityHint =
    getObjectSensitivityHint(
      action
    );

  const semanticSource =
    getTraceFieldSemanticSource(
      action
    );

  let semanticKey =
    toLowerCamelKey(
      semanticSource
    );

  /*
   * testData.url is reserved for page.goto().
   */
  if (
    semanticKey ===
    "url"
  ) {
    semanticKey =
      "website";
  }

  if (
    semanticKey &&
    isMeaningfulTestDataKey(
      semanticKey
    )
  ) {
    return semanticKey;
  }

  if (
    sensitivityHint &&
    isMeaningfulTestDataKey(
      sensitivityHint
    )
  ) {
    return sensitivityHint;
  }

  const roleKey =
    toLowerCamelKey(
      getActionElementRole(
        action
      )
    );

  if (
    roleKey &&
    isMeaningfulTestDataKey(
      roleKey
    )
  ) {
    return roleKey;
  }

  return (
    `inputValue` +
    `${ordinal + 1}`
  );
}

function allocateUniqueDataKey(
  usedKeys,
  baseKey
) {
  let candidate =
    baseKey;

  let index = 2;

  while (
    usedKeys.has(
      candidate
    )
  ) {
    candidate =
      `${baseKey}${index}`;

    index += 1;
  }

  usedKeys.add(
    candidate
  );

  return candidate;
}

function buildTraceFillStepsFromActions(
  normalizedActions
) {
  const fillActions =
    normalizedActions.filter(
      (action) =>
        isInputValueAction(
          action
        )
    );

  const steps = [];

  const usedKeys =
    new Set([
      "url",
    ]);

  for (
    let ordinal = 0;
    ordinal <
      fillActions.length;
    ordinal += 1
  ) {
    const action =
      fillActions[
        ordinal
      ];

    /*
     * The value comes directly from the corresponding TRACE input action.
     */
    const value =
      getTraceActionValue(
        action
      );

    /*
     * The fill locator comes directly from the corresponding TRACE input
     * action. It does not come from the preceding click.
     */
    const selector =
      assertTraceXPath(
        action,
        "input"
      );

    if (
      fillXPathTextDependsOnEnteredValue(
        selector,
        value
      ) &&
      !hasIndependentFillTextProvenance(
        action
      )
    ) {
      throw new Error(
        `TRACE input at step ${getTraceIndex(action) + 1} ` +
        "contains a normalize-space text predicate overlapping its fill " +
        "value without proof that the DOM text existed independently. " +
        "Re-record this input with listeners.js v41 or newer."
      );
    }

    const baseKey =
      deriveTraceDataKeyBase(
        action,
        ordinal
      );

    /*
     * Each normalized input interaction receives its own data key.
     *
     * This prevents this problem:
     *
     * fill(search, "first value")
     * click(...)
     * fill(search, "second value")
     *
     * If both fills reused testData.search, the first fill would incorrectly
     * receive the final value.
     */
    const dataKey =
      allocateUniqueDataKey(
        usedKeys,
        baseKey
      );

    steps.push({
      action,

      traceIndex:
        getTraceIndex(
          action
        ),

      selector,

      value,

      dataKey,

      controlIdentity:
        controlIdentityKey(
          action
        ),
    });
  }

  return steps;
}

function isUsefulNavigationUrl(
  rawUrl
) {
  if (
    !rawUrl ||
    typeof rawUrl !==
      "string"
  ) {
    return false;
  }

  if (
    rawUrl ===
      "about:blank" ||
    rawUrl ===
      "about:srcdoc"
  ) {
    return false;
  }

  try {
    const url =
      new URL(
        rawUrl
      );

    if (
      !/^https?:$/.test(
        url.protocol
      )
    ) {
      return false;
    }

    const blockedHosts = [
      "googleads",
      "doubleclick",
      "googlesyndication",
      "criteo",
      "adsrvr",
      "casalemedia",
      "adtrafficquality",
    ];

    return !blockedHosts.some(
      (token) =>
        url.hostname.includes(
          token
        )
    );
  } catch {
    return false;
  }
}

function normalizeNavigationUrl(
  rawUrl
) {
  try {
    const url =
      new URL(
        rawUrl
      );

    const dropParams = [
      "aid",
      "label",
      "sid",
      "srpvid",
      "srepoch",
      "chal_t",
      "force_referer",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "msclkid",
    ];

    for (
      const key of
      dropParams
    ) {
      url.searchParams.delete(
        key
      );
    }

    const base =
      `${url.origin}` +
      `${url.pathname}`;

    const query =
      url.searchParams
        .toString();

    return query
      ? `${base}?${query}`
      : base;
  } catch {
    return rawUrl;
  }
}

function buildTracePlan(
  traceText
) {
  const indexedActions =
    parseIndexedTraceActions(
      traceText
    );

  if (
    !indexedActions.length
  ) {
    throw new Error(
      "TRACE contains no actions or is not a valid JSON array."
    );
  }

  const normalizedActions =
    removeRedundantInputFocusClicks(
      removeDuplicateTraceClicks(
        normalizeTraceActions(
          indexedActions
        )
      )
    );

  const fillSteps =
    buildTraceFillStepsFromActions(
      normalizedActions
    );

  const fillByAction =
    new Map(
      fillSteps.map(
        (step) => [
          step.action,
          step,
        ]
      )
    );

  const interactions = [];

  let firstNavigationAdded =
    false;

  for (
    const action of
    normalizedActions
  ) {
    if (
      !action ||
      typeof action !==
        "object"
    ) {
      continue;
    }

    const actionKind =
      getActionKind(
        action
      );

    if (
      actionKind ===
      "navigation"
    ) {
      if (
        firstNavigationAdded ||
        action.isIframe ||
        action.frameChain?.length
      ) {
        continue;
      }

      if (
        isUsefulNavigationUrl(
          action.url
        )
      ) {
        interactions.push({
          kind:
            "navigation",

          action,

          traceIndex:
            getTraceIndex(
              action
            ),

          url:
            normalizeNavigationUrl(
              action.url
            ),
        });

        firstNavigationAdded =
          true;
      }

      continue;
    }

    if (
      actionKind ===
      "click"
    ) {
      const algorithmSelector =
        assertTraceXPath(
          action,
          "click"
        );

      const chosenLocator =
        chooseClickLocator(
          action,
          algorithmSelector
        );

      interactions.push({
        kind:
          "click",

        action,

        traceIndex:
          getTraceIndex(
            action
          ),

        selector:
          algorithmSelector,

        locatorSource:
          chosenLocator
            .locatorSource,

        locatorExpression:
          chosenLocator
            .locatorExpression,
      });

      continue;
    }

    if (
      isBooleanControlAction(
        action
      )
    ) {
      /*
       * Checkbox, radio and switch state events are ignored because the
       * physical interaction has already been represented by the TRACE click.
       *
       * This prevents generation of duplicate click + check() operations.
       */
      continue;
    }

    if (
      isSelectValueAction(
        action
      )
    ) {
      interactions.push({
        kind:
          "select",

        action,

        traceIndex:
          getTraceIndex(
            action
          ),

        selector:
          assertTraceXPath(
            action,
            "select"
          ),

        value:
          getTraceSelectValue(
            action
          ),
      });

      continue;
    }

    if (
      isFileUploadAction(
        action
      )
    ) {
      interactions.push({
        kind:
          "file-upload",

        action,

        traceIndex:
          getTraceIndex(
            action
          ),

        selector:
          assertTraceXPath(
            action,
            "file upload"
          ),

        value:
          getTraceFileValue(
            action
          ),
      });

      continue;
    }

    if (
      isInputValueAction(
        action
      )
    ) {
      const fillStep =
        fillByAction.get(
          action
        );

      if (
        fillStep
      ) {
        interactions.push({
          kind:
            "fill",

          ...fillStep,
        });
      }

      continue;
    }

    if (
      actionKind ===
      "press"
    ) {
      const key =
        normalizeRecordedInputValue(
          action.key ??
          action.value ??
          action.text
        );

      if (
        key
      ) {
        interactions.push({
          kind:
            "press",

          action,

          traceIndex:
            getTraceIndex(
              action
            ),

          selector:
            assertTraceXPath(
              action,
              "press"
            ),

          key,
        });
      }

      continue;
    }

    if (
      actionKind ===
      "hover"
    ) {
      interactions.push({
        kind:
          "hover",

        action,

        traceIndex:
          getTraceIndex(
            action
          ),

        selector:
          assertTraceXPath(
            action,
            "hover"
          ),
      });
    }
  }

  const clickSteps =
    interactions.filter(
      (interaction) =>
        interaction.kind ===
        "click"
    );

  return {
    rawActions:
      indexedActions,

    normalizedActions,

    interactions,

    clickSteps,

    fillSteps,
  };
}

function collectRecordedClickXPaths(
  traceText
) {
  return buildTracePlan(
    traceText
  )
    .clickSteps
    .map(
      (step) =>
        step.selector
    );
}

function collectRecordedFillSteps(
  traceText
) {
  return buildTracePlan(
    traceText
  ).fillSteps;
}

function buildTestDataModel(
  traceText
) {
  const plan =
    buildTracePlan(
      traceText
    );

  const payload = {};

  const navigation =
    plan.interactions.find(
      (interaction) =>
        interaction.kind ===
        "navigation"
    );

  if (
    navigation?.url
  ) {
    payload.url =
      navigation.url;
  }

  for (
    const step of
    plan.fillSteps
  ) {
    /*
     * TRACE input values are authoritative, including an empty string.
     */
    payload[
      step.dataKey
    ] =
      step.value;
  }

  return {
    payload,

    tracePlan:
      plan,
  };
}

function removeCheckAndToBeCheckedStatements(
  scriptText
) {
  const lines =
    String(
      scriptText ||
      ""
    ).split(/\r?\n/);

  const output = [];

  let index = 0;

  while (
    index <
    lines.length
  ) {
    const currentLine =
      lines[index];

    const trimmed =
      currentLine.trim();

    const canStartStatement =
      /^(?:await\b|expect\s*\(|(?:page|frame)\.|[A-Za-z_$][\w$]*\.)/.test(
        trimmed
      );

    if (
      !canStartStatement
    ) {
      output.push(
        currentLine
      );

      index += 1;

      continue;
    }

    const statementLines = [
      currentLine,
    ];

    let statementEnd =
      index;

    while (
      statementEnd + 1 <
        lines.length &&
      !/;\s*$/.test(
        statementLines[
          statementLines.length - 1
        ].trim()
      )
    ) {
      statementEnd += 1;

      statementLines.push(
        lines[
          statementEnd
        ]
      );

      if (
        statementLines.length >
        100
      ) {
        break;
      }
    }

    const statementText =
      statementLines.join(
        "\n"
      );

    const containsCheck =
      /\.\s*check\s*\(/.test(
        statementText
      );

    const containsCheckedAssertion =
      /\.\s*toBeChecked\s*\(/.test(
        statementText
      );

    if (
      containsCheck ||
      containsCheckedAssertion
    ) {
      index =
        statementEnd + 1;

      continue;
    }

    output.push(
      ...statementLines
    );

    index =
      statementEnd + 1;
  }

  return output
    .join("\n")
    .replace(
      /\n[ \t]*\n[ \t]*\n+/g,
      "\n\n"
    );
}

function assertNoCheckOrToBeChecked(
  scriptText
) {
  const text =
    String(
      scriptText ||
      ""
    );

  if (
    /\.\s*check\s*\(/.test(
      text
    )
  ) {
    throw new Error(
      "Generated script still contains a .check() call."
    );
  }

  if (
    /\.\s*toBeChecked\s*\(/.test(
      text
    )
  ) {
    throw new Error(
      "Generated script still contains a toBeChecked() assertion."
    );
  }
}

function sanitizeBaseName(
  value
) {
  return (
    String(
      value ||
      ""
    )
      .trim()
      .replace(
        /\.spec\.js$/i,
        ""
      )
      .replace(
        /\.js$/i,
        ""
      )
      .replace(
        /\s+/g,
        "-"
      )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^-|-$/g,
        ""
      ) ||
    ""
  );
}

function buildOutputPath(
  outputValue,
  fallbackName
) {
  const resolvedOutput =
    resolveFromRoot(
      outputValue
    );

  const treatAsDirectory =
    outputValue.endsWith(
      "/"
    ) ||
    outputValue.endsWith(
      "\\"
    ) ||
    (
      fs.existsSync(
        resolvedOutput
      ) &&
      fs
        .statSync(
          resolvedOutput
        )
        .isDirectory()
    );

  if (
    treatAsDirectory
  ) {
    const safeName =
      sanitizeBaseName(
        fallbackName
      ) ||
      `generated-${Date.now()}`;

    return path.join(
      resolvedOutput,
      `${safeName}.spec.js`
    );
  }

  if (
    path.extname(
      resolvedOutput
    )
  ) {
    return resolvedOutput;
  }

  const safeName =
    sanitizeBaseName(
      path.basename(
        resolvedOutput
      )
    ) ||
    sanitizeBaseName(
      fallbackName
    ) ||
    `generated-${Date.now()}`;

  return path.join(
    path.dirname(
      resolvedOutput
    ),
    `${safeName}.spec.js`
  );
}

function listFilesByPrefix(
  directoryPath,
  prefix,
  suffix
) {
  if (
    !fs.existsSync(
      directoryPath
    ) ||
    !fs
      .statSync(
        directoryPath
      )
      .isDirectory()
  ) {
    return [];
  }

  return fs
    .readdirSync(
      directoryPath
    )
    .filter(
      (name) =>
        name.startsWith(
          prefix
        ) &&
        name.endsWith(
          suffix
        )
    )
    .map(
      (name) => {
        const filePath =
          path.join(
            directoryPath,
            name
          );

        return {
          name,

          filePath,

          modifiedAt:
            fs.statSync(
              filePath
            ).mtimeMs,
        };
      }
    )
    .sort(
      (
        left,
        right
      ) =>
        right.modifiedAt -
        left.modifiedAt ||
        right.name.localeCompare(
          left.name
        )
    )
    .map(
      (item) =>
        item.filePath
    );
}

function getLatestTraceFromDirectory(
  directoryPath
) {
  const traces =
    listFilesByPrefix(
      directoryPath,
      "actions-",
      ".json"
    );

  return traces[0] ||
    "";
}

function deriveTestName(
  tracePath
) {
  return (
    path
      .basename(
        tracePath,
        path.extname(
          tracePath
        )
      )
      .replace(
        /^actions-/,
        ""
      )
      .replace(
        /-/g,
        " "
      )
      .trim() ||
    "generated flow"
  );
}

function getTestDataPath(
  scriptPath
) {
  const scriptDirectory =
    path.dirname(
      scriptPath
    );

  const suiteName =
    path
      .basename(
        scriptDirectory
      )
      .toLowerCase();

  if (
    suiteName ===
      "sanity" ||
    suiteName ===
      "regression"
  ) {
    return path.resolve(
      scriptDirectory,
      "..",
      "test-data.json"
    );
  }

  return path.resolve(
    scriptDirectory,
    "test-data.json"
  );
}

function getTestDataImportPath(
  scriptPath
) {
  const scriptDirectory =
    path.dirname(
      scriptPath
    );

  const suiteName =
    path
      .basename(
        scriptDirectory
      )
      .toLowerCase();

  return (
    suiteName ===
      "sanity" ||
    suiteName ===
      "regression"
  )
    ? "../test-data.json"
    : "./test-data.json";
}

function normalizeImportForTestData(
  scriptText,
  scriptPath
) {
  const importLine =
    `import testData from ` +
    `'${getTestDataImportPath(
      scriptPath
    )}';`;

  const withoutExistingImport =
    String(
      scriptText ||
      ""
    )
      .replace(
        /^\s*import\s+testData\s+from\s+['"][^'"]*(?:test-data|testData)\.json['"];?\s*$/gmi,
        ""
      )
      .trimStart();

  return (
    `${importLine}\n` +
    `${withoutExistingImport}`
  );
}

function readJsonObject(
  filePath
) {
  if (
    !fs.existsSync(
      filePath
    )
  ) {
    return {};
  }

  try {
    const parsed =
      JSON.parse(
        fs.readFileSync(
          filePath,
          "utf8"
        )
      );

    return (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(
        parsed
      )
    )
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function getUsedTestDataKeys(
  scriptText
) {
  const keys =
    new Set();

  for (
    const match of
    String(
      scriptText ||
      ""
    ).matchAll(
      /testData\.([A-Za-z_$][\w$]*)/g
    )
  ) {
    keys.add(
      match[1]
    );
  }

  return [
    ...keys,
  ];
}

function getMissingTestDataKeys(
  scriptText,
  payload
) {
  return getUsedTestDataKeys(
    scriptText
  ).filter(
    (key) =>
      !Object.prototype
        .hasOwnProperty.call(
          payload,
          key
        )
  );
}

function writeTestDataFile(
  scriptPath,
  scriptText,
  testDataModel
) {
  const testDataPath =
    getTestDataPath(
      scriptPath
    );

  const mergedPayload =
    readJsonObject(
      testDataPath
    );

  /*
   * TRACE is authoritative.
   *
   * Existing matching keys are updated with values from the current TRACE.
   * Empty strings are retained because clearing an input is a valid action.
   */
  for (
    const [
      key,
      value,
    ] of Object.entries(
      testDataModel.payload
    )
  ) {
    mergedPayload[
      key
    ] =
      value;
  }

  const updatedScript =
    normalizeImportForTestData(
      scriptText,
      scriptPath
    );

  const missingKeys =
    getMissingTestDataKeys(
      updatedScript,
      mergedPayload
    );

  if (
    missingKeys.length
  ) {
    throw new Error(
      `Generated script references missing ` +
      `testData keys in ${testDataPath}: ` +
      `${missingKeys.join(", ")}.`
    );
  }

  fs.mkdirSync(
    path.dirname(
      testDataPath
    ),
    {
      recursive:
        true,
    }
  );

  fs.writeFileSync(
    testDataPath,
    `${JSON.stringify(
      mergedPayload,
      null,
      2
    )}\n`,
    "utf8"
  );

  return {
    testDataPath,

    scriptText:
      updatedScript,
  };
}

function quoteJavaScriptValue(
  value
) {
  const serialized =
    JSON.stringify(
      value
    );

  return serialized ===
    undefined
    ? "undefined"
    : serialized;
}

function buildTraceDrivenScript({
  traceText,
  testName,
  outputPath,
  testDataModel,
}) {
  const plan =
    testDataModel?.tracePlan ||
    buildTracePlan(
      traceText
    );

  const lines = [
    "import { test, expect } from '../utils/smart-test.js';",

    `import testData from ` +
    `'${getTestDataImportPath(
      outputPath
    )}';`,

    "",

    `test(${JSON.stringify(
      testName
    )}, async ({ page }) => {`,
  ];

  let clickTargetSequence =
    0;

  let fillTargetSequence =
    0;

  for (
    const interaction of
    plan.interactions
  ) {
    switch (
      interaction.kind
    ) {
      case "navigation":
        lines.push(
          "  await page.goto(testData.url);"
        );

        lines.push(
          "  await page.waitForLoadState('domcontentloaded');"
        );

        lines.push(
          ""
        );

        break;

      case "click":
        clickTargetSequence +=
          1;

        const clickTargetVariable =
          `clickTarget${clickTargetSequence}`;

        lines.push(
          `  const ${clickTargetVariable} = ` +
          `${interaction.locatorExpression};`
        );

        lines.push(
          `  await ${clickTargetVariable}.click();`
        );

        lines.push(
          ""
        );

        break;

      case "fill":
        fillTargetSequence +=
          1;

        const fillTargetVariable =
          `fillTarget${fillTargetSequence}`;

        lines.push(
          `  const ${fillTargetVariable} = page.locator(` +
          JSON.stringify(
            interaction.selector
          ) +
          ");"
        );

        lines.push(
          `  await ${fillTargetVariable}.fill(` +
          `testData.${interaction.dataKey}` +
          ");"
        );

        lines.push(
          ""
        );

        break;

      case "select":
        lines.push(
          "  await page.locator(" +
          JSON.stringify(
            interaction.selector
          ) +
          ").selectOption(" +
          quoteJavaScriptValue(
            interaction.value
          ) +
          ");"
        );

        break;

      case "press":
        lines.push(
          "  await page.locator(" +
          JSON.stringify(
            interaction.selector
          ) +
          ").press(" +
          quoteJavaScriptValue(
            interaction.key
          ) +
          ");"
        );

        break;

      case "hover":
        lines.push(
          "  await page.locator(" +
          JSON.stringify(
            interaction.selector
          ) +
          ").hover();"
        );

        break;

      case "file-upload":
        if (
          interaction.value !==
            "" &&
          interaction.value !==
            null &&
          interaction.value !==
            undefined &&
          (
            !Array.isArray(
              interaction.value
            ) ||
            interaction.value.length >
              0
          )
        ) {
          lines.push(
            "  await page.locator(" +
            JSON.stringify(
              interaction.selector
            ) +
            ").setInputFiles(" +
            quoteJavaScriptValue(
              interaction.value
            ) +
            ");"
          );
        }

        break;

      default:
        break;
    }
  }

  lines.push(
    "});"
  );

  return lines.join(
    "\n"
  );
}

function collectPreparedClicks(
  scriptText
) {
  const clicks = [];

  const lines =
    String(
      scriptText ||
      ""
    )
      .split(/\r?\n/);

  for (
    let lineIndex = 0;
    lineIndex < lines.length;
    lineIndex += 1
  ) {
    const declarationMatch =
      lines[lineIndex]
        .trim()
        .match(
          /^const\s+([A-Za-z_$][\w$]*)\s*=\s*(page\..+);\s*$/
        );

    if (
      !declarationMatch
    ) {
      continue;
    }

    const variableName =
      declarationMatch[1];

    const nextLine =
      String(
        lines[lineIndex + 1] ||
        ""
      ).trim();

    const legacyVisibilityLine =
      nextLine ===
        `await expect(${variableName}).toBeVisible();`;

    const clickLine =
      String(
        lines[
          lineIndex +
          (legacyVisibilityLine ? 2 : 1)
        ] ||
        ""
      ).trim();

    if (
      clickLine !==
        `await ${variableName}.click();`
    ) {
      continue;
    }

    const locatorExpression =
      declarationMatch[2]
        .trim();

    if (
      !locatorExpression ||
      /\.(?:click|fill)\s*\(/.test(
        locatorExpression
      )
    ) {
      continue;
    }

    clicks.push({
      locatorExpression,
      variableName,
      declarationLineIndex:
        lineIndex,
    });
  }

  return clicks;
}

function collectPreparedFills(
  scriptText
) {
  const fills = [];

  const lines =
    String(
      scriptText ||
      ""
    )
      .split(/\r?\n/);

  for (
    let lineIndex = 0;
    lineIndex < lines.length;
    lineIndex += 1
  ) {
    const declarationMatch =
      lines[lineIndex]
        .trim()
        .match(
          /^const\s+([A-Za-z_$][\w$]*)\s*=\s*page\.locator\(\s*("(?:\\.|[^"\\])*")\s*\);\s*$/
        );

    if (!declarationMatch) {
      continue;
    }

    const variableName =
      declarationMatch[1];

    const nextLine =
      String(
        lines[lineIndex + 1] ||
        ""
      ).trim();

    const legacyEditableLine =
      nextLine ===
        `await expect(${variableName}).toBeEditable();`;

    const fillMatch =
      String(
        lines[
          lineIndex +
          (legacyEditableLine ? 2 : 1)
        ] ||
        ""
      )
        .trim()
        .match(
          new RegExp(
            `^await\\s+${variableName}\\.fill\\(\\s*testData\\.([A-Za-z_$][\\w$]*)\\s*\\);\\s*$`
          )
        );

    if (!fillMatch) {
      continue;
    }

    try {
      const selector =
        JSON.parse(
          declarationMatch[2]
        );

      if (
        typeof selector !==
          "string" ||
        !selector.startsWith(
          "xpath="
        )
      ) {
        continue;
      }

      fills.push({
        selector,

        dataKey:
          fillMatch[1],

        variableName,

        declarationLineIndex:
          lineIndex,
      });
    } catch {
      continue;
    }
  }

  return fills;
}

function assertClicksUseValidatedLocators(
  scriptText,
  traceText
) {
  const expected =
    buildTracePlan(
      traceText
    )
      .clickSteps
      .map(
        (step) =>
          step.locatorExpression
      );

  const actual =
    collectPreparedClicks(
      scriptText
    ).map(
      (click) =>
        click.locatorExpression
    );

  const totalClickCalls =
    (
      String(
        scriptText ||
        ""
      ).match(
        /\.click\s*\(/g
      ) ||
      []
    ).length;

  if (
    totalClickCalls !==
      actual.length
  ) {
    throw new Error(
      "Every click must declare its validated locator in a variable, " +
      "and then call await variable.click(). A separate visibility " +
      "assertion is intentionally omitted because click() already performs " +
      "actionability waiting through smart-test."
    );
  }

  if (
    actual.length !==
      expected.length
  ) {
    throw new Error(
      `Click count mismatch. TRACE contains ` +
      `${expected.length} clicks, but the generated ` +
      `script contains ${actual.length}.`
    );
  }

  for (
    let index = 0;
    index <
      expected.length;
    index += 1
  ) {
    if (
      actual[index] !==
      expected[index]
    ) {
      throw new Error(
        `Click ${index + 1} used the wrong validated TRACE locator.\n` +
        `Expected: ${expected[index]}\n` +
        `Actual: ${actual[index]}`
      );
    }
  }
}

function assertFillsUseRecordedXPaths(
  scriptText,
  traceText
) {
  const expected =
    collectRecordedFillSteps(
      traceText
    );

  const actual =
    collectPreparedFills(
      scriptText
    );

  const totalValueCalls =
    (
      String(
        scriptText ||
        ""
      ).match(
        /\.(?:fill|type|pressSequentially)\s*\(/g
      ) ||
      []
    ).length;

  if (
    totalValueCalls !==
      actual.length
  ) {
    throw new Error(
      "Every generated input action must declare its XPath locator in a " +
      "variable and call await variable.fill(testData.someKey). A separate " +
      "editable assertion is intentionally omitted because smart fill " +
      "performs target disambiguation and editability waiting. " +
      "type() and pressSequentially() are forbidden."
    );
  }

  if (
    actual.length !==
      expected.length
  ) {
    throw new Error(
      `Fill count mismatch. TRACE contains ` +
      `${expected.length} normalized input actions, ` +
      `but the generated script contains ` +
      `${actual.length}.`
    );
  }

  for (
    let index = 0;
    index <
      expected.length;
    index += 1
  ) {
    if (
      actual[index].selector !==
      expected[index].selector
    ) {
      throw new Error(
        `Fill ${index + 1} used the wrong TRACE input XPath.\n` +
        `Expected: ${expected[index].selector}\n` +
        `Actual: ${actual[index].selector}`
      );
    }

    if (
      actual[index].dataKey !==
      expected[index].dataKey
    ) {
      throw new Error(
        `Fill ${index + 1} used the wrong testData key.\n` +
        `Expected: testData.${expected[index].dataKey}\n` +
        `Actual: testData.${actual[index].dataKey}`
      );
    }
  }
}

function collectGeneratedClickAndFillOrder(
  scriptText
) {
  const operations = [];

  const text =
    String(
      scriptText ||
      ""
    );

  const lines =
    text.split(/\r?\n/);

  const preparedClicksByLine =
    new Map(
      collectPreparedClicks(
        text
      ).map(
        (click) => [
          click.declarationLineIndex,
          click,
        ]
      )
    );

  const preparedFillsByLine =
    new Map(
      collectPreparedFills(
        text
      ).map(
        (fill) => [
          fill.declarationLineIndex,
          fill,
        ]
      )
    );

  for (
    let lineIndex = 0;
    lineIndex < lines.length;
    lineIndex += 1
  ) {
    const line =
      lines[lineIndex];

    const preparedClick =
      preparedClicksByLine.get(
        lineIndex
      );

    if (
      preparedClick
    ) {
      operations.push({
        kind:
          "click",

        locatorExpression:
          preparedClick
            .locatorExpression,
      });

      continue;
    }

    const fill =
      preparedFillsByLine.get(
        lineIndex
      );

    if (
      fill
    ) {
      operations.push({
        kind:
          "fill",

        selector:
          fill.selector,

        dataKey:
          fill.dataKey,
      });
    }
  }

  return operations;
}

function assertTraceClickAndFillOrder(
  scriptText,
  traceText
) {
  const expected =
    buildTracePlan(
      traceText
    )
      .interactions
      .filter(
        (interaction) =>
          interaction.kind ===
            "click" ||
          interaction.kind ===
            "fill"
      )
      .map(
        (interaction) => ({
          kind:
            interaction.kind,

          selector:
            interaction.kind ===
              "fill"
              ? interaction.selector
              : undefined,

          locatorExpression:
            interaction.kind ===
              "click"
              ? interaction
                  .locatorExpression
              : undefined,

          dataKey:
            interaction.kind ===
              "fill"
              ? interaction.dataKey
              : undefined,
        })
      );

  const actual =
    collectGeneratedClickAndFillOrder(
      scriptText
    );

  if (
    actual.length !==
      expected.length
  ) {
    throw new Error(
      `TRACE click/fill order count mismatch. ` +
      `Expected ${expected.length} operations, ` +
      `received ${actual.length}.`
    );
  }

  for (
    let index = 0;
    index <
      expected.length;
    index += 1
  ) {
    const expectedOperation =
      expected[index];

    const actualOperation =
      actual[index];

    if (
      actualOperation.kind !==
        expectedOperation.kind ||
      actualOperation.selector !==
        expectedOperation.selector ||
      actualOperation.locatorExpression !==
        expectedOperation.locatorExpression ||
      (
        expectedOperation.kind ===
          "fill" &&
        actualOperation.dataKey !==
          expectedOperation.dataKey
      )
    ) {
      throw new Error(
        `Generated operation ${index + 1} does not match TRACE order.\n` +
        `Expected: ${JSON.stringify(
          expectedOperation
        )}\n` +
        `Actual: ${JSON.stringify(
          actualOperation
        )}`
      );
    }
  }
}

function assertGeneratedScriptIsComplete(
  scriptText,
  outputPath
) {
  const text =
    String(
      scriptText ||
      ""
    ).trim();

  assertNoCheckOrToBeChecked(
    text
  );

  if (
    !text.includes(
      "import { test, expect } from '../utils/smart-test.js';"
    )
  ) {
    throw new Error(
      "Generated script is missing the smart-test import."
    );
  }

  if (
    !/import\s+testData\s+from\s+['"][^'"]+test-data\.json['"]/.test(
      text
    )
  ) {
    throw new Error(
      "Generated script is missing the test-data.json import."
    );
  }

  if (
    !/test\s*\(\s*['"`]/.test(
      text
    )
  ) {
    throw new Error(
      "Generated script is missing a Playwright test block."
    );
  }

  if (
    !/\}\s*\)\s*;?\s*$/.test(
      text
    )
  ) {
    throw new Error(
      "Generated script does not end with a closed test block."
    );
  }

  const forbiddenTypeLine =
    text
      .split(/\r?\n/)
      .find(
        (line) =>
          /\.(?:type|pressSequentially)\s*\(/.test(
            line
          )
      );

  if (
    forbiddenTypeLine
  ) {
    throw new Error(
      "Generated script contains type() or pressSequentially(): " +
      forbiddenTypeLine.trim()
    );
  }

  const hardcodedFillLine =
    text
      .split(/\r?\n/)
      .find(
        (line) =>
          /\.fill\(\s*['"`]/.test(
            line
          )
      );

  if (
    hardcodedFillLine
  ) {
    throw new Error(
      "Generated script contains a hardcoded fill value: " +
      hardcodedFillLine.trim()
    );
  }

  /*
   * Use .mjs so Node parses the generated import statements as ECMAScript
   * modules during syntax validation.
   */
  const tempPath =
    path.join(
      path.dirname(
        outputPath
      ),
      `.${path.basename(
        outputPath
      )}.syntax-${Date.now()}.mjs`
    );

  fs.mkdirSync(
    path.dirname(
      tempPath
    ),
    {
      recursive:
        true,
    }
  );

  try {
    fs.writeFileSync(
      tempPath,
      text,
      "utf8"
    );

    const result =
      spawnSync(
        process.execPath,
        [
          "--check",
          tempPath,
        ],
        {
          cwd:
            ROOT,

          encoding:
            "utf8",
        }
      );

    if (
      result.error
    ) {
      throw new Error(
        "Unable to start Node syntax validation." +
        `\n${result.error.message}`
      );
    }

    if (
      result.status !== 0
    ) {
      const details = [
        result.stderr,
        result.stdout,
      ]
        .filter(Boolean)
        .join("\n")
        .trim();

      throw new Error(
        "Generated script failed JavaScript syntax validation." +
        (
          details
            ? `\n${details}`
            : ""
        )
      );
    }
  } finally {
    try {
      fs.rmSync(
        tempPath,
        {
          force:
            true,
        }
      );
    } catch {
      // Ignore temporary-file cleanup failures.
    }
  }
}

function assertTraceIsUsable(
  traceText,
  tracePath
) {
  const plan =
    buildTracePlan(
      traceText
    );

  if (
    !plan.interactions.length
  ) {
    throw new Error(
      `TRACE contains no usable interactions: ${tracePath}`
    );
  }

  if (
    !plan.interactions.some(
      (interaction) =>
        interaction.kind ===
          "navigation" ||
        interaction.kind ===
          "click" ||
        interaction.kind ===
          "fill"
    )
  ) {
    throw new Error(
      `TRACE contains no navigation, click or input actions: ${tracePath}`
    );
  }
}

async function main() {
  const args =
    parseArgs(
      process.argv.slice(
        2
      )
    );

  if (
    args.help
  ) {
    printHelp();

    return;
  }

  let tracePath =
    resolveFromRoot(
      args.trace
    );

  if (
    fs.existsSync(
      tracePath
    ) &&
    fs
      .statSync(
        tracePath
      )
      .isDirectory()
  ) {
    const latestTrace =
      getLatestTraceFromDirectory(
        tracePath
      );

    if (
      !latestTrace
    ) {
      throw new Error(
        `No actions-*.json TRACE file found in ${tracePath}`
      );
    }

    tracePath =
      latestTrace;
  }

  if (
    !fs.existsSync(
      tracePath
    ) ||
    fs
      .statSync(
        tracePath
      )
      .isDirectory()
  ) {
    throw new Error(
      `Trace path must resolve to a JSON file. Got: ${tracePath}`
    );
  }

  /*
   * record-trace.js already consumed and compared live codegen clicks. Keep
   * this argument only for command compatibility; do not re-consume it here.
   */
  const codegenArgument =
    String(
      args.codegen ||
      ""
    ).trim();

  const testName =
    String(
      args[
        "test-name"
      ] ||
      ""
    ).trim() ||
    deriveTestName(
      tracePath
    );

  const outputPath =
    buildOutputPath(
      args.output,
      testName
    );

  console.log(
    `Final output path: ${outputPath}`
  );

  console.log(
    `TRACE input path: ${tracePath}`
  );

  if (
    codegenArgument
  ) {
    console.log(
      `Raw CODEGEN not reparsed: ${codegenArgument}`
    );
  } else {
    console.log(
      "Raw CODEGEN not reparsed: no --codegen argument supplied."
    );
  }

  console.log(
    `TRACE generation with live Codegen and semantic-locator metadata: ${RAW_CODEGEN_IS_NOT_REPARSED}`
  );

  console.log(
    "LLM usage: disabled"
  );

  fs.rmSync(
    outputPath,
    {
      force:
        true,
    }
  );

  console.log(
    "Reading TRACE..."
  );

  const trace =
    loadFile(
      tracePath
    );

  assertTraceIsUsable(
    trace,
    tracePath
  );

  const testDataModel =
    buildTestDataModel(
      trace
    );

  /*
   * Force early validation of every click and input XPath before writing
   * either output file.
   */
  collectRecordedClickXPaths(
    trace
  );

  collectRecordedFillSteps(
    trace
  );

  console.log(
    "Building deterministic TRACE-only Playwright script..."
  );

  let generatedScript =
    buildTraceDrivenScript({
      traceText:
        trace,

      testName,

      outputPath,

      testDataModel,
    });

  generatedScript =
    removeCheckAndToBeCheckedStatements(
      generatedScript
    );

  assertNoCheckOrToBeChecked(
    generatedScript
  );

  const testDataResult =
    writeTestDataFile(
      outputPath,
      generatedScript,
      testDataModel
    );

  const finalScriptText =
    removeCheckAndToBeCheckedStatements(
      testDataResult.scriptText
    );

  assertNoCheckOrToBeChecked(
    finalScriptText
  );

  assertClicksUseValidatedLocators(
    finalScriptText,
    trace
  );

  assertFillsUseRecordedXPaths(
    finalScriptText,
    trace
  );

  assertTraceClickAndFillOrder(
    finalScriptText,
    trace
  );

  assertGeneratedScriptIsComplete(
    finalScriptText,
    outputPath
  );

  fs.mkdirSync(
    path.dirname(
      outputPath
    ),
    {
      recursive:
        true,
    }
  );

  fs.writeFileSync(
    outputPath,
    `${finalScriptText}\n`,
    "utf8"
  );

  console.log(
    `Generated TRACE-only spec: ${outputPath}`
  );

  console.log(
    `Test data: ${testDataResult.testDataPath}`
  );

  console.log(
    "Generation completed without an LLM."
  );
}

main().catch(
  (error) => {
    console.error(
      `refine-with-llm failed: ` +
      `${
        error?.message ||
        String(
          error
        )
      }`
    );

    if (
      error?.stack
    ) {
      console.error(
        error.stack
      );
    }

    /*
     * Avoid process.exit(1), which can terminate while asynchronous handles
     * are closing and can trigger UV_HANDLE_CLOSING assertions on Windows.
     */
    process.exitCode =
      1;
  }
);

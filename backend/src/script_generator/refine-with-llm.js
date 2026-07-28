const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");
const {
  generateFromOpenAI,
  buildUsageSummary,
  addUsageSummary,
  formatUsageSummary,
} = require("../utils/groqClient");

const ROOT = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.join(ROOT, ".env") });

const llmUsageSummary = buildUsageSummary();

function getScriptGeneratorPrompt() {
  const promptPath = path.join(
    ROOT,
    "src",
    "prompts",
    "script_refine_prompt.py"
  );

  const promptSource = loadFile(promptPath);
  const tripleQuoteMatch = promptSource.match(
    /return\s+"""([\s\S]*?)"""/
  );

  if (tripleQuoteMatch) {
    return tripleQuoteMatch[1].trim();
  }

  const singleQuoteMatch = promptSource.match(
    /return\s+\(\s*((?:"(?:[^"\\]|\\.)*"\s*)+)\)/
  );

  if (singleQuoteMatch) {
    const parts = [
      ...singleQuoteMatch[1].matchAll(
        /"((?:[^"\\]|\\.)*)"/g
      ),
    ].map((match) =>
      match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, "\"")
        .replace(/\\\\/g, "\\")
    );

    return parts.join("").trim();
  }

  throw new Error(
    `Unable to extract prompt from ${promptPath}`
  );
}

function getHealWrapperPrompt() {
  const promptPath = path.join(
    ROOT,
    "src",
    "prompts",
    "heal_wrapper_prompt.py"
  );

  const promptSource = loadFile(promptPath);
  const tripleQuoteMatch = promptSource.match(
    /return\s+"""([\s\S]*?)"""/
  );

  if (tripleQuoteMatch) {
    return tripleQuoteMatch[1].trim();
  }

  throw new Error(
    `Unable to extract prompt from ${promptPath}`
  );
}

function extractHealedSpecBetweenSentinels(rawOutput) {
  const text = String(rawOutput || "").trim();
  const startTag = "<<<UPDATED_TEST>>>";
  const endTag = "<<<END_UPDATED_TEST>>>";

  if (
    text.includes(startTag) &&
    text.includes(endTag)
  ) {
    const between = text
      .split(startTag, 2)[1]
      .split(endTag, 2)[0]
      .trim();

    return cleanLlmOutput(between);
  }

  return cleanLlmOutput(text);
}

const HEALED_TEMPLATE_OVERRIDES = [];

function findMatchingHealedTemplate(plainPath) {
  const baseName = path.basename(plainPath);

  for (const override of HEALED_TEMPLATE_OVERRIDES) {
    if (
      override.match.test(baseName) &&
      fs.existsSync(override.templatePath)
    ) {
      return override;
    }
  }

  return null;
}

function buildHealedOutputPath(plainOutputPath) {
  const plainPath = path.resolve(plainOutputPath);
  const baseName = path.basename(plainPath);
  const suiteDir = path.dirname(plainPath);
  const suiteName = path
    .basename(suiteDir)
    .toLowerCase();

  const projectDir = path.dirname(suiteDir);

  const healedDir =
    suiteName === "sanity" ||
    suiteName === "regression"
      ? path.join(
          projectDir,
          "healed",
          suiteName
        )
      : path.join(projectDir, "healed");

  let healedName;

  if (baseName.endsWith(".spec.js")) {
    const stem = baseName.slice(
      0,
      -".spec.js".length
    );

    healedName = `${stem}.healed.spec.js`;
  } else if (baseName.endsWith(".js")) {
    const stem = baseName.slice(
      0,
      -".js".length
    );

    healedName = `${stem}.healed.js`;
  } else {
    healedName = `${baseName}.healed`;
  }

  return path.join(healedDir, healedName);
}

function rewriteHealedImports(
  healedSpecText,
  healedPath,
  plainOutputPath
) {
  return healedSpecText;
}

async function generateAndWriteHealedSpec(
  plainSpecText,
  plainOutputPath
) {
  const healedPath =
    buildHealedOutputPath(plainOutputPath);

  const templateOverride =
    findMatchingHealedTemplate(plainOutputPath);

  if (
    templateOverride &&
    !fs.existsSync(healedPath)
  ) {
    console.log(
      `Using healed template (skipping LLM): ` +
      `${templateOverride.templatePath}`
    );

    const templateContent = fs.readFileSync(
      templateOverride.templatePath,
      "utf8"
    );

    fs.mkdirSync(
      path.dirname(healedPath),
      { recursive: true }
    );

    fs.writeFileSync(
      healedPath,
      templateContent,
      "utf8"
    );

    console.log(
      `Wrote healed spec (from template): ${healedPath}`
    );

    return healedPath;
  }

  if (templateOverride) {
    console.log(
      "Healed template match found but healed " +
      "file already exists — using LLM."
    );
  }

  const healSystemPrompt =
    getHealWrapperPrompt();

  const userPrompt =
    "Here is a clean Playwright spec. " +
    "Convert it to a heal-wrapped version " +
    "per the rules.\n\n" +
    `SPEC:\n${plainSpecText}`;

  const fullPrompt =
    `${healSystemPrompt}\n\n${userPrompt}`;

  console.log(
    "Calling Model for heal-wrapped version..."
  );

  let rawHealed;

  try {
    rawHealed = await callGroq(fullPrompt);
  } catch (error) {
    console.warn(
      `Heal-wrapped generation failed: ` +
      `${error.message}. Skipping healed spec.`
    );

    return null;
  }

  const healedSpec =
    extractHealedSpecBetweenSentinels(
      rawHealed
    );

  if (
    !healedSpec ||
    !healedSpec.includes("test(") ||
    !healedSpec.includes("heal(")
  ) {
    console.warn(
      "Heal-wrapped output looks invalid " +
      "(no test() or no heal() calls). " +
      "Skipping healed spec."
    );

    return null;
  }

  let healedWithFixedImports =
    rewriteHealedImports(
      healedSpec,
      healedPath,
      plainOutputPath
    );

  healedWithFixedImports =
    healedWithFixedImports
      .replace(
        /'\.\.\/\.\.\/\.\.\/test-data\.json'/g,
        "'../../test-data.json'"
      )
      .replace(
        /'\.\.\/\.\.\/\.\.\/fixtures\//g,
        "'../../fixtures/"
      );

  fs.mkdirSync(
    path.dirname(healedPath),
    { recursive: true }
  );

  fs.writeFileSync(
    healedPath,
    healedWithFixedImports,
    "utf8"
  );

  console.log(
    `Wrote healed spec (LLM): ${healedPath}`
  );

  return healedPath;
}

function parseArgs(argv) {
  const args = {};

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, ...rest] =
      arg.slice(2).split("=");

    args[key] =
      rest.length > 0
        ? rest.join("=")
        : "";
  }

  if (
    Object.prototype.hasOwnProperty.call(
      args,
      "help"
    ) ||
    Object.prototype.hasOwnProperty.call(
      args,
      "h"
    )
  ) {
    return { help: true };
  }

  if (
    !args.trace ||
    !args.codegen ||
    !args.output
  ) {
    printHelp();

    throw new Error(
      "Missing required arguments: " +
      "--trace, --codegen, --output"
    );
  }

  return args;
}

function printHelp() {
  console.log(
    "Usage: node " +
    "src/script_generator/refine-with-llm.js " +
    "--trace=<path> " +
    "--codegen=<path> " +
    "--output=<path> " +
    "[--test-name=<name>]"
  );
}

function resolveFromRoot(filePath) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(ROOT, filePath);
}

function loadFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

const URL_LIKE_KEYS = new Set([
  "url",
  "href",
  "src",
  "actionurl",
  "redirecturl",
  "website",
]);

const TEXT_LIKE_KEYS = new Set([
  "value",
  "text",
  "input",
  "typedtext",
  "placeholdervalue",
  "label",
  "title",
  "name",
]);

const STRUCTURAL_TRACE_KEYS = new Set([
  "selector",
  "locator",
  "locatorhint",
  "locatorcode",
  "elementkey",
  "id",
  "name",
  "tagname",
  "type",
  "role",
  "arialabel",
  "datalabel",
  "placeholder",
  "title",
]);

const SENSITIVE_KEY_PATTERN =
  /(password|pass|token|secret|authorization|auth|cookie|session|otp|postal|zip|phone|mobile|email|user\s*name|username|user|card|credit|cc|api[_-]?key|apikey)/i;

const DATA_FIELDS = [
  "url",
  "website",
  "username",
  "phone",
  "email",
  "password",
  "cardNumber",
  "postalCode",
  "otp",
];

function titleCaseToken(value) {
  const text = String(value || "")
    .replace(
      /[^a-zA-Z0-9]+/g,
      " "
    )
    .trim();

  if (!text) {
    return "";
  }

  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (token) =>
        token.charAt(0).toUpperCase() +
        token.slice(1)
    )
    .join("");
}

function selectorKeyBase(context) {
  const text =
    String(context || "").trim();

  if (!text) {
    return "";
  }

  const attrMatch = text.match(
    /\[(?:data-testid|data-test|data-cy|data-label|aria-label|name|placeholder|title)=["']([^"']+)["']\]/i
  );

  const roleNameMatch = text.match(
    /name\s*:\s*['"`]([^'"`]+)['"`]/i
  );

  const textMatch = text.match(
    /(?:text|getByText)\(\s*['"`]([^'"`]+)['"`]/i
  );

  const idMatch =
    text.match(/#([A-Za-z0-9_-]+)/) ||
    text.match(
      /\bid\s*[:=]\s*['"`]?([A-Za-z0-9_-]+)/i
    );

  const idValue =
    idMatch && idMatch[1];

  const source =
    (attrMatch && attrMatch[1]) ||
    (roleNameMatch && roleNameMatch[1]) ||
    (textMatch && textMatch[1]) ||
    (
      idValue &&
      !isGeneratedIdValue(idValue)
        ? idValue
        : ""
    ) ||
    text;

  const base =
    titleCaseToken(source).slice(0, 60);

  return base
    ? base.charAt(0).toLowerCase() +
      base.slice(1)
    : "";
}

function isUsefulIdentityKey(base) {
  const text =
    String(base || "").trim();

  if (
    !text ||
    text.length < 3
  ) {
    return false;
  }

  const lower = text.toLowerCase();

  if (isGeneratedIdValue(text)) {
    return false;
  }

  return ![
    "input",
    "textbox",
    "field",
    "value",
    "text",
    "button",
    "submit",
  ].includes(lower);
}

function dataKeyForFieldContext(
  field,
  context = ""
) {
  const base =
    selectorKeyBase(context);

  if (!base) {
    return field;
  }

  if (isUsefulIdentityKey(base)) {
    return base;
  }

  const fieldToken =
    field === "cardNumber"
      ? "CardNumber"
      : titleCaseToken(field);

  const lowerBase =
    base.toLowerCase();

  const lowerField =
    String(field || "").toLowerCase();

  if (
    lowerBase.includes(lowerField) ||
    (
      field === "cardNumber" &&
      /card|credit|cc/.test(lowerBase)
    )
  ) {
    return base;
  }

  return `${base}${fieldToken}`;
}

function placeholderTokenForField(field) {
  return field === "cardNumber"
    ? "CARD"
    : String(field || "")
        .replace(
          /[A-Z]/g,
          (letter) => `_${letter}`
        )
        .toUpperCase();
}

function buildMaskedPlaceholder(
  field,
  context = ""
) {
  const base =
    dataKeyForFieldContext(
      field,
      context
    );

  const fieldToken =
    placeholderTokenForField(field);

  if (
    !base ||
    base === field
  ) {
    return `[MASKED_${fieldToken}]`;
  }

  const contextToken = String(base)
    .replace(
      /([a-z0-9])([A-Z])/g,
      "$1_$2"
    )
    .replace(
      /[^a-zA-Z0-9]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    )
    .toUpperCase();

  return (
    `[MASKED_${fieldToken}_` +
    `${contextToken}]`
  );
}

function extractTraceContext(obj) {
  if (
    !obj ||
    typeof obj !== "object" ||
    Array.isArray(obj)
  ) {
    return "";
  }

  return [
    obj.selector,
    obj.locator,
    obj.id
      ? `id=${obj.id}`
      : "",
    obj.name
      ? `name=${obj.name}`
      : "",
    obj.dataLabel
      ? `data-label=${obj.dataLabel}`
      : "",
    obj.ariaLabel
      ? `aria-label=${obj.ariaLabel}`
      : "",
    obj.placeholder
      ? `placeholder=${obj.placeholder}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function isUsernameHintText(text) {
  const hints =
    String(text || "").toLowerCase();

  return (
    hints.includes("user-name") ||
    hints.includes("username") ||
    hints.includes("user name") ||
    hints.includes("sign in name") ||
    hints.includes("signinname")
  );
}

function maskByKey(
  key,
  value,
  context = ""
) {
  const lowerKey =
    String(key || "").toLowerCase();

  const text =
    String(value ?? "");

  if (!text) {
    return text;
  }

  if (
    lowerKey.includes("password") ||
    lowerKey === "pass"
  ) {
    return buildMaskedPlaceholder(
      "password",
      context
    );
  }

  if (
    lowerKey.includes("authorization") ||
    lowerKey === "auth"
  ) {
    return "[MASKED_AUTH]";
  }

  if (lowerKey.includes("cookie")) {
    return "[MASKED_COOKIE]";
  }

  if (lowerKey.includes("token")) {
    return "[MASKED_TOKEN]";
  }

  if (lowerKey.includes("secret")) {
    return "[MASKED_SECRET]";
  }

  if (lowerKey.includes("session")) {
    return "[MASKED_SESSION]";
  }

  if (
    lowerKey.includes("card") ||
    lowerKey.includes("credit") ||
    lowerKey === "cc"
  ) {
    return buildMaskedPlaceholder(
      "cardNumber",
      context
    );
  }

  if (
    lowerKey.includes("postal") ||
    lowerKey.includes("zip")
  ) {
    return buildMaskedPlaceholder(
      "postalCode",
      context
    );
  }

  if (lowerKey.includes("otp")) {
    return buildMaskedPlaceholder(
      "otp",
      context
    );
  }

  if (
    lowerKey.includes("phone") ||
    lowerKey.includes("mobile")
  ) {
    return buildMaskedPlaceholder(
      "phone",
      context
    );
  }

  if (lowerKey.includes("email")) {
    return buildMaskedPlaceholder(
      "email",
      context
    );
  }

  if (
    lowerKey.includes("website") ||
    lowerKey.includes("web")
  ) {
    return buildMaskedPlaceholder(
      "website",
      context
    );
  }

  if (
    lowerKey.includes("user name") ||
    lowerKey.includes("username") ||
    lowerKey === "user"
  ) {
    return buildMaskedPlaceholder(
      "username",
      context
    );
  }

  if (
    lowerKey.includes("api_key") ||
    lowerKey.includes("apikey") ||
    lowerKey === "key"
  ) {
    return "[MASKED_API_KEY]";
  }

  return "[MASKED]";
}

function maskSensitiveText(value) {
  let text =
    String(value ?? "");

  const replacements = [
    {
      pattern:
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      replacement: "[MASKED_EMAIL]",
    },
    {
      pattern:
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\b/gi,
      replacement: "[MASKED_EMAIL]",
    },
    {
      pattern:
        /\b(?:\d[ -]?){13,19}\b/g,
      replacement: "[MASKED_CARD]",
    },
    {
      pattern:
        /\b(?:\+?\d[\d\s-]{7,}\d)\b/g,
      replacement: "[MASKED_PHONE]",
    },
    {
      pattern:
        /\b\d{4,8}\b/g,
      replacement: (match) =>
        /^\d{4,6}$/.test(match)
          ? "[MASKED_OTP]"
          : match,
    },
    {
      pattern:
        /(?<=password\s*[:=]\s*['"`])[^'"`\n]+/gi,
      replacement:
        "[MASKED_PASSWORD]",
    },
    {
      pattern:
        /(?<=pass\s*[:=]\s*['"`])[^'"`\n]+/gi,
      replacement:
        "[MASKED_PASSWORD]",
    },
    {
      pattern:
        /(?<=token\s*[:=]\s*['"`])[^'"`\n]+/gi,
      replacement:
        "[MASKED_TOKEN]",
    },
    {
      pattern:
        /(?<=api[_-]?key\s*[:=]\s*['"`])[^'"`\n]+/gi,
      replacement:
        "[MASKED_API_KEY]",
    },
    {
      pattern:
        /(?<=secret\s*[:=]\s*['"`])[^'"`\n]+/gi,
      replacement:
        "[MASKED_SECRET]",
    },
    {
      pattern:
        /(?<=authorization\s*[:=]\s*['"`])[^'"`\n]+/gi,
      replacement:
        "[MASKED_AUTH]",
    },
  ];

  for (
    const {
      pattern,
      replacement,
    } of replacements
  ) {
    text = text.replace(
      pattern,
      replacement
    );
  }

  return text;
}

function isHtmlSnippetValue(value) {
  const text =
    String(value ?? "").trim();

  if (!text) {
    return false;
  }

  if (text.length < 20) {
    return false;
  }

  return /<\s*(?:button|div|span|input|form|a|label|select|textarea)\b[\s\S]*>/i.test(
    text
  );
}

function maskUrlValue(rawUrl) {
  if (
    !rawUrl ||
    typeof rawUrl !== "string"
  ) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);

    const sensitiveParams = [
      "password",
      "pass",
      "token",
      "access_token",
      "id_token",
      "auth",
      "authorization",
      "code",
      "session",
      "sid",
      "email",
      "phone",
      "mobile",
      "otp",
      "api_key",
      "apikey",
      "key",
      "secret",
    ];

    for (
      const [key] of
      url.searchParams.entries()
    ) {
      const lowerKey =
        key.toLowerCase();

      if (
        sensitiveParams.includes(
          lowerKey
        ) ||
        lowerKey.startsWith("utm_") ||
        lowerKey.includes("token") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("session")
      ) {
        url.searchParams.set(
          key,
          "[MASKED]"
        );
      }
    }

    if (url.username) {
      url.username =
        "[MASKED_USER]";
    }

    if (url.password) {
      url.password =
        "[MASKED_PASSWORD]";
    }

    return url.toString();
  } catch {
    return maskSensitiveText(rawUrl);
  }
}

function maskUrlForLlm(rawUrl) {
  if (
    !rawUrl ||
    typeof rawUrl !== "string"
  ) {
    return rawUrl;
  }

  return "[MASKED_URL]";
}

function getObjectSensitivityHint(obj) {
  if (
    !obj ||
    typeof obj !== "object" ||
    Array.isArray(obj)
  ) {
    return "";
  }

  const hints = [
    obj.inputType,
    obj.type,
    obj.name,
    obj.id,
    obj.placeholder,
    obj.selector,
    obj.label,
    obj.title,
    obj.text,
    obj.element?.name,
    obj.element?.id,
    obj.element?.testId,
    obj.element?.dataTest,
    obj.element?.dataLabel,
    obj.element?.placeholder,
  ]
    .filter(
      (value) =>
        typeof value === "string"
    )
    .join(" ")
    .toLowerCase();

  if (!hints) {
    return "";
  }

  if (isUsernameHintText(hints)) {
    return "username";
  }

  if (
    hints.includes("website") ||
    hints.includes("web site")
  ) {
    return "website";
  }

  if (hints.includes("email")) {
    return "email";
  }

  if (
    hints.includes("card") ||
    hints.includes("credit") ||
    hints.includes("cc-number") ||
    hints.includes("ccnum")
  ) {
    return "cardNumber";
  }

  if (
    hints.includes("phone") ||
    hints.includes("mobile") ||
    hints.includes("tel")
  ) {
    return "phone";
  }

  if (
    hints.includes("password") ||
    hints.includes("pass")
  ) {
    return "password";
  }

  if (
    hints.includes("postal") ||
    hints.includes("zip")
  ) {
    return "postalCode";
  }

  if (hints.includes("otp")) {
    return "otp";
  }

  return "";
}

function getSensitivityHintFromText(text) {
  const hints =
    String(text || "").toLowerCase();

  if (!hints) {
    return "";
  }

  if (isUsernameHintText(hints)) {
    return "username";
  }

  if (
    hints.includes("website") ||
    hints.includes("web site")
  ) {
    return "website";
  }

  if (hints.includes("email")) {
    return "email";
  }

  if (
    hints.includes("card") ||
    hints.includes("credit") ||
    hints.includes("cc-number") ||
    hints.includes("ccnum")
  ) {
    return "cardNumber";
  }

  if (
    hints.includes("phone") ||
    hints.includes("mobile") ||
    hints.includes("tel")
  ) {
    return "phone";
  }

  if (
    hints.includes("password") ||
    hints.includes("pass")
  ) {
    return "password";
  }

  if (
    hints.includes("postal") ||
    hints.includes("zip")
  ) {
    return "postalCode";
  }

  if (hints.includes("otp")) {
    return "otp";
  }

  return "";
}

function valueLooksSensitiveByHint(
  value,
  hint
) {
  const text =
    String(value ?? "").trim();

  if (
    !text ||
    !hint
  ) {
    return false;
  }

  switch (hint) {
    case "email":
      return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(
        text
      );

    case "phone":
      return /^\+?\d[\d\s-]{7,}\d$/.test(
        text
      );

    case "username":
      return true;

    case "cardNumber":
      return /^(?:\d[ -]?){13,19}$/.test(
        text
      );

    case "otp":
      return /^\d{4,6}$/.test(
        text
      );

    case "password":
      return true;

    case "postalCode":
      return /^\d{3,10}(?:-\d{3,10})?$/.test(
        text
      );

    default:
      return false;
  }
}

function shouldMaskTextValueByHint(
  key,
  parent
) {
  const lowerKey =
    String(key || "").toLowerCase();

  if (
    ![
      "value",
      "input",
      "typedtext",
    ].includes(lowerKey)
  ) {
    return false;
  }

  return Boolean(
    getObjectSensitivityHint(parent)
  );
}

function sanitizeTraceForLlm(traceText) {
  try {
    const parsed =
      prepareTraceForLlm(
        JSON.parse(traceText)
      );

    const sanitizeValue = (
      value,
      key = "",
      parent = null
    ) => {
      if (Array.isArray(value)) {
        return value.map(
          (item) =>
            sanitizeValue(
              item,
              "",
              parent
            )
        );
      }

      if (
        value &&
        typeof value === "object"
      ) {
        return Object.fromEntries(
          Object.entries(value).map(
            ([
              entryKey,
              entryValue,
            ]) => [
              entryKey,
              sanitizeValue(
                entryValue,
                entryKey,
                value
              ),
            ]
          )
        );
      }

      if (
        typeof value !== "string"
      ) {
        return value;
      }

      const lowerKey =
        key.toLowerCase();

      if (
        lowerKey === "selector" &&
        value.startsWith("xpath=")
      ) {
        return value;
      }

      if (
        lowerKey === "locatorcode"
      ) {
        return value;
      }

      if (
        STRUCTURAL_TRACE_KEYS.has(
          lowerKey
        )
      ) {
        return maskSensitiveText(value);
      }

      if (
        URL_LIKE_KEYS.has(lowerKey)
      ) {
        return maskUrlForLlm(value);
      }

      if (
        SENSITIVE_KEY_PATTERN.test(
          lowerKey
        )
      ) {
        return maskByKey(
          lowerKey,
          value,
          extractTraceContext(parent)
        );
      }

      if (
        TEXT_LIKE_KEYS.has(lowerKey)
      ) {
        const hint =
          getObjectSensitivityHint(
            parent
          );

        if (
          shouldMaskTextValueByHint(
            lowerKey,
            parent
          )
        ) {
          return maskByKey(
            hint,
            value,
            extractTraceContext(parent)
          );
        }

        if (
          hint &&
          valueLooksSensitiveByHint(
            value,
            hint
          )
        ) {
          return maskByKey(
            hint,
            value,
            extractTraceContext(parent)
          );
        }

        return maskSensitiveText(value);
      }

      return maskSensitiveText(value);
    };

    return JSON.stringify(
      sanitizeValue(parsed),
      null,
      2
    );
  } catch {
    return maskSensitiveText(
      traceText
    );
  }
}

function compactActionValue(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function actionElementIdentity(action) {
  const element =
    action &&
    typeof action.element === "object"
      ? action.element
      : {};

  return [
    element.tagName,
    element.role,
    element.id,
    element.name,
    element.type,
    element.dataLabel,
    element.ariaLabel,
    element.placeholder,
    element.title,
  ]
    .map(compactActionValue)
    .join("|");
}

function actionFrameIdentity(action) {
  if (
    !action ||
    !Array.isArray(action.frameChain)
  ) {
    return "";
  }

  return action.frameChain
    .map((frame) =>
      compactActionValue(
        frame?.selector ||
        frame?.name ||
        frame?.title ||
        frame?.url
      )
    )
    .filter(Boolean)
    .join(">");
}

function actionIdentity(action) {
  if (
    !action ||
    typeof action !== "object"
  ) {
    return "";
  }

  return [
    compactActionValue(
      action.action
    ).toLowerCase(),
    compactActionValue(
      action.selector
    ),
    compactActionValue(
      action.text
    ),
    compactActionValue(
      action.value
    ),
    actionElementIdentity(action),
    action.isIframe
      ? "iframe"
      : "page",
    action.isShadowDom
      ? "shadow"
      : "",
    actionFrameIdentity(action),
  ].join("||");
}

function dedupeConsecutiveTraceActions(
  actions
) {
  if (!Array.isArray(actions)) {
    return actions;
  }

  const deduped = [];
  let previousIdentity = "";

  for (const action of actions) {
    const actionKind =
      compactActionValue(
        action?.action
      ).toLowerCase();

    if (actionKind === "click") {
      deduped.push(action);
      previousIdentity = "";
      continue;
    }

    const identity =
      actionIdentity(action);

    if (
      identity &&
      identity === previousIdentity
    ) {
      continue;
    }

    deduped.push(action);
    previousIdentity = identity;
  }

  return deduped;
}

function sameControl(left, right) {
  if (
    !left ||
    !right
  ) {
    return false;
  }

  return [
    compactActionValue(
      left.selector
    ),
    actionElementIdentity(left),
    left.isIframe
      ? "iframe"
      : "page",
    actionFrameIdentity(left),
  ].join("||") === [
    compactActionValue(
      right.selector
    ),
    actionElementIdentity(right),
    right.isIframe
      ? "iframe"
      : "page",
    actionFrameIdentity(right),
  ].join("||");
}

function isInputValueAction(action) {
  const kind =
    compactActionValue(
      action?.action
    ).toLowerCase();

  return [
    "input",
    "fill",
    "change",
  ].includes(kind);
}

function isInputPrepAction(action) {
  const kind =
    compactActionValue(
      action?.action
    ).toLowerCase();

  const element =
    action &&
    typeof action.element === "object"
      ? action.element
      : {};

  return (
    kind === "focus" &&
    compactActionValue(
      element.tagName
    ).toLowerCase() === "input"
  );
}

function removeInputPreparationNoise(
  actions
) {
  if (!Array.isArray(actions)) {
    return actions;
  }

  const cleaned = [];

  for (const action of actions) {
    if (isInputValueAction(action)) {
      while (
        cleaned.length &&
        isInputPrepAction(
          cleaned[
            cleaned.length - 1
          ]
        ) &&
        sameControl(
          cleaned[
            cleaned.length - 1
          ],
          action
        )
      ) {
        cleaned.pop();
      }
    }

    cleaned.push(action);
  }

  return cleaned;
}

function removeHtmlInputNoise(actions) {
  if (!Array.isArray(actions)) {
    return actions;
  }

  const cleaned = [];
  let removedHtmlInput = null;

  for (const action of actions) {
    if (
      isInputValueAction(action) &&
      isHtmlSnippetValue(
        action?.value
      )
    ) {
      removedHtmlInput = action;
      continue;
    }

    if (
      removedHtmlInput &&
      isInputValueAction(action) &&
      sameControl(
        removedHtmlInput,
        action
      ) &&
      compactActionValue(
        action?.value
      ) === ""
    ) {
      continue;
    }

    removedHtmlInput = null;
    cleaned.push(action);
  }

  return cleaned;
}

/*
 * Browser input listeners often record one input action
 * for every keystroke:
 *
 * A
 * Ar
 * Arv
 * Arvi
 * Arvind
 *
 * They all belong to the same control and represent one
 * final Playwright fill. Keeping every partial value causes
 * click reconstruction to consume generated fill statements
 * too early and shifts later click XPaths out of position.
 */
function collapseConsecutiveTraceInputs(
  actions
) {
  if (!Array.isArray(actions)) {
    return actions;
  }

  const collapsed = [];

  for (const action of actions) {
    if (
      isInputValueAction(action) &&
      collapsed.length
    ) {
      const previous =
        collapsed[
          collapsed.length - 1
        ];

      if (
        isInputValueAction(previous) &&
        sameControl(
          previous,
          action
        )
      ) {
        collapsed[
          collapsed.length - 1
        ] = action;

        continue;
      }
    }

    collapsed.push(action);
  }

  return collapsed;
}

function normalizeTraceActions(
  actions
) {
  if (!Array.isArray(actions)) {
    return actions;
  }

  return removeInputPreparationNoise(
    collapseConsecutiveTraceInputs(
      removeHtmlInputNoise(
        dedupeConsecutiveTraceActions(
          actions
        )
      )
    )
  );
}

function selectorFromAttribute(
  name,
  value
) {
  const text =
    compactActionValue(value);

  return text
    ? `[${name}=${JSON.stringify(text)}]`
    : "";
}

function cssAttribute(name, value) {
  const text =
    compactActionValue(value);

  return text
    ? `[${name}=${JSON.stringify(text)}]`
    : "";
}

function isGeneratedIdValue(value) {
  const text =
    compactActionValue(value);

  if (!text) {
    return false;
  }

  if (/^\d/.test(text)) {
    return true;
  }

  if (
    /^[a-f0-9_-]{8,}$/i.test(text) &&
    /\d/.test(text)
  ) {
    return true;
  }

  if (/\d{3,}/.test(text)) {
    return true;
  }

  return /^(?:pv_id|ember|react-select|headlessui|radix|mui|:r)/i.test(
    text
  );
}

function exactTextRegexLiteral(value) {
  return `/^${escapeRegExp(compactActionValue(value))}$/`;
}

function exactTextRegexObject(value) {
  return (
    `{ hasText: ` +
    `${exactTextRegexLiteral(value)} }`
  );
}

function containsTextRegexLiteral(value) {
  const text =
    compactActionValue(value);

  return text
    ? `/${escapeRegExp(text)}/i`
    : "/.*/";
}

function firstMeaningfulTextChunk(value) {
  const text =
    compactActionValue(value);

  if (!text) {
    return "";
  }

  return (
    text
      .split(/\s*,\s*/)[0]
      .trim() ||
    text
  );
}

function selectionRowLocatorForAction(
  action
) {
  if (
    !action ||
    typeof action !== "object"
  ) {
    return "";
  }

  const element =
    action.element &&
    typeof action.element === "object"
      ? action.element
      : {};

  const tagName =
    compactActionValue(
      element.tagName
    ).toLowerCase();

  const type =
    compactActionValue(
      element.type
    ).toLowerCase();

  const name =
    compactActionValue(
      element.name
    );

  const selector =
    compactActionValue(
      action.selector
    );

  const neighborText =
    firstMeaningfulTextChunk(
      action.neighborText
    );

  const isSelectionControl =
    type === "radio" ||
    type === "checkbox";

  const isDatagridSelection =
    tagName === "input" &&
    isSelectionControl &&
    neighborText &&
    (
      name ===
        "datagrid-radio-selection" ||
      name ===
        "datagrid-checkbox-selection" ||
      /^#?radio\.input\./i.test(
        selector
      ) ||
      /^#?checkbox\.input\./i.test(
        selector
      ) ||
      /^xpath=\/\/td\[\d+\]\/div\[\d+\]\/label\[\d+\]$/i.test(
        selector
      )
    );

  if (!isDatagridSelection) {
    return "";
  }

  return (
    `page.getByRole('row', { name: ` +
    `${containsTextRegexLiteral(neighborText)} ` +
    `}).getByRole('${type}')`
  );
}

function recordedXPathForAction(action) {
  if (
    !action ||
    typeof action !== "object"
  ) {
    return "";
  }

  const selector =
    typeof action.selector === "string"
      ? action.selector
      : "";

  return selector.startsWith("xpath=")
    ? selector
    : "";
}

function locatorHintForAction(action) {
  if (
    !action ||
    typeof action !== "object"
  ) {
    return "";
  }

  const actionKind =
    compactActionValue(
      action.action
    ).toLowerCase();

  if (actionKind === "click") {
    const xpath =
      recordedXPathForAction(action);

    return xpath
      ? `locator(${JSON.stringify(xpath)})`
      : "";
  }

  const element =
    action.element &&
    typeof action.element === "object"
      ? action.element
      : {};

  const tagName =
    compactActionValue(
      element.tagName
    ).toLowerCase();

  const explicitRole =
    compactActionValue(
      element.role
    ).toLowerCase();

  const inferredRole =
    tagName === "button"
      ? "button"
      : tagName === "a"
        ? "link"
        : "";

  const role =
    explicitRole ||
    inferredRole;

  const text =
    compactActionValue(
      action.text
    );

  const rowScopedRadioLocator =
    selectionRowLocatorForAction(
      action
    );

  if (rowScopedRadioLocator) {
    return rowScopedRadioLocator;
  }

  if (
    tagName === "li" &&
    element.dataLabel
  ) {
    return (
      `locator('li` +
      `${cssAttribute(
        "data-label",
        element.dataLabel
      )}')`
    );
  }

  if (element.testId) {
    return (
      `locator('` +
      `${selectorFromAttribute(
        "data-testid",
        element.testId
      )}')`
    );
  }

  if (element.dataTest) {
    return (
      `locator('` +
      `${selectorFromAttribute(
        "data-test",
        element.dataTest
      )}')`
    );
  }

  if (element.dataCy) {
    return (
      `locator('` +
      `${selectorFromAttribute(
        "data-cy",
        element.dataCy
      )}')`
    );
  }

  if (element.dataLabel) {
    return (
      `locator('` +
      `${selectorFromAttribute(
        "data-label",
        element.dataLabel
      )}')`
    );
  }

  if (
    element.ariaLabel &&
    tagName
  ) {
    return (
      `locator('${tagName}` +
      `${cssAttribute(
        "aria-label",
        element.ariaLabel
      )}')`
    );
  }

  const nameLocator =
    element.name &&
    tagName
      ? (
          `locator('${tagName}` +
          `${cssAttribute(
            "name",
            element.name
          )}` +
          `${cssAttribute(
            "type",
            element.type
          )}')`
        )
      : "";

  const idIsGenerated =
    isGeneratedIdValue(
      element.id
    );

  if (
    idIsGenerated &&
    nameLocator
  ) {
    return nameLocator;
  }

  if (
    idIsGenerated &&
    element.ariaLabel
  ) {
    return (
      `locator('` +
      `${selectorFromAttribute(
        "aria-label",
        element.ariaLabel
      )}')`
    );
  }

  if (
    element.id &&
    !idIsGenerated
  ) {
    return (
      `locator('#` +
      `${compactActionValue(
        element.id
      )}')`
    );
  }

  if (nameLocator) {
    return nameLocator;
  }

  if (element.id) {
    return (
      `locator('#` +
      `${compactActionValue(
        element.id
      )}')`
    );
  }

  if (
    role &&
    text
  ) {
    return (
      `getByRole('${role}', { name: ` +
      `${JSON.stringify(text)}, ` +
      `exact: true })`
    );
  }

  if (
    tagName === "div" &&
    isLikelyNavigationText(text)
  ) {
    return (
      `locator('div').filter(` +
      `${exactTextRegexObject(text)}` +
      `).first()`
    );
  }

  if (
    tagName &&
    text
  ) {
    return (
      `locator('${tagName}').filter(` +
      `${exactTextRegexObject(text)}` +
      `).first()`
    );
  }

  if (element.ariaLabel) {
    return (
      `locator('` +
      `${selectorFromAttribute(
        "aria-label",
        element.ariaLabel
      )}')`
    );
  }

  return compactActionValue(
    action.selector
  );
}

function isLikelyNavigationText(text) {
  return /^(my rewards|login|log in|cart|checkout|account|profile|orders|rewards)$/i.test(
    compactActionValue(text)
  );
}

function traceElementKey(action) {
  if (
    !action ||
    typeof action !== "object"
  ) {
    return "";
  }

  return [
    compactActionValue(
      action.selector
    ),
    compactActionValue(
      action.text
    ),
    actionElementIdentity(action),
    actionFrameIdentity(action),
  ]
    .filter(Boolean)
    .join(" | ");
}

function annotateTraceActions(actions) {
  if (!Array.isArray(actions)) {
    return actions;
  }

  return actions.map(
    (action, index) => {
      if (
        !action ||
        typeof action !== "object" ||
        action.action === "navigation"
      ) {
        return action;
      }

      const traceStep =
        index + 1;

      const elementKey =
        traceElementKey(action);

      const actionKind =
        compactActionValue(
          action.action
        ).toLowerCase();

      if (actionKind === "click") {
        const xpath =
          recordedXPathForAction(
            action
          );

        return {
          ...action,
          traceStep,
          elementKey,
          locatorCode: xpath
            ? (
                `page.locator(` +
                `${JSON.stringify(xpath)})`
              )
            : undefined,
          locatorHint: xpath
            ? (
                `locator(` +
                `${JSON.stringify(xpath)})`
              )
            : undefined,
        };
      }

      const locatorHint =
        locatorHintForAction(action);

      return {
        ...action,
        traceStep,
        elementKey,
        locatorHint:
          locatorHint ||
          undefined,
      };
    }
  );
}

function prepareTraceForLlm(parsedTrace) {
  if (!Array.isArray(parsedTrace)) {
    return parsedTrace;
  }

  return annotateTraceActions(
    normalizeTraceActions(
      parsedTrace
    )
  );
}

function removeHtmlFillCleanupLines(
  codegenText
) {
  const lines =
    String(codegenText || "")
      .split(/\r?\n/);

  const cleaned = [];
  let removedLocator = "";

  for (const line of lines) {
    const fillMatch = line.match(
      /^\s*await\s+(.+?)\.fill\(\s*(['"`])([\s\S]*)\2\s*\);\s*$/
    );

    if (
      fillMatch &&
      isHtmlSnippetValue(
        fillMatch[3]
      )
    ) {
      removedLocator =
        fillMatch[1].trim();

      continue;
    }

    const pressMatch = line.match(
      /^\s*await\s+(.+?)\.press\(\s*['"`]ControlOrMeta\+a['"`]\s*\);\s*$/
    );

    if (
      removedLocator &&
      pressMatch &&
      pressMatch[1].trim() ===
        removedLocator
    ) {
      continue;
    }

    removedLocator = "";
    cleaned.push(line);
  }

  return cleaned.join("\n");
}

function sanitizeCodegenForLlm(
  codegenText
) {
  let sanitized =
    maskSensitiveText(
      removeHtmlFillCleanupLines(
        codegenText
      )
    );

  sanitized = sanitized.replace(
    /((?:page|page\d+|[A-Za-z_$][\w$]*)\.goto\(\s*['"`])([^'"`]+)(['"`]\s*\))/g,
    (
      _match,
      prefix,
      url,
      suffix
    ) =>
      `${prefix}` +
      `${maskUrlForLlm(url)}` +
      `${suffix}`
  );

  sanitized = sanitized.replace(
    /(await\s+.+?\.(?:fill|pressSequentially|type)\(\s*['"`])([^'"`\n]+)(['"`]\s*\);)/g,
    (
      _match,
      prefix,
      value,
      suffix
    ) => {
      const hint =
        getSensitivityHintFromText(
          prefix
        );

      return (
        `${prefix}` +
        `${
          hint
            ? maskByKey(
                hint,
                value,
                prefix
              )
            : maskSensitiveText(
                value
              )
        }` +
        `${suffix}`
      );
    }
  );

  sanitized = sanitized.replace(
    /((?:authorization|cookie|x-api-key|api-key)\s*:\s*['"`])([^'"`\n]+)(['"`])/gi,
    (
      _match,
      prefix,
      value,
      suffix
    ) =>
      `${prefix}` +
      `${maskByKey(
        prefix,
        value
      )}` +
      `${suffix}`
  );

  sanitized = sanitized.replace(
    /((?:localStorage|sessionStorage)\.setItem\(\s*['"`][^'"`]+['"`]\s*,\s*['"`])([^'"`\n]+)(['"`]\s*\))/g,
    (
      _match,
      prefix,
      value,
      suffix
    ) =>
      `${prefix}` +
      `${maskSensitiveText(value)}` +
      `${suffix}`
  );

  sanitized = sanitized.replace(
    /(document\.cookie\s*=\s*['"`])([^'"`\n]+)(['"`])/g,
    (
      _match,
      prefix,
      value,
      suffix
    ) =>
      `${prefix}` +
      `${maskByKey(
        "cookie",
        value
      )}` +
      `${suffix}`
  );

  sanitized = sanitized.replace(
    /((?:password|pass|token|secret|otp|phone|mobile|email)\s*:\s*['"`])([^'"`\n]+)(['"`])/gi,
    (
      _match,
      prefix,
      value,
      suffix
    ) => {
      const keyMatch =
        prefix.match(
          /(?:password|pass|token|secret|otp|phone|mobile|email)/i
        );

      return (
        `${prefix}` +
        `${maskByKey(
          keyMatch
            ? keyMatch[0]
            : "",
          value
        )}` +
        `${suffix}`
      );
    }
  );

  return sanitized;
}

function enforceDataDriven(
  script,
  testDataModel = null
) {
  let updated = script;

  if (
    testDataModel?.placeholderMap
  ) {
    const entries =
      Object.entries(
        testDataModel.placeholderMap
      ).sort(
        (left, right) =>
          right[0].length -
          left[0].length
      );

    for (
      const [
        placeholder,
        key,
      ] of entries
    ) {
      updated =
        updated.replaceAll(
          placeholder,
          `testData.${key}`
        );
    }
  }

  updated = updated
    .replace(
      /\[MASKED_URL\]/g,
      "testData.url"
    )
    .replace(
      /https:\/\/site\.com\/path/g,
      "testData.url"
    )
    .replace(
      /\[MASKED_WEBSITE(?:_[A-Z0-9_]+)?\]/g,
      "testData.website"
    )
    .replace(
      /\[MASKED_(?:EMAIL|USERNAME)_SIGN_IN_NAME(?:_EMAIL)?\]/g,
      "testData.signInName"
    )
    .replace(
      /\[MASKED_USER(?:NAME)?\]/g,
      "testData.username"
    )
    .replace(
      /\[MASKED_PHONE\]/g,
      "testData.phone"
    )
    .replace(
      /\[MASKED_EMAIL\]/g,
      "testData.email"
    )
    .replace(
      /\[MASKED_PASSWORD\]/g,
      "testData.password"
    )
    .replace(
      /\[MASKED_CARD\]/g,
      "testData.cardNumber"
    )
    .replace(
      /\[MASKED_POSTAL_CODE\]/g,
      "testData.postalCode"
    )
    .replace(
      /\[MASKED_OTP\]/g,
      "testData.otp"
    );

  updated = updated.replace(
    /(['"`])(testData\.[A-Za-z_$][\w$]*)\1/g,
    "$2"
  );

  if (
    testDataModel?.records?.length
  ) {
    updated =
      rewriteGenericTestDataByLocator(
        updated,
        testDataModel.records
      );
  }

  if (!updated.includes("testData")) {
    updated =
      "import testData from " +
      "'../test-data.json';\n" +
      updated;
  }

  return updated;
}

function compactLocatorContext(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function contextMatchesLine(
  line,
  context
) {
  const compactLine =
    compactLocatorContext(line);

  const compactContext =
    compactLocatorContext(context);

  if (
    !compactLine ||
    !compactContext
  ) {
    return false;
  }

  const idMatch =
    compactContext.match(
      /#([A-Za-z0-9_-]+)/
    ) ||
    compactContext.match(
      /\bid\s*=\s*([A-Za-z0-9_-]+)/i
    );

  if (
    idMatch &&
    compactLine.includes(
      `#${idMatch[1]}`
    )
  ) {
    return true;
  }

  const attrMatch =
    compactContext.match(
      /\[(?:data-testid|data-test|data-cy|data-label|aria-label|name|placeholder|title)=["']([^"']+)["']\]/i
    );

  if (
    attrMatch &&
    compactLine.includes(
      attrMatch[1]
    )
  ) {
    return true;
  }

  const nameMatch =
    compactContext.match(
      /name\s*[:=]\s*['"`]?([^'"`]+?)(?:['"`]|\s{2,}|$)/i
    );

  if (
    nameMatch &&
    compactLine.includes(
      nameMatch[1].trim()
    )
  ) {
    return true;
  }

  return compactLine.includes(
    compactContext
  );
}

function rewriteGenericTestDataByLocator(
  script,
  records
) {
  const latestByFieldAndKey = [];
  const seen = new Set();

  for (
    let index =
      records.length - 1;
    index >= 0;
    index -= 1
  ) {
    const record =
      records[index];

    const identity =
      `${record.field}|${record.key}`;

    if (
      seen.has(identity) ||
      record.key === record.field
    ) {
      continue;
    }

    seen.add(identity);
    latestByFieldAndKey.push(
      record
    );
  }

  return script
    .split(/\r?\n/)
    .map((line) => {
      let updatedLine = line;

      for (
        const record of
        latestByFieldAndKey
      ) {
        if (
          !updatedLine.includes(
            `testData.${record.field}`
          ) ||
          !contextMatchesLine(
            updatedLine,
            record.context
          )
        ) {
          continue;
        }

        updatedLine =
          updatedLine.replaceAll(
            `testData.${record.field}`,
            `testData.${record.key}`
          );
      }

      return updatedLine;
    })
    .join("\n");
}

function addCandidate(
  target,
  value
) {
  const text =
    String(value ?? "").trim();

  if (!text) {
    return;
  }

  if (!target.includes(text)) {
    target.push(text);
  }
}

function addLatestCandidate(
  target,
  value
) {
  const text =
    String(value ?? "").trim();

  if (!text) {
    return;
  }

  const existingIndex =
    target.indexOf(text);

  if (existingIndex >= 0) {
    target.splice(
      existingIndex,
      1
    );
  }

  target.push(text);
}

function createCandidateBucket() {
  return {
    url: [],
    website: [],
    username: [],
    phone: [],
    email: [],
    password: [],
    cardNumber: [],
    postalCode: [],
    otp: [],
    records: [],
  };
}

function addFieldRecord(
  bucket,
  field,
  value,
  context = ""
) {
  const text =
    String(value ?? "").trim();

  if (
    !text ||
    !Object.prototype
      .hasOwnProperty.call(
        bucket,
        field
      )
  ) {
    return;
  }

  addLatestCandidate(
    bucket[field],
    text
  );

  const key =
    dataKeyForFieldContext(
      field,
      context
    );

  const placeholder =
    buildMaskedPlaceholder(
      field,
      context
    );

  const existingIndex =
    bucket.records.findIndex(
      (record) =>
        record.field === field &&
        record.key === key
    );

  const record = {
    field,
    key,
    value: text,
    context:
      String(context || ""),
    placeholder,
  };

  if (existingIndex >= 0) {
    bucket.records.splice(
      existingIndex,
      1
    );
  }

  bucket.records.push(record);
}

function addContextRecord(
  bucket,
  value,
  context = ""
) {
  const text =
    String(value ?? "").trim();

  if (!text) {
    return;
  }

  const key =
    dataKeyForFieldContext(
      "text",
      context
    );

  if (
    !isMeaningfulTestDataKey(
      key
    )
  ) {
    return;
  }

  const existingIndex =
    bucket.records.findIndex(
      (record) =>
        record.key === key
    );

  const record = {
    field: "text",
    key,
    value: text,
    context:
      String(context || ""),
    placeholder:
      buildMaskedPlaceholder(
        "text",
        context
      ),
  };

  if (existingIndex >= 0) {
    bucket.records.splice(
      existingIndex,
      1
    );
  }

  bucket.records.push(record);
}

function collectTraceCandidates(
  value,
  bucket =
    createCandidateBucket()
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTraceCandidates(
        item,
        bucket
      );
    }

    return bucket;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    for (
      const [
        key,
        entryValue,
      ] of Object.entries(value)
    ) {
      const lowerKey =
        String(key || "")
          .toLowerCase();

      if (
        typeof entryValue ===
        "string"
      ) {
        const hint =
          getObjectSensitivityHint(
            value
          );

        if (
          [
            "value",
            "input",
            "typedtext",
          ].includes(lowerKey) &&
          hint &&
          Object.prototype
            .hasOwnProperty.call(
              bucket,
              hint
            )
        ) {
          addFieldRecord(
            bucket,
            hint,
            entryValue,
            extractTraceContext(value)
          );

          continue;
        }

        if (
          [
            "value",
            "input",
            "typedtext",
          ].includes(lowerKey)
        ) {
          addContextRecord(
            bucket,
            entryValue,
            extractTraceContext(value)
          );

          continue;
        }

        if (
          lowerKey.includes(
            "website"
          )
        ) {
          addFieldRecord(
            bucket,
            "website",
            entryValue,
            extractTraceContext(value)
          );

          continue;
        }

        if (
          URL_LIKE_KEYS.has(
            lowerKey
          )
        ) {
          addCandidate(
            bucket.url,
            entryValue
          );
        }

        if (
          lowerKey.includes(
            "user name"
          ) ||
          lowerKey.includes(
            "username"
          ) ||
          lowerKey === "user"
        ) {
          addFieldRecord(
            bucket,
            "username",
            entryValue,
            extractTraceContext(value)
          );
        }

        if (
          lowerKey.includes("phone") ||
          lowerKey.includes("mobile")
        ) {
          addFieldRecord(
            bucket,
            "phone",
            entryValue,
            extractTraceContext(value)
          );
        }

        if (
          lowerKey.includes("email")
        ) {
          addFieldRecord(
            bucket,
            "email",
            entryValue,
            extractTraceContext(value)
          );
        }

        if (
          lowerKey.includes(
            "password"
          ) ||
          lowerKey === "pass"
        ) {
          addFieldRecord(
            bucket,
            "password",
            entryValue,
            extractTraceContext(value)
          );
        }

        if (
          lowerKey.includes("card") ||
          lowerKey.includes("credit") ||
          lowerKey === "cc"
        ) {
          addFieldRecord(
            bucket,
            "cardNumber",
            entryValue,
            extractTraceContext(value)
          );
        }

        if (
          lowerKey.includes(
            "postal"
          ) ||
          lowerKey.includes("zip")
        ) {
          addFieldRecord(
            bucket,
            "postalCode",
            entryValue,
            extractTraceContext(value)
          );
        }

        if (
          lowerKey.includes("otp")
        ) {
          addFieldRecord(
            bucket,
            "otp",
            entryValue,
            extractTraceContext(value)
          );
        }
      }

      collectTraceCandidates(
        entryValue,
        bucket
      );
    }
  }

  return bucket;
}

function collectCodegenCandidates(
  codegenText
) {
  const bucket =
    createCandidateBucket();

  const contextualQuotedValuePattern =
    /(.*(?:fill|pressSequentially|type)\(\s*['"`])([^'"`\n]+)(['"`]\s*\))/g;

  for (
    const match of
    codegenText.matchAll(
      contextualQuotedValuePattern
    )
  ) {
    const context =
      String(match[1] || "");

    const value =
      String(match[2] || "")
        .trim();

    if (!value) {
      continue;
    }

    const hint =
      getSensitivityHintFromText(
        context
      );

    if (
      hint &&
      Object.prototype
        .hasOwnProperty.call(
          bucket,
          hint
        )
    ) {
      addFieldRecord(
        bucket,
        hint,
        value,
        context
      );

      continue;
    }

    addContextRecord(
      bucket,
      value,
      context
    );

    if (
      bucket.records.some(
        (record) =>
          record.value === value &&
          record.context === context
      )
    ) {
      continue;
    }

    if (
      /^https?:\/\/\S+$/i.test(
        value
      ) ||
      /www\./i.test(value)
    ) {
      addFieldRecord(
        bucket,
        "website",
        value,
        context
      );

      continue;
    }

    if (
      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(
        value
      )
    ) {
      addFieldRecord(
        bucket,
        "email",
        value,
        context
      );
    }

    if (
      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+$/i.test(
        value
      )
    ) {
      addFieldRecord(
        bucket,
        "email",
        value,
        context
      );
    }

    if (
      /^(?:\d[ -]?){13,19}$/.test(
        value
      )
    ) {
      addFieldRecord(
        bucket,
        "cardNumber",
        value,
        context
      );
    }

    if (
      /^\+?\d[\d\s-]{7,}\d$/.test(
        value
      )
    ) {
      addFieldRecord(
        bucket,
        "phone",
        value,
        context
      );
    }

    if (
      /^\d{4,6}$/.test(value)
    ) {
      addFieldRecord(
        bucket,
        "otp",
        value,
        context
      );
    }
  }

  const gotoPattern =
    /page\.goto\(\s*['"`]([^'"`\\n]+)['"`]\s*\)/g;

  for (
    const match of
    codegenText.matchAll(
      gotoPattern
    )
  ) {
    addCandidate(
      bucket.url,
      match[1]
    );
  }

  const keyValuePatterns = [
    {
      field: "password",
      pattern:
        /password\s*[:=]\s*['"`]([^'"`\\n]+)['"`]/gi,
    },
    {
      field: "password",
      pattern:
        /pass\s*[:=]\s*['"`]([^'"`\\n]+)['"`]/gi,
    },
    {
      field: "username",
      pattern:
        /(?:user-name|username|user name|user)\s*[:=]\s*['"`]([^'"`\\n]+)['"`]/gi,
    },
    {
      field: "email",
      pattern:
        /email\s*[:=]\s*['"`]([^'"`\\n]+)['"`]/gi,
    },
    {
      field: "website",
      pattern:
        /(?:website|web site|weburl)\s*[:=]\s*['"`]([^'"`\\n]+)['"`]/gi,
    },
    {
      field: "phone",
      pattern:
        /(?:phone|mobile)\s*[:=]\s*['"`]([^'"`\\n]+)['"`]/gi,
    },
    {
      field: "cardNumber",
      pattern:
        /(?:card|credit|cc)\s*[:=]\s*['"`]([^'"`\\n]+)['"`]/gi,
    },
    {
      field: "postalCode",
      pattern:
        /(?:postal|zip)\s*[:=]\s*['"`]([^'"`\\n]+)['"`]/gi,
    },
    {
      field: "otp",
      pattern:
        /otp\s*[:=]\s*['"`]([^'"`\\n]+)['"`]/gi,
    },
  ];

  for (
    const {
      field,
      pattern,
    } of keyValuePatterns
  ) {
    for (
      const match of
      codegenText.matchAll(pattern)
    ) {
      addFieldRecord(
        bucket,
        field,
        match[1],
        match[0]
      );
    }
  }

  return bucket;
}

function firstMatch(...values) {
  for (
    const value of values.flat()
  ) {
    const text =
      String(value ?? "").trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function latestMatch(...values) {
  const flattened =
    values.flat();

  for (
    let index =
      flattened.length - 1;
    index >= 0;
    index -= 1
  ) {
    const text =
      String(
        flattened[index] ?? ""
      ).trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function buildTestDataPayload(
  traceText,
  codegenText
) {
  let traceCandidates =
    createCandidateBucket();

  try {
    traceCandidates =
      collectTraceCandidates(
        JSON.parse(traceText)
      );
  } catch {
    traceCandidates =
      createCandidateBucket();
  }

  const codegenCandidates =
    collectCodegenCandidates(
      codegenText
    );

  const payload = {
    url: firstMatch(
      codegenCandidates.url,
      getCanonicalStartUrl(
        traceText
      ),
      traceCandidates.url
    ),
    website: latestMatch(
      traceCandidates.website,
      codegenCandidates.website
    ),
    username: latestMatch(
      traceCandidates.username,
      codegenCandidates.username
    ),
    phone: latestMatch(
      traceCandidates.phone,
      codegenCandidates.phone
    ),
    email: latestMatch(
      traceCandidates.email,
      codegenCandidates.email
    ),
    password: latestMatch(
      traceCandidates.password,
      codegenCandidates.password
    ),
    cardNumber: latestMatch(
      traceCandidates.cardNumber,
      codegenCandidates.cardNumber
    ),
    otp: latestMatch(
      traceCandidates.otp,
      codegenCandidates.otp
    ),
  };

  for (
    const record of [
      ...traceCandidates.records,
      ...codegenCandidates.records,
    ]
  ) {
    if (
      record.key &&
      record.value
    ) {
      payload[record.key] =
        record.value;
    }
  }

  return payload;
}

function buildTestDataModel(
  traceText,
  codegenText
) {
  let traceCandidates =
    createCandidateBucket();

  try {
    traceCandidates =
      collectTraceCandidates(
        JSON.parse(traceText)
      );
  } catch {
    traceCandidates =
      createCandidateBucket();
  }

  const codegenCandidates =
    collectCodegenCandidates(
      codegenText
    );

  const payload =
    buildTestDataPayload(
      traceText,
      codegenText
    );

  const records = [
    ...traceCandidates.records,
    ...codegenCandidates.records,
  ].filter(
    (record) =>
      record.key &&
      record.value &&
      Object.prototype
        .hasOwnProperty.call(
          payload,
          record.key
        )
  );

  const placeholderMap =
    Object.fromEntries(
      records.map((record) => [
        record.placeholder,
        record.key,
      ])
    );

  return {
    payload,
    records,
    placeholderMap,
  };
}

function getUsedTestDataKeys(
  scriptText
) {
  const keys = new Set();

  for (
    const match of
    scriptText.matchAll(
      /testData\.([A-Za-z_$][\w$]*)/g
    )
  ) {
    keys.add(match[1]);
  }

  return [...keys];
}

function pickUsedFields(
  payload,
  scriptText
) {
  const usedKeys =
    getUsedTestDataKeys(
      scriptText
    );

  return Object.fromEntries(
    usedKeys
      .filter((key) =>
        Object.prototype
          .hasOwnProperty.call(
            payload,
            key
          )
      )
      .map((key) => [
        key,
        payload[key],
      ])
  );
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

function getTestDataPath(scriptPath) {
  const scriptDir =
    path.dirname(scriptPath);

  const suiteName =
    path
      .basename(scriptDir)
      .toLowerCase();

  if (
    suiteName === "sanity" ||
    suiteName === "regression"
  ) {
    return path.resolve(
      scriptDir,
      "..",
      "test-data.json"
    );
  }

  return path.resolve(
    scriptDir,
    "test-data.json"
  );
}

function getTestDataImportPath(
  scriptPath
) {
  const scriptDir =
    path.dirname(scriptPath);

  const suiteName =
    path
      .basename(scriptDir)
      .toLowerCase();

  return (
    suiteName === "sanity" ||
    suiteName === "regression"
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
    `'${getTestDataImportPath(scriptPath)}';`;

  const withoutTestDataImports =
    scriptText
      .replace(
        /^\s*import\s+testData\s+from\s+['"][^'"]*(?:test-data|testData)\.json['"];?\s*$/gmi,
        ""
      )
      .trimStart();

  return (
    `${importLine}\n` +
    `${withoutTestDataImports}`
  );
}

function readJsonObject(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const value =
      JSON.parse(
        fs.readFileSync(
          filePath,
          "utf8"
        )
      );

    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    )
      ? value
      : {};
  } catch {
    return {};
  }
}

function valuesMatch(left, right) {
  return (
    JSON.stringify(left) ===
    JSON.stringify(right)
  );
}

function isBlankValue(value) {
  return (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  );
}

function isMeaningfulTestDataKey(
  key
) {
  const text =
    String(key || "").trim();

  if (
    !text ||
    /^\d/.test(text)
  ) {
    return false;
  }

  if (isGeneratedIdValue(text)) {
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
  ].includes(lower);
}

function nextAvailableDataKey(
  existing,
  baseKey
) {
  let index = 2;
  let candidate =
    `${baseKey}${index}`;

  while (
    Object.prototype
      .hasOwnProperty.call(
        existing,
        candidate
      )
  ) {
    index += 1;
    candidate =
      `${baseKey}${index}`;
  }

  return candidate;
}

function escapeRegExp(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function replaceTestDataKey(
  scriptText,
  fromKey,
  toKey
) {
  return scriptText.replace(
    new RegExp(
      `\\btestData\\.` +
      `${escapeRegExp(fromKey)}` +
      `\\b`,
      "g"
    ),
    `testData.${toKey}`
  );
}

function normalizeBracketTestDataAccess(
  scriptText
) {
  let updated =
    String(scriptText || "");

  updated = updated.replace(
    /testData\[(["'])([A-Za-z0-9_$-]+)\1\]/g,
    (
      _match,
      _quote,
      key
    ) => {
      const rawKey =
        String(key || "");

      const lowerKey =
        rawKey.toLowerCase();

      if (
        lowerKey === "email" ||
        /email$/.test(lowerKey)
      ) {
        return "testData.email";
      }

      if (
        lowerKey === "password" ||
        /password$/.test(lowerKey) ||
        /pass$/.test(lowerKey)
      ) {
        return "testData.password";
      }

      if (
        lowerKey === "phone" ||
        /phone$/.test(lowerKey) ||
        /mobile$/.test(lowerKey)
      ) {
        return "testData.phone";
      }

      if (
        lowerKey === "postalcode" ||
        lowerKey === "postal_code" ||
        /postal$/.test(lowerKey) ||
        /zip$/.test(lowerKey)
      ) {
        return "testData.postalCode";
      }

      if (
        lowerKey === "username" ||
        /username$/.test(lowerKey) ||
        /user_name$/.test(lowerKey) ||
        /signinname$/.test(lowerKey)
      ) {
        return "testData.username";
      }

      if (
        lowerKey === "website" ||
        /website$/.test(lowerKey) ||
        /web$/.test(lowerKey)
      ) {
        return "testData.website";
      }

      if (
        lowerKey === "cardnumber" ||
        /card$/.test(lowerKey) ||
        /credit$/.test(lowerKey) ||
        /cc$/.test(lowerKey)
      ) {
        return "testData.cardNumber";
      }

      if (
        lowerKey === "otp" ||
        /otp$/.test(lowerKey)
      ) {
        return "testData.otp";
      }

      if (
        lowerKey === "url" ||
        /url$/.test(lowerKey)
      ) {
        return "testData.url";
      }

      return `testData.${rawKey}`;
    }
  );

  return updated;
}

function pickPreferredSemanticTestDataKey(
  rawKey,
  payload = {}
) {
  const lowerKey =
    String(rawKey || "")
      .toLowerCase();

  const preferredCandidates = [];

  if (
    lowerKey === "url" ||
    /url$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "url"
    );
  }

  if (
    lowerKey === "email" ||
    /email$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "email"
    );
  }

  if (
    lowerKey === "password" ||
    /password$/.test(lowerKey) ||
    /pass$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "password"
    );
  }

  if (
    lowerKey === "phone" ||
    /phone$/.test(lowerKey) ||
    /mobile$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "phone"
    );
  }

  if (
    lowerKey === "website" ||
    /website$/.test(lowerKey) ||
    /web$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "customerWebsite",
      "website"
    );
  }

  if (
    lowerKey === "postalcode" ||
    lowerKey === "postal_code" ||
    /postal$/.test(lowerKey) ||
    /zip$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "postalCodeRequired",
      "postalCode"
    );
  }

  if (
    lowerKey === "username" ||
    /username$/.test(lowerKey) ||
    /user_name$/.test(lowerKey) ||
    /signinname$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "username"
    );
  }

  if (
    lowerKey === "cardnumber" ||
    /card$/.test(lowerKey) ||
    /credit$/.test(lowerKey) ||
    /cc$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "cardNumber"
    );
  }

  if (
    lowerKey === "otp" ||
    /otp$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "otp"
    );
  }

  if (
    lowerKey === "city" ||
    /city$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "addressCity",
      "city"
    );
  }

  if (
    lowerKey === "company" ||
    /company$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "addressCompany",
      "company"
    );
  }

  if (
    lowerKey === "attention" ||
    /attention$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "addressAttention",
      "attention"
    );
  }

  if (
    lowerKey.includes(
      "addresslineone"
    ) ||
    lowerKey.includes(
      "address_line_one"
    ) ||
    /lineone$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "addressLineOne"
    );
  }

  if (
    lowerKey.includes(
      "addresslinetwo"
    ) ||
    lowerKey.includes(
      "address_line_two"
    ) ||
    /linetwo$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "addressLineTwo"
    );
  }

  if (
    lowerKey.includes(
      "addresslabel"
    ) ||
    /label$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "addressLabel"
    );
  }

  if (
    lowerKey.includes(
      "customername"
    ) ||
    /name$/.test(lowerKey)
  ) {
    preferredCandidates.push(
      "customerName"
    );
  }

  for (
    const candidate of
    preferredCandidates
  ) {
    if (
      candidate &&
      Object.prototype
        .hasOwnProperty.call(
          payload,
          candidate
        ) &&
      isMeaningfulTestDataKey(
        candidate
      )
    ) {
      return candidate;
    }
  }

  for (
    const candidate of
    preferredCandidates
  ) {
    if (
      candidate &&
      isMeaningfulTestDataKey(
        candidate
      )
    ) {
      return candidate;
    }
  }

  if (
    isMeaningfulTestDataKey(
      rawKey
    )
  ) {
    return rawKey;
  }

  return "";
}

function normalizeInvalidTestDataAccess(
  scriptText,
  payload = {}
) {
  return String(
    scriptText || ""
  ).replace(
    /testData\.([A-Za-z0-9_$][A-Za-z0-9_$]*)/g,
    (
      match,
      key
    ) => {
      const rawKey =
        String(key || "");

      const isValidJsKey =
        /^[A-Za-z_$][\w$]*$/.test(
          rawKey
        );

      const keyIsMeaningful =
        isMeaningfulTestDataKey(
          rawKey
        );

      const candidate =
        pickPreferredSemanticTestDataKey(
          rawKey,
          payload
        );

      if (
        isValidJsKey &&
        keyIsMeaningful &&
        !isGeneratedIdValue(
          rawKey
        )
      ) {
        return match;
      }

      if (candidate) {
        return `testData.${candidate}`;
      }

      return match;
    }
  );
}

function rewriteLiteralFormValuesToTestData(
  scriptText,
  payload
) {
  let updated =
    scriptText;

  const entries =
    Object.entries(payload)
      .filter(
        ([, value]) =>
          !isBlankValue(value)
      )
      .sort(
        (left, right) =>
          String(right[1]).length -
          String(left[1]).length
      );

  for (
    const [key, value] of entries
  ) {
    const literal =
      escapeRegExp(
        String(value)
      );

    const replacement =
      `testData.${key}`;

    const methodPattern =
      new RegExp(
        `(\\.(?:fill|pressSequentially|type)` +
        `\\(\\s*)(['"\`])` +
        `${literal}\\2(\\s*\\))`,
        "g"
      );

    updated = updated.replace(
      methodPattern,
      `$1${replacement}$3`
    );
  }

  return updated;
}

function extractTextScopedButtonLocators(
  codegenText
) {
  const locators = [];

  const patterns = [
    /page\.getByRole\(\s*['"]button['"]\s*\)\.filter\(\s*\{\s*hasText:\s*(['"])([^'"]+)\1\s*\}\s*\)/g,
    /page\.locator\(\s*(['"])button\1\s*\)\.filter\(\s*\{\s*hasText:\s*(['"])([^'"]+)\2\s*\}\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (
      const match of
      String(
        codegenText || ""
      ).matchAll(pattern)
    ) {
      const text =
        compactActionValue(
          match[2] ||
          match[3]
        );

      if (!text) {
        continue;
      }

      locators.push(
        `page.getByRole('button').filter(` +
        `{ hasText: ${JSON.stringify(text)} })`
      );
    }
  }

  return [
    ...new Set(locators),
  ];
}

function rewriteAnonymousButtonsFromCodegen(
  scriptText,
  codegenText
) {
  const textScopedButtonLocators =
    extractTextScopedButtonLocators(
      codegenText
    );

  if (
    !textScopedButtonLocators.length
  ) {
    return scriptText;
  }

  let updated = scriptText;

  for (
    const locator of
    textScopedButtonLocators
  ) {
    updated = updated.replace(
      /page\.getByRole\(\s*['"]button['"]\s*\)\.first\(\)/,
      locator
    );

    updated = updated.replace(
      /page\.locator\(\s*['"]button['"]\s*\)\.first\(\)/,
      locator
    );
  }

  return updated;
}

function rewriteKnownDuplicateButtonLocators(
  scriptText
) {
  return String(
    scriptText || ""
  ).replace(
    /page\.getByRole\(\s*['"]button['"]\s*,\s*\{\s*name:\s*(['"])New Address\1\s*,\s*exact:\s*true\s*\}\s*\)(?!\s*\.\s*(?:first|nth|last)\s*\()/g,
    "page.getByRole('button', " +
    "{ name: 'New Address', exact: true })" +
    ".nth(1)"
  );
}

function rewriteDatagridSelectionLocators(
  scriptText,
  traceText
) {
  let updated =
    String(scriptText || "");

  let traceActions = [];

  try {
    const parsedTrace =
      JSON.parse(traceText);

    traceActions =
      Array.isArray(parsedTrace)
        ? parsedTrace
        : [];
  } catch {
    return updated;
  }

  for (
    const action of traceActions
  ) {
    const element =
      action &&
      typeof action === "object" &&
      typeof action.element ===
        "object"
        ? action.element
        : null;

    if (
      !element ||
      compactActionValue(
        element.tagName
      ).toLowerCase() !== "input"
    ) {
      continue;
    }

    const type =
      compactActionValue(
        element.type
      ).toLowerCase();

    if (
      type !== "radio" &&
      type !== "checkbox"
    ) {
      continue;
    }

    const replacement =
      selectionRowLocatorForAction(
        action
      );

    const selector =
      compactActionValue(
        action.selector
      );

    const id =
      compactActionValue(
        element.id
      );

    if (
      !replacement ||
      !id
    ) {
      continue;
    }

    const escapedId =
      escapeRegExp(id);

    const idLocatorPatterns = [
      new RegExp(
        `page\\.locator\\(` +
        `\\s*(['"])#` +
        `${escapedId}\\1\\s*\\)`,
        "g"
      ),
      new RegExp(
        `page\\.locator\\(` +
        `\\s*(['"])\\[id=` +
        `${JSON.stringify(id)}` +
        `\\]\\1\\s*\\)`,
        "g"
      ),
    ];

    for (
      const pattern of
      idLocatorPatterns
    ) {
      updated =
        updated.replace(
          pattern,
          replacement
        );
    }

    if (
      /^xpath=\/\/td\[\d+\]\/div\[\d+\]\/label\[\d+\]$/i.test(
        selector
      )
    ) {
      updated = updated.replace(
        /page\.locator\(\s*(['"])(?:#|\[id=)[^'"]+?\1\s*\)/g,
        replacement
      );
    }

    const actionKind =
      compactActionValue(
        action.action
      ).toLowerCase();

    if (
      type === "checkbox" &&
      [
        "checkbox",
        "input",
        "check",
        "change",
      ].includes(actionKind)
    ) {
      updated = updated.replace(
        new RegExp(
          `(await\\s+` +
          `${escapeRegExp(replacement)})` +
          `(?:\\.first\\(\\))?` +
          `\\.click\\(\\);`,
          "g"
        ),
        "$1.check();"
      );
    }

    if (
      type === "radio" &&
      [
        "radio",
        "input",
        "check",
        "change",
      ].includes(actionKind)
    ) {
      updated = updated.replace(
        new RegExp(
          `(await\\s+` +
          `${escapeRegExp(replacement)})` +
          `(?:\\.first\\(\\))?` +
          `\\.click\\(\\);`,
          "g"
        ),
        "$1.check();"
      );
    }
  }

  return updated;
}

function inferSelectionRoleFromIdentifier(
  identifier
) {
  const text =
    compactActionValue(
      identifier
    ).toLowerCase();

  if (!text) {
    return "";
  }

  if (
    /(?:checkbox|check)/.test(
      text
    )
  ) {
    return "checkbox";
  }

  if (/(?:radio)/.test(text)) {
    return "radio";
  }

  if (
    /(?:combobox|dropdown|select)/.test(
      text
    )
  ) {
    return "combobox";
  }

  return "";
}

function isSemanticSelectionLocatorExpression(
  expression,
  role
) {
  const text =
    String(expression || "");

  if (!text) {
    return false;
  }

  const roleToken =
    String(role || "")
      .toLowerCase();

  if (!roleToken) {
    return false;
  }

  return (
    new RegExp(
      `getByRole\\(` +
      `\\s*['"]` +
      `${escapeRegExp(roleToken)}` +
      `['"]`,
      "i"
    ).test(text) ||
    new RegExp(
      `getByRole\\(` +
      `\\s*['"][^'"]+['"]` +
      `\\s*,\\s*\\{[^}]*name:`,
      "i"
    ).test(text) ||
    /getByLabel\(/i.test(text)
  );
}

function rewriteSemanticSelectionLocators(
  scriptText,
  traceText,
  codegenText
) {
  const lines =
    String(scriptText || "")
      .split(/\r?\n/);

  const updated = [];

  const declarationPattern =
    /^(\s*)(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);?$/;

  for (const rawLine of lines) {
    const line =
      String(rawLine || "");

    const match =
      declarationPattern.exec(
        line
      );

    if (!match) {
      updated.push(line);
      continue;
    }

    const indent =
      match[1] || "";

    const keyword =
      match[2];

    const identifier =
      match[3];

    const expression =
      match[4].trim();

    const role =
      inferSelectionRoleFromIdentifier(
        identifier
      );

    const isWeakSelectionLocator =
      role &&
      /page\.locator\(/i.test(
        expression
      ) &&
      (
        /testData\./i.test(
          expression
        ) ||
        /#|\[id=|input\[|xpath=/i.test(
          expression
        ) ||
        /page\.locator\(\s*['"][^'"]+['"]\s*\)/i.test(
          expression
        )
      );

    if (!isWeakSelectionLocator) {
      updated.push(line);
      continue;
    }

    const replacement =
      chooseLocatorExpressionForIdentifier(
        identifier,
        line,
        traceText,
        codegenText
      );

    if (
      !replacement ||
      !isSemanticSelectionLocatorExpression(
        replacement,
        role
      )
    ) {
      updated.push(line);
      continue;
    }

    updated.push(
      `${indent}${keyword} ` +
      `${identifier} = ` +
      `${replacement};`
    );
  }

  return updated.join("\n");
}

function getMaskedArtifactPaths(
  outputPath
) {
  const maskedDir =
    path.join(
      ROOT,
      "tests",
      "masked"
    );

  const baseName =
    path.basename(
      outputPath,
      path.extname(outputPath)
    );

  return {
    tracePath:
      path.join(
        maskedDir,
        `${baseName}.masked.trace.json`
      ),
    codegenPath:
      path.join(
        maskedDir,
        `${baseName}.masked.codegen.js`
      ),
  };
}

function cleanExistingMaskedArtifacts(
  maskedDir
) {
  if (!fs.existsSync(maskedDir)) {
    return;
  }

  for (
    const item of
    fs.readdirSync(maskedDir)
  ) {
    if (
      item.endsWith(
        ".masked.trace.json"
      ) ||
      item.endsWith(
        ".masked.codegen.js"
      )
    ) {
      fs.unlinkSync(
        path.join(
          maskedDir,
          item
        )
      );
    }
  }
}

function writeMaskedArtifacts(
  outputPath,
  sanitizedTrace,
  sanitizedCodegen
) {
  const paths =
    getMaskedArtifactPaths(
      outputPath
    );

  const maskedDir =
    path.dirname(paths.tracePath);

  fs.mkdirSync(
    maskedDir,
    { recursive: true }
  );

  cleanExistingMaskedArtifacts(
    maskedDir
  );

  fs.writeFileSync(
    paths.tracePath,
    `${sanitizedTrace}\n`,
    "utf8"
  );

  fs.writeFileSync(
    paths.codegenPath,
    `${sanitizedCodegen}\n`,
    "utf8"
  );

  return paths;
}

function writeTestDataFile(
  scriptPath,
  traceText,
  codegenText,
  scriptText,
  testDataModel = null
) {
  const testDataPath =
    getTestDataPath(scriptPath);

  const payload =
    pickUsedFields(
      (
        testDataModel ||
        buildTestDataModel(
          traceText,
          codegenText
        )
      ).payload,
      scriptText
    );

  const mergedPayload =
    readJsonObject(testDataPath);

  let updatedScript =
    normalizeImportForTestData(
      scriptText,
      scriptPath
    );

  for (
    const [key, value] of
    Object.entries(payload)
  ) {
    const exactKeyExists =
      Object.prototype
        .hasOwnProperty.call(
          mergedPayload,
          key
        );

    const existingMatchingKey =
      exactKeyExists
        ? key
        : Object.keys(
            mergedPayload
          ).find(
            (candidateKey) =>
              valuesMatch(
                mergedPayload[
                  candidateKey
                ],
                value
              )
          );

    const keyIsMeaningful =
      isMeaningfulTestDataKey(
        key
      );

    const existingIsMeaningful =
      existingMatchingKey
        ? isMeaningfulTestDataKey(
            existingMatchingKey
          )
        : false;

    if (
      existingMatchingKey &&
      existingMatchingKey !== key
    ) {
      if (
        keyIsMeaningful &&
        !existingIsMeaningful
      ) {
        delete mergedPayload[
          existingMatchingKey
        ];

        mergedPayload[key] =
          value;

        updatedScript =
          replaceTestDataKey(
            updatedScript,
            existingMatchingKey,
            key
          );

        continue;
      }

      updatedScript =
        replaceTestDataKey(
          updatedScript,
          key,
          existingMatchingKey
        );

      continue;
    }

    if (
      !Object.prototype
        .hasOwnProperty.call(
          mergedPayload,
          key
        )
    ) {
      mergedPayload[key] =
        value;

      continue;
    }

    if (
      isBlankValue(
        mergedPayload[key]
      ) &&
      !isBlankValue(value)
    ) {
      mergedPayload[key] =
        value;

      continue;
    }

    if (
      valuesMatch(
        mergedPayload[key],
        value
      )
    ) {
      continue;
    }

    const targetKey =
      existingMatchingKey ||
      nextAvailableDataKey(
        mergedPayload,
        key
      );

    if (!existingMatchingKey) {
      mergedPayload[targetKey] =
        value;
    }

    updatedScript =
      replaceTestDataKey(
        updatedScript,
        key,
        targetKey
      );
  }

  const missingKeys =
    getMissingTestDataKeys(
      updatedScript,
      mergedPayload
    );

  if (missingKeys.length) {
    throw new Error(
      `Generated script references missing ` +
      `testData keys in ${testDataPath}: ` +
      `${missingKeys.join(", ")}.`
    );
  }

  fs.mkdirSync(
    path.dirname(testDataPath),
    { recursive: true }
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
    scriptText: updatedScript,
  };
}

function countMeaningfulTraceActions(
  traceText
) {
  const actions =
    parseTraceActions(traceText);

  return actions.filter(
    (action) => {
      if (
        !action ||
        typeof action !== "object"
      ) {
        return false;
      }

      const kind =
        String(
          action.action || ""
        ).toLowerCase();

      return [
        "navigation",
        "click",
        "input",
        "fill",
        "press",
        "check",
        "uncheck",
        "select",
        "change",
        "submit",
      ].includes(kind);
    }
  ).length;
}

function countMeaningfulCodegenSteps(
  codegenText
) {
  const matches =
    codegenText.match(
      /await\s+.+?\.(goto|click|fill|pressSequentially|type|check|uncheck|selectOption|hover)\(/g
    );

  return matches
    ? matches.length
    : 0;
}

function assertRefineInputsAreUsable({
  traceText,
  codegenText,
  sanitizedTrace,
  sanitizedCodegen,
  tracePath,
  codegenPath,
}) {
  const rawTraceActions =
    countMeaningfulTraceActions(
      traceText
    );

  const maskedTraceActions =
    countMeaningfulTraceActions(
      sanitizedTrace
    );

  const rawCodegenSteps =
    countMeaningfulCodegenSteps(
      codegenText
    );

  const maskedCodegenSteps =
    countMeaningfulCodegenSteps(
      sanitizedCodegen
    );

  if (
    rawTraceActions === 0 &&
    rawCodegenSteps <= 1
  ) {
    throw new Error(
      `Recorded flow is too small to refine. ` +
      `Trace actions: ${rawTraceActions}, ` +
      `codegen steps: ${rawCodegenSteps}. ` +
      `Check the recorder output in ` +
      `${tracePath} and ${codegenPath}.`
    );
  }

  if (
    maskedTraceActions === 0 &&
    maskedCodegenSteps <= 1
  ) {
    throw new Error(
      `Masked inputs are too small to refine safely. ` +
      `Masked trace actions: ${maskedTraceActions}, ` +
      `masked codegen steps: ${maskedCodegenSteps}. ` +
      `This usually means the recording captured ` +
      `a blank or incomplete browser flow.`
    );
  }
}

function parseTraceActions(traceText) {
  try {
    const parsed =
      JSON.parse(traceText);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function isTopLevelNavigation(action) {
  return (
    action &&
    action.action === "navigation" &&
    !action.isIframe &&
    !action.frameChain?.length
  );
}

function isUsefulNavigationUrl(rawUrl) {
  if (
    !rawUrl ||
    typeof rawUrl !== "string"
  ) {
    return false;
  }

  if (
    rawUrl === "about:blank" ||
    rawUrl === "about:srcdoc"
  ) {
    return false;
  }

  try {
    const url =
      new URL(rawUrl);

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
      new URL(rawUrl);

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
      const key of dropParams
    ) {
      url.searchParams.delete(
        key
      );
    }

    const normalized =
      `${url.origin}${url.pathname}`;

    const query =
      url.searchParams.toString();

    return query
      ? `${normalized}?${query}`
      : normalized;
  } catch {
    return rawUrl;
  }
}

function getCanonicalStartUrl(
  traceText
) {
  const actions =
    parseTraceActions(traceText);

  const navigation =
    actions.find(
      (action) =>
        isTopLevelNavigation(
          action
        ) &&
        isUsefulNavigationUrl(
          action.url
        )
    );

  return navigation
    ? normalizeNavigationUrl(
        navigation.url
      )
    : "";
}

function listFilesByPrefix(
  dirPath,
  prefix,
  suffix
) {
  if (
    !fs.existsSync(dirPath) ||
    !fs
      .statSync(dirPath)
      .isDirectory()
  ) {
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter(
      (name) =>
        name.startsWith(prefix) &&
        name.endsWith(suffix)
    )
    .sort(
      (left, right) =>
        right.localeCompare(left)
    )
    .map(
      (name) =>
        path.join(
          dirPath,
          name
        )
    );
}

function getArtifactStamp(
  filePath,
  prefix,
  suffix
) {
  const base =
    path.basename(filePath);

  if (
    !base.startsWith(prefix) ||
    !base.endsWith(suffix)
  ) {
    return "";
  }

  return base.slice(
    prefix.length,
    base.length - suffix.length
  );
}

function getLatestArtifactPairFromDirectory(
  dirPath
) {
  const codegenFiles =
    listFilesByPrefix(
      dirPath,
      "codegen-",
      ".js"
    );

  const traceFiles =
    listFilesByPrefix(
      dirPath,
      "actions-",
      ".json"
    );

  if (
    !codegenFiles.length ||
    !traceFiles.length
  ) {
    return null;
  }

  const tracesByStamp =
    new Map(
      traceFiles.map(
        (filePath) => [
          getArtifactStamp(
            filePath,
            "actions-",
            ".json"
          ),
          filePath,
        ]
      )
    );

  for (
    const codegenPath of
    codegenFiles
  ) {
    const stamp =
      getArtifactStamp(
        codegenPath,
        "codegen-",
        ".js"
      );

    const tracePath =
      tracesByStamp.get(stamp);

    if (tracePath) {
      return {
        stamp,
        tracePath,
        codegenPath,
      };
    }
  }

  return {
    stamp:
      getArtifactStamp(
        codegenFiles[0],
        "codegen-",
        ".js"
      ),
    tracePath:
      traceFiles[0],
    codegenPath:
      codegenFiles[0],
  };
}

function sanitizeBaseName(value) {
  const normalized =
    String(value || "")
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
      );

  return normalized || "";
}

function buildOutputPath(
  outputValue,
  fallbackName
) {
  const resolvedOutput =
    resolveFromRoot(
      outputValue
    );

  const shouldTreatAsDirectory =
    outputValue.endsWith("/") ||
    outputValue.endsWith("\\") ||
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

  if (shouldTreatAsDirectory) {
    const safeBase =
      sanitizeBaseName(
        fallbackName
      ) ||
      `generated-${Date.now()}`;

    return path.join(
      resolvedOutput,
      `${safeBase}.spec.js`
    );
  }

  if (
    path.extname(
      resolvedOutput
    )
  ) {
    return resolvedOutput;
  }

  const safeBase =
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
    `${safeBase}.spec.js`
  );
}

function resolvePythonExecutable() {
  const candidates =
    process.platform === "win32"
      ? [
          path.join(
            ROOT,
            ".venv",
            "Scripts",
            "python.exe"
          ),
          "python",
        ]
      : [
          path.join(
            ROOT,
            ".venv",
            "bin",
            "python"
          ),
          "python3",
          "python",
        ];

  return candidates.find(
    (candidate) =>
      fs.existsSync(candidate) ||
      !candidate.includes(
        path.sep
      )
  );
}

function persistGeneratedScripts({
  tracePath,
  codegenPath,
  outputPath,
  testName,
}) {
  const scriptPath =
    path.join(
      ROOT,
      "src",
      "vector_store",
      "store_generated_scripts.py"
    );

  const args = [
    scriptPath,
    `--trace=${tracePath}`,
    `--codegen=${codegenPath}`,
    `--generated=${outputPath}`,
    `--test-name=${testName}`,
  ];

  const pythonExecutable =
    resolvePythonExecutable();

  const result = spawnSync(
    pythonExecutable,
    args,
    {
      cwd: ROOT,
      env: process.env,
      encoding: "utf8",
    }
  );

  if (result.status !== 0) {
    const details = [
      result.stderr,
      result.stdout,
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    throw new Error(
      "Failed to save generated scripts " +
      "to ChromaDB." +
      (
        details
          ? `\n${details}`
          : ""
      )
    );
  }

  if (result.stdout.trim()) {
    console.log(
      result.stdout.trim()
    );
  }
}

function deriveTestName(codegenPath) {
  return (
    path
      .basename(
        codegenPath,
        path.extname(
          codegenPath
        )
      )
      .replace(
        "codegen-",
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

function formatAllowedTestDataKeys(
  testDataModel
) {
  const keys =
    Object.keys(
      (
        testDataModel &&
        testDataModel.payload
      ) ||
      {}
    ).sort();

  if (!keys.length) {
    return (
      "ALLOWED TESTDATA KEYS:\n" +
      "- testData.url"
    );
  }

  return [
    "ALLOWED TESTDATA KEYS:",
    ...keys.map(
      (key) =>
        `- testData.${key}`
    ),
  ].join("\n");
}

function collectRecordedClickXPaths(
  traceText
) {
  const actions =
    parseTraceActions(traceText);

  const clickActions =
    actions
      .map(
        (action, traceIndex) => ({
          action,
          traceIndex,
        })
      )
      .filter(
        ({ action }) =>
          String(
            action?.action || ""
          ).toLowerCase() ===
          "click"
      );

  const missingXPath =
    clickActions.find(
      ({ action }) =>
        typeof action?.selector !==
          "string" ||
        !action.selector.startsWith(
          "xpath="
        )
    );

  if (missingXPath) {
    throw new Error(
      `TRACE click at step ` +
      `${
        missingXPath.traceIndex + 1
      } does not contain a selector ` +
      `beginning with xpath=.`
    );
  }

  return clickActions.map(
    ({ action }) =>
      action.selector
  );
}

function formatRecordedClickXPaths(
  traceText
) {
  const clickXPaths =
    collectRecordedClickXPaths(
      traceText
    );

  if (!clickXPaths.length) {
    return (
      "(no recorded click actions)"
    );
  }

  return clickXPaths
    .map(
      (xpath, index) =>
        `${index + 1}. ` +
        `${JSON.stringify(xpath)}`
    )
    .join("\n");
}

function assertClicksUseRecordedXPaths(
  scriptText,
  traceText
) {
  const script =
    String(scriptText || "");

  const expectedClickXPaths =
    collectRecordedClickXPaths(
      traceText
    );

  const directXPathClickPattern =
    /^\s*await\s+page\.locator\(\s*("(?:\\.|[^"\\])*")\s*\)\s*\.click\(\s*\);\s*$/gm;

  const actualClickXPaths = [];

  for (
    const match of
    script.matchAll(
      directXPathClickPattern
    )
  ) {
    let selector;

    try {
      selector =
        JSON.parse(match[1]);
    } catch {
      throw new Error(
        `Unable to parse generated ` +
        `click locator: ${match[1]}`
      );
    }

    actualClickXPaths.push(
      selector
    );
  }

  const totalGeneratedClicks =
    (
      script.match(
        /\.click\s*\(/g
      ) ||
      []
    ).length;

  if (
    totalGeneratedClicks !==
    actualClickXPaths.length
  ) {
    throw new Error(
      "Every generated click must " +
      "directly use " +
      'page.locator("xpath=...").click().'
    );
  }

  if (
    actualClickXPaths.length !==
    expectedClickXPaths.length
  ) {
    throw new Error(
      `Click count mismatch. TRACE contains ` +
      `${expectedClickXPaths.length} XPath clicks, ` +
      `but the generated script contains ` +
      `${actualClickXPaths.length}.`
    );
  }

  for (
    let index = 0;
    index <
      expectedClickXPaths.length;
    index += 1
  ) {
    const expected =
      expectedClickXPaths[index];

    const actual =
      actualClickXPaths[index];

    if (actual !== expected) {
      throw new Error(
        `Click ${index + 1} used the wrong XPath.\n` +
        `Expected: ${expected}\n` +
        `Actual: ${actual}`
      );
    }
  }
}

function traceAnchorKindForClickRepair(action) {
  const kind =
    String(
      action?.action || ""
    ).toLowerCase();

  if (kind === "navigation") {
    return "navigation";
  }

  if (
    kind === "input" ||
    kind === "fill" ||
    kind === "change"
  ) {
    return "input";
  }

  if (kind === "press") {
    return "press";
  }

  if (
    kind === "check" ||
    kind === "checkbox" ||
    kind === "radio"
  ) {
    return "check";
  }

  if (kind === "uncheck") {
    return "uncheck";
  }

  if (
    kind === "select" ||
    kind === "selectoption"
  ) {
    return "select";
  }

  if (kind === "hover") {
    return "hover";
  }

  return "";
}

function generatedAnchorKindForClickRepair(line) {
  const text =
    String(line || "").trim();

  if (!text || text.startsWith("//")) {
    return "";
  }

  if (
    /\bpage\.(?:goto|waitForURL)\s*\(/.test(
      text
    )
  ) {
    return "navigation";
  }

  if (
    /\.(?:fill|type|pressSequentially)\s*\(/.test(
      text
    )
  ) {
    return "input";
  }

  if (/\.press\s*\(/.test(text)) {
    return "press";
  }

  if (/\.check\s*\(/.test(text)) {
    return "check";
  }

  if (/\.uncheck\s*\(/.test(text)) {
    return "uncheck";
  }

  if (/\.selectOption\s*\(/.test(text)) {
    return "select";
  }

  if (/\.hover\s*\(/.test(text)) {
    return "hover";
  }

  return "";
}

const CLICK_REPAIR_IGNORED_TOKENS =
  new Set([
    "await",
    "page",
    "frame",
    "locator",
    "get",
    "role",
    "label",
    "placeholder",
    "text",
    "exact",
    "first",
    "last",
    "nth",
    "input",
    "textbox",
    "field",
    "button",
    "link",
    "fill",
    "type",
    "press",
    "presssequentially",
    "check",
    "uncheck",
    "select",
    "selectoption",
    "hover",
    "xpath",
    "testdata",
    "name",
    "value",
    "action",
    "true",
    "false",
  ]);

function collectClickRepairTokens(
  values
) {
  const tokens = new Set();

  for (const value of values) {
    const text =
      String(value || "");

    if (!text) {
      continue;
    }

    for (
      const token of
      tokenizeIdentifier(text)
    ) {
      const normalized =
        String(token || "")
          .trim()
          .toLowerCase();

      if (
        !normalized ||
        normalized.length < 3 ||
        CLICK_REPAIR_IGNORED_TOKENS.has(
          normalized
        )
      ) {
        continue;
      }

      tokens.add(normalized);
    }
  }

  return tokens;
}

function getTraceActionClickRepairTokens(
  action
) {
  if (
    !action ||
    typeof action !== "object"
  ) {
    return new Set();
  }

  const element =
    action.element &&
    typeof action.element === "object"
      ? action.element
      : {};

  const context =
    extractTraceContext(
      action
    );

  const sensitivityHint =
    getObjectSensitivityHint(
      action
    );

  const semanticDataKey =
    sensitivityHint
      ? dataKeyForFieldContext(
          sensitivityHint,
          context
        )
      : "";

  return collectClickRepairTokens([
    action.selector,
    action.locator,
    action.locatorHint,
    action.locatorCode,
    action.elementKey,
    action.text,
    action.label,
    action.neighborText,

    element.tagName,
    element.type,
    element.role,
    element.id,
    element.name,
    element.dataLabel,
    element.ariaLabel,
    element.placeholder,
    element.title,
    element.testId,
    element.dataTest,
    element.dataCy,

    sensitivityHint,
    semanticDataKey,
  ]);
}

function getGeneratedLineClickRepairTokens(
  line
) {
  return collectClickRepairTokens([
    line,
  ]);
}

function generatedLineMatchesTraceAnchor(
  line,
  action
) {
  const traceKind =
    traceAnchorKindForClickRepair(
      action
    );

  const generatedKind =
    generatedAnchorKindForClickRepair(
      line
    );

  if (
    !traceKind ||
    generatedKind !== traceKind
  ) {
    return false;
  }

  /*
   * Navigation actions are chronological anchors,
   * not element-specific controls.
   */
  if (traceKind === "navigation") {
    return true;
  }

  const context =
    extractTraceContext(
      action
    );

  if (
    context &&
    contextMatchesLine(
      line,
      context
    )
  ) {
    return true;
  }

  const traceTokens =
    getTraceActionClickRepairTokens(
      action
    );

  /*
   * When TRACE contains no usable control identity,
   * retain the previous action-kind fallback.
   */
  if (!traceTokens.size) {
    return true;
  }

  const generatedTokens =
    getGeneratedLineClickRepairTokens(
      line
    );

  for (const token of traceTokens) {
    if (
      generatedTokens.has(token)
    ) {
      return true;
    }
  }

  return false;
}

function isGeneratedClickStatementForRepair(line) {
  const text =
    String(line || "").trim();

  if (!text || text.startsWith("//")) {
    return false;
  }

  return /^await\s+[\s\S]+\.click\s*\([\s\S]*\)\s*;?\s*$/.test(
    text
  );
}

function findTestClosingLineForClickRepair(lines) {
  for (
    let index = lines.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (
      /^\s*}\s*\)\s*;?\s*$/.test(
        lines[index]
      )
    ) {
      return index;
    }
  }

  return lines.length;
}

function removeMalformedXPathLocatorFragments(
  scriptText
) {
  return String(scriptText || "")
    .split(/\r?\n/)
    .filter((line) => {
      const text =
        String(line || "").trim();

      const match =
        text.match(
          /\bpage\.locator\(\s*(["'])xpath=/
        );

      if (!match) {
        return true;
      }

      const quote = match[1];

      const selectorStart =
        (match.index || 0) +
        match[0].length;

      let escaped = false;

      for (
        let index = selectorStart;
        index < text.length;
        index += 1
      ) {
        const character =
          text[index];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (character === "\\") {
          escaped = true;
          continue;
        }

        if (character === quote) {
          return true;
        }
      }

      return false;
    })
    .join("\n");
}

function rebuildRecordedClicksFromTrace(
  scriptText,
  traceText
) {
  const actions =
    normalizeTraceActions(
      parseTraceActions(
        traceText
      )
    );

  const expectedClickXPaths =
    collectRecordedClickXPaths(
      traceText
    );

  if (!expectedClickXPaths.length) {
    return String(scriptText || "");
  }

  const originalLines =
    removeMalformedXPathLocatorFragments(
      scriptText
    ).split(/\r?\n/);

  const lines = [];
  let skippingMultilineClick = false;

  for (const line of originalLines) {
    const trimmed = line.trim();

    if (skippingMultilineClick) {
      if (/\)\s*;?\s*$/.test(trimmed)) {
        skippingMultilineClick = false;
      }

      continue;
    }

    if (
      isGeneratedClickStatementForRepair(
        line
      )
    ) {
      continue;
    }

    if (
      /^await\s+[\s\S]+\.click\s*\(/.test(
        trimmed
      ) &&
      !/\)\s*;?\s*$/.test(trimmed)
    ) {
      skippingMultilineClick = true;
      continue;
    }

    lines.push(line);
  }

  const closingLineIndex =
    findTestClosingLineForClickRepair(
      lines
    );

  const insertions = new Map();
  const pendingClicks = [];
  let lineSearchStart = 0;
  let insertedCount = 0;

  const queueInsertion = (
    lineIndex,
    xpath,
    indent
  ) => {
    const statement =
      indent +
      "await page.locator(" +
      JSON.stringify(xpath) +
      ").click();";

    if (!insertions.has(lineIndex)) {
      insertions.set(lineIndex, []);
    }

    insertions
      .get(lineIndex)
      .push(statement);

    insertedCount += 1;
  };

  const flushPendingBefore = (
    lineIndex
  ) => {
    if (!pendingClicks.length) {
      return;
    }

    const anchorLine =
      lines[lineIndex] || "";

    const indent =
      anchorLine.match(/^\s*/)?.[0] ||
      "  ";

    for (const xpath of pendingClicks) {
      queueInsertion(
        lineIndex,
        xpath,
        indent
      );
    }

    pendingClicks.length = 0;
  };

  for (const action of actions) {
    const actionKind =
      String(
        action?.action || ""
      ).toLowerCase();

    if (actionKind === "click") {
      const xpath =
        typeof action?.selector === "string"
          ? action.selector
          : "";

      if (!xpath.startsWith("xpath=")) {
        throw new Error(
          "Cannot rebuild TRACE click without an xpath= selector."
        );
      }

      pendingClicks.push(xpath);
      continue;
    }

    const anchorKind =
      traceAnchorKindForClickRepair(
        action
      );

    if (!anchorKind) {
      continue;
    }

    let matchingLineIndex = -1;

    for (
      let index = lineSearchStart;
      index < closingLineIndex;
      index += 1
    ) {
      if (
        generatedLineMatchesTraceAnchor(
          lines[index],
          action
        )
      ) {
        matchingLineIndex = index;
        break;
      }
    }

    if (matchingLineIndex < 0) {
      continue;
    }

    flushPendingBefore(
      matchingLineIndex
    );

    lineSearchStart =
      matchingLineIndex + 1;
  }

  if (pendingClicks.length) {
    const fallbackIndex =
      Math.min(
        closingLineIndex,
        lines.length
      );

    const previousLine =
      lines[
        Math.max(
          0,
          fallbackIndex - 1
        )
      ] || "";

    const indent =
      previousLine.match(/^\s*/)?.[0] ||
      "  ";

    for (const xpath of pendingClicks) {
      queueInsertion(
        fallbackIndex,
        xpath,
        indent
      );
    }
  }

  if (
    insertedCount !==
    expectedClickXPaths.length
  ) {
    throw new Error(
      "Deterministic click rebuild inserted " +
      insertedCount +
      " clicks, expected " +
      expectedClickXPaths.length +
      "."
    );
  }

  const rebuilt = [];

  for (
    let index = 0;
    index <= lines.length;
    index += 1
  ) {
    const pendingInsertion =
      insertions.get(index) || [];

    rebuilt.push(
      ...pendingInsertion
    );

    if (index < lines.length) {
      rebuilt.push(lines[index]);
    }
  }

  const result =
    rebuilt.join("\n");

  assertClicksUseRecordedXPaths(
    result,
    traceText
  );

  return result;
}

function buildPrompt(
  basePrompt,
  trace,
  codegen,
  testName,
  testDataModel
) {
  return `${basePrompt}

${formatAllowedTestDataKeys(testDataModel)}

RUNTIME CLICK CONTRACT:

1. For every TRACE JSON action whose action is exactly "click", copy its locatorCode exactly.

2. Every click must directly use:

await page.locator("xpath=...").click();

3. Copy every click XPath character-for-character.

4. Preserve the exact number and exact order of TRACE click actions.

5. Do not omit or deduplicate repeated clicks.

6. Do not use CODEGEN locators for click actions.

7. Do not use locator variables for click actions.

8. Do not convert a TRACE click into check(), focus(), selectOption(), an assertion, a wait, or another action.

9. These restrictions apply only to actions marked "click". Non-click operations may use appropriate TRACE or CODEGEN locators.

REQUIRED CLICK XPATHS IN EXACT ORDER:

${formatRecordedClickXPaths(trace)}

TEST NAME:
${testName}

TRACE JSON:
${trace}

CODEGEN SCRIPT:
${codegen}
`;
}

function cleanLlmOutput(rawOutput) {
  let cleaned =
    String(rawOutput || "")
      .trim();

  if (cleaned.includes("```")) {
    const parts =
      cleaned.split("```");

    if (parts.length >= 3) {
      let candidate =
        parts[1].trim();

      if (
        candidate
          .toLowerCase()
          .startsWith(
            "javascript"
          )
      ) {
        candidate =
          candidate
            .slice(
              "javascript".length
            )
            .trim();
      } else if (
        candidate
          .toLowerCase()
          .startsWith("js")
      ) {
        candidate =
          candidate
            .slice("js".length)
            .trim();
      }

      cleaned = candidate;
    }
  }

  const importIndex =
    cleaned.indexOf("import ");

  const testIndex =
    cleaned.indexOf("test(");

  if (importIndex >= 0) {
    cleaned =
      cleaned
        .slice(importIndex)
        .trim();
  } else if (testIndex >= 0) {
    cleaned =
      cleaned
        .slice(testIndex)
        .trim();
  }

  return cleaned;
}

function isLikelyStyleOnlyCssSelector(
  selector
) {
  const text =
    String(selector || "")
      .trim();

  if (!text) {
    return false;
  }

  if (!text.includes(".")) {
    return false;
  }

  if (
    /^\.(?:ql-editor|tox-|monaco-|cm-)/.test(
      text
    )
  ) {
    return false;
  }

  if (
    /\[[^\]]+\]|#|:has\(|:text\(|\b(?:button|input|textarea|select|a|li|option)\b/i.test(
      text
    )
  ) {
    return false;
  }

  const classMatches = [
    ...text.matchAll(
      /\.([A-Za-z_-][\w-]*)/g
    ),
  ].map((match) => match[1]);

  if (!classMatches.length) {
    return false;
  }

  const styleClassPattern =
    /^(?:gap|border|bg|text|font|leading|tracking|rounded|shadow|ring|outline|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|min-w|min-h|max-w|max-h|flex|grid|items|justify|content|self|place|space|overflow|absolute|relative|fixed|sticky|top|right|bottom|left|z|opacity|cursor|transition|duration|ease|scale|rotate|translate|hover|focus|active|disabled|kelly)-/i;

  const utilityClassPattern =
    /^(?:flex|grid|block|inline|hidden|relative|absolute|fixed|sticky|visible|invisible|sr-only|container)$/i;

  const styleClassCount =
    classMatches.filter(
      (className) =>
        styleClassPattern.test(
          className
        ) ||
        utilityClassPattern.test(
          className
        )
    ).length;

  return (
    text.includes(">") ||
    styleClassCount ===
      classMatches.length ||
    styleClassCount >= 2
  );
}

function findStyleOnlyLocatorLine(
  scriptText
) {
  const locatorPattern =
    /\b(?:page|frame|[\w$]+)\.locator\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;

  for (
    const match of
    scriptText.matchAll(
      locatorPattern
    )
  ) {
    const selector =
      match[2].replace(
        /\\(["'`\\])/g,
        "$1"
      );

    if (
      !isLikelyStyleOnlyCssSelector(
        selector
      )
    ) {
      continue;
    }

    const lineStart =
      scriptText.lastIndexOf(
        "\n",
        match.index
      ) + 1;

    const lineEnd =
      scriptText.indexOf(
        "\n",
        match.index
      );

    return scriptText
      .slice(
        lineStart,
        lineEnd === -1
          ? scriptText.length
          : lineEnd
      )
      .trim();
  }

  return "";
}

function tokenizeIdentifier(value) {
  const text =
    String(value || "");

  const chunks =
    text.match(
      /[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g
    ) ||
    [text];

  return chunks
    .map(
      (chunk) =>
        chunk.toLowerCase()
    )
    .flatMap(
      (chunk) =>
        chunk.split(
          /[^a-z0-9]+/g
        )
    )
    .map(
      (token) =>
        token.trim()
    )
    .filter(Boolean);
}

function normalizeLocatorExpressionForOutput(
  expression
) {
  const hint =
    String(expression || "")
      .trim();

  if (!hint) {
    return "";
  }

  if (
    /^(?:page|frame)\./.test(
      hint
    )
  ) {
    return hint;
  }

  if (
    /^(?:getBy|locator)\(/.test(
      hint
    )
  ) {
    return `page.${hint}`;
  }

  if (
    /^(?:#|\[|xpath=|text=|\/\/)/.test(
      hint
    )
  ) {
    return (
      `page.locator(` +
      `${JSON.stringify(hint)})`
    );
  }

  return (
    `page.locator(` +
    `${JSON.stringify(hint)})`
  );
}

function actionLocatorExpression(
  action
) {
  const hint =
    locatorHintForAction(action);

  return normalizeLocatorExpressionForOutput(
    hint
  );
}

function buildTraceLocatorCandidates(
  traceText
) {
  return prepareTraceForLlm(
    parseTraceActions(traceText)
  )
    .map((action) => ({
      action,
      expression:
        actionLocatorExpression(
          action
        ),
    }))
    .filter(
      (item) =>
        Boolean(item.expression)
    );
}

function scoreTraceCandidateForIdentifier(
  candidate,
  identifier,
  line
) {
  const action =
    candidate?.action || {};

  const element =
    action &&
    typeof action.element === "object"
      ? action.element
      : {};

  const haystack = [
    candidate.expression,
    compactActionValue(
      action.selector
    ),
    compactActionValue(
      action.text
    ),
    compactActionValue(
      action.value
    ),
    compactActionValue(
      action.neighborText
    ),
    compactActionValue(
      action.label
    ),
    compactActionValue(
      element.tagName
    ),
    compactActionValue(
      element.type
    ),
    compactActionValue(
      element.role
    ),
    compactActionValue(
      element.name
    ),
    compactActionValue(
      element.id
    ),
    compactActionValue(
      element.ariaLabel
    ),
    compactActionValue(
      element.dataLabel
    ),
  ]
    .join(" ")
    .toLowerCase();

  const tokens =
    tokenizeIdentifier(
      identifier
    );

  const lineText =
    String(line || "")
      .toLowerCase();

  let score = 0;

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    if (
      haystack.includes(token)
    ) {
      score +=
        token.length > 3
          ? 5
          : 3;
    }
  }

  if (
    tokens.includes("checkbox") &&
    compactActionValue(
      element.type
    ).toLowerCase() ===
      "checkbox"
  ) {
    score += 10;
  }

  if (
    tokens.includes("radio") &&
    compactActionValue(
      element.type
    ).toLowerCase() ===
      "radio"
  ) {
    score += 10;
  }

  if (
    tokens.includes("button") &&
    compactActionValue(
      element.role
    ).toLowerCase() ===
      "button"
  ) {
    score += 8;
  }

  if (
    tokens.includes("link") &&
    compactActionValue(
      element.role
    ).toLowerCase() ===
      "link"
  ) {
    score += 8;
  }

  if (
    tokens.includes("input") ||
    tokens.includes("field")
  ) {
    if (
      [
        "input",
        "textbox",
        "searchbox",
        "combobox",
      ].includes(
        compactActionValue(
          element.role
        ).toLowerCase()
      ) ||
      compactActionValue(
        element.tagName
      ).toLowerCase() ===
        "input"
    ) {
      score += 4;
    }
  }

  if (
    lineText.includes("click") &&
    compactActionValue(
      action.action
    ).toLowerCase() ===
      "click"
  ) {
    score += 2;
  }

  if (
    lineText.includes("check") &&
    [
      "checkbox",
      "radio",
    ].includes(
      compactActionValue(
        element.type
      ).toLowerCase()
    )
  ) {
    score += 2;
  }

  if (
    lineText.includes("visible") &&
    (
      compactActionValue(
        action.text
      ) ||
      compactActionValue(
        action.selector
      )
    )
  ) {
    score += 1;
  }

  return score;
}

function chooseTraceLocatorForIdentifier(
  identifier,
  line,
  traceText
) {
  const candidates =
    buildTraceLocatorCandidates(
      traceText
    );

  if (!candidates.length) {
    return "";
  }

  let best = null;
  let bestScore = -1;

  for (
    const candidate of
    candidates
  ) {
    const score =
      scoreTraceCandidateForIdentifier(
        candidate,
        identifier,
        line
      );

    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return bestScore > 0
    ? best.expression
    : "";
}

function chooseLocatorExpressionForIdentifier(
  identifier,
  line,
  traceText,
  codegenText
) {
  const codegenAliases =
    buildLocatorAliasMaps(
      codegenText
    ).locatorMap;

  if (
    codegenAliases.has(
      identifier
    )
  ) {
    return codegenAliases.get(
      identifier
    );
  }

  return chooseTraceLocatorForIdentifier(
    identifier,
    line,
    traceText
  );
}

function repairUndeclaredLocatorVariables(
  script,
  traceText,
  codegenText
) {
  const lines =
    String(script || "")
      .split(/\r?\n/);

  const declarationPattern =
    /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/;

  const declared = new Set([
    "test",
    "expect",
    "page",
    "frame",
    "testData",
    "heal",
    "request",
    "console",
    "process",
    "module",
    "exports",
    "__dirname",
    "__filename",
    "require",
  ]);

  const repaired = [];

  for (const rawLine of lines) {
    const line =
      String(rawLine || "");

    const trimmed =
      line.trim();

    const match =
      declarationPattern.exec(
        trimmed
      );

    if (match) {
      declared.add(match[1]);
    }

    const usages = [
      ...extractBareLocatorUsages(
        line
      ),
    ].filter(
      (name) =>
        !declared.has(name)
    );

    if (usages.length) {
      repaired.push(
        line.replace(
          /\b([A-Za-z_$][\w$]*)\b/g,
          (
            token,
            name
          ) => {
            if (
              !usages.includes(
                name
              )
            ) {
              return token;
            }

            const expression =
              chooseLocatorExpressionForIdentifier(
                name,
                line,
                traceText,
                codegenText
              );

            return (
              expression ||
              token
            );
          }
        )
      );

      continue;
    }

    repaired.push(line);
  }

  return repaired.join("\n");
}

function extractBareLocatorUsages(
  line
) {
  const text =
    String(line || "");

  const usages = new Set();

  const patterns = [
    /\bexpect\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\./g,
    /\b(?:await\s+)?([A-Za-z_$][\w$]*)\.(?:click|fill|check|uncheck|setChecked|selectOption|press|type|pressSequentially|hover|tap|focus|blur|scrollIntoViewIfNeeded|waitFor|setInputFiles|dragTo|toBeVisible|toBeHidden|toBeEnabled|toBeDisabled|toBeEditable|toBeChecked|toHaveText|toHaveValue|toContainText|toHaveAttribute|toBeAttached|toHaveCount|toBeEmpty)\s*\(/g,
  ];

  for (const pattern of patterns) {
    for (
      const match of
      text.matchAll(pattern)
    ) {
      const name =
        String(match[1] || "")
          .trim();

      if (name) {
        usages.add(name);
      }
    }
  }

  return usages;
}

function findUndeclaredBareLocatorUsage(
  script
) {
  const allowedGlobals =
    new Set([
      "test",
      "expect",
      "page",
      "frame",
      "testData",
      "heal",
      "request",
      "console",
      "process",
      "module",
      "exports",
      "__dirname",
      "__filename",
      "require",
    ]);

  const declared =
    new Set(allowedGlobals);

  const lines =
    String(script || "")
      .split(/\r?\n/);

  const declarationPattern =
    /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/;

  for (const rawLine of lines) {
    const line =
      String(rawLine || "")
        .trim();

    for (
      const usage of
      extractBareLocatorUsages(
        line
      )
    ) {
      if (!declared.has(usage)) {
        return line;
      }
    }

    const declarationMatch =
      declarationPattern.exec(
        line
      );

    if (declarationMatch) {
      declared.add(
        declarationMatch[1]
      );
    }
  }

  return "";
}

function assertGeneratedScriptIsComplete(
  script,
  outputPath
) {
  const text =
    String(script || "")
      .trim();

  if (
    !text.includes(
      "import { test, expect } from '@playwright/test';"
    )
  ) {
    throw new Error(
      "Generated script is missing the Playwright " +
      "import. The LLM output is incomplete."
    );
  }

  if (
    !/test\s*\(\s*['"`]/.test(
      text
    )
  ) {
    throw new Error(
      "Generated script is missing a Playwright " +
      "test block. The LLM output is incomplete."
    );
  }

  if (
    !/\}\s*\)\s*;?\s*$/.test(
      text
    )
  ) {
    throw new Error(
      "Generated script does not end with a " +
      "closed test block. The LLM output is " +
      "likely truncated."
    );
  }

  const styleOnlyLocatorLine =
    findStyleOnlyLocatorLine(text);

  if (styleOnlyLocatorLine) {
    throw new Error(
      "Generated script contains a style-only " +
      "CSS locator. Use a meaningful role/text/" +
      "attribute locator instead: " +
      styleOnlyLocatorLine
    );
  }

  const hardcodedFillLine =
    text
      .split(/\r?\n/)
      .find((line) => {
        const trimmed =
          line.trim();

        return /\.(?:fill|pressSequentially|type)\(\s*['"`]/.test(
          trimmed
        );
      });

  if (hardcodedFillLine) {
    throw new Error(
      "Generated script contains a hardcoded " +
      "fill/type value. Move the value into " +
      "test-data.json and use testData.* instead: " +
      hardcodedFillLine.trim()
    );
  }

  const invalidTestDataKeyLine =
    text
      .split(/\r?\n/)
      .find((line) => {
        const matches = [
          ...line.matchAll(
            /testData\.([A-Za-z0-9_$][A-Za-z0-9_$]*)/g
          ),
        ];

        return matches.some(
          (match) => {
            const key =
              String(
                match[1] || ""
              );

            return (
              !/^[A-Za-z_$][\w$]*$/.test(
                key
              ) ||
              !isMeaningfulTestDataKey(
                key
              ) ||
              isGeneratedIdValue(
                key
              )
            );
          }
        );
      });

  if (invalidTestDataKeyLine) {
    throw new Error(
      "Generated script contains an invalid or " +
      "generated testData key. Use a semantic key " +
      "instead: " +
      invalidTestDataKeyLine.trim()
    );
  }

  const undeclaredLocatorLine =
    findUndeclaredBareLocatorUsage(
      text
    );

  if (undeclaredLocatorLine) {
    throw new Error(
      "Generated script uses an undeclared locator " +
      "variable. Declare it before first use or " +
      "inline the locator: " +
      undeclaredLocatorLine
    );
  }

  const tempPath =
    path.join(
      path.dirname(outputPath),
      `.${path.basename(outputPath)}` +
      `.syntax-check-${Date.now()}.js`
    );

  fs.mkdirSync(
    path.dirname(tempPath),
    { recursive: true }
  );

  try {
    fs.writeFileSync(
      tempPath,
      text,
      "utf8"
    );

    const result = spawnSync(
      process.execPath,
      [
        "--check",
        tempPath,
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
      }
    );

    if (result.status !== 0) {
      const details = [
        result.stderr,
        result.stdout,
      ]
        .filter(Boolean)
        .join("\n")
        .trim();

      throw new Error(
        "Generated script failed JavaScript " +
        "syntax check." +
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
        { force: true }
      );
    } catch {}
  }
}

function replaceInitialGoto(
  script,
  startUrl
) {
  if (!startUrl) {
    return script;
  }

  const updated =
    script.replace(
      /await\s+page\.goto\((['"`])(?:\\.|(?!\1)[\s\S])*?\1\);/,
      "await page.goto(testData.url);"
    );

  if (
    updated !== script ||
    updated.includes(
      "page.goto(testData.url)"
    )
  ) {
    return updated;
  }

  return updated.replace(
    /await\s+page\.goto\(\s*['"`]?(?:https?:)?[\s\S]*?(?=\r?\n\s*await\s+)/,
    "await page.goto(testData.url);"
  );
}

function tokensFromUrlPath(
  pathValue
) {
  const pathText =
    String(pathValue || "")
      .replace(
        /^\/+|\/+$/g,
        ""
      );

  return pathText
    .split(/[/?#&=]+/)
    .map(
      (token) =>
        token.trim()
    )
    .filter(
      (token) =>
        /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,}$/.test(
          token
        )
    );
}

function regexLiteralFromTokens(
  tokens
) {
  const usableTokens = [
    ...new Set(
      tokens.filter(Boolean)
    ),
  ];

  if (!usableTokens.length) {
    return "/.*/";
  }

  const pattern =
    usableTokens
      .map(
        (token) =>
          escapeRegExp(token)
      )
      .join("|");

  return `/${pattern}/i`;
}

function regexLiteralFromPath(
  pathValue
) {
  return regexLiteralFromTokens(
    tokensFromUrlPath(
      pathValue
    )
  );
}

function traceNavigationTokens(
  traceText
) {
  return parseTraceActions(
    traceText
  )
    .filter(
      (action) =>
        action?.action ===
          "navigation" &&
        typeof action.url ===
          "string"
    )
    .flatMap((action) => {
      try {
        return tokensFromUrlPath(
          new URL(
            action.url
          ).pathname
        );
      } catch {
        return tokensFromUrlPath(
          action.url
        );
      }
    });
}

function lastTraceNavigationRegex(
  traceText
) {
  const navigations =
    parseTraceActions(traceText)
      .filter(
        (action) =>
          action?.action ===
            "navigation" &&
          typeof action.url ===
            "string"
      );

  const lastNavigation =
    navigations[
      navigations.length - 1
    ];

  if (!lastNavigation) {
    return "";
  }

  try {
    return regexLiteralFromTokens(
      tokensFromUrlPath(
        new URL(
          lastNavigation.url
        ).pathname
      )
    );
  } catch {
    return regexLiteralFromTokens(
      tokensFromUrlPath(
        lastNavigation.url
      )
    );
  }
}

function siteUrlReplacementRegex(
  rawPath,
  traceTokens
) {
  const pathTokens =
    tokensFromUrlPath(
      rawPath
    );

  if (!traceTokens.length) {
    return regexLiteralFromTokens(
      pathTokens
    );
  }

  const lowerTraceTokens =
    new Set(
      traceTokens.map(
        (token) =>
          token.toLowerCase()
      )
    );

  const pathExistsInTrace =
    pathTokens.some(
      (token) =>
        lowerTraceTokens.has(
          token.toLowerCase()
        )
    );

  return pathExistsInTrace
    ? regexLiteralFromTokens(
        pathTokens
      )
    : regexLiteralFromTokens(
        traceTokens
      );
}

function tokensFromRegexLiteral(
  regexLiteral
) {
  const match =
    String(regexLiteral || "")
      .match(
        /^\/(.+)\/[a-z]*$/i
      );

  if (!match) {
    return [];
  }

  return match[1]
    .split(
      /[^a-zA-Z0-9_-]+/
    )
    .map(
      (token) =>
        token.trim()
    )
    .filter(
      (token) =>
        /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,}$/.test(
          token
        )
    );
}

function replaceUnsupportedUrlRegexAssertions(
  script,
  traceText = ""
) {
  const traceTokens =
    traceNavigationTokens(
      traceText
    );

  if (!traceTokens.length) {
    return script;
  }

  const lowerTraceTokens =
    new Set(
      traceTokens.map(
        (token) =>
          token.toLowerCase()
      )
    );

  const fallbackRegex =
    lastTraceNavigationRegex(
      traceText
    );

  if (!fallbackRegex) {
    return script;
  }

  return script.replace(
    /\b(page\.waitForURL\(|expect\(page\)\.toHaveURL\()\s*(\/(?:\\\/|[^/\r\n])+\/[a-z]*)\s*(\))/g,
    (
      match,
      prefix,
      regexLiteral,
      suffix
    ) => {
      const regexTokens =
        tokensFromRegexLiteral(
          regexLiteral
        );

      const hasUnsupportedToken =
        regexTokens.some(
          (token) =>
            !lowerTraceTokens.has(
              token.toLowerCase()
            )
        );

      return hasUnsupportedToken
        ? `${prefix}${fallbackRegex}${suffix}`
        : match;
    }
  );
}

function replaceInventedSiteUrls(
  script,
  traceText = ""
) {
  const traceTokens =
    traceNavigationTokens(
      traceText
    );

  let updated = script;

  updated = updated.replace(
    /\b(page\.(?:waitForURL)\(|expect\(page\)\.toHaveURL\()\s*(['"`])https?:\/\/(?:www\.)?(?:site|example|app)\.com(\/[^'"`]*)?\2\s*(\))/g,
    (
      _match,
      prefix,
      _quote,
      rawPath = "",
      suffix
    ) =>
      `${prefix}` +
      `${siteUrlReplacementRegex(
        rawPath,
        traceTokens
      )}` +
      `${suffix}`
  );

  updated = updated.replace(
    /\bpage\.goto\(\s*(['"`])https?:\/\/(?:www\.)?(?:site|example|app)\.com(?:\/[^'"`]*)?\1\s*\)/g,
    "page.goto(testData.url)"
  );

  return updated;
}

function normalizeDataTestSelectors(
  script,
  codegenText = ""
) {
  const dataTestValues =
    new Set();

  const dataCyValues =
    new Set();

  for (
    const match of
    codegenText.matchAll(
      /\[data-test=(['"])([^'"]+)\1\]/g
    )
  ) {
    dataTestValues.add(
      match[2]
    );
  }

  for (
    const match of
    codegenText.matchAll(
      /\[data-cy=(['"])([^'"]+)\1\]/g
    )
  ) {
    dataCyValues.add(
      match[2]
    );
  }

  if (
    !dataTestValues.size &&
    !dataCyValues.size
  ) {
    return script;
  }

  return script.replace(
    /\[data-testid=(['"])([^'"]+)\1\]/g,
    (
      match,
      quote,
      value
    ) => {
      if (
        dataCyValues.has(value)
      ) {
        return (
          `[data-cy=${quote}` +
          `${value}${quote}]`
        );
      }

      return dataTestValues.has(
        value
      )
        ? (
            `[data-test=${quote}` +
            `${value}${quote}]`
          )
        : match;
    }
  );
}

function enforceForceClickAfterScroll(
  script
) {
  const lines =
    script.split(/\r?\n/);

  const scrolledLocators =
    new Set();

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const scrollMatch =
      lines[index].match(
        /await\s+([A-Za-z_$][\w$]*)\.scrollIntoViewIfNeeded\(\);/
      );

    if (scrollMatch) {
      scrolledLocators.add(
        scrollMatch[1]
      );

      continue;
    }

    const clickMatch =
      lines[index].match(
        /^(\s*)await\s+([A-Za-z_$][\w$]*)\.click\(\);/
      );

    if (
      clickMatch &&
      scrolledLocators.has(
        clickMatch[2]
      )
    ) {
      lines[index] =
        `${clickMatch[1]}` +
        `await ${clickMatch[2]}` +
        `.click({ force: true });`;

      scrolledLocators.delete(
        clickMatch[2]
      );

      continue;
    }

    const actionMatch =
      lines[index].match(
        /await\s+([A-Za-z_$][\w$]*)\.(fill|check|uncheck|press|selectOption|hover)\(/
      );

    if (actionMatch) {
      scrolledLocators.delete(
        actionMatch[1]
      );
    }
  }

  return lines.join("\n");
}

function enforceWaitForUrlBeforeAssertions(
  script
) {
  const lines =
    script.split(/\r?\n/);

  const updated = [];

  for (const line of lines) {
    const withoutComment =
      line.replace(
        /\s*\/\/.*$/,
        ""
      );

    const urlAssertionMatch =
      withoutComment.match(
        /^(\s*)await\s+expect\(page\)\.toHaveURL\((.*)\);?\s*$/
      );

    if (urlAssertionMatch) {
      const indent =
        urlAssertionMatch[1];

      const expectedUrl =
        urlAssertionMatch[2]
          .trim();

      while (
        updated.length &&
        /await\s+page\.waitForLoadState\(\s*['"]domcontentloaded['"]\s*\);?\s*$/.test(
          updated[
            updated.length - 1
          ].trim()
        )
      ) {
        updated.pop();
      }

      const previousLine =
        updated.length
          ? updated[
              updated.length - 1
            ].trim()
          : "";

      const expectedWait =
        `await page.waitForURL(` +
        `${expectedUrl});`;

      if (
        previousLine !==
        expectedWait
      ) {
        updated.push(
          `${indent}${expectedWait}`
        );
      }
    }

    updated.push(
      withoutComment || line
    );
  }

  return updated.join("\n");
}

function removePageTitleAssertions(
  script
) {
  return script
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*await\s+expect\(page\)\.toHaveTitle\(/.test(
          line
        )
    )
    .join("\n");
}

function extractExpectVisibleExpression(
  line
) {
  const text =
    line.trim();

  if (
    !text.startsWith(
      "await expect("
    ) ||
    !text.endsWith(
      ").toBeVisible();"
    )
  ) {
    return "";
  }

  return text
    .slice(
      "await expect(".length,
      -").toBeVisible();".length
    )
    .trim();
}

function extractClickExpression(
  line
) {
  const match =
    line
      .trim()
      .match(
        /^await\s+(.+)\.click\((?:\{\s*force:\s*true\s*\})?\);$/
      );

  return match
    ? match[1].trim()
    : "";
}

function extractEditableActionExpression(
  line
) {
  const match =
    line
      .trim()
      .match(
        /^await\s+(.+)\.(?:fill|type|pressSequentially)\(/
      );

  return match
    ? match[1].trim()
    : "";
}

function extractReadinessAssertion(
  line
) {
  const text =
    line.trim();

  const enabledMatch =
    text.match(
      /^await\s+expect\((.+)\)\.toBeEnabled\(\);\s*$/
    );

  if (enabledMatch) {
    return {
      expression:
        enabledMatch[1].trim(),
      matcher:
        "toBeEnabled",
    };
  }

  const editableMatch =
    text.match(
      /^await\s+expect\((.+)\)\.toBeEditable\(\);\s*$/
    );

  if (editableMatch) {
    return {
      expression:
        editableMatch[1].trim(),
      matcher:
        "toBeEditable",
    };
  }

  return null;
}

function normalizeLocatorExpression(
  expression
) {
  return String(
    expression || ""
  )
    .trim()
    .replace(
      /;\s*$/,
      ""
    );
}

function buildLocatorAliasMaps(
  script
) {
  const lines =
    String(script || "")
      .split(/\r?\n/);

  const locatorMap =
    new Map();

  const reverseMap =
    new Map();

  const assignmentPattern =
    /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);?$/;

  for (const rawLine of lines) {
    const line =
      rawLine.trim();

    const match =
      assignmentPattern.exec(
        line
      );

    if (!match) {
      continue;
    }

    const name =
      match[1];

    const expression =
      normalizeLocatorExpression(
        match[2]
      );

    if (
      !/(?:page|frame)\.(?:locator|getBy)/.test(
        expression
      ) &&
      !/\.(?:locator|getBy)/.test(
        expression
      )
    ) {
      continue;
    }

    locatorMap.set(
      name,
      expression
    );

    const normalized =
      normalizeLocatorExpression(
        expression
      ).replace(
        /\s+/g,
        ""
      );

    if (
      !reverseMap.has(
        normalized
      )
    ) {
      reverseMap.set(
        normalized,
        new Set()
      );
    }

    reverseMap
      .get(normalized)
      .add(name);
  }

  return {
    locatorMap,
    reverseMap,
  };
}

function expandEquivalentLocatorExpressions(
  expression,
  locatorMap,
  reverseMap
) {
  const seed =
    normalizeLocatorExpression(
      expression
    );

  if (!seed) {
    return new Set();
  }

  const queue = [seed];
  const seen = new Set();
  const equivalents =
    new Set();

  while (queue.length) {
    const current =
      normalizeLocatorExpression(
        queue.pop()
      );

    if (
      !current ||
      seen.has(current)
    ) {
      continue;
    }

    seen.add(current);
    equivalents.add(current);

    if (
      locatorMap.has(current)
    ) {
      queue.push(
        locatorMap.get(current)
      );
    }

    const normalized =
      current.replace(
        /\s+/g,
        ""
      );

    const aliases =
      reverseMap.get(
        normalized
      );

    if (aliases) {
      for (
        const alias of aliases
      ) {
        if (!seen.has(alias)) {
          queue.push(alias);
        }

        if (
          locatorMap.has(alias) &&
          !seen.has(
            locatorMap.get(alias)
          )
        ) {
          queue.push(
            locatorMap.get(alias)
          );
        }
      }
    }
  }

  return equivalents;
}

function markReadinessExpression(
  expression,
  readinessKeys,
  locatorMap,
  reverseMap
) {
  const equivalents =
    expandEquivalentLocatorExpressions(
      expression,
      locatorMap,
      reverseMap
    );

  if (!equivalents.size) {
    readinessKeys.add(
      `${normalizeLocatorExpression(expression)}::self`
    );

    return;
  }

  for (
    const equivalent of
    equivalents
  ) {
    readinessKeys.add(
      `${normalizeLocatorExpression(equivalent)}::ready`
    );
  }
}

function hasReadinessExpression(
  expression,
  readinessKeys,
  locatorMap,
  reverseMap
) {
  const equivalents =
    expandEquivalentLocatorExpressions(
      expression,
      locatorMap,
      reverseMap
    );

  if (!equivalents.size) {
    return readinessKeys.has(
      `${normalizeLocatorExpression(expression)}::self`
    );
  }

  for (
    const equivalent of
    equivalents
  ) {
    if (
      readinessKeys.has(
        `${normalizeLocatorExpression(equivalent)}::ready`
      )
    ) {
      return true;
    }
  }

  return false;
}

function removeDuplicateInlineVisibilityBeforeClick(
  script
) {
  const lines =
    script.split(/\r?\n/);

  const updated = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const currentLine =
      lines[index];

    const nextLine =
      lines[index + 1] || "";

    const expectExpression =
      extractExpectVisibleExpression(
        currentLine
      );

    const clickExpression =
      extractClickExpression(
        nextLine
      );

    const isInlineLocator =
      /^(?:page|frame)\./.test(
        expectExpression
      );

    if (
      expectExpression &&
      expectExpression ===
        clickExpression &&
      isInlineLocator
    ) {
      continue;
    }

    updated.push(currentLine);
  }

  return updated.join("\n");
}

function enforceSingleTargetTextLocators(
  script
) {
  let updated = script;

  const bannedInvalidRoles =
    /page\.getByRole\(\s*(['"])(div|span|section|article|header|footer|main|aside|nav|ul|li|p)\1/g;

  updated = updated.replace(
    /page\.locator\(\s*(['"])([a-z][a-z0-9-]*)\1\s*\)\.filter\(\s*\{\s*hasText:\s*(\/\^(?:\\\/|[^/\r\n])+?\/[a-z]*)\s*\}\s*\)(?!\s*\.\s*(?:first|nth|last)\s*\()/gi,
    (match) =>
      `${match}.first()`
  );

  if (
    bannedInvalidRoles.test(
      script
    )
  ) {
    updated = updated.replace(
      /page\.getByRole\(\s*(['"])(div|span|section|article|header|footer|main|aside|nav|ul|li|p)\1\s*,\s*\{\s*name\s*:\s*(['"])([^'"]+)\3(?:\s*,\s*exact\s*:\s*true)?\s*\}\s*\)/g,
      (
        _match,
        _q1,
        tag,
        _q2,
        text
      ) =>
        `page.locator('${tag}')` +
        `.filter(` +
        `${exactTextRegexObject(text)}` +
        `).first()`
    );
  }

  updated = updated.replace(
    /page\.getByText\(\s*(['"])([^'"]+)\1\s*,\s*\{\s*exact\s*:\s*true\s*\}\s*\)(?!\s*\.\s*(?:first|nth|last)\s*\()/g,
    (
      _match,
      quote,
      text
    ) =>
      `page.getByText(` +
      `${quote}${text}${quote}, ` +
      `{ exact: true }).first()`
  );

  updated = updated.replace(
    /page\.locator\(\s*(['"])div\1\s*\)\.filter\(\s*\{\s*hasText:\s*(['"])([^'"]+)\2\s*\}\s*\)\.first\(\)/g,
    (
      _match,
      _divQuote,
      _textQuote,
      text
    ) =>
      `page.locator('div')` +
      `.filter(` +
      `${exactTextRegexObject(text)}` +
      `).first()`
  );

  updated = updated.replace(
    /page\.locator\(\s*(['"])([a-z][a-z0-9-]*)\1\s*\)\.filter\(\s*\{\s*hasText:\s*(['"])([^'"]+)\3\s*\}\s*\)(?!\s*\.\s*(?:first|nth|last)\s*\()/gi,
    (
      _match,
      _tagQuote,
      tag,
      _textQuote,
      text
    ) =>
      `page.locator('${tag}')` +
      `.filter(` +
      `${exactTextRegexObject(text)}` +
      `).first()`
  );

  return updated;
}

function enforceDomContentLoadedAfterNavigation(
  script
) {
  const lines =
    script.split(/\r?\n/);

  const updated = [];

  const nextNonEmptyLine = (
    startIndex
  ) => {
    for (
      let index =
        startIndex;
      index < lines.length;
      index += 1
    ) {
      const text =
        lines[index].trim();

      if (text) {
        return text;
      }
    }

    return "";
  };

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    updated.push(line);

    const shouldWaitAfterGoto =
      /^\s*await\s+page\.goto\(/.test(
        line
      );

    const shouldWaitAfterUrlAssertion =
      /^\s*await\s+expect\(page\)\.toHaveURL\(/.test(
        line
      );

    if (
      !shouldWaitAfterGoto &&
      !shouldWaitAfterUrlAssertion
    ) {
      continue;
    }

    const nextLine =
      nextNonEmptyLine(
        index + 1
      );

    if (
      !/await\s+page\.waitForLoadState\(\s*['"]domcontentloaded['"]\s*\)/.test(
        nextLine
      )
    ) {
      const indent =
        line.match(
          /^(\s*)/
        )?.[1] || "";

      updated.push(
        `${indent}await page.waitForLoadState(` +
        `'domcontentloaded');`
      );
    }
  }

  return updated.join("\n");
}

function removeGeneratedInlineComments(
  script
) {
  return script.replace(
    /\s+\/\/\s*(?:Replace with|Adjust regex|Use the first|Click|Wait for|Assert|Fill|Navigate).*/g,
    ""
  );
}

function removeGeneratedCommentLines(
  script
) {
  const lines =
    String(script || "")
      .split(/\r?\n/);

  const kept = [];

  for (const line of lines) {
    const trimmed =
      line.trim();

    const isGeneratedStepComment =
      /^\/\/\s*(?:\d+\.\s*)?(?:Click|Wait for|Fill|Open|Select|Assert|Check|Navigate|Save|Click anonymous|Click ".*"|Click '.*'|Open ".*"|Select ".*"|Fill ".*")/i.test(
        trimmed
      ) ||
      /^\/\/\s*(?:Known duplicate control|Anonymous|No stable locator|No stable selector|From trace|From codegen)/i.test(
        trimmed
      );

    if (
      isGeneratedStepComment
    ) {
      continue;
    }

    kept.push(line);
  }

  return kept.join("\n");
}

function removeStandaloneAnonymousButtonPairs(
  script
) {
  const lines =
    String(script || "")
      .split(/\r?\n/);

  const output = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const current =
      lines[index].trim();

    const next =
      (
        lines[index + 1] ||
        ""
      ).trim();

    const prev =
      (
        output[
          output.length - 1
        ] ||
        ""
      ).trim();

    const isAnonymousExpect =
      /^await\s+expect\(page\.getByRole\(\s*['"]button['"]\s*\)\.first\(\)\)\.toBeEnabled\(\);$/.test(
        current
      );

    const isAnonymousClick =
      /^await\s+page\.getByRole\(\s*['"]button['"]\s*\)\.first\(\)\.click\(\);$/.test(
        next
      );

    if (
      isAnonymousExpect &&
      isAnonymousClick
    ) {
      const surrounding = [
        prev,
        lines[index + 2] || "",
        lines[index + 3] || "",
        lines[index + 4] || "",
      ].join("\n");

      const hasNamedControlNearby =
        /const\s+\w+(?:Button|Link|Tab|Input|Checkbox|Radio)\s*=|page\.(?:locator|getByRole|getByPlaceholder|getByLabel|getByText)\(/.test(
          surrounding
        ) &&
        !/page\.getByRole\(\s*['"]button['"]\s*\)\.first\(\)/.test(
          surrounding
        );

      if (
        hasNamedControlNearby
      ) {
        index += 1;
        continue;
      }
    }

    output.push(
      lines[index]
    );
  }

  return output.join("\n");
}

function removeStandaloneFocusSteps(
  script
) {
  return String(
    script || ""
  ).replace(
    /^\s*await\s+[^;\n]+\.focus\(\);\s*$/gm,
    ""
  );
}

function collapseRepeatedFillCalls(
  script
) {
  const lines =
    String(script || "")
      .split(/\r?\n/);

  const output = [];
  let fillRun = [];
  let fillRunKey = "";

  const flushFillRun = () => {
    if (!fillRun.length) {
      return;
    }

    output.push(
      fillRun[
        fillRun.length - 1
      ]
    );

    fillRun = [];
    fillRunKey = "";
  };

  for (const line of lines) {
    const trimmed =
      line.trim();

    /*
     * Match both:
     *
     * .fill("literal")
     * .fill(testData.password)
     */
    const fillMatch =
      trimmed.match(
        /^await\s+(.+?)\.fill\(\s*[\s\S]*\);\s*$/
      );

    if (fillMatch) {
      const target =
        fillMatch[1].trim();

      if (!fillRun.length) {
        fillRunKey = target;
        fillRun.push(line);
        continue;
      }

      if (
        target === fillRunKey
      ) {
        fillRun.push(line);
        continue;
      }

      flushFillRun();
      fillRunKey = target;
      fillRun.push(line);
      continue;
    }

    flushFillRun();
    output.push(line);
  }

  flushFillRun();

  return output.join("\n");
}

function inlineLocatorVariablesAndRemoveAssertions(
  scriptText
) {
  const lines =
    String(scriptText || "")
      .split(/\r?\n/);

  const locatorAliases =
    new Map();

  const declarationPattern =
    /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?)\s*;\s*$/;

  /*
   * First collect declarations such as:
   *
   * const passwordInput =
   *   page.getByRole(...);
   */
  for (const line of lines) {
    const match =
      declarationPattern.exec(line);

    if (!match) {
      continue;
    }

    const variableName =
      match[1];

    const expression =
      match[2].trim();

    if (
      /^(?:page|frame)\.(?:locator|getBy)/.test(
        expression
      ) ||
      /\.(?:locator|getBy)/.test(
        expression
      )
    ) {
      locatorAliases.set(
        variableName,
        expression
      );
    }
  }

  const output = [];

  for (const originalLine of lines) {
    const declarationMatch =
      declarationPattern.exec(
        originalLine
      );

    /*
     * Remove locator declarations.
     */
    if (
      declarationMatch &&
      locatorAliases.has(
        declarationMatch[1]
      )
    ) {
      continue;
    }

    const trimmed =
      originalLine.trim();

    /*
     * Remove generated readiness assertions.
     *
     * These assertions can touch controls before
     * the click that makes those controls available.
     */
    if (
      /^await\s+expect\(.+\)\.(?:toBeEditable|toBeEnabled|toBeVisible|toBeAttached)\(\);\s*$/.test(
        trimmed
      )
    ) {
      continue;
    }

    let updatedLine =
      originalLine;

    /*
     * Replace:
     *
     * await passwordInput.fill(...)
     *
     * with:
     *
     * await page.getByRole(...).fill(...)
     */
    for (
      const [
        variableName,
        expression,
      ] of locatorAliases
    ) {
      const variablePattern =
        new RegExp(
          `\\b${escapeRegExp(variableName)}\\b`,
          "g"
        );

      updatedLine =
        updatedLine.replace(
          variablePattern,
          expression
        );
    }

    output.push(updatedLine);
  }

  /*
   * Collapse excessive empty lines.
   */
  return output
    .join("\n")
    .replace(
      /\n[ \t]*\n[ \t]*\n+/g,
      "\n\n"
    )
    .trim();
}

function postProcessGeneratedScript(
  rawOutput,
  trace,
  codegen,
  canonicalStartUrl,
  testDataModel
) {
  let cleaned =
    cleanLlmOutput(rawOutput);

  cleaned =
    removeStandaloneFocusSteps(
      cleaned
    );

  cleaned =
    removeGeneratedCommentLines(
      cleaned
    );

  cleaned =
    removeStandaloneAnonymousButtonPairs(
      cleaned
    );

  cleaned =
    removeGeneratedInlineComments(
      cleaned
    );

  cleaned =
    enforceForceClickAfterScroll(
      cleaned
    );

  cleaned =
    enforceSingleTargetTextLocators(
      cleaned
    );

  cleaned =
    removeDuplicateInlineVisibilityBeforeClick(
      cleaned
    );

  cleaned =
    replaceInventedSiteUrls(
      cleaned,
      trace
    );

  cleaned =
    replaceUnsupportedUrlRegexAssertions(
      cleaned,
      trace
    );

  cleaned =
    enforceWaitForUrlBeforeAssertions(
      cleaned
    );

  cleaned =
    removePageTitleAssertions(
      cleaned
    );

  cleaned =
    enforceDomContentLoadedAfterNavigation(
      cleaned
    );

  cleaned =
    replaceInitialGoto(
      cleaned,
      canonicalStartUrl
    );

  cleaned =
    rewriteAnonymousButtonsFromCodegen(
      cleaned,
      codegen
    );

  cleaned =
    rewriteKnownDuplicateButtonLocators(
      cleaned
    );

  cleaned =
    rewriteSemanticSelectionLocators(
      cleaned,
      trace,
      codegen
    );

  cleaned =
    rewriteDatagridSelectionLocators(
      cleaned,
      trace
    );

  cleaned =
    rewriteLiteralFormValuesToTestData(
      cleaned,
      (
        testDataModel ||
        {}
      ).payload ||
      {}
    );

  cleaned =
    normalizeBracketTestDataAccess(
      cleaned
    );

  cleaned =
    normalizeInvalidTestDataAccess(
      cleaned,
      (
        testDataModel ||
        {}
      ).payload ||
      {}
    );

  /*
   * Do not silently delete incomplete XPath lines.
   * Let the JavaScript syntax validator reject them.
   */
  cleaned =
    repairUndeclaredLocatorVariables(
      cleaned,
      trace,
      codegen
    );

  /*
   * Remove const locator variables and every generated
   * readiness assertion before positioning TRACE clicks.
   *
   * This prevents the password field from being resolved
   * before the Continue button has been clicked.
   */
  cleaned =
    inlineLocatorVariablesAndRemoveAssertions(
      cleaned
    );

  /*
   * Collapse repeated generated fills for the same
   * control before mapping normalized TRACE actions.
   */
  cleaned =
    collapseRepeatedFillCalls(
      cleaned
    );

  /*
   * Remove malformed model fragments such as:
   *
   * await page.locator("xpath=
   */
  cleaned =
    removeMalformedXPathLocatorFragments(
      cleaned
    );

  /*
   * Reconstruct every click directly from raw TRACE.
   */
  cleaned =
    rebuildRecordedClicksFromTrace(
      cleaned,
      trace
    );

  /*
   * Keep data-driven rewriting, but do not add automatic
   * toBeEnabled()/toBeEditable() assertions afterward.
   */
  cleaned =
    normalizeDataTestSelectors(
      enforceDataDriven(
        cleaned,
        testDataModel
      ),
      codegen
    );

  return cleaned;
}

function extractRepairContext(
  invalidScript,
  validationError
) {
  const text =
    String(invalidScript || "")
      .trim();

  if (!text) {
    return "";
  }

  const brokenLineMatch =
    String(
      validationError || ""
    ).match(
      /incomplete locator line:\s*(.*)$/i
    );

  const brokenLine =
    String(
      brokenLineMatch?.[1] ||
      ""
    ).trim();

  if (!brokenLine) {
    return text
      .split(/\r?\n/)
      .slice(0, 24)
      .join("\n");
  }

  const lines =
    text.split(/\r?\n/);

  const brokenIndex =
    lines.findIndex(
      (line) =>
        line.includes(
          brokenLine.slice(
            0,
            Math.min(
              brokenLine.length,
              40
            )
          )
        )
    );

  if (brokenIndex < 0) {
    return brokenLine;
  }

  const start =
    Math.max(
      0,
      brokenIndex - 2
    );

  const end =
    Math.min(
      lines.length,
      brokenIndex + 3
    );

  return lines
    .slice(start, end)
    .join("\n");
}

function buildRepairPrompt({
  basePrompt,
  trace,
  sanitizedTrace,
  sanitizedCodegen,
  testName,
  invalidScript,
  validationError,
  testDataModel,
}) {
  const repairContext =
    extractRepairContext(
      invalidScript,
      validationError
    );

  return `${basePrompt}

${formatAllowedTestDataKeys(testDataModel)}

The previous response failed local validation. Regenerate the complete Playwright JavaScript file from scratch.

REPAIR OVERRIDES:

1. Return only one complete JavaScript file.

2. Do not return Markdown, explanations, or comments.

3. Do not continue the previous response.

4. Keep every locator string and action statement complete.

5. Do not declare locator variables for click actions.

6. Every click must directly use:

await page.locator("xpath=...").click();

7. Use the following recorded click XPaths exactly and in this exact order:

${formatRecordedClickXPaths(trace)}

8. Do not omit or deduplicate repeated clicks.

9. Do not use CODEGEN locators for click actions.

10. Do not convert clicks into check(), focus(), selectOption(), assertions, waits, or helper calls.

11. Non-click actions may continue using appropriate TRACE or CODEGEN locators.

12. Every generated click XPath must be copied character-for-character.

VALIDATION ERROR:
${validationError}

TEST NAME:
${testName}

TRACE JSON:
${sanitizedTrace}

CODEGEN SCRIPT:
${sanitizedCodegen}

REJECTED OUTPUT EXCERPT:
${repairContext}
`;
}

async function generateValidatedScript({
  basePrompt,
  finalPrompt,
  sanitizedTrace,
  sanitizedCodegen,
  trace,
  codegen,
  canonicalStartUrl,
  testDataModel,
  testName,
  outputPath,
}) {
  let prompt =
    finalPrompt;

  let lastError = null;

  for (
    let attempt = 1;
    attempt <= 3;
    attempt += 1
  ) {
    const rawOutput =
      await callGroq(prompt);

    const cleaned =
      postProcessGeneratedScript(
        rawOutput,
        trace,
        codegen,
        canonicalStartUrl,
        testDataModel
      );

    try {
      if (
        !cleaned.includes(
          "test("
        )
      ) {
        throw new Error(
          "Invalid Playwright output from LLM"
        );
      }

      assertGeneratedScriptIsComplete(
        cleaned,
        outputPath
      );

      assertClicksUseRecordedXPaths(
        cleaned,
        trace
      );

      return cleaned;
    } catch (error) {
      lastError = error;

      if (attempt === 3) {
        break;
      }

      console.warn(
        `Generated script failed validation ` +
        `on attempt ${attempt}: ` +
        `${error.message}. ` +
        `Retrying with repair prompt...`
      );

      prompt =
        buildRepairPrompt({
          basePrompt,
          trace,
          sanitizedTrace,
          sanitizedCodegen,
          testName,
          invalidScript:
            cleaned,
          validationError:
            error.message ||
            String(error),
          testDataModel,
        });
    }
  }

  throw (
    lastError ||
    new Error(
      "Generated script failed validation."
    )
  );
}

async function callGroq(prompt) {
  for (
    let attempt = 0;
    attempt < 3;
    attempt += 1
  ) {
    try {
      const response =
        await generateFromOpenAI(
          prompt
        );

      addUsageSummary(
        llmUsageSummary,
        response
      );

      return response.text;
    } catch (error) {
      const errorText =
        error &&
        error.message
          ? error.message
          : String(error);

      const isRateLimit =
        errorText.includes(
          "rate_limit"
        ) ||
        errorText.includes("429");

      if (
        !isRateLimit ||
        attempt === 2
      ) {
        throw error;
      }

      const match =
        errorText.match(
          /try again in\s+([0-9.]+)s/i
        );

      const waitMs =
        match
          ? (
              Number(match[1]) +
              1
            ) * 1000
          : 20000;

      console.log(
        `Groq rate limited, retrying in ` +
        `${Math.round(
          waitMs / 1000
        )}s...`
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            waitMs
          )
      );
    }
  }

  throw new Error(
    "Groq request failed"
  );
}

function emitLlmUsageSummary() {
  const summary =
    formatUsageSummary(
      llmUsageSummary
    );

  if (summary.calls > 0) {
    console.log(
      `[llm-usage] ` +
      `${JSON.stringify(summary)}`
    );
  }
}

/*
 * Static plain templates are disabled.
 * Every filename now uses the normal LLM and validation path.
 */
const TEMPLATE_OVERRIDES = [];

function findTemplateOverride(
  outputPath
) {
  const fileName =
    path.basename(outputPath);

  return (
    TEMPLATE_OVERRIDES.find(
      (override) =>
        override.match(fileName)
    ) ||
    null
  );
}

function applyTemplate(
  templateContent,
  { testName }
) {
  return templateContent.replace(
    /\{\{TEST_NAME\}\}/g,
    testName
  );
}

function seedTemplateTestDataFileIfMissing(
  outputPath,
  override
) {
  if (
    !override?.testDataTemplate
  ) {
    return null;
  }

  const testDataPath =
    getTestDataPath(
      outputPath
    );

  if (
    fs.existsSync(
      testDataPath
    )
  ) {
    return testDataPath;
  }

  const templatePath =
    path.join(
      __dirname,
      "templates",
      override.testDataTemplate
    );

  if (
    !fs.existsSync(
      templatePath
    )
  ) {
    throw new Error(
      `Test data template file not found: ` +
      `${templatePath}`
    );
  }

  fs.mkdirSync(
    path.dirname(
      testDataPath
    ),
    { recursive: true }
  );

  fs.copyFileSync(
    templatePath,
    testDataPath
  );

  console.log(
    `Seeded test data from template: ` +
    `${testDataPath}`
  );

  return testDataPath;
}

async function useTemplate(
  override,
  {
    outputPath,
    testName,
    tracePath,
    codegenPath,
    trace,
    codegen,
  }
) {
  console.log(
    `Template match: ` +
    `"${override.template}" ` +
    `(matched ${path.basename(outputPath)}).`
  );

  console.log(
    `Pausing ${override.delayMs}ms ` +
    `before delivering template...`
  );

  await new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        override.delayMs
      )
  );

  const templatePath =
    path.join(
      __dirname,
      "templates",
      override.template
    );

  if (
    !fs.existsSync(
      templatePath
    )
  ) {
    throw new Error(
      `Template file not found: ` +
      `${templatePath}`
    );
  }

  const templateRaw =
    loadFile(templatePath);

  const resolved =
    applyTemplate(
      templateRaw,
      { testName }
    );

  console.log(
    "Writing template output..."
  );

  fs.mkdirSync(
    path.dirname(outputPath),
    { recursive: true }
  );

  seedTemplateTestDataFileIfMissing(
    outputPath,
    override
  );

  const testDataModel =
    buildTestDataModel(
      trace,
      codegen
    );

  const templateWithClicks =
    rebuildRecordedClicksFromTrace(
      resolved,
      trace
    );

  const testDataResult =
    writeTestDataFile(
      outputPath,
      trace,
      codegen,
      templateWithClicks,
      testDataModel
    );

  assertGeneratedScriptIsComplete(
    testDataResult.scriptText,
    outputPath
  );

  assertClicksUseRecordedXPaths(
    testDataResult.scriptText,
    trace
  );

  fs.writeFileSync(
    outputPath,
    testDataResult.scriptText,
    "utf8"
  );

  console.log(
    "Generating heal-wrapped version..."
  );

  let healedPath = null;

  try {
    healedPath =
      await generateAndWriteHealedSpec(
        testDataResult.scriptText,
        outputPath
      );
  } catch (error) {
    console.warn(
      `Heal-wrapped generation crashed: ` +
      `${error.message}. ` +
      `Continuing with plain spec only.`
    );
  }

  console.log(
    `Generated (from template): ` +
    `${outputPath}`
  );

  console.log(
    `Test data: ` +
    `${testDataResult.testDataPath}`
  );

  if (healedPath) {
    console.log(
      `Healed (heal-wrapped) spec: ` +
      `${healedPath}`
    );
  }
}

async function main() {
  const args =
    parseArgs(
      process.argv.slice(2)
    );

  if (args.help) {
    printHelp();
    return;
  }

  let tracePath =
    resolveFromRoot(
      args.trace
    );

  let codegenPath =
    resolveFromRoot(
      args.codegen
    );

  if (
    fs.existsSync(tracePath) &&
    fs
      .statSync(tracePath)
      .isDirectory()
  ) {
    const pair =
      getLatestArtifactPairFromDirectory(
        tracePath
      );

    if (!pair) {
      throw new Error(
        `No matching actions/codegen files ` +
        `found in ${tracePath}`
      );
    }

    tracePath =
      pair.tracePath;

    if (
      fs.existsSync(codegenPath) &&
      fs
        .statSync(codegenPath)
        .isDirectory()
    ) {
      codegenPath =
        pair.codegenPath;
    }
  }

  if (
    fs.existsSync(codegenPath) &&
    fs
      .statSync(codegenPath)
      .isDirectory()
  ) {
    const pair =
      getLatestArtifactPairFromDirectory(
        codegenPath
      );

    if (!pair) {
      throw new Error(
        `No matching actions/codegen files ` +
        `found in ${codegenPath}`
      );
    }

    codegenPath =
      pair.codegenPath;

    if (
      fs.existsSync(tracePath) &&
      fs
        .statSync(tracePath)
        .isDirectory()
    ) {
      tracePath =
        pair.tracePath;
    }
  }

  if (
    !fs.existsSync(tracePath) ||
    fs
      .statSync(tracePath)
      .isDirectory()
  ) {
    throw new Error(
      `Trace path must resolve to a JSON file. ` +
      `Got: ${tracePath}`
    );
  }

  if (
    !fs.existsSync(codegenPath) ||
    fs
      .statSync(codegenPath)
      .isDirectory()
  ) {
    throw new Error(
      `Codegen path must resolve to a JS file. ` +
      `Got: ${codegenPath}`
    );
  }

  const testName =
    (
      args["test-name"] ||
      ""
    ).trim() ||
    deriveTestName(
      codegenPath
    );

  const outputPath =
    buildOutputPath(
      args.output,
      testName ||
      deriveTestName(
        codegenPath
      )
    );

  console.log(
    `Final output path: ${outputPath}`
  );

  console.log(
    `Trace input path: ${tracePath}`
  );

  console.log(
    `Codegen input path: ${codegenPath}`
  );

  /*
   * Remove stale output before generation.
   * If validation fails, an older invalid file will
   * not remain and appear to be the new result.
   */
  fs.rmSync(
    outputPath,
    { force: true }
  );

  console.log(
    "Reading inputs..."
  );

  const trace =
    loadFile(tracePath);

  const codegen =
    loadFile(codegenPath);

  const override =
    findTemplateOverride(
      outputPath
    );

  if (override) {
    await useTemplate(
      override,
      {
        outputPath,
        testName,
        tracePath,
        codegenPath,
        trace,
        codegen,
      }
    );

    return;
  }

  const sanitizedTrace =
    sanitizeTraceForLlm(
      trace
    );

  const sanitizedCodegen =
    sanitizeCodegenForLlm(
      codegen
    );

  /*
   * Validate the raw TRACE click contract before
   * making an API request.
   */
  collectRecordedClickXPaths(
    trace
  );

  assertRefineInputsAreUsable({
    traceText: trace,
    codegenText: codegen,
    sanitizedTrace,
    sanitizedCodegen,
    tracePath,
    codegenPath,
  });

  const maskedArtifactPaths =
    writeMaskedArtifacts(
      outputPath,
      sanitizedTrace,
      sanitizedCodegen
    );

  const canonicalStartUrl =
    getCanonicalStartUrl(
      trace
    );

  const testDataModel =
    buildTestDataModel(
      trace,
      codegen
    );

  console.log(
    "Building prompt..."
  );

  const basePrompt =
    getScriptGeneratorPrompt();

  const finalPrompt =
    buildPrompt(
      basePrompt,
      sanitizedTrace,
      sanitizedCodegen,
      testName,
      testDataModel
    );

  console.log(
    "Calling Model..."
  );

  const cleaned =
    await generateValidatedScript({
      basePrompt,
      finalPrompt,
      sanitizedTrace,
      sanitizedCodegen,
      trace,
      codegen,
      canonicalStartUrl,
      testDataModel,
      testName,
      outputPath,
    });

  console.log(
    "Writing output..."
  );

  fs.mkdirSync(
    path.dirname(outputPath),
    { recursive: true }
  );

  const testDataResult =
    writeTestDataFile(
      outputPath,
      trace,
      codegen,
      cleaned,
      testDataModel
    );

  assertGeneratedScriptIsComplete(
    testDataResult.scriptText,
    outputPath
  );

  /*
   * Validate again after testData rewriting and
   * immediately before writing the final spec.
   */
  assertClicksUseRecordedXPaths(
    testDataResult.scriptText,
    trace
  );

  fs.writeFileSync(
    outputPath,
    testDataResult.scriptText,
    "utf8"
  );

  console.log(
    "Generating heal-wrapped version..."
  );

  let healedPath = null;

  try {
    healedPath =
      await generateAndWriteHealedSpec(
        testDataResult.scriptText,
        outputPath
      );
  } catch (error) {
    console.warn(
      `Heal-wrapped generation crashed: ` +
      `${error.message}. ` +
      `Continuing with plain spec only.`
    );
  }

  console.log(
    `Generated: ${outputPath}`
  );

  console.log(
    `Test data: ` +
    `${testDataResult.testDataPath}`
  );

  console.log(
    `DEBUG ONLY - MASKED TRACE: ` +
    `${maskedArtifactPaths.tracePath}`
  );

  console.log(
    `DEBUG ONLY - MASKED CODEGEN: ` +
    `${maskedArtifactPaths.codegenPath}`
  );

  if (healedPath) {
    console.log(
      `Healed (heal-wrapped) spec: ` +
      `${healedPath}`
    );
  }

  emitLlmUsageSummary();
}

main().catch((error) => {
  console.error(
    `refine-with-llm failed: ` +
    `${
      error.message ||
      String(error)
    }`
  );

  if (error?.stack) {
    console.error(
      error.stack
    );
  }

  emitLlmUsageSummary();
  process.exit(1);
});
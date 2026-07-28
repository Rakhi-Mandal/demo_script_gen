// =============================================================================
// regenerate-healed.js
//
// Standalone Node script that regenerates a single .healed.spec.js file
// from its plain .spec.js counterpart. Called by the backend after a user
// saves an edited plain spec.
//
// Behavior for product files (filename matches /product/i):
//   - First creation (no healed file): use the static template
//   - Subsequent saves (healed exists + snapshot exists):
//       smart diff between snapshot and current plain → patch only the
//       changed locator(s) into the healed file
//   - If smart diff can't be done safely: fall back to LLM
//
// Behavior for non-product files: LLM as usual
//
// Snapshots:
//   After every regen (template or LLM), we save the plain content next to
//   the plain file as <plain>.snapshot. On next regen we diff plain against
//   the snapshot to know which locators changed.
//
// Usage:
//   node src/script_generator/regenerate-healed.js --plain=<absolute-path-to-plain-spec>
// =============================================================================

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { generateFromOpenAI, buildUsageSummary, addUsageSummary, formatUsageSummary } = require("../utils/groqClient");

const ROOT = path.resolve(__dirname, "..", "..");
dotenv.config({ path: path.join(ROOT, ".env") });
const llmUsageSummary = buildUsageSummary();


// ---------------------------------------------------------------------------
// Template overrides
// ---------------------------------------------------------------------------

const TEMPLATE_OVERRIDES = [
  {
    match: /order/i,
    templatePath: path.join(__dirname, "templates", "order.healed.template.js"),
    description: "Product creation healed template",
  },
];

function findMatchingTemplate(plainPath) {
  const baseName = path.basename(plainPath);
  for (const override of TEMPLATE_OVERRIDES) {
    if (override.match.test(baseName) && fs.existsSync(override.templatePath)) {
      return override;
    }
  }
  return null;
}


// ---------------------------------------------------------------------------
// Snapshot helpers — write/read plain content as <plain>.snapshot
// ---------------------------------------------------------------------------

function snapshotPathFor(plainPath) {
  return plainPath + ".snapshot";
}

function writeSnapshot(plainPath, plainContent) {
  try {
    fs.writeFileSync(snapshotPathFor(plainPath), plainContent, "utf8");
  } catch (e) {
    console.error(`Warning: could not write snapshot for ${plainPath}: ${e.message}`);
  }
}

function readSnapshot(plainPath) {
  const snapPath = snapshotPathFor(plainPath);
  if (!fs.existsSync(snapPath)) return null;
  try {
    return fs.readFileSync(snapPath, "utf8");
  } catch (e) {
    return null;
  }
}


// ---------------------------------------------------------------------------
// Locator extraction — pull out the full locator expression from a line
// of plain spec source code.
//
// Supports:
//   page.locator('input[name="email"]')
//   page.locator('input[name="email"]').first()
//   page.getByRole('button', { name: 'Sign in' })
//   page.getByRole('button').filter({ hasText: 'X' })
//   page.getByText('Foo')
//   page.getByRole('button', { name: 'X', exact: true })
//   page.getByRole('button', { name: 'Continue', exact: true }).first()
//
// Strategy: find "page." occurrences, then walk forward keeping a balanced
// paren count. Stop when we hit `.fill(`, `.click(`, `.check(`, `.toBe...(`
// (these are the actions/assertions; the locator chain ends just before).
// We also accept chained locator helpers like `.filter(...)`, `.first()`,
// `.last()`, `.nth(0)` as part of the locator expression.
// ---------------------------------------------------------------------------

const LOCATOR_BREAKERS = [
  ".fill(", ".click(", ".check(", ".uncheck(", ".press(",
  ".type(", ".hover(", ".tap(", ".focus(", ".blur(",
  ".selectOption(", ".setInputFiles(", ".dragTo(",
  ".toBeVisible(", ".toBeHidden(", ".toBeEnabled(", ".toBeDisabled(",
  ".toBeEditable(", ".toBeChecked(", ".toHaveText(", ".toHaveValue(",
  ".toHaveCount(", ".toContainText(", ".toBeEmpty(",
];

const LOCATOR_CONTINUERS = [
  ".filter(", ".first(", ".last(", ".nth(", ".and(", ".or(",
  ".getByRole(", ".getByText(", ".getByLabel(", ".getByPlaceholder(",
  ".getByTitle(", ".getByTestId(", ".locator(",
];

function extractLocatorAt(source, startIndex) {
  // startIndex points to the 'p' in "page."
  let i = startIndex;
  let depth = 0;
  let len = source.length;
  while (i < len) {
    // Check if we're at a breaker AT depth 0
    if (depth === 0) {
      for (const breaker of LOCATOR_BREAKERS) {
        if (source.startsWith(breaker, i)) {
          // End of locator; return what we have up to here
          return source.slice(startIndex, i).trim();
        }
      }
    }
    const ch = source[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth < 0) {
        // We're inside an outer expression; locator ends here
        return source.slice(startIndex, i).trim();
      }
    } else if (ch === ";" || ch === "\n") {
      if (depth === 0) {
        return source.slice(startIndex, i).trim();
      }
    }
    i += 1;
  }
  return source.slice(startIndex).trim();
}

function extractLocatorsInOrder(specSource) {
  // Find every "page." occurrence and pull the locator chain.
  const locators = [];
  let i = 0;
  while (true) {
    const idx = specSource.indexOf("page.", i);
    if (idx === -1) break;
    const loc = extractLocatorAt(specSource, idx);
    if (loc && loc.length > 0) {
      locators.push(loc);
    }
    i = idx + 5;
  }
  return locators;
}


// ---------------------------------------------------------------------------
// Smart diff: given OLD plain content, NEW plain content, and CURRENT healed
// content, produce a patched healed string where only changed locators are
// updated.
//
// Returns { ok: true, patched, changes } on success.
// Returns { ok: false, reason } when smart diff isn't safe (counts differ,
// locator not found in healed, etc.).
// ---------------------------------------------------------------------------

function smartDiffPatch(oldPlain, newPlain, healedContent) {
  const oldLocs = extractLocatorsInOrder(oldPlain);
  const newLocs = extractLocatorsInOrder(newPlain);

  if (oldLocs.length === 0 || newLocs.length === 0) {
    return { ok: false, reason: "Could not extract locators from plain spec" };
  }
  if (oldLocs.length !== newLocs.length) {
    return {
      ok: false,
      reason: `Locator count changed (${oldLocs.length} -> ${newLocs.length}); structure differs`,
    };
  }

  // Pair by ORDER. Record each pair where the locator string changed.
  // Deduplicate by `from` string — the same locator can appear multiple
  // times in plain (e.g. visibility + click for the same button) and we
  // only need one replacement to update all occurrences in healed.
  const seen = new Set();
  const changes = [];
  for (let i = 0; i < oldLocs.length; i += 1) {
    if (oldLocs[i] === newLocs[i]) continue;
    if (seen.has(oldLocs[i])) continue;
    seen.add(oldLocs[i]);
    changes.push({ from: oldLocs[i], to: newLocs[i], index: i });
  }

  if (changes.length === 0) {
    // Nothing changed; no patching needed
    return { ok: true, patched: healedContent, changes: [] };
  }

  // Sanity check: every OLD locator we want to replace MUST exist in the
  // healed file. If not, plain & healed have drifted apart and we should
  // fall back to LLM instead of producing a half-patched file.
  for (const change of changes) {
    if (!healedContent.includes(change.from)) {
      return {
        ok: false,
        reason: `Plain locator [${change.from}] not found in healed file (out of sync)`,
      };
    }
  }

  // Apply all replacements in one pass. Use a placeholder to avoid the
  // problem where one change's `to` value matches another change's `from`.
  let patched = healedContent;
  changes.forEach((change, i) => {
    const placeholder = `__SMART_DIFF_PLACEHOLDER_${i}__`;
    const escaped = change.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patched = patched.replace(new RegExp(escaped, "g"), placeholder);
  });
  changes.forEach((change, i) => {
    const placeholder = `__SMART_DIFF_PLACEHOLDER_${i}__`;
    patched = patched.split(placeholder).join(change.to);
  });

  return { ok: true, patched, changes };
}


// ---------------------------------------------------------------------------
// Helpers — heal-wrapper LLM
// ---------------------------------------------------------------------------

function loadFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function getHealWrapperPrompt() {
  const promptPath = path.join(ROOT, "src", "prompts", "heal_wrapper_prompt.py");
  const promptSource = loadFile(promptPath);
  const tripleQuoteMatch = promptSource.match(/return\s+"""([\s\S]*?)"""/);
  if (tripleQuoteMatch) return tripleQuoteMatch[1].trim();
  throw new Error(`Unable to extract prompt from ${promptPath}`);
}

function cleanLlmOutput(rawOutput) {
  let cleaned = (rawOutput || "").trim();
  if (cleaned.includes("```")) {
    const parts = cleaned.split("```");
    if (parts.length >= 3) {
      let candidate = parts[1].trim();
      if (candidate.toLowerCase().startsWith("javascript")) {
        candidate = candidate.slice("javascript".length).trim();
      } else if (candidate.toLowerCase().startsWith("js")) {
        candidate = candidate.slice("js".length).trim();
      }
      cleaned = candidate;
    }
  }
  const importIndex = cleaned.indexOf("import ");
  const testIndex = cleaned.indexOf("test(");
  if (importIndex >= 0) cleaned = cleaned.slice(importIndex).trim();
  else if (testIndex >= 0) cleaned = cleaned.slice(testIndex).trim();
  return cleaned;
}

function extractHealedSpecBetweenSentinels(rawOutput) {
  const text = String(rawOutput || "").trim();
  const startTag = "<<<UPDATED_TEST>>>";
  const endTag = "<<<END_UPDATED_TEST>>>";
  if (text.includes(startTag) && text.includes(endTag)) {
    const between = text.split(startTag, 2)[1].split(endTag, 2)[0].trim();
    return cleanLlmOutput(between);
  }
  return cleanLlmOutput(text);
}

function buildHealedOutputPath(plainOutputPath) {
  const plainPath = path.resolve(plainOutputPath);
  const baseName = path.basename(plainPath);
  const suiteDir = path.dirname(plainPath);
  const suiteName = path.basename(suiteDir).toLowerCase();
  const projectDir = path.dirname(suiteDir);

  const healedDir = (suiteName === "sanity" || suiteName === "regression")
    ? path.join(projectDir, "healed", suiteName)
    : path.join(projectDir, "healed");

  let healedName;
  if (baseName.endsWith(".spec.js")) {
    const stem = baseName.slice(0, -".spec.js".length);
    healedName = `${stem}.healed.spec.js`;
  } else if (baseName.endsWith(".js")) {
    const stem = baseName.slice(0, -".js".length);
    healedName = `${stem}.healed.js`;
  } else {
    healedName = `${baseName}.healed`;
  }

  return path.join(healedDir, healedName);
}

function rewriteHealedImports(healedSpecText, plainOutputPath) {
  // No-op — fixtures and test-data.json live inside the project at the correct
  // depth, so '../../' imports from <project>/healed/<suite>/foo.js are correct.
  return healedSpecText;
}

function fixHealedImports(content) {
  // Post-process: ensure imports use '../../' (not '../../../') for test-data.json and fixtures.
  return content
    .replace(/'\.\.\/\.\.\/\.\.\/test-data\.json'/g, "'../../test-data.json'")
    .replace(/'\.\.\/\.\.\/\.\.\/fixtures\//g, "'../../fixtures/");
}

async function callOpenAiWithRetry(prompt, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await generateFromOpenAI(prompt);
      addUsageSummary(llmUsageSummary, response);
      return response.text;
    } catch (error) {
      const errorText = error && error.message ? error.message : String(error);
      const isRateLimit = errorText.includes("rate_limit") || errorText.includes("429");
      if (!isRateLimit || attempt === maxAttempts - 1) throw error;
      const match = errorText.match(/try again in\s+([0-9.]+)s/i);
      const waitMs = match ? (Number(match[1]) + 1) * 1000 : 20000;
      console.error(`OpenAI rate limited, retrying in ${Math.round(waitMs / 1000)}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw new Error("OpenAI request failed after retries");
}

function emitLlmUsageSummary() {
  const summary = formatUsageSummary(llmUsageSummary);
  if (summary.calls > 0) {
    console.log(`[llm-usage] ${JSON.stringify(summary)}`);
  }
}


// ---------------------------------------------------------------------------
// LLM-based regeneration (fallback path)
// ---------------------------------------------------------------------------

async function regenerateViaLlm(plainPath, plainSpecText, healedPath) {
  console.error("Calling heal-wrapper LLM...");
  const healSystemPrompt = getHealWrapperPrompt();
  const userPrompt = `Here is a clean Playwright spec. Convert it to a heal-wrapped version per the rules.\n\nSPEC:\n${plainSpecText}`;
  const fullPrompt = `${healSystemPrompt}\n\n${userPrompt}`;
  const rawHealed = await callOpenAiWithRetry(fullPrompt);

  const healedSpec = extractHealedSpecBetweenSentinels(rawHealed);
  if (!healedSpec || !healedSpec.includes("test(") || !healedSpec.includes("heal(")) {
    throw new Error("Heal-wrapped output looks invalid (no test() or no heal() calls).");
  }

  fs.mkdirSync(path.dirname(healedPath), { recursive: true });
  const healedWithFixedImports = rewriteHealedImports(healedSpec, plainPath);
  fs.writeFileSync(healedPath, fixHealedImports(healedWithFixedImports), "utf8");
  console.error(`Wrote healed spec (LLM): ${healedPath}`);
  // Update snapshot to current plain
  writeSnapshot(plainPath, plainSpecText);
}


// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, ...rest] = arg.slice(2).split("=");
    args[key] = rest.length > 0 ? rest.join("=") : "";
  }
  return args;
}

async function regenerateHealedSpec(plainSpecPath) {
  if (!plainSpecPath) {
    throw new Error("--plain=<path> is required");
  }
  const plainPath = path.resolve(plainSpecPath);
  if (!fs.existsSync(plainPath)) {
    throw new Error(`Plain spec not found: ${plainPath}`);
  }

  console.error(`Reading plain spec: ${plainPath}`);
  const plainSpecText = loadFile(plainPath);
  const healedPath = buildHealedOutputPath(plainPath);
  const templateOverride = findMatchingTemplate(plainPath);

  // ---- Branch 1: matched template + no healed file → use template ----
  if (templateOverride && !fs.existsSync(healedPath)) {
    console.error(`Using template (first-time creation, skipping LLM): ${templateOverride.templatePath}`);
    const templateContent = loadFile(templateOverride.templatePath);
    fs.mkdirSync(path.dirname(healedPath), { recursive: true });
    fs.writeFileSync(healedPath, fixHealedImports(templateContent), "utf8");
    writeSnapshot(plainPath, plainSpecText);
    console.error(`Wrote healed spec (from template): ${healedPath}`);
    console.log(JSON.stringify({
      ok: true,
      plainPath,
      healedPath,
      usedTemplate: true,
      templateDescription: templateOverride.description,
    }));
    return healedPath;
  }

  // ---- Branch 2: matched template + healed exists → try smart diff ----
  if (templateOverride && fs.existsSync(healedPath)) {
    const snapshot = readSnapshot(plainPath);
    if (snapshot) {
      console.error("Attempting smart diff (snapshot found)...");
      const healedContent = loadFile(healedPath);
      const diffResult = smartDiffPatch(snapshot, plainSpecText, healedContent);
      if (diffResult.ok) {
        if (diffResult.changes.length === 0) {
          console.error("No locator changes detected; healed file unchanged.");
        } else {
          fs.writeFileSync(healedPath, fixHealedImports(diffResult.patched), "utf8");
          console.error(`Smart diff patched ${diffResult.changes.length} locator(s) in healed file.`);
          for (const c of diffResult.changes) {
            console.error(`  • ${c.from} -> ${c.to}`);
          }
        }
        writeSnapshot(plainPath, plainSpecText);
        console.log(JSON.stringify({
          ok: true,
          plainPath,
          healedPath,
          usedSmartDiff: true,
          changes: diffResult.changes.length,
        }));
        return healedPath;
      }
      console.error(`Smart diff not safe (${diffResult.reason}); falling back to LLM.`);
    } else {
      console.error("No snapshot found; falling back to LLM.");
    }
    // fall through to LLM
  }

  // ---- Branch 3: LLM path ----
  await regenerateViaLlm(plainPath, plainSpecText, healedPath);
  emitLlmUsageSummary();
  console.log(JSON.stringify({
    ok: true,
    plainPath,
    healedPath,
    usedLlm: true,
  }));
  return healedPath;
}

(async () => {
  try {
    const args = parseArgs(process.argv.slice(2));
    await regenerateHealedSpec(args.plain);
  } catch (error) {
    console.error(`regenerate-healed failed: ${error.message || String(error)}`);
    emitLlmUsageSummary();
    console.log(JSON.stringify({
      ok: false,
      error: error.message || String(error),
    }));
    process.exit(1);
  }
})();

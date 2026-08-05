const fs = require("node:fs");
const path = require("node:path");

const {
    test: base,
    expect
} = require("@playwright/test");

const {
    createSmartClickPage
} = require("./smart-click");

/*
 * Robust same-locator click handling.
 *
 * - No alternate selector is generated.
 * - primary_xpath and backup_xpath are ignored.
 * - Readiness checks use trial clicks, so they do not dispatch application
 *   clicks.
 * - Exactly one real click is dispatched after the locator becomes usable.
 * - Disabled, unstable, off-screen, covered, detached, rerendered and
 *   navigation-related states are repeatedly retried.
 */
const INITIAL_ACTIONABILITY_TIMEOUT_MS = 1000;
const CLICK_RETRY_DELAY_MS = 3000;
const RETRY_ACTIONABILITY_TIMEOUT_MS = 15000;
const ACTIONABILITY_PROBE_SLICE_MS = 1500;
const ACTIONABILITY_POLL_INTERVAL_MS = 250;
const REAL_CLICK_TIMEOUT_MS = 15000;
const PAGE_READY_TIMEOUT_MS = 15000;
const POST_CLICK_NAVIGATION_GRACE_MS = 15000;

const DEFAULT_CODEGEN_OUTPUT_DIR = path.resolve(
    __dirname,
    "../../../codegen-output"
);

function delay(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function formatError(error) {
    return (
        error instanceof Error
            ? error.message
            : String(error)
    )
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeSelector(value) {
    const trimmed = String(value || "").trim();

    if (!trimmed) {
        return "";
    }

    if (/^xpath=/i.test(trimmed)) {
        return "xpath=" + trimmed.replace(/^xpath=/i, "");
    }

    if (
        trimmed.startsWith("/") ||
        trimmed.startsWith("(")
    ) {
        return `xpath=${trimmed}`;
    }

    return trimmed;
}

function isXPathSelector(value) {
    return /^xpath=/i.test(
        normalizeSelector(value)
    );
}

function isLocatorLike(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        typeof value.click === "function" &&
        typeof value.count === "function" &&
        typeof value.locator === "function"
    );
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
    }

    while (true) {
        directories.push(current);

        const parent = path.dirname(current);

        if (parent === current) {
            break;
        }

        current = parent;
    }

    return directories;
}

/*
 * The actions directory is optional. Ordinary test files must work even when
 * no trace directory or matching actions JSON exists.
 */
function findCodegenOutputDirectory(startingPaths) {
    const configuredDirectory =
        process.env.PW_CODEGEN_OUTPUT_DIR?.trim();

    if (configuredDirectory) {
        const resolvedDirectory = path.resolve(
            configuredDirectory
        );

        return isDirectory(resolvedDirectory)
            ? resolvedDirectory
            : "";
    }

    if (isDirectory(DEFAULT_CODEGEN_OUTPUT_DIR)) {
        return DEFAULT_CODEGEN_OUTPUT_DIR;
    }

    for (const startingPath of startingPaths) {
        if (!startingPath) {
            continue;
        }

        for (
            const currentDirectory of
            getParentDirectories(startingPath)
        ) {
            const directCandidate = path.join(
                currentDirectory,
                "codegen-output"
            );

            const backendCandidate = path.join(
                currentDirectory,
                "backend",
                "codegen-output"
            );

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
    if (
        typeof literal !== "string" ||
        literal.length < 2
    ) {
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

    for (
        let index = 1;
        index < literal.length - 1;
        index += 1
    ) {
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
            case "n":
                result += "\n";
                break;

            case "r":
                result += "\r";
                break;

            case "t":
                result += "\t";
                break;

            case "b":
                result += "\b";
                break;

            case "f":
                result += "\f";
                break;

            case "v":
                result += "\v";
                break;

            case "0":
                result += "\0";
                break;

            case "\\":
                result += "\\";
                break;

            case "'":
                result += "'";
                break;

            case '"':
                result += '"';
                break;

            default:
                result += character;
                break;
        }
    }

    return escaped
        ? null
        : result;
}

/*
 * Extracts direct generated click statements such as:
 *
 * await page.locator("xpath=...").click();
 */
function extractDirectClickSelectorsFromSource(sourceText) {
    const selectors = [];

    const directClickPattern =
        /await\s+page\.locator\(\s*((?:"(?:\\.|[^"\\])*")|(?:'(?:\\.|[^'\\])*'))\s*\)\s*\.click\s*\(/g;

    for (
        const match of
        String(sourceText || "").matchAll(
            directClickPattern
        )
    ) {
        const decoded =
            decodeJavaScriptStringLiteral(match[1]);

        if (decoded === null) {
            continue;
        }

        selectors.push(
            normalizeSelector(decoded)
        );
    }

    return selectors;
}

function extractDirectClickSelectorsFromFile(testFilePath) {
    if (
        !testFilePath ||
        !isFile(testFilePath)
    ) {
        return [];
    }

    try {
        return extractDirectClickSelectorsFromSource(
            fs.readFileSync(testFilePath, "utf8")
        );
    } catch {
        return [];
    }
}

function listActionsFiles(codegenOutputDirectory) {
    if (
        !codegenOutputDirectory ||
        !isDirectory(codegenOutputDirectory)
    ) {
        return [];
    }

    try {
        return fs.readdirSync(
            codegenOutputDirectory,
            {
                withFileTypes: true
            }
        )
            .filter(entry => {
                return (
                    entry.isFile() &&
                    /^actions(?:-.*)?\.json$/i.test(
                        entry.name
                    )
                );
            })
            .map(entry => {
                const filePath = path.join(
                    codegenOutputDirectory,
                    entry.name
                );

                return {
                    filePath,
                    modifiedAt:
                        fs.statSync(filePath).mtimeMs
                };
            })
            .sort((first, second) => {
                return (
                    second.modifiedAt -
                    first.modifiedAt
                );
            });
    } catch {
        return [];
    }
}

function readActionsFile(filePath) {
    try {
        const parsed = JSON.parse(
            fs.readFileSync(filePath, "utf8")
        );

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
            const selector = normalizeSelector(
                action.selector
            );

            if (!selector) {
                return {
                    valid: false,
                    reason:
                        "contains a click without a selector",
                    actions: [],
                    clickSelectors: []
                };
            }

            if (!isXPathSelector(selector)) {
                return {
                    valid: false,
                    reason:
                        "contains a click whose selector is not XPath",
                    actions: [],
                    clickSelectors: []
                };
            }

            action.selector = selector;
            clickSelectors.push(selector);
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

/*
 * Trace mode is enabled only for a complete, exact selector-sequence match.
 * No latest-file fallback and no partial match are used.
 */
function resolveOptionalTraceActions({
    startingPaths,
    testFilePath
}) {
    const specClickSelectors =
        extractDirectClickSelectorsFromFile(
            testFilePath
        );

    if (!specClickSelectors.length) {
        return {
            actionsPath: "",
            actions: [],
            selectionReason:
                "trace disabled; the spec has no parseable direct locator clicks"
        };
    }

    if (
        specClickSelectors.some(selector => {
            return !isXPathSelector(selector);
        })
    ) {
        return {
            actionsPath: "",
            actions: [],
            selectionReason:
                "trace disabled; the spec contains a non-XPath direct click"
        };
    }

    const configuredFile =
        process.env.PW_ACTIONS_PATH?.trim();

    if (configuredFile) {
        const resolvedFile = path.resolve(
            configuredFile
        );

        if (!isFile(resolvedFile)) {
            return {
                actionsPath: "",
                actions: [],
                selectionReason:
                    `trace disabled; PW_ACTIONS_PATH is not a file: ${resolvedFile}`
            };
        }

        const inspected = readActionsFile(
            resolvedFile
        );

        if (!inspected.valid) {
            return {
                actionsPath: "",
                actions: [],
                selectionReason:
                    `trace disabled; configured actions file is invalid: ${inspected.reason}`
            };
        }

        if (
            !selectorsMatchExactly(
                specClickSelectors,
                inspected.clickSelectors
            )
        ) {
            return {
                actionsPath: "",
                actions: [],
                selectionReason:
                    "trace disabled; configured actions file does not exactly match this spec"
            };
        }

        return {
            actionsPath: resolvedFile,
            actions: inspected.actions,
            selectionReason:
                "PW_ACTIONS_PATH exact click-sequence match"
        };
    }

    const codegenOutputDirectory =
        findCodegenOutputDirectory(
            startingPaths
        );

    if (!codegenOutputDirectory) {
        return {
            actionsPath: "",
            actions: [],
            selectionReason:
                "trace disabled; codegen-output directory was not found"
        };
    }

    for (
        const fileEntry of
        listActionsFiles(codegenOutputDirectory)
    ) {
        const inspected = readActionsFile(
            fileEntry.filePath
        );

        if (!inspected.valid) {
            continue;
        }

        if (
            selectorsMatchExactly(
                specClickSelectors,
                inspected.clickSelectors
            )
        ) {
            return {
                actionsPath: fileEntry.filePath,
                actions: inspected.actions,
                selectionReason:
                    `exact direct-click sequence match; ${inspected.clickSelectors.length} clicks`
            };
        }
    }

    return {
        actionsPath: "",
        actions: [],
        selectionReason:
            "trace disabled; no actions JSON exactly matched this spec"
    };
}

async function waitForPageReadiness(page, timeout) {
    try {
        await page.waitForLoadState(
            "domcontentloaded",
            {
                timeout
            }
        );
    } catch {
        /*
         * A SPA may already be usable while background navigation or network
         * activity remains in progress. Locator trials remain the source of
         * truth for click readiness.
         */
    }
}

function createAttemptOptions(
    options,
    {
        trial,
        timeout,
        noWaitAfter
    }
) {
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

/*
 * For normal Playwright locators, strict-mode duplicates are handled by
 * testing each nth() candidate. For smart-click trace locators, smart-click.js
 * already resolves duplicate XPath matches, so the complete locator is used.
 */
async function findActionableCandidate({
    locator,
    options,
    timeout,
    traceMode
}) {
    if (traceMode) {
        await locator.click(
            createAttemptOptions(
                options,
                {
                    trial: true,
                    timeout,
                    noWaitAfter: true
                }
            )
        );

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
        throw new Error(
            "Locator resolved to no elements"
        );
    }

    if (count === 1) {
        await locator.click(
            createAttemptOptions(
                options,
                {
                    trial: true,
                    timeout,
                    noWaitAfter: true
                }
            )
        );

        return locator;
    }

    const successfulCandidates = [];
    const failures = [];
    const startedAt = Date.now();
    const deadline = startedAt + timeout;

    for (
        let index = 0;
        index < count;
        index += 1
    ) {
        const remaining = deadline - Date.now();

        if (remaining <= 0) {
            break;
        }

        const remainingCandidates =
            Math.max(1, count - index);

        const candidateTimeout = Math.max(
            1,
            Math.floor(
                remaining /
                remainingCandidates
            )
        );

        const candidate = locator.nth(index);

        try {
            await candidate.click(
                createAttemptOptions(
                    options,
                    {
                        trial: true,
                        timeout: candidateTimeout,
                        noWaitAfter: true
                    }
                )
            );

            successfulCandidates.push({
                index,
                locator: candidate
            });
        } catch (error) {
            failures.push(
                `candidate ${index + 1}: ${formatError(error)}`
            );
        }
    }

    if (successfulCandidates.length === 1) {
        return successfulCandidates[0].locator;
    }

    if (successfulCandidates.length > 1) {
        throw new Error(
            (
                `Locator resolved to ${count} elements and ` +
                `${successfulCandidates.length} were actionable. ` +
                "The click is ambiguous."
            )
        );
    }

    throw new Error(
        [
            `Locator resolved to ${count} elements, but none became actionable.`,
            ...failures
        ].join("\n")
    );
}

async function waitUntilActionable({
    page,
    locator,
    options,
    selectorHint,
    timeout,
    traceMode
}) {
    let attempt = 0;
    let lastError = null;

    await waitForPageReadiness(
        page,
        Math.min(
            PAGE_READY_TIMEOUT_MS,
            timeout,
            2000
        )
    );

    const startedAt = Date.now();
    const deadline = startedAt + timeout;

    while (Date.now() < deadline) {
        attempt += 1;

        const remaining = deadline - Date.now();

        const probeTimeout = Math.max(
            1,
            Math.min(
                ACTIONABILITY_PROBE_SLICE_MS,
                remaining
            )
        );

        try {
            const candidate =
                await findActionableCandidate({
                    locator,
                    options,
                    timeout: probeTimeout,
                    traceMode
                });

            return {
                locator: candidate,
                attempt,
                elapsedMs:
                    Date.now() - startedAt
            };
        } catch (error) {
            lastError = error;

            console.warn(
                [
                    "[smart-test]",
                    "Actionability probe failed.",
                    `attempt=${attempt}`,
                    `elapsedMs=${Date.now() - startedAt}`,
                    `selector=${selectorHint || "(unknown)"}`,
                    `reason=${formatError(error)}`
                ].join(" ")
            );
        }

        const waitMs = Math.min(
            ACTIONABILITY_POLL_INTERVAL_MS,
            Math.max(
                0,
                deadline - Date.now()
            )
        );

        if (waitMs > 0) {
            await delay(waitMs);
        }
    }

    throw new Error(
        [
            (
                "The same locator did not become actionable " +
                `within ${timeout}ms.`
            ),
            `selector: ${selectorHint || ""}`,
            `last error: ${formatError(lastError)}`
        ].join("\n")
    );
}

async function executePreparedClick({
    page,
    locator,
    options,
    selectorHint,
    actionabilityTimeout,
    traceMode
}) {
    const prepared = await waitUntilActionable({
        page,
        locator,
        options,
        selectorHint,
        timeout: actionabilityTimeout,
        traceMode
    });

    if (options.trial === true) {
        return;
    }

    const requestedTimeout = Number(
        options.timeout
    );

    const realClickTimeout = Math.max(
        REAL_CLICK_TIMEOUT_MS,
        Number.isFinite(requestedTimeout) &&
        requestedTimeout > 0
            ? requestedTimeout
            : 0
    );

    /*
     * noWaitAfter avoids reporting a successful dispatch as a click failure
     * merely because a subsequent navigation takes longer. Navigation is
     * given its own best-effort grace period immediately afterward.
     */
    await prepared.locator.click(
        createAttemptOptions(
            options,
            {
                trial: false,
                timeout: realClickTimeout,
                noWaitAfter: true
            }
        )
    );

    await delay(100);

    await waitForPageReadiness(
        page,
        POST_CLICK_NAVIGATION_GRACE_MS
    );

    console.log(
        [
            "[smart-test]",
            "Prepared click succeeded.",
            `selector=${selectorHint || "(unknown)"}`,
            `probeAttempt=${prepared.attempt}`,
            `probeElapsedMs=${prepared.elapsedMs}`,
            `realClickTimeoutMs=${realClickTimeout}`
        ].join(" ")
    );
}

function createDelayedClickRetryPage(
    page,
    {
        rawPage,
        traceSelectors
    }
) {
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

    function wrapLocator(
        locator,
        selectorHint
    ) {
        return new Proxy(
            locator,
            {
                get(target, property) {
                    if (property === "click") {
                        return async (
                            options = {}
                        ) => {
                            const traceMode =
                                traceSelectors.has(
                                    normalizeSelector(selectorHint)
                                );

                            try {
                                return await executePreparedClick({
                                    page: rawPage,
                                    locator: target,
                                    options,
                                    selectorHint,
                                    actionabilityTimeout:
                                        INITIAL_ACTIONABILITY_TIMEOUT_MS,
                                    traceMode
                                });
                            } catch (firstError) {
                                if (options.trial === true) {
                                    throw firstError;
                                }

                                console.warn(
                                    [
                                        "[smart-test]",
                                        "Initial prepared click failed.",
                                        `selector=${selectorHint || "(unknown)"}`,
                                        `reason=${formatError(firstError)}`,
                                        `waitingMs=${CLICK_RETRY_DELAY_MS}`,
                                        "Retrying the same locator."
                                    ].join(" ")
                                );

                                await delay(
                                    CLICK_RETRY_DELAY_MS
                                );

                                try {
                                    return await executePreparedClick({
                                        page: rawPage,
                                        locator: target,
                                        options,
                                        selectorHint,
                                        actionabilityTimeout:
                                            RETRY_ACTIONABILITY_TIMEOUT_MS,
                                        traceMode
                                    });
                                } catch (secondError) {
                                    throw new Error(
                                        [
                                            "",
                                            "[smart-test] Click failed after robust same-locator retry.",
                                            "",
                                            `selector: ${selectorHint || ""}`,
                                            (
                                                "initial actionability timeout: " +
                                                `${INITIAL_ACTIONABILITY_TIMEOUT_MS}ms`
                                            ),
                                            (
                                                "delay before retry: " +
                                                `${CLICK_RETRY_DELAY_MS}ms`
                                            ),
                                            (
                                                "retry actionability timeout: " +
                                                `${RETRY_ACTIONABILITY_TIMEOUT_MS}ms`
                                            ),
                                            (
                                                "real click timeout: at least " +
                                                `${REAL_CLICK_TIMEOUT_MS}ms`
                                            ),
                                            "",
                                            `initial error: ${formatError(firstError)}`,
                                            `retry error: ${formatError(secondError)}`
                                        ].join("\n"),
                                        {
                                            cause: secondError
                                        }
                                    );
                                }
                            }
                        };
                    }

                    const value = Reflect.get(
                        target,
                        property,
                        target
                    );

                    if (typeof value !== "function") {
                        return value;
                    }

                    return (...args) => {
                        const result = value.apply(
                            target,
                            args
                        );

                        if (isLocatorLike(result)) {
                            const nextSelectorHint =
                                property === "locator" &&
                                typeof args[0] === "string"
                                    ? normalizeSelector(args[0])
                                    : selectorHint;

                            return wrapLocator(
                                result,
                                nextSelectorHint
                            );
                        }

                        if (
                            property === "frameLocator" &&
                            result
                        ) {
                            return wrapFrameLocator(result);
                        }

                        return result;
                    };
                }
            }
        );
    }

    function wrapFrameLocator(frameLocator) {
        return new Proxy(
            frameLocator,
            {
                get(target, property) {
                    const value = Reflect.get(
                        target,
                        property,
                        target
                    );

                    if (typeof value !== "function") {
                        return value;
                    }

                    if (property === "frameLocator") {
                        return (...args) => {
                            return wrapFrameLocator(
                                value.apply(target, args)
                            );
                        };
                    }

                    if (
                        locatorFactoryNames.has(property)
                    ) {
                        return (...args) => {
                            const locator = value.apply(
                                target,
                                args
                            );

                            const selectorHint =
                                property === "locator" &&
                                typeof args[0] === "string"
                                    ? normalizeSelector(args[0])
                                    : undefined;

                            return wrapLocator(
                                locator,
                                selectorHint
                            );
                        };
                    }

                    return value.bind(target);
                }
            }
        );
    }

    return new Proxy(
        page,
        {
            get(target, property) {
                const value = Reflect.get(
                    target,
                    property,
                    target
                );

                if (typeof value !== "function") {
                    return value;
                }

                if (property === "frameLocator") {
                    return (...args) => {
                        return wrapFrameLocator(
                            value.apply(target, args)
                        );
                    };
                }

                if (locatorFactoryNames.has(property)) {
                    return (...args) => {
                        const locator = value.apply(
                            target,
                            args
                        );

                        const selectorHint =
                            property === "locator" &&
                            typeof args[0] === "string"
                                ? normalizeSelector(args[0])
                                : undefined;

                        return wrapLocator(
                            locator,
                            selectorHint
                        );
                    };
                }

                return value.bind(target);
            }
        }
    );
}

const test = base.extend({
    page: async (
        {
            page
        },
        use,
        testInfo
    ) => {
        const testFilePath = testInfo.file
            ? path.resolve(testInfo.file)
            : "";

        const {
            actionsPath,
            actions,
            selectionReason
        } = resolveOptionalTraceActions({
            startingPaths: [
                process.cwd(),
                testInfo.config.rootDir,
                testFilePath,
                testFilePath
                    ? path.dirname(testFilePath)
                    : "",
                __dirname
            ],
            testFilePath
        });

        const recordedClickCount =
            actions.filter(action => {
                return action?.action === "click";
            }).length;

        const traceMode =
            recordedClickCount > 0;

        const traceSelectors = new Set(
            actions
                .filter(action => {
                    return action?.action === "click";
                })
                .map(action => {
                    return normalizeSelector(
                        action.selector
                    );
                })
                .filter(Boolean)
        );

        console.log(
            `[smart-click] Implementation: ${require.resolve("./smart-click")}`
        );

        console.log(
            `[smart-click] Executing spec: ${testFilePath || "(unknown)"}`
        );

        console.log(
            `[smart-click] Trace mode: ${traceMode ? "enabled" : "disabled"}`
        );

        console.log(
            `[smart-click] Trace selection: ${selectionReason}`
        );

        if (actionsPath) {
            console.log(
                `[smart-click] Actions file: ${actionsPath}`
            );
        }

        console.log(
            `[smart-click] Recorded clicks: ${recordedClickCount}`
        );

        console.log(
            [
                "[smart-test]",
                (
                    "initial actionability timeout=" +
                    `${INITIAL_ACTIONABILITY_TIMEOUT_MS}ms`
                ),
                (
                    "retry delay=" +
                    `${CLICK_RETRY_DELAY_MS}ms`
                ),
                (
                    "retry actionability timeout=" +
                    `${RETRY_ACTIONABILITY_TIMEOUT_MS}ms`
                ),
                (
                    "probe slice=" +
                    `${ACTIONABILITY_PROBE_SLICE_MS}ms`
                ),
                (
                    "real click timeout=" +
                    `${REAL_CLICK_TIMEOUT_MS}ms minimum`
                )
            ].join(" ")
        );

        const traceAwarePage = traceMode
            ? createSmartClickPage(
                page,
                actions,
                {
                    testFilePath,
                    actionsPath
                }
            )
            : page;

        const retryPage =
            createDelayedClickRetryPage(
                traceAwarePage,
                {
                    rawPage: page,
                    traceSelectors
                }
            );

        await use(retryPage);
    }
});

module.exports = {
    test,
    expect
};
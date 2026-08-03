const fs =
    require("node:fs");

const path =
    require("node:path");

const {
    test: base,
    expect
} =
    require("@playwright/test");

const {
    createSmartClickPage
} =
    require("./smart-click");

/*
 * smart-test.js is expected at:
 *
 * backend/
 *   tests/
 *     demo-framework-01/
 *       utils/
 *         smart-test.js
 *
 * Therefore ../../../codegen-output resolves to:
 *
 * backend/codegen-output
 */
const DEFAULT_CODEGEN_OUTPUT_DIR =
    path.resolve(
        __dirname,
        "../../../codegen-output"
    );

function normalizeSelector(
    value
) {
    const trimmed =
        String(
            value || ""
        ).trim();

    if (!trimmed) {
        return "";
    }

    if (
        /^xpath=/i.test(
            trimmed
        )
    ) {
        return (
            "xpath=" +
            trimmed.replace(
                /^xpath=/i,
                ""
            )
        );
    }

    if (
        trimmed.startsWith("/") ||
        trimmed.startsWith("(")
    ) {
        return `xpath=${trimmed}`;
    }

    return trimmed;
}

function isDirectory(
    directoryPath
) {
    try {
        return fs
            .statSync(
                directoryPath
            )
            .isDirectory();
    } catch {
        return false;
    }
}

function isFile(
    filePath
) {
    try {
        return fs
            .statSync(
                filePath
            )
            .isFile();
    } catch {
        return false;
    }
}

/**
 * smart-click.js writes a temporary file into the destination directory
 * before replacing the original file.
 *
 * Therefore checking only the file itself is insufficient. The parent
 * directory must also allow temporary-file creation and replacement.
 */
function assertReadableWritableFile(
    filePath,
    description
) {
    const resolvedPath =
        path.resolve(
            filePath
        );

    if (
        !isFile(
            resolvedPath
        )
    ) {
        throw new Error(
            [
                "",
                `${description} does not exist or is not a file.`,
                `Resolved path: ${resolvedPath}`
            ].join("\n")
        );
    }

    try {
        fs.accessSync(
            resolvedPath,
            fs.constants.R_OK |
            fs.constants.W_OK
        );
    } catch (error) {
        throw new Error(
            [
                "",
                `${description} is not readable and writable.`,
                `Resolved path: ${resolvedPath}`,
                `Reason: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            ].join("\n")
        );
    }

    const parentDirectory =
        path.dirname(
            resolvedPath
        );

    try {
        fs.accessSync(
            parentDirectory,
            fs.constants.R_OK |
            fs.constants.W_OK
        );
    } catch (error) {
        throw new Error(
            [
                "",
                `${description} parent directory is not writable.`,
                `Directory: ${parentDirectory}`,
                "",
                "smart-click.js needs permission to create and rename",
                "temporary files in this directory.",
                "",
                `Reason: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            ].join("\n")
        );
    }

    return resolvedPath;
}

function getParentDirectories(
    startingPath
) {
    const directories =
        [];

    let current =
        path.resolve(
            startingPath
        );

    if (isFile(current)) {
        current =
            path.dirname(
                current
            );
    }

    while (true) {
        directories.push(
            current
        );

        const parent =
            path.dirname(
                current
            );

        if (
            parent === current
        ) {
            break;
        }

        current =
            parent;
    }

    return directories;
}

/**
 * Locates:
 *
 * C:\record_and_play_back-updated-framework_01\
 * backend\codegen-output
 *
 * Resolution order:
 *
 * 1. PW_CODEGEN_OUTPUT_DIR environment variable.
 * 2. Known location relative to this smart-test.js file.
 * 3. Upward search from the supplied starting paths.
 */
function findCodegenOutputDirectory(
    startingPaths
) {
    const configuredDirectory =
        process.env
            .PW_CODEGEN_OUTPUT_DIR
            ?.trim();

    if (configuredDirectory) {
        const resolvedDirectory =
            path.resolve(
                configuredDirectory
            );

        if (
            !isDirectory(
                resolvedDirectory
            )
        ) {
            throw new Error(
                [
                    "",
                    "PW_CODEGEN_OUTPUT_DIR does not exist.",
                    `Resolved path: ${resolvedDirectory}`
                ].join("\n")
            );
        }

        return resolvedDirectory;
    }

    /*
     * Check the known framework layout first.
     */
    if (
        isDirectory(
            DEFAULT_CODEGEN_OUTPUT_DIR
        )
    ) {
        return DEFAULT_CODEGEN_OUTPUT_DIR;
    }

    const checkedDirectories =
        new Set([
            DEFAULT_CODEGEN_OUTPUT_DIR
        ]);

    for (
        const startingPath of
        startingPaths
    ) {
        if (!startingPath) {
            continue;
        }

        const parentDirectories =
            getParentDirectories(
                startingPath
            );

        for (
            const currentDirectory of
            parentDirectories
        ) {
            /*
             * When currentDirectory is backend:
             *
             * backend/codegen-output
             */
            const directCandidate =
                path.join(
                    currentDirectory,
                    "codegen-output"
                );

            /*
             * When currentDirectory is the repository root:
             *
             * repository/backend/codegen-output
             */
            const backendCandidate =
                path.join(
                    currentDirectory,
                    "backend",
                    "codegen-output"
                );

            checkedDirectories.add(
                directCandidate
            );

            checkedDirectories.add(
                backendCandidate
            );

            if (
                isDirectory(
                    directCandidate
                )
            ) {
                return directCandidate;
            }

            if (
                isDirectory(
                    backendCandidate
                )
            ) {
                return backendCandidate;
            }
        }
    }

    throw new Error(
        [
            "",
            "Could not find the codegen-output directory.",
            "",
            "Checked:",
            ...Array.from(
                checkedDirectories
            ).map(
                directory =>
                    `- ${directory}`
            ),
            "",
            "Expected location:",
            "C:\\record_and_play_back-updated-framework_01\\backend\\codegen-output",
            "",
            "You can explicitly set PW_CODEGEN_OUTPUT_DIR."
        ].join("\n")
    );
}

function decodeJavaScriptStringLiteral(
    literal
) {
    if (
        typeof literal !==
            "string" ||
        literal.length < 2
    ) {
        return null;
    }

    const quote =
        literal[0];

    if (
        quote !== '"' &&
        quote !== "'"
    ) {
        return null;
    }

    if (
        literal[
            literal.length - 1
        ] !== quote
    ) {
        return null;
    }

    if (quote === '"') {
        try {
            return JSON.parse(
                literal
            );
        } catch {
            return null;
        }
    }

    let result =
        "";

    let escaped =
        false;

    for (
        let index = 1;
        index <
            literal.length - 1;
        index += 1
    ) {
        const character =
            literal[index];

        if (!escaped) {
            if (
                character === "\\"
            ) {
                escaped =
                    true;

                continue;
            }

            result +=
                character;

            continue;
        }

        escaped =
            false;

        switch (character) {
            case "n":
                result +=
                    "\n";
                break;

            case "r":
                result +=
                    "\r";
                break;

            case "t":
                result +=
                    "\t";
                break;

            case "b":
                result +=
                    "\b";
                break;

            case "f":
                result +=
                    "\f";
                break;

            case "v":
                result +=
                    "\v";
                break;

            case "0":
                result +=
                    "\0";
                break;

            case "\\":
                result +=
                    "\\";
                break;

            case "'":
                result +=
                    "'";
                break;

            case '"':
                result +=
                    '"';
                break;

            default:
                result +=
                    character;
                break;
        }
    }

    return escaped
        ? null
        : result;
}

/**
 * Extracts only direct click statements of this form:
 *
 * await page.locator("xpath=...").click();
 *
 * This matches the generated-spec click contract.
 */
function extractDirectClickSelectorsFromSource(
    sourceText
) {
    const selectors =
        [];

    const directClickPattern =
        /await\s+page\.locator\(\s*((?:"(?:\\.|[^"\\])*")|(?:'(?:\\.|[^'\\])*'))\s*\)\s*\.click\s*\(/g;

    for (
        const match of
        String(
            sourceText || ""
        ).matchAll(
            directClickPattern
        )
    ) {
        const decoded =
            decodeJavaScriptStringLiteral(
                match[1]
            );

        if (
            decoded === null
        ) {
            continue;
        }

        selectors.push(
            normalizeSelector(
                decoded
            )
        );
    }

    return selectors;
}

function extractDirectClickSelectorsFromFile(
    testFilePath
) {
    try {
        const sourceText =
            fs.readFileSync(
                testFilePath,
                "utf8"
            );

        return extractDirectClickSelectorsFromSource(
            sourceText
        );
    } catch {
        return [];
    }
}

function listActionsFiles(
    codegenOutputDirectory
) {
    return fs.readdirSync(
        codegenOutputDirectory,
        {
            withFileTypes:
                true
        }
    )
        .filter(
            entry => {
                return (
                    entry.isFile() &&
                    /^actions(?:-.*)?\.json$/i.test(
                        entry.name
                    )
                );
            }
        )
        .map(
            entry => {
                const filePath =
                    path.join(
                        codegenOutputDirectory,
                        entry.name
                    );

                const stats =
                    fs.statSync(
                        filePath
                    );

                return {
                    filePath,

                    modifiedAt:
                        stats.mtimeMs
                };
            }
        )
        .sort(
            (
                first,
                second
            ) =>
                second.modifiedAt -
                first.modifiedAt
        );
}

function inspectActionsFileForSelection(
    fileEntry
) {
    try {
        const source =
            fs.readFileSync(
                fileEntry.filePath,
                "utf8"
            );

        const parsed =
            JSON.parse(
                source
            );

        if (!Array.isArray(parsed)) {
            return {
                ...fileEntry,

                valid:
                    false,

                reason:
                    "JSON root is not an array",

                clickSelectors:
                    []
            };
        }

        const clickSelectors =
            parsed
                .filter(
                    action =>
                        action?.action ===
                        "click"
                )
                .map(
                    action =>
                        normalizeSelector(
                            action.selector
                        )
                );

        if (!clickSelectors.length) {
            return {
                ...fileEntry,

                valid:
                    false,

                reason:
                    "contains no click actions",

                clickSelectors:
                    []
            };
        }

        if (
            clickSelectors.some(
                selector =>
                    !selector
            )
        ) {
            return {
                ...fileEntry,

                valid:
                    false,

                reason:
                    "contains a click without a selector",

                clickSelectors
            };
        }

        return {
            ...fileEntry,

            valid:
                true,

            reason:
                "",

            clickSelectors
        };
    } catch (error) {
        return {
            ...fileEntry,

            valid:
                false,

            reason:
                error instanceof Error
                    ? error.message
                    : String(error),

            clickSelectors:
                []
        };
    }
}

function compareClickSequences(
    specSelectors,
    actionSelectors
) {
    const comparableLength =
        Math.min(
            specSelectors.length,
            actionSelectors.length
        );

    let positionMatches =
        0;

    let prefixMatches =
        0;

    let prefixBroken =
        false;

    for (
        let index = 0;
        index <
            comparableLength;
        index += 1
    ) {
        const matches =
            specSelectors[index] ===
            actionSelectors[index];

        if (matches) {
            positionMatches +=
                1;
        }

        if (!prefixBroken) {
            if (matches) {
                prefixMatches +=
                    1;
            } else {
                prefixBroken =
                    true;
            }
        }
    }

    const exactMatch =
        specSelectors.length ===
            actionSelectors.length &&
        positionMatches ===
            specSelectors.length;

    const countDifference =
        Math.abs(
            specSelectors.length -
            actionSelectors.length
        );

    const denominator =
        Math.max(
            specSelectors.length,
            actionSelectors.length,
            1
        );

    const positionMatchRatio =
        positionMatches /
        denominator;

    /*
     * Exact sequence matches always win.
     *
     * Otherwise prioritize selectors that match at the same chronological
     * click positions. Prefix matching helps distinguish traces that share
     * only a common login sequence.
     */
    const score =
        exactMatch
            ? 1_000_000_000
            : (
                positionMatches *
                    100_000 +
                prefixMatches *
                    1_000 -
                countDifference *
                    100
            );

    return {
        exactMatch,
        positionMatches,
        prefixMatches,
        countDifference,
        positionMatchRatio,
        score
    };
}

/**
 * Selects the correct actions JSON.
 *
 * Resolution order:
 *
 * 1. PW_ACTIONS_PATH.
 * 2. Exact click-sequence match with the executing spec.
 * 3. Best chronological selector match.
 * 4. Most recently modified valid actions JSON, only when the spec contains
 *    no parseable direct click statements.
 *
 * This prevents an unrelated, recently recorded actions file from being
 * paired with the currently executing spec.
 */
function findActionsFile(
    codegenOutputDirectory,
    testFilePath
) {
    const configuredFile =
        process.env
            .PW_ACTIONS_PATH
            ?.trim();

    if (configuredFile) {
        const resolvedFile =
            path.resolve(
                configuredFile
            );

        if (
            !isFile(
                resolvedFile
            )
        ) {
            throw new Error(
                [
                    "",
                    "PW_ACTIONS_PATH does not point to an existing file.",
                    `Resolved path: ${resolvedFile}`
                ].join("\n")
            );
        }

        return {
            actionsPath:
                resolvedFile,

            selectionReason:
                "PW_ACTIONS_PATH"
        };
    }

    const actionFileEntries =
        listActionsFiles(
            codegenOutputDirectory
        );

    if (!actionFileEntries.length) {
        throw new Error(
            [
                "",
                "No actions JSON file was found.",
                `Directory: ${codegenOutputDirectory}`,
                "",
                "Expected a filename such as:",
                "actions-2026-07-27T12-00-00.json"
            ].join("\n")
        );
    }

    const inspectedFiles =
        actionFileEntries
            .map(
                inspectActionsFileForSelection
            );

    const validFiles =
        inspectedFiles.filter(
            entry =>
                entry.valid
        );

    if (!validFiles.length) {
        throw new Error(
            [
                "",
                "No valid actions JSON file was found.",
                `Directory: ${codegenOutputDirectory}`,
                "",
                "Rejected files:",
                ...inspectedFiles.map(
                    entry =>
                        (
                            `- ${entry.filePath}: ` +
                            `${entry.reason || "invalid file"}`
                        )
                )
            ].join("\n")
        );
    }

    const specClickSelectors =
        extractDirectClickSelectorsFromFile(
            testFilePath
        );

    /*
     * If the spec has no direct generated click statements, sequence matching
     * cannot be performed. Retain the previous latest-file fallback.
     */
    if (!specClickSelectors.length) {
        return {
            actionsPath:
                validFiles[0]
                    .filePath,

            selectionReason:
                (
                    "latest valid actions file; " +
                    "the spec contained no parseable direct XPath clicks"
                )
        };
    }

    const rankedFiles =
        validFiles
            .map(
                entry => {
                    const comparison =
                        compareClickSequences(
                            specClickSelectors,
                            entry.clickSelectors
                        );

                    return {
                        ...entry,
                        comparison
                    };
                }
            )
            .sort(
                (
                    first,
                    second
                ) => {
                    if (
                        second
                            .comparison
                            .score !==
                        first
                            .comparison
                            .score
                    ) {
                        return (
                            second
                                .comparison
                                .score -
                            first
                                .comparison
                                .score
                        );
                    }

                    return (
                        second.modifiedAt -
                        first.modifiedAt
                    );
                }
            );

    const exactMatches =
        rankedFiles.filter(
            entry =>
                entry
                    .comparison
                    .exactMatch
        );

    if (exactMatches.length) {
        const selected =
            exactMatches[0];

        return {
            actionsPath:
                selected.filePath,

            selectionReason:
                (
                    "exact direct-click selector sequence match; " +
                    `${selected.clickSelectors.length} clicks`
                )
        };
    }

    const bestMatch =
        rankedFiles[0];

    const secondBest =
        rankedFiles[1] ||
        null;

    const bestComparison =
        bestMatch.comparison;

    /*
     * Reject a completely unrelated actions file.
     *
     * A partial match is accepted only when:
     *
     * - at least one chronological click matched;
     * - the click counts are equal or at least half of the positions matched;
     * - the best candidate is not tied with another file.
     */
    const hasUsableMatch =
        bestComparison
            .positionMatches > 0 &&
        (
            bestComparison
                .countDifference === 0 ||
            bestComparison
                .positionMatchRatio >= 0.5
        );

    const tiedWithSecond =
        Boolean(
            secondBest &&
            secondBest
                .comparison
                .score ===
            bestComparison
                .score
        );

    if (
        !hasUsableMatch ||
        tiedWithSecond
    ) {
        throw new Error(
            [
                "",
                "Could not safely identify the actions JSON for this spec.",
                "",
                `Executing spec: ${testFilePath}`,
                `Spec click count: ${specClickSelectors.length}`,
                "",
                "Best candidates:",
                ...rankedFiles
                    .slice(
                        0,
                        5
                    )
                    .map(
                        entry => {
                            const comparison =
                                entry.comparison;

                            return [
                                `- ${entry.filePath}`,
                                (
                                    `clicks=` +
                                    `${entry.clickSelectors.length}`
                                ),
                                (
                                    `positionMatches=` +
                                    `${comparison.positionMatches}`
                                ),
                                (
                                    `prefixMatches=` +
                                    `${comparison.prefixMatches}`
                                ),
                                (
                                    `ratio=` +
                                    `${comparison.positionMatchRatio.toFixed(2)}`
                                )
                            ].join(" ");
                        }
                    ),
                "",
                "Set PW_ACTIONS_PATH to the exact actions JSON file",
                "for this generated spec."
            ].join("\n")
        );
    }

    return {
        actionsPath:
            bestMatch.filePath,

        selectionReason:
            (
                "best chronological direct-click selector match; " +
                `${bestComparison.positionMatches}/` +
                `${Math.max(
                    specClickSelectors.length,
                    bestMatch.clickSelectors.length
                )} positions matched`
            )
    };
}

function loadTraceActions(
    actionsPath
) {
    let parsed;

    try {
        const content =
            fs.readFileSync(
                actionsPath,
                "utf8"
            );

        parsed =
            JSON.parse(
                content
            );
    } catch (error) {
        throw new Error(
            [
                "",
                "Could not read or parse the actions JSON file.",
                `File: ${actionsPath}`,
                `Reason: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            ].join("\n")
        );
    }

    if (!Array.isArray(parsed)) {
        throw new Error(
            [
                "",
                "The actions JSON root must be an array.",
                `File: ${actionsPath}`
            ].join("\n")
        );
    }

    const clickActions =
        parsed.filter(
            action =>
                action?.action ===
                "click"
        );

    if (!clickActions.length) {
        throw new Error(
            [
                "",
                "The actions JSON contains no click actions.",
                `File: ${actionsPath}`
            ].join("\n")
        );
    }

    for (
        const [
            index,
            action
        ] of clickActions.entries()
    ) {
        if (!action.selector) {
            throw new Error(
                [
                    "",
                    "A recorded click has no selector.",
                    `Click index: ${index}`,
                    `File: ${actionsPath}`
                ].join("\n")
            );
        }

        if (!action.primary_xpath) {
            throw new Error(
                [
                    "",
                    "A recorded click has no primary_xpath.",
                    `Click index: ${index}`,
                    `Selector: ${action.selector}`,
                    `File: ${actionsPath}`
                ].join("\n")
            );
        }

        if (!action.backup_xpath) {
            throw new Error(
                [
                    "",
                    "A recorded click has no backup_xpath.",
                    `Click index: ${index}`,
                    `Selector: ${action.selector}`,
                    `File: ${actionsPath}`
                ].join("\n")
            );
        }
    }

    return parsed;
}

function resolveTraceActions(
    startingPaths,
    testFilePath
) {
    const codegenOutputDirectory =
        findCodegenOutputDirectory(
            startingPaths
        );

    const {
        actionsPath:
            discoveredActionsPath,

        selectionReason
    } =
        findActionsFile(
            codegenOutputDirectory,
            testFilePath
        );

    /*
     * smart-click.js must be able to rewrite this file after healing.
     */
    const actionsPath =
        assertReadableWritableFile(
            discoveredActionsPath,
            "Actions JSON file"
        );

    const actions =
        loadTraceActions(
            actionsPath
        );

    return {
        actionsPath,
        actions,
        selectionReason
    };
}

function assertSpecAndTraceClickCountsAreCompatible(
    testFilePath,
    actions
) {
    const specClickSelectors =
        extractDirectClickSelectorsFromFile(
            testFilePath
        );

    /*
     * Some manually written specs may not follow the generated direct-click
     * contract. In that case smart-click.js can still associate clicks using
     * the selector hint or chronological fallback.
     */
    if (!specClickSelectors.length) {
        return;
    }

    const recordedClickCount =
        actions.filter(
            action =>
                action?.action ===
                "click"
        ).length;

    if (
        specClickSelectors.length !==
        recordedClickCount
    ) {
        throw new Error(
            [
                "",
                "The executing spec and selected actions JSON have",
                "different direct-click counts.",
                "",
                `Executing spec: ${testFilePath}`,
                `Spec direct clicks: ${specClickSelectors.length}`,
                `Recorded clicks: ${recordedClickCount}`,
                "",
                "Using mismatched files could cause one click to heal and",
                "persist the selector of a different recorded action.",
                "",
                "Set PW_ACTIONS_PATH to the exact matching actions JSON."
            ].join("\n")
        );
    }
}

const test =
    base.extend({
        page: async (
            {
                page
            },
            use,
            testInfo
        ) => {
            /*
             * Resolve and verify the exact test file Playwright is executing.
             *
             * smart-click.js uses this path to replace the failed selector
             * literal after reconstruction succeeds.
             */
            const testFilePath =
                assertReadableWritableFile(
                    testInfo.file,
                    "Executing Playwright spec"
                );

            const {
                actionsPath,
                actions,
                selectionReason
            } =
                resolveTraceActions(
                    [
                        process.cwd(),

                        testInfo.config
                            .rootDir,

                        testFilePath,

                        path.dirname(
                            testFilePath
                        ),

                        __dirname
                    ],

                    testFilePath
                );

            assertSpecAndTraceClickCountsAreCompatible(
                testFilePath,
                actions
            );

            const recordedClickCount =
                actions.filter(
                    action =>
                        action?.action ===
                        "click"
                ).length;

            console.log(
                `[smart-click] Implementation: ${require.resolve("./smart-click")}`
            );

            console.log(
                `[smart-click] Actions file: ${actionsPath}`
            );

            console.log(
                `[smart-click] Actions selection: ${selectionReason}`
            );

            console.log(
                `[smart-click] Recorded clicks: ${recordedClickCount}`
            );

            console.log(
                `[smart-click] Executing spec: ${testFilePath}`
            );

            console.log(
                "[smart-click] Spec, actions file and parent directories are writable."
            );

            /*
             * createSmartClickPage() intercepts only Locator.click().
             *
             * Runtime candidate priority:
             *
             * 1. selector
             * 2. primary_xpath
             * 3. backup_xpath
             *
             * When selector works:
             *
             * - Click with selector.
             * - Do not reconstruct anything.
             * - Do not rewrite the spec or actions JSON.
             *
             * When selector fails and primary_xpath or backup_xpath works:
             *
             * - Treat the fallback-resolved element as the intended element.
             * - Split the failed selector into structural XPath depths.
             * - Resolve each XPath prefix in order.
             * - Identify the first depth that no longer resolves uniquely.
             * - Inspect only the failed XPath segment at that depth.
             * - Determine which configured strategy the failed segment used.
             *
             * Fixed XPath strategy order:
             *
             * 1. id
             * 2. data-testid
             * 3. data-test
             * 4. data-qa
             * 5. data-cy
             * 6. data-label
             * 7. aria-label
             * 8. aria-labelledby
             * 9. name
             * 10. placeholder
             * 11. title
             * 12. normalize-space(.)
             *
             * Sequential repair at the failed XPath depth:
             *
             * - Do not classify or filter any attribute value.
             * - Do not classify IDs as static or dynamic.
             * - An id is treated only as the "id" strategy.
             * - Detect the exact strategy used by the failed segment.
             * - Continue strictly from the next strategy in the fixed order.
             * - Do not restart from id while still testing the failed node.
             * - Do not retry the strategy that already failed on that node.
             * - Do not combine multiple attributes.
             * - Do not introduce custom stability heuristics.
             *
             * Parent escalation:
             *
             * - If every remaining strategy fails on the failed-depth node,
             *   move exactly one DOM level upward.
             * - On that parent, restart the complete 12-strategy order from
             *   id.
             * - For each candidate parent strategy, append the indexed
             *   descendant path from that parent back to the exact element
             *   identified by primary_xpath or backup_xpath.
             * - Require the parent anchor XPath to resolve uniquely to that
             *   exact parent node.
             * - Require the complete rebuilt XPath to resolve uniquely to
             *   the exact fallback-resolved target.
             * - If that parent has no successful strategy, move upward one
             *   more level and restart the complete 12-strategy order again.
             * - Continue this process through BODY.
             * - HTML is not used as a replacement anchor.
             *
             * Example:
             *
             * Failed selector:
             *
             * //span[@id='pv_id_1546']/button[1]
             *
             * Detected:
             *
             * failed depth = 1
             * failed node = span
             * failed strategy = id
             *
             * First, the remaining strategies are tried on the span:
             *
             * data-testid
             * data-test
             * data-qa
             * data-cy
             * data-label
             * aria-label
             * aria-labelledby
             * name
             * placeholder
             * title
             * normalize-space(.)
             *
             * If none succeeds, the algorithm moves to the parent div and
             * restarts from id. A successful parent reconstruction may be:
             *
             * //div[normalize-space(.)=
             * 'Requested Earliest Dropoffmm/dd/yyyy hh:mm']
             * /span[1]/button[1]
             *
             * Every reconstructed selector must:
             *
             * - resolve to exactly one element;
             * - resolve to the exact same DOM node found by primary_xpath or
             *   backup_xpath;
             * - pass Playwright's actionability trial before the real click.
             *
             * A purely positional failed segment such as div[5] is not one
             * of the 12 configured strategies. In that case smart-click.js
             * may continue from the deepest original XPath prefix that still
             * resolves and rebuild only the remaining indexed descendant
             * path.
             *
             * Real-click and persistence contract:
             *
             * - Trial clicks are diagnostic only.
             * - Dispatch exactly one real application click.
             * - Persist only after that real click succeeds.
             * - Rewrite the executing .spec.js selector.
             * - Rewrite selector, primary_xpath and backup_xpath in the
             *   selected actions JSON.
             * - Read both files back and verify the persisted values.
             * - Never dispatch a second click because persistence failed.
             *
             * testFilePath identifies the exact executing .spec.js file.
             *
             * actionsPath identifies the exact actions JSON selected by
             * matching its recorded click sequence against the executing
             * spec.
             *
             * Other operations such as fill(), press(), hover(), goto(),
             * waitFor(), check() and selectOption() remain unchanged.
             */
            const smartPage =
                createSmartClickPage(
                    page,
                    actions,
                    {
                        testFilePath,
                        actionsPath
                    }
                );

            await use(
                smartPage
            );
        }
    });

module.exports = {
    test,
    expect
};
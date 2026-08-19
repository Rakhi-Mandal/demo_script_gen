const fs = require("fs");
const path = require("path");
const os = require("os");

const {
    chromium,
    firefox,
    webkit
} = require("@playwright/test");

const listenersModule =
    require("./src/utils/listeners");

/*
 * --------------------------------------------------------------------------
 * LISTENER MODULE
 * --------------------------------------------------------------------------
 */

function resolveInjectListeners(
    moduleValue
) {
    if (
        typeof moduleValue ===
        "function"
    ) {
        return moduleValue;
    }

    if (
        moduleValue &&
        typeof moduleValue.injectListeners ===
            "function"
    ) {
        return moduleValue.injectListeners;
    }

    const exportedKeys =
        moduleValue &&
        typeof moduleValue ===
            "object"
            ? Object.keys(
                moduleValue
            )
            : [];

    throw new TypeError(
        [
            "Could not load injectListeners from ./src/utils/listeners.",
            `Received module type: ${typeof moduleValue}`,
            `Exported keys: ${
                exportedKeys.length
                    ? exportedKeys.join(", ")
                    : "(none)"
            }`,
            "",
            "listeners.js must export either:",
            "",
            "module.exports = { injectListeners };",
            "",
            "or:",
            "",
            "module.exports = injectListeners;"
        ].join("\n")
    );
}

const injectListeners =
    resolveInjectListeners(
        listenersModule
    );

function createListenerInitScript(
    listenerFunction
) {
    const functionSource =
        Function.prototype
            .toString
            .call(
                listenerFunction
            )
            .trim();

    if (
        !functionSource ||
        functionSource.includes(
            "[native code]"
        )
    ) {
        throw new TypeError(
            "injectListeners could not be serialized into browser-side JavaScript."
        );
    }

    return (
        `"use strict";\n` +
        `(${functionSource})();`
    );
}

const LISTENER_INIT_SCRIPT =
    createListenerInitScript(
        injectListeners
    );

/*
 * --------------------------------------------------------------------------
 * COMMAND-LINE CONFIGURATION
 * --------------------------------------------------------------------------
 */

const DEFAULT_URL =
    process.argv[2] ||
    "about:blank";

const REQUESTED_BROWSER =
    (
        process.argv[3] ||
        "chromium"
    ).toLowerCase();

const REQUESTED_VIEWPORT =
    process.argv[4] ||
    "";

const OUT_DIR =
    path.resolve(
        __dirname,
        "codegen-output"
    );

const FINALIZE_ENQUEUE_GRACE_MS =
    750;

const INPUT_FLUSH_SETTLE_MS =
    250;

/*
 * Playwright codegen writes its current script shortly after a page action.
 * This bounded wait happens in Node, outside the page event handler, so it
 * does not freeze the page while a click is being recorded.
 */
const CODEGEN_CLICK_OUTPUT_WAIT_MS =
    350;

const CODEGEN_CLICK_OUTPUT_POLL_MS =
    25;

const CODEGEN_CLICK_OUTPUT_FRESHNESS_MS =
    5;

const ACTIVE_RECORDING_ENRICHMENT_IDLE_DELAY_MS =
    150;

const LIVE_SEMANTIC_LOCATOR_MAX_CANDIDATES =
    8;

const LIVE_SEMANTIC_LOCATOR_MAX_TEXT_LENGTH =
    240;

const CODEGEN_POINTER_ACTION_METHODS =
    new Set([
        "click",
        "dblclick",
        "check",
        "uncheck",
        "tap",
        "setChecked",
        "selectOption"
    ]);

const CODEGEN_IGNORED_INPUT_ACTION_METHODS =
    new Set([
        "fill",
        "type"
    ]);

/*
 * Click is deliberately NOT included here.
 *
 * Click has its own validation inside commitClickJob().
 *
 * A click is committed only when listeners.js supplies a resolved XPath.
 * The supported resolved selector states are:
 *
 *     selectorStrategy: "primary"
 *
 *     selectorStrategy: "contextual"
 *
 *
 *     selectorStrategy: "indexed"
 *
 * Legacy unresolved click payloads are rejected before entering TRACE.
 */
const SELECTOR_REQUIRED_ACTIONS =
    new Set([
        "input",
        "select",
        "checkbox",
        "radio",
        "file-upload",
        "focus"
    ]);

const RESOLVED_CLICK_SELECTOR_STRATEGIES =
    new Set([
        "primary",
        "downward",
        "contextual",
        "indexed",
        "structural"
    ]);

const actions = [];

/*
 * --------------------------------------------------------------------------
 * GENERIC HELPERS
 * --------------------------------------------------------------------------
 */

function cleanOutputDirectory(
    dirPath
) {
    fs.mkdirSync(
        dirPath,
        {
            recursive: true
        }
    );

    for (
        const entry of
        fs.readdirSync(
            dirPath,
            {
                withFileTypes: true
            }
        )
    ) {
        fs.rmSync(
            path.join(
                dirPath,
                entry.name
            ),
            {
                recursive: true,
                force: true
            }
        );
    }
}

function omitNullFields(
    value
) {
    if (
        Array.isArray(
            value
        )
    ) {
        const cleanedItems =
            value
                .map(
                    omitNullFields
                )
                .filter(
                    item =>
                        item !== null
                );

        return cleanedItems.length
            ? cleanedItems
            : null;
    }

    if (
        value &&
        typeof value ===
            "object"
    ) {
        const cleanedEntries =
            Object.entries(
                value
            )
                .map(
                    ([
                        key,
                        entryValue
                    ]) => [
                        key,

                        omitNullFields(
                            entryValue
                        )
                    ]
                )
                .filter(
                    ([
                        ,
                        entryValue
                    ]) =>
                        entryValue !==
                        null
                );

        return cleanedEntries.length
            ? Object.fromEntries(
                cleanedEntries
            )
            : null;
    }

    return value ===
        undefined
        ? null
        : value;
}

function normalizeInputValue(
    value
) {
    let normalizedValue =
        String(
            value ??
            ""
        ).replace(
            /\r\n?/g,
            "\n"
        );

    try {
        normalizedValue =
            normalizedValue.normalize(
                "NFC"
            );
    } catch {
        /*
         * Unicode normalization is optional.
         */
    }

    return normalizedValue;
}

function normalizeSelectorStrategy(
    value
) {
    if (
        typeof value !==
        "string"
    ) {
        return "";
    }

    const normalized =
        value
        .trim()
        .toLowerCase();

    /*
     * Backward compatibility with the previous listeners.js contract.
     */
    if (
        normalized ===
        "graph"
    ) {
        return "primary";
    }

    if (
        normalized ===
        "graph-unresolved"
    ) {
        return "unresolved";
    }

    return normalized;
}

function normalizeCapturedAction(
    value
) {
    if (
        !value ||
        typeof value !==
            "object"
    ) {
        return value;
    }

    const action = {
        ...value
    };

    if (
        typeof action.action ===
        "string"
    ) {
        action.action =
            action.action
                .trim()
                .toLowerCase();
    }

    if (
        typeof action.selector ===
        "string"
    ) {
        action.selector =
            action.selector.trim();
    }

    if (
        typeof action.xpath ===
        "string"
    ) {
        action.xpath =
            action.xpath.trim();
    }

    if (
        typeof action.gestureId ===
        "string"
    ) {
        action.gestureId =
            action.gestureId.trim();
    }

    if (
        typeof action.selectorStrategy ===
        "string"
    ) {
        action.selectorStrategy =
            normalizeSelectorStrategy(
                action.selectorStrategy
            );
    }

    if (
        action.action !==
        "input"
    ) {
        return action;
    }

    action.value =
        normalizeInputValue(
            action.value
        );

    action.hasValue =
        action.value.length >
        0;

    action.normalized =
        true;

    if (
        typeof action.inputType ===
        "string"
    ) {
        action.inputType =
            action.inputType
                .trim()
                .toLowerCase();
    }

    if (
        typeof action.controlKind ===
        "string"
    ) {
        action.controlKind =
            action.controlKind
                .trim()
                .toLowerCase();
    }

    if (
        typeof action.commitReason ===
        "string"
    ) {
        action.commitReason =
            action.commitReason.trim();
    }

    if (
        typeof action.lastObservedEvent ===
        "string"
    ) {
        action.lastObservedEvent =
            action.lastObservedEvent.trim();
    }

    return action;
}

function delay(
    ms
) {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}

function readTextFileIfAvailable(
    filePath
) {
    try {
        return fs.readFileSync(
            filePath,
            "utf8"
        );
    } catch {
        return "";
    }
}

function splitCodegenStatements(
    sourceText
) {
    const source =
        String(
            sourceText ||
            ""
        );

    const statements = [];
    let current =
        "";
    let quote =
        "";
    let escaped =
        false;
    let parenthesisDepth =
        0;
    let bracketDepth =
        0;

    for (
        const character of
        source
    ) {
        current +=
            character;

        if (
            quote
        ) {
            if (
                escaped
            ) {
                escaped =
                    false;

                continue;
            }

            if (
                character ===
                "\\"
            ) {
                escaped =
                    true;

                continue;
            }

            if (
                character ===
                quote
            ) {
                quote =
                    "";
            }

            continue;
        }

        if (
            character ===
                "'" ||
            character ===
                '"' ||
            character ===
                "`"
        ) {
            quote =
                character;

            continue;
        }

        if (
            character ===
            "("
        ) {
            parenthesisDepth +=
                1;
        } else if (
            character ===
            ")"
        ) {
            parenthesisDepth =
                Math.max(
                    0,
                    parenthesisDepth -
                        1
                );
        } else if (
            character ===
            "["
        ) {
            bracketDepth +=
                1;
        } else if (
            character ===
            "]"
        ) {
            bracketDepth =
                Math.max(
                    0,
                    bracketDepth -
                        1
                );
        }

        if (
            character ===
            ";"
        ) {
            const statement =
                current.trim();

            if (
                statement
            ) {
                statements.push(
                    statement
                );
            }

            current =
                "";
        }
    }

    const remainder =
        current.trim();

    if (
        remainder
    ) {
        statements.push(
            remainder
        );
    }

    return statements;
}

function extractStandardCodegenLocatorAction(
    statement
) {
    let source =
        String(
            statement ||
            ""
        ).trim();

    const pageActionStart =
        source.search(
            /(?:^|\s)(?:await\s+)?page\d*\./
        );

    if (
        pageActionStart <
        0
    ) {
        return null;
    }

    source =
        source
            .slice(
                pageActionStart
            )
            .trim()
            .replace(
                /^await\s+/,
                ""
            )
            .replace(
                /;\s*$/,
                ""
            );

    const actionMatch =
        source.match(
            /^(page\d*\.[\s\S]+)\.(click|dblclick|check|uncheck|tap|setChecked|selectOption|fill|type)\s*\([\s\S]*\)$/
        );

    if (
        !actionMatch
    ) {
        return null;
    }

    const actionMethod =
        actionMatch[2];

    const rawLocatorExpression =
        actionMatch[1].trim();

    const codegenPageVariable =
        rawLocatorExpression.match(
            /^(page\d*)\./
        )?.[1] ||
        "page";

    const locatorExpression =
        rawLocatorExpression.replace(
            new RegExp(
                `\\b${codegenPageVariable}\\.`,
                "g"
            ),
            "page."
        );

    if (
        !locatorExpression.startsWith(
            "page."
        ) ||
        /[;\r\n]/.test(
            locatorExpression
        )
    ) {
        return null;
    }

    if (
        CODEGEN_POINTER_ACTION_METHODS.has(
            actionMethod
        )
    ) {
        return {
            kind:
                "click",

            actionMethod,
            locatorExpression,
            line:
                source
        };
    }

    if (
        CODEGEN_IGNORED_INPUT_ACTION_METHODS.has(
            actionMethod
        )
    ) {
        return {
            kind:
                "fill",

            actionMethod,
            locatorExpression,
            line:
                source
        };
    }

    return null;
}

function getCodegenRelevantActionOneLiners(
    sourceText
) {
    return splitCodegenStatements(
        sourceText
    )
        .map(
            extractStandardCodegenLocatorAction
        )
        .filter(
            Boolean
        );
}

function createCodegenClickOutputConsumer(
    filePath
) {
    let consumptionQueue =
        Promise.resolve();

    let consumedClickCount =
        0;

    function clearOutput() {
        try {
            fs.writeFileSync(
                filePath,
                "",
                "utf8"
            );

            return true;
        } catch {
            return false;
        }
    }

    async function consumeClosestClickNow(
        clickReceivedAt
    ) {
        const deadline =
            clickReceivedAt +
            CODEGEN_CLICK_OUTPUT_WAIT_MS;

        while (
            Date.now() <=
            deadline
        ) {
            const source =
                readTextFileIfAvailable(
                    filePath
                );

            let modifiedAt =
                0;

            try {
                modifiedAt =
                    fs.statSync(
                        filePath
                    ).mtimeMs;
            } catch {
            }

            const actionLines =
                getCodegenRelevantActionOneLiners(
                    source
                );

            const isFreshForClick =
                modifiedAt >=
                clickReceivedAt -
                CODEGEN_CLICK_OUTPUT_FRESHNESS_MS;

            if (
                isFreshForClick &&
                actionLines.length
            ) {
                const closestAction =
                    actionLines[
                        actionLines.length -
                        1
                    ];

                const cleared =
                    clearOutput();

                if (
                    closestAction.kind ===
                    "fill"
                ) {
                    return {
                        available:
                            false,

                        line:
                            "",

                        locatorExpression:
                            closestAction.locatorExpression,

                        actionMethod:
                            closestAction.actionMethod,

                        clickOrdinal:
                            null,

                        outputModifiedAt:
                            modifiedAt,

                        cleared,

                        ignoredFill:
                            true,

                        waitedMs:
                            Math.max(
                                0,
                                Date.now() -
                                clickReceivedAt
                            )
                    };
                }

                consumedClickCount +=
                    1;

                return {
                    available:
                        true,

                    line:
                        closestAction.line,

                    locatorExpression:
                        closestAction.locatorExpression,

                    actionMethod:
                        closestAction.actionMethod,

                    clickOrdinal:
                        consumedClickCount,

                    outputModifiedAt:
                        modifiedAt,

                    cleared,

                    ignoredFill:
                        false,

                    waitedMs:
                        Math.max(
                            0,
                            Date.now() -
                            clickReceivedAt
                        )
                };
            }

            await delay(
                CODEGEN_CLICK_OUTPUT_POLL_MS
            );
        }

        return {
            available:
                false,

            line:
                "",

            locatorExpression:
                "",

            actionMethod:
                null,

            clickOrdinal:
                null,

            outputModifiedAt:
                null,

            cleared:
                false,

            ignoredFill:
                false,

            waitedMs:
                Math.max(
                    0,
                    Date.now() -
                    clickReceivedAt
                )
        };
    }

    function consumeClosestClick(
        clickReceivedAt
    ) {
        const task =
            consumptionQueue.then(
                () =>
                    consumeClosestClickNow(
                        clickReceivedAt
                    )
            );

        consumptionQueue =
            task.catch(
                () => {}
            );

        return task;
    }

    return {
        consumeClosestClick
    };
}

function resolveBrowserLaunch(
    browserName
) {
    switch (
        browserName
    ) {
        case "chromium":
            return {
                browserType:
                    chromium,

                browserLabel:
                    "chromium",

                launchOptions: {
                    headless:
                        false
                }
            };

        case "firefox":
            return {
                browserType:
                    firefox,

                browserLabel:
                    "firefox",

                launchOptions: {
                    headless:
                        false
                }
            };

        case "webkit":
            return {
                browserType:
                    webkit,

                browserLabel:
                    "webkit",

                launchOptions: {
                    headless:
                        false
                }
            };

        case "msedge":
            return {
                browserType:
                    chromium,

                browserLabel:
                    "chromium",

                launchOptions: {
                    channel:
                        "msedge",

                    headless:
                        false
                }
            };

        case "chrome":
        default:
            return {
                browserType:
                    chromium,

                browserLabel:
                    "chromium",

                launchOptions: {
                    channel:
                        "chrome",

                    headless:
                        false
                }
            };
    }
}

function parseViewport(
    value
) {
    const text =
        String(
            value ||
            ""
        )
            .trim()
            .toLowerCase();

    if (!text) {
        return null;
    }

    const match =
        text.match(
            /^(\d{3,4})x(\d{3,4})$/
        );

    if (!match) {
        throw new Error(
            "Viewport must use WIDTHxHEIGHT format, for example 1280x720."
        );
    }

    const width =
        Number(
            match[1]
        );

    const height =
        Number(
            match[2]
        );

    if (
        width < 320 ||
        width > 3840 ||
        height < 320 ||
        height > 3840
    ) {
        throw new Error(
            "Viewport width and height must be between 320 and 3840."
        );
    }

    return {
        width,
        height
    };
}

/*
 * --------------------------------------------------------------------------
 * XPATH NORMALIZATION
 * --------------------------------------------------------------------------
 */

function normalizeXPath(
    value
) {
    if (
        typeof value !==
        "string"
    ) {
        return "";
    }

    const trimmed =
        value.trim();

    if (!trimmed) {
        return "";
    }

    return trimmed.replace(
        /^xpath=/i,
        ""
    );
}

function containsDisallowedClickXPathPosition(
    xpath
) {
    const text =
        String(
            xpath ||
            ""
        );

    /*
     * Match the listeners.js contract exactly: the complete XPath may contain
     * at most one naked numeric positional predicate, and it may only be
     * [1], [2] or [3]. position(...) and last(...) remain forbidden.
     */
    if (
        /\[\s*position\s*\(/i.test(
            text
        ) ||
        /\[\s*last\s*\(/i.test(
            text
        )
    ) {
        return true;
    }

    const numericPredicates =
        Array.from(
            text.matchAll(
                /\[\s*(\d+)\s*\]/g
            )
        );

    if (
        numericPredicates.length >
        1
    ) {
        return true;
    }

    if (
        numericPredicates.length ===
        1
    ) {
        const index =
            Number(
                numericPredicates[
                    0
                ][
                    1
                ]
            );

        return (
            index < 1 ||
            index > 3
        );
    }

    return false;
}

function isAllowedStructuralClickXPath(
    xpath
) {
    const text =
        String(
            xpath ||
            ""
        ).trim();

    if (
        !text.startsWith("/") ||
        text.startsWith("//") ||
        /@|::|\.\.|\|/.test(text)
    ) {
        return false;
    }

    const ordinaryStep =
        "[A-Za-z_][A-Za-z0-9_.:-]*\\[\\d+\\]";

    const localNameStep =
        "\\*\\[local-name\\(\\)=(?:'[^']+'|\"[^\"]+\")\\]\\[\\d+\\]";

    const step =
        `(?:${ordinaryStep}|${localNameStep})`;

    if (
        !new RegExp(
            `^/${step}(?:/${step})*$`
        ).test(text)
    ) {
        return false;
    }

    return Array.from(
        text.matchAll(
            /\[\s*(\d+)\s*\]/g
        )
    ).every(match => {
        return Number(match[1]) >= 1;
    });
}

function normalizeClickSelector(
    value
) {
    if (
        typeof value !==
        "string"
    ) {
        return "";
    }

    const trimmed =
        value.trim();

    if (!trimmed) {
        return "";
    }

    if (
        /^xpath=/i.test(
            trimmed
        )
    ) {
        const xpath =
            normalizeXPath(
                trimmed
            );

        return xpath
            ? `xpath=${xpath}`
            : "";
    }

    if (
        trimmed.startsWith(
            "/"
        ) ||
        trimmed.startsWith(
            "("
        )
    ) {
        return (
            `xpath=${trimmed}`
        );
    }

    return "";
}

function getCodegenLocatorExpression(
    codegenLine
) {
    const extracted =
        extractStandardCodegenLocatorAction(
            codegenLine
        );

    return extracted?.kind ===
        "click"
        ? extracted.locatorExpression
        : "";
}

function normalizeLiveSemanticText(
    value
) {
    return String(
        value ||
        ""
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .slice(
            0,
            LIVE_SEMANTIC_LOCATOR_MAX_TEXT_LENGTH
        );
}

function getLiveLocatorRootExpression(
    action
) {
    const frameChain =
        Array.isArray(
            action?.frameChain
        )
            ? action.frameChain
            : [];

    let expression =
        "page";

    for (
        const frameSelector of
        frameChain
    ) {
        const selector =
            String(
                frameSelector ||
                ""
            ).trim();

        if (
            !selector ||
            selector ===
                "iframe(unknown)"
        ) {
            return "";
        }

        expression +=
            `.frameLocator(${JSON.stringify(
                selector
            )})`;
    }

    return expression;
}

function createLocatorFromExpression(
    page,
    locatorExpression
) {
    const createLocator =
        Function(
            "page",
            `"use strict"; return (${locatorExpression});`
        );

    return createLocator(
        page
    );
}

async function inspectLiveLocatorCandidate({
    locator,
    algorithmHandle
}) {
    const inspection = {
        matchCount:
            null,

        visible:
            false,

        enabled:
            false,

        actionabilityChecked:
            false,

        actionable:
            false,

        passivelyUsable:
            false,

        relationship:
            null,

        sameClickTarget:
            false
    };

    let candidateHandle =
        null;

    try {
        inspection.matchCount =
            await locator.count();

        if (
            inspection.matchCount !==
            1
        ) {
            return inspection;
        }

        inspection.visible =
            await locator.isVisible();

        if (
            !inspection.visible
        ) {
            return inspection;
        }

        candidateHandle =
            await locator.elementHandle();

        if (
            !candidateHandle ||
            !algorithmHandle
        ) {
            return inspection;
        }

        const relationship =
            await algorithmHandle.evaluate(
                (
                    algorithmElement,
                    candidateElement
                ) => {
                    const interactiveRoles =
                        new Set([
                            "button",
                            "checkbox",
                            "combobox",
                            "link",
                            "listbox",
                            "menuitem",
                            "menuitemcheckbox",
                            "menuitemradio",
                            "option",
                            "radio",
                            "searchbox",
                            "slider",
                            "spinbutton",
                            "switch",
                            "tab",
                            "textbox",
                            "treeitem"
                        ]);

                    const isInteractive =
                        element => {
                            if (
                                !(element instanceof Element)
                            ) {
                                return false;
                            }

                            const tag =
                                String(
                                    element.localName ||
                                    ""
                                ).toLowerCase();

                            if (
                                [
                                    "button",
                                    "input",
                                    "select",
                                    "textarea",
                                    "summary",
                                    "option"
                                ].includes(
                                    tag
                                ) ||
                                (
                                    tag ===
                                        "a" &&
                                    element.hasAttribute(
                                        "href"
                                    )
                                )
                            ) {
                                return true;
                            }

                            const role =
                                String(
                                    element.getAttribute(
                                        "role"
                                    ) ||
                                    ""
                                )
                                    .trim()
                                    .toLowerCase()
                                    .split(
                                        /\s+/
                                    )[0];

                            if (
                                interactiveRoles.has(
                                    role
                                ) ||
                                element.hasAttribute(
                                    "tabindex"
                                ) ||
                                element.isContentEditable
                            ) {
                                return true;
                            }

                            if (
                                Array.from(
                                    element.attributes ||
                                    []
                                ).some(
                                    attribute =>
                                        /(?:^|[:@._-])click(?:$|[.:_-])/i.test(
                                            attribute.name
                                        )
                                )
                            ) {
                                return true;
                            }

                            try {
                                return getComputedStyle(
                                    element
                                ).cursor ===
                                    "pointer";
                            } catch {
                                return false;
                            }
                        };

                    const getInteractiveOwner =
                        element => {
                            let current =
                                element;

                            while (
                                current instanceof
                                    Element
                            ) {
                                if (
                                    isInteractive(
                                        current
                                    )
                                ) {
                                    return current;
                                }

                                current =
                                    current.parentElement;
                            }

                            return element;
                        };

                    if (
                        algorithmElement ===
                        candidateElement
                    ) {
                        return {
                            relationship:
                                "same-element",

                            sameClickTarget:
                                true
                        };
                    }

                    const algorithmOwner =
                        getInteractiveOwner(
                            algorithmElement
                        );

                    const candidateOwner =
                        getInteractiveOwner(
                            candidateElement
                        );

                    if (
                        algorithmOwner ===
                        candidateOwner
                    ) {
                        return {
                            relationship:
                                "same-interactive-control",

                            sameClickTarget:
                                true
                        };
                    }

                    if (
                        algorithmElement.contains(
                            candidateElement
                        )
                    ) {
                        return {
                            relationship:
                                "algorithm-ancestor-of-candidate",

                            sameClickTarget:
                                false
                        };
                    }

                    if (
                        candidateElement.contains(
                            algorithmElement
                        )
                    ) {
                        return {
                            relationship:
                                "candidate-ancestor-of-algorithm",

                            sameClickTarget:
                                false
                        };
                    }

                    return {
                        relationship:
                            "different-elements",

                        sameClickTarget:
                            false
                    };
                },
                candidateHandle
            );

        inspection.relationship =
            relationship?.relationship ||
            null;

        inspection.sameClickTarget =
            relationship?.sameClickTarget ===
            true;

        if (
            !inspection.sameClickTarget
        ) {
            return inspection;
        }

        inspection.enabled =
            await locator
                .isEnabled()
                .catch(
                    () => false
                );

        if (
            !inspection.enabled
        ) {
            return inspection;
        }

        /*
         * Never issue a Playwright trial click while the user is recording.
         * Trial clicks run the full actionability/auto-scroll pipeline and
         * compete with Codegen's hover highlighter. The physical click already
         * proved that this exact enabled control was usable at capture time.
         */
        inspection.passivelyUsable =
            true;

        return inspection;
    } catch (
        error
    ) {
        inspection.error =
            String(
                error?.message ||
                error ||
                "live locator inspection failed"
            );

        return inspection;
    } finally {
        await candidateHandle
            ?.dispose?.()
            .catch(
                () => {}
            );
    }
}

function buildLiveSemanticLocatorCandidates(
    rootExpression,
    profiles
) {
    const candidates = [];
    const seen =
        new Set();

    const push = (
        method,
        expression
    ) => {
        if (
            !expression ||
            seen.has(
                expression
            ) ||
            candidates.length >=
                LIVE_SEMANTIC_LOCATOR_MAX_CANDIDATES
        ) {
            return;
        }

        seen.add(
            expression
        );

        candidates.push({
            method,
            expression
        });
    };

    for (
        const profile of
        profiles
    ) {
        const role =
            normalizeLiveSemanticText(
                profile?.role
            ).toLowerCase();

        const nameCandidates =
            Array.from(
                new Set(
                    (
                        Array.isArray(
                            profile?.accessibleNameCandidates
                        )
                            ? profile.accessibleNameCandidates
                            : []
                    )
                        .map(
                            normalizeLiveSemanticText
                        )
                        .filter(
                            Boolean
                        )
                )
            ).slice(
                0,
                8
            );

        if (
            role
        ) {
            for (
                const name of
                nameCandidates
            ) {
                push(
                    "getByRole-name",
                    `${rootExpression}.getByRole(${JSON.stringify(
                        role
                    )}, { name: ${JSON.stringify(
                        name
                    )}, exact: true })`
                );
            }
        }

        const labelCandidates =
            Array.from(
                new Set([
                    profile?.labelText,
                    profile?.ariaLabel,
                    profile?.ariaLabelledByText
                ]
                    .map(
                        normalizeLiveSemanticText
                    )
                    .filter(
                        Boolean
                    ))
            );

        for (
            const label of
            labelCandidates
        ) {
            push(
                "getByLabel",
                `${rootExpression}.getByLabel(${JSON.stringify(
                    label
                )}, { exact: true })`
            );
        }

        const testId =
            normalizeLiveSemanticText(
                profile?.testId
            );

        if (
            testId
        ) {
            push(
                "getByTestId",
                `${rootExpression}.getByTestId(${JSON.stringify(
                    testId
                )})`
            );
        }

        for (
            const [
                method,
                value
            ] of [
                [
                    "getByPlaceholder",
                    profile?.placeholder
                ],
                [
                    "getByAltText",
                    profile?.altText
                ],
                [
                    "getByTitle",
                    profile?.title
                ]
            ]
        ) {
            const normalizedValue =
                normalizeLiveSemanticText(
                    value
                );

            if (
                normalizedValue
            ) {
                push(
                    method,
                    `${rootExpression}.${method}(${JSON.stringify(
                        normalizedValue
                    )}, { exact: true })`
                );
            }
        }

        const normalizedText =
            normalizeLiveSemanticText(
                profile?.normalizedText
            );

        if (
            normalizedText
        ) {
            /*
             * Playwright normalizes whitespace for getByText. Supplying our
             * normalized DOM text with exact:true gives normalize-space-like
             * behavior without turning the semantic locator into XPath.
             */
            push(
                "getByText",
                `${rootExpression}.getByText(${JSON.stringify(
                    normalizedText
                )}, { exact: true })`
            );
        }

        if (
            role
        ) {
            push(
                "getByRole",
                `${rootExpression}.getByRole(${JSON.stringify(
                    role
                )})`
            );
        }
    }

    return candidates;
}

async function compareAlgorithmXPathWithLiveSemantics({
    bindingSource,
    algorithmSelector,
    action
}) {
    const comparison = {
        available:
            false,

        compared:
            false,

        agrees:
            false,

        semanticUsable:
            false,

        semanticVisible:
            false,

        semanticActionable:
            null,

        semanticEnabled:
            null,

        validationMode:
            "passive-same-control",

        selectedSource:
            "xpath",

        selectedLocatorExpression:
            null,

        algorithmXPathRetained:
            true,

        candidatesGenerated:
            0,

        candidatesAttempted:
            0
    };

    const page =
        bindingSource?.page;

    const frame =
        bindingSource?.frame;

    const rootExpression =
        getLiveLocatorRootExpression(
            action
        );

    if (
        !page ||
        !frame ||
        !rootExpression ||
        typeof frame.locator !==
            "function"
    ) {
        comparison.reason =
            "live page/frame root was unavailable; algorithm XPath retained";

        return comparison;
    }

    comparison.available =
        true;

    const algorithmLocator =
        frame.locator(
            algorithmSelector
        );

    let algorithmHandle =
        null;

    try {
        comparison.algorithmMatchCount =
            await algorithmLocator.count();

        if (
            comparison.algorithmMatchCount !==
            1
        ) {
            comparison.compared =
                true;

            comparison.reason =
                `algorithm XPath did not resolve exactly once during live semantic discovery ` +
                `(count=${comparison.algorithmMatchCount}); algorithm XPath retained`;

            return comparison;
        }

        algorithmHandle =
            await algorithmLocator.elementHandle();

        if (
            !algorithmHandle
        ) {
            comparison.reason =
                "algorithm XPath target disappeared before live semantic discovery; algorithm XPath retained";

            return comparison;
        }

        const profiles =
            await algorithmHandle.evaluate(
                element => {
                    const normalize =
                        value => String(
                            value ||
                            ""
                        )
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim()
                            .slice(
                                0,
                                240
                            );

                    const interactiveRoles =
                        new Set([
                            "button",
                            "checkbox",
                            "combobox",
                            "link",
                            "listbox",
                            "menuitem",
                            "menuitemcheckbox",
                            "menuitemradio",
                            "option",
                            "radio",
                            "searchbox",
                            "slider",
                            "spinbutton",
                            "switch",
                            "tab",
                            "textbox",
                            "treeitem"
                        ]);

                    const implicitRole =
                        target => {
                            const explicitRole =
                                normalize(
                                    target.getAttribute(
                                        "role"
                                    )
                                )
                                    .toLowerCase()
                                    .split(
                                        /\s+/
                                    )[0];

                            if (
                                explicitRole
                            ) {
                                return explicitRole;
                            }

                            const tag =
                                String(
                                    target.localName ||
                                    ""
                                ).toLowerCase();

                            const type =
                                String(
                                    target.getAttribute(
                                        "type"
                                    ) ||
                                    "text"
                                ).toLowerCase();

                            if (
                                tag ===
                                    "button" ||
                                (
                                    tag ===
                                        "input" &&
                                    [
                                        "button",
                                        "submit",
                                        "reset",
                                        "image"
                                    ].includes(
                                        type
                                    )
                                )
                            ) {
                                return "button";
                            }

                            if (
                                tag ===
                                    "a" &&
                                target.hasAttribute(
                                    "href"
                                )
                            ) {
                                return "link";
                            }

                            if (
                                tag ===
                                "textarea"
                            ) {
                                return "textbox";
                            }

                            if (
                                tag ===
                                "input"
                            ) {
                                if (
                                    [
                                        "checkbox",
                                        "radio",
                                        "range"
                                    ].includes(
                                        type
                                    )
                                ) {
                                    return type ===
                                        "range"
                                            ? "slider"
                                            : type;
                                }

                                if (
                                    [
                                        "email",
                                        "search",
                                        "tel",
                                        "text",
                                        "url"
                                    ].includes(
                                        type
                                    )
                                ) {
                                    return type ===
                                        "search"
                                            ? "searchbox"
                                            : "textbox";
                                }

                                return "";
                            }

                            if (
                                tag ===
                                "select"
                            ) {
                                return target.multiple ||
                                    Number(
                                        target.getAttribute(
                                            "size"
                                        ) ||
                                        0
                                    ) >
                                        1
                                    ? "listbox"
                                    : "combobox";
                            }

                            if (
                                /^h[1-6]$/.test(
                                    tag
                                )
                            ) {
                                return "heading";
                            }

                            const rolesByTag = {
                                option:
                                    "option",
                                li:
                                    "listitem",
                                ul:
                                    "list",
                                ol:
                                    "list",
                                table:
                                    "table",
                                tr:
                                    "row",
                                td:
                                    "cell",
                                img:
                                    "img",
                                nav:
                                    "navigation",
                                main:
                                    "main",
                                article:
                                    "article",
                                aside:
                                    "complementary",
                                progress:
                                    "progressbar"
                            };

                            if (
                                tag ===
                                "th"
                            ) {
                                return String(
                                    target.getAttribute(
                                        "scope"
                                    ) ||
                                    ""
                                ).toLowerCase() ===
                                    "row"
                                    ? "rowheader"
                                    : "columnheader";
                            }

                            return rolesByTag[
                                tag
                            ] ||
                                "";
                        };

                    const isInteractive =
                        target => {
                            const role =
                                implicitRole(
                                    target
                                );

                            if (
                                interactiveRoles.has(
                                    role
                                ) ||
                                target.hasAttribute(
                                    "tabindex"
                                ) ||
                                target.isContentEditable
                            ) {
                                return true;
                            }

                            if (
                                Array.from(
                                    target.attributes ||
                                    []
                                ).some(
                                    attribute =>
                                        /(?:^|[:@._-])click(?:$|[.:_-])/i.test(
                                            attribute.name
                                        )
                                )
                            ) {
                                return true;
                            }

                            try {
                                return getComputedStyle(
                                    target
                                ).cursor ===
                                    "pointer";
                            } catch {
                                return false;
                            }
                        };

                    const getInteractiveOwner =
                        target => {
                            let current =
                                target;

                            while (
                                current instanceof
                                    Element
                            ) {
                                if (
                                    isInteractive(
                                        current
                                    )
                                ) {
                                    return current;
                                }

                                current =
                                    current.parentElement;
                            }

                            return target;
                        };

                    const profile =
                        target => {
                            const labelledByText =
                                normalize(
                                    normalize(
                                        target.getAttribute(
                                            "aria-labelledby"
                                        )
                                    )
                                        .split(
                                            /\s+/
                                        )
                                        .filter(
                                            Boolean
                                        )
                                        .map(
                                            id =>
                                                target.ownerDocument
                                                    ?.getElementById(
                                                        id
                                                    )
                                                    ?.textContent ||
                                                ""
                                        )
                                        .join(
                                            " "
                                        )
                                );

                            const labels =
                                Array.from(
                                    target.labels ||
                                    []
                                );

                            const closestLabel =
                                target.closest?.(
                                    "label"
                                );

                            if (
                                closestLabel &&
                                !labels.includes(
                                    closestLabel
                                )
                            ) {
                                labels.push(
                                    closestLabel
                                );
                            }

                            const labelText =
                                normalize(
                                    labels
                                        .map(
                                            label =>
                                                label.textContent ||
                                                ""
                                        )
                                        .join(
                                            " "
                                        )
                                );

                            const ariaLabel =
                                normalize(
                                    target.getAttribute(
                                        "aria-label"
                                    )
                                );

                            const altText =
                                normalize(
                                    target.getAttribute(
                                        "alt"
                                    )
                                );

                            const title =
                                normalize(
                                    target.getAttribute(
                                        "title"
                                    )
                                );

                            const normalizedText =
                                normalize(
                                    target.textContent
                                );

                            const inputValueName =
                                String(
                                    target.localName ||
                                    ""
                                ).toLowerCase() ===
                                    "input" &&
                                [
                                    "button",
                                    "submit",
                                    "reset"
                                ].includes(
                                    String(
                                        target.getAttribute(
                                            "type"
                                        ) ||
                                        ""
                                    ).toLowerCase()
                                )
                                    ? normalize(
                                        target.getAttribute(
                                            "value"
                                        )
                                    )
                                    : "";

                            return {
                                role:
                                    implicitRole(
                                        target
                                    ),

                                ariaLabel,
                                ariaLabelledByText:
                                    labelledByText,
                                labelText,
                                altText,
                                title,
                                normalizedText,

                                placeholder:
                                    normalize(
                                        target.getAttribute(
                                            "placeholder"
                                        )
                                    ),

                                testId:
                                    normalize(
                                        target.getAttribute(
                                            "data-testid"
                                        )
                                    ),

                                accessibleNameCandidates:
                                    Array.from(
                                        new Set([
                                            ariaLabel,
                                            labelledByText,
                                            labelText,
                                            altText,
                                            title,
                                            inputValueName,
                                            normalizedText
                                        ].filter(
                                            Boolean
                                        ))
                                    ).slice(
                                        0,
                                        8
                                    )
                            };
                        };

                    const owner =
                        getInteractiveOwner(
                            element
                        );

                    const targets =
                        owner ===
                            element
                            ? [
                                element
                            ]
                            : [
                                owner,
                                element
                            ];

                    return targets.map(
                        profile
                    );
                }
            );

        const candidates =
            buildLiveSemanticLocatorCandidates(
                rootExpression,
                Array.isArray(
                    profiles
                )
                    ? profiles
                    : []
            );

        comparison.candidatesGenerated =
            candidates.length;

        for (
            const candidate of
            candidates
        ) {
            comparison.candidatesAttempted +=
                1;

            let locator;

            try {
                locator =
                    createLocatorFromExpression(
                        page,
                        candidate.expression
                    );
            } catch {
                continue;
            }

            if (
                !locator ||
                typeof locator.count !==
                    "function"
            ) {
                continue;
            }

            const inspection =
                await inspectLiveLocatorCandidate({
                    locator,
                    algorithmHandle
                });

            if (
                inspection.sameClickTarget &&
                inspection.visible &&
                !inspection.enabled
            ) {
                /*
                 * Another locator string cannot enable the same DOM control.
                 * Stop here instead of inspecting equivalent locator strings.
                 */
                comparison.compared =
                    true;

                comparison.semanticMatchCount =
                    inspection.matchCount;

                comparison.relationship =
                    inspection.relationship;

                comparison.reason =
                    "semantic locator resolved to the correct live control, but that control was not enabled; algorithm XPath retained";

                return comparison;
            }

            if (
                !inspection.sameClickTarget ||
                !inspection.visible ||
                !inspection.passivelyUsable
            ) {
                continue;
            }

            comparison.compared =
                true;

            comparison.agrees =
                true;

            comparison.semanticUsable =
                true;

            comparison.semanticVisible =
                true;

            comparison.semanticActionable =
                null;

            comparison.semanticEnabled =
                inspection.enabled ===
                true;

            comparison.semanticMatchCount =
                inspection.matchCount;

            comparison.relationship =
                inspection.relationship;

            comparison.selectedMethod =
                candidate.method;

            comparison.selectedSource =
                "semantic";

            comparison.selectedLocatorExpression =
                candidate.expression;

            comparison.algorithmXPathRetained =
                false;

            comparison.reason =
                "live semantic locator is unique, visible, enabled, and resolves to the XPath target or its exact interactive control; active-recording trial clicks are disabled";

            return comparison;
        }

        comparison.compared =
            true;

        comparison.reason =
            "no generated semantic Playwright locator passed unique, visible, enabled, same-control validation; algorithm XPath retained";

        return comparison;
    } catch (
        error
    ) {
        comparison.reason =
            `live semantic locator comparison failed: ${String(
                error?.message ||
                error ||
                "unknown error"
            )}; algorithm XPath retained`;

        return comparison;
    } finally {
        await algorithmHandle
            ?.dispose?.()
            .catch(
                () => {}
            );
    }
}

async function compareAlgorithmXPathWithCodegen({
    bindingSource,
    algorithmSelector,
    codegenOutput
}) {
    const comparison = {
        available:
            codegenOutput?.available ===
            true,

        line:
            codegenOutput?.line ||
            null,

        actionMethod:
            codegenOutput?.actionMethod ||
            null,

        clickOrdinal:
            codegenOutput?.clickOrdinal ??
            null,

        waitedMs:
            codegenOutput?.waitedMs ??
            null,

        ignoredFill:
            codegenOutput?.ignoredFill ===
            true,

        outputCleared:
            codegenOutput?.cleared ===
            true,

        compared:
            false,

        agrees:
            null,

        relationship:
            null,

        locatorExpression:
            null,

        codegenVisible:
            null,

        codegenActionable:
            null,

        codegenEnabled:
            null,

        validationMode:
            "passive-same-control",

        codegenUsable:
            false,

        selectedSource:
            "xpath",

        selectedLocatorExpression:
            null,

        algorithmXPathRetained:
            true,

        consumed:
            codegenOutput?.available ===
            true
    };

    if (
        !comparison.available
    ) {
        comparison.reason =
            comparison.ignoredFill
                ? "closest codegen output was fill and was ignored; algorithm XPath retained"
                : "codegen-produced-no-click-output; algorithm XPath retained";

        return comparison;
    }

    const locatorExpression =
        String(
            codegenOutput?.locatorExpression ||
            getCodegenLocatorExpression(
                comparison.line
            ) ||
            ""
        ).trim();

    if (!locatorExpression) {
        comparison.reason =
            "codegen click locator could not be isolated; algorithm XPath retained";

        return comparison;
    }

    comparison.locatorExpression =
        locatorExpression;

    const page =
        bindingSource?.page;

    const frame =
        bindingSource?.frame;

    if (
        !page ||
        !frame ||
        typeof frame.locator !==
            "function"
    ) {
        comparison.reason =
            "binding frame was unavailable for live comparison; algorithm XPath retained";

        return comparison;
    }

    let algorithmHandle =
        null;

    let codegenHandle =
        null;

    try {
        const createLocator =
            Function(
                "page",
                `"use strict"; return (${locatorExpression});`
            );

        const codegenLocator =
            createLocator(
                page
            );

        if (
            !codegenLocator ||
            typeof codegenLocator.count !==
                "function" ||
            typeof codegenLocator.elementHandle !==
                "function"
        ) {
            comparison.reason =
                "codegen expression did not produce a locator; algorithm XPath retained";

            return comparison;
        }

        const algorithmLocator =
            frame.locator(
                algorithmSelector
            );

        const [
            algorithmCount,
            codegenCount
        ] =
            await Promise.all([
                algorithmLocator.count(),
                codegenLocator.count()
            ]);

        comparison.algorithmMatchCount =
            algorithmCount;

        comparison.codegenMatchCount =
            codegenCount;

        if (
            algorithmCount !== 1 ||
            codegenCount !== 1
        ) {
            comparison.compared =
                true;

            comparison.agrees =
                false;

            comparison.reason =
                `live locator counts differed from one ` +
                `(algorithm=${algorithmCount}, codegen=${codegenCount}); ` +
                `algorithm XPath retained`;

            return comparison;
        }

        comparison.codegenVisible =
            await codegenLocator
                .isVisible();

        if (
            !comparison.codegenVisible
        ) {
            comparison.compared =
                true;

            comparison.agrees =
                false;

            comparison.reason =
                "codegen locator was not visible; algorithm XPath retained";

            return comparison;
        }

        [
            algorithmHandle,
            codegenHandle
        ] =
            await Promise.all([
                algorithmLocator.elementHandle(),
                codegenLocator.elementHandle()
            ]);

        if (
            !algorithmHandle ||
            !codegenHandle
        ) {
            comparison.reason =
                "one of the live locator handles disappeared; algorithm XPath retained";

            return comparison;
        }

        const liveInspection =
            await inspectLiveLocatorCandidate({
                locator:
                    codegenLocator,

                algorithmHandle
            });

        comparison.compared =
            true;

        comparison.relationship =
            liveInspection.relationship;

        comparison.agrees =
            liveInspection.sameClickTarget ===
            true;

        comparison.codegenActionable =
            null;

        comparison.codegenEnabled =
            liveInspection.enabled ===
            true;

        comparison.codegenUsable =
            comparison.agrees &&
            comparison.codegenVisible &&
            liveInspection.passivelyUsable;

        comparison.selectedSource =
            comparison.codegenUsable
                ? "codegen"
                : "xpath";

        comparison.selectedLocatorExpression =
            comparison.codegenUsable
                ? locatorExpression
                : null;

        comparison.algorithmXPathRetained =
            !comparison.codegenUsable;

        comparison.reason =
            comparison.codegenUsable
                ? "codegen locator is unique, visible, enabled, and resolves to the XPath target or its exact interactive control; codegen selected without an active-recording trial click"
                : comparison.agrees
                    ? "codegen locator resolves to the same control but failed passive visibility/enabled validation; algorithm XPath retained"
                    : "codegen locator does not resolve to the XPath target or its exact interactive control; algorithm XPath retained";

        return comparison;
    } catch (
        error
    ) {
        comparison.reason =
            `codegen comparison failed: ${String(
                error?.message ||
                error ||
                "unknown error"
            )}; algorithm XPath retained`;

        return comparison;
    } finally {
        await Promise.allSettled([
            algorithmHandle?.dispose?.(),
            codegenHandle?.dispose?.()
        ]);
    }
}

/*
 * --------------------------------------------------------------------------
 * CLICK IDENTITY
 * --------------------------------------------------------------------------
 */

function normalizeGestureId(
    value
) {
    if (
        typeof value !==
        "string"
    ) {
        return "";
    }

    const normalized =
        value.trim();

    if (
        !normalized ||
        normalized.length >
            1000
    ) {
        return "";
    }

    return normalized;
}

function getClickGestureId(
    job
) {
    const directCandidates = [
        job?.gestureId,

        job?.capturedAction
            ?.gestureId,

        job?.clickEvent
            ?.gestureId
    ];

    for (
        const candidate of
        directCandidates
    ) {
        const gestureId =
            normalizeGestureId(
                candidate
            );

        if (gestureId) {
            return gestureId;
        }
    }

    /*
     * Compatibility only.
     *
     * Current listeners.js should supply gestureId directly.
     */
    const compatibilityCandidates = [
        job?.clickId,

        job?.capturedAction
            ?.clickId
    ];

    for (
        const candidate of
        compatibilityCandidates
    ) {
        const gestureId =
            normalizeGestureId(
                candidate
            );

        if (
            /^(pointer|recovered-pointer|keyboard):/i.test(
                gestureId
            )
        ) {
            return gestureId;
        }
    }

    return "";
}

function actionsContainClickGesture(
    gestureId
) {
    const normalizedGestureId =
        normalizeGestureId(
            gestureId
        );

    if (!normalizedGestureId) {
        return false;
    }

    return actions.some(
        action => {
            return (
                action?.action ===
                    "click" &&
                normalizeGestureId(
                    action.gestureId
                ) ===
                    normalizedGestureId
            );
        }
    );
}

function removeExplicitRecorderReplayClicks(
    actionList
) {
    if (!Array.isArray(actionList)) {
        return [];
    }

    const recordedGestureIds =
        new Set(
            actionList
                .filter(
                    action =>
                        action?.action ===
                            "click"
                )
                .map(
                    action =>
                        normalizeGestureId(
                            action?.gestureId ||
                            action?.clickId
                        )
                )
                .filter(Boolean)
        );

    return actionList.filter(
        action => {
            if (
                action?.action !==
                    "click"
            ) {
                return true;
            }

            const replayOfGestureId =
                normalizeGestureId(
                    action
                        ?.recorderReplayOfGestureId
                );

            return !(
                replayOfGestureId &&
                recordedGestureIds.has(
                    replayOfGestureId
                )
            );
        }
    );
}

/*
 * --------------------------------------------------------------------------
 * RECORDER OVERLAY FILTER
 * --------------------------------------------------------------------------
 */

function isRecorderOverlayElementMetadata(
    element
) {
    if (
        !element ||
        typeof element !==
            "object"
    ) {
        return false;
    }

    const tagName =
        String(
            element.tagName ||
            element.tag ||
            ""
        )
            .trim()
            .toLowerCase();

    return (
        tagName ===
        "x-pw-glass"
    );
}

function isRecorderOverlayAction(
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
        isRecorderOverlayElementMetadata(
            action.element
        )
    ) {
        return true;
    }

    if (
        isRecorderOverlayElementMetadata(
            action.capturedAction
                ?.element
        )
    ) {
        return true;
    }

    const selector =
        String(
            action.selector ||
            action.capturedAction
                ?.selector ||
            ""
        )
            .trim()
            .toLowerCase();

    const xpath =
        String(
            action.xpath ||
            action.capturedAction
                ?.xpath ||
            ""
        )
            .trim()
            .toLowerCase();

    return (
        selector.includes(
            "x-pw-glass"
        ) ||
        xpath.includes(
            "x-pw-glass"
        )
    );
}

/*
 * --------------------------------------------------------------------------
 * CLICK OUTPUT SANITIZATION
 * --------------------------------------------------------------------------
 */

function removeInternalClickFields(
    action
) {
    /*
     * Internal transport fields.
     */
    delete action.clickId;
    delete action.xpathKey;
    delete action.sequence;

    delete action.capturedAction;
    delete action.candidates;
    delete action.fingerprint;
    delete action.frameInfo;
    delete action.clickEvent;
    delete action.clickDetail;
    delete action.clickCapturedAt;

    /*
     * Legacy selector architecture.
     */
    delete action.primaryXPath;
    delete action.primary_xpath;

    delete action.backupXPath;
    delete action.backup_xpath;

    delete action.normalXPath;
    delete action.normal_xpath;

    /*
     * Internal compatibility metadata.
     */
    delete action.url;

    return action;
}

/*
 * --------------------------------------------------------------------------
 * CLICK ACTION BUILDER
 * --------------------------------------------------------------------------
 *
 * Three legitimate resolved selector outcomes exist: primary, contextual,
 * and indexed. Every committed click must contain an XPath.
 *
 * RESOLVED:
 *
 *     {
 *         action: "click",
 *         gestureId: "...",
 *         selectorStrategy: "primary",
 *         selector: "xpath=...",
 *         xpath: "..."
 *     }
 *
 * or:
 *
 *     {
 *         action: "click",
 *         gestureId: "...",
 *         selectorStrategy: "contextual",
 *         selector: "xpath=...",
 *         xpath: "..."
 *     }
 *
 * Legacy unresolved payloads are deliberately rejected. listeners.js keeps
 * selector work pending and emits only commit-proven XPath clicks.
 */

function buildAcceptedClickAction(
    job
) {
    if (
        !job ||
        typeof job !==
            "object"
    ) {
        return {
            accepted:
                false,

            reason:
                "Click payload is not an object"
        };
    }

    if (
        isRecorderOverlayAction(
            job
        )
    ) {
        return {
            accepted:
                false,

            ignored:
                true,

            reason:
                "Playwright recorder overlay click ignored"
        };
    }

    const gestureId =
        getClickGestureId(
            job
        );

    if (!gestureId) {
        return {
            accepted:
                false,

            reason:
                "Click contains no valid physical gestureId"
        };
    }

    const capturedAction =
        (
            job.capturedAction &&
            typeof job.capturedAction ===
                "object"
        )
            ? {
                ...job.capturedAction
            }
            : {
                ...job
            };

    if (
        isRecorderOverlayAction(
            capturedAction
        )
    ) {
        return {
            accepted:
                false,

            ignored:
                true,

            gestureId,

            reason:
                "Playwright recorder overlay click ignored"
        };
    }

    const selectorStrategy =
        normalizeSelectorStrategy(
            job.selectorStrategy ||
            capturedAction
                .selectorStrategy
        );

    const selector =
        normalizeClickSelector(
            job.selector ||
            capturedAction.selector
        );

    const suppliedXPath =
        normalizeXPath(
            job.xpath ||
            capturedAction.xpath
        );

    if (
        selectorStrategy ===
        "unresolved"
    ) {
        return {
            accepted:
                false,

            gestureId,

            reason:
                "Click selector resolution failed; unresolved clicks cannot enter TRACE"
        };
    }

    /*
     * ------------------------------------------------------------------
     * RESOLVED PRIMARY OR CONTEXTUAL CLICK
     * ------------------------------------------------------------------
     *
     * Backward compatibility:
     *
     * If an older browser-side version supplied a valid XPath but omitted
     * selectorStrategy, treat it as a primary click.
     */

    if (!selector) {
        return {
            accepted:
                false,

            gestureId,

            reason:
                "Resolved click contains no valid XPath selector"
        };
    }

    const selectorXPath =
        normalizeXPath(
            selector
        );

    /*
     * selector is authoritative.
     *
     * If listeners.js supplied raw xpath too, it must describe the same
     * locator.
     */
    if (
        suppliedXPath &&
        selectorXPath !==
            suppliedXPath
    ) {
        return {
            accepted:
                false,

            gestureId,

            reason:
                "Click selector and xpath disagree"
        };
    }

    const xpath =
        suppliedXPath ||
        selectorXPath;

    if (!xpath) {
        return {
            accepted:
                false,

            gestureId,

            reason:
                "Resolved click contains no XPath"
        };
    }

    const resolvedSelectorStrategy =
        selectorStrategy ||
        "primary";

    if (
        resolvedSelectorStrategy ===
            "structural"
            ? !isAllowedStructuralClickXPath(
                xpath
            )
            : containsDisallowedClickXPathPosition(
                xpath
            )
    ) {
        return {
            accepted:
                false,

            gestureId,

            reason:
                resolvedSelectorStrategy === "structural"
                    ? "Structural click XPath is not an internally generated absolute element path"
                    : "Click XPath may contain at most one numeric index, limited to [1], [2] or [3]"
        };
    }

    if (
        !RESOLVED_CLICK_SELECTOR_STRATEGIES.has(
            resolvedSelectorStrategy
        )
    ) {
        return {
            accepted:
                false,

            gestureId,

            reason:
                `Unsupported resolved click selectorStrategy: ${resolvedSelectorStrategy}`
        };
    }

    const action =
        removeInternalClickFields({
            ...capturedAction,

            action:
                "click",

            gestureId,

            selector,

            xpath,

            selectorStrategy:
                resolvedSelectorStrategy
        });

    /*
     * A resolved click must not accidentally retain unresolved metadata.
     */
    delete action.unresolved;

    if (
        isRecorderOverlayAction(
            action
        )
    ) {
        return {
            accepted:
                false,

            ignored:
                true,

            gestureId,

            reason:
                "Playwright recorder overlay click ignored"
        };
    }

    return {
        accepted:
            true,

        unresolved:
            false,

        action,

        gestureId,

        selector,

        xpath,

        selectorStrategy:
            resolvedSelectorStrategy
    };
}

/*
 * --------------------------------------------------------------------------
 * NON-CLICK GENERAL DEDUPE
 * --------------------------------------------------------------------------
 *
 * Click is intentionally absent.
 *
 * Click dedupe is exclusively gestureId based.
 */

function buildNonClickActionKey(
    action
) {
    if (
        !action?.action ||
        action.action ===
            "click"
    ) {
        return "";
    }

    switch (
        action.action
    ) {
        case "navigation":
            return [
                action.action,

                action.url ||
                    ""
            ].join(
                "::"
            );

        case "scroll":
            return [
                action.action,

                action.scrollPercent ??
                    "",

                action.maxScrollY ??
                    ""
            ].join(
                "::"
            );

        case "input":
            return [
                action.action,

                action.selector ||
                    "",

                action.value ??
                    ""
            ].join(
                "::"
            );

        case "select":
        case "checkbox":
        case "radio":
            return [
                action.action,

                action.selector ||
                    "",

                action.value ??
                    "",

                action.checked ??
                    ""
            ].join(
                "::"
            );

        default:
            return [
                action.action,

                action.selector ||
                    ""
            ].join(
                "::"
            );
    }
}

/*
 * ==========================================================================
 * RECORDER
 * ==========================================================================
 */

(async () => {
    const ts =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            )
            .slice(
                0,
                19
            );

    cleanOutputDirectory(
        OUT_DIR
    );

    const scriptPath =
        path.join(
            OUT_DIR,
            `codegen-${ts}.js`
        );

    const codegenClickOutputConsumer =
        createCodegenClickOutputConsumer(
            scriptPath
        );

    const actionsPath =
        path.join(
            OUT_DIR,
            `actions-${ts}.json`
        );

    const userDataDir =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "pw-codegen-"
            )
        );

    const {
        browserType,
        browserLabel,
        launchOptions
    } =
        resolveBrowserLaunch(
            REQUESTED_BROWSER
        );

    const viewport =
        parseViewport(
            REQUESTED_VIEWPORT
        );

    const context =
        await browserType
            .launchPersistentContext(
                userDataDir,
                {
                    ...launchOptions,

                    viewport:
                        viewport ||
                        undefined
                }
            );

    let finalized =
        false;

    const pendingCaptureBindingJobs =
        new Set();

    const pendingClickEnrichmentJobs =
        new Set();

    /*
     * General consecutive dedupe belongs only to NON-CLICK actions.
     */
    let lastAcceptedNonClickActionKey =
        null;

    /*
     * The ONLY Node-side click duplicate identity is gestureId.
     */
    const acceptedClickGestureIds =
        new Set();

    function hasAcceptedClickGesture(
        gestureId
    ) {
        const normalizedGestureId =
            normalizeGestureId(
                gestureId
            );

        if (!normalizedGestureId) {
            return false;
        }

        return (
            acceptedClickGestureIds.has(
                normalizedGestureId
            ) ||
            actionsContainClickGesture(
                normalizedGestureId
            )
        );
    }

    function registerAcceptedClickGesture(
        gestureId
    ) {
        const normalizedGestureId =
            normalizeGestureId(
                gestureId
            );

        if (!normalizedGestureId) {
            return false;
        }

        acceptedClickGestureIds.add(
            normalizedGestureId
        );

        return true;
    }

    /*
     * ----------------------------------------------------------------------
     * ACTION INSERTION
     * ----------------------------------------------------------------------
     */

    function pushAcceptedAction(
        action
    ) {
        const normalizedAction =
            normalizeCapturedAction(
                action
            );

        const cleanedAction =
            omitNullFields(
                normalizedAction
            );

        if (
            !cleanedAction?.action
        ) {
            return false;
        }

        if (
            isRecorderOverlayAction(
                cleanedAction
            )
        ) {
            return false;
        }

        /*
         * --------------------------------------------------------------
         * CLICK
         * --------------------------------------------------------------
         *
         * Click bypasses generic consecutive-action dedupe entirely.
         */

        if (
            cleanedAction.action ===
            "click"
        ) {
            const gestureId =
                normalizeGestureId(
                    cleanedAction.gestureId
                );

            if (!gestureId) {
                return false;
            }

            if (
                actionsContainClickGesture(
                    gestureId
                )
            ) {
                return false;
            }

            const selectorStrategy =
                normalizeSelectorStrategy(
                    cleanedAction
                        .selectorStrategy
                );

            if (
                selectorStrategy ===
                "unresolved"
            ) {
                return false;
            }

            /*
             * ----------------------------------------------------------
             * RESOLVED PRIMARY OR CONTEXTUAL CLICK
             * ----------------------------------------------------------
             */

            const selector =
                normalizeClickSelector(
                    cleanedAction.selector
                );

            if (!selector) {
                return false;
            }

            const selectorXPath =
                normalizeXPath(
                    selector
                );

            const suppliedXPath =
                normalizeXPath(
                    cleanedAction.xpath
                );

            if (
                suppliedXPath &&
                selectorXPath !==
                    suppliedXPath
            ) {
                return false;
            }

            const xpath =
                suppliedXPath ||
                selectorXPath;

            if (!xpath) {
                return false;
            }

            const resolvedSelectorStrategy =
                selectorStrategy ||
                "primary";

            if (
                resolvedSelectorStrategy ===
                    "structural"
                    ? !isAllowedStructuralClickXPath(
                        xpath
                    )
                    : containsDisallowedClickXPathPosition(
                        xpath
                    )
            ) {
                return false;
            }

            if (
                !RESOLVED_CLICK_SELECTOR_STRATEGIES.has(
                    resolvedSelectorStrategy
                )
            ) {
                return false;
            }

            cleanedAction.gestureId =
                gestureId;

            cleanedAction.selector =
                selector;

            cleanedAction.xpath =
                xpath;

            cleanedAction.selectorStrategy =
                resolvedSelectorStrategy;

            delete cleanedAction.unresolved;

            if (
                isRecorderOverlayAction(
                    cleanedAction
                )
            ) {
                return false;
            }

            actions.push(
                cleanedAction
            );

            return true;
        }

        /*
         * --------------------------------------------------------------
         * NON-CLICK ACTIONS
         * --------------------------------------------------------------
         */

        if (
            SELECTOR_REQUIRED_ACTIONS.has(
                cleanedAction.action
            ) &&
            !cleanedAction.selector
        ) {
            return false;
        }

        if (
            cleanedAction.action ===
                "input" &&
            typeof cleanedAction.value !==
                "string"
        ) {
            return false;
        }

        const actionKey =
            buildNonClickActionKey(
                cleanedAction
            );

        if (
            actionKey &&
            lastAcceptedNonClickActionKey ===
                actionKey
        ) {
            return false;
        }

        lastAcceptedNonClickActionKey =
            actionKey;

        actions.push(
            cleanedAction
        );

        return true;
    }

    /*
     * ----------------------------------------------------------------------
     * CLICK COMMIT
     * ----------------------------------------------------------------------
     *
     * Only resolved physical clicks terminate here.
     *
     * No XPath dedupe.
     * No selector dedupe.
     * No same-element time window.
     *
     * Only gestureId dedupes a click.
     */

    async function commitClickJob(
        job,
        bindingSource
    ) {
        const clickReceivedAt =
            Number.isFinite(
                Number(
                    job?.clickCapturedAt ||
                    job?.capturedAction
                        ?.clickCapturedAt
                )
            )
                ? Number(
                    job?.clickCapturedAt ||
                    job?.capturedAction
                        ?.clickCapturedAt
                )
                : Date.now();

        const gestureId =
            getClickGestureId(
                job
            );

        const incomingSelectorStrategy =
            normalizeSelectorStrategy(
                job?.selectorStrategy ||
                job?.capturedAction
                    ?.selectorStrategy
            );

        console.log(
            "[trace-click] RECEIVED",
            {
                gestureId:
                    gestureId ||
                    null,

                selector:
                    job?.selector ||
                    job?.capturedAction
                        ?.selector ||
                    null,

                xpath:
                    job?.xpath ||
                    job?.capturedAction
                        ?.xpath ||
                    null,

                selectorStrategy:
                    incomingSelectorStrategy ||
                    null,

                unresolved:
                    incomingSelectorStrategy ===
                    "unresolved",

                elementTag:
                    job?.element
                        ?.tagName ||
                    job?.capturedAction
                        ?.element
                        ?.tagName ||
                    null,

                text:
                    job?.text ||
                    job?.capturedAction
                        ?.text ||
                    null
            }
        );

        if (!gestureId) {
            const result = {
                accepted:
                    false,

                sequence:
                    job?.sequence ??
                    null,

                reason:
                    "Click contains no valid physical gestureId"
            };

            console.error(
                "[trace-click] REJECTED",
                result
            );

            return result;
        }

        /*
         * Suppress ONLY the exact same physical gesture.
         */
        if (
            hasAcceptedClickGesture(
                gestureId
            )
        ) {
            const result = {
                accepted:
                    false,

                duplicate:
                    true,

                gestureId,

                sequence:
                    job?.sequence ??
                    null,

                reason:
                    "Physical click gesture was already committed"
            };

            console.debug(
                "[trace-click] SAME GESTURE DUPLICATE SUPPRESSED",
                result
            );

            return result;
        }

        const built =
            buildAcceptedClickAction(
                job
            );

        if (
            !built.accepted
        ) {
            const result = {
                ...built,

                gestureId,

                sequence:
                    job?.sequence ??
                    null
            };

            if (
                result.ignored
            ) {
                console.debug(
                    "[trace-click] IGNORED",
                    result
                );
            } else {
                console.error(
                    "[trace-click] REJECTED",
                    result
                );
            }

            return result;
        }

        const insertionIndex =
            actions.length;

        const committed =
            pushAcceptedAction(
                built.action
            );

        if (!committed) {
            if (
                actionsContainClickGesture(
                    gestureId
                )
            ) {
                acceptedClickGestureIds.add(
                    gestureId
                );

                const result = {
                    accepted:
                        false,

                    duplicate:
                        true,

                    gestureId,

                    sequence:
                        job?.sequence ??
                        null,

                    reason:
                        "Physical click gesture already exists in actions"
                };

                console.debug(
                    "[trace-click] SAME GESTURE DUPLICATE SUPPRESSED",
                    result
                );

                return result;
            }

            const result = {
                accepted:
                    false,

                gestureId,

                sequence:
                    job?.sequence ??
                    null,

                reason:
                    "Click action could not be inserted into TRACE"
            };

            console.error(
                "[trace-click] REJECTED",
                result
            );

            return result;
        }

        registerAcceptedClickGesture(
            gestureId
        );

        const committedAction =
            actions[
                insertionIndex
            ];

        /*
         * The click itself is now safely inside TRACE. Codegen and semantic
         * comparison are optional enrichment and must never hold the page-side
         * capture binding open or make a navigation click disappear.
         */
        const enrichmentJob =
            (async () => {
                /*
                 * Yield the active interaction window to Codegen's pointer and
                 * hover processing. Enrichment is optional and the click is
                 * already committed before this timer begins.
                 */
                await delay(
                    ACTIVE_RECORDING_ENRICHMENT_IDLE_DELAY_MS
                );

                const liveSemanticComparisonPromise =
                    compareAlgorithmXPathWithLiveSemantics({
                        bindingSource,

                        algorithmSelector:
                            built.selector,

                        action:
                            committedAction
                    });

                const [
                    codegenOutput,
                    liveSemanticComparison
                ] =
                    await Promise.all([
                        codegenClickOutputConsumer
                            .consumeClosestClick(
                                clickReceivedAt
                            ),

                        liveSemanticComparisonPromise
                    ]);

                const codegenComparison =
                    await compareAlgorithmXPathWithCodegen({
                        bindingSource,

                        algorithmSelector:
                            built.selector,

                        codegenOutput
                    });

                committedAction.codegenComparison =
                    codegenComparison;

                committedAction.liveSemanticComparison =
                    liveSemanticComparison;

                console.log(
                    "[trace-click] CODEGEN COMPARISON",
                    {
                        gestureId,

                        algorithmSelector:
                            built.selector,

                        ...codegenComparison
                    }
                );

                console.log(
                    "[trace-click] LIVE SEMANTIC COMPARISON",
                    {
                        gestureId,

                        algorithmSelector:
                            built.selector,

                        ...liveSemanticComparison
                    }
                );
            })();

        pendingClickEnrichmentJobs.add(
            enrichmentJob
        );

        enrichmentJob.then(
            () => {
                pendingClickEnrichmentJobs.delete(
                    enrichmentJob
                );
            },
            error => {
                pendingClickEnrichmentJobs.delete(
                    enrichmentJob
                );

                console.warn(
                    "[trace-click] Optional locator enrichment failed after the click was safely committed:",
                    {
                        gestureId,
                        reason:
                            String(
                                error?.message ||
                                error ||
                                "unknown enrichment error"
                            )
                    }
                );
            }
        );

        const result = {
            accepted:
                true,

            gestureId,

            sequence:
                job?.sequence ??
                null,

            selectorStrategy:
                built.selectorStrategy,

            unresolved:
                false,

            selector:
                built.selector ||
                null,

            xpath:
                built.xpath ||
                null,

            enrichmentPending:
                true,

            committedByNode:
                true
        };

        console.log(
            "[trace-click] COMMITTED",
            result
        );

        return result;
    }

    async function flushPendingRecorderWork() {
        const evaluations = [];

        for (const page of context.pages()) {
            if (!page || page.isClosed()) {
                continue;
            }

            for (const frame of page.frames()) {
                evaluations.push(
                    frame.evaluate(
                        async () => {
                            if (
                                typeof window
                                    .__PW_RECORDER_DRAIN_PENDING__ !==
                                "function"
                            ) {
                                return {
                                    drained: true,
                                    unavailable: true
                                };
                            }

                            return window
                                .__PW_RECORDER_DRAIN_PENDING__();
                        }
                    ).catch(
                        error => ({
                            drained: false,
                            unavailable: true,
                            reason:
                                String(
                                    error?.message ||
                                    error ||
                                    "Frame closed during recorder drain"
                                )
                        })
                    )
                );
            }
        }

        if (evaluations.length) {
            await Promise.allSettled(
                evaluations
            );
        }

        while (
            pendingCaptureBindingJobs.size
        ) {
            await Promise.allSettled(
                Array.from(
                    pendingCaptureBindingJobs
                )
            );
        }

        while (
            pendingClickEnrichmentJobs.size
        ) {
            await Promise.allSettled(
                Array.from(
                    pendingClickEnrichmentJobs
                )
            );
        }
    }

    /*
     * ----------------------------------------------------------------------
     * FINAL INPUT / SELECTOR FLUSH
     * ----------------------------------------------------------------------
     */

    async function flushFocusedTextEntries() {
        const evaluations =
            [];

        for (
            const page of
            context.pages()
        ) {
            if (
                !page ||
                page.isClosed()
            ) {
                continue;
            }

            for (
                const frame of
                page.frames()
            ) {
                evaluations.push(
                    frame.evaluate(
                        () => {
                            const element =
                                document.activeElement;

                            if (!element) {
                                return false;
                            }

                            const isTextarea =
                                element instanceof
                                HTMLTextAreaElement;

                            const isContentEditable =
                                element instanceof
                                    HTMLElement &&
                                element.isContentEditable;

                            let isEditableInput =
                                false;

                            if (
                                element instanceof
                                HTMLInputElement
                            ) {
                                const type =
                                    String(
                                        element.type ||
                                        element.getAttribute(
                                            "type"
                                        ) ||
                                        "text"
                                    )
                                        .trim()
                                        .toLowerCase();

                                const excludedTypes =
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
                                        "submit"
                                    ]);

                                isEditableInput =
                                    !excludedTypes.has(
                                        type
                                    );
                            }

                            if (
                                !isTextarea &&
                                !isContentEditable &&
                                !isEditableInput
                            ) {
                                return false;
                            }

                            if (
                                typeof element.blur ===
                                "function"
                            ) {
                                element.blur();

                                return true;
                            }

                            return false;
                        }
                    ).catch(
                        () => false
                    )
                );
            }
        }

        if (
            !evaluations.length
        ) {
            return;
        }

        await Promise.allSettled(
            evaluations
        );

        await delay(
            INPUT_FLUSH_SETTLE_MS
        );
    }

    /*
     * ----------------------------------------------------------------------
     * FINALIZATION
     * ----------------------------------------------------------------------
     */

    const finalize =
        async (
            exitCode = 0
        ) => {
            if (
                finalized
            ) {
                return;
            }

            finalized =
                true;

            console.log(
                "\nFinalizing..."
            );

            await flushFocusedTextEntries()
                .catch(
                    () => {}
                );

            await flushPendingRecorderWork()
                .catch(
                    error => {
                        console.warn(
                            "Recorder drain before final save failed:",
                            error?.message ||
                                error
                        );
                    }
                );

            await delay(
                FINALIZE_ENQUEUE_GRACE_MS
            );

            await flushPendingRecorderWork()
                .catch(
                    () => {}
                );

            const normalizedFinalActions =
                actions
                    .filter(
                        Boolean
                    )
                    .map(
                        normalizeCapturedAction
                    )
                    .map(
                        omitNullFields
                    )
                    .filter(
                        Boolean
                    );

            const finalActions =
                removeExplicitRecorderReplayClicks(
                    normalizedFinalActions
                );

            const removedReplayCount =
                normalizedFinalActions.length -
                finalActions.length;

            if (removedReplayCount > 0) {
                console.log(
                    `[trace-click] Removed ${removedReplayCount} explicitly labelled recorder replay click(s) from final TRACE.`
                );
            }

            fs.writeFileSync(
                actionsPath,
                JSON.stringify(
                    finalActions,
                    null,
                    2
                )
            );

            console.log(
                `Actions saved -> ${actionsPath}`
            );

            console.log(
                `FINAL_OUTPUT::${JSON.stringify({
                    scriptPath,
                    actionsPath
                })}`
            );

            await context
                .close()
                .catch(
                    () => {}
                );

            fs.rmSync(
                userDataDir,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );

            process.exit(
                exitCode
            );
        };

    process.once(
        "SIGINT",
        () => {
            void finalize(
                0
            );
        }
    );

    process.once(
        "SIGTERM",
        () => {
            void finalize(
                0
            );
        }
    );

    /*
     * =========================================================================
     * PLAYWRIGHT SETUP
     * =========================================================================
     */

    try {
        /*
         * ------------------------------------------------------------------
         * ONE AND ONLY TRACE BINDING
         * ------------------------------------------------------------------
         */

        await context.exposeBinding(
            "__captureAction",
            async (
                                source,
                                data
            ) => {
                let bindingJob;

                try {
                    bindingJob =
                        Promise.resolve(
                            data?.action ===
                                "click"
                                ? commitClickJob(
                                    data,
                                    source
                                )
                                : (() => {
                                    const normalizedData =
                                        normalizeCapturedAction(
                                            data
                                        );

                                    const committed =
                                        pushAcceptedAction(
                                            normalizedData
                                        );

                                    return {
                                        accepted:
                                            committed,

                                        reason:
                                            committed
                                                ? null
                                                : "Action was invalid or duplicated"
                                    };
                                })()
                        );
                } catch (error) {
                    bindingJob =
                        Promise.reject(
                            error
                        );
                }

                pendingCaptureBindingJobs.add(
                    bindingJob
                );

                try {
                    return await bindingJob;
                } finally {
                    pendingCaptureBindingJobs.delete(
                        bindingJob
                    );
                }
            }
        );

        /*
         * Install listeners before application JavaScript executes in every
         * newly-created document/frame.
         */
        await context.addInitScript({
            content:
                LISTENER_INIT_SCRIPT
        });

        await context._enableRecorder({
            browserName:
                browserLabel,

            language:
                "playwright-test",

            mode:
                "recording",

            outputFile:
                scriptPath,

            handleSIGINT:
                false
        });

        let page =
            context
                .pages()
                .find(
                    candidatePage =>
                        !candidatePage.isClosed()
                );

        if (!page) {
            page =
                await context.newPage();
        }

        if (
            viewport
        ) {
            await page.setViewportSize(
                viewport
            );
        }

        console.log(
            "Navigating headed recorder page to:",
            DEFAULT_URL
        );

        try {
            await page.goto(
                DEFAULT_URL,
                {
                    waitUntil:
                        "domcontentloaded",

                    timeout:
                        60000
                }
            );
        } catch (
            error
        ) {
            console.warn(
                `Initial navigation did not finish cleanly: ${
                    error?.message ||
                    error
                }`
            );

            console.warn(
                "Continuing recorder. If the page is usable, complete the flow and close the browser."
            );
        }

        console.log(
            "\nRecorder ready"
        );

        if (
            viewport
        ) {
            console.log(
                `Viewport: ${viewport.width}x${viewport.height}`
            );
        }

        console.log(
            "Do actions and close browser\n"
        );

        context.on(
            "close",
            () => {
                void finalize(
                    0
                );
            }
        );
    } catch (
        error
    ) {
        console.error(
            error
        );

        await finalize(
            1
        );
    }
})();

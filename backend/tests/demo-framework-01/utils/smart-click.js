safeLog(
    "[smart-action] Ordered XPath click/fill implementation loaded:",
    __filename
);

/*
 * smart-test.js owns delayed retry, zero-match page-transition waiting, and
 * staged readiness probing.
 *
 * This file:
 *
 * - uses the recorded action.selector first;
 * - when that XPath stays absent, waits for the live DOM to settle and builds
 *   one replacement XPath from the recorded element metadata plus the current
 *   DOM snapshot;
 * - ignores primary_xpath and backup_xpath;
 * - performs no internal repeated click/fill dispatch; smart-test.js owns the
 *   staged action retries;
 * - supports the longer timeout supplied by smart-test.js;
 * - does not perform an unnecessary short trial before a unique real click;
 * - uses trial clicks only when smart-test.js explicitly requests one or when
 *   duplicate XPath matches must be disambiguated;
 * - resolves recorded click and input actions through one ordered ledger;
 * - accepts an aligned Codegen/semantic click only after its live node is
 *   checked against the recorded XPath node or the same interactive control;
 * - carries an exact click-resolved target into its linked fill action;
 * - releases failed and trial action reservations so the same recorded action
 *   can be retried.
 */
const SMART_CLICK_DEFAULT_TIMEOUT_MS =
    15000;

const SMART_CLICK_MAX_TIMEOUT_MS =
    60000;

const SMART_CLICK_MATCH_POLL_INTERVAL_MS =
    100;

const SMART_CLICK_DOM_SETTLE_QUIET_MS =
    160;

const SMART_CLICK_DOM_SETTLE_MAX_MS =
    1500;

const SMART_CLICK_LIVE_RECOVERY_MAX_CANDIDATES =
    500;

const SMART_CLICK_LIVE_RECOVERY_MAX_ATTRIBUTES =
    12;

const SMART_CLICK_LIVE_RECOVERY_MAX_GENERATED =
    1800;

const SMART_CLICK_LIVE_RECOVERY_CACHE_MS =
    5000;

const SMART_CLICK_LIVE_RECOVERY_CACHE =
    new WeakMap();

/*
 * smart-test.js uses this only when it deliberately replays the previously
 * successful locator as a recovery step. That recovery click must use normal
 * Playwright behavior; it must not reserve or consume a later trace action
 * merely because the same XPath appears again in the recording.
 */
const SMART_CLICK_BYPASS =
    Symbol.for(
        "pw-recorder.smart-click-bypass"
    );

/*
 * smart-test.js uses this symbol only when passing a wrapped Locator to a
 * Playwright assertion. Actions still run through the wrappers below.
 */
const SMART_LOCATOR_UNWRAP =
    Symbol.for(
        "pw-recorder.smart-locator-unwrap"
    );

function removeSmartClickInternalOptions(
    options
) {
    const cleaned = {
        ...(
            options ||
            {}
        )
    };

    delete cleaned[
        SMART_CLICK_BYPASS
    ];

    return cleaned;
}

function normalizeSelector(
    value
) {
    const text =
        String(
            value ||
            ""
        ).trim();

    if (!text) {
        return "";
    }

    if (
        /^xpath=/i.test(
            text
        )
    ) {
        return (
            "xpath=" +
            text.replace(
                /^xpath=/i,
                ""
            )
        );
    }

    if (
        text.startsWith("/") ||
        text.startsWith("(")
    ) {
        return `xpath=${text}`;
    }

    return text;
}

function isXPathSelector(
    value
) {
    return /^xpath=/i.test(
        normalizeSelector(
            value
        )
    );
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

function getFillXPathIdentityTokens(
    value
) {
    return (
        normalizeFillXPathIdentity(
            value
        ).match(
            /[\p{L}]+|[\p{N}]+/gu
        ) ||
        []
    );
}

function getFillSensitiveNormalizeSpaceExpressions(
    selector
) {
    const xpathText =
        String(
            selector ||
            ""
        );

    const normalizedTextCall =
        String.raw`normalize-space\s*\(\s*(?:\.|text\s*\(\s*\)|string\s*\(\s*\.\s*\))?\s*\)`;

    const xpathStringLiteral =
        String.raw`(?:'[^']*'|"[^"]*"|concat\((?:[^()]|'[^']*'|"[^"]*")*\))`;

    const expressions =
        [];

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

    return expressions;
}

function fillXPathLiteral(
    value
) {
    const text =
        String(
            value ??
            ""
        );

    if (!text.includes("'")) {
        return `'${text}'`;
    }

    if (!text.includes('"')) {
        return `"${text}"`;
    }

    return (
        "concat(" +
        text
            .split("'")
            .map(
                part =>
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

    const normalizedValue =
        normalizeFillXPathIdentity(
            inputValue
        );

    const fillTokens =
        new Set(
            getFillXPathIdentityTokens(
                inputValue
            )
        );

    const expressions =
        getFillSensitiveNormalizeSpaceExpressions(
            selector
        );

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
                getFillXPathIdentityTokens(
                    match[1] ??
                    match[2] ??
                    ""
                );

            if (
                literalTokens.some(
                    token =>
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

function formatError(
    error
) {
    try {
        return String(
            error instanceof Error
                ? error.message
                : error
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    } catch (_) {
        return "Unprintable error";
    }
}

function safeLog(
    ...messages
) {
    try {
        console.log(
            ...messages
        );
    } catch (_) {
        // Diagnostic output must never affect an action result.
    }
}

function safeWarn(
    ...messages
) {
    try {
        console.warn(
            ...messages
        );
    } catch (_) {
        // Diagnostic output must never affect an action result.
    }
}

function delay(
    milliseconds
) {
    return new Promise(
        resolve => {
            setTimeout(
                resolve,
                milliseconds
            );
        }
    );
}

function isLocatorLike(
    value
) {
    return Boolean(
        value &&
        typeof value ===
            "object" &&
        typeof value.click ===
            "function" &&
        typeof value.count ===
            "function" &&
        typeof value.locator ===
            "function"
    );
}

function getAttemptTimeoutMs(
    options
) {
    const requestedTimeout =
        Number(
            options?.timeout
        );

    if (
        !Number.isFinite(
            requestedTimeout
        ) ||
        requestedTimeout <= 0
    ) {
        return SMART_CLICK_DEFAULT_TIMEOUT_MS;
    }

    return Math.min(
        SMART_CLICK_MAX_TIMEOUT_MS,
        Math.max(
            1,
            requestedTimeout
        )
    );
}

function getTraceRoot(
    page,
    action
) {
    let root =
        page;

    for (
        const frameEntry of
        action.frameChain ||
        []
    ) {
        const selector =
            typeof frameEntry ===
                "string"
                ? frameEntry
                : (
                    frameEntry
                        ?.selector ||
                    frameEntry
                        ?.locator ||
                    ""
                );

        if (!selector) {
            continue;
        }

        root =
            root.frameLocator(
                selector
            );
    }

    return root;
}

async function pointsToSameNode(
    first,
    second
) {
    try {
        return await first.evaluate(
            (
                firstNode,
                secondNode
            ) => {
                return (
                    firstNode ===
                    secondNode
                );
            },
            second
        );
    } catch {
        return false;
    }
}

async function clickTargetRelationship(
    first,
    second
) {
    try {
        return await first.evaluate(
            (
                firstNode,
                secondNode
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
                            current instanceof Element
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
                    firstNode ===
                    secondNode
                ) {
                    return "same-element";
                }

                if (
                    getInteractiveOwner(
                        firstNode
                    ) ===
                    getInteractiveOwner(
                        secondNode
                    )
                ) {
                    return "same-interactive-control";
                }

                return "different-target";
            },
            second
        );
    } catch {
        return "comparison-unavailable";
    }
}

async function resolveRequestedElement(
    locator,
    timeout
) {
    try {
        const count =
            await locator.count();

        if (count !== 1) {
            return null;
        }

        return await locator
            .elementHandle({
                timeout
            });
    } catch {
        return null;
    }
}

async function matchesRecordedMetadata(
    handle,
    action
) {
    try {
        return await handle.evaluate(
            (
                element,
                {
                    expectedElement,
                    expectedText
                }
            ) => {
                const normalizeText =
                    value => {
                        return String(
                            value ||
                            ""
                        )
                            .trim()
                            .replace(
                                /\s+/g,
                                " "
                            );
                    };

                const expectedTag =
                    String(
                        expectedElement
                            ?.tagName ||
                        ""
                    ).toLowerCase();

                const actualTag =
                    String(
                        element.localName ||
                        element.tagName ||
                        ""
                    ).toLowerCase();

                if (
                    expectedTag &&
                    expectedTag !==
                        actualTag
                ) {
                    return false;
                }

                const attributeChecks = [
                    [
                        expectedElement
                            ?.id,
                        "id"
                    ],
                    [
                        expectedElement
                            ?.name,
                        "name"
                    ],
                    [
                        expectedElement
                            ?.type,
                        "type"
                    ],
                    [
                        expectedElement
                            ?.role,
                        "role"
                    ],
                    [
                        expectedElement
                            ?.ariaLabel,
                        "aria-label"
                    ],
                    [
                        expectedElement
                            ?.placeholder,
                        "placeholder"
                    ],
                    [
                        expectedElement
                            ?.testId,
                        "data-testid"
                    ],
                    [
                        expectedElement
                            ?.dataTest,
                        "data-test"
                    ],
                    [
                        expectedElement
                            ?.dataCy,
                        "data-cy"
                    ],
                    [
                        expectedElement
                            ?.dataLabel,
                        "data-label"
                    ],
                    [
                        expectedElement
                            ?.attributes
                            ?.[
                                "data-value"
                            ],
                        "data-value"
                    ],
                    [
                        expectedElement
                            ?.href,
                        "href"
                    ],
                    [
                        expectedElement
                            ?.attributes
                            ?.contenteditable,
                        "contenteditable"
                    ],
                    [
                        expectedElement
                            ?.attributes
                            ?.[
                                "data-pc-section"
                            ],
                        "data-pc-section"
                    ],
                    [
                        expectedElement
                            ?.attributes
                            ?.[
                                "aria-posinset"
                            ],
                        "aria-posinset"
                    ]
                ];

                let strongAttributeCount =
                    0;

                for (
                    const [
                        expectedValue,
                        attributeName
                    ] of attributeChecks
                ) {
                    if (
                        expectedValue ===
                            null ||
                        expectedValue ===
                            undefined ||
                        expectedValue ===
                            ""
                    ) {
                        continue;
                    }

                    strongAttributeCount +=
                        1;

                    if (
                        element.getAttribute(
                            attributeName
                        ) !==
                        String(
                            expectedValue
                        )
                    ) {
                        return false;
                    }
                }

                /*
                 * Text is used only when there is no stronger recorded
                 * attribute.
                 */
                if (
                    strongAttributeCount ===
                    0
                ) {
                    const expected =
                        normalizeText(
                            expectedText
                        );

                    if (expected) {
                        const actual =
                            normalizeText(
                                element
                                    .textContent
                            ).slice(
                                0,
                                expected.length
                            );

                        if (
                            actual !==
                            expected
                        ) {
                            return false;
                        }
                    }
                }

                return true;
            },
            {
                expectedElement:
                    action.element ||
                    null,

                expectedText:
                    action.text ||
                    null
            }
        );
    } catch {
        return false;
    }
}

async function disposeHandles(
    handles
) {
    await Promise.allSettled(
        handles
            .filter(
                Boolean
            )
            .map(
                handle => {
                    return handle.dispose();
                }
            )
    );
}

async function waitForAtLeastOneMatch(
    locator,
    timeout
) {
    const startedAt =
        Date.now();

    const deadline =
        startedAt +
        timeout;

    let lastError =
        null;

    while (
        Date.now() <
        deadline
    ) {
        try {
            const count =
                await locator.count();

            if (count > 0) {
                return count;
            }
        } catch (error) {
            lastError =
                error;
        }

        const waitMs =
            Math.min(
                SMART_CLICK_MATCH_POLL_INTERVAL_MS,
                Math.max(
                    0,
                    deadline -
                    Date.now()
                )
            );

        if (waitMs > 0) {
            await delay(
                waitMs
            );
        }
    }

    throw new Error(
        [
            (
                `XPath did not resolve to an element within ` +
                `${timeout}ms`
            ),
            lastError
                ? (
                    `last error: ` +
                    `${formatError(lastError)}`
                )
                : ""
        ]
            .filter(
                Boolean
            )
            .join(
                "\n"
            )
    );
}

async function waitForLiveDomToSettle(
    root,
    timeout
) {
    const maxWaitMs =
        Math.max(
            SMART_CLICK_DOM_SETTLE_QUIET_MS,
            Math.min(
                SMART_CLICK_DOM_SETTLE_MAX_MS,
                timeout
            )
        );

    const documentElement =
        root.locator(
            "html"
        ).first();

    await documentElement.waitFor({
        state:
            "attached",
        timeout:
            maxWaitMs
    });

    await documentElement.evaluate(
        (
            html,
            {
                quietMs,
                maximumMs
            }
        ) => {
            return new Promise(
                resolve => {
                    const ownerDocument =
                        html.ownerDocument;

                    let settled =
                        false;

                    let quietTimer =
                        null;

                    let maximumTimer =
                        null;

                    const finish =
                        (
                            forced =
                                false
                        ) => {
                            if (settled) {
                                return;
                            }

                            if (
                                !forced &&
                                ownerDocument.readyState ===
                                    "loading"
                            ) {
                                armQuietWindow();
                                return;
                            }

                            settled =
                                true;

                            observer.disconnect();
                            ownerDocument.removeEventListener(
                                "DOMContentLoaded",
                                armQuietWindow
                            );
                            clearTimeout(
                                quietTimer
                            );
                            clearTimeout(
                                maximumTimer
                            );
                            resolve();
                        };

                    const armQuietWindow =
                        () => {
                            clearTimeout(
                                quietTimer
                            );

                            quietTimer =
                                setTimeout(
                                    finish,
                                    quietMs
                                );
                        };

                    const observer =
                        new MutationObserver(
                            armQuietWindow
                        );

                    observer.observe(
                        html,
                        {
                            attributes:
                                true,
                            childList:
                                true,
                            characterData:
                                true,
                            subtree:
                                true
                        }
                    );

                    maximumTimer =
                        setTimeout(
                            () => {
                                finish(
                                    true
                                );
                            },
                            maximumMs
                        );

                    ownerDocument.addEventListener(
                        "DOMContentLoaded",
                        armQuietWindow,
                        {
                            once:
                                true
                        }
                    );

                    armQuietWindow();
                }
            );
        },
        {
            quietMs:
                SMART_CLICK_DOM_SETTLE_QUIET_MS,
            maximumMs:
                maxWaitMs
        }
    );
}

async function recoverLiveXPathFromRecordedMetadata({
    root,
    action,
    timeout
}) {
    await waitForLiveDomToSettle(
        root,
        timeout
    );

    const expectedTag =
        String(
            action.element
                ?.tagName ||
            "*"
        ).toLowerCase();

    const candidateLocator =
        root.locator(
            expectedTag === "*"
                ? "*"
                : expectedTag
        );

    const recovered =
        await candidateLocator.evaluateAll(
            (
                allElements,
                payload
            ) => {
                const normalizeText =
                    value => {
                        return String(
                            value ||
                            ""
                        )
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim();
                    };

                const collapseRepeatedText =
                    value => {
                        const normalized =
                            normalizeText(
                                value
                            );

                        if (
                            normalized.length >= 2 &&
                            normalized.length % 2 === 0
                        ) {
                            const half =
                                normalized.length /
                                2;

                            if (
                                normalized.slice(
                                    0,
                                    half
                                ) ===
                                normalized.slice(
                                    half
                                )
                            ) {
                                return normalized.slice(
                                    0,
                                    half
                                );
                            }
                        }

                        return normalized;
                    };

                const xpathLiteral =
                    value => {
                        const text =
                            String(
                                value
                            );

                        if (!text.includes("'")) {
                            return `'${text}'`;
                        }

                        if (!text.includes('"')) {
                            return `"${text}"`;
                        }

                        return (
                            "concat(" +
                            text
                                .split("'")
                                .map(
                                    part => {
                                        return `'${part}'`;
                                    }
                                )
                                .join(
                                    `, "'", `
                                ) +
                            ")"
                        );
                    };

                const directAttributeName =
                    name => {
                        return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(
                            name
                        );
                    };

                const attributePredicate =
                    (
                        name,
                        value
                    ) => {
                        return directAttributeName(
                            name
                        )
                            ? `@${name}=${xpathLiteral(value)}`
                            : (
                                `@*[name()=${xpathLiteral(name)}` +
                                ` and .=${xpathLiteral(value)}]`
                            );
                    };

                const nodeTest =
                    element => {
                        const tag =
                            String(
                                element.localName ||
                                element.tagName ||
                                "*"
                            ).toLowerCase();

                        return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(
                            tag
                        )
                            ? tag
                            : `*[local-name()=${xpathLiteral(tag)}]`;
                    };

                const blockedAttributeName =
                    name => {
                        const lower =
                            String(
                                name ||
                                ""
                            ).toLowerCase();

                        return (
                            [
                                "class",
                                "style",
                                "value",
                                "checked",
                                "selected",
                                "aria-selected",
                                "aria-checked",
                                "aria-expanded",
                                "tabindex"
                            ].includes(
                                lower
                            ) ||
                            lower.startsWith(
                                "on"
                            ) ||
                            lower.startsWith(
                                "wire:"
                            ) ||
                            lower.startsWith(
                                "x-"
                            ) ||
                            lower.startsWith(
                                "v-"
                            ) ||
                            lower.startsWith(
                                "@"
                            ) ||
                            lower.startsWith(
                                ":"
                            )
                        );
                    };

                const usableAttribute =
                    (
                        name,
                        value
                    ) => {
                        const text =
                            String(
                                value ||
                                ""
                            ).trim();

                        return (
                            !blockedAttributeName(
                                name
                            ) &&
                            text.length > 0 &&
                            text.length <= 180 &&
                            !/^pv_id$/i.test(
                                text
                            ) &&
                            !/(?:^|[-_:])\d{7,}(?:$|[-_:])/i.test(
                                text
                            )
                        );
                    };

                const attributePriority =
                    name => {
                        const priorities = {
                            id:
                                120,
                            "data-testid":
                                115,
                            "data-test":
                                110,
                            "data-cy":
                                110,
                            name:
                                95,
                            "aria-label":
                                90,
                            placeholder:
                                80,
                            title:
                                70,
                            href:
                                65,
                            role:
                                55,
                            type:
                                45,
                            "data-pc-section":
                                40,
                            "aria-posinset":
                                35
                        };

                        return priorities[
                            String(
                                name
                            ).toLowerCase()
                        ] ||
                            24;
                    };

                const visible =
                    element => {
                        try {
                            const style =
                                element.ownerDocument
                                    .defaultView
                                    .getComputedStyle(
                                        element
                                    );

                            const rect =
                                element.getBoundingClientRect();

                            return (
                                style.display !== "none" &&
                                style.visibility !== "hidden" &&
                                Number(
                                    style.opacity ||
                                    1
                                ) !== 0 &&
                                rect.width > 0 &&
                                rect.height > 0
                            );
                        } catch (_) {
                            return false;
                        }
                    };

                const expectedAttributes = {
                    ...(
                        payload.expectedElement
                            ?.attributes ||
                        {}
                    )
                };

                for (
                    const [
                        property,
                        attributeName
                    ] of [
                        [
                            "id",
                            "id"
                        ],
                        [
                            "name",
                            "name"
                        ],
                        [
                            "type",
                            "type"
                        ],
                        [
                            "role",
                            "role"
                        ],
                        [
                            "ariaLabel",
                            "aria-label"
                        ],
                        [
                            "placeholder",
                            "placeholder"
                        ],
                        [
                            "testId",
                            "data-testid"
                        ],
                        [
                            "dataTest",
                            "data-test"
                        ],
                        [
                            "dataCy",
                            "data-cy"
                        ],
                        [
                            "dataLabel",
                            "data-label"
                        ],
                        [
                            "href",
                            "href"
                        ]
                    ]
                ) {
                    const value =
                        payload.expectedElement
                            ?.[
                                property
                            ];

                    if (
                        value !== null &&
                        value !== undefined &&
                        value !== ""
                    ) {
                        expectedAttributes[
                            attributeName
                        ] =
                            String(
                                value
                            );
                    }
                }

                const expectedEntries =
                    Object.entries(
                        expectedAttributes
                    )
                        .filter(
                            ([
                                name,
                                value
                            ]) => {
                                return usableAttribute(
                                    name,
                                    value
                                );
                            }
                        );

                const selectorTextMatches =
                    [
                        ...String(
                            payload.recordedSelector ||
                            ""
                        ).matchAll(
                            /normalize-space\(\.\)\s*=\s*(['"])(.*?)\1/g
                        )
                    ];

                const selectorText =
                    selectorTextMatches.length
                        ? selectorTextMatches[
                            selectorTextMatches.length -
                            1
                        ][
                            2
                        ]
                        : "";

                const expectedTexts =
                    [
                        normalizeText(
                            payload.expectedText
                        ),
                        collapseRepeatedText(
                            payload.expectedText
                        ),
                        normalizeText(
                            selectorText
                        ),
                        collapseRepeatedText(
                            selectorText
                        )
                    ]
                        .filter(
                            (
                                text,
                                index,
                                values
                            ) => {
                                return (
                                    text &&
                                    text.length <= 180 &&
                                    values.indexOf(
                                        text
                                    ) === index
                                );
                            }
                        );

                const gestureParts =
                    String(
                        payload.gestureId ||
                        ""
                    ).split(
                        ":"
                    );

                const point =
                    gestureParts.length >= 2
                        ? {
                            x:
                                Number(
                                    gestureParts[
                                        gestureParts.length -
                                        2
                                    ]
                                ),
                            y:
                                Number(
                                    gestureParts[
                                        gestureParts.length -
                                        1
                                    ]
                                )
                        }
                        : null;

                const pointElement =
                    point &&
                    Number.isFinite(
                        point.x
                    ) &&
                    Number.isFinite(
                        point.y
                    )
                        ? document.elementFromPoint(
                            point.x,
                            point.y
                        )
                        : null;

                const candidates =
                    allElements
                        .slice(
                            0,
                            payload.maximumCandidates
                        )
                        .filter(
                            element => {
                                return (
                                    element instanceof Element &&
                                    element.isConnected
                                );
                            }
                        )
                        .map(
                            element => {
                                let score =
                                    0;

                                let matchedAttributes =
                                    0;

                                for (
                                    const [
                                        name,
                                        expectedValue
                                    ] of expectedEntries
                                ) {
                                    const weight =
                                        attributePriority(
                                            name
                                        );

                                    const actualValue =
                                        element.getAttribute(
                                            name
                                        );

                                    if (
                                        actualValue ===
                                        String(
                                            expectedValue
                                        )
                                    ) {
                                        score +=
                                            weight;
                                        matchedAttributes +=
                                            1;
                                    } else if (
                                        [
                                            "id",
                                            "data-testid",
                                            "data-test",
                                            "data-cy",
                                            "name",
                                            "aria-label"
                                        ].includes(
                                            String(
                                                name
                                            ).toLowerCase()
                                        )
                                    ) {
                                        score -=
                                            Math.ceil(
                                                weight /
                                                2
                                            );
                                    }
                                }

                                const actualText =
                                    normalizeText(
                                        element.textContent
                                    ).slice(
                                        0,
                                        180
                                    );

                                let textMatched =
                                    false;

                                for (
                                    const expectedText of
                                    expectedTexts
                                ) {
                                    if (
                                        actualText ===
                                        expectedText
                                    ) {
                                        score +=
                                            75;
                                        textMatched =
                                            true;
                                        break;
                                    }

                                    if (
                                        expectedText.length >= 2 &&
                                        (
                                            actualText.includes(
                                                expectedText
                                            ) ||
                                            expectedText.includes(
                                                actualText
                                            )
                                        )
                                    ) {
                                        score +=
                                            30;
                                        textMatched =
                                            true;
                                        break;
                                    }
                                }

                                const isVisible =
                                    visible(
                                        element
                                    );

                                score +=
                                    isVisible
                                        ? 15
                                        : -35;

                                const hitByRecordedPoint =
                                    Boolean(
                                        pointElement &&
                                        (
                                            pointElement ===
                                                element ||
                                            element.contains(
                                                pointElement
                                            ) ||
                                            pointElement.contains(
                                                element
                                            )
                                        )
                                    );

                                if (hitByRecordedPoint) {
                                    score +=
                                        35;
                                }

                                return {
                                    element,
                                    score,
                                    matchedAttributes,
                                    textMatched,
                                    isVisible,
                                    hitByRecordedPoint
                                };
                            }
                        )
                        .filter(
                            candidate => {
                                return (
                                    candidate.matchedAttributes > 0 ||
                                    candidate.textMatched
                                );
                            }
                        )
                        .sort(
                            (
                                left,
                                right
                            ) => {
                                return (
                                    right.score -
                                        left.score ||
                                    Number(
                                        right.hitByRecordedPoint
                                    ) -
                                        Number(
                                            left.hitByRecordedPoint
                                        ) ||
                                    Number(
                                        right.isVisible
                                    ) -
                                        Number(
                                            left.isVisible
                                        )
                                );
                            }
                        );

                if (!candidates.length) {
                    return null;
                }

                const chosen =
                    candidates[
                        0
                    ];

                const runnerUp =
                    candidates[
                        1
                    ] ||
                    null;

                if (
                    chosen.score < 35 ||
                    (
                        runnerUp &&
                        chosen.score -
                            runnerUp.score < 12 &&
                        !(
                            chosen.hitByRecordedPoint &&
                            !runnerUp.hitByRecordedPoint
                        )
                    )
                ) {
                    return null;
                }

                const target =
                    chosen.element;

                const inspectXPath =
                    xpath => {
                        try {
                            const result =
                                document.evaluate(
                                    xpath,
                                    document,
                                    null,
                                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                                    null
                                );

                            let targetIndex =
                                -1;

                            for (
                                let index = 0;
                                index < result.snapshotLength;
                                index += 1
                            ) {
                                if (
                                    result.snapshotItem(
                                        index
                                    ) ===
                                    target
                                ) {
                                    targetIndex =
                                        index;
                                    break;
                                }
                            }

                            return {
                                count:
                                    result.snapshotLength,
                                targetIndex
                            };
                        } catch (_) {
                            return {
                                count:
                                    0,
                                targetIndex:
                                    -1
                            };
                        }
                    };

                const liveAttributes =
                    element => {
                        return Array.from(
                            element.attributes ||
                            []
                        )
                            .map(
                                attribute => {
                                    return {
                                        name:
                                            attribute.name,
                                        value:
                                            attribute.value,
                                        priority:
                                            attributePriority(
                                                attribute.name
                                            )
                                    };
                                }
                            )
                            .filter(
                                attribute => {
                                    return usableAttribute(
                                        attribute.name,
                                        attribute.value
                                    );
                                }
                            )
                            .sort(
                                (
                                    left,
                                    right
                                ) => {
                                    return (
                                        right.priority -
                                            left.priority ||
                                        left.name.localeCompare(
                                            right.name
                                        )
                                    );
                                }
                            )
                            .slice(
                                0,
                                payload.maximumAttributes
                            );
                    };

                const nodeVariants =
                    (
                        element,
                        allowText
                    ) => {
                        const tag =
                            nodeTest(
                                element
                            );

                        const attributes =
                            liveAttributes(
                                element
                            );

                        const variants =
                            [];

                        const seen =
                            new Set();

                        const push =
                            predicates => {
                                const variant =
                                    predicates.length
                                        ? `${tag}[${predicates.join(" and ")}]`
                                        : tag;

                                if (!seen.has(variant)) {
                                    seen.add(
                                        variant
                                    );
                                    variants.push(
                                        variant
                                    );
                                }
                            };

                        for (
                            const attribute of
                            attributes
                        ) {
                            push([
                                attributePredicate(
                                    attribute.name,
                                    attribute.value
                                )
                            ]);
                        }

                        for (
                            let left = 0;
                            left < attributes.length;
                            left += 1
                        ) {
                            for (
                                let right = left + 1;
                                right < attributes.length;
                                right += 1
                            ) {
                                push([
                                    attributePredicate(
                                        attributes[
                                            left
                                        ].name,
                                        attributes[
                                            left
                                        ].value
                                    ),
                                    attributePredicate(
                                        attributes[
                                            right
                                        ].name,
                                        attributes[
                                            right
                                        ].value
                                    )
                                ]);

                                for (
                                    let third = right + 1;
                                    third < attributes.length;
                                    third += 1
                                ) {
                                    push([
                                        attributePredicate(
                                            attributes[
                                                left
                                            ].name,
                                            attributes[
                                                left
                                            ].value
                                        ),
                                        attributePredicate(
                                            attributes[
                                                right
                                            ].name,
                                            attributes[
                                                right
                                            ].value
                                        ),
                                        attributePredicate(
                                            attributes[
                                                third
                                            ].name,
                                            attributes[
                                                third
                                            ].value
                                        )
                                    ]);
                                }
                            }
                        }

                        const text =
                            normalizeText(
                                element.textContent
                            );

                        if (
                            allowText &&
                            text &&
                            text.length <= 100
                        ) {
                            const textPredicate =
                                `normalize-space(.)=${xpathLiteral(text)}`;

                            push([
                                textPredicate
                            ]);

                            for (
                                const attribute of
                                attributes.slice(
                                    0,
                                    6
                                )
                            ) {
                                push([
                                    attributePredicate(
                                        attribute.name,
                                        attribute.value
                                    ),
                                    textPredicate
                                ]);
                            }
                        }

                        return variants;
                    };

                const indexedFallbacks =
                    [];

                let generatedXPathCount =
                    0;

                const forbiddenFillTokens =
                    new Set(
                        Array.isArray(
                            payload.forbiddenFillTokens
                        )
                            ? payload.forbiddenFillTokens
                            : []
                    );

                const xpathUsesForbiddenFillText =
                    xpath => {
                        if (
                            !forbiddenFillTokens.size
                        ) {
                            return false;
                        }

                        const normalizedTextCall =
                            String.raw`normalize-space\s*\(\s*(?:\.|text\s*\(\s*\)|string\s*\(\s*\.\s*\))?\s*\)`;

                        const xpathStringLiteral =
                            String.raw`(?:'[^']*'|"[^"]*"|concat\((?:[^()]|'[^']*'|"[^"]*")*\))`;

                        const expressionPatterns =
                            [
                                String.raw`${normalizedTextCall}\s*!?=\s*${xpathStringLiteral}`,
                                String.raw`${xpathStringLiteral}\s*!?=\s*${normalizedTextCall}`,
                                String.raw`(?:contains|starts-with)\s*\(\s*${normalizedTextCall}\s*,\s*${xpathStringLiteral}\s*\)`,
                            ];

                        const literalPattern =
                            /'([^']*)'|"([^"]*)"/g;

                        for (
                            const source of
                            expressionPatterns
                        ) {
                            for (
                                const expressionMatch of
                                String(xpath).matchAll(
                                    new RegExp(
                                        source,
                                        "gi"
                                    )
                                )
                            ) {
                                let literalMatch =
                                    null;

                                while (
                                    (
                                        literalMatch =
                                            literalPattern.exec(
                                                expressionMatch[0]
                                            )
                                    ) !== null
                                ) {
                                    const literalTokens =
                                        normalizeText(
                                            literalMatch[1] ??
                                            literalMatch[2] ??
                                            ""
                                        )
                                            .toLowerCase()
                                            .match(
                                                /[\p{L}]+|[\p{N}]+/gu
                                            ) ||
                                        [];

                                    if (
                                        literalTokens.some(
                                            token =>
                                                forbiddenFillTokens.has(
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
                        }

                        return false;
                    };

                const trySemanticXPath =
                    xpath => {
                        if (
                            !xpath ||
                            xpath.length > 720 ||
                            generatedXPathCount >=
                            payload.maximumGenerated ||
                            xpathUsesForbiddenFillText(
                                xpath
                            )
                        ) {
                            return "";
                        }

                        generatedXPathCount +=
                            1;

                        const inspected =
                            inspectXPath(
                                xpath
                            );

                        if (
                            inspected.count === 1 &&
                            inspected.targetIndex === 0
                        ) {
                            return xpath;
                        }

                        if (
                            inspected.count >= 2 &&
                            inspected.count <= 3 &&
                            inspected.targetIndex >= 0 &&
                            inspected.targetIndex < 3
                        ) {
                            indexedFallbacks.push({
                                xpath,
                                count:
                                    inspected.count,
                                index:
                                    inspected.targetIndex +
                                    1
                            });
                        }

                        return "";
                    };

                const targetVariants =
                    nodeVariants(
                        target,
                        true
                    );

                for (
                    const variant of
                    targetVariants
                ) {
                    const xpath =
                        trySemanticXPath(
                            `//${variant}`
                        );

                    if (xpath) {
                        return {
                            xpath,
                            resolution:
                                "live-dom-semantic",
                            score:
                                chosen.score,
                            candidates:
                                candidates.length,
                            indexed:
                                false
                        };
                    }
                }

                let ancestor =
                    target.parentElement;

                for (
                    let depth = 1;
                    ancestor &&
                    depth <= 5;
                    depth += 1,
                    ancestor = ancestor.parentElement
                ) {
                    const anchorVariants =
                        nodeVariants(
                            ancestor,
                            false
                        ).slice(
                            0,
                            36
                        );

                    for (
                        const anchorVariant of
                        anchorVariants
                    ) {
                        for (
                            const targetVariant of
                            targetVariants.slice(
                                0,
                                36
                            )
                        ) {
                            const xpath =
                                trySemanticXPath(
                                    `//${anchorVariant}//${targetVariant}`
                                );

                            if (xpath) {
                                return {
                                    xpath,
                                    resolution:
                                        "live-dom-contextual",
                                    score:
                                        chosen.score,
                                    candidates:
                                        candidates.length,
                                    indexed:
                                        false
                                };
                            }
                        }
                    }
                }

                indexedFallbacks.sort(
                    (
                        left,
                        right
                    ) => {
                        return (
                            left.count -
                                right.count ||
                            left.xpath.length -
                                right.xpath.length
                        );
                    }
                );

                for (
                    const fallback of
                    indexedFallbacks
                ) {
                    const indexedXPath =
                        `(${fallback.xpath})[${fallback.index}]`;

                    const inspected =
                        inspectXPath(
                            indexedXPath
                        );

                    if (
                        inspected.count === 1 &&
                        inspected.targetIndex === 0
                    ) {
                        return {
                            xpath:
                                indexedXPath,
                            resolution:
                                "live-dom-indexed-last-resort",
                            score:
                                chosen.score,
                            candidates:
                                candidates.length,
                            indexed:
                                true
                        };
                    }
                }

                return null;
            },
            {
                expectedElement:
                    action.element ||
                    null,
                expectedText:
                    action.text ||
                    null,
                recordedSelector:
                    action.selector ||
                    "",
                gestureId:
                    action.gestureId ||
                    action.clickId ||
                    "",
                maximumCandidates:
                    SMART_CLICK_LIVE_RECOVERY_MAX_CANDIDATES,
                maximumAttributes:
                    SMART_CLICK_LIVE_RECOVERY_MAX_ATTRIBUTES,
                maximumGenerated:
                    SMART_CLICK_LIVE_RECOVERY_MAX_GENERATED,
                forbiddenFillTokens:
                    (
                        action?.action ===
                            "input" ||
                        action?.action ===
                            "fill"
                    ) &&
                    !hasIndependentFillTextProvenance(
                        action
                    )
                        ? getFillXPathIdentityTokens(
                            action?.value
                        )
                        : []
            }
        );

    if (
        !recovered
            ?.xpath
    ) {
        return null;
    }

    const recoveredSelector =
        `xpath=${recovered.xpath}`;

    if (
        (
            action?.action ===
                "input" ||
            action?.action ===
                "fill"
        ) &&
        !hasIndependentFillTextProvenance(
            action
        ) &&
        fillXPathTextDependsOnEnteredValue(
            recoveredSelector,
            action?.value
        )
    ) {
        return null;
    }

    return {
        selector:
            recoveredSelector,
        resolution:
            recovered.resolution,
        score:
            recovered.score,
        candidates:
            recovered.candidates,
        indexed:
            recovered.indexed === true
    };
}

async function getCandidateHandle(
    locator,
    timeout
) {
    const handle =
        await locator.elementHandle({
            timeout
        });

    if (!handle) {
        throw new Error(
            "No ElementHandle was available"
        );
    }

    return handle;
}

async function resolveConnectedEditableHandle(
    handle
) {
    if (!handle) {
        return null;
    }

    let editableHandle =
        null;

    try {
        editableHandle =
            await handle.evaluateHandle(
            element => {
                if (
                    !element
                        ?.isConnected
                ) {
                    return null;
                }

                const tagName =
                    String(
                        element.localName ||
                        element.tagName ||
                        ""
                    ).toLowerCase();

                if (
                    tagName ===
                        "input" ||
                    tagName ===
                        "textarea"
                ) {
                    return element;
                }

                if (
                    element.isContentEditable !==
                        true
                ) {
                    return null;
                }

                let current =
                    element;

                while (current) {
                    const contentEditable =
                        current.getAttribute
                            ?.(
                                "contenteditable"
                            );

                    if (
                        contentEditable !==
                            null &&
                        String(
                            contentEditable
                        ).toLowerCase() !==
                            "false"
                    ) {
                        return current;
                    }

                    current =
                        current.parentElement;
                }

                return element;
            }
        );

        const editableElement =
            editableHandle.asElement();

        if (!editableElement) {
            await editableHandle
                .dispose();
            return null;
        }

        return editableElement;
    } catch {
        await editableHandle
            ?.dispose()
            .catch(
                () => {}
            );
        return null;
    }
}

async function isConnectedEditableHandle(
    handle
) {
    const editableHandle =
        await resolveConnectedEditableHandle(
            handle
        );

    if (!editableHandle) {
        return false;
    }

    await editableHandle
        .dispose()
        .catch(
            () => {}
        );

    return true;
}

function createInputResolutionAction(
    inputAction,
    linkedClickAction
) {
    return {
        ...inputAction,
        element:
            inputAction
                ?.elementBeforeInput ||
            linkedClickAction
                ?.element ||
            inputAction
                ?.element ||
            inputAction
                ?.elementAfterInput ||
            null,
        text:
            linkedClickAction
                ?.text ||
            null
    };
}

/*
 * Resolves one recorded XPath action. The recorded XPath always runs first.
 * If it stays absent, one bounded live-DOM recovery pass may replace it for
 * this attempt; the trace and test file are never rewritten.
 *
 * Unique match:
 *
 * - The XPath must resolve to one element whose recorded metadata agrees.
 * - A unique-but-wrong element triggers the same live-DOM recovery as a
 *   missing XPath.
 * - A unique-but-hidden element also triggers live-DOM recovery. Responsive
 *   layouts commonly keep a hidden desktop/mobile copy in the DOM, and an
 *   XPath can remain unique while pointing at the inactive copy.
 * - A real click does not receive a preliminary trial click.
 * - A trial is performed only when options.trial=true.
 *
 * Duplicate matches:
 *
 * - The selected XPath (recorded or live-recovered) is not altered merely to
 *   choose among duplicate nodes.
 * - Candidates are filtered using recorded metadata.
 * - force=true uses visibility to disambiguate.
 * - Normal clicks use Playwright trial clicks to find the one actionable
 *   candidate.
 */
async function resolveExactRecordedSelector({
    root,
    action,
    options,
    timeout
}) {
    const recordedSelector =
        normalizeSelector(
            action.selector
        );

    if (!recordedSelector) {
        throw new Error(
            "Recorded action contains no selector"
        );
    }

    if (
        !isXPathSelector(
            recordedSelector
        )
    ) {
        throw new Error(
            (
                "Recorded action selector is not XPath: " +
                `${recordedSelector}`
            )
        );
    }

    let selector =
        recordedSelector;

    const recordedFillSelectorUsesEnteredValue =
        (
            action?.action ===
                "input" ||
            action?.action ===
                "fill"
        ) &&
        !hasIndependentFillTextProvenance(
            action
        ) &&
        fillXPathTextDependsOnEnteredValue(
            recordedSelector,
            action?.value
        );

    let locator =
        root.locator(
            selector
        );

    let count =
        0;

    let liveRecovery =
        null;

    const cachedRecovery =
        SMART_CLICK_LIVE_RECOVERY_CACHE.get(
            action
        );

    if (
        cachedRecovery &&
        Date.now() -
            cachedRecovery.createdAt <=
            SMART_CLICK_LIVE_RECOVERY_CACHE_MS
    ) {
        selector =
            cachedRecovery.selector;

        locator =
            root.locator(
                selector
            );

        try {
            count =
                await waitForAtLeastOneMatch(
                    locator,
                    Math.min(
                        timeout,
                        750
                    )
                );

            liveRecovery = {
                ...cachedRecovery,
                resolution:
                    `${cachedRecovery.resolution}-cached`
            };
        } catch (_) {
            SMART_CLICK_LIVE_RECOVERY_CACHE.delete(
                action
            );

            selector =
                recordedSelector;

            locator =
                root.locator(
                    selector
                );
        }
    } else if (cachedRecovery) {
        SMART_CLICK_LIVE_RECOVERY_CACHE.delete(
            action
        );
    }

    if (count === 0) {
        try {
            if (
                recordedFillSelectorUsesEnteredValue
            ) {
                throw new Error(
                    "Recorded fill XPath depends on the value being entered"
                );
            }

            count =
                await waitForAtLeastOneMatch(
                    locator,
                    timeout
                );
        } catch (recordedSelectorError) {
            try {
                liveRecovery =
                    await recoverLiveXPathFromRecordedMetadata({
                        root,
                        action:
                            recordedFillSelectorUsesEnteredValue
                                ? {
                                    ...action,
                                    selector:
                                        ""
                                }
                                : action,
                        timeout
                    });
            } catch (recoveryError) {
                safeWarn(
                    (
                        "[smart-action] Live DOM recovery error contained. " +
                        `recordedSelector=${recordedSelector} ` +
                        `reason=${formatError(recoveryError)}`
                    )
                );
            }

            if (!liveRecovery) {
                throw recordedSelectorError;
            }

            selector =
                liveRecovery.selector;

            locator =
                root.locator(
                    selector
                );

            count =
                await waitForAtLeastOneMatch(
                    locator,
                    timeout
                );

            if (!liveRecovery.indexed) {
                SMART_CLICK_LIVE_RECOVERY_CACHE.set(
                    action,
                    {
                        ...liveRecovery,
                        createdAt:
                            Date.now()
                    }
                );
            }

            safeWarn(
                (
                    "[smart-action] Recorded XPath stayed absent; " +
                    "using a unique XPath rebuilt from the settled live DOM. " +
                    `recordedSelector=${recordedSelector} ` +
                    `recoveredSelector=${selector} ` +
                    `resolution=${liveRecovery.resolution} ` +
                    `indexed=${liveRecovery.indexed}`
                )
            );
        }
    }

    if (
        count === 1 &&
        !liveRecovery
    ) {
        const probeLocator =
            locator.first();

        const probeHandle =
            await getCandidateHandle(
                probeLocator,
                timeout
            );

        const probeMetadataMatched =
            await matchesRecordedMetadata(
                probeHandle,
                action
            );

        await probeHandle
            .dispose()
            .catch(
                () => {}
            );

        if (!probeMetadataMatched) {
            const uniqueMismatchError =
                new Error(
                    "Recorded XPath resolved uniquely, but to an element that does not match the recorded target metadata"
                );

            liveRecovery =
                await recoverLiveXPathFromRecordedMetadata({
                    root,
                    action,
                    timeout
                }).catch(
                    recoveryError => {
                        safeWarn(
                            (
                                "[smart-action] Unique XPath metadata mismatch recovery error contained. " +
                                `recordedSelector=${recordedSelector} ` +
                                `reason=${formatError(recoveryError)}`
                            )
                        );

                        return null;
                    }
                );

            if (!liveRecovery) {
                throw uniqueMismatchError;
            }

            selector =
                liveRecovery.selector;

            locator =
                root.locator(
                    selector
                );

            count =
                await waitForAtLeastOneMatch(
                    locator,
                    timeout
                );

            if (!liveRecovery.indexed) {
                SMART_CLICK_LIVE_RECOVERY_CACHE.set(
                    action,
                    {
                        ...liveRecovery,
                        createdAt:
                            Date.now()
                    }
                );
            }

            safeWarn(
                (
                    "[smart-action] Recorded XPath resolved to the wrong unique element; " +
                    "using a locator rebuilt from recorded metadata and the live DOM. " +
                    `recordedSelector=${recordedSelector} ` +
                    `recoveredSelector=${selector} ` +
                    `resolution=${liveRecovery.resolution}`
                )
            );
        }
    }

    /*
     * Existence and metadata agreement are insufficient for responsive UIs.
     * A sidebar can retain one matching link inside a collapsed/hidden menu
     * while rendering the active copy elsewhere. In that state Playwright
     * would spend the entire click timeout waiting on the known-hidden node.
     * Rebuild from the recorded metadata so visibility and the recorded click
     * point can select the active live copy before actionability is attempted.
     */
    if (
        count === 1 &&
        !await locator
            .first()
            .isVisible()
            .catch(
                () => false
            )
    ) {
        const hiddenUniqueRecovery =
            await recoverLiveXPathFromRecordedMetadata({
                root,
                action,
                timeout
            }).catch(
                recoveryError => {
                    safeWarn(
                        (
                            "[smart-action] Hidden unique XPath recovery error contained. " +
                            `recordedSelector=${recordedSelector} ` +
                            `reason=${formatError(recoveryError)}`
                        )
                    );

                    return null;
                }
            );

        if (hiddenUniqueRecovery) {
            const recoveredLocator =
                root.locator(
                    hiddenUniqueRecovery.selector
                );

            const recoveredCount =
                await waitForAtLeastOneMatch(
                    recoveredLocator,
                    timeout
                ).catch(
                    () => 0
                );

            const recoveredIsVisible =
                recoveredCount === 1 &&
                await recoveredLocator
                    .first()
                    .isVisible()
                    .catch(
                        () => false
                    );

            let recoveredMetadataMatched =
                false;

            if (recoveredIsVisible) {
                const recoveredHandle =
                    await getCandidateHandle(
                        recoveredLocator.first(),
                        timeout
                    ).catch(
                        () => null
                    );

                if (recoveredHandle) {
                    recoveredMetadataMatched =
                        await matchesRecordedMetadata(
                            recoveredHandle,
                            action
                        ).catch(
                            () => false
                        );

                    await recoveredHandle
                        .dispose()
                        .catch(
                            () => {}
                        );
                }
            }

            if (
                recoveredIsVisible &&
                recoveredMetadataMatched
            ) {
                liveRecovery = {
                    ...hiddenUniqueRecovery,
                    resolution:
                        `${hiddenUniqueRecovery.resolution}-hidden-unique`
                };

                selector =
                    hiddenUniqueRecovery.selector;

                locator =
                    recoveredLocator;

                count =
                    recoveredCount;

                if (!hiddenUniqueRecovery.indexed) {
                    SMART_CLICK_LIVE_RECOVERY_CACHE.set(
                        action,
                        {
                            ...liveRecovery,
                            createdAt:
                                Date.now()
                        }
                    );
                }

                safeWarn(
                    (
                        "[smart-action] Recorded XPath resolved uniquely but was hidden; " +
                        "using the visible live-DOM match. " +
                        `recordedSelector=${recordedSelector} ` +
                        `recoveredSelector=${selector} ` +
                        `resolution=${liveRecovery.resolution}`
                    )
                );
            }
        }
    }

    const startedAt =
        Date.now();

    const deadline =
        startedAt +
        timeout;

    /*
     * A unique XPath needs no separate actionability trial before a real
     * click. The real click receives the complete timeout and lets Playwright
     * wait for enabled, visible, stable, in-viewport and receives-events
     * conditions.
     */
    if (count === 1) {
        const uniqueLocator =
            locator.first();

        const handle =
            await getCandidateHandle(
                uniqueLocator,
                timeout
            );

        const metadataMatched =
            await matchesRecordedMetadata(
                handle,
                action
            );

        try {
            /*
             * smart-test.js uses trial=true during staged readiness probing.
             * Element appearance, handle acquisition and actionability each
             * receive a fresh bounded timeout. A late-rendered element must
             * never inherit a 1ms remainder from the appearance wait.
             */
            if (
                options.trial ===
                    true &&
                options.force !==
                    true
            ) {
                await uniqueLocator.click({
                    ...options,

                    trial:
                        true,

                    timeout:
                        timeout
                });
            }

            return {
                selector,
                locator:
                    uniqueLocator,
                handle,
                matchedCount:
                    count,
                matchedIndex:
                    0,
                metadataMatched,
                resolution:
                    liveRecovery
                        ?.resolution ||
                    "unique"
            };
        } catch (error) {
            await handle
                .dispose()
                .catch(
                    () => {}
                );

            throw error;
        }
    }

    const acceptedCandidates =
        [];

    const failures =
        [];

    for (
        let index = 0;
        index < count;
        index += 1
    ) {
        const remainingMs =
            deadline -
            Date.now();

        if (remainingMs <= 0) {
            failures.push(
                (
                    `candidate ${index + 1}: ` +
                    "attempt timeout exhausted"
                )
            );

            break;
        }

        const remainingCandidates =
            Math.max(
                1,
                count -
                index
            );

        const candidateTimeout =
            Math.max(
                1,
                Math.floor(
                    remainingMs /
                    remainingCandidates
                )
            );

        const candidateLocator =
            locator.nth(
                index
            );

        let handle =
            null;

        try {
            handle =
                await getCandidateHandle(
                    candidateLocator,
                    candidateTimeout
                );

            const metadataMatched =
                await matchesRecordedMetadata(
                    handle,
                    action
                );

            if (!metadataMatched) {
                throw new Error(
                    (
                        "recorded metadata " +
                        "did not match"
                    )
                );
            }

            if (
                options.force ===
                true
            ) {
                const visible =
                    await candidateLocator
                        .isVisible()
                        .catch(
                            () => false
                        );

                if (!visible) {
                    throw new Error(
                        "element was not visible"
                    );
                }
            } else {
                /*
                 * Duplicate matches require actionability testing so hidden,
                 * disabled, covered or inactive duplicate widgets are not
                 * selected.
                 */
                await candidateLocator.click({
                    ...options,

                    trial:
                        true,

                    timeout:
                        candidateTimeout
                });
            }

            acceptedCandidates.push({
                index,
                locator:
                    candidateLocator,
                handle,
                metadataMatched
            });

            handle =
                null;
        } catch (error) {
            failures.push(
                (
                    `candidate ${index + 1}: ` +
                    `${formatError(error)}`
                )
            );
        } finally {
            if (handle) {
                await handle
                    .dispose()
                    .catch(
                        () => {}
                    );
            }
        }
    }

    if (
        acceptedCandidates.length !==
        1
    ) {
        await disposeHandles(
            acceptedCandidates.map(
                candidate => {
                    return candidate.handle;
                }
            )
        );

        throw new Error(
            [
                (
                    `XPath resolved to ${count} elements, but ` +
                    `${acceptedCandidates.length} candidates were ` +
                    "uniquely metadata-matching and actionable."
                ),
                ...failures.map(
                    failure => {
                        return `- ${failure}`;
                    }
                )
            ].join(
                "\n"
            )
        );
    }

    const [
        accepted
    ] =
        acceptedCandidates;

    return {
        selector,
        locator:
            accepted.locator,
        handle:
            accepted.handle,
        matchedCount:
            count,
        matchedIndex:
            accepted.index,
        metadataMatched:
            accepted.metadataMatched,
        resolution:
            liveRecovery
                ? `${liveRecovery.resolution}-duplicate-disambiguation`
                : "duplicate-disambiguation"
    };
}

class SmartClickController {
    constructor(
        page,
        traceActions,
        runtimeContext = {}
    ) {
        this.page =
            page;

        this.traceActions =
            Array.isArray(
                traceActions
            )
                ? traceActions
                : [];

        /*
         * Retained for call-site compatibility. This implementation never
         * rewrites the spec file or actions JSON.
         */
        this.testFilePath =
            runtimeContext
                .testFilePath ||
            "";

        this.actionsPath =
            runtimeContext
                .actionsPath ||
            "";

        this.allowOrderedPositionFallback =
            runtimeContext
                .alignedTrace ===
            true;

        this.actionEntries =
            this.traceActions
                .map(
                    (
                        action,
                        traceActionIndex
                    ) => {
                        return {
                            action,
                            traceActionIndex
                        };
                    }
                )
                .filter(
                    entry => {
                        return (
                            [
                                "click",
                                "input"
                            ].includes(
                                entry.action
                                    ?.action
                            ) &&
                            isXPathSelector(
                                entry.action
                                    ?.selector
                            )
                        );
                    }
                );

        this.actionStates =
            this.actionEntries.map(
                () => {
                    return "unused";
                }
            );

        this.lastCompletedTraceActionIndex =
            -1;

        this.resolvedClickTargets =
            [];
    }

    reserveMatchingAction(
        actionType,
        selectorHint
    ) {
        const hint =
            normalizeSelector(
                selectorHint
            );

        /*
         * smart-test.js supplies an already aligned action ledger. Prefer an
         * exact XPath match when available, but permit a missing/non-XPath
         * hint (for example a validated Codegen getByRole locator) to reserve
         * the next ordered action from that ledger.
         */

        const nextOrderedIndex =
            this.actionEntries.findIndex(
                (
                    entry,
                    candidateIndex
                ) => {
                    return (
                        this.actionStates[
                            candidateIndex
                        ] ===
                            "unused" &&
                        entry.action
                            ?.action ===
                            actionType &&
                        entry.traceActionIndex >
                            this.lastCompletedTraceActionIndex
                    );
                }
            );

        const nextOrderedEntry =
            nextOrderedIndex >= 0
                ? this.actionEntries[
                    nextOrderedIndex
                ]
                : null;

        const exactNextSelector =
            !!nextOrderedEntry &&
            !!hint &&
            isXPathSelector(
                hint
            ) &&
            normalizeSelector(
                nextOrderedEntry.action
                    ?.selector
            ) ===
                hint;

        const orderedMatch =
            nextOrderedEntry &&
            (
                exactNextSelector ||
                this.allowOrderedPositionFallback
            )
                ? {
                    entry:
                        nextOrderedEntry,
                    candidateIndex:
                        nextOrderedIndex,
                    matchedBy:
                        exactNextSelector
                            ? "ordered-exact-selector"
                            : "ordered-trace-position"
                }
                : null;

        const index =
            orderedMatch
                ?.candidateIndex ??
            -1;

        if (index < 0) {
            return null;
        }

        this.actionStates[
            index
        ] =
            "reserved";

        return {
            index,

            action:
                this.actionEntries[
                    index
                ].action,

            traceActionIndex:
                this.actionEntries[
                    index
                ].traceActionIndex,

            matchedBy:
                orderedMatch.matchedBy ||
                "ordered-exact-selector"
        };
    }

    completeAction(
        index
    ) {
        this.actionStates[
            index
        ] =
            "used";

        this.lastCompletedTraceActionIndex =
            Math.max(
                this.lastCompletedTraceActionIndex,
                this.actionEntries[
                    index
                ]
                    ?.traceActionIndex ??
                    -1
            );
    }

    releaseAction(
        index
    ) {
        if (
            this.actionStates[
                index
            ] ===
            "reserved"
        ) {
            this.actionStates[
                index
            ] =
                "unused";
        }
    }

    findLinkedClickEntry(
        inputAction,
        inputTraceActionIndex
    ) {
        const sourceGestureId =
            String(
                inputAction
                    ?.sourceGestureId ||
                ""
            );

        if (sourceGestureId) {
            const explicit =
                this.traceActions
                    .map(
                        (
                            action,
                            traceActionIndex
                        ) => {
                            return {
                                action,
                                traceActionIndex
                            };
                        }
                    )
                    .find(
                        entry => {
                            return (
                                entry.action
                                    ?.action ===
                                    "click" &&
                                String(
                                    entry.action
                                        ?.gestureId ||
                                    entry.action
                                        ?.clickId ||
                                    ""
                                ) ===
                                    sourceGestureId
                            );
                        }
                    );

            if (explicit) {
                return explicit;
            }
        }

        const selector =
            normalizeSelector(
                inputAction
                    ?.sourceClickSelector ||
                inputAction
                    ?.selector
            );

        let nearestClick =
            null;

        for (
            let traceActionIndex =
                inputTraceActionIndex -
                1;
            traceActionIndex >= 0;
            traceActionIndex -= 1
        ) {
            const action =
                this.traceActions[
                    traceActionIndex
                ];

            if (
                action?.action ===
                    "navigation" ||
                action?.action ===
                    "input" ||
                action?.action ===
                    "select"
            ) {
                break;
            }

            if (
                action?.action ===
                    "click"
            ) {
                const entry = {
                    action,
                    traceActionIndex
                };

                if (!nearestClick) {
                    nearestClick =
                        entry;
                }

                if (
                    normalizeSelector(
                        action.selector
                    ) ===
                        selector
                ) {
                    return entry;
                }
            }
        }

        // Older traces do not carry sourceGestureId/sourceClickSelector on
        // inputs. In that format, the closest preceding click is the only
        // reliable record of which duplicate editor the user activated.
        return nearestClick;
    }

    rememberResolvedClickTarget({
        action,
        traceActionIndex,
        candidate
    }) {
        if (
            !candidate
                ?.handle
        ) {
            return false;
        }

        this.resolvedClickTargets.push({
            action,
            traceActionIndex,
            gestureId:
                String(
                    action
                        ?.gestureId ||
                    action
                        ?.clickId ||
                    ""
                ),
            selector:
                normalizeSelector(
                    action
                        ?.selector
                ),
            handle:
                candidate.handle,
            matchedCount:
                candidate.matchedCount,
            matchedIndex:
                candidate.matchedIndex,
            metadataMatched:
                candidate.metadataMatched,
            resolution:
                candidate.resolution
        });

        while (
            this.resolvedClickTargets.length >
            32
        ) {
            const expired =
                this.resolvedClickTargets.shift();

            expired
                ?.handle
                ?.dispose()
                .catch(
                    () => {}
                );
        }

        return true;
    }

    findResolvedClickTarget(
        inputAction,
        inputTraceActionIndex
    ) {
        const linkedClick =
            this.findLinkedClickEntry(
                inputAction,
                inputTraceActionIndex
            );

        if (!linkedClick) {
            return {
                linkedClick:
                    null,
                affinity:
                    null
            };
        }

        const gestureId =
            String(
                linkedClick.action
                    ?.gestureId ||
                linkedClick.action
                    ?.clickId ||
                ""
            );

        const selector =
            normalizeSelector(
                linkedClick.action
                    ?.selector
            );

        let affinity =
            null;

        for (
            let index =
                this.resolvedClickTargets.length -
                1;
            index >= 0;
            index -= 1
        ) {
            const candidate =
                this.resolvedClickTargets[
                    index
                ];

            if (
                gestureId
                    ? candidate.gestureId ===
                        gestureId
                    : (
                        candidate.selector ===
                            selector &&
                        candidate.traceActionIndex <=
                            inputTraceActionIndex
                    )
            ) {
                affinity =
                    candidate;
                break;
            }
        }

        return {
            linkedClick,
            affinity
        };
    }

    removeResolvedClickTarget(
        affinity,
        dispose = true
    ) {
        if (!affinity) {
            return;
        }

        const index =
            this.resolvedClickTargets
                .indexOf(
                    affinity
                );

        if (index >= 0) {
            this.resolvedClickTargets
                .splice(
                    index,
                    1
                );
        }

        if (dispose) {
            affinity.handle
                ?.dispose()
                .catch(
                    () => {}
                );
        }
    }

    async click(
        requestedLocator,
        selectorHint,
        options = {}
    ) {
        const bypassTraceReservation =
            options?.[
                SMART_CLICK_BYPASS
            ] ===
            true;

        const clickOptions =
            removeSmartClickInternalOptions(
                options
            );

        if (bypassTraceReservation) {
            return requestedLocator.click(
                clickOptions
            );
        }

        const reserved =
            this.reserveMatchingAction(
                "click",
                selectorHint
            );

        /*
         * No exact recorded action matches this locator. Preserve ordinary
         * Playwright behavior.
         */
        if (!reserved) {
            return requestedLocator.click(
                clickOptions
            );
        }

        const {
            action,
            index:
                actionIndex,
            traceActionIndex,
            matchedBy
        } =
            reserved;

        const timeout =
            getAttemptTimeoutMs(
                clickOptions
            );

        const root =
            getTraceRoot(
                this.page,
                action
            );

        let chosenHandle =
            null;

        let requestedHandle =
            null;

        let completed =
            false;

        try {
            const candidate =
                await resolveExactRecordedSelector({
                    root,
                    action,
                    options:
                        clickOptions,
                    timeout
                });

            chosenHandle =
                candidate.handle;

            requestedHandle =
                await resolveRequestedElement(
                    requestedLocator,
                    Math.min(
                        timeout,
                        1000
                    )
                );

            const requestedRelationship =
                requestedHandle
                    ? await clickTargetRelationship(
                        requestedHandle,
                        chosenHandle
                    )
                    : "requested-locator-unavailable";

            const requestedAgreed =
                [
                    "same-element",
                    "same-interactive-control"
                ].includes(
                    requestedRelationship
                );

            /*
             * smart-test.js uses trial clicks to determine readiness. A trial
             * never consumes the recorded action.
             */
            if (
                clickOptions.trial ===
                    true
            ) {
                safeLog(
                    (
                        `[smart-click] trial=true ` +
                        `matchedBy=${matchedBy} ` +
                        `strategy=exact_xpath ` +
                        `resolution=${candidate.resolution} ` +
                        `timeoutMs=${timeout} ` +
                        `matchedCount=${candidate.matchedCount} ` +
                         `matchedIndex=${candidate.matchedIndex} ` +
                         `metadataMatched=${candidate.metadataMatched} ` +
                         `requestedAgreed=${requestedAgreed} ` +
                         `requestedRelationship=${requestedRelationship} ` +
                         `selector=${candidate.selector}`
                    )
                );

                return;
            }

            /*
             * Exactly one real application click is dispatched.
             *
             * For a unique XPath there was no preliminary trial in this call.
             * The real click receives the complete timeout and lets Playwright
             * wait for all actionability conditions.
             *
             * For duplicate XPath matches, the trial was required only to
             * determine which matching node was actionable.
             */
            await candidate
                .locator
                .click({
                    ...clickOptions,

                    trial:
                        false,

                    timeout
                });

            completed =
                true;

            try {
                this.completeAction(
                    actionIndex
                );
            } catch (bookkeepingError) {
                safeWarn(
                    `[smart-click] Completion bookkeeping error contained after the real click succeeded: ${formatError(bookkeepingError)}`
                );
            }

            try {
                if (
                    this.rememberResolvedClickTarget({
                        action,
                        traceActionIndex,
                        candidate
                    })
                ) {
                    chosenHandle =
                        null;
                }
            } catch (bookkeepingError) {
                safeWarn(
                    `[smart-click] Resolved-target bookkeeping error contained after the real click succeeded: ${formatError(bookkeepingError)}`
                );
            }

            safeLog(
                (
                    `[smart-click] ` +
                    `matchedBy=${matchedBy} ` +
                    `strategy=exact_xpath ` +
                    `resolution=${candidate.resolution} ` +
                    `timeoutMs=${timeout} ` +
                    `matchedCount=${candidate.matchedCount} ` +
                     `matchedIndex=${candidate.matchedIndex} ` +
                     `metadataMatched=${candidate.metadataMatched} ` +
                     `requestedAgreed=${requestedAgreed} ` +
                     `requestedRelationship=${requestedRelationship} ` +
                     `selector=${candidate.selector}`
                )
            );
        } catch (error) {
            throw new Error(
                [
                    "",
                    "[smart-click] Exact XPath click attempt failed.",
                    "",
                    `selector: ${action.selector || ""}`,
                    `timeout: ${timeout}ms`,
                    `reason: ${formatError(error)}`,
                    "",
                    (
                        "The recorded action reservation was released. " +
                        "smart-test.js may retry the same locator."
                    )
                ].join(
                    "\n"
                ),
                {
                    cause:
                        error
                }
            );
        } finally {
            /*
             * Failed and trial attempts must not consume the recorded action.
             * A later staged retry can reserve the same action again.
             */
            if (!completed) {
                try {
                    this.releaseAction(
                        actionIndex
                    );
                } catch (cleanupError) {
                    safeWarn(
                        `[smart-click] Reservation cleanup error contained: ${formatError(cleanupError)}`
                    );
                }
            }

            try {
                await disposeHandles([
                    requestedHandle,
                    chosenHandle
                ]);
            } catch (cleanupError) {
                safeWarn(
                    `[smart-click] Handle cleanup error contained: ${formatError(cleanupError)}`
                );
            }
        }
    }

    async fill(
        requestedLocator,
        selectorHint,
        value,
        options = {}
    ) {
        const bypassTraceReservation =
            options?.[
                SMART_CLICK_BYPASS
            ] ===
            true;

        const fillOptions =
            removeSmartClickInternalOptions(
                options
            );

        if (bypassTraceReservation) {
            return requestedLocator.fill(
                value,
                fillOptions
            );
        }

        const reserved =
            this.reserveMatchingAction(
                "input",
                selectorHint
            );

        if (!reserved) {
            return requestedLocator.fill(
                value,
                fillOptions
            );
        }

        const {
            action,
            index:
                actionIndex,
            traceActionIndex,
            matchedBy
        } =
            reserved;

        const timeout =
            getAttemptTimeoutMs(
                fillOptions
            );

        const root =
            getTraceRoot(
                this.page,
                action
            );

        const linkage =
            this.findResolvedClickTarget(
                action,
                traceActionIndex
            );

        let activeAffinity =
            linkage.affinity;

        let candidate =
            null;

        let chosenHandle =
            null;

        let requestedHandle =
            null;

        let disposeChosenHandle =
            false;

        let completed =
            false;

        let resolution =
            "";

        let matchedCount =
            0;

        let matchedIndex =
            -1;

        let metadataMatched =
            false;

        try {
            if (activeAffinity) {
                const editableAffinityHandle =
                    await resolveConnectedEditableHandle(
                        activeAffinity.handle
                    );

                if (editableAffinityHandle) {
                    chosenHandle =
                        editableAffinityHandle;
                    disposeChosenHandle =
                        true;
                    resolution =
                        "linked-click-affinity";
                    matchedCount =
                        activeAffinity.matchedCount;
                    matchedIndex =
                        activeAffinity.matchedIndex;
                    metadataMatched =
                        activeAffinity.metadataMatched;
                } else {
                    this.removeResolvedClickTarget(
                        activeAffinity,
                        true
                    );
                    activeAffinity =
                        null;
                }
            }

            if (!chosenHandle) {
                const resolutionAction =
                    createInputResolutionAction(
                        action,
                        linkage.linkedClick
                            ?.action ||
                        null
                    );

                candidate =
                    await resolveExactRecordedSelector({
                        root,
                        action:
                            resolutionAction,
                        options: {
                            trial:
                                true,
                            force:
                                fillOptions.force ===
                                true,
                            timeout
                        },
                        timeout
                    });

                chosenHandle =
                    candidate.handle;
                disposeChosenHandle =
                    true;
                resolution =
                    `input-${candidate.resolution}`;
                matchedCount =
                    candidate.matchedCount;
                matchedIndex =
                    candidate.matchedIndex;
                metadataMatched =
                    candidate.metadataMatched;

                if (
                    !await isConnectedEditableHandle(
                        chosenHandle
                    )
                ) {
                    throw new Error(
                        "Resolved XPath target is not an attached editable element"
                    );
                }
            }

            requestedHandle =
                await resolveRequestedElement(
                    requestedLocator,
                    Math.min(
                        timeout,
                        1000
                    )
                );

            const requestedAgreed =
                requestedHandle
                    ? await pointsToSameNode(
                        requestedHandle,
                        chosenHandle
                    )
                    : false;

            await chosenHandle.fill(
                String(
                    value ??
                    ""
                ),
                {
                    ...fillOptions,
                    timeout
                }
            );

            completed =
                true;

            try {
                this.completeAction(
                    actionIndex
                );
            } catch (bookkeepingError) {
                safeWarn(
                    `[smart-fill] Completion bookkeeping error contained after fill succeeded: ${formatError(bookkeepingError)}`
                );
            }

            if (activeAffinity) {
                try {
                    this.removeResolvedClickTarget(
                        activeAffinity,
                        true
                    );
                    activeAffinity =
                        null;
                } catch (bookkeepingError) {
                    safeWarn(
                        `[smart-fill] Linked-target bookkeeping error contained after fill succeeded: ${formatError(bookkeepingError)}`
                    );
                }
            }

            safeLog(
                (
                    `[smart-fill] ` +
                    `matchedBy=${matchedBy} ` +
                    `strategy=exact_xpath ` +
                    `resolution=${resolution} ` +
                    `timeoutMs=${timeout} ` +
                    `matchedCount=${matchedCount} ` +
                    `matchedIndex=${matchedIndex} ` +
                    `metadataMatched=${metadataMatched} ` +
                    `requestedAgreed=${requestedAgreed} ` +
                    `selector=${normalizeSelector(action.selector)}`
                )
            );
        } catch (error) {
            throw new Error(
                [
                    "",
                    "[smart-fill] Exact XPath fill attempt failed.",
                    "",
                    `selector: ${action.selector || ""}`,
                    `timeout: ${timeout}ms`,
                    `reason: ${formatError(error)}`,
                    "",
                    (
                        "The recorded input reservation was released. " +
                        "smart-test.js may retry the same input target."
                    )
                ].join(
                    "\n"
                ),
                {
                    cause:
                        error
                }
            );
        } finally {
            if (!completed) {
                try {
                    this.releaseAction(
                        actionIndex
                    );
                } catch (cleanupError) {
                    safeWarn(
                        `[smart-fill] Reservation cleanup error contained: ${formatError(cleanupError)}`
                    );
                }
            }

            try {
                await disposeHandles([
                    requestedHandle,
                    disposeChosenHandle
                        ? chosenHandle
                        : null
                ]);
            } catch (cleanupError) {
                safeWarn(
                    `[smart-fill] Handle cleanup error contained: ${formatError(cleanupError)}`
                );
            }
        }
    }
}

function createSmartClickPage(
    page,
    traceActions,
    runtimeContext = {}
) {
    if (
        !Array.isArray(
            traceActions
        ) ||
        !traceActions.some(
            action => {
                return (
                    [
                        "click",
                        "input"
                    ].includes(
                        action?.action
                    ) &&
                    isXPathSelector(
                        action?.selector
                    )
                );
            }
        )
    ) {
        /*
         * No usable trace exists. Return the original page unchanged so this
         * module remains compatible with ordinary test files.
         */
        return page;
    }

    const controller =
        new SmartClickController(
            page,
            traceActions,
            runtimeContext
        );

    const locatorFactoryNames =
        new Set([
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
                get(
                    target,
                    property
                ) {
                    if (
                        property ===
                            SMART_LOCATOR_UNWRAP
                    ) {
                        return target;
                    }

                    /*
                     * Playwright's expect() identifies Locator instances via
                     * their real constructor. Returning a generated wrapper
                     * for this property makes a Proxy-backed Locator look like
                     * a plain object to locator matchers.
                     */
                    if (
                        property ===
                            "constructor"
                    ) {
                        return Reflect.get(
                            target,
                            property,
                            target
                        );
                    }

                    if (
                        property ===
                        "click"
                    ) {
                        return (
                            options
                        ) => {
                            return controller.click(
                                target,
                                selectorHint,
                                options ||
                                {}
                            );
                        };
                    }

                    if (
                        property ===
                        "fill"
                    ) {
                        return (
                            value,
                            options
                        ) => {
                            return controller.fill(
                                target,
                                selectorHint,
                                value,
                                options ||
                                {}
                            );
                        };
                    }

                    const value =
                        Reflect.get(
                            target,
                            property,
                            target
                        );

                    if (
                        typeof value !==
                        "function"
                    ) {
                        return value;
                    }

                    return (
                        ...args
                    ) => {
                        const result =
                            value.apply(
                                target,
                                args
                            );

                        if (
                            isLocatorLike(
                                result
                            )
                        ) {
                            const nextSelectorHint =
                                (
                                    property ===
                                        "locator" &&
                                    typeof args[0] ===
                                        "string"
                                )
                                    ? normalizeSelector(
                                        args[0]
                                    )
                                    : selectorHint;

                            return wrapLocator(
                                result,
                                nextSelectorHint
                            );
                        }

                        if (
                            property ===
                                "frameLocator" &&
                            result
                        ) {
                            return wrapFrameLocator(
                                result
                            );
                        }

                        return result;
                    };
                }
            }
        );
    }

    function wrapFrameLocator(
        frameLocator
    ) {
        return new Proxy(
            frameLocator,
            {
                get(
                    target,
                    property
                ) {
                    const value =
                        Reflect.get(
                            target,
                            property,
                            target
                        );

                    if (
                        typeof value !==
                        "function"
                    ) {
                        return value;
                    }

                    if (
                        property ===
                        "frameLocator"
                    ) {
                        return (
                            ...args
                        ) => {
                            return wrapFrameLocator(
                                value.apply(
                                    target,
                                    args
                                )
                            );
                        };
                    }

                    if (
                        locatorFactoryNames
                            .has(
                                property
                            )
                    ) {
                        return (
                            ...args
                        ) => {
                            const locator =
                                value.apply(
                                    target,
                                    args
                                );

                            const selectorHint =
                                (
                                    property ===
                                        "locator" &&
                                    typeof args[0] ===
                                        "string"
                                )
                                    ? normalizeSelector(
                                        args[0]
                                    )
                                    : undefined;

                            return wrapLocator(
                                locator,
                                selectorHint
                            );
                        };
                    }

                    return value.bind(
                        target
                    );
                }
            }
        );
    }

    return new Proxy(
        page,
        {
            get(
                target,
                property
            ) {
                const value =
                    Reflect.get(
                        target,
                        property,
                        target
                    );

                if (
                    typeof value !==
                    "function"
                ) {
                    return value;
                }

                if (
                    property ===
                    "frameLocator"
                ) {
                    return (
                        ...args
                    ) => {
                        return wrapFrameLocator(
                            value.apply(
                                target,
                                args
                            )
                        );
                    };
                }

                if (
                    locatorFactoryNames
                        .has(
                            property
                        )
                ) {
                    return (
                        ...args
                    ) => {
                        const locator =
                            value.apply(
                                target,
                                args
                            );

                        const selectorHint =
                            (
                                property ===
                                    "locator" &&
                                typeof args[0] ===
                                    "string"
                            )
                                ? normalizeSelector(
                                    args[0]
                                )
                                : undefined;

                        return wrapLocator(
                            locator,
                            selectorHint
                        );
                    };
                }

                return value.bind(
                    target
                );
            }
        }
    );
}

module.exports = {
    createSmartClickPage,
    SMART_CLICK_BYPASS,
    SMART_LOCATOR_UNWRAP
};

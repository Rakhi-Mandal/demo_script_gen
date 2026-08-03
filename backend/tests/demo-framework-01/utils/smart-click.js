const fs = require("node:fs");
const path = require("node:path");

console.log(
    "[smart-click] Sequential XPath strategy implementation loaded:",
    __filename
);

const XPATH_STRATEGY_ORDER = [
    "id",
    "data-testid",
    "data-test",
    "data-qa",
    "data-cy",
    "data-label",
    "aria-label",
    "aria-labelledby",
    "name",
    "placeholder",
    "title",
    "normalize-space(.)",
];

/*
 * Keep these limits aligned with listeners.js.
 *
 * The failed-depth node is level 0. Smart click may then inspect up to
 * five parents above it, meaning six examined DOM nodes in total.
 */
const LISTENER_TEXT_MAX_LENGTH =
    100;

const LISTENER_MAX_PARENT_LEVELS =
    5;

function normalizeSelector(value) {
    const text =
        String(value || "").trim();

    if (!text) {
        return "";
    }

    if (/^xpath=/i.test(text)) {
        return (
            `xpath=` +
            `${text.replace(
                /^xpath=/i,
                ""
            )}`
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

function toXPathSelector(value) {
    const text =
        String(value || "").trim();

    if (!text) {
        return "";
    }

    return /^xpath=/i.test(text)
        ? normalizeSelector(text)
        : `xpath=${text}`;
}

function stripXPathPrefix(value) {
    return String(value || "")
        .trim()
        .replace(
            /^xpath=/i,
            ""
        );
}

function formatError(error) {
    return (
        error instanceof Error
            ? error.message
            : String(error)
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function isLocatorLike(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        typeof value.click ===
            "function" &&
        typeof value.count ===
            "function" &&
        typeof value.locator ===
            "function"
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
        action.frameChain || []
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

        if (selector) {
            root =
                root.frameLocator(
                    selector
                );
        }
    }

    return root;
}

function createTraceCandidates(
    page,
    action
) {
    const root =
        getTraceRoot(
            page,
            action
        );

    const definitions =
        new Map();

    function add(
        source,
        value
    ) {
        if (!value) {
            return;
        }

        if (
            definitions.has(
                value
            )
        ) {
            const sources =
                definitions.get(
                    value
                );

            if (
                !sources.includes(
                    source
                )
            ) {
                sources.push(
                    source
                );
            }

            return;
        }

        definitions.set(
            value,
            [source]
        );
    }

    add(
        "selector",
        normalizeSelector(
            action.selector
        )
    );

    add(
        "primary_xpath",
        toXPathSelector(
            action.primary_xpath
        )
    );

    add(
        "backup_xpath",
        toXPathSelector(
            action.backup_xpath
        )
    );

    return [
        ...definitions.entries(),
    ].map(
        ([
            value,
            sources,
        ]) => ({
            value,
            sources,

            locator:
                root.locator(
                    value
                ),
        })
    );
}

function candidatePriority(
    candidate
) {
    if (
        candidate
            .sources
            .includes(
                "selector"
            )
    ) {
        return 1;
    }

    if (
        candidate
            .sources
            .includes(
                "primary_xpath"
            )
    ) {
        return 2;
    }

    if (
        candidate
            .sources
            .includes(
                "backup_xpath"
            )
    ) {
        return 3;
    }

    return 4;
}

function orderCandidates(
    candidates
) {
    return [
        ...candidates,
    ].sort(
        (
            first,
            second
        ) =>
            candidatePriority(
                first
            ) -
            candidatePriority(
                second
            )
    );
}

async function resolveUniqueCandidate(
    definition,
    timeout
) {
    try {
        await definition
            .locator
            .waitFor({
                state:
                    "attached",

                timeout,
            });

        const count =
            await definition
                .locator
                .count();

        if (count !== 1) {
            return {
                candidate:
                    null,

                reason:
                    `resolved to ${count} elements ` +
                    "instead of exactly 1",
            };
        }

        const handle =
            await definition
                .locator
                .elementHandle();

        if (!handle) {
            return {
                candidate:
                    null,

                reason:
                    "resolved uniquely but no " +
                    "ElementHandle was available",
            };
        }

        return {
            candidate: {
                ...definition,
                handle,
            },

            reason:
                null,
        };
    } catch (error) {
        return {
            candidate:
                null,

            reason:
                formatError(
                    error
                ),
        };
    }
}

async function resolveUniqueHandleFromRoot(
    root,
    selectorValue,
    timeout
) {
    const selector =
        normalizeSelector(
            selectorValue
        );

    const locator =
        root.locator(
            selector
        );

    try {
        await locator.waitFor({
            state:
                "attached",

            timeout,
        });

        const count =
            await locator.count();

        if (count !== 1) {
            return {
                locator,

                handle:
                    null,

                reason:
                    `resolved to ${count} elements ` +
                    "instead of exactly 1",
            };
        }

        const handle =
            await locator
                .elementHandle();

        if (!handle) {
            return {
                locator,

                handle:
                    null,

                reason:
                    "resolved uniquely but no " +
                    "ElementHandle was available",
            };
        }

        return {
            locator,
            handle,

            reason:
                null,
        };
    } catch (error) {
        return {
            locator,

            handle:
                null,

            reason:
                formatError(
                    error
                ),
        };
    }
}

async function resolveRequestedElement(
    locator,
    timeout
) {
    try {
        await locator.waitFor({
            state:
                "attached",

            timeout,
        });

        if (
            await locator.count() !==
            1
        ) {
            return null;
        }

        return await locator
            .elementHandle();
    } catch {
        return null;
    }
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
            ) =>
                firstNode ===
                secondNode,

            second
        );
    } catch {
        return false;
    }
}

async function containsOrIsSameNode(
    ancestorHandle,
    targetHandle
) {
    try {
        return await targetHandle.evaluate(
            (
                target,
                ancestor
            ) =>
                ancestor === target ||
                ancestor.contains(
                    target
                ),

            ancestorHandle
        );
    } catch {
        return false;
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
                    expectedText,
                }
            ) => {
                const normalizeText =
                    value =>
                        String(
                            value || ""
                        )
                            .trim()
                            .replace(
                                /\s+/g,
                                " "
                            );

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

                const checks = [
                    [
                        expectedElement
                            ?.name,
                        "name",
                    ],
                    [
                        expectedElement
                            ?.type,
                        "type",
                    ],
                    [
                        expectedElement
                            ?.role,
                        "role",
                    ],
                    [
                        expectedElement
                            ?.ariaLabel,
                        "aria-label",
                    ],
                    [
                        expectedElement
                            ?.placeholder,
                        "placeholder",
                    ],
                    [
                        expectedElement
                            ?.testId,
                        "data-testid",
                    ],
                    [
                        expectedElement
                            ?.dataTest,
                        "data-test",
                    ],
                    [
                        expectedElement
                            ?.dataCy,
                        "data-cy",
                    ],
                    [
                        expectedElement
                            ?.dataLabel,
                        "data-label",
                    ],
                ];

                let strongCount =
                    0;

                for (
                    const [
                        expected,
                        attribute,
                    ] of checks
                ) {
                    if (
                        expected ===
                            null ||
                        expected ===
                            undefined ||
                        expected ===
                            ""
                    ) {
                        continue;
                    }

                    strongCount +=
                        1;

                    if (
                        element.getAttribute(
                            attribute
                        ) !==
                        String(
                            expected
                        )
                    ) {
                        return false;
                    }
                }

                if (
                    strongCount ===
                    0
                ) {
                    const expected =
                        normalizeText(
                            expectedText
                        );

                    if (expected) {
                        /*
                         * listeners.js stores a truncated text prefix.
                         *
                         * Compare the live text over the exact number of
                         * characters present in the recorded text. This
                         * avoids comparing a 100-character recording against
                         * a separately truncated 120-character live value.
                         */
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
                    null,
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
            .filter(Boolean)
            .map(
                handle =>
                    handle.dispose()
            )
    );
}

function splitXPathSegments(
    xpathValue
) {
    const xpath =
        stripXPathPrefix(
            xpathValue
        );

    if (
        !xpath ||
        xpath.startsWith("(")
    ) {
        return [];
    }

    let source;

    if (
        xpath.startsWith("//")
    ) {
        source =
            xpath.slice(2);
    } else if (
        xpath.startsWith("/")
    ) {
        source =
            xpath.slice(1);
    } else {
        return [];
    }

    const segments =
        [];

    let current =
        "";

    let quote =
        "";

    let bracketDepth =
        0;

    let parenthesisDepth =
        0;

    for (
        let index = 0;
        index <
            source.length;
        index += 1
    ) {
        const character =
            source[index];

        if (quote) {
            current +=
                character;

            if (
                character ===
                    quote &&
                source[
                    index - 1
                ] !== "\\"
            ) {
                quote =
                    "";
            }

            continue;
        }

        if (
            character === "'" ||
            character === '"'
        ) {
            quote =
                character;

            current +=
                character;

            continue;
        }

        if (
            character === "["
        ) {
            bracketDepth +=
                1;
        } else if (
            character === "]"
        ) {
            bracketDepth =
                Math.max(
                    0,
                    bracketDepth - 1
                );
        } else if (
            character === "("
        ) {
            parenthesisDepth +=
                1;
        } else if (
            character === ")"
        ) {
            parenthesisDepth =
                Math.max(
                    0,
                    parenthesisDepth - 1
                );
        }

        if (
            character === "/" &&
            bracketDepth === 0 &&
            parenthesisDepth === 0
        ) {
            const segment =
                current.trim();

            if (segment) {
                segments.push(
                    segment
                );
            }

            current =
                "";

            continue;
        }

        current +=
            character;
    }

    const finalSegment =
        current.trim();

    if (finalSegment) {
        segments.push(
            finalSegment
        );
    }

    return segments;
}

function extractSelectorPlan(
    selectorValue
) {
    const rawXPath =
        stripXPathPrefix(
            selectorValue
        );

    const segments =
        splitXPathSegments(
            rawXPath
        );

    return {
        rawXPath,
        segments,

        totalDepth:
            segments.length,
    };
}

function buildXPathPrefix(
    segments,
    depth
) {
    if (
        !Array.isArray(
            segments
        ) ||
        depth <= 0
    ) {
        return "";
    }

    return (
        `//${segments
            .slice(
                0,
                depth
            )
            .join("/")}`
    );
}

function escapeRegExp(
    value
) {
    return String(
        value || ""
    ).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

function detectXPathSegmentStrategy(
    segment
) {
    const text =
        String(
            segment || ""
        );

    for (
        let index = 0;
        index <
            XPATH_STRATEGY_ORDER
                .length;
        index += 1
    ) {
        const strategy =
            XPATH_STRATEGY_ORDER[
                index
            ];

        if (
            strategy ===
            "normalize-space(.)"
        ) {
            if (
                /normalize-space\s*\(\s*\.\s*\)\s*=/i.test(
                    text
                )
            ) {
                return {
                    strategy,

                    strategyIndex:
                        index,
                };
            }

            continue;
        }

        const pattern =
            new RegExp(
                (
                    `@\\s*` +
                    `${escapeRegExp(
                        strategy
                    )}` +
                    `\\s*=`
                ),
                "i"
            );

        if (
            pattern.test(
                text
            )
        ) {
            return {
                strategy,

                strategyIndex:
                    index,
            };
        }
    }

    return {
        strategy:
            "",

        strategyIndex:
            -1,
    };
}

async function inspectFailedSelectorPath(
    root,
    plan,
    timeout
) {
    let lastWorkingHandle =
        null;

    let lastWorkingDepth =
        0;

    let lastWorkingXPath =
        "";

    let firstFailedDepth =
        null;

    let failedXPath =
        "";

    let failureReason =
        "";

    for (
        let depth = 1;
        depth <=
            plan.totalDepth;
        depth += 1
    ) {
        const candidateXPath =
            buildXPathPrefix(
                plan.segments,
                depth
            );

        const resolution =
            await resolveUniqueHandleFromRoot(
                root,
                candidateXPath,
                Math.min(
                    timeout,
                    2000
                )
            );

        if (
            !resolution.handle
        ) {
            firstFailedDepth =
                depth;

            failedXPath =
                candidateXPath;

            failureReason =
                resolution.reason;

            break;
        }

        if (
            lastWorkingHandle
        ) {
            await lastWorkingHandle
                .dispose()
                .catch(
                    () => {}
                );
        }

        lastWorkingHandle =
            resolution.handle;

        lastWorkingDepth =
            depth;

        lastWorkingXPath =
            candidateXPath;
    }

    if (
        firstFailedDepth ===
            null &&
        plan.totalDepth > 0
    ) {
        firstFailedDepth =
            plan.totalDepth;

        failedXPath =
            buildXPathPrefix(
                plan.segments,
                plan.totalDepth
            );
    }

    return {
        lastWorkingHandle,
        lastWorkingDepth,
        lastWorkingXPath,
        firstFailedDepth,
        failedXPath,
        failureReason,
    };
}

async function buildIndexedPathFromAnchor(
    anchorHandle,
    targetHandle
) {
    try {
        return await targetHandle.evaluate(
            (
                target,
                anchor
            ) => {
                function xpathLiteral(
                    value
                ) {
                    const text =
                        String(
                            value
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
                            .split("'")
                            .map(
                                part =>
                                    `'${part}'`
                            )
                            .join(
                                ", \"'\", "
                            ) +
                        ")"
                    );
                }

                function getXPathTag(
                    element
                ) {
                    const tag =
                        element
                            .localName ||
                        element
                            .tagName
                            .toLowerCase();

                    return (
                        element
                            .namespaceURI ===
                        "http://www.w3.org/2000/svg"
                    )
                        ? (
                            `*[local-name()=` +
                            `${xpathLiteral(
                                tag
                            )}]`
                        )
                        : tag;
                }

                function indexedSegment(
                    element
                ) {
                    const tag =
                        getXPathTag(
                            element
                        );

                    if (
                        !element
                            .parentElement
                    ) {
                        return `${tag}[1]`;
                    }

                    const siblings = [
                        ...element
                            .parentElement
                            .children,
                    ].filter(
                        sibling =>
                            (
                                sibling
                                    .localName ===
                                    element
                                        .localName &&
                                sibling
                                    .namespaceURI ===
                                    element
                                        .namespaceURI
                            )
                    );

                    const index =
                        siblings.indexOf(
                            element
                        );

                    return index < 0
                        ? ""
                        : (
                            `${tag}[` +
                            `${index + 1}]`
                        );
                }

                if (
                    !target ||
                    !anchor
                ) {
                    return {
                        valid:
                            false,

                        reason:
                            "anchor or target unavailable",
                    };
                }

                if (
                    !target.isConnected ||
                    !anchor.isConnected
                ) {
                    return {
                        valid:
                            false,

                        reason:
                            "anchor or target detached",
                    };
                }

                if (
                    target === anchor
                ) {
                    return {
                        valid:
                            true,

                        segments:
                            [],
                    };
                }

                if (
                    !anchor.contains(
                        target
                    )
                ) {
                    return {
                        valid:
                            false,

                        reason:
                            "working prefix does not contain fallback target",
                    };
                }

                const segments =
                    [];

                let current =
                    target;

                while (
                    current &&
                    current !== anchor
                ) {
                    const segment =
                        indexedSegment(
                            current
                        );

                    if (!segment) {
                        return {
                            valid:
                                false,

                            reason:
                                "could not build indexed segment",
                        };
                    }

                    segments.unshift(
                        segment
                    );

                    current =
                        current
                            .parentElement;
                }

                return (
                    current === anchor
                )
                    ? {
                        valid:
                            true,

                        segments,
                    }
                    : {
                        valid:
                            false,

                        reason:
                            "DOM traversal did not reach anchor",
                    };
            },
            anchorHandle
        );
    } catch (error) {
        return {
            valid:
                false,

            reason:
                formatError(
                    error
                ),
        };
    }
}

async function buildSequentialLiveSelector(
    targetHandle,
    {
        totalDepth,
        failedDepth,
        failedSegment,
        failedStrategy,
        failedStrategyIndex,
    }
) {
    try {
        return await targetHandle.evaluate(
            (
                target,
                {
                    totalDepth:
                        rawTotalDepth,

                    failedDepth:
                        rawFailedDepth,

                    failedSegment:
                        rawFailedSegment,

                    failedStrategy:
                        rawFailedStrategy,

                    failedStrategyIndex:
                        rawFailedStrategyIndex,

                    strategyOrder,
                    textMaxLength,
                    maxParentLevels,
                }
            ) => {
                const normalizeText =
                    value =>
                        String(
                            value || ""
                        )
                            .trim()
                            .replace(
                                /\s+/g,
                                " "
                            );

                function xpathLiteral(
                    value
                ) {
                    const text =
                        String(
                            value
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
                            .split("'")
                            .map(
                                part =>
                                    `'${part}'`
                            )
                            .join(
                                ", \"'\", "
                            ) +
                        ")"
                    );
                }

                function getXPathTag(
                    element
                ) {
                    const tag =
                        element
                            .localName ||
                        element
                            .tagName
                            .toLowerCase();

                    return (
                        element
                            .namespaceURI ===
                        "http://www.w3.org/2000/svg"
                    )
                        ? (
                            `*[local-name()=` +
                            `${xpathLiteral(
                                tag
                            )}]`
                        )
                        : tag;
                }

                function evaluateSnapshot(
                    xpath,
                    element
                ) {
                    try {
                        return element
                            .ownerDocument
                            .evaluate(
                                xpath,
                                element
                                    .ownerDocument,
                                null,
                                XPathResult
                                    .ORDERED_NODE_SNAPSHOT_TYPE,
                                null
                            );
                    } catch {
                        return null;
                    }
                }

                function uniquelyMatches(
                    xpath,
                    expectedElement
                ) {
                    const result =
                        evaluateSnapshot(
                            xpath,
                            expectedElement
                        );

                    return Boolean(
                        result &&
                        result
                            .snapshotLength ===
                            1 &&
                        result
                            .snapshotItem(
                                0
                            ) ===
                            expectedElement
                    );
                }

                function indexedSegment(
                    element
                ) {
                    const tag =
                        getXPathTag(
                            element
                        );

                    if (
                        !element
                            .parentElement
                    ) {
                        return `${tag}[1]`;
                    }

                    const siblings = [
                        ...element
                            .parentElement
                            .children,
                    ].filter(
                        sibling =>
                            (
                                sibling
                                    .localName ===
                                    element
                                        .localName &&
                                sibling
                                    .namespaceURI ===
                                    element
                                        .namespaceURI
                            )
                    );

                    const index =
                        siblings.indexOf(
                            element
                        );

                    return index < 0
                        ? ""
                        : (
                            `${tag}[` +
                            `${index + 1}]`
                        );
                }

                function indexedPath(
                    ancestor,
                    element
                ) {
                    if (
                        ancestor ===
                        element
                    ) {
                        return "";
                    }

                    const parts =
                        [];

                    let current =
                        element;

                    while (
                        current &&
                        current !==
                            ancestor
                    ) {
                        const segment =
                            indexedSegment(
                                current
                            );

                        if (!segment) {
                            return null;
                        }

                        parts.unshift(
                            segment
                        );

                        current =
                            current
                                .parentElement;
                    }

                    if (
                        current !==
                        ancestor
                    ) {
                        return null;
                    }

                    return parts.length
                        ? (
                            `/${parts.join(
                                "/"
                            )}`
                        )
                        : "";
                }

                function ancestorAtDistance(
                    element,
                    distance
                ) {
                    let current =
                        element;

                    for (
                        let index = 0;
                        index < distance;
                        index += 1
                    ) {
                        if (
                            !current
                                .parentElement
                        ) {
                            return null;
                        }

                        current =
                            current
                                .parentElement;
                    }

                    return current;
                }

                function candidateForStrategy(
                    element,
                    strategy
                ) {
                    const tag =
                        getXPathTag(
                            element
                        );

                    if (
                        strategy ===
                        "normalize-space(.)"
                    ) {
                        const text =
                            normalizeText(
                                element
                                    .textContent
                            );

                        /*
                         * Keep normalize-space XPath generation aligned with
                         * listeners.js. Long container text is not used as a
                         * normal text-based XPath candidate.
                         */
                        if (
                            !text ||
                            text.length >
                                textMaxLength
                        ) {
                            return "";
                        }

                        return (
                            `//${tag}` +
                            `[normalize-space(.)=` +
                            `${xpathLiteral(
                                text
                            )}]`
                        );
                    }

                    const value =
                        element.getAttribute(
                            strategy
                        );

                    if (
                        value === null ||
                        value === ""
                    ) {
                        return "";
                    }

                    return (
                        `//${tag}` +
                        `[@${strategy}=` +
                        `${xpathLiteral(
                            value
                        )}]`
                    );
                }

                if (
                    !target ||
                    !target.isConnected
                ) {
                    return {
                        valid:
                            false,

                        reason:
                            "fallback target unavailable or detached",
                    };
                }

                const normalizedTotalDepth =
                    Math.max(
                        1,
                        Number(
                            rawTotalDepth
                        ) || 1
                    );

                const normalizedFailedDepth =
                    Math.min(
                        normalizedTotalDepth,
                        Math.max(
                            1,
                            Number(
                                rawFailedDepth
                            ) ||
                            normalizedTotalDepth
                        )
                    );

                const normalizedFailedStrategyIndex =
                    Number(
                        rawFailedStrategyIndex
                    );

                if (
                    !Number.isInteger(
                        normalizedFailedStrategyIndex
                    ) ||
                    normalizedFailedStrategyIndex <
                        0 ||
                    normalizedFailedStrategyIndex >=
                        strategyOrder.length
                ) {
                    return {
                        valid:
                            false,

                        reason:
                            "failed XPath segment did not use one of the configured 12 strategies",
                    };
                }

                const failedNode =
                    ancestorAtDistance(
                        target,
                        (
                            normalizedTotalDepth -
                            normalizedFailedDepth
                        )
                    );

                if (!failedNode) {
                    return {
                        valid:
                            false,

                        reason:
                            "could not map fallback target to failed XPath depth",
                    };
                }

                const attempts =
                    [];

                function tryStrategiesOnAnchor({
                    anchorNode,
                    startStrategyIndex,
                    phase,
                    distanceAboveFailedDepth,
                }) {
                    const childPath =
                        indexedPath(
                            anchorNode,
                            target
                        );

                    if (
                        childPath ===
                        null
                    ) {
                        attempts.push({
                            phase,
                            distanceAboveFailedDepth,

                            strategy:
                                "none",

                            result:
                                "could-not-build-indexed-path-to-target",
                        });

                        return null;
                    }

                    for (
                        let index =
                            startStrategyIndex;

                        index <
                        strategyOrder.length;

                        index += 1
                    ) {
                        const strategy =
                            strategyOrder[
                                index
                            ];

                        const anchorXPath =
                            candidateForStrategy(
                                anchorNode,
                                strategy
                            );

                        if (!anchorXPath) {
                            attempts.push({
                                phase,
                                distanceAboveFailedDepth,
                                strategy,

                                strategyIndex:
                                    index,

                                result:
                                    "value-unavailable",
                            });

                            continue;
                        }

                        if (
                            !uniquelyMatches(
                                anchorXPath,
                                anchorNode
                            )
                        ) {
                            attempts.push({
                                phase,
                                distanceAboveFailedDepth,
                                strategy,

                                strategyIndex:
                                    index,

                                anchorXPath,

                                result:
                                    "did-not-resolve-uniquely-to-anchor-node",
                            });

                            continue;
                        }

                        const selectorXPath =
                            (
                                `${anchorXPath}` +
                                `${childPath}`
                            );

                        if (
                            !uniquelyMatches(
                                selectorXPath,
                                target
                            )
                        ) {
                            attempts.push({
                                phase,
                                distanceAboveFailedDepth,
                                strategy,

                                strategyIndex:
                                    index,

                                anchorXPath,
                                selectorXPath,

                                result:
                                    "final-selector-did-not-resolve-uniquely-to-target",
                            });

                            continue;
                        }

                        return {
                            strategy,

                            strategyIndex:
                                index,

                            anchorXPath,
                            selectorXPath,
                        };
                    }

                    return null;
                }

                /*
                 * First continue from the strategy immediately after the
                 * strategy that failed, on the exact failed-depth node.
                 */
                const failedDepthResult =
                    tryStrategiesOnAnchor({
                        anchorNode:
                            failedNode,

                        startStrategyIndex:
                            normalizedFailedStrategyIndex +
                            1,

                        phase:
                            "continue-at-failed-depth",

                        distanceAboveFailedDepth:
                            0,
                    });

                if (
                    failedDepthResult
                ) {
                    return {
                        valid:
                            true,

                        strategy:
                            "continued-after-failed-xpath-strategy",

                        failedDepth:
                            normalizedFailedDepth,

                        failedSegment:
                            rawFailedSegment,

                        failedStrategy:
                            rawFailedStrategy,

                        failedStrategyIndex:
                            normalizedFailedStrategyIndex,

                        replacementStrategy:
                            failedDepthResult
                                .strategy,

                        replacementStrategyIndex:
                            failedDepthResult
                                .strategyIndex,

                        anchorXPath:
                            failedDepthResult
                                .anchorXPath,

                        selectorXPath:
                            failedDepthResult
                                .selectorXPath,

                        anchorDistanceAboveFailedDepth:
                            0,

                        attempts,
                    };
                }

                /*
                 * All remaining strategies failed at the failed depth.
                 *
                 * Move one DOM level upward, restart the complete strategy
                 * order from id, and append the indexed path back to the
                 * fallback-resolved target.
                 *
                 * Keep the upward search aligned with listeners.js by
                 * examining at most five parents above the failed node.
                 */
                let currentAncestor =
                    failedNode
                        .parentElement;

                let distanceAboveFailedDepth =
                    1;

                while (
                    currentAncestor &&
                    currentAncestor
                        .nodeType ===
                        Node.ELEMENT_NODE &&
                    currentAncestor
                        .tagName !==
                        "HTML" &&
                    distanceAboveFailedDepth <=
                        maxParentLevels
                ) {
                    const ancestorResult =
                        tryStrategiesOnAnchor({
                            anchorNode:
                                currentAncestor,

                            startStrategyIndex:
                                0,

                            phase:
                                "restart-at-parent",

                            distanceAboveFailedDepth,
                        });

                    if (
                        ancestorResult
                    ) {
                        return {
                            valid:
                                true,

                            strategy:
                                distanceAboveFailedDepth ===
                                    1
                                    ? "restarted-full-strategy-order-at-parent"
                                    : "restarted-full-strategy-order-at-ancestor",

                            failedDepth:
                                normalizedFailedDepth,

                            failedSegment:
                                rawFailedSegment,

                            failedStrategy:
                                rawFailedStrategy,

                            failedStrategyIndex:
                                normalizedFailedStrategyIndex,

                            replacementStrategy:
                                ancestorResult
                                    .strategy,

                            replacementStrategyIndex:
                                ancestorResult
                                    .strategyIndex,

                            anchorXPath:
                                ancestorResult
                                    .anchorXPath,

                            selectorXPath:
                                ancestorResult
                                    .selectorXPath,

                            anchorDistanceAboveFailedDepth:
                                distanceAboveFailedDepth,

                            attempts,
                        };
                    }

                    if (
                        currentAncestor
                            .tagName ===
                        "BODY"
                    ) {
                        break;
                    }

                    currentAncestor =
                        currentAncestor
                            .parentElement;

                    distanceAboveFailedDepth +=
                        1;
                }

                return {
                    valid:
                        false,

                    reason:
                        (
                            `all configured strategies after ` +
                            `${rawFailedStrategy} failed at the failed ` +
                            `depth, and restarting all 12 strategies within ` +
                            `${maxParentLevels} parent levels did not produce ` +
                            `a unique selector for the fallback target`
                        ),

                    attempts,
                };
            },
            {
                totalDepth,
                failedDepth,
                failedSegment,
                failedStrategy,
                failedStrategyIndex,

                strategyOrder:
                    XPATH_STRATEGY_ORDER,

                textMaxLength:
                    LISTENER_TEXT_MAX_LENGTH,

                maxParentLevels:
                    LISTENER_MAX_PARENT_LEVELS,
            }
        );
    } catch (error) {
        return {
            valid:
                false,

            reason:
                formatError(
                    error
                ),
        };
    }
}

async function validateXPathAgainstHandle(
    root,
    xpathValue,
    targetHandle,
    timeout
) {
    const resolution =
        await resolveUniqueHandleFromRoot(
            root,
            xpathValue,
            timeout
        );

    if (!resolution.handle) {
        return {
            valid:
                false,

            locator:
                resolution.locator,

            reason:
                resolution.reason,
        };
    }

    const sameNode =
        await pointsToSameNode(
            resolution.handle,
            targetHandle
        );

    await resolution
        .handle
        .dispose()
        .catch(
            () => {}
        );

    return {
        valid:
            sameNode,

        locator:
            resolution.locator,

        reason:
            sameNode
                ? null
                : (
                    "reconstructed selector " +
                    "did not resolve to fallback target"
                ),
    };
}

async function buildLiveXPathAlternatives(
    targetHandle
) {
    try {
        return await targetHandle.evaluate(
            (
                target,
                {
                    textMaxLength,
                    maxParentLevels,
                }
            ) => {
                const normalizeText =
                    value =>
                        String(
                            value || ""
                        )
                            .trim()
                            .replace(
                                /\s+/g,
                                " "
                            );

                function xpathLiteral(
                    value
                ) {
                    const text =
                        String(
                            value
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
                            .split("'")
                            .map(
                                part =>
                                    `'${part}'`
                            )
                            .join(
                                ", \"'\", "
                            ) +
                        ")"
                    );
                }

                function tag(
                    element
                ) {
                    const value =
                        element
                            .localName ||
                        element
                            .tagName
                            .toLowerCase();

                    return (
                        element
                            .namespaceURI ===
                        "http://www.w3.org/2000/svg"
                    )
                        ? (
                            `*[local-name()=` +
                            `${xpathLiteral(
                                value
                            )}]`
                        )
                        : value;
                }

                function indexedSegment(
                    element
                ) {
                    const value =
                        tag(
                            element
                        );

                    if (
                        !element
                            .parentElement
                    ) {
                        return `${value}[1]`;
                    }

                    const siblings = [
                        ...element
                            .parentElement
                            .children,
                    ].filter(
                        sibling =>
                            (
                                sibling
                                    .localName ===
                                    element
                                        .localName &&
                                sibling
                                    .namespaceURI ===
                                    element
                                        .namespaceURI
                            )
                    );

                    const index =
                        siblings.indexOf(
                            element
                        );

                    return index < 0
                        ? ""
                        : (
                            `${value}[` +
                            `${index + 1}]`
                        );
                }

                function indexedPath(
                    ancestor,
                    element
                ) {
                    if (
                        ancestor ===
                        element
                    ) {
                        return "";
                    }

                    const parts =
                        [];

                    let current =
                        element;

                    while (
                        current &&
                        current !==
                            ancestor
                    ) {
                        const segment =
                            indexedSegment(
                                current
                            );

                        if (!segment) {
                            return null;
                        }

                        parts.unshift(
                            segment
                        );

                        current =
                            current
                                .parentElement;
                    }

                    if (
                        current !==
                        ancestor
                    ) {
                        return null;
                    }

                    return parts.length
                        ? (
                            `/${parts.join(
                                "/"
                            )}`
                        )
                        : "";
                }

                function unique(
                    xpath,
                    expected
                ) {
                    try {
                        const result =
                            expected
                                .ownerDocument
                                .evaluate(
                                    xpath,
                                    expected
                                        .ownerDocument,
                                    null,
                                    XPathResult
                                        .ORDERED_NODE_SNAPSHOT_TYPE,
                                    null
                                );

                        return (
                            result
                                .snapshotLength ===
                                1 &&
                            result
                                .snapshotItem(
                                    0
                                ) ===
                                expected
                        );
                    } catch {
                        return false;
                    }
                }

                function primary(
                    element
                ) {
                    let anchor =
                        element;

                    for (
                        let depth = 0;
                        anchor &&
                        depth <=
                            maxParentLevels;
                        depth += 1
                    ) {
                        if (
                            anchor
                                .tagName ===
                                "HTML" ||
                            anchor
                                .tagName ===
                                "BODY"
                        ) {
                            break;
                        }

                        const text =
                            normalizeText(
                                anchor
                                    .textContent
                            );

                        if (
                            text &&
                            text.length <=
                                textMaxLength
                        ) {
                            const anchorXPath =
                                (
                                    `//${tag(
                                        anchor
                                    )}` +
                                    `[normalize-space(.)=` +
                                    `${xpathLiteral(
                                        text
                                    )}]`
                                );

                            if (
                                unique(
                                    anchorXPath,
                                    anchor
                                )
                            ) {
                                const childPath =
                                    indexedPath(
                                        anchor,
                                        element
                                    );

                                if (
                                    childPath !==
                                    null
                                ) {
                                    const xpath =
                                        (
                                            `${anchorXPath}` +
                                            `${childPath}`
                                        );

                                    if (
                                        unique(
                                            xpath,
                                            element
                                        )
                                    ) {
                                        return xpath;
                                    }
                                }
                            }
                        }

                        anchor =
                            anchor
                                .parentElement;
                    }

                    return "";
                }

                function backup(
                    element
                ) {
                    const base =
                        `//${tag(
                            element
                        )}`;

                    try {
                        const result =
                            element
                                .ownerDocument
                                .evaluate(
                                    base,
                                    element
                                        .ownerDocument,
                                    null,
                                    XPathResult
                                        .ORDERED_NODE_SNAPSHOT_TYPE,
                                    null
                                );

                        for (
                            let index = 0;
                            index <
                                result
                                    .snapshotLength;
                            index += 1
                        ) {
                            if (
                                result
                                    .snapshotItem(
                                        index
                                    ) ===
                                element
                            ) {
                                const xpath =
                                    (
                                        `(${base})` +
                                        `[${index + 1}]`
                                    );

                                return unique(
                                    xpath,
                                    element
                                )
                                    ? xpath
                                    : "";
                            }
                        }
                    } catch {
                        return "";
                    }

                    return "";
                }

                const backupXPath =
                    backup(
                        target
                    );

                return {
                    primaryXPath:
                        (
                            primary(
                                target
                            ) ||
                            backupXPath
                        ),

                    backupXPath,
                };
            },
            {
                textMaxLength:
                    LISTENER_TEXT_MAX_LENGTH,

                maxParentLevels:
                    LISTENER_MAX_PARENT_LEVELS,
            }
        );
    } catch {
        return {
            primaryXPath:
                "",

            backupXPath:
                "",
        };
    }
}

async function reconstructSelectorFromFallback({
    root,
    action,
    targetHandle,
    timeout,
}) {
    const plan =
        extractSelectorPlan(
            action.selector
        );

    if (!plan.totalDepth) {
        return {
            healed:
                false,

            reason:
                "selector could not be parsed " +
                "as a structural XPath",
        };
    }

    const inspection =
        await inspectFailedSelectorPath(
            root,
            plan,
            timeout
        );

    try {
        const failedDepth =
            (
                inspection
                    .firstFailedDepth ||
                plan.totalDepth
            );

        const failedSegment =
            (
                plan.segments[
                    failedDepth - 1
                ] ||
                plan.segments[
                    plan.segments
                        .length - 1
                ] ||
                ""
            );

        const detectedStrategy =
            detectXPathSegmentStrategy(
                failedSegment
            );

        if (
            detectedStrategy
                .strategyIndex >=
            0
        ) {
            const repaired =
                await buildSequentialLiveSelector(
                    targetHandle,
                    {
                        totalDepth:
                            plan.totalDepth,

                        failedDepth,
                        failedSegment,

                        failedStrategy:
                            detectedStrategy
                                .strategy,

                        failedStrategyIndex:
                            detectedStrategy
                                .strategyIndex,
                    }
                );

            if (
                repaired.valid
            ) {
                const validation =
                    await validateXPathAgainstHandle(
                        root,
                        repaired
                            .selectorXPath,
                        targetHandle,
                        Math.min(
                            timeout,
                            4000
                        )
                    );

                if (
                    validation.valid
                ) {
                    const alternatives =
                        await buildLiveXPathAlternatives(
                            targetHandle
                        );

                    return {
                        healed:
                            true,

                        strategy:
                            repaired
                                .strategy,

                        selector:
                            normalizeSelector(
                                repaired
                                    .selectorXPath
                            ),

                        primary_xpath:
                            (
                                alternatives
                                    .primaryXPath ||
                                stripXPathPrefix(
                                    repaired
                                        .selectorXPath
                                )
                            ),

                        backup_xpath:
                            (
                                alternatives
                                    .backupXPath ||
                                stripXPathPrefix(
                                    action
                                        .backup_xpath
                                )
                            ),

                        anchorXPath:
                            repaired
                                .anchorXPath,

                        anchorDistanceAboveFailedDepth:
                            repaired
                                .anchorDistanceAboveFailedDepth ??
                            0,

                        failedSegment,

                        failedStrategy:
                            repaired
                                .failedStrategy,

                        failedStrategyIndex:
                            repaired
                                .failedStrategyIndex,

                        replacementStrategy:
                            repaired
                                .replacementStrategy,

                        replacementStrategyIndex:
                            repaired
                                .replacementStrategyIndex,

                        strategyAttempts:
                            repaired
                                .attempts ||
                            [],

                        originalTargetDepth:
                            plan
                                .totalDepth,

                        lastWorkingDepth:
                            inspection
                                .lastWorkingDepth,

                        firstRepairAbsoluteDepth:
                            failedDepth,

                        failedXPath:
                            inspection
                                .failedXPath,
                    };
                }
            }

            return {
                healed:
                    false,

                reason:
                    (
                        repaired.reason ||
                        inspection
                            .failureReason ||
                        "sequential XPath strategy repair failed"
                    ),

                failedSegment,

                failedStrategy:
                    detectedStrategy
                        .strategy,

                strategyAttempts:
                    repaired
                        .attempts ||
                    [],
            };
        }

        /*
         * A positional segment such as div[5] is not one of the 12
         * attribute/text strategies. In that situation, continue from the
         * deepest prefix that still resolved and rebuild only the remaining
         * indexed descendant path.
         */
        if (
            inspection
                .lastWorkingHandle
        ) {
            const containsTarget =
                await containsOrIsSameNode(
                    inspection
                        .lastWorkingHandle,
                    targetHandle
                );

            if (containsTarget) {
                const rebuiltPath =
                    await buildIndexedPathFromAnchor(
                        inspection
                            .lastWorkingHandle,
                        targetHandle
                    );

                if (
                    rebuiltPath.valid
                ) {
                    const rawXPath =
                        rebuiltPath
                            .segments
                            .length
                            ? (
                                `${inspection
                                    .lastWorkingXPath}/` +
                                `${rebuiltPath
                                    .segments
                                    .join("/")}`
                            )
                            : inspection
                                .lastWorkingXPath;

                    const validation =
                        await validateXPathAgainstHandle(
                            root,
                            rawXPath,
                            targetHandle,
                            Math.min(
                                timeout,
                                4000
                            )
                        );

                    if (
                        validation.valid
                    ) {
                        const alternatives =
                            await buildLiveXPathAlternatives(
                                targetHandle
                            );

                        return {
                            healed:
                                true,

                            strategy:
                                "continued-from-working-selector-depth",

                            selector:
                                normalizeSelector(
                                    rawXPath
                                ),

                            primary_xpath:
                                (
                                    alternatives
                                        .primaryXPath ||
                                    stripXPathPrefix(
                                        rawXPath
                                    )
                                ),

                            backup_xpath:
                                (
                                    alternatives
                                        .backupXPath ||
                                    stripXPathPrefix(
                                        action
                                            .backup_xpath
                                    )
                                ),

                            anchorXPath:
                                inspection
                                    .lastWorkingXPath,

                            anchorDistanceAboveFailedDepth:
                                0,

                            failedSegment,

                            failedStrategy:
                                "unrecognized",

                            failedStrategyIndex:
                                -1,

                            replacementStrategy:
                                "indexed-descendant-path",

                            replacementStrategyIndex:
                                -1,

                            strategyAttempts:
                                [],

                            originalTargetDepth:
                                plan
                                    .totalDepth,

                            lastWorkingDepth:
                                inspection
                                    .lastWorkingDepth,

                            firstRepairAbsoluteDepth:
                                failedDepth,

                            failedXPath:
                                inspection
                                    .failedXPath,
                        };
                    }
                }
            }
        }

        return {
            healed:
                false,

            reason:
                (
                    "the failed XPath segment did not use one of the " +
                    "configured 12 strategies and no working prefix " +
                    "could be continued"
                ),

            failedSegment,

            failedStrategy:
                "unrecognized",

            strategyAttempts:
                [],
        };
    } finally {
        if (
            inspection
                .lastWorkingHandle
        ) {
            await inspection
                .lastWorkingHandle
                .dispose()
                .catch(
                    () => {}
                );
        }
    }
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

        const replacements = {
            n: "\n",
            r: "\r",
            t: "\t",
            b: "\b",
            f: "\f",
            v: "\v",
            0: "\0",
            "\\": "\\",
            "'": "'",
            '"': '"',
        };

        result +=
            Object.prototype
                .hasOwnProperty.call(
                    replacements,
                    character
                )
                ? replacements[
                    character
                ]
                : character;
    }

    return escaped
        ? null
        : result;
}

function findDirectLocatorClickCalls(
    sourceText
) {
    const calls =
        [];

    const token =
        "page.locator";

    let searchIndex =
        0;

    while (
        searchIndex <
        sourceText.length
    ) {
        const tokenIndex =
            sourceText.indexOf(
                token,
                searchIndex
            );

        if (
            tokenIndex < 0
        ) {
            break;
        }

        let cursor =
            tokenIndex +
            token.length;

        while (
            cursor <
                sourceText.length &&
            /\s/.test(
                sourceText[cursor]
            )
        ) {
            cursor +=
                1;
        }

        if (
            sourceText[cursor] !==
            "("
        ) {
            searchIndex =
                cursor + 1;

            continue;
        }

        cursor +=
            1;

        while (
            cursor <
                sourceText.length &&
            /\s/.test(
                sourceText[cursor]
            )
        ) {
            cursor +=
                1;
        }

        const quote =
            sourceText[cursor];

        if (
            quote !== '"' &&
            quote !== "'"
        ) {
            searchIndex =
                cursor + 1;

            continue;
        }

        const literalStart =
            cursor;

        cursor +=
            1;

        let escaped =
            false;

        let literalEnd =
            -1;

        while (
            cursor <
            sourceText.length
        ) {
            const character =
                sourceText[cursor];

            if (escaped) {
                escaped =
                    false;

                cursor +=
                    1;

                continue;
            }

            if (
                character === "\\"
            ) {
                escaped =
                    true;

                cursor +=
                    1;

                continue;
            }

            if (
                character === quote
            ) {
                literalEnd =
                    cursor + 1;

                break;
            }

            cursor +=
                1;
        }

        if (
            literalEnd < 0
        ) {
            break;
        }

        const decoded =
            decodeJavaScriptStringLiteral(
                sourceText.slice(
                    literalStart,
                    literalEnd
                )
            );

        cursor =
            literalEnd;

        while (
            cursor <
                sourceText.length &&
            /\s/.test(
                sourceText[cursor]
            )
        ) {
            cursor +=
                1;
        }

        if (
            sourceText[cursor] !==
            ")"
        ) {
            searchIndex =
                literalEnd;

            continue;
        }

        cursor +=
            1;

        while (
            cursor <
                sourceText.length &&
            /\s/.test(
                sourceText[cursor]
            )
        ) {
            cursor +=
                1;
        }

        if (
            !sourceText.startsWith(
                ".click",
                cursor
            )
        ) {
            searchIndex =
                literalEnd;

            continue;
        }

        cursor +=
            ".click".length;

        while (
            cursor <
                sourceText.length &&
            /\s/.test(
                sourceText[cursor]
            )
        ) {
            cursor +=
                1;
        }

        if (
            sourceText[cursor] !==
            "("
        ) {
            searchIndex =
                literalEnd;

            continue;
        }

        if (
            decoded !== null
        ) {
            calls.push({
                selector:
                    normalizeSelector(
                        decoded
                    ),

                literalStart,
                literalEnd,
            });
        }

        searchIndex =
            cursor + 1;
    }

    return calls;
}

function buildUpdatedSpecSource({
    sourceText,
    clickIndex,
    selectorHint,
    recordedSelector,
    healedSelector,
}) {
    const calls =
        findDirectLocatorClickCalls(
            sourceText
        );

    if (!calls.length) {
        throw new Error(
            "executing spec contains no direct " +
            "page.locator(...).click() statements"
        );
    }

    const hint =
        normalizeSelector(
            selectorHint
        );

    const recorded =
        normalizeSelector(
            recordedSelector
        );

    let selected =
        calls[
            clickIndex
        ] ||
        null;

    if (
        selected &&
        hint &&
        selected.selector !==
            hint &&
        selected.selector !==
            recorded
    ) {
        selected =
            null;
    }

    if (!selected) {
        const matches =
            calls.filter(
                call =>
                    (
                        call.selector ===
                            hint ||
                        call.selector ===
                            recorded
                    )
            );

        if (
            matches.length !==
            1
        ) {
            throw new Error(
                [
                    "could not identify exact click statement in spec",

                    `clickIndex=${clickIndex}`,

                    `selectorHint=${hint}`,

                    `recordedSelector=${recorded}`,

                    `matchingCalls=${matches.length}`,

                    `directClickCalls=${calls.length}`,
                ].join("; ")
            );
        }

        selected =
            matches[0];
    }

    return (
        sourceText.slice(
            0,
            selected
                .literalStart
        ) +
        JSON.stringify(
            normalizeSelector(
                healedSelector
            )
        ) +
        sourceText.slice(
            selected
                .literalEnd
        )
    );
}

function writeFileSafely(
    filePath,
    content
) {
    const temporaryPath =
        path.join(
            path.dirname(
                filePath
            ),
            (
                `.${path.basename(
                    filePath
                )}.` +
                `smart-click-${process.pid}-` +
                `${Date.now()}.tmp`
            )
        );

    fs.writeFileSync(
        temporaryPath,
        content,
        "utf8"
    );

    try {
        fs.renameSync(
            temporaryPath,
            filePath
        );
    } catch {
        try {
            fs.copyFileSync(
                temporaryPath,
                filePath
            );
        } finally {
            fs.rmSync(
                temporaryPath,
                {
                    force:
                        true,
                }
            );
        }
    }
}

function verifyPersistedHealedXPath({
    testFilePath,
    actionsPath,
    traceActionIndex,
    clickIndex,
    healedSelector,
    healedPrimaryXPath,
    healedBackupXPath,
}) {
    const expectedSelector =
        normalizeSelector(
            healedSelector
        );

    const specSource =
        fs.readFileSync(
            testFilePath,
            "utf8"
        );

    const specSelectors =
        findDirectLocatorClickCalls(
            specSource
        ).map(
            call =>
                call.selector
        );

    if (
        specSelectors[
            clickIndex
        ] !==
        expectedSelector
    ) {
        throw new Error(
            `spec read-back verification ` +
            `failed at clickIndex=${clickIndex}; ` +
            `expected=${expectedSelector}; ` +
            `actual=${
                specSelectors[
                    clickIndex
                ] ||
                ""
            }`
        );
    }

    const actions =
        JSON.parse(
            fs.readFileSync(
                actionsPath,
                "utf8"
            )
        );

    const persisted =
        actions[
            traceActionIndex
        ];

    if (
        !persisted ||
        persisted.action !==
            "click"
    ) {
        throw new Error(
            "actions JSON read-back could " +
            "not find matching click action"
        );
    }

    if (
        normalizeSelector(
            persisted.selector
        ) !==
        expectedSelector
    ) {
        throw new Error(
            "actions JSON selector read-back " +
            "verification failed"
        );
    }

    if (
        stripXPathPrefix(
            persisted
                .primary_xpath
        ) !==
        stripXPathPrefix(
            healedPrimaryXPath
        )
    ) {
        throw new Error(
            "actions JSON primary_xpath " +
            "read-back verification failed"
        );
    }

    if (
        stripXPathPrefix(
            persisted
                .backup_xpath
        ) !==
        stripXPathPrefix(
            healedBackupXPath
        )
    ) {
        throw new Error(
            "actions JSON backup_xpath " +
            "read-back verification failed"
        );
    }
}

function persistHealedXPath({
    testFilePath,
    actionsPath,
    traceActionIndex,
    clickIndex,
    selectorHint,
    action,
    healed,
}) {
    if (
        !testFilePath ||
        !fs.existsSync(
            testFilePath
        )
    ) {
        throw new Error(
            (
                `executing spec file does not exist: ` +
                `${testFilePath || ""}`
            )
        );
    }

    if (
        !actionsPath ||
        !fs.existsSync(
            actionsPath
        )
    ) {
        throw new Error(
            (
                `actions JSON file does not exist: ` +
                `${actionsPath || ""}`
            )
        );
    }

    console.warn(
        [
            "[smart-click]",

            "Persisting sequentially reconstructed selector.",

            `spec=${testFilePath}`,

            `actions=${actionsPath}`,

            `clickIndex=${clickIndex}`,

            `traceActionIndex=${traceActionIndex}`,

            `oldSelector=${action.selector}`,

            `newSelector=${healed.selector}`,
        ].join(" ")
    );

    const originalSpec =
        fs.readFileSync(
            testFilePath,
            "utf8"
        );

    const originalActions =
        fs.readFileSync(
            actionsPath,
            "utf8"
        );

    const updatedSpec =
        buildUpdatedSpecSource({
            sourceText:
                originalSpec,

            clickIndex,
            selectorHint,

            recordedSelector:
                action.selector,

            healedSelector:
                healed.selector,
        });

    const parsedActions =
        JSON.parse(
            originalActions
        );

    if (
        !Array.isArray(
            parsedActions
        )
    ) {
        throw new Error(
            "actions JSON root is not an array"
        );
    }

    const actionToUpdate =
        parsedActions[
            traceActionIndex
        ];

    if (
        !actionToUpdate ||
        actionToUpdate.action !==
            "click"
    ) {
        throw new Error(
            (
                "matching click action not found in actions JSON; " +
                `traceActionIndex=${traceActionIndex}`
            )
        );
    }

    actionToUpdate.selector =
        normalizeSelector(
            healed.selector
        );

    actionToUpdate.primary_xpath =
        stripXPathPrefix(
            healed.primary_xpath
        );

    actionToUpdate.backup_xpath =
        stripXPathPrefix(
            healed.backup_xpath
        );

    const updatedActions =
        (
            `${JSON.stringify(
                parsedActions,
                null,
                2
            )}\n`
        );

    let actionsWritten =
        false;

    try {
        writeFileSafely(
            actionsPath,
            updatedActions
        );

        actionsWritten =
            true;

        writeFileSafely(
            testFilePath,
            updatedSpec
        );

        verifyPersistedHealedXPath({
            testFilePath,
            actionsPath,
            traceActionIndex,
            clickIndex,

            healedSelector:
                healed.selector,

            healedPrimaryXPath:
                healed.primary_xpath,

            healedBackupXPath:
                healed.backup_xpath,
        });
    } catch (error) {
        if (actionsWritten) {
            try {
                writeFileSafely(
                    actionsPath,
                    originalActions
                );
            } catch {}
        }

        try {
            writeFileSafely(
                testFilePath,
                originalSpec
            );
        } catch {}

        throw error;
    }

    action.selector =
        normalizeSelector(
            healed.selector
        );

    action.primary_xpath =
        stripXPathPrefix(
            healed.primary_xpath
        );

    action.backup_xpath =
        stripXPathPrefix(
            healed.backup_xpath
        );

    return {
        testFilePath,
        actionsPath,
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
            traceActions;

        this.testFilePath =
            runtimeContext
                .testFilePath ||
            "";

        this.actionsPath =
            runtimeContext
                .actionsPath ||
            "";

        this.clickEntries =
            traceActions
                .map(
                    (
                        action,
                        traceActionIndex
                    ) => ({
                        action,
                        traceActionIndex,
                    })
                )
                .filter(
                    entry =>
                        (
                            entry.action
                                ?.action ===
                            "click"
                        )
                );

        this.actionStates =
            this.clickEntries.map(
                () =>
                    "unused"
            );
    }

    reserveMatchingAction(
        selectorHint
    ) {
        const hint =
            normalizeSelector(
                selectorHint
            );

        if (hint) {
            const index =
                this.clickEntries
                    .findIndex(
                        (
                            entry,
                            candidateIndex
                        ) =>
                            (
                                this
                                    .actionStates[
                                        candidateIndex
                                    ] ===
                                    "unused" &&
                                normalizeSelector(
                                    entry
                                        .action
                                        .selector
                                ) ===
                                    hint
                            )
                    );

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
                    this.clickEntries[
                        index
                    ].action,

                traceActionIndex:
                    this.clickEntries[
                        index
                    ].traceActionIndex,

                matchedBy:
                    "selector",
            };
        }

        const index =
            this.actionStates
                .findIndex(
                    state =>
                        state ===
                        "unused"
                );

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
                this.clickEntries[
                    index
                ].action,

            traceActionIndex:
                this.clickEntries[
                    index
                ].traceActionIndex,

            matchedBy:
                "sequence",
        };
    }

    completeAction(
        index
    ) {
        this.actionStates[
            index
        ] =
            "used";
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

    async click(
        requestedLocator,
        selectorHint,
        options = {}
    ) {
        const reserved =
            this.reserveMatchingAction(
                selectorHint
            );

        if (!reserved) {
            await requestedLocator.click(
                options
            );

            return;
        }

        const {
            action,

            index:
                actionIndex,

            traceActionIndex,
            matchedBy,
        } =
            reserved;

        const timeout =
            options.timeout ??
            10000;

        const root =
            getTraceRoot(
                this.page,
                action
            );

        const definitions =
            orderCandidates(
                createTraceCandidates(
                    this.page,
                    action
                )
            );

        const failures =
            [];

        const resolvedHandles =
            [];

        let requestedHandle =
            null;

        let chosenCandidate =
            null;

        let healed =
            null;

        let completed =
            false;

        try {
            for (
                const definition of
                definitions
            ) {
                const sourceName =
                    definition
                        .sources
                        .join("+");

                const resolution =
                    await resolveUniqueCandidate(
                        definition,
                        timeout
                    );

                if (
                    !resolution
                        .candidate
                ) {
                    failures.push({
                        sources:
                            definition
                                .sources,

                        value:
                            definition
                                .value,

                        stage:
                            "resolution",

                        reason:
                            resolution
                                .reason,
                    });

                    console.warn(
                        (
                            `[smart-click] candidate failed ` +
                            `source=${sourceName} ` +
                            `stage=resolution ` +
                            `locator=${definition.value} ` +
                            `reason=${resolution.reason}`
                        )
                    );

                    continue;
                }

                const candidate =
                    resolution
                        .candidate;

                resolvedHandles.push(
                    candidate.handle
                );

                const metadataMatched =
                    await matchesRecordedMetadata(
                        candidate.handle,
                        action
                    );

                if (
                    !metadataMatched
                ) {
                    failures.push({
                        sources:
                            candidate
                                .sources,

                        value:
                            candidate
                                .value,

                        stage:
                            "metadata",

                        reason:
                            "resolved element did not match recorded metadata",
                    });

                    console.warn(
                        (
                            `[smart-click] candidate failed ` +
                            `source=${sourceName} ` +
                            `stage=metadata ` +
                            `locator=${candidate.value} ` +
                            `reason=resolved element did not match recorded metadata`
                        )
                    );

                    continue;
                }

                if (
                    options.force ===
                    true
                ) {
                    chosenCandidate =
                        candidate;

                    break;
                }

                try {
                    await candidate
                        .locator
                        .click({
                            ...options,

                            trial:
                                true,
                        });

                    chosenCandidate =
                        candidate;

                    break;
                } catch (error) {
                    const reason =
                        formatError(
                            error
                        );

                    failures.push({
                        sources:
                            candidate
                                .sources,

                        value:
                            candidate
                                .value,

                        stage:
                            "actionability",

                        reason,
                    });

                    console.warn(
                        (
                            `[smart-click] candidate failed ` +
                            `source=${sourceName} ` +
                            `stage=actionability ` +
                            `locator=${candidate.value} ` +
                            `reason=${reason}`
                        )
                    );
                }
            }

            if (
                !chosenCandidate
            ) {
                throw new Error(
                    [
                        "",

                        "[smart-click] Click rejected.",

                        "The selector, primary XPath and backup XPath all failed.",

                        "",

                        `selector: ${action.selector || ""}`,

                        `primary_xpath: ${action.primary_xpath || ""}`,

                        `backup_xpath: ${action.backup_xpath || ""}`,

                        "",

                        "Attempts:",

                        ...failures.map(
                            failure =>
                                (
                                    `- ${failure
                                        .sources
                                        .join("+")} ` +
                                    `stage=${failure.stage} ` +
                                    `locator=${failure.value} ` +
                                    `reason=${failure.reason}`
                                )
                        ),
                    ].join("\n")
                );
            }

            const selectorWorked =
                chosenCandidate
                    .sources
                    .includes(
                        "selector"
                    );

            const fallbackWorked =
                chosenCandidate
                    .sources
                    .some(
                        source =>
                            (
                                source ===
                                    "primary_xpath" ||
                                source ===
                                    "backup_xpath"
                            )
                    );

            const fallbackSource =
                chosenCandidate
                    .sources
                    .filter(
                        source =>
                            source !==
                            "selector"
                    )
                    .join("+");

            if (
                !selectorWorked &&
                fallbackWorked
            ) {
                const reconstruction =
                    await reconstructSelectorFromFallback({
                        root,
                        action,

                        targetHandle:
                            chosenCandidate
                                .handle,

                        timeout,
                    });

                if (
                    reconstruction
                        .healed
                ) {
                    const reconstructedLocator =
                        root.locator(
                            reconstruction
                                .selector
                        );

                    try {
                        if (
                            options.force !==
                            true
                        ) {
                            await reconstructedLocator.click({
                                ...options,

                                trial:
                                    true,
                            });
                        }

                        healed =
                            reconstruction;

                        console.warn(
                            [
                                "[smart-click]",

                                "Normal selector failed.",

                                `${fallbackSource} identified the intended element.`,

                                `strategy=${healed.strategy}`,

                                `failedSegment=${healed.failedSegment}`,

                                `failedStrategy=${healed.failedStrategy}`,

                                `failedStrategyIndex=${healed.failedStrategyIndex}`,

                                `replacementStrategy=${healed.replacementStrategy}`,

                                `replacementStrategyIndex=${healed.replacementStrategyIndex}`,

                                `repairDepth=${healed.firstRepairAbsoluteDepth}`,

                                `anchorDistanceAboveFailedDepth=${
                                    healed
                                        .anchorDistanceAboveFailedDepth ??
                                    0
                                }`,

                                `anchor=${healed.anchorXPath}`,

                                `oldSelector=${action.selector}`,

                                `newSelector=${healed.selector}`,
                            ].join(" ")
                        );
                    } catch (error) {
                        console.warn(
                            (
                                "[smart-click] Sequential XPath strategy " +
                                "reconstruction found the exact node but " +
                                "was not actionable. " +
                                `reason=${formatError(error)}`
                            )
                        );
                    }
                } else {
                    console.warn(
                        (
                            `[smart-click] ${fallbackSource} worked, ` +
                            `but sequential XPath strategy reconstruction failed. ` +
                            `failedSegment=${reconstruction.failedSegment || ""} ` +
                            `failedStrategy=${reconstruction.failedStrategy || ""} ` +
                            `reason=${reconstruction.reason}`
                        )
                    );
                }
            }

            requestedHandle =
                await resolveRequestedElement(
                    requestedLocator,
                    Math.min(
                        timeout,
                        2000
                    )
                );

            const requestedAgreed =
                requestedHandle
                    ? (
                        await pointsToSameNode(
                            requestedHandle,
                            chosenCandidate
                                .handle
                        )
                    )
                    : false;

            if (
                options.trial ===
                true
            ) {
                console.log(
                    (
                        `[smart-click] trial=true ` +
                        `matchedBy=${matchedBy} ` +
                        `used=${chosenCandidate.sources.join("+")} ` +
                        `requestedAgreed=${requestedAgreed} ` +
                        `locator=${chosenCandidate.value}`
                    )
                );

                return;
            }

            if (
                !selectorWorked
            ) {
                console.warn(
                    (
                        "[smart-click] Normal selector failed. " +
                        `Falling back to ${chosenCandidate.sources.join("+")}. ` +
                        `locator=${chosenCandidate.value}`
                    )
                );
            }

            const executionLocator =
                healed
                    ? root.locator(
                        healed.selector
                    )
                    : chosenCandidate
                        .locator;

            /*
             * Exactly one real click is dispatched.
             */
            await executionLocator.click(
                options
            );

            completed =
                true;

            this.completeAction(
                actionIndex
            );

            /*
             * Persistence happens only after the real click succeeds.
             */
            if (healed) {
                try {
                    const persistence =
                        persistHealedXPath({
                            testFilePath:
                                this.testFilePath,

                            actionsPath:
                                this.actionsPath,

                            traceActionIndex,

                            clickIndex:
                                actionIndex,

                            selectorHint,
                            action,
                            healed,
                        });

                    console.warn(
                        (
                            "[smart-click] Persisted and verified " +
                            "sequentially reconstructed selector. " +
                            `spec=${persistence.testFilePath} ` +
                            `actions=${persistence.actionsPath} ` +
                            `selector=${healed.selector}`
                        )
                    );
                } catch (error) {
                    /*
                     * The application click has already succeeded.
                     * A persistence failure must never dispatch another click.
                     */
                    console.warn(
                        (
                            "[smart-click] The click succeeded, " +
                            "but selector persistence failed. " +
                            `reason=${formatError(error)}`
                        )
                    );
                }
            }

            console.log(
                (
                    `[smart-click] ` +
                    `matchedBy=${matchedBy} ` +
                    `used=${
                        healed
                            ? "reconstructed_selector"
                            : chosenCandidate
                                .sources
                                .join("+")
                    } ` +
                    `requestedAgreed=${requestedAgreed} ` +
                    `locator=${
                        healed
                            ? healed.selector
                            : chosenCandidate
                                .value
                    }`
                )
            );
        } finally {
            if (!completed) {
                this.releaseAction(
                    actionIndex
                );
            }

            await disposeHandles([
                requestedHandle,
                ...resolvedHandles,
            ]);
        }
    }
}

function createSmartClickPage(
    page,
    traceActions,
    runtimeContext = {}
) {
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
            "getByTestId",
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
                        "click"
                    ) {
                        return (
                            options
                        ) =>
                            controller.click(
                                target,
                                selectorHint,
                                options || {}
                            );
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
                            return wrapLocator(
                                result,
                                selectorHint
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
                },
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
                        ) =>
                            wrapFrameLocator(
                                value.apply(
                                    target,
                                    args
                                )
                            );
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
                                    ? args[0]
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
                },
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
                    ) =>
                        wrapFrameLocator(
                            value.apply(
                                target,
                                args
                            )
                        );
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
                                ? args[0]
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
            },
        }
    );
}

module.exports = {
    createSmartClickPage,
};
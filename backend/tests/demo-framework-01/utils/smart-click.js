function normalizeSelector(value) {
    const trimmed = String(value || "").trim();

    if (!trimmed) {
        return "";
    }

    if (/^xpath=/i.test(trimmed)) {
        return (
            "xpath=" +
            trimmed.replace(/^xpath=/i, "")
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

function toXPathSelector(value) {
    const trimmed = String(value || "").trim();

    if (!trimmed) {
        return "";
    }

    return /^xpath=/i.test(trimmed)
        ? normalizeSelector(trimmed)
        : `xpath=${trimmed}`;
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

function getTraceRoot(
    page,
    action
) {
    let root = page;

    for (
        const iframeSelector of
        action.frameChain || []
    ) {
        root =
            root.frameLocator(
                iframeSelector
            );
    }

    return root;
}

/**
 * Creates the recorded click candidates.
 *
 * Candidate order:
 *
 * 1. selector
 * 2. primary_xpath
 * 3. backup_xpath
 *
 * When two fields contain the exact same locator expression, they are
 * represented by one candidate with multiple sources.
 */
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

    function addDefinition(
        source,
        value
    ) {
        if (!value) {
            return;
        }

        const existingSources =
            definitions.get(value);

        if (existingSources) {
            if (
                !existingSources.includes(
                    source
                )
            ) {
                existingSources.push(
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

    addDefinition(
        "selector",
        normalizeSelector(
            action.selector
        )
    );

    addDefinition(
        "primary_xpath",
        toXPathSelector(
            action.primary_xpath
        )
    );

    addDefinition(
        "backup_xpath",
        toXPathSelector(
            action.backup_xpath
        )
    );

    return Array.from(
        definitions.entries()
    ).map(
        ([
            value,
            sources
        ]) => ({
            value,
            sources,
            locator:
                root.locator(value)
        })
    );
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

/**
 * Resolves one candidate.
 *
 * A candidate is usable only when it resolves to exactly one attached DOM
 * element.
 */
async function resolveUniqueCandidate(
    definition,
    timeout
) {
    try {
        await definition.locator.waitFor({
            state:
                "attached",

            timeout
        });

        const count =
            await definition.locator.count();

        if (count !== 1) {
            return {
                candidate:
                    null,

                reason:
                    `resolved to ${count} elements instead of exactly 1`
            };
        }

        const handle =
            await definition.locator
                .elementHandle();

        if (!handle) {
            return {
                candidate:
                    null,

                reason:
                    "resolved uniquely but no ElementHandle was available"
            };
        }

        return {
            candidate: {
                ...definition,
                handle
            },

            reason:
                null
        };
    } catch (error) {
        return {
            candidate:
                null,

            reason:
                formatError(error)
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

            timeout
        });

        const count =
            await locator.count();

        if (count !== 1) {
            return null;
        }

        return (
            await locator.elementHandle()
        );
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

/**
 * Confirms that a resolved locator resembles the element captured during
 * recording.
 *
 * Dynamic IDs and href values are not mandatory because they may change
 * between recording and playback.
 */
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
                function normalizeText(
                    value
                ) {
                    return String(value || "")
                        .trim()
                        .replace(/\s+/g, " ");
                }

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
                    ]
                ];

                let strongMetadataCount =
                    0;

                for (
                    const [
                        expectedValue,
                        attributeName
                    ] of checks
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

                    strongMetadataCount +=
                        1;

                    const actualValue =
                        element.getAttribute(
                            attributeName
                        );

                    if (
                        actualValue !==
                        String(
                            expectedValue
                        )
                    ) {
                        return false;
                    }
                }

                /*
                 * If no strong attributes were captured, use the recorded
                 * text to guard positional XPath fallbacks.
                 */
                if (
                    strongMetadataCount ===
                    0
                ) {
                    const normalizedExpectedText =
                        normalizeText(
                            expectedText
                        );

                    if (
                        normalizedExpectedText
                    ) {
                        const normalizedActualText =
                            normalizeText(
                                element.textContent
                            ).slice(
                                0,
                                100
                            );

                        if (
                            normalizedActualText !==
                            normalizedExpectedText
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

/**
 * Runtime preference:
 *
 * 1. selector
 * 2. primary_xpath
 * 3. backup_xpath
 */
function candidatePriority(
    candidate
) {
    if (
        candidate.sources.includes(
            "selector"
        )
    ) {
        return 1;
    }

    if (
        candidate.sources.includes(
            "primary_xpath"
        )
    ) {
        return 2;
    }

    if (
        candidate.sources.includes(
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
        ...candidates
    ].sort(
        (
            first,
            second
        ) =>
            candidatePriority(first) -
            candidatePriority(second)
    );
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

class SmartClickController {
    constructor(
        page,
        traceActions
    ) {
        this.page =
            page;

        this.clickActions =
            traceActions.filter(
                action =>
                    action?.action ===
                    "click"
            );

        this.actionStates =
            this.clickActions.map(
                () =>
                    "unused"
            );
    }

    reserveMatchingAction(
        selectorHint
    ) {
        const normalizedHint =
            normalizeSelector(
                selectorHint
            );

        /*
         * Direct page.locator("...").click() calls are matched against the
         * exact selector recorded in actions.json.
         */
        if (normalizedHint) {
            const matchingIndex =
                this.clickActions.findIndex(
                    (
                        action,
                        index
                    ) => {
                        return (
                            this.actionStates[
                                index
                            ] ===
                                "unused" &&
                            normalizeSelector(
                                action.selector
                            ) ===
                                normalizedHint
                        );
                    }
                );

            if (
                matchingIndex >=
                0
            ) {
                this.actionStates[
                    matchingIndex
                ] =
                    "reserved";

                return {
                    index:
                        matchingIndex,

                    action:
                        this.clickActions[
                            matchingIndex
                        ],

                    matchedBy:
                        "selector"
                };
            }

            /*
             * Do not consume a different trace action when a raw locator
             * selector was supplied but no matching recorded action exists.
             */
            return null;
        }

        /*
         * Semantic or chained locators may not expose their original raw
         * selector. Match those to the next unused click by sequence.
         */
        const nextIndex =
            this.actionStates.findIndex(
                state =>
                    state ===
                    "unused"
            );

        if (nextIndex < 0) {
            return null;
        }

        this.actionStates[
            nextIndex
        ] =
            "reserved";

        return {
            index:
                nextIndex,

            action:
                this.clickActions[
                    nextIndex
                ],

            matchedBy:
                "sequence"
        };
    }

    completeAction(index) {
        this.actionStates[index] =
            "used";
    }

    releaseAction(index) {
        if (
            this.actionStates[index] ===
            "reserved"
        ) {
            this.actionStates[index] =
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

        /*
         * No recorded click matched this test locator. Run the original
         * Playwright click normally.
         */
        if (!reserved) {
            await requestedLocator.click(
                options
            );

            return;
        }

        const {
            action,
            index: actionIndex,
            matchedBy
        } = reserved;

        const timeout =
            options.timeout ??
            10000;

        const candidateDefinitions =
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

        let completed =
            false;

        try {
            /*
             * Evaluate candidates one at a time.
             *
             * The fallback candidate is not checked until the candidate
             * before it has actually failed.
             */
            for (
                const definition of
                candidateDefinitions
            ) {
                const sourceName =
                    definition.sources.join(
                        "+"
                    );

                const resolution =
                    await resolveUniqueCandidate(
                        definition,
                        timeout
                    );

                if (
                    !resolution.candidate
                ) {
                    failures.push({
                        sources:
                            definition.sources,

                        value:
                            definition.value,

                        stage:
                            "resolution",

                        reason:
                            resolution.reason
                    });

                    console.warn(
                        [
                            "[smart-click]",
                            `candidate failed source=${sourceName}`,
                            "stage=resolution",
                            `locator=${definition.value}`,
                            `reason=${resolution.reason}`
                        ].join(" ")
                    );

                    continue;
                }

                const candidate =
                    resolution.candidate;

                resolvedHandles.push(
                    candidate.handle
                );

                const metadataMatched =
                    await matchesRecordedMetadata(
                        candidate.handle,
                        action
                    );

                if (!metadataMatched) {
                    failures.push({
                        sources:
                            candidate.sources,

                        value:
                            candidate.value,

                        stage:
                            "metadata",

                        reason:
                            "resolved element did not match the recorded metadata"
                    });

                    console.warn(
                        [
                            "[smart-click]",
                            `candidate failed source=${sourceName}`,
                            "stage=metadata",
                            `locator=${candidate.value}`,
                            "reason=resolved element did not match the recorded metadata"
                        ].join(" ")
                    );

                    continue;
                }

                /*
                 * force:true intentionally skips normal Playwright
                 * actionability checks.
                 */
                if (
                    options.force ===
                    true
                ) {
                    chosenCandidate =
                        candidate;

                    break;
                }

                try {
                    /*
                     * A trial click checks visibility, stability, enabled
                     * state and pointer-event reception without dispatching
                     * the real click.
                     */
                    await candidate.locator.click({
                        ...options,
                        trial:
                            true
                    });

                    chosenCandidate =
                        candidate;

                    break;
                } catch (error) {
                    const reason =
                        formatError(error);

                    failures.push({
                        sources:
                            candidate.sources,

                        value:
                            candidate.value,

                        stage:
                            "actionability",

                        reason
                    });

                    console.warn(
                        [
                            "[smart-click]",
                            `candidate failed source=${sourceName}`,
                            "stage=actionability",
                            `locator=${candidate.value}`,
                            `reason=${reason}`
                        ].join(" ")
                    );
                }
            }

            if (!chosenCandidate) {
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
                                [
                                    `- ${failure.sources.join("+")}`,
                                    `stage=${failure.stage}`,
                                    `locator=${failure.value}`,
                                    `reason=${failure.reason}`
                                ].join(" ")
                        )
                    ].join("\n")
                );
            }

            /*
             * Compare the original test locator to the locator chosen by the
             * fallback system. This is diagnostic only and does not block the
             * click.
             */
            requestedHandle =
                await resolveRequestedElement(
                    requestedLocator,
                    Math.min(
                        timeout,
                        2000
                    )
                );

            let requestedLocatorAgreed =
                false;

            if (requestedHandle) {
                requestedLocatorAgreed =
                    await pointsToSameNode(
                        requestedHandle,
                        chosenCandidate.handle
                    );
            }

            /*
             * A caller explicitly requesting trial:true expects no real
             * click and should not consume the recorded click action.
             */
            if (
                options.trial ===
                true
            ) {
                console.log(
                    [
                        "[smart-click]",
                        "trial=true",
                        `matchedBy=${matchedBy}`,
                        `used=${chosenCandidate.sources.join("+")}`,
                        `requestedAgreed=${requestedLocatorAgreed}`,
                        `locator=${chosenCandidate.value}`
                    ].join(" ")
                );

                return;
            }

            if (
                !chosenCandidate.sources.includes(
                    "selector"
                )
            ) {
                console.warn(
                    [
                        "[smart-click]",
                        "Normal selector failed.",
                        `Falling back to ${chosenCandidate.sources.join("+")}.`,
                        `locator=${chosenCandidate.value}`
                    ].join(" ")
                );
            }

            /*
             * Perform exactly one real click.
             *
             * No alternative locator is attempted after this begins because
             * the click may already have changed application state before an
             * error is reported.
             */
            await chosenCandidate
                .locator
                .click(options);

            completed =
                true;

            this.completeAction(
                actionIndex
            );

            console.log(
                [
                    "[smart-click]",
                    `matchedBy=${matchedBy}`,
                    `used=${chosenCandidate.sources.join("+")}`,
                    `requestedAgreed=${requestedLocatorAgreed}`,
                    `locator=${chosenCandidate.value}`
                ].join(" ")
            );
        } finally {
            /*
             * A failed click, or a trial-only click, leaves the recorded
             * action available for another attempt.
             */
            if (!completed) {
                this.releaseAction(
                    actionIndex
                );
            }

            await disposeHandles([
                requestedHandle,
                ...resolvedHandles
            ]);
        }
    }
}

/**
 * Returns a Proxy around Playwright's Page.
 *
 * Only Locator.click() is intercepted.
 *
 * fill(), press(), hover(), check(), selectOption(), goto(), waitFor() and
 * all other Playwright methods remain unchanged.
 */
function createSmartClickPage(
    page,
    traceActions
) {
    const controller =
        new SmartClickController(
            page,
            traceActions
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

                        /*
                         * Preserve interception for chained locators:
                         *
                         * page.locator(...).first().click()
                         * page.locator(...).filter(...).click()
                         * page.locator(...).nth(...).click()
                         */
                        if (
                            isLocatorLike(
                                result
                            )
                        ) {
                            return wrapLocator(
                                result
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
                        ) =>
                            wrapFrameLocator(
                                value.apply(
                                    target,
                                    args
                                )
                            );
                    }

                    if (
                        locatorFactoryNames.has(
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
                                property ===
                                    "locator" &&
                                typeof args[0] ===
                                    "string"
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
                    ) =>
                        wrapFrameLocator(
                            value.apply(
                                target,
                                args
                            )
                        );
                }

                if (
                    locatorFactoryNames.has(
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
                            property ===
                                "locator" &&
                            typeof args[0] ===
                                "string"
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
            }
        }
    );
}

module.exports = {
    createSmartClickPage
};
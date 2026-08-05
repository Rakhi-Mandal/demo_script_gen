console.log(
    "[smart-click] Exact XPath staged-actionability implementation loaded:",
    __filename
);

/*
 * smart-test.js owns the delayed retry and staged readiness probing.
 *
 * This file:
 *
 * - uses only the recorded action.selector;
 * - ignores primary_xpath and backup_xpath;
 * - performs no internal sleep or retry loop;
 * - supports the longer timeout supplied by smart-test.js;
 * - does not perform an unnecessary short trial before a unique real click;
 * - uses trial clicks only when smart-test.js explicitly requests one or when
 *   duplicate XPath matches must be disambiguated;
 * - releases failed and trial action reservations so the same recorded action
 *   can be retried.
 */
const SMART_CLICK_DEFAULT_TIMEOUT_MS =
    15000;

const SMART_CLICK_MAX_TIMEOUT_MS =
    60000;

const SMART_CLICK_MATCH_POLL_INTERVAL_MS =
    100;

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

function formatError(
    error
) {
    return (
        error instanceof Error
            ? error.message
            : String(
                error
            )
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
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

/*
 * Resolves one exact recorded XPath.
 *
 * Unique match:
 *
 * - The XPath is trusted.
 * - Recorded metadata is diagnostic only.
 * - A real click does not receive a preliminary trial click.
 * - A trial is performed only when options.trial=true.
 *
 * Duplicate matches:
 *
 * - The XPath itself is not changed.
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
    const selector =
        normalizeSelector(
            action.selector
        );

    if (!selector) {
        throw new Error(
            "Recorded click contains no selector"
        );
    }

    if (
        !isXPathSelector(
            selector
        )
    ) {
        throw new Error(
            (
                "Recorded click selector is not XPath: " +
                `${selector}`
            )
        );
    }

    const locator =
        root.locator(
            selector
        );

    const count =
        await waitForAtLeastOneMatch(
            locator,
            timeout
        );

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
                Math.max(
                    1,
                    deadline -
                    Date.now()
                )
            );

        const metadataMatched =
            await matchesRecordedMetadata(
                handle,
                action
            );

        try {
            /*
             * smart-test.js uses trial=true during staged readiness probing.
             * Honor that trial using the complete remaining timeout.
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
                        Math.max(
                            1,
                            deadline -
                            Date.now()
                        )
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
            "duplicate-disambiguation"
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

        this.clickEntries =
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
                            entry.action
                                ?.action ===
                            "click" &&
                            isXPathSelector(
                                entry.action
                                    ?.selector
                            )
                        );
                    }
                );

        this.actionStates =
            this.clickEntries.map(
                () => {
                    return "unused";
                }
            );
    }

    reserveMatchingAction(
        selectorHint
    ) {
        const hint =
            normalizeSelector(
                selectorHint
            );

        /*
         * Only an explicit XPath locator exactly matching a recorded action
         * is intercepted.
         *
         * Ordinary locators, getBy* locators, unmatched XPath selectors and
         * tests without trace actions continue through normal Playwright.
         */
        if (
            !hint ||
            !isXPathSelector(
                hint
            )
        ) {
            return null;
        }

        const index =
            this.clickEntries
                .findIndex(
                    (
                        entry,
                        candidateIndex
                    ) => {
                        return (
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
                        );
                    }
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
                "exact-selector"
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

        /*
         * No exact recorded action matches this locator. Preserve ordinary
         * Playwright behavior.
         */
        if (!reserved) {
            return requestedLocator.click(
                options
            );
        }

        const {
            action,
            index:
                actionIndex,
            matchedBy
        } =
            reserved;

        const timeout =
            getAttemptTimeoutMs(
                options
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
                    options,
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

            const requestedAgreed =
                requestedHandle
                    ? (
                        await pointsToSameNode(
                            requestedHandle,
                            chosenHandle
                        )
                    )
                    : false;

            /*
             * smart-test.js uses trial clicks to determine readiness. A trial
             * never consumes the recorded action.
             */
            if (
                options.trial ===
                true
            ) {
                console.log(
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
                    ...options,

                    trial:
                        false,

                    timeout
                });

            completed =
                true;

            this.completeAction(
                actionIndex
            );

            console.log(
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
                this.releaseAction(
                    actionIndex
                );
            }

            await disposeHandles([
                requestedHandle,
                chosenHandle
            ]);
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
                    action?.action ===
                        "click" &&
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
    createSmartClickPage
};
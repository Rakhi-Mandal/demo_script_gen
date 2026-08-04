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

/**
 * Supports either listeners.js export style:
 *
 *     module.exports = {
 *         injectListeners
 *     };
 *
 * or:
 *
 *     module.exports = injectListeners;
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
        typeof moduleValue
            .injectListeners ===
            "function"
    ) {
        return moduleValue
            .injectListeners;
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

/**
 * Explicitly serialize the listener function into executable browser-side
 * JavaScript.
 *
 * This avoids passing an undefined or unsupported module value directly to
 * BrowserContext.addInitScript().
 */
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
    500;

const SELECTOR_REQUIRED_ACTIONS =
    new Set([
        "click",
        "input",
        "select",
        "checkbox",
        "radio",
        "file-upload",
        "focus"
    ]);

const actions = [];

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

function timestamp() {
    return new Date()
        .toISOString()
        .replace(
            /[:.]/g,
            "-"
        )
        .slice(
            0,
            19
        );
}

function delay(ms) {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
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

/**
 * Accepts either:
 *
 *     //button[@*[name()='custom-key' and .='submit']]
 *
 * or:
 *
 *     xpath=//button[@*[name()='custom-key' and .='submit']]
 *
 * Returns only the raw XPath expression.
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

/**
 * Click selectors must always be XPath selectors.
 *
 * The selector may be generated from:
 *
 * - any locally discovered unique attribute;
 * - starts-with() or contains();
 * - normalize-space(.) as a lower-priority fallback;
 * - ancestor/descendant relationships;
 * - following-sibling:: or preceding-sibling::;
 * - following:: or preceding::;
 * - an indexed structural fallback.
 */
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

function removeInternalClickFields(
    action
) {
    delete action.clickId;
    delete action.xpathKey;
    delete action.sequence;

    delete action.capturedAction;
    delete action.candidates;
    delete action.fingerprint;
    delete action.frameInfo;
    delete action.clickEvent;
    delete action.clickDetail;

    delete action.primaryXPath;
    delete action.backupXPath;
    delete action.normalXPath;
    delete action.normal_xpath;

    /*
     * Final click output contains:
     *
     * selector
     * primary_xpath
     * backup_xpath
     */
    delete action.xpath;

    /*
     * URL is internal click-capture metadata.
     */
    delete action.url;

    return action;
}

/**
 * Builds the final click action exclusively from locator values generated
 * and validated before the physical click in listeners.js.
 *
 * This function does not inspect the post-click DOM.
 */
function buildAcceptedClickAction(
    job
) {
    const capturedAction =
        (
            job?.capturedAction &&
            typeof job
                .capturedAction ===
                "object"
        )
            ? {
                ...job.capturedAction
            }
            : {
                action:
                    "click",

                text:
                    job?.text ??
                    null,

                element:
                    job?.element ??
                    null,

                isIframe:
                    Boolean(
                        job?.frameInfo &&
                        !job.frameInfo
                            .isTopFrame
                    )
            };

    /*
     * selector:
     *
     * The graph-generated normal XPath produced and validated before the
     * click.
     */
    const selector =
        normalizeClickSelector(
            job?.selector ||
            capturedAction
                ?.selector
        );

    if (!selector) {
        return {
            accepted:
                false,

            reason:
                "Click contains no valid XPath selector"
        };
    }

    /*
     * backup_xpath:
     *
     * Positional XPath produced and validated against the exact target before
     * the click.
     */
    const backupXPath =
        normalizeXPath(
            job?.backup_xpath ||
            job?.backupXPath ||
            capturedAction
                ?.backup_xpath ||
            capturedAction
                ?.backupXPath
        );

    if (!backupXPath) {
        return {
            accepted:
                false,

            reason:
                "Click contains no backup_xpath"
        };
    }

    /*
     * primary_xpath:
     *
     * Independently generated normalize-space XPath.
     *
     * listeners.js supplies backup_xpath when no valid normalize-space XPath
     * can be generated.
     */
    const primaryXPath =
        normalizeXPath(
            job?.primary_xpath ||
            job?.primaryXPath ||
            capturedAction
                ?.primary_xpath ||
            capturedAction
                ?.primaryXPath
        ) ||
        backupXPath;

    const primaryIsBackup =
        primaryXPath ===
        backupXPath;

    if (
        !primaryIsBackup &&
        !/normalize-space\s*\(/i.test(
            primaryXPath
        )
    ) {
        return {
            accepted:
                false,

            reason:
                "primary_xpath is neither normalize-space-based nor equal to backup_xpath"
        };
    }

    const action =
        removeInternalClickFields({
            ...capturedAction,

            action:
                "click",

            selector,

            primary_xpath:
                primaryXPath,

            backup_xpath:
                backupXPath
        });

    return {
        accepted:
            true,

        action,

        selector:
            action.selector,

        primary_xpath:
            action.primary_xpath,

        backup_xpath:
            action.backup_xpath
    };
}

function buildActionKey(
    action
) {
    if (
        !action?.action
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
                action
                    .scrollPercent ??
                    "",
                action
                    .maxScrollY ??
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

/**
 * Returns the canonical XPath used for consecutive-click comparison.
 *
 * The accepted selector is authoritative because it is the exact
 * graph-generated selector persisted in the final action.
 *
 * xpathKey and clickId are compatibility fallbacks only.
 */
function getClickXPathComparisonValue(
    job,
    built
) {
    const candidates = [
        built?.selector,

        job?.xpathKey,
        job?.clickId,

        job?.capturedAction
            ?.xpathKey,

        job?.capturedAction
            ?.clickId,

        job?.selector,

        job?.capturedAction
            ?.selector
    ];

    for (
        const candidate of
        candidates
    ) {
        const normalized =
            normalizeClickSelector(
                candidate
            );

        if (normalized) {
            return normalized;
        }
    }

    return "";
}

(async () => {
    const ts =
        timestamp();

    cleanOutputDirectory(
        OUT_DIR
    );

    const scriptPath =
        path.join(
            OUT_DIR,
            `codegen-${ts}.js`
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

    let finalized = false;
    let lastAcceptedActionKey =
        null;

    /*
     * Only the immediately previous accepted click XPath is retained.
     *
     * A -> A
     *
     * The second A is rejected.
     *
     * A -> B -> A
     *
     * All three are accepted.
     */
    let lastAcceptedClickXPath =
        "";

    function pushAcceptedAction(
        action
    ) {
        const cleanedAction =
            omitNullFields(
                action
            );

        if (
            !cleanedAction
                ?.action
        ) {
            return false;
        }

        if (
            SELECTOR_REQUIRED_ACTIONS.has(
                cleanedAction
                    .action
            ) &&
            !cleanedAction
                .selector
        ) {
            return false;
        }

        const actionKey =
            buildActionKey(
                cleanedAction
            );

        if (
            actionKey &&
            lastAcceptedActionKey ===
                actionKey
        ) {
            return false;
        }

        lastAcceptedActionKey =
            actionKey;

        actions.push(
            cleanedAction
        );

        return true;
    }

    /**
     * Commits a click using only pre-click values supplied by listeners.js.
     *
     * No XPath is recalculated here.
     */
    function commitClickJob(
        job
    ) {
        const built =
            buildAcceptedClickAction(
                job
            );

        if (
            !built.accepted
        ) {
            return {
                ...built,

                sequence:
                    job?.sequence ??
                    null
            };
        }

        const clickXPath =
            getClickXPathComparisonValue(
                job,
                built
            );

        if (!clickXPath) {
            return {
                accepted:
                    false,

                sequence:
                    job?.sequence ??
                    null,

                reason:
                    "Click contains no XPath for consecutive comparison"
            };
        }

        if (
            lastAcceptedClickXPath ===
            clickXPath
        ) {
            return {
                accepted:
                    false,

                duplicate:
                    true,

                sequence:
                    job?.sequence ??
                    null,

                reason:
                    "Consecutive duplicate click XPath suppressed"
            };
        }

        /*
         * Prevent a preceding non-click action from suppressing this click
         * through the general action-key deduplication path.
         */
        lastAcceptedActionKey =
            null;

        const committed =
            pushAcceptedAction(
                built.action
            );

        if (!committed) {
            return {
                accepted:
                    false,

                sequence:
                    job?.sequence ??
                    null,

                reason:
                    "Click action could not be committed"
            };
        }

        lastAcceptedClickXPath =
            clickXPath;

        return {
            accepted:
                true,

            sequence:
                job?.sequence ??
                null,

            selector:
                built.selector,

            primary_xpath:
                built.primary_xpath,

            backup_xpath:
                built.backup_xpath,

            committedByNode:
                true
        };
    }

    const finalize =
        async (
            exitCode = 0
        ) => {
            if (finalized) {
                return;
            }

            finalized = true;

            console.log(
                "\nFinalizing..."
            );

            await delay(
                FINALIZE_ENQUEUE_GRACE_MS
            );

            const finalActions =
                actions
                    .filter(
                        Boolean
                    )
                    .map(
                        omitNullFields
                    )
                    .filter(
                        Boolean
                    );

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

    try {
        /*
         * Existing non-click actions continue through this binding.
         */
        await context
            .exposeBinding(
                "__captureAction",
                async (
                    _source,
                    data
                ) => {
                    if (
                        data?.action ===
                        "click"
                    ) {
                        return commitClickJob(
                            data
                        );
                    }

                    const committed =
                        pushAcceptedAction(
                            data
                        );

                    return {
                        accepted:
                            committed,

                        reason:
                            committed
                                ? null
                                : "Action was invalid or duplicated"
                    };
                }
            );

        /*
         * Direct click capture.
         *
         * selector, primary_xpath and backup_xpath were already generated
         * and validated before the click.
         */
        await context
            .exposeBinding(
                "__captureClickAction",
                async (
                    _source,
                    job
                ) => {
                    return commitClickJob(
                        job
                    );
                }
            );

        /*
         * Use explicit content rather than passing a possibly undefined
         * imported value.
         *
         * The actual attribute-agnostic graph algorithm remains inside
         * listeners.js.
         */
        await context
            .addInitScript({
                content:
                    LISTENER_INIT_SCRIPT
            });

        await context
            ._enableRecorder({
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
                        !candidatePage
                            .isClosed()
                );

        if (!page) {
            page =
                await context
                    .newPage();
        }

        if (viewport) {
            await page
                .setViewportSize(
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
        } catch (error) {
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

        if (viewport) {
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
    } catch (error) {
        console.error(
            error
        );

        await finalize(
            1
        );
    }
})();
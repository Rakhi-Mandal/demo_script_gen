const fs = require("fs");
const path = require("path");
const os = require("os");

const {
    chromium,
    firefox,
    webkit
} = require("@playwright/test");

const {
    injectListeners
} = require("./src/utils/listeners");

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

const FINALIZE_ENQUEUE_GRACE_MS = 500;

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

function cleanOutputDirectory(dirPath) {
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

function omitNullFields(value) {
    if (Array.isArray(value)) {
        const cleanedItems =
            value
                .map(omitNullFields)
                .filter(
                    (item) =>
                        item !== null
                );

        return cleanedItems.length
            ? cleanedItems
            : null;
    }

    if (
        value &&
        typeof value === "object"
    ) {
        const cleanedEntries =
            Object.entries(value)
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
                        entryValue !== null
                );

        return cleanedEntries.length
            ? Object.fromEntries(
                cleanedEntries
            )
            : null;
    }

    return value === undefined
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
        (resolve) =>
            setTimeout(
                resolve,
                ms
            )
    );
}

function resolveBrowserLaunch(browserName) {
    switch (browserName) {
        case "chromium":
            return {
                browserType:
                    chromium,

                browserLabel:
                    "chromium",

                launchOptions: {
                    headless: false
                }
            };

        case "firefox":
            return {
                browserType:
                    firefox,

                browserLabel:
                    "firefox",

                launchOptions: {
                    headless: false
                }
            };

        case "webkit":
            return {
                browserType:
                    webkit,

                browserLabel:
                    "webkit",

                launchOptions: {
                    headless: false
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

function parseViewport(value) {
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
        Number(match[1]);

    const height =
        Number(match[2]);

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
 *     //button[@aria-label='Submit']
 *
 * or:
 *
 *     xpath=//button[@aria-label='Submit']
 *
 * Returns only the raw XPath expression.
 */
function normalizeXPath(value) {
    if (
        typeof value !== "string"
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
 * Accepted:
 *
 *     xpath=//button[@id='save']
 *     //button[@id='save']
 *     (//button)[57]
 *
 * Rejected:
 *
 *     #save
 *     text=Save
 *     [aria-label="Save"]
 *     role=button[name="Save"]
 */
function normalizeClickSelector(value) {
    if (
        typeof value !== "string"
    ) {
        return "";
    }

    const trimmed =
        value.trim();

    if (!trimmed) {
        return "";
    }

    if (/^xpath=/i.test(trimmed)) {
        const xpath =
            normalizeXPath(trimmed);

        return xpath
            ? `xpath=${xpath}`
            : "";
    }

    if (
        trimmed.startsWith("/") ||
        trimmed.startsWith("(")
    ) {
        return `xpath=${trimmed}`;
    }

    return "";
}

function removeInternalClickFields(action) {
    delete action.clickId;
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
     * Click output contains:
     *
     * selector
     * primary_xpath
     * backup_xpath
     *
     * There must not be an additional xpath property.
     */
    delete action.xpath;

    /*
     * URL is internal click-capture metadata.
     */
    delete action.url;

    return action;
}

/**
 * Builds the final click action from values generated and validated before
 * the click in listeners.js.
 *
 * This function deliberately does not inspect or recalculate anything from
 * the post-click DOM.
 */
function buildAcceptedClickAction(job) {
    const capturedAction =
        (
            job?.capturedAction &&
            typeof job.capturedAction ===
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
     * Normal XPath generated before the click by listeners.js.
     */
    const selector =
        normalizeClickSelector(
            job?.selector ||
            capturedAction?.selector
        );

    if (!selector) {
        return {
            accepted: false,

            reason:
                "Click contains no valid XPath selector"
        };
    }

    /*
     * backup_xpath:
     *
     * Positional XPath calculated and validated against the exact element
     * before the click, for example:
     *
     *     (//span)[191]
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
            accepted: false,

            reason:
                "Click contains no backup_xpath"
        };
    }

    /*
     * primary_xpath:
     *
     * Normalize-space-based XPath generated before the click.
     *
     * If no normalize-space XPath existed, listeners.js supplies
     * backup_xpath as primary_xpath.
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

    /*
     * A primary XPath that is not the backup fallback must contain
     * normalize-space().
     */
    if (
        !primaryIsBackup &&
        !/normalize-space\s*\(/i.test(
            primaryXPath
        )
    ) {
        return {
            accepted: false,

            reason:
                "primary_xpath is neither normalize-space-based nor equal to backup_xpath"
        };
    }

    const action =
        removeInternalClickFields({
            ...capturedAction,

            action:
                "click",

            /*
             * Preserve the pre-click normal XPath.
             */
            selector,

            /*
             * Preserve the pre-click normalize-space XPath or backup fallback.
             */
            primary_xpath:
                primaryXPath,

            /*
             * Preserve the pre-click positional XPath exactly.
             */
            backup_xpath:
                backupXPath
        });

    return {
        accepted: true,
        action,

        selector:
            action.selector,

        primary_xpath:
            action.primary_xpath,

        backup_xpath:
            action.backup_xpath
    };
}

function buildActionKey(action) {
    if (!action?.action) {
        return "";
    }

    switch (action.action) {
        case "navigation":
            return [
                action.action,
                action.url ||
                    ""
            ].join("::");

        case "scroll":
            return [
                action.action,
                action.scrollPercent ??
                    "",
                action.maxScrollY ??
                    ""
            ].join("::");

        case "input":
            return [
                action.action,
                action.selector ||
                    "",
                action.value ??
                    ""
            ].join("::");

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
            ].join("::");

        default:
            return [
                action.action,
                action.selector ||
                    ""
            ].join("::");
    }
}

/**
 * Returns the XPath used only for consecutive click comparison.
 *
 * listeners.js supplies xpathKey using this order:
 *
 * 1. ID-based XPath when the element has an id.
 * 2. Otherwise the normal generated XPath.
 *
 * Fall back to clickId or the accepted selector when xpathKey is absent.
 */
function getClickXPathComparisonValue(
    job,
    built
) {
    const candidates = [
        job?.xpathKey,
        job?.clickId,
        job?.capturedAction
            ?.xpathKey,
        job?.capturedAction
            ?.clickId,
        built?.selector
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
    let lastAcceptedActionKey = null;

    /*
     * Store only the immediately previous accepted click XPath.
     *
     * A -> A
     *
     * The second A is rejected.
     *
     * A -> B -> A
     *
     * All three are accepted.
     */
    let lastAcceptedClickXPath = "";

    function pushAcceptedAction(action) {
        const cleanedAction =
            omitNullFields(action);

        if (!cleanedAction?.action) {
            return false;
        }

        if (
            SELECTOR_REQUIRED_ACTIONS.has(
                cleanedAction.action
            ) &&
            !cleanedAction.selector
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
     * Commits a click using only the pre-click locator values supplied by
     * listeners.js.
     *
     * No XPath is recalculated from the post-click DOM here.
     *
     * Only an immediately repeated click XPath is suppressed. An XPath is
     * allowed again after a different click XPath has been accepted.
     */
    function commitClickJob(job) {
        const built =
            buildAcceptedClickAction(
                job
            );

        if (!built.accepted) {
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
                accepted: false,

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
                accepted: false,
                duplicate: true,

                sequence:
                    job?.sequence ??
                    null,

                reason:
                    "Consecutive duplicate click XPath suppressed"
            };
        }

        /*
         * Do not let a preceding non-click action suppress this click through
         * the general action-key deduplication path.
         */
        lastAcceptedActionKey =
            null;

        const committed =
            pushAcceptedAction(
                built.action
            );

        if (!committed) {
            return {
                accepted: false,

                sequence:
                    job?.sequence ??
                    null,

                reason:
                    "Click action could not be committed"
            };
        }

        /*
         * Update only after the action was successfully committed.
         */
        lastAcceptedClickXPath =
            clickXPath;

        return {
            accepted: true,

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
        async () => {
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
                    .filter(Boolean)
                    .map(
                        omitNullFields
                    )
                    .filter(Boolean);

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
                .catch(() => {});

            fs.rmSync(
                userDataDir,
                {
                    recursive: true,
                    force: true
                }
            );

            process.exit(0);
        };

    process.once(
        "SIGINT",
        finalize
    );

    process.once(
        "SIGTERM",
        finalize
    );

    try {
        /*
         * Existing non-click actions continue through this binding.
         */
        await context.exposeBinding(
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
         * The locators supplied here were already generated and validated
         * before the physical click in listeners.js.
         *
         * This binding must not recalculate them from the post-click DOM.
         */
        await context.exposeBinding(
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

        await context.addInitScript(
            injectListeners
        );

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
                    (candidatePage) =>
                        !candidatePage
                            .isClosed()
                );

        if (!page) {
            page =
                await context.newPage();
        }

        if (viewport) {
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
            finalize
        );
    } catch (error) {
        console.error(error);

        await finalize();
    }
})();
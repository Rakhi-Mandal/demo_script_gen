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

function findActionsFile(
    codegenOutputDirectory
) {
    /*
     * An explicitly selected actions file has priority.
     */
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

        return resolvedFile;
    }

    const actionFiles =
        fs.readdirSync(
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

    if (!actionFiles.length) {
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

    /*
     * Use the most recently modified actions JSON.
     */
    return actionFiles[0]
        .filePath;
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
    startingPaths
) {
    const codegenOutputDirectory =
        findCodegenOutputDirectory(
            startingPaths
        );

    const actionsPath =
        findActionsFile(
            codegenOutputDirectory
        );

    const actions =
        loadTraceActions(
            actionsPath
        );

    return {
        actionsPath,
        actions
    };
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
            const {
                actionsPath,
                actions
            } =
                resolveTraceActions([
                    process.cwd(),

                    testInfo.config
                        .rootDir,

                    testInfo.file,

                    path.dirname(
                        testInfo.file
                    ),

                    __dirname
                ]);

            const recordedClickCount =
                actions.filter(
                    action =>
                        action.action ===
                        "click"
                ).length;

            console.log(
                `[smart-click] Actions file: ${actionsPath}`
            );

            console.log(
                `[smart-click] Recorded clicks: ${recordedClickCount}`
            );

            /*
             * createSmartClickPage() intercepts only Locator.click().
             *
             * The priority logic inside smart-click.js is:
             *
             * 1. selector
             * 2. primary_xpath
             * 3. backup_xpath
             *
             * Other operations such as fill(), press(), hover(), goto(),
             * waitFor(), check() and selectOption() remain unchanged.
             */
            const smartPage =
                createSmartClickPage(
                    page,
                    actions
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
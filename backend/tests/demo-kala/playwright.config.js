const config = {
  testDir: ".",
  testMatch: "**/*.spec.js",
  fullyParallel: true,
  timeout: 60000,
  expect: {
    timeout: 60000,
  },
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/report.json" }],
    ["allure-playwright", { outputFolder: "allure-results" }],
  ],
  use: {
    actionTimeout: 60000,
    navigationTimeout: 60000,
    screenshot: process.env.PW_SCREENSHOT_MODE || "only-on-failure",
    trace: "on"
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
};

module.exports = config;
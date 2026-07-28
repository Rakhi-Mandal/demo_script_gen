const { defineConfig } = require('@playwright/test');
 
module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/*.js',
  // testIgnore: '**/healed/**',
  timeout: 120000,            // ← Whole test: 2 min (must be > actionTimeout)
  expect: {
    timeout: 1200000,           // ← Each expect() waits 10s
  },
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/report.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results' }],
  ],
  use: {
    actionTimeout: 60000,     // ← Each step waits 30s for the element
    navigationTimeout: 60000,
    headless: process.env.HEADLESS !== 'false',
    screenshot: 'only-on-failure',
    slowMo: 30000,
    // slowMo REMOVED — was adding 60s pause before every action
    trace: 'on',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', channel: 'chrome' } },
    // { name: 'msedge', use: { browserName: 'chromium', channel: 'msedge' } },
    // { name: 'firefox', use: { browserName: 'firefox' } },
    // { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  // Username/email input
  await heal(page, 'username field', 'visible', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'username field', 'click', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'username field', 'fill', testData.enterYourUsernameOrEmail,
    () => page.locator('input[aria-label="Enter your username or email address"]'));

  // Continue button
  await heal(page, 'continue button', 'click', null,
    () => page.locator('button[aria-label="Continue"]'));

  // Password input
  await heal(page, 'password field', 'visible', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'click', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('input[aria-label="Password"]'));

  // Sign in button
  await heal(page, 'sign in button', 'click', null,
    () => page.locator('#next'));

  // Search input
  await heal(page, 'search field', 'visible', null,
    () => page.locator('input[aria-label="Search"]'));
  await heal(page, 'search field', 'click', null,
    () => page.locator('input[aria-label="Search"]'));
  await heal(page, 'search field', 'fill', testData.search,
    () => page.locator('input[aria-label="Search"]'));
  await heal(page, 'search field', 'click', null,
    () => page.locator('input[aria-label="Search"]'));
});
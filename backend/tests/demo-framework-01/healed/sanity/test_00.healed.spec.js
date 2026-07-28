import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'username field', 'visible', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'username field', 'fill', testData.enterYourUsernameOrEmail,
    () => page.locator('input[aria-label="Enter your username or email address"]'));

  await heal(page, 'password field', 'visible', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('input[aria-label="Password"]'));

  await heal(page, 'sign in button', 'click', null,
    () => page.locator('#next'));

  // Optionally assert searchbox is present after login if this is a milestone
  await heal(page, 'search field', 'visible', null,
    () => page.locator('input[aria-label="Search"]'));
});
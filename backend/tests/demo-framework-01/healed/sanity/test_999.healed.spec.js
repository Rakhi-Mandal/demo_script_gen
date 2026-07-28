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

  // "Sign in" div (confirmation of page state)
  await heal(page, 'sign in div', 'visible', null,
    () => page.locator('div').filter({ hasText: /^Sign in$/ }).first());

  // "Sign in" submit button
  await heal(page, 'sign in button', 'click', null,
    () => page.locator('#next'));

  // Search for client
  await heal(page, 'search field', 'visible', null,
    () => page.locator('input[aria-label="Search"]'));
  await heal(page, 'search field', 'fill', testData.search,
    () => page.locator('input[aria-label="Search"]'));

  await heal(page, 'client result', 'visible', null,
    () => page.locator('span').filter({ hasText: /^Test Client JG$/ }).first());
  await heal(page, 'client result', 'click', null,
    () => page.locator('span').filter({ hasText: /^Test Client JG$/ }).first());

  await heal(page, 'order link', 'visible', null,
    () => page.getByRole('link', { name: 'Order', exact: true }));
  await heal(page, 'order link', 'click', null,
    () => page.getByRole('link', { name: 'Order', exact: true }));

  await heal(page, 'new order button', 'visible', null,
    () => page.locator('[data-testid="order-list-new-button"]'));
  await heal(page, 'new order button', 'click', null,
    () => page.locator('[data-testid="order-list-new-button"]'));

  // Stop 1: Location dropdown button
  await heal(page, 'stop 1 location dropdown button', 'visible', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'stop 1 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Stop 1: Select location option
  await heal(page, 'stop 1 location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));
  await heal(page, 'stop 1 location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));

  // Stop 1: Earliest pickup date
  await heal(page, 'stop 1 earliest date button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').first());
  await heal(page, 'stop 1 earliest date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').first());

  await heal(page, 'date 14', 'visible', null,
    () => page.locator('span').filter({ hasText: /^14$/ }).first());
  await heal(page, 'date 14', 'click', null,
    () => page.locator('span').filter({ hasText: /^14$/ }).first());

  // Stop 1: Latest pickup date
  await heal(page, 'stop 1 latest date button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(1));
  await heal(page, 'stop 1 latest date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(1));

  await heal(page, 'date 17', 'visible', null,
    () => page.locator('span').filter({ hasText: /^17$/ }).first());
  await heal(page, 'date 17', 'click', null,
    () => page.locator('span').filter({ hasText: /^17$/ }).first());

  // Stop 1: Appointment required checkbox
  await heal(page, 'appointment required checkbox', 'check', null,
    () => page.locator('#stop-1-content-appointment-required'));

  // Stop 2: Location dropdown button
  await heal(page, 'stop 2 location dropdown button', 'visible', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'stop 2 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Stop 2: Select location option
  await heal(page, 'stop 2 location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]').nth(1));
  await heal(page, 'stop 2 location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]').nth(1));

  // Stop 2: Earliest drop-off date
  await heal(page, 'stop 2 earliest date button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(2));
  await heal(page, 'stop 2 earliest date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(2));

  await heal(page, 'date 15', 'visible', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());
  await heal(page, 'date 15', 'click', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());

  await heal(page, 'date 10', 'visible', null,
    () => page.locator('span').filter({ hasText: /^10$/ }).first());
  await heal(page, 'date 10', 'click', null,
    () => page.locator('span').filter({ hasText: /^10$/ }).first());

  await heal(page, 'date 23', 'visible', null,
    () => page.locator('span').filter({ hasText: /^23$/ }).first());
  await heal(page, 'date 23', 'click', null,
    () => page.locator('span').filter({ hasText: /^23$/ }).first());

  // Final "aadmin" button
  await heal(page, 'aadmin button', 'visible', null,
    () => page.getByRole('button', { name: 'aadmin', exact: true }));
  await heal(page, 'aadmin button', 'click', null,
    () => page.getByRole('button', { name: 'aadmin', exact: true }));
});
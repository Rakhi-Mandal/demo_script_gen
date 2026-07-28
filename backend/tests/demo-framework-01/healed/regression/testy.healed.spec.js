import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @regression', async ({ page }) => {
  // Go to the application URL
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  // Username/email input
  await heal(page, 'username field', 'click', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'username field', 'fill', testData.enterYourUsernameOrEmail,
    () => page.locator('input[aria-label="Enter your username or email address"]'));

  // Continue button
  await heal(page, 'continue button', 'click', null,
    () => page.locator('button[aria-label="Continue"]'));

  // Password input
  await heal(page, 'password field', 'click', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('input[aria-label="Password"]'));

  // Sign in button
  await heal(page, 'sign in button', 'click', null,
    () => page.locator('#next'));

  // Search input (no XPath in Action.json, so skip locator declaration and action)

  await heal(page, 'test client jg label', 'click', null,
    () => page.locator('span').filter({ hasText: /^Test Client JG$/ }).first());

  // Order link
  await heal(page, 'order link', 'click', null,
    () => page.locator("getByRole('link', { name: \"Order\", exact: true })"));

  // New Order button
  await heal(page, 'new order button', 'click', null,
    () => page.locator('[data-testid="order-list-new-button"]'));

  // Stop 1: Location dropdown button
  await heal(page, 'stop 1 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Stop 1: Select location
  await heal(page, 'stop 1 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Stop 1: Earliest Pickup date picker
  await heal(page, 'earliest pickup date picker', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // Stop 1: Select day 16
  await heal(page, 'stop 1 earliest pickup day', 'click', null,
    () => page.locator('#stop-1-content-earliest-PICKUP'));

  // Stop 1: Latest Pickup date picker
  await heal(page, 'latest pickup date picker', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // Stop 1: Select day 16
  await heal(page, 'stop 1 latest pickup day', 'click', null,
    () => page.locator('#stop-1-content-latest-PICKUP'));

  // Stop 1: Requested date lock checkbox
  await heal(page, 'requested date lock checkbox', 'click', null,
    () => page.locator('#stop-1-content-requested-date-lock'));
  await heal(page, 'requested date lock checkbox', 'check', null,
    () => page.locator('#stop-1-content-requested-date-lock'));

  // Stop 2: Location dropdown button
  await heal(page, 'stop 2 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Stop 2: Select location
  await heal(page, 'stop 2 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Stop 2: Earliest Dropoff date picker
  await heal(page, 'earliest dropoff date picker', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // Stop 2: Select day 30 (table cell)
  await heal(page, 'stop 2 earliest dropoff day', 'click', null,
    () => page.locator('#stop-2-content-earliest-DROP_OFF'));

  // Stop 2: Select day 30 (span)
  await heal(page, 'earliest dropoff date picker', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // Stop 2: Latest Dropoff date picker
  await heal(page, 'latest dropoff date picker', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // Stop 2: Select day 31
  await heal(page, 'stop 2 latest dropoff day', 'click', null,
    () => page.locator('#stop-2-content-latest-DROP_OFF'));

  // Stop 2: Save to address book checkbox
  await heal(page, 'save to address book checkbox', 'click', null,
    () => page.locator('#stop-2-content-save-to-address-book'));
  await heal(page, 'save to address book checkbox', 'check', null,
    () => page.locator('#stop-2-content-save-to-address-book'));

  // Product: Description dropdown button
  await heal(page, 'description dropdown button', 'click', null,
    () => page.locator("xpath=//div[normalize-space(.)='DescriptionNo results found']/div[1]/button[1]"));

  // Product: Select "pr1"
  await heal(page, 'product pr1 option', 'click', null,
    () => page.locator('li[aria-label="pr1"]'));

  // Product: Description dropdown button (again)
  await heal(page, 'description dropdown button', 'click', null,
    () => page.locator("xpath=//div[normalize-space(.)='DescriptionNo results found']/div[1]/button[1]"));

  // Handling input
  await heal(page, 'handling input', 'click', null,
    () => page.locator('#handling-0'));

  // Weight input
  await heal(page, 'weight input', 'click', null,
    () => page.locator('#weight-0'));

  // NMFC Number input
  await heal(page, 'nmfc number input', 'click', null,
    () => page.locator('#nmfc-number-0'));
  await heal(page, 'nmfc number input', 'fill', testData.nmfcNumber0,
    () => page.locator('#nmfc-number-0'));

  // Bill To: Location dropdown button
  await heal(page, 'bill to location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Bill To: Select location
  await heal(page, 'bill to location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Direction combobox
  await heal(page, 'direction combobox', 'click', null,
    () => page.locator('span[aria-label="Select Direction"]'));

  // Direction: Outbound
  await heal(page, 'direction outbound option', 'click', null,
    () => page.locator('li[aria-label="Outbound"]'));

  // Requested Mode combobox
  await heal(page, 'requested mode combobox', 'click', null,
    () => page.locator('span[aria-label="Select Requested Mode"]'));

  // Requested Mode: LCL
  await heal(page, 'requested mode lcl option', 'click', null,
    () => page.locator('li[aria-label="LCL"]'));

  // Billing Terms combobox
  await heal(page, 'billing terms combobox', 'click', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));

  // Billing Terms: Prepaid
  await heal(page, 'billing terms prepaid option', 'click', null,
    () => page.locator('li[aria-label="Prepaid"]'));

  // Internal Notes textarea
  await heal(page, 'internal notes textarea', 'click', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes textarea', 'fill', testData.internalNotes,
    () => page.locator('#internal-notes'));

  // Carrier Notes textarea
  await heal(page, 'carrier notes textarea', 'click', null,
    () => page.locator('#carrier-notes'));
  await heal(page, 'carrier notes textarea', 'fill', testData.carrierNotes,
    () => page.locator('#carrier-notes'));
});
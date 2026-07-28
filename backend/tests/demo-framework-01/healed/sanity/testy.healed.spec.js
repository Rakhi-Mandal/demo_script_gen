import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
  // Go to the initial URL
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  // Step 1: Click on username/email input
  await heal(page, 'username field', 'click', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));

  // Step 2: Fill username/email input
  await heal(page, 'username field', 'fill', testData.signInName,
    () => page.locator('input[aria-label="Enter your username or email address"]'));

  // Step 3: Click Continue button
  await heal(page, 'continue button', 'click', null,
    () => page.locator('button[aria-label="Continue"]'));

  // Step 4: Focus username/email input (optional, but in trace)

  // Step 5: Click on password input
  await heal(page, 'password field', 'click', null,
    () => page.locator('input[aria-label="Password"]'));

  // Step 6: Fill password input
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('input[aria-label="Password"]'));

  // Step 7: Click Sign in button
  await heal(page, 'sign in button', 'click', null,
    () => page.locator('#next'));

  // Step 8: Fill search input
  // No XPath in Action.json for this input, so skip locator variable (no XPath selector).
  // If you must use it, you would need an XPath from Action.json. Skipping as per rules.

  // Step 9: Click on "Test Client JG"
  await heal(page, 'test client jg option', 'click', null,
    () => page.locator('span').filter({ hasText: /^Test Client JG$/ }).first());

  // Step 10: Click on "Order" link
  await heal(page, 'order link', 'click', null,
    () => page.locator("getByRole('link', { name: \"Order\", exact: true })"));

  // Step 11: Click on "New Order" button
  await heal(page, 'new order button', 'click', null,
    () => page.locator('[data-testid="order-list-new-button"]'));

  // Step 12: Click on stop 1 location dropdown button
  await heal(page, 'stop 1 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Step 13: Focus stop 1 location name input (no XPath in Action.json, skip locator variable)

  // Step 14: Click on "Novapath Supply Chain Systems..." option
  await heal(page, 'stop 1 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Step 15: Focus stop 1 location name input (no XPath in Action.json, skip locator variable)

  // Step 16: Click on "Choose Date" button for earliest pickup
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // Step 17: Focus earliest pickup input (no XPath in Action.json, skip locator variable)

  // Step 18: Click on "16" day
  await heal(page, 'day 16 option', 'click', null,
    () => page.locator('span').filter({ hasText: /^16$/ }).first());

  // Step 19: Click on "Choose Date" button for latest pickup
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // Step 20: Focus latest pickup input (no XPath in Action.json, skip locator variable)

  // Step 21: Click on "16" day
  await heal(page, 'day 16 option', 'click', null,
    () => page.locator('span').filter({ hasText: /^16$/ }).first());

  // Step 22: Click on requested date lock checkbox
  await heal(page, 'requested date lock checkbox', 'click', null,
    () => page.locator('#stop-1-content-requested-date-lock'));

  // Step 23: Focus requested date lock checkbox (no XPath in Action.json, skip locator variable)

  // Step 24: Check requested date lock checkbox (ensure checked)
  // Step 25: Input requested date lock checkbox (ensure checked)
  await heal(page, 'requested date lock checkbox', 'check', null,
    () => page.locator('#stop-1-content-requested-date-lock'));

  // Step 26: Click on stop 2 location dropdown button
  await heal(page, 'stop 2 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Step 27: Focus stop 2 location name input (no XPath in Action.json, skip locator variable)

  // Step 28: Click on "Cafe and then Some..." option
  await heal(page, 'stop 2 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Step 29: Focus stop 2 location name input (no XPath in Action.json, skip locator variable)

  // Step 30: Click on "Choose Date" button for earliest dropoff
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // Step 31: Focus earliest dropoff input (no XPath in Action.json, skip locator variable)

  // Step 32: Click on "17" day
  await heal(page, 'day 17 option', 'click', null,
    () => page.locator('span').filter({ hasText: /^17$/ }).first());

  // Step 33: Click on "Choose Date" button for latest dropoff
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // Step 34: Focus latest dropoff input (no XPath in Action.json, skip locator variable)

  // Step 35: Click on "17" day (td)
  await heal(page, 'day 17 cell', 'click', null,
    () => page.locator('td[aria-label="17"]'));

  // Step 36: Click on "17" day (span)
  await heal(page, 'day 17 option', 'click', null,
    () => page.locator('span').filter({ hasText: /^17$/ }).first());

  // Step 37: Click on save to address book checkbox
  await heal(page, 'save to address book checkbox', 'click', null,
    () => page.locator('#stop-2-content-save-to-address-book'));

  // Step 38: Focus save to address book checkbox (no XPath in Action.json, skip locator variable)

  // Step 39: Check save to address book checkbox (ensure checked)
  // Step 40: Input save to address book checkbox (ensure checked)
  await heal(page, 'save to address book checkbox', 'check', null,
    () => page.locator('#stop-2-content-save-to-address-book'));

  // Step 41: Click on product quick search dropdown button
  await heal(page, 'continue button', 'click', null,
    () => page.locator('button[aria-label="Continue"]'));

  // Step 42: Focus description input (no XPath in Action.json, skip locator variable)

  // Step 43: Click on "another one" option
  await heal(page, 'another one option', 'click', null,
    () => page.locator('li[aria-label="another one"]'));

  // Step 44: Focus description input (no XPath in Action.json, skip locator variable)

  // Step 45: Click on handling input
  await heal(page, 'handling field', 'click', null,
    () => page.locator('#handling-0'));

  // Step 46: Focus handling input (no XPath in Action.json, skip locator variable)

  // Step 47: Click on bill-to location dropdown button
  await heal(page, 'bill-to location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Step 48: Focus bill-to location name input (no XPath in Action.json, skip locator variable)

  // Step 49: Click on "Novapath Supply Chain Systems..." option
  await heal(page, 'bill-to location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // Step 50: Focus bill-to location name input (no XPath in Action.json, skip locator variable)

  // Step 51: Click on "Select Direction" combobox
  await heal(page, 'select direction combobox', 'click', null,
    () => page.locator('span[aria-label="Select Direction"]'));

  // Step 52: Click on "Outbound" option
  await heal(page, 'outbound option', 'click', null,
    () => page.locator('li[aria-label="Outbound"]'));

  // Step 53: Click on "Select Requested Mode" combobox
  await heal(page, 'select requested mode combobox', 'click', null,
    () => page.locator('span[aria-label="Select Requested Mode"]'));

  // Step 54: Click on "FCL" option
  await heal(page, 'fcl option', 'click', null,
    () => page.locator('li[aria-label="FCL"]'));

  // Step 55: Click on "Select Billing Terms" combobox
  await heal(page, 'select billing terms combobox', 'click', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));

  // Step 56: Click on "Prepaid" option
  await heal(page, 'prepaid option', 'click', null,
    () => page.locator('li[aria-label="Prepaid"]'));

  // Step 57: Click on "Select Equipment Type" combobox
  await heal(page, 'select equipment type combobox', 'click', null,
    () => page.locator('span[aria-label="Select Equipment Type"]'));

  // Step 58: Click on "No available options" option
  await heal(page, 'no available options option', 'click', null,
    () => page.locator("getByRole('option', { name: \"No available options\", exact: true })"));

  // Step 59: Click on internal notes textarea
  await heal(page, 'internal notes textarea', 'click', null,
    () => page.locator('#internal-notes'));

  // Step 60: Focus internal notes textarea (no XPath in Action.json, skip locator variable)

  // Step 61: Fill internal notes textarea
  await heal(page, 'internal notes textarea', 'fill', testData.internalNotes,
    () => page.locator('#internal-notes'));

  // Step 62: Click on carrier notes textarea
  await heal(page, 'carrier notes textarea', 'click', null,
    () => page.locator('#carrier-notes'));

  // Step 63: Focus carrier notes textarea (no XPath in Action.json, skip locator variable)

  // Step 64: Fill carrier notes textarea
  await heal(page, 'carrier notes textarea', 'fill', testData.carrierNotes,
    () => page.locator('#carrier-notes'));

});
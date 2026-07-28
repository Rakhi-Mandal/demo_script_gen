import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
  // 1. Go to the initial login page
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  // 2. Enter username/email
  await heal(page, 'username field', 'visible', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'username field', 'click', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'username field', 'fill', testData.signInName,
    () => page.locator('input[aria-label="Enter your username or email address"]'));

  await heal(page, 'continue button', 'click', null,
    () => page.locator('button[aria-label="Continue"]'));

  // 4. Password entry page
  await page.waitForLoadState('domcontentloaded');
  await heal(page, 'password field', 'visible', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'click', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'fill', testData.pass,
    () => page.locator('input[aria-label="Password"]'));

  await heal(page, 'sign in button', 'click', null,
    () => page.locator('#next'));

  await page.waitForLoadState('domcontentloaded');

  // 7. Search for client
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

  // 11. Stop 1: Open location dropdown and select location
  await heal(page, 'stop 1 location dropdown', 'visible', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'stop 1 location dropdown', 'click', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));

  await heal(page, 'stop 1 location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]').first());
  await heal(page, 'stop 1 location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]').first());

  // 12. Stop 1: Earliest Pickup Date
  await heal(page, 'stop 1 earliest pickup button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').first());
  await heal(page, 'stop 1 earliest pickup button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').first());

  await heal(page, 'stop 1 earliest pickup day', 'visible', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());
  await heal(page, 'stop 1 earliest pickup day', 'click', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());

  // 13. Stop 1: Latest Pickup Date
  await heal(page, 'stop 1 latest pickup button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(1));
  await heal(page, 'stop 1 latest pickup button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(1));

  await heal(page, 'stop 1 latest pickup day', 'visible', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());
  await heal(page, 'stop 1 latest pickup day', 'click', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());

  // 14. Stop 1: Requested Date Lock checkbox
  await heal(page, 'stop 1 date lock checkbox', 'check', null,
    () => page.locator('#stop-1-content-requested-date-lock'));

  // 15. Stop 2: Open location dropdown and select location
  await heal(page, 'stop 2 location dropdown', 'visible', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'stop 2 location dropdown', 'click', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));

  await heal(page, 'stop 2 location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]').nth(1));
  await heal(page, 'stop 2 location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]').nth(1));

  // 16. Stop 2: Earliest Dropoff Date
  await heal(page, 'stop 2 earliest dropoff button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(2));
  await heal(page, 'stop 2 earliest dropoff button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(2));

  await heal(page, 'stop 2 earliest dropoff day', 'visible', null,
    () => page.locator('span').filter({ hasText: /^30$/ }).first());
  await heal(page, 'stop 2 earliest dropoff day', 'click', null,
    () => page.locator('span').filter({ hasText: /^30$/ }).first());

  // 17. Stop 2: Latest Dropoff Date
  await heal(page, 'stop 2 latest dropoff button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(3));
  await heal(page, 'stop 2 latest dropoff button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(3));

  await heal(page, 'stop 2 latest dropoff day', 'visible', null,
    () => page.locator('span').filter({ hasText: /^30$/ }).first());
  await heal(page, 'stop 2 latest dropoff day', 'click', null,
    () => page.locator('span').filter({ hasText: /^30$/ }).first());

  // 18. Product Description: Open dropdown and select product
  await heal(page, 'product dropdown', 'visible', null,
    () => page.locator("xpath=//div[normalize-space(.)='DescriptionNo results found']/div[1]/button[1]"));
  await heal(page, 'product dropdown', 'click', null,
    () => page.locator("xpath=//div[normalize-space(.)='DescriptionNo results found']/div[1]/button[1]"));

  await heal(page, 'product option', 'visible', null,
    () => page.locator('li[aria-label="pr1"]'));
  await heal(page, 'product option', 'click', null,
    () => page.locator('li[aria-label="pr1"]'));

  // 19. Handling input: click to focus
  await heal(page, 'handling field', 'visible', null,
    () => page.locator('#handling-0'));
  await heal(page, 'handling field', 'click', null,
    () => page.locator('#handling-0'));

  // 20. NMFC Number input: click and fill
  await heal(page, 'nmfc number field', 'visible', null,
    () => page.locator('#nmfc-number-0'));
  await heal(page, 'nmfc number field', 'click', null,
    () => page.locator('#nmfc-number-0'));
  await heal(page, 'nmfc number field', 'fill', testData.nmfcNumber0,
    () => page.locator('#nmfc-number-0'));

  // 21. Bill To: Open location dropdown and select location
  await heal(page, 'bill to location dropdown', 'visible', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'bill to location dropdown', 'click', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));

  await heal(page, 'bill to location option', 'visible', null,
    () => page.locator('li[aria-label="Priority1 Inc. ATTN: Accounts Payable"]'));
  await heal(page, 'bill to location option', 'click', null,
    () => page.locator('li[aria-label="Priority1 Inc. ATTN: Accounts Payable"]'));

  await heal(page, 'direction combobox', 'visible', null,
    () => page.locator('span[aria-label="Select Direction"]'));
  await heal(page, 'direction combobox', 'click', null,
    () => page.locator('span[aria-label="Select Direction"]'));

  await heal(page, 'direction option', 'visible', null,
    () => page.locator('li[aria-label="Transfer"]'));
  await heal(page, 'direction option', 'click', null,
    () => page.locator('li[aria-label="Transfer"]'));

  await heal(page, 'billing terms combobox', 'visible', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));
  await heal(page, 'billing terms combobox', 'click', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));

  await heal(page, 'billing terms option', 'visible', null,
    () => page.locator('li[aria-label="3rd Party"]'));
  await heal(page, 'billing terms option', 'click', null,
    () => page.locator('li[aria-label="3rd Party"]'));

  await heal(page, 'requested mode combobox', 'visible', null,
    () => page.locator('span[aria-label="Select Requested Mode"]'));
  await heal(page, 'requested mode combobox', 'click', null,
    () => page.locator('span[aria-label="Select Requested Mode"]'));

  await heal(page, 'requested mode option', 'visible', null,
    () => page.locator('li[aria-label="Dry Bulk"]'));
  await heal(page, 'requested mode option', 'click', null,
    () => page.locator('li[aria-label="Dry Bulk"]'));

  // 25. Internal Notes: click and fill
  await heal(page, 'internal notes field', 'visible', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes field', 'click', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes field', 'fill', testData.internalNotes,
    () => page.locator('#internal-notes'));

  // 26. Carrier Notes: click and fill
  await heal(page, 'carrier notes field', 'visible', null,
    () => page.locator('#carrier-notes'));
  await heal(page, 'carrier notes field', 'click', null,
    () => page.locator('#carrier-notes'));
  await heal(page, 'carrier notes field', 'fill', testData.carrierNotes,
    () => page.locator('#carrier-notes'));

  // 27. Create Order button
  await heal(page, 'create order button', 'click', null,
    () => page.locator('button[aria-label="Create Order for Test Client JG"]'));

  // 28. Weight input: click to focus
  await heal(page, 'weight field', 'visible', null,
    () => page.locator('#weight-0'));
  await heal(page, 'weight field', 'click', null,
    () => page.locator('#weight-0'));

  // 29. Final Create Order button (confirmation)
  await heal(page, 'create order button', 'click', null,
    () => page.locator('button[aria-label="Create Order for Test Client JG"]'));
});
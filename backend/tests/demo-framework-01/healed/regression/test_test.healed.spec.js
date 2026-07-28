import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @regression', async ({ page }) => {
  // 1. Go to the login page
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

  // 4. Enter password
  await heal(page, 'password field', 'visible', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'click', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('input[aria-label="Password"]'));

  await heal(page, 'sign in button', 'click', null,
    () => page.locator('#next'));

  // 6. Go to dashboard/home after login
  await page.waitForLoadState('domcontentloaded');

  // 7. Search for client
  await heal(page, 'search field', 'visible', null,
    () => page.locator('input[aria-label="Search"]'));
  await heal(page, 'search field', 'click', null,
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

  // 11. Stop 1: Select Location Name
  await heal(page, 'stop 1 location field', 'visible', null,
    () => page.locator('#stop-1-content-location-name'));
  await heal(page, 'stop 1 location field', 'click', null,
    () => page.locator('#stop-1-content-location-name'));

  // (CODEGEN/TRACE shows a click on a button inside stop-1-content-location, keep as is)
  await heal(page, 'stop 1 location button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));

  await heal(page, 'stop 1 location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));
  await heal(page, 'stop 1 location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));

  // 14. Stop 1: Earliest Pickup Date
  await heal(page, 'stop 1 earliest pickup button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').first());
  await heal(page, 'stop 1 earliest pickup day', 'click', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());

  // 15. Stop 1: Latest Pickup Date
  await heal(page, 'stop 1 latest pickup button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(1));
  await heal(page, 'stop 1 latest pickup day', 'click', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());

  // 16. Stop 1: Requested Date Lock
  await heal(page, 'stop 1 requested date lock checkbox', 'check', null,
    () => page.locator('#stop-1-content-requested-date-lock'));

  // 17. Stop 2: Select Location Name
  await heal(page, 'stop 2 location button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));

  await heal(page, 'stop 2 location field', 'visible', null,
    () => page.locator('#stop-2-content-location-name'));
  await heal(page, 'stop 2 location field', 'click', null,
    () => page.locator('#stop-2-content-location-name'));

  await heal(page, 'stop 2 location option', 'visible', null,
    () => page.locator('li[aria-label="Cafe and then Some"]'));
  await heal(page, 'stop 2 location option', 'click', null,
    () => page.locator('li[aria-label="Cafe and then Some"]'));

  // 18. Stop 2: Earliest Dropoff Date
  await heal(page, 'stop 2 earliest dropoff button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(2));
  await heal(page, 'stop 2 earliest dropoff day', 'click', null,
    () => page.locator('span').filter({ hasText: /^16$/ }).first());

  // 19. Stop 2: Latest Dropoff Date
  await heal(page, 'stop 2 latest dropoff button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(3));
  await heal(page, 'stop 2 latest dropoff day', 'click', null,
    () => page.locator('span').filter({ hasText: /^16$/ }).first());

  // 20. Product: Select Description
  await heal(page, 'product description field', 'visible', null,
    () => page.locator('#description-0'));
  await heal(page, 'product description field', 'click', null,
    () => page.locator('#description-0'));

  await heal(page, 'product description option', 'visible', null,
    () => page.locator('li[aria-label="pr1"]'));
  await heal(page, 'product description option', 'click', null,
    () => page.locator('li[aria-label="pr1"]'));

  // 21. Product: Handling
  await heal(page, 'handling field', 'visible', null,
    () => page.locator('#handling-0'));
  await heal(page, 'handling field', 'click', null,
    () => page.locator('#handling-0'));

  // 22. Product: NMFC Number (Optional)
  await heal(page, 'nmfc number field', 'visible', null,
    () => page.locator('#nmfc-number-0'));
  await heal(page, 'nmfc number field', 'click', null,
    () => page.locator('#nmfc-number-0'));
  await heal(page, 'nmfc number field', 'fill', testData.nmfcNumber0,
    () => page.locator('#nmfc-number-0'));

  // 23. Product: Weight
  await heal(page, 'weight field', 'visible', null,
    () => page.locator('#weight-0'));
  await heal(page, 'weight field', 'click', null,
    () => page.locator('#weight-0'));

  // 24. Bill To: Select Location Name
  await heal(page, 'bill to location button', 'click', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));

  await heal(page, 'bill to location field', 'visible', null,
    () => page.locator('#bill-to-content-location-name'));
  await heal(page, 'bill to location field', 'click', null,
    () => page.locator('#bill-to-content-location-name'));

  await heal(page, 'bill to location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));
  await heal(page, 'bill to location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));

  // 25. Internal Notes
  await heal(page, 'internal notes field', 'visible', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes field', 'click', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes field', 'fill', testData.internalNotes,
    () => page.locator('#internal-notes'));

  // 26. Carrier Notes (Optional)
  await heal(page, 'carrier notes field', 'visible', null,
    () => page.locator('#carrier-notes'));
  await heal(page, 'carrier notes field', 'click', null,
    () => page.locator('#carrier-notes'));
  await heal(page, 'carrier notes field', 'fill', testData.carrierNotes,
    () => page.locator('#carrier-notes'));

  // 27. Stop 2: Requested Date Lock
  await heal(page, 'stop 2 requested date lock checkbox', 'check', null,
    () => page.locator('#stop-2-content-requested-date-lock'));
});
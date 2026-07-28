import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('test flow @sanity', async ({ page }) => {
  // 1. Go to the login page
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'username field', 'visible', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'username field', 'fill', testData.enterYourUsernameOrEmail,
    () => page.locator('input[aria-label="Enter your username or email address"]'));

  // 3. Focus and fill password
  await heal(page, 'password field', 'visible', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('input[aria-label="Password"]'));

  await heal(page, 'sign in button', 'click', null,
    () => page.locator('#next'));

  // 5. Search for client
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

  // 9. Stop 1: Location Name dropdown
  await heal(page, 'stop 1 location field', 'visible', null,
    () => page.locator('#stop-1-content-location-name'));
  await heal(page, 'stop 1 location dropdown button', 'visible', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'stop 1 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'stop 1 location option', 'visible', null,
    () => page.locator('li[aria-label="Cafe and then Some"]'));
  await heal(page, 'stop 1 location option', 'click', null,
    () => page.locator('li[aria-label="Cafe and then Some"]'));

  // 10. Stop 1: Earliest Pickup date
  await heal(page, 'stop 1 earliest pickup field', 'visible', null,
    () => page.locator('#stop-1-content-earliest-PICKUP'));
  await heal(page, 'stop 1 earliest pickup date button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').first());
  await heal(page, 'stop 1 earliest pickup date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').first());
  await heal(page, 'stop 1 earliest pickup day', 'visible', null,
    () => page.locator('span').filter({ hasText: /^11$/ }).first());
  await heal(page, 'stop 1 earliest pickup day', 'click', null,
    () => page.locator('span').filter({ hasText: /^11$/ }).first());

  // 11. Stop 1: Latest Pickup date
  await heal(page, 'stop 1 latest pickup field', 'visible', null,
    () => page.locator('#stop-1-content-latest-PICKUP'));
  await heal(page, 'stop 1 latest pickup date button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(1));
  await heal(page, 'stop 1 latest pickup date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(1));
  await heal(page, 'stop 1 latest pickup day', 'visible', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());
  await heal(page, 'stop 1 latest pickup day', 'click', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());

  // 12. Stop 1: Save to Address Book checkbox
  await heal(page, 'save to address book checkbox', 'check', null,
    () => page.locator('#stop-1-content-save-to-address-book'));

  // 13. Stop 2: Location Name dropdown
  await heal(page, 'stop 2 location field', 'visible', null,
    () => page.locator('#stop-2-content-location-name'));
  await heal(page, 'stop 2 location dropdown button', 'visible', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'stop 2 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'stop 2 location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));
  await heal(page, 'stop 2 location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));

  // 14. Stop 2: Earliest Dropoff date
  await heal(page, 'stop 2 earliest dropoff field', 'visible', null,
    () => page.locator('#stop-2-content-earliest-DROP_OFF'));
  await heal(page, 'stop 2 earliest dropoff date button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(2));
  await heal(page, 'stop 2 earliest dropoff date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(2));
  await heal(page, 'stop 2 earliest dropoff day', 'visible', null,
    () => page.locator('span').filter({ hasText: /^16$/ }).first());
  await heal(page, 'stop 2 earliest dropoff day', 'click', null,
    () => page.locator('span').filter({ hasText: /^16$/ }).first());

  // 15. Stop 2: Latest Dropoff date
  await heal(page, 'stop 2 latest dropoff field', 'visible', null,
    () => page.locator('#stop-2-content-latest-DROP_OFF'));
  await heal(page, 'stop 2 latest dropoff date button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(3));
  await heal(page, 'stop 2 latest dropoff date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').nth(3));
  await heal(page, 'stop 2 latest dropoff day', 'visible', null,
    () => page.locator('span').filter({ hasText: /^18$/ }).first());
  await heal(page, 'stop 2 latest dropoff day', 'click', null,
    () => page.locator('span').filter({ hasText: /^18$/ }).first());

  // 16. Stop 2: Appointment Required checkbox
  await heal(page, 'appointment required checkbox', 'check', null,
    () => page.locator('#stop-2-content-appointment-required'));

  // 17. Product quick search: select product
  await heal(page, 'product option', 'visible', null,
    () => page.locator('li[aria-label="just some garbage"]'));
  await heal(page, 'product option', 'click', null,
    () => page.locator('li[aria-label="just some garbage"]'));

  // 18. Handling input (spinbutton)
  await heal(page, 'handling field', 'visible', null,
    () => page.locator('#handling-0'));
  await heal(page, 'handling field', 'click', null,
    () => page.locator('#handling-0'));

  // 19. Stackable checkbox
  await heal(page, 'stackable checkbox', 'check', null,
    () => page.locator('#stackable-0'));

  // 20. Bill To: Location Name dropdown
  await heal(page, 'bill to location field', 'visible', null,
    () => page.locator('#bill-to-content-location-name'));
  await heal(page, 'bill to location dropdown button', 'visible', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'bill to location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'bill to location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));
  await heal(page, 'bill to location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));

  await heal(page, 'direction combobox', 'visible', null,
    () => page.locator('span[aria-label="Select Direction"]'));
  await heal(page, 'direction combobox', 'click', null,
    () => page.locator('span[aria-label="Select Direction"]'));
  await heal(page, 'direction option', 'visible', null,
    () => page.locator('li[aria-label="Third Party"]'));
  await heal(page, 'direction option', 'click', null,
    () => page.locator('li[aria-label="Third Party"]'));

  await heal(page, 'billing terms combobox', 'visible', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));
  await heal(page, 'billing terms combobox', 'click', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));
  await heal(page, 'billing terms option', 'visible', null,
    () => page.locator('li[aria-label="Collect"]'));
  await heal(page, 'billing terms option', 'click', null,
    () => page.locator('li[aria-label="Collect"]'));

  // 23. Internal Notes
  await heal(page, 'internal notes field', 'visible', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes field', 'fill', testData.internalNotes,
    () => page.locator('#internal-notes'));

  // 24. Carrier Notes
  await heal(page, 'carrier notes field', 'visible', null,
    () => page.locator('#carrier-notes'));
  await heal(page, 'carrier notes field', 'fill', testData.carrierNotes,
    () => page.locator('#carrier-notes'));

  // 25. Create Order button
  await heal(page, 'create order button', 'click', null,
    () => page.locator('button[aria-label="Create Order for Test Client JG"]'));
});
import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('Ryzen @regression', async ({ page }) => {
  // 1. Go to the application URL
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  // 2. Login: Enter username/email
  await heal(page, 'sign in name field', 'visible', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'sign in name field', 'click', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'sign in name field', 'fill', testData.signInName,
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

  // 5. Search for client
  await heal(page, 'search field', 'visible', null,
    () => page.locator('input[aria-label="Search"]'));
  await heal(page, 'search field', 'fill', testData.search,
    () => page.locator('input[aria-label="Search"]'));

  await heal(page, 'test client jg option', 'visible', null,
    () => page.locator('div').filter({ hasText: /^Test Client JG$/ }).first());
  await heal(page, 'test client jg option', 'click', null,
    () => page.locator('div').filter({ hasText: /^Test Client JG$/ }).first());

  // 7. Go to Order list
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
  await heal(page, 'stop 1 location field', 'click', null,
    () => page.locator('#stop-1-content-location-name'));

  await heal(page, 'stop 1 location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));
  await heal(page, 'stop 1 location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));

  // 12. Stop 1: Earliest Pickup date
  await heal(page, 'stop 1 earliest pickup field', 'visible', null,
    () => page.locator('#stop-1-content-earliest-PICKUP'));
  await heal(page, 'stop 1 earliest pickup field', 'click', null,
    () => page.locator('#stop-1-content-earliest-PICKUP'));
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));
  await heal(page, 'day 15 option', 'click', null,
    () => page.locator('span').filter({ hasText: /^15$/ }).first());
  await heal(page, 'am button', 'click', null,
    () => page.locator('button[aria-label="am"]'));

  // 13. Stop 1: Latest Pickup date
  await heal(page, 'stop 1 latest pickup field', 'visible', null,
    () => page.locator('#stop-1-content-latest-PICKUP'));
  await heal(page, 'stop 1 latest pickup field', 'click', null,
    () => page.locator('#stop-1-content-latest-PICKUP'));
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));
  await heal(page, 'day 16 option', 'click', null,
    () => page.locator('span').filter({ hasText: /^16$/ }).first());
  await heal(page, 'next hour button', 'click', null,
    () => page.locator('button[aria-label="Next Hour"]'));

  // 14. Stop 1: Requested Date Lock checkbox
  await heal(page, 'stop 1 requested date lock checkbox', 'visible', null,
    () => page.locator('#stop-1-content-requested-date-lock'));
  await heal(page, 'stop 1 requested date lock checkbox', 'check', null,
    () => page.locator('#stop-1-content-requested-date-lock'));

  // 15. Stop 2: Location Name dropdown
  await heal(page, 'stop 2 location field', 'visible', null,
    () => page.locator('#stop-2-content-location-name'));
  await heal(page, 'stop 2 location field', 'click', null,
    () => page.locator('#stop-2-content-location-name'));
  await heal(page, 'stop 2 location option', 'visible', null,
    () => page.locator('li[aria-label="Cafe and then Some"]'));
  await heal(page, 'stop 2 location option', 'click', null,
    () => page.locator('li[aria-label="Cafe and then Some"]'));

  // 16. Stop 2: Earliest Dropoff date
  await heal(page, 'stop 2 earliest dropoff field', 'visible', null,
    () => page.locator('#stop-2-content-earliest-DROP_OFF'));
  await heal(page, 'stop 2 earliest dropoff field', 'click', null,
    () => page.locator('#stop-2-content-earliest-DROP_OFF'));
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));
  await heal(page, 'day 8 option', 'click', null,
    () => page.locator('td[aria-label="8"]'));

  // 17. Stop 2: Latest Dropoff date
  await heal(page, 'stop 2 latest dropoff field', 'visible', null,
    () => page.locator('#stop-2-content-latest-DROP_OFF'));
  await heal(page, 'stop 2 latest dropoff field', 'click', null,
    () => page.locator('#stop-2-content-latest-DROP_OFF'));
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));
  await heal(page, 'day 21 option', 'click', null,
    () => page.locator('span').filter({ hasText: /^21$/ }).first());

  // 18. Stop 2: Timezone dropdown
  await heal(page, 'timezone field', 'click', null,
    () => page.locator('span[aria-label="America/New_York"]'));
  await heal(page, 'utc option', 'visible', null,
    () => page.locator('li[aria-label="UTC"]'));
  await heal(page, 'utc option', 'click', null,
    () => page.locator('li[aria-label="UTC"]'));

  // 19. Product Description dropdown
  await heal(page, 'description field', 'visible', null,
    () => page.locator('#description-0'));
  await heal(page, 'description field', 'click', null,
    () => page.locator('#description-0'));
  await heal(page, 'product option', 'visible', null,
    () => page.locator('li[aria-label="just some garbage"]'));
  await heal(page, 'product option', 'click', null,
    () => page.locator('li[aria-label="just some garbage"]'));

  // 20. Handling input
  await heal(page, 'handling field', 'visible', null,
    () => page.locator('#handling-0'));
  await heal(page, 'handling field', 'click', null,
    () => page.locator('#handling-0'));

  // 21. Bill To: Location Name dropdown
  await heal(page, 'bill to location field', 'visible', null,
    () => page.locator('#bill-to-content-location-name'));
  await heal(page, 'bill to location field', 'click', null,
    () => page.locator('#bill-to-content-location-name'));
  await heal(page, 'bill to location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));
  await heal(page, 'bill to location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));

  await heal(page, 'select direction field', 'click', null,
    () => page.locator('span[aria-label="Select Direction"]'));

  await heal(page, 'select billing terms field', 'click', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));

  await heal(page, 'select requested mode field', 'click', null,
    () => page.locator('span[aria-label="Select Requested Mode"]'));

  // 25. Internal Notes
  await heal(page, 'internal notes field', 'visible', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes field', 'click', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes field', 'fill', testData.internalNotes,
    () => page.locator('#internal-notes'));

  // 26. Carrier Notes
  await heal(page, 'carrier notes field', 'visible', null,
    () => page.locator('#carrier-notes'));
  await heal(page, 'carrier notes field', 'click', null,
    () => page.locator('#carrier-notes'));
  await heal(page, 'carrier notes field', 'fill', testData.carrierNotes,
    () => page.locator('#carrier-notes'));

  // 27. Create Order button
  await heal(page, 'create order button', 'click', null,
    () => page.locator('button[aria-label="Create Order for Test Client JG"]'));

  // 28. Stop 2: Latest Dropoff date (repeat)
  await heal(page, 'stop 2 latest dropoff field', 'click', null,
    () => page.locator('#stop-2-content-latest-DROP_OFF'));
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));
  await heal(page, 'day 25 option', 'click', null,
    () => page.locator('span').filter({ hasText: /^25$/ }).first());

  // 29. Create Order button (repeat)
  await heal(page, 'create order button', 'click', null,
    () => page.locator('button[aria-label="Create Order for Test Client JG"]'));

  // 30. Stop 2: Earliest Dropoff date (repeat)
  await heal(page, 'stop 2 earliest dropoff field', 'click', null,
    () => page.locator('#stop-2-content-earliest-DROP_OFF'));
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));
  await heal(page, 'day 9 option', 'click', null,
    () => page.locator('span').filter({ hasText: /^9$/ }).first());

  // 31. Create Order button (repeat)
  await heal(page, 'create order button', 'click', null,
    () => page.locator('button[aria-label="Create Order for Test Client JG"]'));

  // 32. Stop 1: Earliest Pickup (repeat)
  await heal(page, 'stop 1 earliest pickup field', 'click', null,
    () => page.locator('#stop-1-content-earliest-PICKUP'));
  await heal(page, 'day 1 option', 'click', null,
    () => page.locator('span').filter({ hasText: /^1$/ }).first());

  // 33. Create Order button (final repeat)
  await heal(page, 'create order button', 'click', null,
    () => page.locator('button[aria-label="Create Order for Test Client JG"]'));
});
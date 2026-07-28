import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
  // 1. Go to initial URL
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  // 2. Login: Username
  await heal(page, 'username field', 'visible', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'username field', 'click', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'username field', 'fill', testData.signInName,
    () => page.locator('input[aria-label="Enter your username or email address"]'));

  // 3. Login: Continue
  await heal(page, 'continue button', 'click', null,
    () => page.locator('button[aria-label="Continue"]'));

  // 4. Login: Password
  await heal(page, 'password field', 'visible', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'click', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('input[aria-label="Password"]'));

  // 5. Login: Sign in
  await heal(page, 'sign in button', 'click', null,
    () => page.locator('#next'));

  // (No explicit URL assertion in codegen/trace, so skip)

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

  // 11. Stop 1: Location dropdown button
  await heal(page, 'stop 1 location dropdown button', 'visible', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'stop 1 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // 12. Stop 1: Select location option
  await heal(page, 'stop 1 location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));
  await heal(page, 'stop 1 location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));

  // 13. Stop 1: Choose Date
  await heal(page, 'stop 1 choose date button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]'));
  await heal(page, 'stop 1 choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // 14. Stop 1: Select day "14"
  await heal(page, 'stop 1 day 14', 'visible', null,
    () => page.locator('span').filter({ hasText: /^14$/ }).first());
  await heal(page, 'stop 1 day 14', 'click', null,
    () => page.locator('span').filter({ hasText: /^14$/ }).first());

  // 15. Stop 2: Location dropdown button
  await heal(page, 'stop 2 location dropdown button', 'visible', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'stop 2 location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='stop-2-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // 16. Stop 2: Select location option
  await heal(page, 'stop 2 location option', 'visible', null,
    () => page.locator('li[aria-label="Cafe and then Some"]'));
  await heal(page, 'stop 2 location option', 'click', null,
    () => page.locator('li[aria-label="Cafe and then Some"]'));

  // 17. Stop 2: Choose Date
  await heal(page, 'stop 2 choose date button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]'));
  await heal(page, 'stop 2 choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]'));

  // 18. Stop 2: Select day "30"
  await heal(page, 'stop 2 day 30', 'visible', null,
    () => page.locator('span').filter({ hasText: /^30$/ }).first());
  await heal(page, 'stop 2 day 30', 'click', null,
    () => page.locator('span').filter({ hasText: /^30$/ }).first());

  // 19. Stop 2: Save to Address Book checkbox
  await heal(page, 'save to address book checkbox', 'visible', null,
    () => page.locator('#stop-2-content-save-to-address-book'));
  await heal(page, 'save to address book checkbox', 'check', null,
    () => page.locator('#stop-2-content-save-to-address-book'));

  // 20. Product: Description dropdown button
  await heal(page, 'product description dropdown button', 'visible', null,
    () => page.locator("xpath=//div[normalize-space(.)='DescriptionNo results found']/div[1]/button[1]"));
  await heal(page, 'product description dropdown button', 'click', null,
    () => page.locator("xpath=//div[normalize-space(.)='DescriptionNo results found']/div[1]/button[1]"));

  // 21. Product: Select "Uploaded product description"
  await heal(page, 'uploaded product option', 'visible', null,
    () => page.locator('li[aria-label="Uploaded product description"]'));
  await heal(page, 'uploaded product option', 'click', null,
    () => page.locator('li[aria-label="Uploaded product description"]'));

  // 22. Product: NMFC Number input
  await heal(page, 'nmfc number field', 'visible', null,
    () => page.locator('#nmfc-number-0'));
  await heal(page, 'nmfc number field', 'click', null,
    () => page.locator('#nmfc-number-0'));
  await heal(page, 'nmfc number field', 'fill', testData.otp,
    () => page.locator('#nmfc-number-0'));

  // 23. Product: Handling input
  await heal(page, 'handling field', 'visible', null,
    () => page.locator('#handling-0'));
  await heal(page, 'handling field', 'click', null,
    () => page.locator('#handling-0'));

  // 24. Bill To: Location dropdown button
  await heal(page, 'bill to location dropdown button', 'visible', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));
  await heal(page, 'bill to location dropdown button', 'click', null,
    () => page.locator("xpath=//form[@id='bill-to-content-location']/div[1]/div[1]/div[1]/button[1]"));

  // 25. Bill To: Select location option
  await heal(page, 'bill to location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));
  await heal(page, 'bill to location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]'));

  // 26. Direction combobox
  await heal(page, 'direction combobox', 'visible', null,
    () => page.locator('span[aria-label="Select Direction"]'));
  await heal(page, 'direction combobox', 'click', null,
    () => page.locator('span[aria-label="Select Direction"]'));

  await heal(page, 'customer return option', 'visible', null,
    () => page.locator('li[aria-label="Customer Return"]'));
  await heal(page, 'customer return option', 'click', null,
    () => page.locator('li[aria-label="Customer Return"]'));

  // 28. Billing Terms combobox
  await heal(page, 'billing terms combobox', 'visible', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));
  await heal(page, 'billing terms combobox', 'click', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));

  await heal(page, 'collect option', 'visible', null,
    () => page.locator('li[aria-label="Collect"]'));
  await heal(page, 'collect option', 'click', null,
    () => page.locator('li[aria-label="Collect"]'));

  // 30. Requested Mode combobox
  await heal(page, 'requested mode combobox', 'visible', null,
    () => page.locator('span[aria-label="Select Requested Mode"]'));
  await heal(page, 'requested mode combobox', 'click', null,
    () => page.locator('span[aria-label="Select Requested Mode"]'));

  await heal(page, 'tl option', 'visible', null,
    () => page.locator('li[aria-label="TL"]'));
  await heal(page, 'tl option', 'click', null,
    () => page.locator('li[aria-label="TL"]'));

  // 32. Equipment Type combobox
  await heal(page, 'equipment type combobox', 'visible', null,
    () => page.locator('span[aria-label="Select Equipment Type"]'));
  await heal(page, 'equipment type combobox', 'click', null,
    () => page.locator('span[aria-label="Select Equipment Type"]'));

  // 33. Internal Notes textarea
  await heal(page, 'internal notes textarea', 'visible', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes textarea', 'click', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes textarea', 'fill', testData.internalNotes,
    () => page.locator('#internal-notes'));

  // 34. Carrier Notes textarea
  await heal(page, 'carrier notes textarea', 'visible', null,
    () => page.locator('#carrier-notes'));
  await heal(page, 'carrier notes textarea', 'click', null,
    () => page.locator('#carrier-notes'));
  await heal(page, 'carrier notes textarea', 'fill', testData.carrierNotes,
    () => page.locator('#carrier-notes'));
});
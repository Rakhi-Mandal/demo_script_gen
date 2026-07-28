import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
  // 1. Go to the application
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  // 2. Login: Enter username/email
  await heal(page, 'username field', 'visible', null,
    () => page.locator('input[aria-label="Enter your username or email address"]'));
  await heal(page, 'username field', 'fill', testData.enterYourUsernameOrEmail,
    () => page.locator('input[aria-label="Enter your username or email address"]'));

  await heal(page, 'continue button', 'click', null,
    () => page.locator('button[aria-label="Continue"]'));

  // 4. Enter password
  await heal(page, 'password field', 'visible', null,
    () => page.locator('input[aria-label="Password"]'));
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('input[aria-label="Password"]'));

  await heal(page, 'sign in button', 'click', null,
    () => page.locator('#next'));

  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'client ab text', 'visible', null,
    () => page.locator('span').filter({ hasText: /^client AB$/ }).first());
  await heal(page, 'client ab text', 'click', null,
    () => page.locator('span').filter({ hasText: /^client AB$/ }).first());

  await heal(page, 'shipment link', 'visible', null,
    () => page.getByRole('link', { name: 'Shipment', exact: true }));
  await heal(page, 'shipment link', 'click', null,
    () => page.getByRole('link', { name: 'Shipment', exact: true }));

  await page.waitForTimeout(7000);
  await heal(page, 'new shipment button', 'visible', null,
    () => page.locator('[data-testid="shipment-list-new-button"]'));
  await heal(page, 'new shipment button', 'click', null,
    () => page.locator('[data-testid="shipment-list-new-button"]'));

  // 10. Stop 1: Open location dropdown
  await heal(page, 'stop 1 location dropdown', 'visible', null,
    () => page.locator('xpath=//form[@id="stop-1-content-location"]/div[1]/div[1]/div[1]/button[@type="button"]'));
  await heal(page, 'stop 1 location dropdown', 'click', null,
    () => page.locator('xpath=//form[@id="stop-1-content-location"]/div[1]/div[1]/div[1]/button[@type="button"]'));

  // 11. Focus location name input (Stop 1)
  await heal(page, 'stop 1 location name field', 'visible', null,
    () => page.locator('#stop-1-content-location-name'));

  await heal(page, 'stop 1 location dropdown', 'click', null,
    () => page.locator('xpath=//form[@id="stop-1-content-location"]/div[1]/div[1]/div[1]/button[@type="button"]'));

  // 13. Focus location name input again (recorder noise, but present in codegen/trace)
  await heal(page, 'stop 1 location name field', 'visible', null,
    () => page.locator('#stop-1-content-location-name'));

  await heal(page, 'stop 1 location option', 'visible', null,
    () => page.locator('li[aria-label="Haldex Brake Products Corporation"]'));
  await heal(page, 'stop 1 location option', 'click', null,
    () => page.locator('li[aria-label="Haldex Brake Products Corporation"]'));

  await heal(page, 'choose date button', 'visible', null,
    () => page.locator('button[aria-label="Choose Date"]').first());
  await heal(page, 'choose date button', 'click', null,
    () => page.locator('button[aria-label="Choose Date"]').first());

  await heal(page, 'date 22', 'visible', null,
    () => page.locator('span').filter({ hasText: /^22$/ }).first());
  await heal(page, 'date 22', 'click', null,
    () => page.locator('span').filter({ hasText: /^22$/ }).first());

  await heal(page, 'stop 1 requested date lock checkbox', 'check', null,
    () => page.locator('#stop-1-content-requested-date-lock'));

  // 18. Stop 2: Open location dropdown
  await heal(page, 'stop 2 location dropdown', 'visible', null,
    () => page.locator('xpath=//form[@id="stop-2-content-location"]/div[1]/div[1]/div[1]/button[@type="button"]'));
  await heal(page, 'stop 2 location dropdown', 'click', null,
    () => page.locator('xpath=//form[@id="stop-2-content-location"]/div[1]/div[1]/div[1]/button[@type="button"]'));

  // 19. Focus location name input (Stop 2)
  await heal(page, 'stop 2 location name field', 'visible', null,
    () => page.locator('#stop-2-content-location-name'));

  await heal(page, 'stop 2 location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]').first());
  await heal(page, 'stop 2 location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]').first());

  await heal(page, 'description button', 'click', null,
    () => page.locator("xpath=//input[@id='description-0']/following-sibling::button"));

  await heal(page, 'some desc option', 'visible', null,
    () => page.locator('li[aria-label="some desc"]').first());
  await heal(page, 'some desc option', 'click', null,
    () => page.locator('li[aria-label="some desc"]').first());

  // 21. Focus location name input again (recorder noise, but present in codegen/trace)
  await heal(page, 'stop 2 location name field', 'visible', null,
    () => page.locator('#stop-2-content-location-name'));

  await heal(page, 'stop 2 address line 2 field', 'visible', null,
    () => page.locator('#stop-2-content-location-line2'));
  await heal(page, 'stop 2 address line 2 field', 'fill', testData.stop2ContentLocationLine2,
    () => page.locator('#stop-2-content-location-line2'));

  await heal(page, 'stop 2 address line 3 field', 'visible', null,
    () => page.locator('#stop-2-content-location-line3'));
  await heal(page, 'stop 2 address line 3 field', 'fill', testData.stop2ContentLocationLine3,
    () => page.locator('#stop-2-content-location-line3'));

  await heal(page, 'stop 2 contact name field', 'visible', null,
    () => page.locator('#stop-2-content-contact-contact-name'));
  await heal(page, 'stop 2 contact name field', 'fill', testData.stop2ContentContactContactName,
    () => page.locator('#stop-2-content-contact-contact-name'));

  // 25. Focus Contact Phone (Stop 2)
  await heal(page, 'stop 2 contact phone field', 'visible', null,
    () => page.locator('#stop-2-content-contact-contact-phone'));
  await heal(page, 'stop 2 contact phone field', 'click', null,
    () => page.locator('#stop-2-content-contact-contact-phone'));

  await heal(page, 'stop 2 contact email field', 'visible', null,
    () => page.locator('#stop-2-content-contact-contact-email'));
  await heal(page, 'stop 2 contact email field', 'fill', testData.stop2ContentContactContactEmail,
    () => page.locator('#stop-2-content-contact-contact-email'));

  await heal(page, 'stop 2 requested date lock checkbox', 'check', null,
    () => page.locator('#stop-2-content-requested-date-lock'));

  // 30. Handling input
  await heal(page, 'handling field', 'visible', null,
    () => page.locator('#handling-0'));
  await heal(page, 'handling field', 'fill', testData.handlingInput,
    () => page.locator('#handling-0'));

  // 31. Weight input
  await heal(page, 'weight field', 'visible', null,
    () => page.locator('#weight-0'));
  await heal(page, 'weight field', 'fill', testData.weightInput,
    () => page.locator('#weight-0'));

  // 32. Length input
  await heal(page, 'length field', 'visible', null,
    () => page.locator('#dims-0-length'));
  await heal(page, 'length field', 'fill', testData.lengthInput,
    () => page.locator('#dims-0-length'));

  // 33. Width input
  await heal(page, 'width field', 'visible', null,
    () => page.locator('#dims-0-width'));
  await heal(page, 'width field', 'fill', testData.widthInput,
    () => page.locator('#dims-0-width'));

  // 34. Height input
  await heal(page, 'height field', 'visible', null,
    () => page.locator('#dims-0-height'));
  await heal(page, 'height field', 'fill', testData.heightInput,
    () => page.locator('#dims-0-height'));

  // 35. Bill To: Open location dropdown
  await heal(page, 'bill to location dropdown', 'visible', null,
    () => page.locator('xpath=//form[@id="bill-to-content-location"]/div[1]/div[1]/div[1]/button[@type="button"]'));
  await heal(page, 'bill to location dropdown', 'click', null,
    () => page.locator('xpath=//form[@id="bill-to-content-location"]/div[1]/div[1]/div[1]/button[@type="button"]'));

  // 36. Focus Bill To location name input
  await heal(page, 'bill to location name field', 'visible', null,
    () => page.locator('#bill-to-content-location-name'));

  await heal(page, 'bill to location option', 'visible', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]').first());
  await heal(page, 'bill to location option', 'click', null,
    () => page.locator('li[aria-label="Novapath Supply Chain Systems"]').first());

  await heal(page, 'direction dropdown', 'visible', null,
    () => page.locator('span[aria-label="Select Direction"]'));
  await heal(page, 'direction dropdown', 'click', null,
    () => page.locator('span[aria-label="Select Direction"]'));
  await heal(page, 'inbound option', 'visible', null,
    () => page.locator('li[aria-label="Inbound"]'));
  await heal(page, 'inbound option', 'click', null,
    () => page.locator('li[aria-label="Inbound"]'));

  await heal(page, 'billing terms dropdown', 'visible', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));
  await heal(page, 'billing terms dropdown', 'click', null,
    () => page.locator('span[aria-label="Select Billing Terms"]'));
  await heal(page, 'collect option', 'visible', null,
    () => page.locator('li[aria-label="Collect"]'));
  await heal(page, 'collect option', 'click', null,
    () => page.locator('li[aria-label="Collect"]'));

  await heal(page, 'requested mode dropdown', 'visible', null,
    () => page.locator('span[aria-label="Select Requested Mode"]'));
  await heal(page, 'requested mode dropdown', 'click', null,
    () => page.locator('span[aria-label="Select Requested Mode"]'));
  await heal(page, 'break bulk option', 'visible', null,
    () => page.locator('li[aria-label="Break Bulk"]'));
  await heal(page, 'break bulk option', 'click', null,
    () => page.locator('li[aria-label="Break Bulk"]'));

  await heal(page, 'equipment type dropdown', 'visible', null,
    () => page.locator('span[aria-label="Select Equipment Type"]'));
  await heal(page, 'equipment type dropdown', 'click', null,
    () => page.locator('span[aria-label="Select Equipment Type"]'));

  await heal(page, 'internal notes field', 'visible', null,
    () => page.locator('#internal-notes'));
  await heal(page, 'internal notes field', 'fill', testData.stop1ContentInternalNotes,
    () => page.locator('#internal-notes'));

  await heal(page, 'create shipment button', 'click', null,
    () => page.locator('button[aria-label="Create Shipment for client AB"]'));

  await heal(page, 'success message', 'visible', null,
    () => page.locator('div').filter({ hasText: /^Successfully saved shipment$/ }).first());
});
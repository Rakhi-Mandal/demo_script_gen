import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test("generated flow @sanity", async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');
  await heal(page, 'username field', 'click', null,
    () => page.locator("xpath=//input[@type='text']"));
  await heal(page, 'username field', 'fill', testData.enterYourUsernameOrEmailAddress,
    () => page.locator("xpath=//input[@type='text']"));
  await heal(page, 'submit button', 'click', null,
    () => page.locator("xpath=//button[@type='submit']"));
  await heal(page, 'password field', 'click', null,
    () => page.locator("xpath=//input[@type='password']"));
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator("xpath=//input[@type='password']"));
  await heal(page, 'submit button', 'click', null,
    () => page.locator("xpath=//button[@type='submit']"));
  await heal(page, 'search field', 'click', null,
    () => page.locator("xpath=//input[@type='search']"));
  await heal(page, 'search field', 'fill', testData.searchDomains,
    () => page.locator("xpath=//input[@type='search']"));
  await heal(page, 'node label', 'click', null,
    () => page.locator("xpath=//span[@data-pc-section='nodelabel']"));
  await heal(page, 'order list link', 'click', null,
    () => page.locator("xpath=//a[@href='/corsair/order/list']"));
  await heal(page, 'new order link', 'click', null,
    () => page.locator("xpath=//a[@aria-label='New Order']"));
  await heal(page, 'stop 1 location dropdown', 'click', null,
    () => page.locator("xpath=//input[@id='stop-1-content-location-name']/following-sibling::button[@type='button']"));
  await heal(page, 'stop 1 location option 2', 'click', null,
    () => page.locator("xpath=//li[@aria-posinset='2']"));
  await heal(page, 'stop 1 earliest pickup calendar', 'click', null,
    () => page.locator("xpath=//input[@id='stop-1-content-earliest-PICKUP']/following-sibling::button[@type='button']"));
  await heal(page, 'stop 1 earliest pickup day 20', 'click', null,
    () => page.locator("xpath=//td[@aria-label='20']//span[@data-pc-section='day']"));
  await heal(page, 'stop 1 latest pickup calendar', 'click', null,
    () => page.locator("xpath=//input[@id='stop-1-content-latest-PICKUP']/following-sibling::button[@type='button']"));
  await heal(page, 'stop 1 latest pickup day 20', 'click', null,
    () => page.locator("xpath=//td[@aria-label='20']//span[@data-pc-section='day']"));
  await heal(page, 'stop 1 appointment required checkbox', 'click', null,
    () => page.locator("xpath=//input[@id='stop-1-content-appointment-required']"));
  await heal(page, 'stop 1 requested date lock checkbox', 'click', null,
    () => page.locator("xpath=//input[@id='stop-1-content-requested-date-lock']"));
  await heal(page, 'stop 2 location dropdown', 'click', null,
    () => page.locator("xpath=//input[@id='stop-2-content-location-name']/following-sibling::button[@type='button']"));
  await heal(page, 'stop 2 location option 3', 'click', null,
    () => page.locator("xpath=//li[@aria-posinset='3']"));
  await heal(page, 'stop 2 earliest drop off calendar', 'click', null,
    () => page.locator("xpath=//input[@id='stop-2-content-earliest-DROP_OFF']/following-sibling::button[@type='button']"));
  await heal(page, 'stop 2 earliest drop off day 31', 'click', null,
    () => page.locator("xpath=//td[@aria-label='23']/following::td[@aria-label='31']"));
  await heal(page, 'stop 2 earliest drop off day 31 label', 'click', null,
    () => page.locator("xpath=//td[@aria-label='23']/following::td[@aria-label='31']//span[@data-pc-section='day']"));
  await heal(page, 'stop 2 latest drop off calendar', 'click', null,
    () => page.locator("xpath=//input[@id='stop-2-content-latest-DROP_OFF']/following-sibling::button[@type='button']"));
  await heal(page, 'stop 2 latest drop off day 31 label', 'click', null,
    () => page.locator("xpath=//td[@aria-label='23']/following::td[@aria-label='31']//span[@data-pc-section='day']"));
  await heal(page, 'stop 2 requested date lock checkbox', 'click', null,
    () => page.locator("xpath=//input[@id='stop-2-content-requested-date-lock']"));
  await heal(page, 'handling field', 'click', null,
    () => page.locator("xpath=//input[@placeholder='Handling']"));
  await heal(page, 'handling field', 'fill', testData.handling,
    () => page.locator("xpath=//input[@placeholder='Handling']"));
  await heal(page, 'weight field', 'click', null,
    () => page.locator("xpath=//input[@placeholder='Weight']"));
  await heal(page, 'weight field', 'fill', testData.weight,
    () => page.locator("xpath=//input[@placeholder='Weight']"));
  await heal(page, 'product dropdown', 'click', null,
    () => page.locator("xpath=//input[@placeholder='Enter a description or select a product']/following-sibling::button[@type='button']"));
  await heal(page, 'product option just some garbage', 'click', null,
    () => page.locator("xpath=//li[@aria-label='just some garbage']"));
  await heal(page, 'bill to location dropdown', 'click', null,
    () => page.locator("xpath=//input[@id='bill-to-content-location-name']/following-sibling::button[@type='button']"));
  await heal(page, 'bill to location option 3', 'click', null,
    () => page.locator("xpath=//li[@aria-posinset='3']"));
  await heal(page, 'direction dropdown', 'click', null,
    () => page.locator("xpath=//span[@aria-label='Select Direction']/following-sibling::div[@data-pc-section='dropdown']"));
  await heal(page, 'direction option customer return', 'click', null,
    () => page.locator("xpath=//li[@aria-label='Customer Return']"));
  await heal(page, 'billing terms dropdown', 'click', null,
    () => page.locator("xpath=//span[@aria-label='Select Billing Terms']/following-sibling::div[@data-pc-section='dropdown']"));
  await heal(page, 'billing terms option prepaid', 'click', null,
    () => page.locator("xpath=//li[@aria-label='Prepaid']"));
  await heal(page, 'requested mode dropdown', 'click', null,
    () => page.locator("xpath=//span[@aria-label='Select Requested Mode']/following-sibling::div[@data-pc-section='dropdown']"));
  await heal(page, 'requested mode option specialized', 'click', null,
    () => page.locator("xpath=//li[@aria-label='Specialized']"));
  await heal(page, 'internal notes field', 'click', null,
    () => page.locator("xpath=//textarea[@id='internal-notes']"));
  await heal(page, 'internal notes field', 'fill', testData.internalNotes,
    () => page.locator("xpath=//textarea[@id='internal-notes']"));
  await heal(page, 'carrier notes field', 'click', null,
    () => page.locator("xpath=//textarea[@id='carrier-notes']"));
  await heal(page, 'carrier notes field', 'fill', testData.carrierNotes,
    () => page.locator("xpath=//textarea[@id='carrier-notes']"));
});
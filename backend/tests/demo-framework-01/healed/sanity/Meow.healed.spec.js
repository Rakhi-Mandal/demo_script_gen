import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
    await page.goto(testData.url);
    await page.waitForLoadState('domcontentloaded');

    await heal(page, 'text input field', 'click', null,
        () => page.locator("xpath=//input[@*[name()='type' and .='text']]"));
    await heal(page, 'sign in name field', 'fill', testData.signInName,
        () => page.locator('input[id="signInName"][type="text"]'));

    await heal(page, 'submit button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='type' and .='submit']]"));
    await heal(page, 'password input field', 'click', null,
        () => page.locator("xpath=//input[@*[name()='type' and .='password']]"));
    await heal(page, 'password field', 'fill', testData.pass,
        () => page.locator('input[id="password"][type="password"]'));

    await heal(page, 'submit button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='type' and .='submit']]"));
    await heal(page, 'search input field', 'click', null,
        () => page.locator("xpath=//input[@*[name()='type' and .='search']]"));
    await heal(page, 'search field', 'fill', testData.xpathInputNameTypeAndSearch,
        () => page.locator('input[aria-label="Search"][type="search"]'));

    await heal(page, 'node label', 'click', null,
        () => page.locator("xpath=//span[@*[name()='data-pc-section' and .='nodelabel']]"));
    await heal(page, 'order list link', 'click', null,
        () => page.locator("xpath=//a[@*[name()='href' and .='/corsair/order/list']]"));
    await heal(page, 'new order link', 'click', null,
        () => page.locator("xpath=//a[@*[name()='aria-label' and .='New Order']]"));
    await heal(page, 'stop 1 location dropdown', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='stop-1-content-location-name']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'third list item', 'click', null,
        () => page.locator("xpath=//li[@*[name()='aria-posinset' and .='3']]"));
    await heal(page, 'stop 1 earliest pickup dropdown', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='stop-1-content-earliest-PICKUP']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'pickup day 20', 'click', null,
        () => page.locator("xpath=//td[@*[name()='aria-label' and .='20']]//span[@*[name()='data-pc-section' and .='day']]"));
    await heal(page, 'stop 1 latest pickup dropdown', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='stop-1-content-latest-PICKUP']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'pickup day 20', 'click', null,
        () => page.locator("xpath=//td[@*[name()='aria-label' and .='20']]//span[@*[name()='data-pc-section' and .='day']]"));
    await heal(page, 'stop 1 requested date lock', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='stop-1-content-requested-date-lock']]"));
    await heal(page, 'internal notes field', 'fill', testData.internalNotes,
        () => page.locator('textarea#internal-notes'));

    await heal(page, 'stop 2 location dropdown', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-location-name']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'cafe and then some list item', 'click', null,
        () => page.locator("xpath=//li[@*[name()='aria-label' and .='Cafe and then Some']]"));
    await heal(page, 'stop 2 earliest drop off dropdown', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-earliest-DROP_OFF']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'drop off day 31', 'click', null,
        () => page.locator("xpath=//td[@*[name()='aria-label' and .='23']]/following::td[@*[name()='aria-label' and .='31']]//span[@*[name()='data-pc-section' and .='day']]"));
    await heal(page, 'stop 2 latest drop off dropdown', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-latest-DROP_OFF']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'appointment required toggle', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-appointment-required']]/ancestor::div[@*[name()='data-pc-name' and .='toggleswitch']]"));
    await heal(page, 'stop 2 latest drop off dropdown', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-latest-DROP_OFF']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'drop off day 31', 'click', null,
        () => page.locator("xpath=//td[@*[name()='aria-label' and .='23']]/following::td[@*[name()='aria-label' and .='31']]//span[@*[name()='data-pc-section' and .='day']]"));
    await heal(page, 'save to address book', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-save-to-address-book']]"));
    await heal(page, 'carrier notes field', 'fill', testData.carrierNotesOptional,
        () => page.locator('textarea#carrier-notes'));
    await heal(page, 'product dropdown', 'click', null,
        () => page.locator("xpath=//input[@*[name()='placeholder' and .='Enter a description or select a product']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'pr1 list item', 'click', null,
        () => page.locator("xpath=//li[@*[name()='aria-label' and .='pr1']]"));
    await heal(page, 'handling input field', 'click', null,
        () => page.locator("xpath=//input[@*[name()='placeholder' and .='Handling']]"));
    await heal(page, 'weight input field', 'click', null,
        () => page.locator("xpath=//input[@*[name()='placeholder' and .='Weight']]"));
    await heal(page, 'bill to location dropdown', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='bill-to-content-location-name']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'second list item', 'click', null,
        () => page.locator("xpath=//li[@*[name()='aria-posinset' and .='2']]"));
    await heal(page, 'select direction dropdown', 'click', null,
        () => page.locator("xpath=//span[@*[name()='aria-label' and .='Select Direction']]/following-sibling::div[@*[name()='data-pc-section' and .='dropdown']]"));
    await heal(page, 'third party list item', 'click', null,
        () => page.locator("xpath=//li[@*[name()='aria-label' and .='Third Party']]"));
    await heal(page, 'select billing terms dropdown', 'click', null,
        () => page.locator("xpath=//span[@*[name()='aria-label' and .='Select Billing Terms']]/following-sibling::div[@*[name()='data-pc-section' and .='dropdown']]"));
    await heal(page, 'prepaid list item', 'click', null,
        () => page.locator("xpath=//li[@*[name()='aria-label' and .='Prepaid']]"));
    await heal(page, 'select requested mode dropdown', 'click', null,
        () => page.locator("xpath=//span[@*[name()='aria-label' and .='Select Requested Mode']]/following-sibling::div[@*[name()='data-pc-section' and .='dropdown']]"));
    await heal(page, 'specialized list item', 'click', null,
        () => page.locator("xpath=//li[@*[name()='aria-label' and .='Specialized']]"));
    await heal(page, 'internal notes textarea', 'click', null,
        () => page.locator("xpath=//textarea[@*[name()='id' and .='internal-notes']]"));
    await heal(page, 'carrier notes textarea', 'click', null,
        () => page.locator("xpath=//textarea[@*[name()='id' and .='carrier-notes']]"));
});
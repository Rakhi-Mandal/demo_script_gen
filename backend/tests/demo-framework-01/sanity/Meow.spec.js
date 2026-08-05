import testData from '../test-data.json';
import { test, expect } from '../utils/smart-test.js';

test('generated flow @sanity', async ({ page }) => {
    await page.goto(testData.url);
    await page.waitForLoadState('domcontentloaded');

    await page.locator("xpath=//input[@*[name()='type' and .='text']]").click();
    await page.locator('input[id="signInName"][type="text"]').fill(testData.signInName);

    await page.locator("xpath=//button[@*[name()='type' and .='submit']]").click();
    await page.locator("xpath=//input[@*[name()='type' and .='password']]").click();
    await page.locator('input[id="password"][type="password"]').fill(testData.pass);

    await page.locator("xpath=//button[@*[name()='type' and .='submit']]").click();
    await page.locator("xpath=//input[@*[name()='type' and .='search']]").click();
    await page.locator('input[aria-label="Search"][type="search"]').fill(testData.search);

    await page.locator("xpath=//span[@*[name()='data-pc-section' and .='nodelabel']]").click();
    await page.locator("xpath=//a[@*[name()='href' and .='/corsair/order/list']]").click();
    await page.locator("xpath=//a[@*[name()='aria-label' and .='New Order']]").click();
    await page.locator("xpath=//input[@*[name()='id' and .='stop-1-content-location-name']]/following-sibling::button[@*[name()='type' and .='button']]").click();
    await page.locator("xpath=//li[@*[name()='aria-posinset' and .='3']]").click();
    await page.locator("xpath=//input[@*[name()='id' and .='stop-1-content-earliest-PICKUP']]/following-sibling::button[@*[name()='type' and .='button']]").click();
    await page.locator("xpath=//td[@*[name()='aria-label' and .='20']]//span[@*[name()='data-pc-section' and .='day']]").click();
    await page.locator("xpath=//input[@*[name()='id' and .='stop-1-content-latest-PICKUP']]/following-sibling::button[@*[name()='type' and .='button']]").click();
    await page.locator("xpath=//td[@*[name()='aria-label' and .='20']]//span[@*[name()='data-pc-section' and .='day']]").click();
    await page.locator("xpath=//input[@*[name()='id' and .='stop-1-content-requested-date-lock']]").click();
    await page.locator('textarea#internal-notes').fill(testData.internalNotes);

    await page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-location-name']]/following-sibling::button[@*[name()='type' and .='button']]").click();
    await page.locator("xpath=//li[@*[name()='aria-label' and .='Cafe and then Some']]").click();
    await page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-earliest-DROP_OFF']]/following-sibling::button[@*[name()='type' and .='button']]").click();
    await page.locator("xpath=//td[@*[name()='aria-label' and .='23']]/following::td[@*[name()='aria-label' and .='31']]//span[@*[name()='data-pc-section' and .='day']]").click();
    await page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-latest-DROP_OFF']]/following-sibling::button[@*[name()='type' and .='button']]").click();
    await page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-appointment-required']]/ancestor::div[@*[name()='data-pc-name' and .='toggleswitch']]").click();
    await page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-latest-DROP_OFF']]/following-sibling::button[@*[name()='type' and .='button']]").click();
    await page.locator("xpath=//td[@*[name()='aria-label' and .='23']]/following::td[@*[name()='aria-label' and .='31']]//span[@*[name()='data-pc-section' and .='day']]").click();
    await page.locator("xpath=//input[@*[name()='id' and .='stop-2-content-save-to-address-book']]").click();
    await page.locator('textarea#carrier-notes').fill(testData.carrierNotesOptional);
    await page.locator("xpath=//input[@*[name()='placeholder' and .='Enter a description or select a product']]/following-sibling::button[@*[name()='type' and .='button']]").click();
    await page.locator("xpath=//li[@*[name()='aria-label' and .='pr1']]").click();
    await page.locator("xpath=//input[@*[name()='placeholder' and .='Handling']]").click();
    await page.locator("xpath=//input[@*[name()='placeholder' and .='Weight']]").click();
    await page.locator("xpath=//input[@*[name()='id' and .='bill-to-content-location-name']]/following-sibling::button[@*[name()='type' and .='button']]").click();
    await page.locator("xpath=//li[@*[name()='aria-posinset' and .='2']]").click();
    await page.locator("xpath=//span[@*[name()='aria-label' and .='Select Direction']]/following-sibling::div[@*[name()='data-pc-section' and .='dropdown']]").click();
    await page.locator("xpath=//li[@*[name()='aria-label' and .='Third Party']]").click();
    await page.locator("xpath=//span[@*[name()='aria-label' and .='Select Billing Terms']]/following-sibling::div[@*[name()='data-pc-section' and .='dropdown']]").click();
    await page.locator("xpath=//li[@*[name()='aria-label' and .='Prepaid']]").click();
    await page.locator("xpath=//span[@*[name()='aria-label' and .='Select Requested Mode']]/following-sibling::div[@*[name()='data-pc-section' and .='dropdown']]").click();
    await page.locator("xpath=//li[@*[name()='aria-label' and .='Specialized']]").click();
    await page.locator("xpath=//textarea[@*[name()='id' and .='internal-notes']]").click();
    await page.locator("xpath=//textarea[@*[name()='id' and .='carrier-notes']]").click();
});
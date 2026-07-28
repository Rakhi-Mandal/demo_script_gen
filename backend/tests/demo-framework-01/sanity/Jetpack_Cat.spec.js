import testData from '../test-data.json';
import { test, expect } from '../utils/smart-test.js';

test('generated flow @sanity', async ({ page }) => {
    await page.goto(testData.url);
    await page.waitForLoadState('domcontentloaded');


    await page.locator("xpath=//input[@id='signInName']").click();
    await page.getByRole('textbox', { name: 'Enter your username or email' }).fill(testData.signInName);



    await page.locator("xpath=//button[@id='continue']").click();
    await page.locator("xpath=//input[@id='password']").click();
    await page.getByRole('textbox', { name: 'Password' }).fill(testData.pass);


    await page.locator("xpath=//button[@id='next']").click();
    await page.locator("xpath=//input[@aria-label='Search']").click();
    await page.getByRole('searchbox', { name: 'Search' }).fill(testData.search);







  await page.locator("xpath=//span[normalize-space(.)='Test Client JG']").click();
  await page.locator("xpath=//a[@href='/corsair/order/list']").click();
  await page.locator("xpath=//a[@data-testid='order-list-new-button']").click();
  await page.locator("xpath=//form[@id='stop-1-content-location']/div[1]/div[1]/div[1]/button[1]").click();
  await page.locator("xpath=//li[@id='pv_id_2548']").click();
  await page.locator("xpath=//span[@id='pv_id_2569']/button[1]").click();
  await page.locator("xpath=//span[normalize-space(.)='31']").click();
});
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
  await page.locator("xpath=//span[@id='pv_id_2631']/button[1]").click();
  await page.locator("xpath=//span[normalize-space(.)='31']").click();
  await page.locator("xpath=//button[@aria-label='Next Minute']").click();
  await page.locator("xpath=//button[@aria-label='am']").click();
  await page.locator("xpath=//tr[normalize-space(.)='262728293031311']/td[5]/span[1]").click();
  await page.locator("xpath=//input[@id='stop-1-content-save-to-address-book']").click();
  await page.locator("xpath=//span[@id='pv_id_2676']/button[1]").click();
  await page.locator("xpath=//tr[normalize-space(.)='2627282930311']/td[4]/span[1]").click();
  await page.locator("xpath=//span[@id='pv_id_2673']/button[1]").click();
});
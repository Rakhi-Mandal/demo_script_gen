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
  await page.locator("xpath=//a[@href='/corsair/shipment/list']").click();
  await page.locator("xpath=//button[@aria-label='More Filters']").click();
  await page.locator("xpath=//li[@aria-label='Shipment Status']").click();
  await page.locator("xpath=//div[normalize-space(.)='Shipment StatusShipment Status']/div[1]/div[3]").click();
  await page.locator("xpath=//li[@aria-label='Planning']").click();
  await page.locator("xpath=/html[1]/body[1]/div[1]/div[1]/div[2]/main[1]/div[1]/div[2]/div[1]/div[1]/div[1]/div[1]/div[1]").click();
  await page.locator("xpath=//div[normalize-space(.)='IdOriginDestinationTagsTagsShipment StatusPlanning']").click();
//   await page.locator("xpath=//a[normalize-space(.)='118818']").click();
  await page.locator("xpath=//button[@aria-label='Add Quote']").click();
  await page.locator("xpath=//div[normalize-space(.)='ModeMode']/div[1]/div[1]").click();
  await page.locator("xpath=//li[@aria-label='LTL']").click();
  await page.locator("xpath=//tr[normalize-space(.)='LinehaulBuy RateMarginFlatSell Rate']/td[2]/div[1]/div[1]/span[1]/input[1]").click();
  await page.locator("xpath=//button[@aria-label='Save Quote']").click();
  await page.locator("xpath=//button[normalize-space(.)='Select Rate']").click();
  await page.locator("xpath=//button[normalize-space(.)='Confirm']").click();
  await page.locator("xpath=//section[@id='rate-shop']/div[1]/div[1]/div[2]/div[1]/button[1]").click();
  await page.locator("xpath=//button[@aria-label='Add Pickup']").click();
  await page.locator("xpath=//div[@aria-labelledby='pv_id_3523_header']/div[2]/div[1]/div[1]/div[1]/div[1]/div[1]/span[1]/button[1]").click();
  await page.locator("xpath=//tr[normalize-space(.)='2627282930311']/td[5]/span[1]").click();
  await page.locator("xpath=//div[@aria-labelledby='pv_id_3523_header']/div[2]/div[1]").click();
  await page.locator("xpath=//div[@aria-labelledby='pv_id_3523_header']/div[2]/div[1]/div[1]/div[1]").click();
  await page.locator("xpath=//div[normalize-space(.)='Actual DepartureEDTThe related stop is not resolved until departure time is provided']/div[1]/span[1]/button[1]").click();
  await page.locator("xpath=//tr[normalize-space(.)='2627282930311']/td[5]/span[1]").click();
  await page.locator("xpath=//button[@aria-label='Save Event']").click();
  await page.locator("xpath=//button[@aria-label='Add Delivery']").click();
  await page.locator("xpath=//div[normalize-space(.)='Actual ArrivalEDTExpected Arrival: 7/1/2026 8:00 AM EDT']/div[1]/span[1]/button[1]").click();
  await page.locator("xpath=//span[normalize-space(.)='31']").click();
  await page.locator("xpath=//div[@aria-labelledby='pv_id_4058_header']/div[2]").click();
  await page.locator("xpath=//div[@aria-labelledby='pv_id_4058_header']/div[2]/div[1]/div[1]").click();
  await page.locator("xpath=//span[@id='pv_id_5912']/button[1]").click();
  await page.locator("xpath=//span[normalize-space(.)='31']").click();
  await page.locator("xpath=//button[@aria-label='Save Event']").click();
});
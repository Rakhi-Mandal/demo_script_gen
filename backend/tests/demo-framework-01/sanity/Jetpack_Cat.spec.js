import testData from '../test-data.json';
import { test, expect } from '../utils/smart-test.js';

test("generated flow @sanity", async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  const clickTarget1 = page.locator("xpath=//button[@data-cy='btnLoginVisible']//span[normalize-space(.)='Sign in with Email']");
  await clickTarget1.click();

  const fillTarget1 = page.locator("xpath=//input[@name='email']");
  await fillTarget1.fill(testData.email);

  const fillTarget2 = page.locator("xpath=//input[@name='password']");
  await fillTarget2.fill(testData.password);

  const clickTarget2 = page.getByRole("button", { name: "Sign in with Email", exact: true });
  await clickTarget2.click();

  const clickTarget3 = page.locator("xpath=//nav[@data-cy='sidebarDesktop']//button[contains(concat(' ', normalize-space(@class), ' '), ' overflow-hidden ') and normalize-space(.)='Estimating & Pricing']");
  await clickTarget3.click();

  const clickTarget4 = page.locator("xpath=//nav[@data-cy='sidebarDesktop']//a[contains(concat(' ', normalize-space(@class), ' '), ' text-sm ') and @href='https://prep.kala.ink/request-for-proposals']");
  await clickTarget4.click();

  const clickTarget5 = page.locator("xpath=//div[normalize-space(.)='Unassigned']/preceding-sibling::div");
  await clickTarget5.click();

  const clickTarget6 = page.locator("xpath=//span[normalize-space(.)='Filters 0']//span[normalize-space(.)='Filters']");
  await clickTarget6.click();

  const clickTarget7 = page.locator("xpath=//div[normalize-space(.)='Add a filter Apply']/preceding::input[@name='rows.0.column']");
  await clickTarget7.click();

  const clickTarget8 = page.locator("xpath=//li[@data-value='estimateSpecification.priority']/preceding::div[normalize-space(.)='Status']");
  await clickTarget8.click();

  const clickTarget9 = page.getByPlaceholder("select", { exact: true });
  await clickTarget9.click();

  const clickTarget10 = page.locator("xpath=//li[@data-label='not']/preceding-sibling::li[@data-label='is']");
  await clickTarget10.click();

  const clickTarget11 = page.getByPlaceholder("value", { exact: true });
  await clickTarget11.click();

  const clickTarget12 = page.locator("xpath=//li[@data-label='Requested']//div[normalize-space(.)='Requested']");
  await clickTarget12.click();

  const clickTarget13 = page.getByRole("button", { name: "Apply", exact: true });
  await clickTarget13.click();

  const clickTarget14 = page.getByRole("cell", { name: "RFP2970", exact: true });
  await clickTarget14.click();

  const clickTarget15 = page.getByRole("button", { name: "Specifications", exact: true });
  await clickTarget15.click();

  const clickTarget16 = page.locator("xpath=//button[@data-cy='edit-button']");
  await clickTarget16.click();

  const clickTarget17 = page.getByText("Expand All", { exact: true });
  await clickTarget17.click();

  const clickTarget18 = page.getByText("Add Contact", { exact: true });
  await clickTarget18.click();

  const fillTarget3 = page.locator("xpath=//input[@name='contact.first_name']");
  await fillTarget3.fill(testData.contactFirstName);

  const fillTarget4 = page.locator("xpath=//input[@name='contact.last_name']");
  await fillTarget4.fill(testData.contactLastName);

  const clickTarget19 = page.locator("xpath=//div[@id='estimate-contact-create']//span[normalize-space(.)='Continue']");
  await clickTarget19.click();

  const clickTarget20 = page.getByText("Yes, add record", { exact: true });
  await clickTarget20.click();

  const fillTarget5 = page.locator("xpath=//input[@name='estimate.quantity_break_1']");
  await fillTarget5.fill(testData.quantityBreak1);

  
  const clickTarget21 = page.locator("xpath=//input[@name='estimateSpecification.unitSetTypeId']");
  await clickTarget21.click();
  
  await page.waitForTimeout(4000);

  const clickTarget22 = page.getByText("Fanfolded/Boxed", { exact: true });
  await clickTarget22.click();

  const clickTarget23 = page.getByText("Save Request for Proposal", { exact: true });
  await clickTarget23.click();

  const clickTarget24 = page.locator("xpath=//div[contains(concat(' ', normalize-space(@class), ' '), ' pt-0.5 ')]");
  await clickTarget24.click();

  const clickTarget25 = page.getByRole("button", { name: "Specifications", exact: true });
  await clickTarget25.click();

  const clickTarget26 = page.getByRole("button", { name: "Expand All", exact: true });
  await clickTarget26.click();

  const clickTarget27 = page.getByText("126", { exact: true });
  await clickTarget27.click();

  const clickTarget28 = page.getByText("UnitsPer Fanfolded/Boxed", { exact: true });
  await clickTarget28.click();

  const clickTarget29 = page.getByText("You are in the Prep environment. master | amazon-rds", { exact: true });
  await clickTarget29.click();

});

import testData from '../test-data.json';
import { test, expect } from '@playwright/test';

test('generated flow @sanity', async ({ page }) => {
  // 1. Go to the main page
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  const usernameInput = page.locator('input[aria-label="Enter your username or email address"]');
  await expect(usernameInput).toBeVisible();
  await expect(usernameInput).toBeEditable();
  await usernameInput.fill(testData.enterYourUsernameOrEmail);

  const continueButton = page.locator('button[aria-label="Continue"]');
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  const passwordInput = page.locator('input[aria-label="Password"]');
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toBeEditable();
  await passwordInput.fill(testData.password);

  const signInButton = page.locator('#next');
  await expect(signInButton).toBeEnabled();
  await signInButton.click();

  const clientAbSpan = page.locator('span').filter({ hasText: /^client AB$/ }).first();
  await expect(clientAbSpan).toBeVisible();
  await expect(clientAbSpan).toBeEnabled();
  await clientAbSpan.click();

 
  const shipmentBuilderLink = page.getByRole('link', { name: 'Shipment Builder', exact: true });
  await expect(shipmentBuilderLink).toBeVisible();
  await expect(shipmentBuilderLink).toBeEnabled();
  await shipmentBuilderLink.click();

 
  const originInput = page.locator('#criteria-origin');
  await expect(originInput).toBeVisible();
  await expect(originInput).toBeEnabled();
  await originInput.click();

  const countryCombobox = page.locator('span[aria-label="Country"]').first();
  await expect(countryCombobox).toBeVisible();
  await expect(countryCombobox).toBeEnabled();
  await countryCombobox.click();

  const usaOption = page.locator('li[aria-label="United States of America"]');
  await expect(usaOption).toBeVisible();
  await expect(usaOption).toBeEnabled();
  await usaOption.click();

  const doneButton = page.getByRole('button', { name: 'Done', exact: true }).first();
  await expect(doneButton).toBeEnabled();
  await doneButton.click();

  const addToShipmentButton = page.locator('button[aria-label="Add to Shipment"]').first();
  await expect(addToShipmentButton).toBeEnabled();
  await addToShipmentButton.click();

  const getRatesButton = page.getByRole('button', { name: 'Get Rates', exact: true });
  await expect(getRatesButton).toBeEnabled();
  await getRatesButton.click();

  const createShipmentButton = page.locator('button[aria-label="Create Shipment"]');
  await expect(createShipmentButton).toBeEnabled();
  await createShipmentButton.click();

  const assignUsersButton = page.locator('button[aria-label="Assign Users"]');
  await expect(assignUsersButton).toBeVisible();
  await expect(assignUsersButton).toBeEnabled();
  await assignUsersButton.click();

  const forestWirzOption = page.locator('li[aria-label="Forest Wirz"]');
  await expect(forestWirzOption).toBeVisible();
  await expect(forestWirzOption).toBeEnabled();
  await forestWirzOption.click();

  const shipmentDetailsHeading = page.locator('#content-heading');
  await expect(shipmentDetailsHeading).toBeVisible();
  await shipmentDetailsHeading.click();

  const successMessage = page.locator('div').filter({ hasText: /^Successfully saved users$/ }).first();
  await expect(successMessage).toBeVisible();
});
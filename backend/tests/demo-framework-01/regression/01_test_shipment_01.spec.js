import testData from '../test-data.json';
import { test, expect } from '@playwright/test';

test('generated flow @sanity', async ({ page }) => {
  // 1. Go to the application
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  // 2. Login: Enter username/email
  const usernameInput = page.locator('input[aria-label="Enter your username or email address"]');
  await expect(usernameInput).toBeVisible();
  await expect(usernameInput).toBeEditable();
  await usernameInput.fill(testData.enterYourUsernameOrEmail);

  const continueButton = page.locator('button[aria-label="Continue"]');
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  // 4. Enter password
  const passwordInput = page.locator('input[aria-label="Password"]');
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toBeEditable();
  await passwordInput.fill(testData.password);

  const signInButton = page.locator('#next');
  await expect(signInButton).toBeEnabled();
  await signInButton.click();

  await page.waitForLoadState('domcontentloaded');

  const clientAbText = page.locator('span').filter({ hasText: /^client AB$/ }).first();
  await expect(clientAbText).toBeVisible();
  await expect(clientAbText).toBeEnabled();
  await clientAbText.click();

  const shipmentLink = page.getByRole('link', { name: 'Shipment', exact: true });
  await expect(shipmentLink).toBeVisible();
  await expect(shipmentLink).toBeEnabled();
  await shipmentLink.click();

  await page.waitForTimeout(7000);
  const newShipmentButton = page.locator('[data-testid="shipment-list-new-button"]');
  await expect(newShipmentButton).toBeVisible();
  await expect(newShipmentButton).toBeEnabled();
  await newShipmentButton.click();

  // 10. Stop 1: Open location dropdown
  await expect(page.locator("xpath=//form[@id=\"stop-1-content-location\"]/div[1]/div[1]/div[1]/button[@type=\"button\"]")).toBeVisible();
  await expect(page.locator("xpath=//form[@id=\"stop-1-content-location\"]/div[1]/div[1]/div[1]/button[@type=\"button\"]")).toBeEnabled();
  await page.locator("xpath=//form[@id=\"stop-1-content-location\"]/div[1]/div[1]/div[1]/button[@type=\"button\"]").click();

  // 11. Focus location name input (Stop 1)
  const stop1LocationNameInput = page.locator('#stop-1-content-location-name');
  await expect(stop1LocationNameInput).toBeVisible();

  await page.locator("xpath=//form[@id=\"stop-1-content-location\"]/div[1]/div[1]/div[1]/button[@type=\"button\"]").click();

  // 13. Focus location name input again (recorder noise, but present in codegen/trace)
  await expect(stop1LocationNameInput).toBeVisible();

  const stop1LocationOption = page.locator('li[aria-label="Haldex Brake Products Corporation"]');
  await expect(stop1LocationOption).toBeVisible();
  await expect(stop1LocationOption).toBeEnabled();
  await stop1LocationOption.click();

  const chooseDateButton = page.locator('button[aria-label="Choose Date"]').first();
  await expect(chooseDateButton).toBeVisible();
  await expect(chooseDateButton).toBeEnabled();
  await chooseDateButton.click();

  const date22 = page.locator('span').filter({ hasText: /^22$/ }).first();
  await expect(date22).toBeVisible();
  await expect(date22).toBeEnabled();
  await date22.click();

  const stop1RequestedDateLockCheckbox = page.locator('#stop-1-content-requested-date-lock');
  await stop1RequestedDateLockCheckbox.check();
  await expect(stop1RequestedDateLockCheckbox).toBeChecked();

  // 18. Stop 2: Open location dropdown
  await expect(page.locator("xpath=//form[@id=\"stop-2-content-location\"]/div[1]/div[1]/div[1]/button[@type=\"button\"]")).toBeVisible();
  await expect(page.locator("xpath=//form[@id=\"stop-2-content-location\"]/div[1]/div[1]/div[1]/button[@type=\"button\"]")).toBeEnabled();
  await page.locator("xpath=//form[@id=\"stop-2-content-location\"]/div[1]/div[1]/div[1]/button[@type=\"button\"]").click();

  // 19. Focus location name input (Stop 2)
  const stop2LocationNameInput = page.locator('#stop-2-content-location-name');
  await expect(stop2LocationNameInput).toBeVisible();

  const stop2LocationOption = page.locator('li[aria-label="Novapath Supply Chain Systems"]').first();
  await expect(stop2LocationOption).toBeVisible();
  await expect(stop2LocationOption).toBeEnabled();
  await stop2LocationOption.click();

  const description = page.locator("xpath=//input[@id='description-0']/following-sibling::button");
  await description.click();

  const someDescOption = page.locator('li[aria-label="some desc"]').first();
  await expect(someDescOption).toBeVisible();
  await expect(someDescOption).toBeEnabled();
  await someDescOption.click();

  // 21. Focus location name input again (recorder noise, but present in codegen/trace)
  await expect(stop2LocationNameInput).toBeVisible();

  const stop2AddressLine2Input = page.locator('#stop-2-content-location-line2');
  await expect(stop2AddressLine2Input).toBeVisible();
  await expect(stop2AddressLine2Input).toBeEditable();
  await stop2AddressLine2Input.fill(testData.stop2ContentLocationLine2);

  const stop2AddressLine3Input = page.locator('#stop-2-content-location-line3');
  await expect(stop2AddressLine3Input).toBeVisible();
  await expect(stop2AddressLine3Input).toBeEditable();
  await stop2AddressLine3Input.fill(testData.stop2ContentLocationLine3);

  const stop2ContactNameInput = page.locator('#stop-2-content-contact-contact-name');
  await expect(stop2ContactNameInput).toBeVisible();
  await expect(stop2ContactNameInput).toBeEditable();
  await stop2ContactNameInput.fill(testData.stop2ContentContactContactName);

  // 25. Focus Contact Phone (Stop 2)
  const stop2ContactPhoneInput = page.locator('#stop-2-content-contact-contact-phone');
  await expect(stop2ContactPhoneInput).toBeVisible();
  await expect(stop2ContactPhoneInput).toBeEnabled();
  await stop2ContactPhoneInput.click();

  const stop2ContactEmailInput = page.locator('#stop-2-content-contact-contact-email');
  await expect(stop2ContactEmailInput).toBeVisible();
  await expect(stop2ContactEmailInput).toBeEditable();
  await stop2ContactEmailInput.fill(testData.stop2ContentContactContactEmail);

  const stop2RequestedDateLockCheckbox = page.locator('#stop-2-content-requested-date-lock');
  await stop2RequestedDateLockCheckbox.check();
  await expect(stop2RequestedDateLockCheckbox).toBeChecked();

  // 30. Handling input
  const handlingInput = page.locator('#handling-0');
  await expect(handlingInput).toBeVisible();
  await expect(handlingInput).toBeEnabled();
  await handlingInput.fill(testData.handlingInput);

  // 31. Weight input
  const weightInput = page.locator('#weight-0');
  await expect(weightInput).toBeVisible();
  await expect(weightInput).toBeEnabled();
  await weightInput.fill(testData.weightInput);

  // 32. Length input
  const lengthInput = page.locator('#dims-0-length');
  await expect(lengthInput).toBeVisible();
  await expect(lengthInput).toBeEnabled();
  await lengthInput.fill(testData.lengthInput);

  // 33. Width input
  const widthInput = page.locator('#dims-0-width');
  await expect(widthInput).toBeVisible();
  await expect(widthInput).toBeEnabled();
  await widthInput.fill(testData.widthInput);

  // 34. Height input
  const heightInput = page.locator('#dims-0-height');
  await expect(heightInput).toBeVisible();
  await expect(heightInput).toBeEnabled();
  await heightInput.fill(testData.heightInput);

  // 35. Bill To: Open location dropdown
  await expect(page.locator("xpath=//form[@id=\"bill-to-content-location\"]/div[1]/div[1]/div[1]/button[@type=\"button\"]")).toBeVisible();
  await expect(page.locator("xpath=//form[@id=\"bill-to-content-location\"]/div[1]/div[1]/div[1]/button[@type=\"button\"]")).toBeEnabled();
  await page.locator("xpath=//form[@id=\"bill-to-content-location\"]/div[1]/div[1]/div[1]/button[@type=\"button\"]").click();

  // 36. Focus Bill To location name input
  const billToLocationNameInput = page.locator('#bill-to-content-location-name');
  await expect(billToLocationNameInput).toBeVisible();

  const billToLocationOption = page.locator('li[aria-label="Novapath Supply Chain Systems"]').first();
  await expect(billToLocationOption).toBeVisible();
  await billToLocationOption.click();

  const directionDropdown = page.locator('span[aria-label="Select Direction"]');
  await expect(directionDropdown).toBeVisible();
  await expect(directionDropdown).toBeEnabled();
  await directionDropdown.click();
  const inboundOption = page.locator('li[aria-label="Inbound"]');
  await expect(inboundOption).toBeVisible();
  await expect(inboundOption).toBeEnabled();
  await inboundOption.click();

  const billingTermsDropdown = page.locator('span[aria-label="Select Billing Terms"]');
  await expect(billingTermsDropdown).toBeVisible();
  await expect(billingTermsDropdown).toBeEnabled();
  await billingTermsDropdown.click();
  const collectOption = page.locator('li[aria-label="Collect"]');
  await expect(collectOption).toBeVisible();
  await expect(collectOption).toBeEnabled();
  await collectOption.click();

  const requestedModeDropdown = page.locator('span[aria-label="Select Requested Mode"]');
  await expect(requestedModeDropdown).toBeVisible();
  await expect(requestedModeDropdown).toBeEnabled();
  await requestedModeDropdown.click();
  const breakBulkOption = page.locator('li[aria-label="Break Bulk"]');
  await expect(breakBulkOption).toBeVisible();
  await expect(breakBulkOption).toBeEnabled();
  await breakBulkOption.click();

  const equipmentTypeDropdown = page.locator('span[aria-label="Select Equipment Type"]');
  await expect(equipmentTypeDropdown).toBeVisible();
  await expect(equipmentTypeDropdown).toBeEnabled();
  await equipmentTypeDropdown.click();

  const internalNotesInput = page.locator('#internal-notes');
  await expect(internalNotesInput).toBeVisible();
  await expect(internalNotesInput).toBeEditable();
  await internalNotesInput.fill(testData.stop1ContentInternalNotes);

  const createShipmentButton = page.locator('button[aria-label="Create Shipment for client AB"]');
  await expect(createShipmentButton).toBeEnabled();
  await createShipmentButton.click();

  const successMessage = page.locator('div').filter({ hasText: /^Successfully saved shipment$/ }).first();
  await expect(successMessage).toBeVisible();
});
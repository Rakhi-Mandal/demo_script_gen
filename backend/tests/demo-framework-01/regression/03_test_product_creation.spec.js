import testData from '../test-data.json';
import { test, expect } from '@playwright/test';

test('generated flow @sanity', async ({ page }) => {
  // 1. Go to the app
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

  const clientAbSpan = page.locator('span').filter({ hasText: /^client AB$/ }).first();
  await expect(clientAbSpan).toBeVisible();
  await expect(clientAbSpan).toBeEnabled();
  await clientAbSpan.click();

  const settingsLink = page.getByRole('link', { name: 'Settings', exact: true });
  await expect(settingsLink).toBeVisible();
  await expect(settingsLink).toBeEnabled();
  await settingsLink.click();

  const productsLink = page.getByRole('link', { name: 'Products', exact: true });
  await expect(productsLink).toBeVisible();
  await expect(productsLink).toBeEnabled();
  await productsLink.click();

  const addProductLink = page.locator('a[aria-label="Add Product"]');
  await expect(addProductLink).toBeVisible();
  await expect(addProductLink).toBeEnabled();
  await addProductLink.click();

  const productNameInput = page.locator('#product-edit_0-name');
  await expect(productNameInput).toBeVisible();
  await expect(productNameInput).toBeEditable();
  await productNameInput.fill(testData.productEdit0Name);

  const productNumberInput = page.locator('#product-edit_0-product-number');
  await expect(productNumberInput).toBeVisible();
  await expect(productNumberInput).toBeEditable();
  await productNumberInput.fill(testData.productNum);

  const productDescriptionInput = page.locator('#product-edit_0-description');
  await expect(productDescriptionInput).toBeVisible();
  await expect(productDescriptionInput).toBeEditable();
  await productDescriptionInput.fill(testData.productEdit0Description);

  const turnableCheckbox = page.locator('#product-edit_0-turnable');
  await turnableCheckbox.check();
  await expect(turnableCheckbox).toBeChecked();

  const handlingInput = page.locator('#product-edit_0-handling').first();
  await expect(handlingInput).toBeVisible();
  await expect(handlingInput).toBeEnabled();
  await handlingInput.click();

  const packagingInput = page.locator('#product-edit_0-packaging').first();
  await expect(packagingInput).toBeVisible();
  await expect(packagingInput).toBeEnabled();
  await packagingInput.click();

  const specialInstructionsInput = page.locator('#product-edit_0-special-instructions').first();
  await expect(specialInstructionsInput).toBeVisible();
  await expect(specialInstructionsInput).toBeEditable();
  await specialInstructionsInput.fill(testData.productEdit0SpecialInstructions);

  const lengthInput = page.locator('#product-edit_0-dims-length').first() ;
  await expect(lengthInput).toBeVisible();
  await expect(lengthInput).toBeEnabled();
  await lengthInput.fill(testData.lengthInput);

  const widthInput = page.locator('#product-edit_0-dims-width').first();
  await expect(widthInput).toBeVisible();
  await expect(widthInput).toBeEnabled();
  await widthInput.fill(testData.widthInput);

  const heightInput = page.locator('#product-edit_0-dims-height').first() ;
  await expect(heightInput).toBeVisible();
  await expect(heightInput).toBeEnabled();
  await heightInput.fill(testData.heightInput);

  const weightInput = page.locator('#product-edit_0-weight').first();
  await expect(weightInput).toBeVisible();
  await expect(weightInput).toBeEnabled();
  await weightInput.fill(testData.weightInput);

  const createButton = page.locator('button[aria-label="Create"]');
  await expect(createButton).toBeEnabled();
  await createButton.click();

});
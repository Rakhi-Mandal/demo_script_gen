import testData from '../test-data.json';
import { test, expect } from '@playwright/test';

test('generated flow @sanity', async ({ page }) => {
  // 1. Go to login page
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  const signInWithEmailButton = page.locator('[data-cy="btnLoginVisible"]');
  await expect(signInWithEmailButton).toBeEnabled();
  await signInWithEmailButton.click();

  const emailInput = page.locator('input[name="email"][type="email"]');
  await expect(emailInput).toBeVisible();
  await expect(emailInput).toBeEditable();
  await emailInput.fill(testData.email);

  const passwordInput = page.locator('input[name="password"][type="password"]');
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toBeEditable();
  await passwordInput.fill(testData.password);

  const signInConfirmButton = page.locator('[data-cy="btnLoginConfirm"]');
  await expect(signInConfirmButton).toBeEnabled();
  await signInConfirmButton.click();

  await page.waitForLoadState('domcontentloaded');

  const materialsLink = page.getByRole('link', { name: 'Materials', exact: true });
  await expect(materialsLink).toBeVisible();
  await expect(materialsLink).toBeEnabled();
  await materialsLink.click();

  await page.waitForLoadState('domcontentloaded');

  const newMaterialButton = page.getByRole('button', { name: 'New Material', exact: true });
  await expect(newMaterialButton).toBeEnabled();
  await newMaterialButton.click();
  const stepField = page.getByRole('textbox', { name: 'Material Name' });
  await expect(stepField).toBeVisible();
  await expect(stepField).toBeEditable();
  await stepField.fill('Material1');

  const materialTypeInput = page.locator('input[name="materialTypeSelectedId"][type="text"]');
  await expect(materialTypeInput).toBeVisible();
  await expect(materialTypeInput).toBeEnabled();
  await materialTypeInput.click();

  const flexPackOption = page.locator('li[data-label="FlexPack"]');
  await expect(flexPackOption).toBeVisible();
  await expect(flexPackOption).toBeEnabled();
  await flexPackOption.click();

  const materialClassInput = page.locator('input[name="material.material_class_id"][type="text"]');
  await expect(materialClassInput).toBeVisible();
  await expect(materialClassInput).toBeEnabled();
  await materialClassInput.click();

  const flpFilmOption = page.locator('li[data-label="FLP Film"]');
  await expect(flpFilmOption).toBeVisible();
  await expect(flpFilmOption).toBeEnabled();
  await flpFilmOption.click();
});
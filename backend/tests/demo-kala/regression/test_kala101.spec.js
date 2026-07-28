import testData from '../test-data.json';
import { test, expect } from '@playwright/test';

test('basic flow @regression', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'Sign in with Email', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email', exact: true }).click();

  const emailInput = page.locator('input[name="email"][type="email"]');
  await expect(emailInput).toBeVisible();
  await expect(emailInput).toBeEditable();
  await emailInput.fill(testData.email);

  const passwordInput = page.locator('input[name="password"][type="password"]');
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toBeEditable();
  await passwordInput.fill(testData.password);

  await expect(page.getByRole('button', { name: 'Sign in with Email', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button').filter({ hasText: 'Customer' })).toBeEnabled();
  await page.getByRole('button').filter({ hasText: 'Customer' }).click();

  await expect(page.getByRole('link', { name: 'Customers', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Customers', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'New Customer', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'New Customer', exact: true }).click();

  const customerNameInput = page.locator('input[name="customer.name"][type="text"]');
  await expect(customerNameInput).toBeVisible();
  await expect(customerNameInput).toBeEditable();
  await customerNameInput.fill('new_auto101111110101');

  const marketInput = page.locator('[data-cy="customerCreateSelectMarket"]');
  await expect(marketInput).toBeVisible();
  await expect(marketInput).toBeEnabled();
  await marketInput.click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.locator('li[data-label="Automotive"]')).toBeEnabled();
  await page.locator('li[data-label="Automotive"]').click();

  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Yes, add record', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Yes, add record', exact: true }).click();

  await expect(page.getByRole('link', { name: 'Go to record', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Go to record', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group', exact: true }).click();

  await expect(page.getByRole('link', { name: 'Logout', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Logout', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');
});
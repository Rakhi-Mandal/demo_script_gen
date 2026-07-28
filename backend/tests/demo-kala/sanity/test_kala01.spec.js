import testData from '../test-data.json';
import { test, expect } from '@playwright/test';

test('create customer @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'Sign in with Email', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email', exact: true }).click();
  await expect(page.locator('input[name="email"][type="email"]')).toBeEnabled();
  await page.locator('input[name="email"][type="email"]').click();
  await expect(page.locator('input[name="email"][type="email"]')).toBeEditable();
  await page.locator('input[name="email"][type="email"]').fill(testData.email);
  await expect(page.locator('input[name="password"][type="password"]')).toBeEnabled();
  await page.locator('input[name="password"][type="password"]').click();
  await expect(page.locator('input[name="password"][type="password"]')).toBeEditable();
  await page.locator('input[name="password"][type="password"]').fill(testData.password);
  await expect(page.getByRole('button', { name: 'Sign in with Email', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email', exact: true }).click();
  
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('button', { name: 'Customer' })).toBeEnabled();
  await page.getByRole('button', { name: 'Customer' }).click();
  await expect(page.getByRole('link', { name: 'Customers', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Customers', exact: true }).click();
  
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('button', { name: 'New Customer', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'New Customer', exact: true }).click();
  
  const customerNameInput = page.locator('input[name="customer.name"][type="text"]');
  await expect(customerNameInput).toBeEnabled();
  await customerNameInput.click();
  await expect(customerNameInput).toBeEditable();
  await customerNameInput.fill('demo_auto188');

  const marketInput = page.locator('[data-cy="customerCreateSelectMarket"]');
  await expect(marketInput).toBeEnabled();
  await marketInput.click();
  await marketInput.focus();
  await marketInput.click();

  await expect(page.locator('li[data-label="Automotive"]')).toBeEnabled();
  await page.locator('li[data-label="Automotive"]').click();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Yes, add record', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Yes, add record', exact: true }).click();
  
  await expect(page.getByRole('link', { name: 'Go to record', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Go to record', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');
  
  await expect(page.locator('p').filter({ hasText: /^demo_auto188$/ }).first()).toBeVisible();
  
  await expect(page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Logout', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Logout', exact: true }).click();
  
  await page.waitForLoadState('domcontentloaded');
});
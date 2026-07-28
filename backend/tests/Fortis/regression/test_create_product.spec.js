import { test, expect } from '@playwright/test';

const testData = {
  url: 'https://prep.kala.ink/login',
  email: 'kishore.b@feuji.com',
  password: 'Testauto@21',
  customerName: 'customcus1',
  customerpat: '787',
  brand: 'brand',
  odnum: '77',
  uomnum: '66',
  desc: 'desc added',
};

test('create product @sanity', async ({ page }) => {

  // Login
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'Sign in with Email' })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email' }).click();

  await expect(page.locator('input[name="email"]')).toBeEditable();
  await page.locator('input[name="email"]').fill(testData.email);

  await expect(page.locator('input[name="password"]')).toBeEditable();
  await page.locator('input[name="password"]').fill(testData.password);

  await page.getByRole('button', { name: 'Sign in with Email' }).click();
  await page.waitForLoadState('domcontentloaded');

  // Navigate to Product Items
  await page.getByRole('button').filter({ hasText: 'Customer' }).click();
  await page.getByRole('button').filter({ hasText: 'Items' }).click();
  await page.getByRole('link', { name: 'Product Items' }).click();

  await page.waitForLoadState('domcontentloaded');

  // Create New Product Item
  await page.getByRole('link', { name: 'New Product Item' }).click();

  await page.waitForLoadState('domcontentloaded');

  // Select Customer
  await page.getByRole('button', { name: 'Select Customer' }).click();

  await page.locator('input[name="filters.searchByName"]')
    .fill(testData.customerName);

  await page.locator('input[name="customerSelectedId"]')
    .first()
    .check();

  await page.getByRole('button', { name: 'Continue' }).click();

  // Product Details
  await page.getByRole('textbox', { name: 'Select a Product Class' }).click();
  await page.getByText('Blank Label').click();

  await page.getByRole('textbox', { name: 'Customer Part Number' })
    .fill(testData.customerpat);

  await page.getByRole('textbox', { name: 'Brand Name' })
    .fill(testData.brand);

  await page.getByRole('spinbutton', { name: 'Max OD (inches)' })
    .fill(testData.odnum);

  // Select Substrate
  await page.getByRole('textbox', { name: 'Select Substrate' }).click();
  await page.getByText('ALUMINUM').click();

  // Select Coating
  await page.getByRole('textbox', { name: 'Select a Coating' }).click();
  await page.getByText('Cold Foil').click();

  // Select Core Diameter
  await page.getByRole('textbox', { name: 'Select a Core Diameter' }).click();
  await page.getByRole('list').getByText('1', { exact: true }).click();

  // Select Unwind
  await page.getByRole('textbox', { name: 'Select an Unwind' }).click();
  await page.getByText('- Print out, Head first.').click();

  // Select Sales Unit
  await page.getByRole('textbox', { name: 'Select a Sales Unit' }).click();
  await page.getByText('Meters').click();

  // Quantity
  await page.getByRole('spinbutton', { name: 'Quantity in Sales UOM' })
    .fill(testData.uomnum);

  // Description
  await page.getByRole('textbox', { name: 'Description' })
    .fill(testData.desc);

  // Checkbox
  await page.getByRole('checkbox', { name: 'C of C Required' })
    .first()
    .check();

  // Select Category
  await page.getByRole('textbox', { name: 'Select a category' }).click();
  await page.getByText('Film', { exact: true }).first().click();

  // Create Product
  await page.getByRole('button', { name: 'Create' }).click();

  // Validation
  await expect(page.getByText('Ready')).toBeVisible();

  // Logout
  await page.getByRole('button', { name: 'Links' }).click();

  await page.getByRole('button', {
    name: 'Kishore Battula Fortis Solutions Group'
  }).click();

  await page.getByRole('link', { name: 'Logout' }).click();

  await page.waitForLoadState('domcontentloaded');
});
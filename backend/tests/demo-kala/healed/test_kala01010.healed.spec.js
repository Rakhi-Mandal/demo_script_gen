import testData from '../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('create product @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'sign in with email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'sign in with email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'email input', 'visible', null, () => page.locator('input[name="email"]'));
  await heal(page, 'email input', 'click', null, () => page.locator('input[name="email"]'));
  await heal(page, 'email input', 'fill', testData.email, () => page.locator('input[name="email"]'));
  await heal(page, 'password input', 'visible', null, () => page.locator('input[name="password"]'));
  await heal(page, 'password input', 'click', null, () => page.locator('input[name="password"]'));
  await heal(page, 'password input', 'fill', testData.password, () => page.locator('input[name="password"]'));
  await heal(page, 'sign in with email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'sign in with email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'customer button', 'visible', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await heal(page, 'customer button', 'click', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await heal(page, 'items button', 'visible', null, () => page.getByRole('button').filter({ hasText: 'Items' }));
  await heal(page, 'items button', 'click', null, () => page.getByRole('button').filter({ hasText: 'Items' }));
  await heal(page, 'product items link', 'visible', null, () => page.getByRole('link', { name: 'Product Items' }));
  await heal(page, 'product items link', 'click', null, () => page.getByRole('link', { name: 'Product Items' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'new product item link', 'visible', null, () => page.getByRole('link', { name: 'New Product Item' }));
  await heal(page, 'new product item link', 'click', null, () => page.getByRole('link', { name: 'New Product Item' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'select customer button', 'visible', null, () => page.getByRole('button', { name: 'Select Customer' }));
  await heal(page, 'select customer button', 'click', null, () => page.getByRole('button', { name: 'Select Customer' }));
  await heal(page, 'search by name input', 'visible', null, () => page.locator('input[name="filters.searchByName"]'));
  await heal(page, 'search by name input', 'click', null, () => page.locator('input[name="filters.searchByName"]'));
  await heal(page, 'search by name input', 'fill', 'test_auto1', () => page.locator('input[name="filters.searchByName"]'));
  
  await heal(page, 'customer radio', 'visible', null, () => page.locator('input[name="customerSelectedId"]').first());
  await heal(page, 'customer radio', 'check', null, () => page.locator('input[name="customerSelectedId"]').first());
  
  await heal(page, 'continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue' }));
  await heal(page, 'continue button', 'click', null, () => page.getByRole('button', { name: 'Continue' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'select a product class textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Product Class' }));
  await heal(page, 'select a product class textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Product Class' }));
  await heal(page, 'blank label', 'visible', null, () => page.getByText('Blank Label'));
  await heal(page, 'blank label', 'click', null, () => page.getByText('Blank Label'));
  
  await heal(page, 'customer part number textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Customer Part Number' }));
  await heal(page, 'customer part number textbox', 'click', null, () => page.getByRole('textbox', { name: 'Customer Part Number' }));
  await heal(page, 'customer part number textbox', 'fill', '45', () => page.getByRole('textbox', { name: 'Customer Part Number' }));
  
  await heal(page, 'brand name textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Brand Name' }));
  await heal(page, 'brand name textbox', 'click', null, () => page.getByRole('textbox', { name: 'Brand Name' }));
  await heal(page, 'brand name textbox', 'fill', 'brand', () => page.getByRole('textbox', { name: 'Brand Name' }));
  
  await heal(page, 'max od inches field', 'visible', null, () => page.locator('ui-field').filter({ hasText: /^Max OD \(inches\)$/ }).first());
  await heal(page, 'max od inches field', 'click', null, () => page.locator('ui-field').filter({ hasText: /^Max OD \(inches\)$/ }).first());
  await heal(page, 'max od inches spinbutton', 'visible', null, () => page.getByRole('spinbutton', { name: 'Max OD (inches)' }));
  await heal(page, 'max od inches spinbutton', 'fill', '66', () => page.getByRole('spinbutton', { name: 'Max OD (inches)' }));
  
  await heal(page, 'select substrate textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select Substrate' }));
  await heal(page, 'select substrate textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select Substrate' }));
  await heal(page, 'aluminum text', 'visible', null, () => page.getByText('ALUMINUM'));
  await heal(page, 'aluminum text', 'click', null, () => page.getByText('ALUMINUM'));
  
  await heal(page, 'select a coating textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Coating' }));
  await heal(page, 'select a coating textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Coating' }));
  await heal(page, 'cold foil text', 'visible', null, () => page.getByText('Cold Foil'));
  await heal(page, 'cold foil text', 'click', null, () => page.getByText('Cold Foil'));
  
  await heal(page, 'select a core diameter textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Core Diameter' }));
  await heal(page, 'select a core diameter textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Core Diameter' }));
  await heal(page, 'core diameter listitem', 'visible', null, () => page.getByRole('listitem').nth(2));
  await heal(page, 'core diameter listitem', 'click', null, () => page.getByRole('listitem').nth(2));
  
  await heal(page, 'select an unwind textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select an Unwind' }));
  await heal(page, 'select an unwind textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select an Unwind' }));
  await heal(page, 'print out text', 'visible', null, () => page.getByText('- Print out, Head first.'));
  await heal(page, 'print out text', 'click', null, () => page.getByText('- Print out, Head first.'));
  
  await heal(page, 'select a sales unit textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Sales Unit' }));
  await heal(page, 'select a sales unit textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Sales Unit' }));
  await heal(page, 'meters text', 'visible', null, () => page.getByText('Meters'));
  await heal(page, 'meters text', 'click', null, () => page.getByText('Meters'));
  
  await heal(page, 'quantity in sales uom spinbutton', 'visible', null, () => page.getByRole('spinbutton', { name: 'Quantity in Sales UOM' }));
  await heal(page, 'quantity in sales uom spinbutton', 'click', null, () => page.getByRole('spinbutton', { name: 'Quantity in Sales UOM' }));
  await heal(page, 'quantity in sales uom spinbutton', 'fill', '88', () => page.getByRole('spinbutton', { name: 'Quantity in Sales UOM' }));
  
  await heal(page, 'description textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Description' }));
  await heal(page, 'description textbox', 'click', null, () => page.getByRole('textbox', { name: 'Description' }));
  await heal(page, 'description textbox', 'fill', 'added', () => page.getByRole('textbox', { name: 'Description' }));
  
  await heal(page, 'C of C Required checkbox', 'check', null, () => page.getByRole('checkbox', { name: 'C of C Required' }).first());
  
  await heal(page, 'select a category textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a category' }));
  await heal(page, 'select a category textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a category' }));
  await heal(page, 'film text', 'visible', null, () => page.getByText('Film'));
  await heal(page, 'film text', 'click', null, () => page.getByText('Film'));
  
  await heal(page, 'create button', 'visible', null, () => page.getByRole('button', { name: 'Create' }));
  await heal(page, 'create button', 'click', null, () => page.getByRole('button', { name: 'Create' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'customer part number textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Customer Part Number' }));
  await heal(page, 'customer part number textbox', 'click', null, () => page.getByRole('textbox', { name: 'Customer Part Number' }));
  await heal(page, 'customer part number textbox', 'fill', '455', () => page.getByRole('textbox', { name: 'Customer Part Number' }));
  
  await heal(page, 'create button', 'visible', null, () => page.getByRole('button', { name: 'Create' }));
  await heal(page, 'create button', 'click', null, () => page.getByRole('button', { name: 'Create' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'links button', 'visible', null, () => page.getByRole('button', { name: 'Links' }));
  await heal(page, 'links button', 'click', null, () => page.getByRole('button', { name: 'Links' }));
  await heal(page, 'rounded button', 'visible', null, () => page.locator('.items-center.p-1\\.5.border.border-transparent.rounded-full.group.rounded-button-hover-fix').first());
  await heal(page, 'rounded button', 'click', null, () => page.locator('.items-center.p-1\\.5.border.border-transparent.rounded-full.group.rounded-button-hover-fix').first());
  
  await heal(page, 'third list item', 'visible', null, () => page.locator('li:nth-child(3) > .items-center.p-1\\.5'));
  await heal(page, 'third list item', 'click', null, () => page.locator('li:nth-child(3) > .items-center.p-1\\.5'));
  
  await heal(page, 'kishore battula button', 'visible', null, () => page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group' }));
  await heal(page, 'kishore battula button', 'click', null, () => page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group' }));
  await heal(page, 'logout link', 'visible', null, () => page.getByRole('link', { name: 'Logout' }));
  await heal(page, 'logout link', 'click', null, () => page.getByRole('link', { name: 'Logout' }));
});
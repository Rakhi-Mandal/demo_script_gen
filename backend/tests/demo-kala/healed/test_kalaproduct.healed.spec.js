import testData from '../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('create product @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'email input', 'visible', null, () => page.locator('input[name="email"]'));
  await heal(page, 'email input', 'click', null, () => page.locator('input[name="email"]'));
  await heal(page, 'email input', 'visible', null, () => page.locator('input[name="email"]'));
  await heal(page, 'email input', 'fill', testData.email, () => page.locator('input[name="email"]'));
  await heal(page, 'password input', 'visible', null, () => page.locator('input[name="password"]'));
  await heal(page, 'password input', 'click', null, () => page.locator('input[name="password"]'));
  await heal(page, 'password input', 'visible', null, () => page.locator('input[name="password"]'));
  await heal(page, 'password input', 'fill', testData.password, () => page.locator('input[name="password"]'));
  await heal(page, 'sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  
  await page.waitForLoadState('domcontentloaded');
  await heal(page, 'Customer button', 'visible', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await heal(page, 'Customer button', 'click', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await heal(page, 'Items button', 'visible', null, () => page.getByRole('button').filter({ hasText: 'Items' }));
  await heal(page, 'Items button', 'click', null, () => page.getByRole('button').filter({ hasText: 'Items' }));
  await heal(page, 'Product Items link', 'visible', null, () => page.getByRole('link', { name: 'Product Items' }));
  await heal(page, 'Product Items link', 'click', null, () => page.getByRole('link', { name: 'Product Items' }));
  
  await page.waitForLoadState('domcontentloaded');
  await heal(page, 'New Product Item link', 'visible', null, () => page.getByRole('link', { name: 'New Product Item' }));
  await heal(page, 'New Product Item link', 'click', null, () => page.getByRole('link', { name: 'New Product Item' }));
  
  await page.waitForLoadState('domcontentloaded');
  await heal(page, 'Select Customer button', 'visible', null, () => page.getByRole('button', { name: 'Select Customer' }));
  await heal(page, 'Select Customer button', 'click', null, () => page.getByRole('button', { name: 'Select Customer' }));
  
  await heal(page, 'filters.searchByName input', 'visible', null, () => page.locator('input[name="filters.searchByName"]'));
  await heal(page, 'filters.searchByName input', 'click', null, () => page.locator('input[name="filters.searchByName"]'));
  await heal(page, 'filters.searchByName input', 'visible', null, () => page.locator('input[name="filters.searchByName"]'));
  await heal(page, 'filters.searchByName input', 'fill', 'test_auto1', () => page.locator('input[name="filters.searchByName"]'));
  
  await heal(page, 'customerSelectedId checkbox', 'check', null, () => page.locator('input[name="customerSelectedId"]').first());
  await heal(page, 'Choose Customer heading', 'visible', null, () => page.getByRole('heading', { name: 'Choose Customer' }));
  
  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue' }));
  await heal(page, 'Continue button', 'click', null, () => page.getByRole('button', { name: 'Continue' }));
  
  await heal(page, 'Select a Product Class textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Product Class' }));
  await heal(page, 'Select a Product Class textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Product Class' }));
  await heal(page, 'Blank Label text', 'visible', null, () => page.getByText('Blank Label'));
  await heal(page, 'Blank Label text', 'click', null, () => page.getByText('Blank Label'));
  
  await heal(page, 'Customer Part Number textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Customer Part Number' }));
  await heal(page, 'Customer Part Number textbox', 'click', null, () => page.getByRole('textbox', { name: 'Customer Part Number' }));
  await heal(page, 'Customer Part Number textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Customer Part Number' }));
  await heal(page, 'Customer Part Number textbox', 'fill', '444', () => page.getByRole('textbox', { name: 'Customer Part Number' }));
  
  await heal(page, 'Brand Name textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Brand Name' }));
  await heal(page, 'Brand Name textbox', 'click', null, () => page.getByRole('textbox', { name: 'Brand Name' }));
  await heal(page, 'Brand Name textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Brand Name' }));
  await heal(page, 'Brand Name textbox', 'fill', 'brand', () => page.getByRole('textbox', { name: 'Brand Name' }));
  
  await heal(page, 'Max OD (inches) spinbutton', 'visible', null, () => page.getByRole('spinbutton', { name: 'Max OD (inches)' }));
  await heal(page, 'Max OD (inches) spinbutton', 'click', null, () => page.getByRole('spinbutton', { name: 'Max OD (inches)' }));
  await heal(page, 'Max OD (inches) spinbutton', 'visible', null, () => page.getByRole('spinbutton', { name: 'Max OD (inches)' }));
  await heal(page, 'Max OD (inches) spinbutton', 'fill', '55', () => page.getByRole('spinbutton', { name: 'Max OD (inches)' }));
  
  await heal(page, 'Select Substrate textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select Substrate' }));
  await heal(page, 'Select Substrate textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select Substrate' }));
  await heal(page, 'ALUMINUM text', 'visible', null, () => page.getByText('ALUMINUM'));
  await heal(page, 'ALUMINUM text', 'click', null, () => page.getByText('ALUMINUM'));
  
  await heal(page, 'Select a Coating textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Coating' }));
  await heal(page, 'Select a Coating textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Coating' }));
  await heal(page, 'Cold Foil text', 'visible', null, () => page.getByText('Cold Foil'));
  await heal(page, 'Cold Foil text', 'click', null, () => page.getByText('Cold Foil'));
  
  await heal(page, 'Select a Core Diameter textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Core Diameter' }));
  await heal(page, 'Select a Core Diameter textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Core Diameter' }));
  await heal(page, '1 text', 'visible', null, () => page.getByRole('list').getByText('1', { exact: true }));
  await heal(page, '1 text', 'click', null, () => page.getByRole('list').getByText('1', { exact: true }));
  
  await heal(page, 'Select an Unwind textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select an Unwind' }));
  await heal(page, 'Select an Unwind textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select an Unwind' }));
  await heal(page, 'Print out, Head first. text', 'visible', null, () => page.getByText('- Print out, Head first.'));
  await heal(page, 'Print out, Head first. text', 'click', null, () => page.getByText('- Print out, Head first.'));
  
  await heal(page, 'Select a Sales Unit textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Sales Unit' }));
  await heal(page, 'Select a Sales Unit textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Sales Unit' }));
  await heal(page, 'Meters text', 'visible', null, () => page.getByText('Meters'));
  await heal(page, 'Meters text', 'click', null, () => page.getByText('Meters'));
  
  await heal(page, 'Quantity in Sales UOM spinbutton', 'visible', null, () => page.getByRole('spinbutton', { name: 'Quantity in Sales UOM' }));
  await heal(page, 'Quantity in Sales UOM spinbutton', 'click', null, () => page.getByRole('spinbutton', { name: 'Quantity in Sales UOM' }));
  await heal(page, 'Quantity in Sales UOM spinbutton', 'visible', null, () => page.getByRole('spinbutton', { name: 'Quantity in Sales UOM' }));
  await heal(page, 'Quantity in Sales UOM spinbutton', 'fill', '66', () => page.getByRole('spinbutton', { name: 'Quantity in Sales UOM' }));
  
  await heal(page, 'Description textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Description' }));
  await heal(page, 'Description textbox', 'click', null, () => page.getByRole('textbox', { name: 'Description' }));
  await heal(page, 'Description textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Description' }));
  await heal(page, 'Description textbox', 'fill', 'desc added', () => page.getByRole('textbox', { name: 'Description' }));
  
  await heal(page, 'C of C Required checkbox', 'check', null, () => page.getByRole('checkbox', { name: 'C of C Required' }).first());
  
  await heal(page, 'Select a category textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a category' }));
  await heal(page, 'Select a category textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a category' }));
  await heal(page, 'Film text', 'visible', null, () => page.getByText('Film', { exact: true }).first());
  await heal(page, 'Film text', 'click', null, () => page.getByText('Film', { exact: true }).first());
  
  await heal(page, 'Create button', 'visible', null, () => page.getByRole('button', { name: 'Create' }));
  await heal(page, 'Create button', 'click', null, () => page.getByRole('button', { name: 'Create' }));
  
  await heal(page, 'Ready text', 'visible', null, () => page.getByText('Ready'));
  
  await heal(page, 'Links button', 'visible', null, () => page.getByRole('button', { name: 'Links' }));
  await heal(page, 'Links button', 'click', null, () => page.getByRole('button', { name: 'Links' }));
  await heal(page, 'Kishore Battula Fortis Solutions Group button', 'visible', null, () => page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group' }));
  await heal(page, 'Kishore Battula Fortis Solutions Group button', 'click', null, () => page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group' }));
  await heal(page, 'Logout link', 'visible', null, () => page.getByRole('link', { name: 'Logout' }));
  await heal(page, 'Logout link', 'click', null, () => page.getByRole('link', { name: 'Logout' }));
  
  await page.waitForLoadState('domcontentloaded');
});
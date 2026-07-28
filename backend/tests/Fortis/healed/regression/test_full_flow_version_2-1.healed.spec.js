import testData from '../../test-data.json';
const { test, expect } = require('../../../fixtures/walker_fixture.js');
const { heal } = require('../../../fixtures/inline_healer.js');

test('generated flow @regression', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));

  await heal(page, 'email field', 'visible', null, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email field', 'fill', testData.email, () => page.locator('input[name="email"][type="email"]'));

  await heal(page, 'password field', 'visible', null, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password field', 'fill', testData.password, () => page.locator('input[name="password"][type="password"]'));

  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await page.waitForLoadState('domcontentloaded');

  
  await heal(page, 'Customer button', 'visible', null, () => page.getByRole('button', { name: 'Customer' }));
  await heal(page, 'Customer button', 'click', null, () => page.getByRole('button', { name: 'Customer' }));
  await heal(page, 'Customers link', 'visible', null, () => page.getByRole('link', { name: 'Customers', exact: true }));
  await heal(page, 'Customers link', 'click', null, () => page.getByRole('link', { name: 'Customers', exact: true }));
  await page.waitForLoadState('domcontentloaded');


  await heal(page, 'New Customer button', 'visible', null, () => page.getByRole('button', { name: 'New Customer', exact: true }));
  await heal(page, 'New Customer button', 'click', null, () => page.getByRole('button', { name: 'New Customer', exact: true }));

  await heal(page, 'customer name field', 'visible', null, () => page.locator('input[name="customer.name"][type="text"]'));
  await heal(page, 'customer name field', 'fill', 'test_xdcfg', () => page.locator('input[name="customer.name"][type="text"]'));

  await heal(page, 'market input', 'visible', null, () => page.locator('[data-cy="customerCreateSelectMarket"]'));
  await heal(page, 'market input', 'click', null, () => page.locator('[data-cy="customerCreateSelectMarket"]'));
  await heal(page, 'Automotive option', 'visible', null, () => page.getByText('Automotive'));
  await heal(page, 'Automotive option', 'click', null, () => page.getByText('Automotive'));

  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue', exact: true }));
  await heal(page, 'Continue button', 'click', null, () => page.getByRole('button', { name: 'Continue', exact: true }));
  await heal(page, 'Yes, add record button', 'visible', null, () => page.getByRole('button', { name: 'Yes, add record', exact: true }));
  await heal(page, 'Yes, add record button', 'click', null, () => page.getByRole('button', { name: 'Yes, add record', exact: true }));
  
  await heal(page, 'Go to record link', 'visible', null, () => page.getByRole('link', { name: 'Go to record', exact: true }));
  await heal(page, 'Go to record link', 'click', null, () => page.getByRole('link', { name: 'Go to record', exact: true }));
  await page.waitForLoadState('domcontentloaded');

  
  await heal(page, 'Add Contact button', 'visible', null, () => page.getByRole('button', { name: 'Add Contact', exact: true }));
  await heal(page, 'Add Contact button', 'click', null, () => page.getByRole('button', { name: 'Add Contact', exact: true }));
  await heal(page, 'Close drawer button', 'visible', null, () => page.getByRole('button', { name: 'Close drawer', exact: true }));
  await heal(page, 'Close drawer button', 'click', null, () => page.getByRole('button', { name: 'Close drawer', exact: true }));
  await heal(page, 'Link Contact button', 'visible', null, () => page.getByRole('button', { name: 'Link Contact', exact: true }));
  await heal(page, 'Link Contact button', 'click', null, () => page.getByRole('button', { name: 'Link Contact', exact: true }));

  await heal(page, 'contact checkbox', 'visible', null, () => page.locator('#checkbox.input.13'));
  await heal(page, 'contact checkbox', 'check', null, () => page.locator('#checkbox.input.13'));

  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue', exact: true }));
  await heal(page, 'Continue button', 'click', null, () => page.getByRole('button', { name: 'Continue', exact: true }));
  await heal(page, 'New Note button', 'visible', null, () => page.getByRole('button', { name: 'New Note', exact: true }));
  await heal(page, 'New Note button', 'click', null, () => page.getByRole('button', { name: 'New Note', exact: true }));

  await heal(page, 'note editor', 'visible', null, () => page.locator('.ql-editor'));
  await heal(page, 'note editor', 'fill', 'test_demo', () => page.locator('.ql-editor'));

  await heal(page, 'Save button', 'visible', null, () => page.getByRole('button', { name: 'Save', exact: true }));
  await heal(page, 'Save button', 'click', null, () => page.getByRole('button', { name: 'Save', exact: true }));
});
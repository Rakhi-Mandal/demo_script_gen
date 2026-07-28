import testData from '../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('create customer @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Sign in with Email button', 'click', null,
    () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));

  await heal(page, 'email input', 'visible', null,
    () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email input', 'fill', testData.email,
    () => page.locator('input[name="email"][type="email"]'));

  await heal(page, 'password input', 'visible', null,
    () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password input', 'fill', testData.password,
    () => page.locator('input[name="password"][type="password"]'));

  await heal(page, 'Sign in with Email button', 'click', null,
    () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Customer button', 'click', null,
    () => page.getByRole('button').filter({ hasText: 'Customer' }));

  await heal(page, 'Customers link', 'click', null,
    () => page.getByRole('link', { name: 'Customers', exact: true }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'New Customer button', 'click', null,
    () => page.getByRole('button', { name: 'New Customer', exact: true }));

  await heal(page, 'customer name input', 'visible', null,
    () => page.locator('input[name="customer.name"][type="text"]'));
  await heal(page, 'customer name input', 'fill', 'demo_new09',
    () => page.locator('input[name="customer.name"][type="text"]'));

  await heal(page, 'market input', 'visible', null,
    () => page.locator('[data-cy="customerCreateSelectMarket"]'));
  await heal(page, 'market input', 'click', null,
    () => page.locator('[data-cy="customerCreateSelectMarket"]'));

  await heal(page, 'search input', 'visible', null,
    () => page.locator('[data-cy="search"]'));
  await heal(page, 'search input', 'fill', 'Automotive',
    () => page.locator('[data-cy="search"]'));

  await heal(page, 'Automotive list item', 'click', null,
    () => page.locator('li[data-label="Automotive"]'));

  await heal(page, 'Continue button', 'click', null,
    () => page.getByRole('button', { name: 'Continue', exact: true }));

  await heal(page, 'Yes, add record button', 'click', null,
    () => page.getByRole('button', { name: 'Yes, add record', exact: true }));

  await heal(page, 'Go to record link', 'click', null,
    () => page.getByRole('link', { name: 'Go to record', exact: true }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Kishore Battula Fortis Solutions Group button', 'click', null,
    () => page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group', exact: true }));

  await heal(page, 'Logout link', 'click', null,
    () => page.getByRole('link', { name: 'Logout', exact: true }));
  await page.waitForLoadState('domcontentloaded');
});
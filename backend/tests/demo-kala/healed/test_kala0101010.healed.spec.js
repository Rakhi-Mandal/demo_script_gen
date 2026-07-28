import testData from '../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('create product @sanity', async ({ page }) => {
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
    () => page.getByRole('button', { name: 'Customer' }));

  await heal(page, 'Customer button', 'click', null,
    () => page.getByRole('button', { name: 'Customer' }));

  await heal(page, 'Items button', 'click', null,
    () => page.getByRole('button', { name: 'Items' }));

  await heal(page, 'Items button', 'click', null,
    () => page.getByRole('button', { name: 'Items' }));

  await heal(page, 'Items button', 'click', null,
    () => page.getByRole('button', { name: 'Items' }));
});
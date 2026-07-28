import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
  // 1. Go to login page
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'sign in with email button', 'click', null,
    () => page.locator('[data-cy="btnLoginVisible"]'));

  await heal(page, 'email field', 'visible', null,
    () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email field', 'fill', testData.email,
    () => page.locator('input[name="email"][type="email"]'));

  await heal(page, 'password field', 'visible', null,
    () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('input[name="password"][type="password"]'));

  await heal(page, 'sign in confirm button', 'click', null,
    () => page.locator('[data-cy="btnLoginConfirm"]'));

  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'materials link', 'visible', null,
    () => page.getByRole('link', { name: 'Materials', exact: true }));
  await heal(page, 'materials link', 'click', null,
    () => page.getByRole('link', { name: 'Materials', exact: true }));

  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'new material button', 'click', null,
    () => page.getByRole('button', { name: 'New Material', exact: true }));

  await heal(page, 'material name field', 'visible', null,
    () => page.getByRole('textbox', { name: 'Material Name' }));
  await heal(page, 'material name field', 'fill', 'Material1',
    () => page.getByRole('textbox', { name: 'Material Name' }));

  await heal(page, 'material type field', 'visible', null,
    () => page.locator('input[name="materialTypeSelectedId"][type="text"]'));
  await heal(page, 'material type field', 'click', null,
    () => page.locator('input[name="materialTypeSelectedId"][type="text"]'));

  await heal(page, 'flexpack option', 'visible', null,
    () => page.locator('li[data-label="FlexPack"]'));
  await heal(page, 'flexpack option', 'click', null,
    () => page.locator('li[data-label="FlexPack"]'));

  await heal(page, 'material class field', 'visible', null,
    () => page.locator('input[name="material.material_class_id"][type="text"]'));
  await heal(page, 'material class field', 'click', null,
    () => page.locator('input[name="material.material_class_id"][type="text"]'));

  await heal(page, 'flp film option', 'visible', null,
    () => page.locator('li[data-label="FLP Film"]'));
  await heal(page, 'flp film option', 'click', null,
    () => page.locator('li[data-label="FLP Film"]'));
});
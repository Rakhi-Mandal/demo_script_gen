import testData from '../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('create product @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'sign in with Email button', 'click', null,
    () => page.getByRole('button', { name: 'Sign in with Email' }));

  await heal(page, 'email field', 'visible', null,
    () => page.locator('input[name="email"]'));
  await heal(page, 'email field', 'fill', testData.email,
    () => page.locator('input[name="email"]'));

  await heal(page, 'password field', 'visible', null,
    () => page.locator('input[name="password"]'));
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('input[name="password"]'));

  await heal(page, 'sign in with Email button', 'click', null,
    () => page.getByRole('button', { name: 'Sign in with Email' }));

  await heal(page, 'Customer button', 'click', null,
    () => page.getByRole('button').filter({ hasText: 'Customer' }));

  await heal(page, 'Leads/Prospects link', 'click', null,
    () => page.getByRole('link', { name: 'Leads/Prospects' }));

  await heal(page, 'New Lead button', 'click', null,
    () => page.getByRole('button', { name: 'New Lead' }));

  await heal(page, 'lead name field', 'visible', null,
    () => page.locator('input[name="lead.name"]'));
  await heal(page, 'lead name field', 'fill', 'qaaaa',
    () => page.locator('input[name="lead.name"]'));

  await heal(page, 'contact first name field', 'visible', null,
    () => page.locator('input[name="contact.first_name"]'));
  await heal(page, 'contact first name field', 'fill', 'aaaa',
    () => page.locator('input[name="contact.first_name"]'));

  await heal(page, 'contact last name field', 'visible', null,
    () => page.locator('input[name="contact.last_name"]'));
  await heal(page, 'contact last name field', 'fill', 'aaaa',
    () => page.locator('input[name="contact.last_name"]'));

  await heal(page, 'contact work phone field', 'visible', null,
    () => page.locator('input[name="contact.work_phone"]'));
  await heal(page, 'contact work phone field', 'fill', testData.contactWorkPhone,
    () => page.locator('input[name="contact.work_phone"]'));

  await heal(page, 'contact mobile phone field', 'visible', null,
    () => page.locator('input[name="contact.mobile_phone"]'));
  await heal(page, 'contact mobile phone field', 'fill', testData.contactMobilePhone,
    () => page.locator('input[name="contact.mobile_phone"]'));

  await heal(page, 'contact fax field', 'visible', null,
    () => page.locator('input[name="contact.fax"]'));
  await heal(page, 'contact fax field', 'fill', '333',
    () => page.locator('input[name="contact.fax"]'));

  await heal(page, 'lead email field', 'visible', null,
    () => page.locator('input[name="lead.email"]'));
  await heal(page, 'lead email field', 'fill', testData.contactEmail,
    () => page.locator('input[name="lead.email"]'));

  await heal(page, 'lead website field', 'visible', null,
    () => page.locator('input[name="lead.website"]'));
  await heal(page, 'lead website field', 'fill', testData.website,
    () => page.locator('input[name="lead.website"]'));

  await heal(page, 'lead market id field', 'click', null,
    () => page.locator('input[name="lead.market_id"]'));
  await heal(page, 'lead market id field', 'visible', null,
    () => page.locator('input[name="lead.market_id"]'));

  await heal(page, 'Automotive list item', 'click', null,
    () => page.locator('li[data-label="Automotive"]'));

  await heal(page, 'Next button', 'click', null,
    () => page.getByRole('button', { name: 'Next', exact: true }));

  await heal(page, 'user menu button', 'click', null,
    () => page.locator('#user-menu-button'));

  await heal(page, 'Logout link', 'click', null,
    () => page.getByRole('link', { name: 'Logout' }));
});
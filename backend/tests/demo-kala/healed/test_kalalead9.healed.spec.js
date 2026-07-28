import testData from '../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('create product @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'email input', 'visible', null, () => page.locator('input[name="email"]'));
  await heal(page, 'email input', 'click', null, () => page.locator('input[name="email"]'));
  await heal(page, 'email input', 'fill', testData.email, () => page.locator('input[name="email"]'));
  
  await heal(page, 'password input', 'visible', null, () => page.locator('input[name="password"]'));
  await heal(page, 'password input', 'click', null, () => page.locator('input[name="password"]'));
  await heal(page, 'password input', 'fill', testData.password, () => page.locator('input[name="password"]'));
  
  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Customer button', 'visible', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await heal(page, 'Customer button', 'click', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Leads/Prospects link', 'visible', null, () => page.getByRole('link', { name: 'Leads/Prospects' }));
  await heal(page, 'Leads/Prospects link', 'click', null, () => page.getByRole('link', { name: 'Leads/Prospects' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'New Lead button', 'visible', null, () => page.getByRole('button', { name: 'New Lead' }));
  await heal(page, 'New Lead button', 'click', null, () => page.getByRole('button', { name: 'New Lead' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'lead name input', 'visible', null, () => page.locator('input[name="lead.name"]'));
  await heal(page, 'lead name input', 'click', null, () => page.locator('input[name="lead.name"]'));
  await heal(page, 'lead name input', 'fill', 'yy', () => page.locator('input[name="lead.name"]'));

  await heal(page, 'contact first name input', 'visible', null, () => page.locator('input[name="contact.first_name"]'));
  await heal(page, 'contact first name input', 'click', null, () => page.locator('input[name="contact.first_name"]'));
  await heal(page, 'contact first name input', 'fill', 'yy', () => page.locator('input[name="contact.first_name"]'));

  await heal(page, 'contact last name input', 'visible', null, () => page.locator('input[name="contact.last_name"]'));
  await heal(page, 'contact last name input', 'click', null, () => page.locator('input[name="contact.last_name"]'));
  await heal(page, 'contact last name input', 'fill', 'uu', () => page.locator('input[name="contact.last_name"]'));

  await heal(page, 'contact work phone input', 'visible', null, () => page.locator('input[name="contact.work_phone"]'));
  await heal(page, 'contact work phone input', 'click', null, () => page.locator('input[name="contact.work_phone"]'));
  await heal(page, 'contact work phone input', 'fill', testData.contactWorkPhone2, () => page.locator('input[name="contact.work_phone"]'));

  await heal(page, 'contact mobile phone input', 'visible', null, () => page.locator('input[name="contact.mobile_phone"]'));
  await heal(page, 'contact mobile phone input', 'click', null, () => page.locator('input[name="contact.mobile_phone"]'));
  await heal(page, 'contact mobile phone input', 'fill', testData.contactMobilePhone3, () => page.locator('input[name="contact.mobile_phone"]'));

  await heal(page, 'contact fax input', 'visible', null, () => page.locator('input[name="contact.fax"]'));
  await heal(page, 'contact fax input', 'click', null, () => page.locator('input[name="contact.fax"]'));
  await heal(page, 'contact fax input', 'fill', '666', () => page.locator('input[name="contact.fax"]'));

  await heal(page, 'lead email input', 'visible', null, () => page.locator('input[name="lead.email"]'));
  await heal(page, 'lead email input', 'click', null, () => page.locator('input[name="lead.email"]'));
  await heal(page, 'lead email input', 'fill', testData.contactEmail3, () => page.locator('input[name="lead.email"]'));

  await heal(page, 'lead website input', 'visible', null, () => page.locator('input[name="lead.website"]'));
  await heal(page, 'lead website input', 'click', null, () => page.locator('input[name="lead.website"]'));
  await heal(page, 'lead website input', 'fill', testData.leadWebsite, () => page.locator('input[name="lead.website"]'));

  await heal(page, 'lead market id input', 'visible', null, () => page.locator('input[name="lead.market_id"]'));
  await heal(page, 'lead market id input', 'click', null, () => page.locator('input[name="lead.market_id"]'));
  await heal(page, 'lead market id input', 'focus', null, () => page.locator('input[name="lead.market_id"]'));
  await heal(page, 'lead market id input', 'click', null, () => page.locator('input[name="lead.market_id"]'));
  
  await heal(page, 'Automotive list item', 'visible', null, () => page.locator('li[data-label="Automotive"]'));
  await heal(page, 'Automotive list item', 'click', null, () => page.locator('li[data-label="Automotive"]'));
  
  await heal(page, 'Next button', 'visible', null, () => page.getByRole('button', { name: 'Next', exact: true }));
  await heal(page, 'Next button', 'click', null, () => page.getByRole('button', { name: 'Next', exact: true }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Close button', 'visible', null, () => page.getByRole('button', { name: 'Close' }));
  await heal(page, 'Close button', 'click', null, () => page.getByRole('button', { name: 'Close' }));
  await heal(page, 'Logout link', 'visible', null, () => page.getByRole('link', { name: 'Logout' }));
  await heal(page, 'Logout link', 'click', null, () => page.getByRole('link', { name: 'Logout' }));
  await page.waitForLoadState('domcontentloaded');
});
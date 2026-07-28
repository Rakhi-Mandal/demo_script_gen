import testData from '../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('create product @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await heal(page, 'sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await heal(page, 'email input', 'visible', null, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email input', 'click', null, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email input', 'fill', testData.email, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'password input', 'visible', null, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password input', 'click', null, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password input', 'fill', testData.password, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await heal(page, 'sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));

  await page.waitForLoadState('domcontentloaded');
  await heal(page, 'Customer button', 'visible', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await heal(page, 'Customer button', 'click', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await heal(page, 'Leads/Prospects link', 'visible', null, () => page.getByRole('link', { name: 'Leads/Prospects', exact: true }));
  await heal(page, 'Leads/Prospects link', 'click', null, () => page.getByRole('link', { name: 'Leads/Prospects', exact: true }));

  await page.waitForLoadState('domcontentloaded');
  await heal(page, 'New Lead button', 'visible', null, () => page.getByRole('button', { name: 'New Lead', exact: true }));
  await heal(page, 'New Lead button', 'click', null, () => page.getByRole('button', { name: 'New Lead', exact: true }));

  await heal(page, 'lead name input', 'visible', null, () => page.locator('input[name="lead.name"][type="text"]'));
  await heal(page, 'lead name input', 'click', null, () => page.locator('input[name="lead.name"][type="text"]'));
  await heal(page, 'lead name input', 'fill', 'qazws', () => page.locator('input[name="lead.name"][type="text"]'));

  await heal(page, 'contact first name input', 'visible', null, () => page.locator('input[name="contact.first_name"][type="text"]'));
  await heal(page, 'contact first name input', 'click', null, () => page.locator('input[name="contact.first_name"][type="text"]'));
  await heal(page, 'contact first name input', 'fill', 'name', () => page.locator('input[name="contact.first_name"][type="text"]'));

  await heal(page, 'contact last name input', 'visible', null, () => page.locator('input[name="contact.last_name"][type="text"]'));
  await heal(page, 'contact last name input', 'click', null, () => page.locator('input[name="contact.last_name"][type="text"]'));
  await heal(page, 'contact last name input', 'fill', 'manh', () => page.locator('input[name="contact.last_name"][type="text"]'));

  await heal(page, 'contact work phone input', 'visible', null, () => page.locator('input[name="contact.work_phone"][type="phone"]'));
  await heal(page, 'contact work phone input', 'click', null, () => page.locator('input[name="contact.work_phone"][type="phone"]'));
  await heal(page, 'contact work phone input', 'fill', testData.contactWorkPhone, () => page.locator('input[name="contact.work_phone"][type="phone"]'));

  await heal(page, 'contact mobile phone input', 'visible', null, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));
  await heal(page, 'contact mobile phone input', 'click', null, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));
  await heal(page, 'contact mobile phone input', 'fill', testData.contactMobilePhone2, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));

  await heal(page, 'contact fax input', 'visible', null, () => page.locator('input[name="contact.fax"][type="phone"]'));
  await heal(page, 'contact fax input', 'click', null, () => page.locator('input[name="contact.fax"][type="phone"]'));
  await heal(page, 'contact fax input', 'fill', '111', () => page.locator('input[name="contact.fax"][type="phone"]'));

  await heal(page, 'lead email input', 'visible', null, () => page.locator('input[name="lead.email"][type="text"]'));
  await heal(page, 'lead email input', 'click', null, () => page.locator('input[name="lead.email"][type="text"]'));
  await heal(page, 'lead email input', 'fill', testData.contactEmail2, () => page.locator('input[name="lead.email"][type="text"]'));

  await heal(page, 'lead website input', 'visible', null, () => page.locator('input[name="lead.website"][type="text"]'));
  await heal(page, 'lead website input', 'click', null, () => page.locator('input[name="lead.website"][type="text"]'));
  await heal(page, 'lead website input', 'fill', testData.leadWebsite, () => page.locator('input[name="lead.website"][type="text"]'));

  await heal(page, 'lead market id input', 'visible', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'lead market id input', 'click', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'lead market id input', 'focus', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'lead market id input', 'click', null, () => page.locator('input[name="lead.market_id"][type="text"]'));

  await heal(page, 'search input', 'focus', null, () => page.locator('[data-cy="search"]'));
  await heal(page, 'Automotive list item', 'visible', null, () => page.locator('li[data-label="Automotive"]'));
  await heal(page, 'Automotive list item', 'click', null, () => page.locator('li[data-label="Automotive"]'));

  await heal(page, 'lead market id input', 'visible', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'lead market id input', 'click', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'Next button', 'visible', null, () => page.getByRole('button', { name: 'Next', exact: true }));
  await heal(page, 'Next button', 'click', null, () => page.getByRole('button', { name: 'Next', exact: true }));

  await page.waitForLoadState('domcontentloaded');
  await heal(page, 'Close button', 'visible', null, () => page.getByRole('button', { name: 'Close', exact: true }));
  await heal(page, 'Close button', 'click', null, () => page.getByRole('button', { name: 'Close', exact: true }));

  await heal(page, 'Kishore Battula Fortis Solutions Group button', 'visible', null, () => page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group', exact: true }));
  await heal(page, 'Kishore Battula Fortis Solutions Group button', 'click', null, () => page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group', exact: true }));
  await heal(page, 'Logout link', 'visible', null, () => page.getByRole('link', { name: 'Logout', exact: true }));
  await heal(page, 'Logout link', 'click', null, () => page.getByRole('link', { name: 'Logout', exact: true }));

  await page.waitForLoadState('domcontentloaded');
});
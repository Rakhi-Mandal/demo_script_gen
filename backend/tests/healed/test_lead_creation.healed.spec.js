import testData from './test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('2026 05 12T06 18 03', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await heal(page, 'email input', 'visible', null, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email input', 'click', null, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email input', 'fill', testData.email, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'password input', 'visible', null, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password input', 'click', null, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password input', 'fill', testData.password, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  
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
  await heal(page, 'lead name input', 'fill', 'xghcdscs', () => page.locator('input[name="lead.name"][type="text"]'));
  
  await heal(page, 'contact first name input', 'visible', null, () => page.locator('input[name="contact.first_name"][type="text"]'));
  await heal(page, 'contact first name input', 'click', null, () => page.locator('input[name="contact.first_name"][type="text"]'));
  await heal(page, 'contact first name input', 'fill', 'cggh', () => page.locator('input[name="contact.first_name"][type="text"]'));
  
  await heal(page, 'contact last name input', 'visible', null, () => page.locator('input[name="contact.last_name"][type="text"]'));
  await heal(page, 'contact last name input', 'click', null, () => page.locator('input[name="contact.last_name"][type="text"]'));
  await heal(page, 'contact last name input', 'fill', 'y', () => page.locator('input[name="contact.last_name"][type="text"]'));
  
  await heal(page, 'contact work phone input', 'visible', null, () => page.locator('input[name="contact.work_phone"][type="phone"]'));
  await heal(page, 'contact work phone input', 'click', null, () => page.locator('input[name="contact.work_phone"][type="phone"]'));
  await heal(page, 'contact work phone input', 'fill', testData.contactWorkPhone4, () => page.locator('input[name="contact.work_phone"][type="phone"]'));
  
  await heal(page, 'contact mobile phone input', 'visible', null, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));
  await heal(page, 'contact mobile phone input', 'click', null, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));
  await heal(page, 'contact mobile phone input', 'fill', testData.contactWorkPhone4, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));
  
  await heal(page, 'contact fax input', 'visible', null, () => page.locator('input[name="contact.fax"][type="phone"]'));
  await heal(page, 'contact fax input', 'click', null, () => page.locator('input[name="contact.fax"][type="phone"]'));
  await heal(page, 'contact fax input', 'fill', '789', () => page.locator('input[name="contact.fax"][type="phone"]'));
  
  await heal(page, 'lead email input', 'visible', null, () => page.locator('input[name="lead.email"][type="text"]'));
  await heal(page, 'lead email input', 'click', null, () => page.locator('input[name="lead.email"][type="text"]'));
  await heal(page, 'lead email input', 'fill', testData.contactEmail6, () => page.locator('input[name="lead.email"][type="text"]'));
  
  await heal(page, 'lead website input', 'visible', null, () => page.locator('input[name="lead.website"][type="text"]'));
  await heal(page, 'lead website input', 'click', null, () => page.locator('input[name="lead.website"][type="text"]'));
  await heal(page, 'lead website input', 'fill', testData.website2, () => page.locator('input[name="lead.website"][type="text"]'));
  
  await heal(page, 'lead market id input', 'visible', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'lead market id input', 'click', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'lead market id input', 'click', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  
  await heal(page, 'lead market id input', 'visible', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'lead market id input', 'click', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'Automotive option', 'visible', null, () => page.getByText('Automotive'));
  await heal(page, 'Automotive option', 'click', null, () => page.getByText('Automotive'));
  
  await heal(page, 'Next button', 'visible', null, () => page.getByRole('button', { name: 'Next', exact: true }));
  await heal(page, 'Next button', 'click', null, () => page.getByRole('button', { name: 'Next', exact: true }));
  
  await page.waitForLoadState('domcontentloaded');
  await heal(page, 'lead entry', 'visible', null, () => page.locator('p').filter({ hasText: /^xghcdscsdgvh$/ }).first());
  await heal(page, 'lead entry', 'click', null, () => page.locator('p').filter({ hasText: /^xghcdscsdgvh$/ }).first());
  
  await heal(page, 'Kishore Battula Fortis Solutions Group button', 'visible', null, () => page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group', exact: true }));
  await heal(page, 'Kishore Battula Fortis Solutions Group button', 'click', null, () => page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group', exact: true }));
  await heal(page, 'Logout link', 'visible', null, () => page.getByRole('link', { name: 'Logout', exact: true }));
  await heal(page, 'Logout link', 'click', null, () => page.getByRole('link', { name: 'Logout', exact: true }));
  
  await page.waitForLoadState('domcontentloaded');
});
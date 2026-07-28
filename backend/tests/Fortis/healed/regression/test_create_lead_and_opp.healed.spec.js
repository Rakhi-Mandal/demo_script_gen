import testData from '../../test-data.json';
const { test, expect } = require('../../../fixtures/walker_fixture.js');
const { heal } = require('../../../fixtures/inline_healer.js');

test('generated flow @regression', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email' }));

  await heal(page, 'email field', 'visible', null, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email field', 'fill', testData.email, () => page.locator('input[name="email"][type="email"]'));

  await heal(page, 'password field', 'visible', null, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password field', 'fill', testData.password, () => page.locator('input[name="password"][type="password"]'));

  await heal(page, 'remember me checkbox', 'visible', null, () => page.locator('#remember_me'));
  await heal(page, 'remember me checkbox', 'check', null, () => page.locator('#remember_me'));

  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Customer button', 'visible', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await heal(page, 'Customer button', 'click', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));

  await heal(page, 'Leads/Prospects link', 'visible', null, () => page.getByRole('link', { name: 'Leads/Prospects' }));
  await heal(page, 'Leads/Prospects link', 'click', null, () => page.getByRole('link', { name: 'Leads/Prospects' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'New Lead button', 'visible', null, () => page.getByRole('button', { name: 'New Lead' }));
  await heal(page, 'New Lead button', 'click', null, () => page.getByRole('button', { name: 'New Lead' }));

  await heal(page, 'company name field', 'visible', null, () => page.locator('input[name="lead.name"][type="text"]'));
  await heal(page, 'company name field', 'fill', 'test_de', () => page.locator('input[name="lead.name"][type="text"]'));

  await heal(page, 'first name field', 'visible', null, () => page.locator('input[name="contact.first_name"][type="text"]'));
  await heal(page, 'first name field', 'fill', 'demo', () => page.locator('input[name="contact.first_name"][type="text"]'));

  await heal(page, 'last name field', 'visible', null, () => page.locator('input[name="contact.last_name"][type="text"]'));
  await heal(page, 'last name field', 'fill', 'test', () => page.locator('input[name="contact.last_name"][type="text"]'));

  await heal(page, 'work phone field', 'visible', null, () => page.locator('input[name="contact.work_phone"][type="phone"]'));
  await heal(page, 'work phone field', 'fill', testData.contactWorkPhone, () => page.locator('input[name="contact.work_phone"][type="phone"]'));

  await heal(page, 'mobile phone field', 'visible', null, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));
  await heal(page, 'mobile phone field', 'fill', testData.contactMobilePhone, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));

  await heal(page, 'fax field', 'visible', null, () => page.locator('input[name="contact.fax"][type="phone"]'));
  await heal(page, 'fax field', 'fill', '676', () => page.locator('input[name="contact.fax"][type="phone"]'));

  await heal(page, 'contact email field', 'visible', null, () => page.locator('input[name="lead.email"][type="text"]'));
  await heal(page, 'contact email field', 'fill', testData.contactEmail, () => page.locator('input[name="lead.email"][type="text"]'));

  await heal(page, 'website field', 'visible', null, () => page.locator('input[name="lead.website"][type="text"]'));
  await heal(page, 'website field', 'fill', 'https:', () => page.locator('input[name="lead.website"][type="text"]'));

  await heal(page, 'market input', 'visible', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'market input', 'click', null, () => page.locator('input[name="lead.market_id"][type="text"]'));
  await heal(page, 'Automotive text', 'visible', null, () => page.getByText('Automotive'));
  await heal(page, 'Automotive text', 'click', null, () => page.getByText('Automotive'));

  await heal(page, 'Next button', 'visible', null, () => page.getByRole('button', { name: 'Next', exact: true }));
  await heal(page, 'Next button', 'click', null, () => page.getByRole('button', { name: 'Next', exact: true }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Customer button', 'visible', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await heal(page, 'Customer button', 'click', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));

  await heal(page, 'Opportunities link', 'visible', null, () => page.getByRole('link', { name: 'Opportunities' }));
  await heal(page, 'Opportunities link', 'click', null, () => page.getByRole('link', { name: 'Opportunities' }));
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'New Opportunity button', 'visible', null, () => page.getByRole('button', { name: 'New Opportunity' }));
  await heal(page, 'New Opportunity button', 'click', null, () => page.getByRole('button', { name: 'New Opportunity' }));

  await heal(page, 'project name field', 'visible', null, () => page.locator('input[name="project.name"][type="text"]'));
  await heal(page, 'project name field', 'fill', 'test', () => page.locator('input[name="project.name"][type="text"]'));

  await heal(page, 'project description field', 'visible', null, () => page.locator('textarea[name="project.description"]'));
  await heal(page, 'project description field', 'fill', 'demo', () => page.locator('textarea[name="project.description"]'));

  await heal(page, 'Select Customer button', 'visible', null, () => page.getByRole('button', { name: 'Select Customer' }));
  await heal(page, 'Select Customer button', 'click', null, () => page.getByRole('button', { name: 'Select Customer' }));

  await heal(page, 'customer search field', 'visible', null, () => page.locator('input[name="filters.searchByName"][type="text"]'));
  await heal(page, 'customer search field', 'fill', 'test_auto121', () => page.locator('input[name="filters.searchByName"][type="text"]'));

  await page.getByRole('radio').check();
  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue' }));
  await heal(page, 'Continue button', 'click', null, () => page.getByRole('button', { name: 'Continue' }));
  await heal(page, 'Next button', 'visible', null, () => page.getByRole('button', { name: 'Next', exact: true }));
  await heal(page, 'Next button', 'click', null, () => page.getByRole('button', { name: 'Next', exact: true }));
});
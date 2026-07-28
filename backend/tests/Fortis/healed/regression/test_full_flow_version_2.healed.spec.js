import testData from '../../test-data.json';
const { test, expect } = require('../../../fixtures/walker_fixture.js');
const { heal } = require('../../../fixtures/inline_healer.js');

test('generated flow @regression', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));

  await heal(page, 'email field', 'visible', null, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email field', 'click', null, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email field', 'fill', testData.email2, () => page.locator('input[name="email"][type="email"]'));

  await heal(page, 'password field', 'visible', null, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password field', 'click', null, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password field', 'fill', testData.password, () => page.locator('input[name="password"][type="password"]'));

  await heal(page, 'remember me checkbox', 'check', null, () => page.locator('#remember_me'));
  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));

  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Customer button', 'visible', null, () => page.getByRole('button', { name: 'Customer', exact: true }));
  await heal(page, 'Customer button', 'click', null, () => page.getByRole('button', { name: 'Customer', exact: true }));

  await heal(page, 'Customers link', 'visible', null, () => page.getByRole('link', { name: 'Customers', exact: true }));
  await heal(page, 'Customers link', 'click', null, () => page.getByRole('link', { name: 'Customers', exact: true }));

  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'New Customer button', 'visible', null, () => page.getByRole('button', { name: 'New Customer', exact: true }));
  await heal(page, 'New Customer button', 'click', null, () => page.getByRole('button', { name: 'New Customer', exact: true }));

  await heal(page, 'customer name field', 'visible', null, () => page.locator('input[name="customer.name"][type="text"]'));
  await heal(page, 'customer name field', 'click', null, () => page.locator('input[name="customer.name"][type="text"]'));
  await heal(page, 'customer name field', 'fill', 'test_mnbfg', () => page.locator('input[name="customer.name"][type="text"]'));

  await heal(page, 'market input', 'visible', null, () => page.locator('[data-cy="customerCreateSelectMarket"]'));
  await heal(page, 'market input', 'click', null, () => page.locator('[data-cy="customerCreateSelectMarket"]'));
  await heal(page, 'Automotive option', 'visible', null, () => page.locator('li[data-label="Automotive"]'));
  await heal(page, 'Automotive option', 'click', null, () => page.locator('li[data-label="Automotive"]'));

  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue', exact: true }));
  await heal(page, 'Continue button', 'click', null, () => page.getByRole('button', { name: 'Continue', exact: true }));

  await heal(page, 'Yes, add record button', 'visible', null, () => page.getByRole('button', { name: 'Yes, add record', exact: true }));
  await heal(page, 'Yes, add record button', 'click', null, () => page.getByRole('button', { name: 'Yes, add record', exact: true }));

  await heal(page, 'Go to record link', 'visible', null, () => page.getByRole('link', { name: 'Go to record', exact: true }));
  await heal(page, 'Go to record link', 'click', null, () => page.getByRole('link', { name: 'Go to record', exact: true }));

  await heal(page, 'Add Contact button', 'visible', null, () => page.getByRole('button', { name: 'Add Contact', exact: true }));
  await heal(page, 'Add Contact button', 'click', null, () => page.getByRole('button', { name: 'Add Contact', exact: true }));

  await heal(page, 'first name field', 'visible', null, () => page.locator('input[name="contact.first_name"][type="text"]'));
  await heal(page, 'first name field', 'click', null, () => page.locator('input[name="contact.first_name"][type="text"]'));
  await heal(page, 'first name field', 'fill', 'test_dem', () => page.locator('input[name="contact.first_name"][type="text"]'));

  await heal(page, 'last name field', 'visible', null, () => page.locator('input[name="contact.last_name"][type="text"]'));
  await heal(page, 'last name field', 'click', null, () => page.locator('input[name="contact.last_name"][type="text"]'));
  await heal(page, 'last name field', 'fill', 'demo', () => page.locator('input[name="contact.last_name"][type="text"]'));

  await heal(page, 'contact email field', 'visible', null, () => page.locator('input[name="contact.email"][type="text"]'));
  await heal(page, 'contact email field', 'click', null, () => page.locator('input[name="contact.email"][type="text"]'));
  await heal(page, 'contact email field', 'fill', testData.email2, () => page.locator('input[name="contact.email"][type="text"]'));

  await heal(page, 'contact title field', 'visible', null, () => page.locator('input[name="contact.title"][type="text"]'));
  await heal(page, 'contact title field', 'click', null, () => page.locator('input[name="contact.title"][type="text"]'));
  await heal(page, 'contact title field', 'fill', 'test', () => page.locator('input[name="contact.title"][type="text"]'));

  await heal(page, 'main phone field', 'visible', null, () => page.locator('input[name="contact.work_phone"][type="phone"]'));
  await heal(page, 'main phone field', 'click', null, () => page.locator('input[name="contact.work_phone"][type="phone"]'));
  await heal(page, 'main phone field', 'fill', '678', () => page.locator('input[name="contact.work_phone"][type="phone"]'));

  await heal(page, 'office phone field', 'visible', null, () => page.locator('input[name="contact.office_phone"][type="phone"]'));
  await heal(page, 'office phone field', 'click', null, () => page.locator('input[name="contact.office_phone"][type="phone"]'));
  await heal(page, 'office phone field', 'fill', '678', () => page.locator('input[name="contact.office_phone"][type="phone"]'));

  await heal(page, 'mobile phone field', 'visible', null, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));
  await heal(page, 'mobile phone field', 'click', null, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));
  await heal(page, 'mobile phone field', 'fill', testData.contactMobilePhone, () => page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]'));

  await heal(page, 'fax field', 'visible', null, () => page.locator('input[name="contact.fax"][type="phone"]'));
  await heal(page, 'fax field', 'click', null, () => page.locator('input[name="contact.fax"][type="phone"]'));
  await heal(page, 'fax field', 'fill', testData.contactFax, () => page.locator('input[name="contact.fax"][type="phone"]'));

  await heal(page, 'default checkbox', 'check', null, () => page.locator('#shoulddefault-shoulddefault-default-as-main-contact'));
  await heal(page, 'default checkbox', 'press', 'Enter', () => page.locator('#shoulddefault-shoulddefault-default-as-main-contact'));

  await heal(page, 'default checkbox', 'uncheck', null, () => page.locator('#shoulddefault-shoulddefault-default-as-main-contact'));
  await heal(page, 'default checkbox', 'press', 'Enter', () => page.locator('#shoulddefault-shoulddefault-default-as-main-contact'));

  await heal(page, 'First Name * Last Name * Email Title Main Office Mobile Fax Default as main contact', 'visible', null, () => page.locator('div').filter({ hasText: /^First Name \\* Last Name \\* Email Title Main Office Mobile Fax Default as main contact$/ }).first());
  await heal(page, 'First Name * Last Name * Email Title Main Office Mobile Fax Default as main contact', 'click', null, () => page.locator('div').filter({ hasText: /^First Name \\* Last Name \\* Email Title Main Office Mobile Fax Default as main contact$/ }).first());

  await heal(page, 'main phone field', 'visible', null, () => page.locator('input[name="contact.work_phone"][type="phone"]'));
  await heal(page, 'main phone field', 'click', null, () => page.locator('input[name="contact.work_phone"][type="phone"]'));
  await heal(page, 'main phone field', 'fill', '678', () => page.locator('input[name="contact.work_phone"][type="phone"]'));
});
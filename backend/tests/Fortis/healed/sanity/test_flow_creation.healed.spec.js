import testData from '../../test-data.json';
const { test, expect } = require('../../../fixtures/walker_fixture.js');
const { heal } = require('../../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Sign in with Email Field button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await page.getByRole('button', { name: 'Sign in with Email', exact: true }).click();

  await heal(page, 'email field', 'visible', null, () => page.locator('input[name="email"][type="email"]'));
  await heal(page, 'email field', 'fill', testData.email, () => page.locator('input[name="email"][type="email"]'));

  await heal(page, 'password field', 'visible', null, () => page.locator('input[name="password"][type="password"]'));
  await heal(page, 'password field', 'fill', testData.password, () => page.locator('input[name="password"][type="password"]'));

  await heal(page, 'remember me checkbox', 'visible', null, () => page.locator('#remember_me'));
  await heal(page, 'remember me checkbox', 'check', null, () => page.locator('#remember_me'));

  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email', exact: true }));
  await page.getByRole('button', { name: 'Sign in with Email', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'Customer button', 'visible', null, () => page.getByRole('button').filter({ hasText: 'Customer' }));
  await page.getByRole('button').filter({ hasText: 'Customer' }).click();

  await heal(page, 'Customers link', 'visible', null, () => page.getByRole('link', { name: 'Customers', exact: true }));
  await page.getByRole('link', { name: 'Customers', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'New Customer button', 'visible', null, () => page.getByRole('button', { name: 'New Customer', exact: true }));
  await page.getByRole('button', { name: 'New Customer', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'customer name field', 'visible', null, () => page.locator('input[name="customer.name"][type="text"]'));
  await heal(page, 'customer name field', 'fill', 'test_ficftgh', () => page.locator('input[name="customer.name"][type="text"]'));

  await heal(page, 'market input', 'visible', null, () => page.locator('[data-cy="customerCreateSelectMarket"]'));
  await page.locator('[data-cy="customerCreateSelectMarket"]').click();

  await heal(page, 'Automotive option', 'visible', null, () => page.locator('li[data-label="Automotive"]'));
  await page.locator('li[data-label="Automotive"]').click();

  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue', exact: true }));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await heal(page, 'Yes, add record button', 'visible', null, () => page.getByRole('button', { name: 'Yes, add record', exact: true }));
  await page.getByRole('button', { name: 'Yes, add record', exact: true }).click();

  await heal(page, 'Go to record link', 'visible', null, () => page.getByRole('link', { name: 'Go to record', exact: true }));
  await page.getByRole('link', { name: 'Go to record', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await heal(page, 'customer edit mode', 'visible', null, () => page.locator('[data-cy="customerEditMode"]'));
  await page.locator('[data-cy="customerEditMode"]').click();

  await heal(page, 'Select Contact button', 'visible', null, () => page.getByRole('button', { name: 'Select Contact', exact: true }));
  await page.getByRole('button', { name: 'Select Contact', exact: true }).click();

  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue', exact: true }));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await heal(page, 'website field', 'visible', null, () => page.locator('input[name="customer.website"][type="text"]'));
  await heal(page, 'website field', 'fill', 'https:www.amazon.com', () => page.locator('input[name="customer.website"][type="text"]'));

  await heal(page, 'duns number field', 'visible', null, () => page.locator('input[name="customer.duns_number"][type="text"]'));
  await heal(page, 'duns number field', 'fill', '7', () => page.locator('input[name="customer.duns_number"][type="text"]'));

  await heal(page, 'Select a Tier textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Tier', exact: true }));
  await page.getByRole('textbox', { name: 'Select a Tier', exact: true }).click();
  await heal(page, 'Growth option', 'visible', null, () => page.locator('li[data-label="Growth"]'));
  await page.locator('li[data-label="Growth"]').click();

  await heal(page, 'Add Additional Support button', 'visible', null, () => page.getByRole('button', { name: 'Add Additional Support', exact: true }));
  await page.getByRole('button', { name: 'Add Additional Support', exact: true }).click();

  await heal(page, 'additional support checkbox', 'visible', null, () => page.locator('#checkbox.input.47'));
  await heal(page, 'additional support checkbox', 'check', null, () => page.locator('#checkbox.input.47'));

  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue', exact: true }));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await heal(page, 'Select User button', 'visible', null, () => page.getByRole('button', { name: 'Select User', exact: true }));
  await page.getByRole('button', { name: 'Select User', exact: true }).click();

  await heal(page, 'USR0148 MATTHEW N BROLL row', 'visible', null, () => page.getByRole('row', { name: 'USR0148 MATTHEW N BROLL' }));
  await page.getByRole('row', { name: 'USR0148 MATTHEW N BROLL' }).getByRole('radio').check();

  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue', exact: true }));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await heal(page, 'Select User button', 'visible', null, () => page.getByRole('button', { name: 'Select User', exact: true }));
  await page.getByRole('button', { name: 'Select User', exact: true }).click();

  await heal(page, 'USR0047 ALICIA E ADAMS CX row', 'visible', null, () => page.getByRole('row', { name: 'USR0047 ALICIA E ADAMS CX' }));
  await page.getByRole('row', { name: 'USR0047 ALICIA E ADAMS CX' }).getByRole('radio').check();

  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue', exact: true }));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await heal(page, 'customer edit OTP field', 'visible', null, () => page.locator('[id="customer::edit-' + testData.otp + '"]'));
  await page.locator('[id="customer::edit-' + testData.otp + '"]').click();

  await heal(page, 'New Address button', 'visible', null, () => page.getByRole('button', { name: 'New Address', exact: true }));
  await page.getByRole('button', { name: 'New Address', exact: true }).click();

  await heal(page, 'company field', 'visible', null, () => page.locator('input[name="address.company"][type="text"]'));
  await heal(page, 'company field', 'fill', 'test_fio', () => page.locator('input[name="address.company"][type="text"]'));

  await heal(page, 'attention field', 'visible', null, () => page.locator('input[name="address.attention"][type="text"]'));
  await heal(page, 'attention field', 'fill', 'vghh', () => page.locator('input[name="address.attention"][type="text"]'));

  await heal(page, 'address line 1 field', 'visible', null, () => page.locator('input[name="address.address_line_one"][type="text"]'));
  await heal(page, 'address line 1 field', 'fill', 'bnbnb', () => page.locator('input[name="address.address_line_one"][type="text"]'));

  await heal(page, 'address line 2 field', 'visible', null, () => page.locator('input[name="address.address_line_two"][type="text"]'));
  await heal(page, 'address line 2 field', 'fill', 'cvgdhcvhd', () => page.locator('input[name="address.address_line_two"][type="text"]'));

  await heal(page, 'city field', 'visible', null, () => page.locator('input[name="address.city"][type="text"]'));
  await heal(page, 'city field', 'fill', 'vcgdhcvdhgc', () => page.locator('input[name="address.city"][type="text"]'));

  await heal(page, 'state field', 'visible', null, () => page.locator('input[name="address.state"][type="text"]'));
  await heal(page, 'state field', 'click', null, () => page.locator('input[name="address.state"][type="text"]'));
  await heal(page, 'Alabama option', 'visible', null, () => page.locator('li[data-label="Alabama"]'));
  await page.locator('li[data-label="Alabama"]').click();

  await heal(page, 'postal code field', 'visible', null, () => page.locator('input[name="address.postal_code"][type="text"]'));
  await heal(page, 'postal code field', 'fill', testData.postalCode, () => page.locator('input[name="address.postal_code"][type="text"]'));

  await heal(page, 'phone number field', 'visible', null, () => page.locator('input[name="address.phone_number"][type="phone"]'));
  await heal(page, 'phone number field', 'fill', testData.phone2, () => page.locator('input[name="address.phone_number"][type="phone"]'));

  await heal(page, 'address label field', 'visible', null, () => page.locator('input[name="address.address_label"][type="text"]'));
  await heal(page, 'address label field', 'fill', 'bvchdjchj', () => page.locator('input[name="address.address_label"][type="text"]'));

  await heal(page, 'billing address checkbox', 'visible', null, () => page.locator('#addressbilling-addressbilling-billing-address'));
  await heal(page, 'billing address checkbox', 'check', null, () => page.locator('#addressbilling-addressbilling-billing-address'));

  await heal(page, 'default billing address checkbox', 'visible', null, () => page.locator('#addressdefault-billing-addressdefault-billing-default-billing-address'));
  await heal(page, 'default billing address checkbox', 'check', null, () => page.locator('#addressdefault-billing-addressdefault-billing-default-billing-address'));

  await heal(page, 'save address button', 'visible', null, () => page.locator('[id="address::edit-save-"]'));
  await page.locator('[id="address::edit-save-"]').click();

  await heal(page, 'user menu button', 'visible', null, () => page.locator('#user-menu-button'));
  await page.locator('#user-menu-button').click();

  await heal(page, 'Logout link', 'visible', null, () => page.getByRole('link', { name: 'Logout', exact: true }));
  await page.getByRole('link', { name: 'Logout', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');
});
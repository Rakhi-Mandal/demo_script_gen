import testData from '../test-data.json';
import { test, expect } from '@playwright/test';

test('generated flow @sanity', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'Sign in with Email', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email', exact: true }).click();

  const emailInput = page.locator('input[name="email"][type="email"]');
  await expect(emailInput).toBeVisible();
  await expect(emailInput).toBeEditable();
  await emailInput.fill(testData.email);

  const passwordInput = page.locator('input[name="password"][type="password"]');
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toBeEditable();
  await passwordInput.fill(testData.password);

  const rememberMeCheckbox = page.locator('#remember_me');
  await expect(rememberMeCheckbox).toBeVisible();
  await expect(rememberMeCheckbox).toBeEnabled();
  await rememberMeCheckbox.check();

  await expect(page.getByRole('button', { name: 'Sign in with Email', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button').filter({ hasText: 'Customer' })).toBeEnabled();
  await page.getByRole('button').filter({ hasText: 'Customer' }).click();

  await expect(page.getByRole('link', { name: 'Customers', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Customers', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'New Customer', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'New Customer', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  const customerNameInput = page.locator('input[name="customer.name"][type="text"]');
  await expect(customerNameInput).toBeVisible();
  await expect(customerNameInput).toBeEditable();
  await customerNameInput.fill('test_ficftgh');

  const marketInput = page.locator('[data-cy="customerCreateSelectMarket"]');
  await expect(marketInput).toBeVisible();
  await expect(marketInput).toBeEnabled();
  await marketInput.click();

  await expect(page.locator('li[data-label="Automotive"]')).toBeEnabled();
  await page.locator('li[data-label="Automotive"]').click();

  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Yes, add record Button', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Yes, add record', exact: true }).click();

  await expect(page.getByRole('link', { name: 'Go to record', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Go to record', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.locator('[data-cy="customerEditMode"]')).toBeEnabled();
  await page.locator('[data-cy="customerEditMode"]').click();

  await expect(page.getByRole('button', { name: 'Select Contact', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Select Contact', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  const websiteInput = page.locator('input[name="customer.website"][type="text"]');
  await expect(websiteInput).toBeVisible();
  await expect(websiteInput).toBeEditable();
  await websiteInput.fill('https:www.amazon.com');

  const dunsNumberInput = page.locator('input[name="customer.duns_number"][type="text"]');
  await expect(dunsNumberInput).toBeVisible();
  await expect(dunsNumberInput).toBeEditable();
  await dunsNumberInput.fill('7');

  await expect(page.getByRole('textbox', { name: 'Select a Tier', exact: true })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Select a Tier', exact: true }).click();
  await expect(page.locator('li[data-label="Growth"]')).toBeEnabled();
  await page.locator('li[data-label="Growth"]').click();

  await expect(page.getByRole('button', { name: 'Add Additional Support', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Add Additional Support', exact: true }).click();

  const additionalSupportCheckbox = page.locator('#checkbox.input.47');
  await expect(additionalSupportCheckbox).toBeVisible();
  await additionalSupportCheckbox.check();

  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Select User', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Select User', exact: true }).click();

  await expect(page.getByRole('row', { name: 'USR0148 MATTHEW N BROLL' })).toBeVisible();
  await page.getByRole('row', { name: 'USR0148 MATTHEW N BROLL' }).getByRole('radio').check();

  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Select User', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Select User', exact: true }).click();

  await expect(page.getByRole('row', { name: 'USR0047 ALICIA E ADAMS CX' })).toBeVisible();
  await page.getByRole('row', { name: 'USR0047 ALICIA E ADAMS CX' }).getByRole('radio').check();

  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.locator('[id="customer::edit-' + testData.otp + '"]')).toBeEnabled();
  await page.locator('[id="customer::edit-' + testData.otp + '"]').click();

  await expect(page.getByRole('button', { name: 'New Address', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'New Address', exact: true }).click();

  const companyInput = page.locator('input[name="address.company"][type="text"]');
  await expect(companyInput).toBeVisible();
  await expect(companyInput).toBeEditable();
  await companyInput.fill('test_fio');

  const attentionInput = page.locator('input[name="address.attention"][type="text"]');
  await expect(attentionInput).toBeVisible();
  await expect(attentionInput).toBeEditable();
  await attentionInput.fill('vghh');

  const addressLine1Input = page.locator('input[name="address.address_line_one"][type="text"]');
  await expect(addressLine1Input).toBeVisible();
  await expect(addressLine1Input).toBeEditable();
  await addressLine1Input.fill('bnbnb');

  const addressLine2Input = page.locator('input[name="address.address_line_two"][type="text"]');
  await expect(addressLine2Input).toBeVisible();
  await expect(addressLine2Input).toBeEditable();
  await addressLine2Input.fill('cvgdhcvhd');

  const cityInput = page.locator('input[name="address.city"][type="text"]');
  await expect(cityInput).toBeVisible();
  await expect(cityInput).toBeEditable();
  await cityInput.fill('vcgdhcvdhgc');

  const stateInput = page.locator('input[name="address.state"][type="text"]');
  await expect(stateInput).toBeVisible();
  await expect(stateInput).toBeEditable();
  await expect(stateInput).toBeEnabled();
  await stateInput.click();
  await expect(page.locator('li[data-label="Alabama"]')).toBeEnabled();
  await page.locator('li[data-label="Alabama"]').click();

  const postalCodeInput = page.locator('input[name="address.postal_code"][type="text"]');
  await expect(postalCodeInput).toBeVisible();
  await expect(postalCodeInput).toBeEditable();
  await postalCodeInput.fill(testData.postalCode);

  const phoneInput = page.locator('input[name="address.phone_number"][type="phone"]');
  await expect(phoneInput).toBeVisible();
  await expect(phoneInput).toBeEditable();
  await phoneInput.fill(testData.phone2);

  const addressLabelInput = page.locator('input[name="address.address_label"][type="text"]');
  await expect(addressLabelInput).toBeVisible();
  await expect(addressLabelInput).toBeEditable();
  await addressLabelInput.fill('bvchdjchj');

  const billingAddressCheckbox = page.locator('#addressbilling-addressbilling-billing-address');
  await expect(billingAddressCheckbox).toBeVisible();
  await billingAddressCheckbox.check();

  const defaultBillingAddressCheckbox = page.locator('#addressdefault-billing-addressdefault-billing-default-billing-address');
  await expect(defaultBillingAddressCheckbox).toBeVisible();
  await defaultBillingAddressCheckbox.check();

  await expect(page.locator('[id="address::edit-save-"]')).toBeEnabled();
  await page.locator('[id="address::edit-save-"]').click();

  const userMenuButton = page.locator('#user-menu-button');
  await expect(userMenuButton).toBeVisible();
  await expect(userMenuButton).toBeEnabled();
  await userMenuButton.click();

  await expect(page.getByRole('link', { name: 'Logout', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Logout', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');
});
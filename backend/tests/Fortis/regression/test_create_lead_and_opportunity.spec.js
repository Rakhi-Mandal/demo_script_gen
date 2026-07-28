import { test, expect } from '@playwright/test';

test('generated flow @regression', async ({ page }) => {
  await page.goto('https://prep.kala.ink/login');
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'Sign in with Email' })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email' }).click();

  const emailInput = page.locator('input[name="email"][type="email"]');
  await expect(emailInput).toBeVisible();
  await expect(emailInput).toBeEditable();
  await emailInput.fill('kishore.b@feuji.com');

  const passwordInput = page.locator('input[name="password"][type="password"]');
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toBeEditable();
  await passwordInput.fill('Testauto@21');

  const rememberMeCheckbox = page.locator('#remember_me');
  await expect(rememberMeCheckbox).toBeVisible();
  await expect(rememberMeCheckbox).toBeEnabled();
  await rememberMeCheckbox.check();

  await expect(page.getByRole('button', { name: 'Sign in with Email' })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email' }).click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button').filter({ hasText: 'Customer' })).toBeEnabled();
  await page.getByRole('button').filter({ hasText: 'Customer' }).click();

  await expect(page.getByRole('link', { name: 'Leads/Prospects' })).toBeEnabled();
  await page.getByRole('link', { name: 'Leads/Prospects' }).click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'New Lead' })).toBeEnabled();
  await page.getByRole('button', { name: 'New Lead' }).click();

  const companyNameInput = page.locator('input[name="lead.name"][type="text"]');
  await expect(companyNameInput).toBeVisible();
  await expect(companyNameInput).toBeEditable();
  await companyNameInput.fill('test_de');

  const firstNameInput = page.locator('input[name="contact.first_name"][type="text"]');
  await expect(firstNameInput).toBeVisible();
  await expect(firstNameInput).toBeEditable();
  await firstNameInput.fill('demo');

  const lastNameInput = page.locator('input[name="contact.last_name"][type="text"]');
  await expect(lastNameInput).toBeVisible();
  await expect(lastNameInput).toBeEditable();
  await lastNameInput.fill('test');

  const workPhoneInput = page.locator('input[name="contact.work_phone"][type="phone"]');
  await expect(workPhoneInput).toBeVisible();
  await expect(workPhoneInput).toBeEditable();
  await workPhoneInput.fill('34567');

  const mobilePhoneInput = page.locator('input[name="contact.mobile_phone"][type="phone-no-ext"]');
  await expect(mobilePhoneInput).toBeVisible();
  await expect(mobilePhoneInput).toBeEditable();
  await mobilePhoneInput.fill('9876543210');

  const faxInput = page.locator('input[name="contact.fax"][type="phone"]');
  await expect(faxInput).toBeVisible();
  await expect(faxInput).toBeEditable();
  await faxInput.fill('676');

  const contactEmailInput = page.locator('input[name="lead.email"][type="text"]');
  await expect(contactEmailInput).toBeVisible();
  await expect(contactEmailInput).toBeEditable();
  await contactEmailInput.fill('test3@gmail.com');

  const websiteInput = page.locator('input[name="lead.website"][type="text"]');
  await expect(websiteInput).toBeVisible();
  await expect(websiteInput).toBeEditable();
  await websiteInput.fill('https://www.amazon.in/');

//   const marketInput = page.locator('input[name="lead.market_id"][type="text"]');
//   await expect(marketInput).toBeVisible();
//   await expect(marketInput).toBeEditable();
//   await expect(marketInput).toBeEnabled();
//   await marketInput.click();
//   await expect(page.getByText('Automotive')).toBeEnabled();
//   await page.getByText('Automotive').click();

const marketInput = page.locator(
  'input[name="lead.market_id"][type="text"]'
);

await marketInput.scrollIntoViewIfNeeded();

await expect(marketInput).toBeVisible();

await expect(marketInput).toBeEnabled();

await marketInput.click();

await expect(page.getByText('Automotive')).toBeVisible();

await page.getByText('Automotive').click();


  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button').filter({ hasText: 'Customer' })).toBeEnabled();
  await page.getByRole('button').filter({ hasText: 'Customer' }).click();

  await expect(page.getByRole('link', { name: 'Opportunities' })).toBeEnabled();
  await page.getByRole('link', { name: 'Opportunities' }).click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeEnabled();
  await page.getByRole('button', { name: 'New Opportunity' }).click();

  const projectNameInput = page.locator('input[name="project.name"][type="text"]');
  await expect(projectNameInput).toBeVisible();
  await expect(projectNameInput).toBeEditable();
  await projectNameInput.fill('test');

  const projectDescriptionInput = page.locator('textarea[name="project.description"]');
  await expect(projectDescriptionInput).toBeVisible();
  await expect(projectDescriptionInput).toBeEditable();
  await projectDescriptionInput.fill('demo');

  await expect(page.getByRole('button', { name: 'Select Customer' })).toBeEnabled();
  await page.getByRole('button', { name: 'Select Customer' }).click();

  const customerSearchInput = page.locator('input[name="filters.searchByName"][type="text"]');
  await expect(customerSearchInput).toBeVisible();
  await expect(customerSearchInput).toBeEditable();
  await customerSearchInput.fill('test_auto121');
  await customerSearchInput.press('Enter');
  await page.waitForTimeout(3000);

  await page.getByRole('radio').check();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
});
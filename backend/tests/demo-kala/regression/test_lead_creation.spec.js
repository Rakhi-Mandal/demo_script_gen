import testData from '../test-data.json';
import { test, expect } from '@playwright/test';

test('Lead Creation', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  const signInButton = page.getByRole('button', { name: 'Sign in with Email' });
  await expect(signInButton).toBeVisible();
  await expect(signInButton).toBeEnabled();
  await signInButton.click();

  const emailInput = page.locator('input[name="email"]');
  await expect(emailInput).toBeVisible();
  await expect(emailInput).toBeEditable();
  await emailInput.fill(testData.email);

  const passwordInput = page.locator('input[name="password"]');
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toBeEditable();
  await passwordInput.fill(testData.password);

  await expect(signInButton).toBeEnabled();
  await signInButton.click();
  await page.waitForLoadState('domcontentloaded');

  const customerButton = page.getByRole('button').filter({ hasText: 'Customer' });
  await expect(customerButton).toBeVisible();
  await expect(customerButton).toBeEnabled();
  await customerButton.click();

  const leadsProspectsLink = page.getByRole('link', { name: 'Leads/Prospects' });
  await expect(leadsProspectsLink).toBeVisible();
  await expect(leadsProspectsLink).toBeEnabled();
  await leadsProspectsLink.click();
  await page.waitForLoadState('domcontentloaded');

  const newLeadButton = page.getByRole('button', { name: 'New Lead' });
  await expect(newLeadButton).toBeVisible();
  await expect(newLeadButton).toBeEnabled();
  await newLeadButton.click();

  const companyNameInput = page.locator('input[name="lead.name"]');
  await expect(companyNameInput).toBeVisible();
  await expect(companyNameInput).toBeEditable();
  await companyNameInput.fill('qaz');

  const firstNameInput = page.locator('input[name="contact.first_name"]');
  await expect(firstNameInput).toBeVisible();
  await expect(firstNameInput).toBeEditable();
  await firstNameInput.fill('name1');

  const lastNameInput = page.locator('input[name="contact.last_name"]');
  await expect(lastNameInput).toBeVisible();
  await expect(lastNameInput).toBeEditable();
  await lastNameInput.fill('name1');

  const workPhoneInput = page.locator('input[name="contact.work_phone"]');
  await expect(workPhoneInput).toBeVisible();
  await expect(workPhoneInput).toBeEditable();
  await workPhoneInput.fill(testData.phone);

  const mobilePhoneInput = page.locator('input[name="contact.mobile_phone"]');
  await expect(mobilePhoneInput).toBeVisible();
  await expect(mobilePhoneInput).toBeEditable();
  await mobilePhoneInput.fill(testData.phone);

  const faxInput = page.locator('input[name="contact.fax"]');
  await expect(faxInput).toBeVisible();
  await expect(faxInput).toBeEditable();
  await faxInput.fill('222');

  const contactEmailInput = page.locator('input[name="lead.email"]');
  await expect(contactEmailInput).toBeVisible();
  await expect(contactEmailInput).toBeEditable();
  await contactEmailInput.fill(testData.contactEmail4);

  const websiteInput = page.locator('input[name="lead.website"]');
  await expect(websiteInput).toBeVisible();
  await expect(websiteInput).toBeEditable();
  await websiteInput.fill(testData.website);

  const marketIdInput = page.locator('input[name="lead.market_id"]');
  await expect(marketIdInput).toBeVisible();
  await expect(marketIdInput).toBeEnabled();
  await marketIdInput.click();
  await expect(page.getByText('Automotive')).toBeEnabled();
  await page.getByText('Automotive').click();

  const nextButton = page.getByRole('button', { name: 'Next', exact: true });
  await expect(nextButton).toBeVisible();
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
  await page.waitForLoadState('domcontentloaded');

  const leadParagraph = page.getByRole('paragraph').filter({ hasText: 'qaz' });
  await expect(leadParagraph).toBeVisible();

  const userMenuButton = page.getByRole('button').filter({ hasText: 'Kishore Battula Fortis Solutions Group' });
  await expect(userMenuButton).toBeVisible();
  await expect(userMenuButton).toBeEnabled();
  await userMenuButton.click();

  const logoutLink = page.getByRole('link', { name: 'Logout' });
  await expect(logoutLink).toBeVisible();
  await expect(logoutLink).toBeEnabled();
  await logoutLink.click();
});
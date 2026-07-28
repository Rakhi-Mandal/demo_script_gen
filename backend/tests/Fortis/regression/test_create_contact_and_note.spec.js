import { test, expect } from '@playwright/test';

const testData = {
  url: 'https://prep.kala.ink/login',
  email: 'kishore.b@feuji.com',
  password: 'Testauto@21',
  otp: '',
  phone: '8767896789',
  phone2: '787678978',
  email2: 'testk61@gmail.com'
};

test('generated flow @regression', async ({ page }) => {

  test.setTimeout(60000);

  await page.goto(testData.url);

  await expect(
    page.getByRole('button', {
      name: 'Sign in with Email',
      exact: true
    })
  ).toBeEnabled();

  await page.getByRole('button', {
    name: 'Sign in with Email',
    exact: true
  }).click();

  const emailInput = page.locator(
    'input[name="email"][type="email"]'
  );

  await expect(emailInput).toBeVisible();
  await emailInput.fill(testData.email);

  const passwordInput = page.locator(
    'input[name="password"][type="password"]'
  );

  await expect(passwordInput).toBeVisible();
  await passwordInput.fill(testData.password);

  await page.getByRole('button', {
    name: 'Sign in with Email',
    exact: true
  }).click();

  await expect(page.getByRole('button').filter({ hasText: "Customer" })).toBeEnabled();
  await page.getByRole('button').filter({ hasText: "Customer" }).click();

  const customersLink = page.getByRole('link', { name: 'Customers', exact: true });
  await expect(customersLink).toBeVisible();
  await expect(customersLink).toBeEnabled();
  await customersLink.click();

  await page.waitForLoadState('domcontentloaded');

   const newCustomerButton = page.getByRole('button', { name: 'New Customer', exact: true });
  await expect(newCustomerButton).toBeEnabled();
  await newCustomerButton.click();

  const customerNameInput = page.locator(
    'input[name="customer.name"][type="text"]'
  );

  await expect(customerNameInput).toBeVisible();

  await customerNameInput.fill('test_jtyh');

  const marketInput = page.locator(
    '[data-cy="customerCreateSelectMarket"]'
  );

  await expect(marketInput).toBeVisible();

  await marketInput.click();

  await expect(page.getByText('Automotive')).toBeVisible();

  await page.getByText('Automotive').click();

  const continueButton1 = page.getByRole('button', {
    name: 'Continue',
    exact: true
  }).nth(0);

  await expect(continueButton1).toBeEnabled();

  await continueButton1.click();

  await expect(
    page.getByRole('button', {
      name: 'Yes, add record',
      exact: true
    })
  ).toBeEnabled();

  await page.getByRole('button', {
    name: 'Yes, add record',
    exact: true
  }).click();

  await expect(
    page.getByRole('link', {
      name: 'Go to record',
      exact: true
    })
  ).toBeEnabled();
  await page.getByRole('link', {name: 'Go to record',exact: true}).click();
  await page.waitForLoadState('domcontentloaded');


  await expect(
    page.getByRole('button', {
      name: 'Link Contact',
      exact: true
    })
  ).toBeEnabled();

  await page.getByRole('button', {
    name: 'Link Contact',
    exact: true
  }).click();

  const contactCheckbox = page.locator('#checkbox\\.input\\.13');

  await expect(contactCheckbox).toBeVisible();

  await contactCheckbox.check();

  await page.waitForTimeout(5000);
  await page.waitForLoadState('domcontentloaded');
  const continueButton2 = page.getByRole('button', { name: 'Continue', exact: true });
  await expect(continueButton2).toBeEnabled();
  await continueButton2.click();
  await page.waitForTimeout(5000);
  await page.waitForLoadState('domcontentloaded');
 const newNoteButton = page
  .getByRole('button', {
    name: 'New Note',
    exact: true
  })
  .nth(1);

await expect(newNoteButton).toBeVisible();

await expect(newNoteButton).toBeEnabled({
  timeout: 15000
});

await newNoteButton.click();

  const noteEditor = page.locator('.ql-editor');

  await expect(noteEditor).toBeVisible();

  await noteEditor.fill('test_demo');

  const saveButton = page
  .locator('button[wire\\:click="create"]')
  .last();

  await expect(saveButton).toBeVisible({
  timeout: 15000
  });

  await saveButton.click();
});
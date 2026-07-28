import testData from '../../test-data.json';
const { test, expect } = require('../../../fixtures/walker_fixture.js');
const { heal } = require('../../../fixtures/inline_healer.js');

test('generated flow @regression', async ({ page }) => {
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');
  
  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  
  await heal(page, 'email field', 'visible', null, () => page.locator('input[name="email"]'));
  await heal(page, 'email field', 'fill', testData.email, () => page.locator('input[name="email"]'));
  
  await heal(page, 'password field', 'visible', null, () => page.locator('input[name="password"]'));
  await heal(page, 'password field', 'fill', testData.password, () => page.locator('input[name="password"]'));
  
  await heal(page, 'remember me checkbox', 'visible', null, () => page.locator('#remember_me'));
  await heal(page, 'remember me checkbox', 'check', null, () => page.locator('#remember_me'));
  
  await heal(page, 'Sign in with Email button', 'visible', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await heal(page, 'Sign in with Email button', 'click', null, () => page.getByRole('button', { name: 'Sign in with Email' }));
  await page.waitForLoadState('domcontentloaded');
  
  await page.waitForURL(/blank/i);
  await expect(page).toHaveURL(/blank/i);
  await page.waitForLoadState('domcontentloaded');
  await heal(page, 'Estimating & Pricing button', 'visible', null, () => page.getByRole('button', { name: 'Estimating & Pricing' }));
  await heal(page, 'Estimating & Pricing button', 'click', null, () => page.getByRole('button', { name: 'Estimating & Pricing' }));
  
  await heal(page, 'Request For Proposals link', 'visible', null, () => page.getByRole('link', { name: 'Request For Proposals' }));
  await heal(page, 'Request For Proposals link', 'click', null, () => page.getByRole('link', { name: 'Request For Proposals' }));
  await page.waitForLoadState('domcontentloaded');
  
  await heal(page, 'New Request for Proposal link', 'visible', null, () => page.getByRole('link', { name: 'New Request for Proposal' }));
  await heal(page, 'New Request for Proposal link', 'click', null, () => page.getByRole('link', { name: 'New Request for Proposal' }));
  await page.waitForLoadState('domcontentloaded');
  
  await heal(page, 'Select Customer button', 'visible', null, () => page.getByRole('button', { name: 'Select Customer' }));
  await heal(page, 'Select Customer button', 'click', null, () => page.getByRole('button', { name: 'Select Customer' }));
  
  await heal(page, 'customer search field', 'visible', null, () => page.locator('input[name="filters.searchByName"]'));
  await heal(page, 'customer search field', 'fill', 'test_auto', () => page.locator('input[name="filters.searchByName"]'));
  
  await heal(page, 'test_customer_id checkbox', 'check', null, () => page.locator('input[name="customerSelectedId"][value="test_customer_id"]'));
  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue' }));
  await heal(page, 'Continue button', 'click', null, () => page.getByRole('button', { name: 'Continue' }));
  
  await heal(page, 'Select Opportunity button', 'visible', null, () => page.getByRole('button', { name: 'Select Opportunity' }));
  await heal(page, 'Select Opportunity button', 'click', null, () => page.getByRole('button', { name: 'Select Opportunity' }));
  
  await heal(page, 'customer search field', 'visible', null, () => page.locator('input[name="filters.searchByName"]'));
  await heal(page, 'customer search field', 'fill', 'test_op2', () => page.locator('input[name="filters.searchByName"]'));
  await heal(page, 'selectedId checkbox', 'check', null, () => page.locator('input[name="selectedId"]'));
  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue' }));
  await heal(page, 'Continue button', 'click', null, () => page.getByRole('button', { name: 'Continue' }));
  
  await heal(page, 'quantity unit input', 'visible', null, () => page.locator('input[name="estimate.quantity_unit_id"]'));
  await heal(page, 'quantity unit input', 'click', null, () => page.locator('input[name="estimate.quantity_unit_id"]'));
  await heal(page, 'Each text', 'click', null, () => page.getByText('Each'));
  
  await heal(page, 'Quantity Break 1 textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Quantity Break 1' }));
  await heal(page, 'Quantity Break 1 textbox', 'fill', '23', () => page.getByRole('textbox', { name: 'Quantity Break 1' }));
  
  await heal(page, 'Select Sample Available textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select Sample Available' }));
  await heal(page, 'Select Sample Available textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select Sample Available' }));
  await heal(page, 'Yes list item', 'click', null, () => page.getByRole('listitem').filter({ hasText: 'Yes' }));
  
  await heal(page, 'Select a Product Class textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Product Class' }));
  await heal(page, 'Select a Product Class textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Product Class' }));
  await heal(page, 'Blank Label text', 'click', null, () => page.getByText('Blank Label'));
  
  await heal(page, 'Select Workflow textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select Workflow' }));
  await heal(page, 'Select Workflow textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select Workflow' }));
  await heal(page, 'Blank Diecutter text', 'click', null, () => page.getByText('Blank Diecutter'));
  
  await heal(page, 'Select Plant textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select Plant' }));
  await heal(page, 'Select Plant textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select Plant' }));
  await heal(page, 'Catoosa, OK (22) list item', 'click', null, () => page.getByRole('listitem').filter({ hasText: 'Catoosa, OK (22)' }));
  
  await heal(page, 'description field', 'visible', null, () => page.locator('#estimate\\.description'));
  await heal(page, 'description field', 'fill', 'demo', () => page.locator('#estimate\\.description'));
  
  await heal(page, 'Select Laminate Type textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select Laminate Type' }));
  await heal(page, 'Select Laminate Type textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select Laminate Type' }));
  await heal(page, 'None list item', 'click', null, () => page.getByRole('listitem').filter({ hasText: 'None' }));
  
  await heal(page, 'Select a Unit Set textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Unit Set' }));
  await heal(page, 'Select a Unit Set textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Unit Set' }));
  await heal(page, 'first list item', 'click', null, () => page.getByRole('listitem').first());
  
  await heal(page, 'Select a Core Diameter textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Select a Core Diameter' }));
  await heal(page, 'Select a Core Diameter textbox', 'click', null, () => page.getByRole('textbox', { name: 'Select a Core Diameter' }));
  await heal(page, '.75 list item', 'click', null, () => page.getByRole('listitem').filter({ hasText: '.75' }));
  
  await heal(page, 'Select Material button', 'visible', null, () => page.getByRole('button', { name: 'Select Material' }));
  await heal(page, 'Select Material button', 'click', null, () => page.getByRole('button', { name: 'Select Material' }));
  await heal(page, '834 radio button', 'check', null, () => page.locator('input[name="datagrid-radio-selection"][value="834"]'));
  await heal(page, 'Continue button', 'visible', null, () => page.getByRole('button', { name: 'Continue' }));
  await heal(page, 'Continue button', 'click', null, () => page.getByRole('button', { name: 'Continue' }));
  
  await heal(page, 'Application Types textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Application Types' }));
  await heal(page, 'Application Types textbox', 'click', null, () => page.getByRole('textbox', { name: 'Application Types' }));
  await heal(page, 'Hand list item', 'click', null, () => page.getByRole('listitem').filter({ hasText: 'Hand' }));
  
  await heal(page, 'Enter the number for Units textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Enter the number for Units' }));
  await heal(page, 'Enter the number for Units textbox', 'click', null, () => page.getByRole('textbox', { name: 'Enter the number for Units' }));
  await heal(page, 'Enter the number for Units textbox', 'fill', '23', () => page.getByRole('textbox', { name: 'Enter the number for Units' }));
  
  await heal(page, 'max_roll_diameter input', 'visible', null, () => page.locator('input[name="max_roll_diameter"]'));
  await heal(page, 'max_roll_diameter input', 'click', null, () => page.locator('input[name="max_roll_diameter"]'));
  await heal(page, 'max_roll_diameter input', 'fill', '42.0', () => page.locator('input[name="max_roll_diameter"]'));
  
  await heal(page, 'Appearance (Color) textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Appearance (Color)' }));
  await heal(page, 'Appearance (Color) textbox', 'click', null, () => page.getByRole('textbox', { name: 'Appearance (Color)' }));
  await heal(page, 'Appearance (Color) textbox', 'fill', 'white', () => page.getByRole('textbox', { name: 'Appearance (Color)' }));
  
  await heal(page, 'Substrate (Face or Facestock) textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Substrate (Face or Facestock)' }));
  await heal(page, 'Substrate (Face or Facestock) textbox', 'click', null, () => page.getByRole('textbox', { name: 'Substrate (Face or Facestock)' }));
  await heal(page, 'Substrate (Face or Facestock) textbox', 'fill', 'abc', () => page.getByRole('textbox', { name: 'Substrate (Face or Facestock)' }));
  
  await heal(page, 'Adhesive textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Adhesive' }));
  await heal(page, 'Adhesive textbox', 'click', null, () => page.getByRole('textbox', { name: 'Adhesive' }));
  await heal(page, 'Adhesive textbox', 'fill', 'fdg', () => page.getByRole('textbox', { name: 'Adhesive' }));
  
  await heal(page, 'Liner textbox', 'visible', null, () => page.getByRole('textbox', { name: 'Liner' }));
  await heal(page, 'Liner textbox', 'click', null, () => page.getByRole('textbox', { name: 'Liner' }));
  await heal(page, 'Liner textbox', 'fill', 'fhg', () => page.getByRole('textbox', { name: 'Liner' }));
  
  await heal(page, 'Create Request for Proposal button', 'visible', null, () => page.getByRole('button', { name: 'Create Request for Proposal' }));
  await heal(page, 'Create Request for Proposal button', 'click', null, () => page.getByRole('button', { name: 'Create Request for Proposal' }));
  
  await page.waitForURL(/request-for-proposals/i);
  await expect(page).toHaveURL(/request-for-proposals/i);
  await page.waitForLoadState('domcontentloaded');
});
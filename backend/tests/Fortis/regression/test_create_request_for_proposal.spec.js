import { test, expect } from '@playwright/test';

test('generated flow @regression', async ({ page }) => {

  test.setTimeout(120000);

  await page.goto('https://prep.kala.ink/login');
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button', { name: 'Sign in with Email' })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email' }).click();

  await expect(page.locator('input[name="email"]')).toBeVisible();
  await page.locator('input[name="email"]').fill('kishore.b@feuji.com');

  await expect(page.locator('input[name="password"]')).toBeVisible();
  await page.locator('input[name="password"]').fill('Testauto@21');

  await expect(page.locator('#remember_me')).toBeEnabled();
  await page.locator('#remember_me').check();

  await expect(page.getByRole('button', { name: 'Sign in with Email' })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with Email' }).click();

  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('button').filter({ hasText: 'Estimating & Pricing' })).toBeEnabled();
  await page.getByRole('button').filter({ hasText: 'Estimating & Pricing' }).click();
  
  await expect(page.getByRole('link', { name: 'Request For Proposals', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Request For Proposals', exact: true }).click();

  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('link', { name: 'New Request for Proposal' })).toBeEnabled();
  await page.getByRole('link', { name: 'New Request for Proposal' }).click();

  await expect(page.getByRole('button', { name: 'Select Customer' })).toBeEnabled();
  await page.getByRole('button', { name: 'Select Customer' }).click();

  await expect(page.locator('input[name="filters.searchByName"]')).toBeVisible();
  await page.locator('input[name="filters.searchByName"]').fill('test_auto1');

  await page.locator('input[name="filters.searchByName"]').press('Enter');
  await page.waitForTimeout(2000);

 await page.locator('input[name="customerSelectedId"]').first().click({ force: true });

  await expect(
  page.getByRole('button', { name: 'Continue', exact: true }).first()
  ).toBeEnabled({ timeout: 15000 });

  await page.getByRole('button', { name: 'Continue', exact: true }).first().click();

  await expect(page.getByRole('button', { name: 'Select Opportunity' })).toBeEnabled();
  await page.getByRole('button', { name: 'Select Opportunity' }).click();



  await expect(page.getByRole('button', { name: 'New Opportunity', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'New Opportunity', exact: true }).click();
  
  const opportunityNameInput = page.locator('#modalContent').getByRole('textbox', { name: 'Opportunity Name' });
  await expect(opportunityNameInput).toBeVisible();
  await expect(opportunityNameInput).toBeEditable();
  await opportunityNameInput.fill('test_op5');
  
  const projectDescriptionInput = page.locator('textarea[name="project.description"]');
  await expect(projectDescriptionInput).toBeVisible();
  await expect(projectDescriptionInput).toBeEditable();
  await projectDescriptionInput.fill('demo');
  
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Next', exact: true }).click();









  await expect(page.locator('input[name="filters.searchByName"]')).toBeVisible();
  await page.locator('input[name="filters.searchByName"]').fill('test_op5');

  await page.locator('input[name="filters.searchByName"]').press('Enter');

  await page.getByRole('radio').nth(0).check();
  await page.waitForTimeout(2000);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.waitForTimeout(3000);

  await expect(page.locator('input[name="estimate.quantity_unit_id"]')).toBeEnabled();
  await page.locator('input[name="estimate.quantity_unit_id"]').click();

  await expect(page.getByText('Each')).toBeVisible();
  await page.getByText('Each').click();
   await page.waitForTimeout(2000);
  await expect(page.getByRole('textbox', { name: 'Quantity Break 1' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Quantity Break 1' }).fill('23');
   await page.waitForTimeout(2000);
  await expect(page.getByRole('textbox', { name: 'Select Sample Available' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Select Sample Available' }).click();

  await expect(page.getByRole('listitem').filter({ hasText: 'Yes' })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'Yes' }).click();

  await expect(page.getByRole('textbox', { name: 'Select a Product Class' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Select a Product Class' }).click();

  await expect(page.getByText('Blank Label')).toBeVisible();
  await page.getByText('Blank Label').click();
  await page.waitForTimeout(2000);
  await expect(page.getByRole('textbox', { name: 'Select Workflow' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Select Workflow' }).click();

  await expect(page.getByText('Blank Diecutter')).toBeVisible();
  await page.getByText('Blank Diecutter').click();

  await expect(page.getByRole('textbox', { name: 'Select Plant' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Select Plant' }).click();

  await expect(page.getByRole('listitem').filter({ hasText: 'Catoosa, OK (22)' })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'Catoosa, OK (22)' }).click();

  await expect(page.locator('#estimate\\.description')).toBeVisible();
  await page.locator('#estimate\\.description').fill('demo');

  await expect(page.getByRole('textbox', { name: 'Select Laminate Type' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Select Laminate Type' }).click();

  await expect(page.getByRole('listitem').filter({ hasText: 'None' })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'None' }).click();

  await expect(page.getByRole('textbox', { name: 'Select a Unit Set' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Select a Unit Set' }).click();

  await expect(page.getByRole('listitem').first()).toBeVisible();
  await page.getByRole('listitem').first().click();

  await expect(page.getByRole('textbox', { name: 'Select a Core Diameter' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Select a Core Diameter' }).click();

  await expect(page.getByRole('listitem').filter({ hasText: '.75' })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: '.75' }).click();

  await expect(page.getByRole('button', { name: 'Select Material' }).nth(2)).toBeEnabled();

  await page.getByRole('button', {name: 'Select Material'}).nth(0).click();

  await page.locator('input[name="datagrid-radio-selection"]').nth(0).check();

  await expect(page.getByRole('button', { name: 'Continue', exact: true }).last()).toBeEnabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).last().click();

  await expect(page.getByRole('textbox', { name: 'Application Types' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Application Types' }).click();

  await expect(page.getByRole('listitem').filter({ hasText: 'Hand' })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'Hand' }).click();

  await expect(page.getByRole('textbox', { name: 'Enter the number for Units' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Enter the number for Units' }).fill('23');

  await expect(page.locator('input[name="max_roll_diameter"]')).toBeVisible();
  await page.locator('input[name="max_roll_diameter"]').fill('42.0');

  await expect(page.getByRole('textbox', { name: 'Appearance (Color)' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Appearance (Color)' }).fill('white');

  await expect(page.getByRole('textbox', { name: 'Substrate (Face or Facestock)' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Substrate (Face or Facestock)' }).fill('abc');

  await expect(page.getByRole('textbox', { name: 'Adhesive' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Adhesive' }).fill('fdg');

  await expect(page.getByRole('textbox', { name: 'Liner' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Liner' }).fill('fhg');




  await expect(page.getByRole('button', { name: '- Print out, Head first.' })).toBeEnabled();
  await page.getByRole('button', { name: '- Print out, Head first.' }).click();
  await expect(page.getByRole('button', { name: 'Select Material' }).nth(0)).toBeEnabled();
  await page.getByRole('button', { name: 'Select Material' }).nth(0).click();
  
  await page.getByRole('row', { name: 'PKCB0627 Packaging PKG' }).getByLabel('', { exact: true }).check();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue' }).click();
  
  await expect(page.getByRole('spinbutton', { name: 'Quantity In Roll' })).toBeEnabled();
  await page.getByRole('spinbutton', { name: 'Quantity In Roll' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Quantity In Roll' })).toBeEditable();
  await page.getByRole('spinbutton', { name: 'Quantity In Roll' }).fill('23');
  
  await expect(page.getByRole('spinbutton', { name: 'Quantity In Box' })).toBeEnabled();
  await page.getByRole('spinbutton', { name: 'Quantity In Box' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Quantity In Box' })).toBeEditable();
  await page.getByRole('spinbutton', { name: 'Quantity In Box' }).fill('23');
  
  await expect(page.getByRole('spinbutton', { name: 'Feet in Roll' })).toBeEnabled();
  await page.getByRole('spinbutton', { name: 'Feet in Roll' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Feet in Roll' })).toBeEditable();
  await page.getByRole('spinbutton', { name: 'Feet in Roll' }).fill('5');
  
  await expect(page.getByRole('textbox', { name: 'Special Notes' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Special Notes' }).click();
  await expect(page.getByRole('textbox', { name: 'Special Notes' })).toBeEditable();
  await page.getByRole('textbox', { name: 'Special Notes' }).fill('test');
  
  await expect(page.getByRole('textbox', { name: 'Art Notes' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Art Notes' }).click();
  await expect(page.getByRole('textbox', { name: 'Art Notes' })).toBeEditable();
  await page.getByRole('textbox', { name: 'Art Notes' }).fill('test');
  
  await expect(page.getByRole('button', { name: 'Choose Unit Templates' })).toBeEnabled();
  await page.getByRole('button', { name: 'Choose Unit Templates' }).click();
  await page.locator('label[for="radio.input.13238"]').click({ force: true });
  
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.waitForTimeout(3000);

  await page.locator('input[id*="wcc-radio-not-finishing-press"]').first().check({ force: true });
  await page.locator('input[id*="wcc-radio-not-rewinder"]').first().check({ force: true });
  await page.locator('input[id*="wcc-radio-not-off-line-sheeter"]').first().check({ force: true });
  await page.waitForTimeout(3000);













  await expect(page.getByRole('spinbutton', { name: 'Number Across (Step)' })).toBeEditable();
  await page.getByRole('spinbutton', { name: 'Number Across (Step)' }).fill('34');
  
  await expect(page.getByRole('spinbutton', { name: 'Number Around (Repeat)' })).toBeEnabled();
  await page.getByRole('spinbutton', { name: 'Number Around (Repeat)' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Number Around (Repeat)' })).toBeEditable();
  await page.getByRole('spinbutton', { name: 'Number Around (Repeat)' }).fill('34');
  
  await expect(page.getByRole('spinbutton', { name: 'Tooth Count' })).toBeEnabled();
  await page.getByRole('spinbutton', { name: 'Tooth Count' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Tooth Count' })).toBeEditable();
  await page.getByRole('spinbutton', { name: 'Tooth Count' }).fill('33');
  
  await expect(page.getByRole('textbox', { name: 'General RFP Comments' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'General RFP Comments' }).click();
  await expect(page.getByRole('textbox', { name: 'General RFP Comments' })).toBeEditable();
  await page.getByRole('textbox', { name: 'General RFP Comments' }).fill('ghb');
  
  await expect(page.getByRole('textbox', { name: 'Special Printing Requirements' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Special Printing Requirements' }).click();
  await expect(page.getByRole('textbox', { name: 'Special Printing Requirements' })).toBeEditable();
  await page.getByRole('textbox', { name: 'Special Printing Requirements' }).fill('fgg');
  
  await expect(page.getByRole('textbox', { name: 'Special Packaging' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Special Packaging' }).click();
  await expect(page.getByRole('textbox', { name: 'Special Packaging' })).toBeEditable();
  await page.getByRole('textbox', { name: 'Special Packaging' }).fill('ghhje');

  await expect(page.getByRole('button', { name: 'Create Request for Proposal' })).toBeEnabled();
  await page.getByRole('button', { name: 'Create Request for Proposal' }).click();

  await page.waitForURL(/request-for-proposals/i);

  await expect(page).toHaveURL(/request-for-proposals/i);
   await page.waitForTimeout(18000);

});
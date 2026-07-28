import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('basic flow @regression', async ({ page }) => {
  // Initial navigation
  await page.goto(testData.url);
  await page.waitForLoadState('domcontentloaded');

  // Email input
  await heal(page, 'email field', 'click', null,
    () => page.locator('#username'));
  await heal(page, 'email field', 'fill', testData.username,
    () => page.locator('#username'));

  // Next button
  await heal(page, 'next button', 'click', null,
    () => page.getByRole('button', { name: 'Next', exact: true }));

  // Password input
  await heal(page, 'password field', 'fill', testData.password,
    () => page.locator('#password'));

  // Sign In button
  await heal(page, 'sign in button', 'click', null,
    () => page.getByRole('button', { name: 'Sign In', exact: true }));

  // New Quote link
  await heal(page, 'new quote link', 'click', null,
    () => page.getByRole('link', { name: 'New Quote', exact: true }));

  // Quote Name input
  await heal(page, 'quote name field', 'fill', testData.quoteName,
    () => page.locator('#quoteName'));

  await heal(page, 'select project button', 'click', null,
    () => page.getByRole('button', { name: 'Select project', exact: true }));

  // Search projects by name
  await heal(page, 'search projects by name field', 'fill', testData.searchProjectsByName,
    () => page.getByPlaceholder('Search projects by name'));

  await heal(page, 'project row', 'click', null,
    () => page.locator('td').filter({ hasText: /^- TEST$/ }).first());

  await heal(page, 'project radio', 'visible', null,
    () => page.locator('input[name="project"][type="radio"]'));
  await heal(page, 'project radio', 'check', null,
    () => page.locator('input[name="project"][type="radio"]'));

  // Create button
  await heal(page, 'create button', 'click', null,
    () => page.getByRole('button', { name: 'Create', exact: true }));

  // Configurable11 select
  await heal(page, 'configurable11 select', 'selectOption', testData.configurable11,
    () => page.locator('#Configurable11'));

  // Configurable12 select
  await heal(page, 'configurable12 select', 'selectOption', testData.configurable11,
    () => page.locator('#Configurable12'));

  // Configurable13 select
  await heal(page, 'configurable13 select', 'selectOption', testData.configurable13,
    () => page.locator('#Configurable13'));

  await heal(page, 'save details button', 'click', null,
    () => page.getByRole('button', { name: 'Save Details', exact: true }));

  // Line Items tab
  await heal(page, 'line items tab', 'click', null,
    () => page.getByRole('tab', { name: 'Line Items', exact: true }));

  // New Line Item link
  await heal(page, 'new line item link', 'click', null,
    () => page.getByRole('link', { name: 'New Line Item', exact: true }));

  await heal(page, 'classic aluminum row', 'click', null,
    () => page.locator('div').filter({ hasText: /^Classic Aluminum$/ }).first());

  await heal(page, 'single hung window 610 row', 'click', null,
    () => page.locator('div').filter({ hasText: /^Single Hung Window 610$/ }).first());

  // Operation & Dimensions button
  await heal(page, 'operation & dimensions button', 'click', null,
    () => page.getByRole('button', { name: 'Operation & Dimensions', exact: true }));

  await heal(page, 'dimension field', 'fill', testData.xpathDiv1Div1Input1,
    () => dimensionInput);

  // Additional Information button
  await heal(page, 'additional information button', 'click', null,
    () => page.getByRole('button', { name: 'Additional Information', exact: true }));

  // Frame Options button
  await heal(page, 'frame options button', 'click', null,
    () => page.getByRole('button', { name: 'Frame Options', exact: true }));

  // Glass Options button
  await heal(page, 'glass options button', 'click', null,
    () => page.getByRole('button', { name: 'Glass Options', exact: true }));

  // Accessory Options button
  await heal(page, 'accessory options button', 'click', null,
    () => page.getByRole('button', { name: 'Accessory Options', exact: true }));

  // Additional Information button (again)
  await heal(page, 'additional information button', 'click', null,
    () => page.getByRole('button', { name: 'Additional Information', exact: true }));

  await heal(page, 'dimension field', 'click', null,
    () => dimensionInput);

  // Radio for "Yes"
  await heal(page, 'yes radio', 'visible', null,
    () => page.locator(`input[name="question-id-3cb393d0-c6ce-${testData.phone}-1ec2a3cf927b0"][type="radio"]`));
  await heal(page, 'yes radio', 'check', null,
    () => page.locator(`input[name="question-id-3cb393d0-c6ce-${testData.phone}-1ec2a3cf927b0"][type="radio"]`));

  await heal(page, 'notes textarea', 'fill', testData.xpathDiv1Div1Textarea1,
    () => notesTextarea);

  // User menu button (masked email)
  await heal(page, 'user menu button', 'click', null,
    () => page.getByRole('button', { name: testData.username, exact: true }));

  await heal(page, 'dimension field', 'click', null,
    () => dimensionInput);

  // Add to Quote button
  await heal(page, 'add to quote button', 'click', null,
    () => page.getByRole('button', { name: 'Add to Quote', exact: true }));

  // Submit to Engineering button
  await heal(page, 'submit to engineering button', 'click', null,
    () => page.getByRole('button', { name: 'Submit to Engineering', exact: true }));

  await heal(page, 'otp checkbox', 'visible', null,
    () => page.locator(`#6e175cfb-${testData.phone}-44cb-${testData.phone}-540ccd020552-check`));
  await heal(page, 'otp checkbox', 'check', null,
    () => page.locator(`#6e175cfb-${testData.phone}-44cb-${testData.phone}-540ccd020552-check`));

  // Toggle Dropdown button
  await heal(page, 'toggle dropdown button', 'click', null,
    () => page.locator('[title="Toggle Dropdown"]'));

  // Double Check link
  await heal(page, 'double check link', 'click', null,
    () => page.getByRole('link', { name: 'Double Check', exact: true }));

  // User menu button (masked email) again
  await heal(page, 'user menu button', 'click', null,
    () => page.getByRole('button', { name: testData.username, exact: true }));
});
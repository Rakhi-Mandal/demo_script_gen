import testData from '../../test-data.json';
const { test, expect } = require('../../../fixtures/walker_fixture.js');
const { heal } = require('../../../fixtures/inline_healer.js');

test('2026 05 15T08 49 10', async ({ page }) => {
  // 1. Go to login page
  await page.goto('https://prep.kala.ink/login');
  await page.waitForLoadState('domcontentloaded');

  const signInWithEmailButton = () => page.getByRole('button', { name: 'Sign in with Email', exact: true });
  await heal(page, 'sign in with Email button', 'visible', null, signInWithEmailButton);
  await heal(page, 'sign in with Email button', 'click', null, signInWithEmailButton);

  const emailInput = () => page.locator('input[name="email"][type="email"]');
  await heal(page, 'email field', 'visible', null, emailInput);
  await emailInput().fill('kishore.b@feuji.com');

  const passwordInput = () => page.locator('input[name="password"][type="password"]');
  await heal(page, 'password field', 'visible', null, passwordInput);
  await passwordInput().fill('Testauto@21');

  const signInConfirmButton = () => page.getByRole('button', { name: 'Sign in with Email', exact: true });
  await heal(page, 'sign in with Email button', 'visible', null, signInConfirmButton);
  await heal(page, 'sign in with Email button', 'click', null, signInConfirmButton);

  await page.waitForLoadState('domcontentloaded');

  const customerButton = () => page.getByRole('button').filter({ hasText: "Customer" });
  await heal(page, 'Customer button', 'visible', null, customerButton);
  await heal(page, 'Customer button', 'click', null, customerButton);

  const customersLink = () => page.getByRole('link', { name: 'Customers', exact: true });
  await heal(page, 'Customers link', 'visible', null, customersLink);
  await heal(page, 'Customers link', 'click', null, customersLink);

  await page.waitForLoadState('domcontentloaded');

  const newCustomerButton = () => page.getByRole('button', { name: 'New Customer', exact: true });
  await heal(page, 'New Customer button', 'visible', null, newCustomerButton);
  await heal(page, 'New Customer button', 'click', null, newCustomerButton);

  const customerNameInput = () => page.locator('input[name="customer.name"][type="text"]');
  await heal(page, 'customer name field', 'visible', null, customerNameInput);
  await customerNameInput().fill('21testvfngng');

  const marketInput = () => page.locator('[data-cy="customerCreateSelectMarket"]');
  await heal(page, 'market input', 'visible', null, marketInput);
  await heal(page, 'market input', 'click', null, marketInput);

  const automotiveOption = () => page.locator('li[data-label="Automotive"]');
  await heal(page, 'automotive option', 'visible', null, automotiveOption);
  await heal(page, 'automotive option', 'click', null, automotiveOption);

  const continueButton = () => page.getByRole('button', { name: 'Continue', exact: true });
  await heal(page, 'Continue button', 'visible', null, continueButton);
  await heal(page, 'Continue button', 'click', null, continueButton);

  const yesAddRecordButton = () => page.getByRole('button', { name: 'Yes, add record', exact: true });
  await heal(page, 'Yes, add record button', 'visible', null, yesAddRecordButton);
  await heal(page, 'Yes, add record button', 'click', null, yesAddRecordButton);

  const goToRecordLink = () => page.getByRole('link', { name: 'Go to record', exact: true });
  await heal(page, 'Go to record link', 'visible', null, goToRecordLink);
  await heal(page, 'Go to record link', 'click', null, goToRecordLink);

  await page.waitForLoadState('domcontentloaded');

  const customerEditMode = () => page.locator('[data-cy="customerEditMode"]');
  await heal(page, 'customer edit mode', 'visible', null, customerEditMode);
  await heal(page, 'customer edit mode', 'click', null, customerEditMode);
  await page.waitForTimeout(3000);
  
  const selectContactButton = () => page.getByRole('button', { name: 'Select Contact', exact: true });
  await heal(page, 'Select Contact button', 'visible', null, selectContactButton);
  await heal(page, 'Select Contact button', 'click', null, selectContactButton);

  const davidBognarRow = () => page.getByRole('row', { name: /David Bognar Kohli/i });
  const davidBognarRadio = () => davidBognarRow().getByRole('radio');

  await heal(page, 'David Bognar radio', 'visible', null, davidBognarRadio);
  await davidBognarRadio().check();
  await page.waitForTimeout(5000);

  const continueButton2 = () => page.getByRole('button', { name: 'Continue', exact: true });
  await heal(page, 'Continue button', 'visible', null, continueButton2);
  await heal(page, 'Continue button', 'click', null, continueButton2);
  await page.waitForTimeout(7000);

  const dunsInput = () => page.locator('input[name="customer.duns_number"][type="text"]');
  await heal(page, 'DUNS number field', 'visible', null, dunsInput);
  await dunsInput().fill('78778');

  const websiteInput = () => page.locator('input[name="customer.website"][type="text"]');
  await heal(page, 'website field', 'visible', null, websiteInput);
  await websiteInput().fill('https://www.amazon.in/');

  const tierInput = () => page.getByPlaceholder('Select a Tier').first();
  await heal(page, 'Tier input', 'visible', null, tierInput);
  await heal(page, 'Tier input', 'click', null, tierInput);

  const communityOption = () => page.locator('li[data-label="Community"]');
  await heal(page, 'Community option', 'visible', null, communityOption);
  await heal(page, 'Community option', 'click', null, communityOption);

  const continueButton3 = () => page.getByRole('button', { name: 'Continue', exact: true });
  await heal(page, 'Continue button', 'visible', null, continueButton3);
  await heal(page, 'Continue button', 'click', null, continueButton3);

  const selectUserButton1 = () => page.getByRole('button', { name: 'Select User', exact: true });
  await heal(page, 'Select User button', 'visible', null, selectUserButton1);
  await heal(page, 'Select User button', 'click', null, selectUserButton1);

  const matthewRow = () => page.getByRole('row', { name: /USR0148 MATTHEW N BROLL/i });
  const matthewRadio = () => matthewRow().getByRole('radio');

  await heal(page, 'Matthew radio', 'visible', null, matthewRadio);
  await matthewRadio().check();

  const continueButton4 = () => page.getByRole('button', { name: 'Continue', exact: true });
  await heal(page, 'Continue button', 'visible', null, continueButton4);
  await heal(page, 'Continue button', 'click', null, continueButton4);

  const selectUserButton2 = () => page.getByRole('button', { name: 'Select User', exact: true });
  await heal(page, 'Select User button', 'visible', null, selectUserButton2);
  await heal(page, 'Select User button', 'click', null, selectUserButton2);

  const altheaRow = () => page.getByRole('row', { name: /USR0048 ALTHEA G ADKINS CX/i });
  const altheaRadio = () => altheaRow().getByRole('radio');

  await heal(page, 'Althea radio', 'visible', null, altheaRadio);
  await altheaRadio().check();

  const continueButton5 = () => page.getByRole('button', { name: 'Continue', exact: true });
  await heal(page, 'Continue button', 'visible', null, continueButton5);
  await heal(page, 'Continue button', 'click', null, continueButton5);

  const customerEditSaveButton = () => page.locator('[data-cy="customerEditSave"]');
  await heal(page, 'customer edit save button', 'visible', null, customerEditSaveButton);
  await heal(page, 'customer edit save button', 'click', null, customerEditSaveButton);

  const settingsTabButton = () => page.getByRole('button', { name: 'Settings', exact: true });
  await heal(page, 'Settings tab button', 'visible', null, settingsTabButton);
  await heal(page, 'Settings tab button', 'click', null, settingsTabButton);

  const linksTabButton = () => page.getByRole('button', { name: 'Links', exact: true });
  await heal(page, 'Links tab button', 'visible', null, linksTabButton);
  await heal(page, 'Links tab button', 'click', null, linksTabButton);

  const artworkTabButton = () => page.getByRole('button', { name: 'Artwork', exact: true });
  await heal(page, 'Artwork tab button', 'visible', null, artworkTabButton);
  await heal(page, 'Artwork tab button', 'click', null, artworkTabButton);

  const userMenuButton = () => page.getByRole('button', { name: 'Kishore Battula Fortis Solutions Group', exact: true });
  await heal(page, 'User menu button', 'visible', null, userMenuButton);
  await heal(page, 'User menu button', 'click', null, userMenuButton);

  const logoutLink = () => page.getByRole('link', { name: 'Logout', exact: true });
  await heal(page, 'Logout link', 'visible', null, logoutLink);
  await heal(page, 'Logout link', 'click', null, logoutLink);

  await page.waitForLoadState('domcontentloaded');
});
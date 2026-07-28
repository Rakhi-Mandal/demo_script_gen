import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
    await page.goto(testData.url);
    await page.waitForLoadState('domcontentloaded');

    await heal(page, 'username field', 'click', null,
        () => page.locator("xpath=//input[@id='signInName']"));
    await heal(page, 'username field', 'fill', testData.signInName,
        () => page.getByRole('textbox', { name: 'Enter your username or email' }));

    await heal(page, 'continue button', 'click', null,
        () => page.locator("xpath=//button[@id='continue']"));
    await heal(page, 'password field', 'click', null,
        () => page.locator("xpath=//input[@id='password']"));
    await heal(page, 'password field', 'fill', testData.password,
        () => page.getByRole('textbox', { name: 'Password' }));

    await heal(page, 'next button', 'click', null,
        () => page.locator("xpath=//button[@id='next']"));
    await heal(page, 'search field', 'click', null,
        () => page.locator("xpath=//input[@aria-label='Search']"));
    await heal(page, 'search field', 'fill', testData.search,
        () => page.getByRole('searchbox', { name: 'Search' }));

    await heal(page, 'test client jg option', 'click', null,
        () => page.locator("xpath=//span[normalize-space(.)='Test Client JG']"));
    await heal(page, 'order list link', 'click', null,
        () => page.locator("xpath=//a[@href='/corsair/order/list']"));
    await heal(page, 'order list new button', 'click', null,
        () => page.locator("xpath=//a[@data-testid='order-list-new-button']"));
    await heal(page, 'calendar open button', 'click', null,
        () => page.locator("xpath=//span[@id='pv_id_2631']/button[1]"));
    await heal(page, 'calendar day 31', 'click', null,
        () => page.locator("xpath=//span[normalize-space(.)='31']"));
    await heal(page, 'next minute button', 'click', null,
        () => page.locator("xpath=//button[@aria-label='Next Minute']"));
    await heal(page, 'am button', 'click', null,
        () => page.locator("xpath=//button[@aria-label='am']"));
    await heal(page, 'calendar cell', 'click', null,
        () => page.locator("xpath=//tr[normalize-space(.)='262728293031311']/td[5]/span[1]"));
    await heal(page, 'save to address book checkbox', 'click', null,
        () => page.locator("xpath=//input[@id='stop-1-content-save-to-address-book']"));
    await heal(page, 'calendar open button', 'click', null,
        () => page.locator("xpath=//span[@id='pv_id_2676']/button[1]"));
    await heal(page, 'calendar cell', 'click', null,
        () => page.locator("xpath=//tr[normalize-space(.)='2627282930311']/td[4]/span[1]"));
    await heal(page, 'calendar open button', 'click', null,
        () => page.locator("xpath=//span[@id='pv_id_2673']/button[1]"));
});
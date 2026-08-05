import testData from '../../test-data.json';
const { test, expect } = require('../../fixtures/walker_fixture.js');
const { heal } = require('../../fixtures/inline_healer.js');

test('generated flow @sanity', async ({ page }) => {
    await page.goto(testData.url);
    await page.waitForLoadState('domcontentloaded');
    await heal(page, 'username field', 'click', null,
        () => page.locator("xpath=//input[@*[name()='type' and .='text']]"));
    await heal(page, 'username field', 'fill', testData.signInName,
        () => page.getByRole('textbox', { name: 'Enter your username or email' }));
    await heal(page, 'submit button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='type' and .='submit']]"));
    await heal(page, 'password field', 'click', null,
        () => page.locator("xpath=//input[@*[name()='type' and .='password']]"));
    await heal(page, 'password field', 'fill', testData.xpathInputNameTypeAndPassword,
        () => page.getByRole('textbox', { name: 'Password' }));
    await heal(page, 'submit button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='type' and .='submit']]"));
    await heal(page, 'node label', 'click', null,
        () => page.locator("xpath=//span[@*[name()='data-pc-section' and .='nodelabel']]"));
    await heal(page, 'shipment list link', 'click', null,
        () => page.locator("xpath=//a[@*[name()='href' and .='/corsair/shipment/list']]"));
    await heal(page, 'add button', 'click', null,
        () => page.locator("xpath=//a[@*[name()='data-pc-name' and .='button']]"));
    await heal(page, 'order template dropdown', 'click', null,
        () => page.locator("xpath=//span[@*[name()='aria-label' and .='Find an order template']]/following-sibling::div[@*[name()='data-pc-section' and .='dropdown']]"));
    await heal(page, 'demo option', 'click', null,
        () => page.locator("xpath=//li[@*[name()='aria-label' and .='demo']]"));
    await heal(page, 'rounded button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='data-p' and .='rounded']]"));
    await heal(page, 'add quote button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='aria-label' and .='Add Quote']]"));
    await heal(page, 'mode dropdown', 'click', null,
        () => page.locator("xpath=//span[@*[name()='aria-label' and .='Mode']]/following-sibling::div[@*[name()='data-pc-section' and .='dropdown']]"));
    await heal(page, 'TL option', 'click', null,
        () => page.locator("xpath=//li[@*[name()='aria-label' and .='TL']]"));
    await heal(page, 'rate input', 'click', null,
        () => page.locator("xpath=//tfoot[@*[name()='data-p-scrollable' and .='true']]/preceding::tr[normalize-space(.)='LinehaulBuy RateMarginFlatSell Rate']//input[@*[name()='aria-valuemin' and .='0']]"));
    await heal(page, 'save quote button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='aria-label' and .='Save Quote']]"));
    await heal(page, 'confirm button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='aria-hidden' and .='false']]"));
    await heal(page, 'confirm dialog button', 'click', null,
        () => page.locator("xpath=//span[@*[name()='data-pc-section' and .='lastfocusableelement']]/preceding::button[normalize-space(.)='Confirm']"));
    await heal(page, 'icon-only outlined button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='data-p' and .='icon-only outlined']]/preceding-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'add pickup button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='aria-label' and .='Add Pickup']]"));
    await heal(page, 'actual-arrival calendar button', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='actual-arrival']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'day 12', 'click', null,
        () => page.locator("xpath=//td[@*[name()='aria-label' and .='12']]//span[@*[name()='data-pc-section' and .='day']]"));
    await heal(page, 'actual-arrival calendar button', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='actual-arrival']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'actual-departure calendar button', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='actual-departure']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'day 20', 'click', null,
        () => page.locator("xpath=//td[@*[name()='aria-label' and .='20']]//span[@*[name()='data-pc-section' and .='day']]"));
    await heal(page, 'save event button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='aria-label' and .='Save Event']]"));
    await heal(page, 'add delivery button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='aria-label' and .='Add Delivery']]"));
    await heal(page, 'actual-arrival calendar button', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='actual-arrival']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'day 26', 'click', null,
        () => page.locator("xpath=//td[@*[name()='aria-label' and .='25']]/following::td[@*[name()='aria-label' and .='26']]//span[@*[name()='data-pc-section' and .='day']]"));
    await heal(page, 'actual-arrival calendar button', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='actual-arrival']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'actual-departure calendar button', 'click', null,
        () => page.locator("xpath=//input[@*[name()='id' and .='actual-departure']]/following-sibling::button[@*[name()='type' and .='button']]"));
    await heal(page, 'day 28', 'click', null,
        () => page.locator("xpath=//td[@*[name()='aria-label' and .='25']]/following::td[@*[name()='aria-label' and .='28']]//span[@*[name()='data-pc-section' and .='day']]"));
    await heal(page, 'save event button', 'click', null,
        () => page.locator("xpath=//button[@*[name()='aria-label' and .='Save Event']]"));
});
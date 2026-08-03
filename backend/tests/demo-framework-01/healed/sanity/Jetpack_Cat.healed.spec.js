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

    await heal(page, 'Test Client JG option', 'click', null,
        () => page.locator("xpath=//span[normalize-space(.)='Test Client JG']"));
    await heal(page, 'shipment list link', 'click', null,
        () => page.locator("xpath=//a[@href='/corsair/shipment/list']"));
    await heal(page, 'more filters button', 'click', null,
        () => page.locator("xpath=//button[@aria-label='More Filters']"));
    await heal(page, 'filter option', 'click', null,
        () => page.locator("xpath=//li[@id='pv_id_1038_6']"));
    await heal(page, 'shipment status dropdown', 'click', null,
        () => page.locator("xpath=//div[normalize-space(.)='Shipment StatusShipment Status']/div[1]/div[3]"));
    await heal(page, 'shipment status option', 'click', null,
        () => page.locator("xpath=//li[@id='pv_id_2836_0']"));
    await heal(page, 'shipment row', 'click', null,
        () => page.locator("xpath=/html[1]/body[1]/div[1]/div[1]/div[2]/main[1]/div[1]/div[2]/div[1]/div[1]/div[1]/div[1]/div[1]"));
    await heal(page, 'shipment details section', 'click', null,
        () => page.locator("xpath=//div[normalize-space(.)='IdOriginDestinationTagsTagsShipment StatusPlanning']"));
    await heal(page, 'shipment details link', 'click', null,
        () => page.locator("xpath=//a[@href='/corsair/shipment/118827?search=%257B%2522pageSize%2522%253A20%252C%2522page%2522%253A0%252C%2522sortField%2522%253A%2522id%2522%252C%2522sortDirection%2522%253A%2522DESC%2522%252C%2522shipmentId%2522%253A%255B%255D%252C%2522ownerNaturalIds%2522%253A%255B%255D%252C%2522services%2522%253A%255B%255D%252C%2522modes%2522%253A%255B%255D%252C%2522healths%2522%253A%255B%255D%252C%2522statuses%2522%253A%255B%2522PLANNING%2522%255D%252C%2522financialStatuses%2522%253A%255B%255D%252C%2522originLocationGroupIds%2522%253A%255B%255D%252C%2522destinationLocationGroupIds%2522%253A%255B%255D%252C%2522directions%2522%253A%255B%255D%252C%2522equipmentTypes%2522%253A%255B%255D%252C%2522referenceNumbers%2522%253A%255B%255D%252C%2522glCodes%2522%253A%255B%255D%252C%2522tags%2522%253A%255B%255D%252C%2522assignedUsers%2522%253A%255B%255D%252C%2522referenceSort%2522%253Afalse%252C%2522requestedMode%2522%253A%255B%255D%257D']"));
    await heal(page, 'add quote button', 'click', null,
        () => page.locator("xpath=//button[@aria-label='Add Quote']"));
    await heal(page, 'quote dropdown', 'click', null,
        () => page.locator("xpath=//div[@id='pv_id_4662']/div[1]"));
    await heal(page, 'quote dropdown option', 'click', null,
        () => page.locator("xpath=//li[@id='pv_id_4662_1']"));
    await heal(page, 'buy rate input', 'click', null,
        () => page.locator("xpath=//tr[normalize-space(.)='LinehaulBuy RateMarginFlatSell Rate']/td[2]/div[1]/div[1]/span[1]/input[1]"));
    await heal(page, 'save quote button', 'click', null,
        () => page.locator("xpath=//button[@aria-label='Save Quote']"));
    await heal(page, 'select rate button', 'click', null,
        () => page.locator("xpath=//button[normalize-space(.)='Select Rate']"));
    await heal(page, 'confirm button', 'click', null,
        () => page.locator("xpath=//button[normalize-space(.)='Confirm']"));
    await heal(page, 'rate shop select button', 'click', null,
        () => page.locator("xpath=//section[@id='rate-shop']/div[1]/div[1]/div[2]/div[1]/button[1]"));
    await heal(page, 'add pickup button', 'click', null,
        () => page.locator("xpath=//button[@aria-label='Add Pickup']"));
    await heal(page, 'pickup calendar button', 'click', null,
        () => page.locator("xpath=//span[@id='pv_id_5557']/button[1]"));
    await heal(page, 'pickup calendar day', 'click', null,
        () => page.locator("xpath=//tr[normalize-space(.)='2627282930311']/td[5]/span[1]"));
    await heal(page, 'pickup modal', 'click', null,
        () => page.locator("xpath=//div[@aria-labelledby='pv_id_4058_header']/div[2]"));
    await heal(page, 'pickup modal date', 'click', null,
        () => page.locator("xpath=//div[@aria-labelledby='pv_id_4058_header']/div[2]/div[1]/div[1]"));
    await heal(page, 'pickup calendar button', 'click', null,
        () => page.locator("xpath=//span[@id='pv_id_5562']/button[1]"));
    await heal(page, 'pickup calendar day', 'click', null,
        () => page.locator("xpath=//tr[normalize-space(.)='2627282930311']/td[5]/span[1]"));
    await heal(page, 'save event button', 'click', null,
        () => page.locator("xpath=//button[@aria-label='Save Event']"));
    await heal(page, 'add delivery button', 'click', null,
        () => page.locator("xpath=//button[@aria-label='Add Delivery']"));
    await heal(page, 'delivery calendar button', 'click', null,
        () => page.locator("xpath=//span[@id='pv_id_5907']/button[1]"));
    await heal(page, 'delivery calendar day', 'click', null,
        () => page.locator("xpath=//span[normalize-space(.)='31']"));
    await heal(page, 'delivery modal', 'click', null,
        () => page.locator("xpath=//div[@aria-labelledby='pv_id_4058_header']/div[2]"));
    await heal(page, 'delivery modal date', 'click', null,
        () => page.locator("xpath=//div[@aria-labelledby='pv_id_4058_header']/div[2]/div[1]/div[1]"));
    await heal(page, 'delivery calendar button', 'click', null,
        () => page.locator("xpath=//span[@id='pv_id_5912']/button[1]"));
    await heal(page, 'delivery calendar day', 'click', null,
        () => page.locator("xpath=//span[normalize-space(.)='31']"));
    await heal(page, 'save event button', 'click', null,
        () => page.locator("xpath=//button[@aria-label='Save Event']"));
});
import config from './config.js';

const timeout = config.browser.timeout || 60000;

/**
 * 
 * @param {import("../book-maker.js").Page} page 
 * @param {string} html 
 * @param {import("puppeteer").WaitForNetworkIdleOptions} [opts]
 */
export async function setPageContent(page, html, opts) {
    await page.setContent(html, { waitUntil: ['load', 'domcontentloaded'], ...opts });
    await page.waitForNetworkIdle({idleTime: 500, timeout, ...opts});
}

/**
 * 
 * @param {import("../book-maker.js").Page} page 
 * @param {string} url 
 * @param {import("puppeteer").GoToOptions & import("puppeteer").WaitForNetworkIdleOptions} [opts] 
 * @returns 
 */
export async function gotoPage(page, url, opts) {
    const response =  await page.goto(url, { waitUntil: ['load', 'domcontentloaded'], ...opts });
    await page.waitForNetworkIdle({idleTime: 500, concurrency: 2, timeout, ...opts});
    return response;
}

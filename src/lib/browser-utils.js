import { TimeoutError } from 'puppeteer';
import config from './config.js';
import { debug } from './utils.js';
import { error } from 'node:console';

const timeout = config.browser.timeout || 60000;
const uniqueRequestsHeartbeatTimeoutMs = config.browser.uniqueRequestsHeartbeatTimeoutMs || 0;

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
 * @param {import("puppeteer").GoToOptions & import("puppeteer").WaitForNetworkIdleOptions & { uniqueRequestsHeartbeatTimeoutMs?: number }} [options] 
 * @returns 
 */
export async function gotoPage(page, url, options) {
    const ac = new AbortController();
    const { signal } = ac;
    const { uniqueRequestsHeartbeatTimeoutMs: heartbeatMs = uniqueRequestsHeartbeatTimeoutMs, ...opts } = options || {};
    const response =  await page.goto(url, { waitUntil: ['load', 'domcontentloaded'], ...opts });

    let readyResult = '';

    try {
        const promises = [waitForIdle(page, opts, signal)];
        if (heartbeatMs) {
            promises.push(waitForNoMoreRepeatedRequests(page, heartbeatMs, signal));
        }
        readyResult = await Promise.race(promises);
    } catch (error) {
        if (error instanceof TimeoutError) {
            debug('Wait for network idle timed out, proceeding anyway', {url, error});
        } else {
            throw error;
        }
    }
    debug(`Page loaded: ${readyResult}`, {url});
    // stop slow listener
    ac.abort();
    return response;
}

/**
 * 
 * @param {*} page 
 * @param {*} opts 
 * @param {*} signal 
 * @returns {Promise<string>}
 */
async function waitForIdle(page, opts, signal) {
    await page.waitForNetworkIdle({idleTime: 500, concurrency: 2, timeout, ...opts, signal });
    return signal?.aborted ? '' : 'idle';
}

async function waitForNoMoreRepeatedRequests(page, timeout, signal) {
    const requests = new Map();
    /** @type {PromiseWithResolvers<string>} */
    const defer = Promise.withResolvers();
    let timer;
    /** @type {(req: import("puppeteer").HTTPRequest) => void} */
    const handler = (req) => {
        try {
            const url = new URL(req.url());
            const key = `${req.method()} ${url.origin}${url.pathname}`;
            let count = requests.get(key) || 0;
            // not seen before, so new request
            if (!count) {
                clearTimeout(timer);
                timer = setTimeout(cleanup, timeout, 'no-new');
            }
            requests.set(key, count + 1);
        } catch (error) {
            console.warn('Error on request event listener', {error});
        }
    };
    const cleanup = (reason) => {
        clearTimeout(timer);
        defer.resolve(reason);
        page.off('requestfinished', handler);
        signal?.removeEventListener('abort', cleanup);
    };
    page.on('requestfinished', handler);
    // don't initially set timeout, wait for first
    // timer = setTimeout(cleanup, timeout, 'noresolve');
    signal?.addEventListener('abort', cleanup);
    return await defer.promise;
}

export function setUserAgent(page, browserOptions) {
    page.setUserAgent({
        ...browserOptions.userAgentOptions,
        userAgent: browserOptions.userAgentOptions.userAgent || browserOptions.ua
    });
}
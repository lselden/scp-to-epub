// @ts-check
const config = require("./config");
const { debug } = require("./utils");
const {setTimeout} = require('node:timers/promises');

let localCacheUrl = undefined;
let localProxySettings = {};

function configureLocalProxy() {
    localCacheUrl = config.get('discovery.localArchiveProxy');
    localProxySettings = {
        verify: true,
        https: true,
        timeoutMs: 1000 * 10,
        ...config.get('discovery.localArchiveProxyCfg', {})
    }
}

const urlVerifyCache = new Map();

function isLocalProxyEnabled() {
    return !!localCacheUrl;
}

function getLocalProxyUrl() {
    return localCacheUrl;
}

function shouldProxyUrl(url = '') {
    return !!localCacheUrl && !!url &&
        (!`${url}`.startsWith('http://') || localProxySettings.https);
}

/**
 * 
 * @param {string} url 
 * @returns 
 */
function toProxyUrl(url = '') {
    return `${localCacheUrl}${`${url}`.replace(/https?:\/\//, '')}`;
}

/**
 * 
 * @param {string} proxyUrl 
 * @returns 
 */
function fromProxyUrl(proxyUrl = '') {
    if (!localCacheUrl) return proxyUrl;
    return `${proxyUrl}`.replace(localCacheUrl, proxyUrl.replace(/:.+/, ':'))
}

function isProxiedUrl(url) {
    return !!localCacheUrl && `${url}`.includes(localCacheUrl);
}

async function maybeProxyUrl(url) {
    if (!shouldProxyUrl(url)) return url;

    
    let newUrl = toProxyUrl(url);
    if (!localProxySettings.verify) {
        return newUrl;
    }
    const [_cacheKey] = `${url}`.split('?');
    let inProxy = urlVerifyCache.get(_cacheKey);
    if (inProxy != undefined) {
        return inProxy ? newUrl : url;
    }

    const res = await Promise.race([
        setTimeout(localProxySettings.timeoutMs, {ok: false, timeout: true}, { ref: false }),
        fetch(newUrl, { method: 'HEAD' })
            .catch(err => { debug(`ignoring error in testing proxy for url ${newUrl} ${err}`); return undefined })
    ]);
    inProxy = !!res?.ok;
    urlVerifyCache.set(_cacheKey, inProxy);

    return inProxy
        ? newUrl
        : url;
}

async function serveResponseFromProxy(proxyUrl) {
    const res = await fetch(proxyUrl).catch(err => {
        debug(`Error trying to get content from proxy`, err);
        return undefined;
    });
    if (!res || !res.ok) return undefined;
    return {
        body: new Uint8Array(await res.arrayBuffer()),
        contentType: res.headers.get('content-type'),
        status: res.status
    };
}


module.exports = {
    configureLocalProxy,
    maybeProxyUrl,
    isLocalProxyEnabled,
    isProxiedUrl,
    toProxyUrl,
    fromProxyUrl,
    shouldProxyUrl,
    getLocalProxyUrl,
    serveResponseFromProxy
};
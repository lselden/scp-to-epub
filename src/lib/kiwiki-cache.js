// @ts-check
const config = require("./config");
const { debug } = require("./utils");
const {setTimeout} = require('node:timers/promises');

let localCacheUrl = undefined;
let localProxySettings = {};

function configureLocalProxy() {
    localCacheUrl = config.get('discovery.localArchiveProxy');
    localProxySettings = {
        staticPrefix: `/${config.get('static.prefix', '__epub__')}`,
        verify: true,
        https: true,
        timeoutMs: 1000 * 10,
        ...config.get('discovery.localArchiveProxyCfg', {})
    }
    if (localCacheUrl) {
        console.log(`Using local cache ${localCacheUrl}`);
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
    url = `${url || ''}`;
    return !!localCacheUrl && !!url &&
        (!url.startsWith('http://') || localProxySettings.https) &&
        !url.includes(localProxySettings.staticPrefix);
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
    return `${proxyUrl}`.replace(localCacheUrl, proxyUrl.replace(/:.+/, '://'))
}

function isProxiedUrl(url) {
    return !!localCacheUrl && `${url}`.includes(localCacheUrl);
}

async function maybeProxyUrl(url) {
    if (!shouldProxyUrl(url)) return url;

    
    let proxyUrl = toProxyUrl(url);
    if (!localProxySettings.verify) {
        return proxyUrl;
    }
    const inProxy = await checkProxyHasUrl(proxyUrl);

    debug(`KIWIKI ${inProxy ? 'PROXY' : 'BYPASS'} ${url}`);
    return inProxy ? proxyUrl : url;
}

async function checkProxyHasUrl(proxyUrl) {
    // NOTE this ignores query parameters...should be okay for proxy purposes I think?
    const [_cacheKey] = `${proxyUrl}`.split('?');
    let inProxy = urlVerifyCache.get(_cacheKey);
    if (inProxy != undefined) {
        return inProxy;
    }

    const res = await Promise.race([
        setTimeout(localProxySettings.timeoutMs, {ok: false, timeout: true}, { ref: false }),
        fetch(proxyUrl, { method: 'HEAD' })
            .catch(err => { debug(`ignoring error in testing proxy for url ${proxyUrl} ${err}`); return undefined })
    ]);
    inProxy = !!res?.ok;
    urlVerifyCache.set(_cacheKey, inProxy);
    return inProxy;
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
    checkProxyHasUrl,
    isLocalProxyEnabled,
    isProxiedUrl,
    toProxyUrl,
    fromProxyUrl,
    shouldProxyUrl,
    getLocalProxyUrl,
    serveResponseFromProxy
};
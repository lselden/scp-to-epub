// @ts-check
import config from "./config.js";
import { debug } from "./utils.js";
import {setTimeout} from 'node:timers/promises';

/** @type {string | undefined} */
let localCacheUrl = undefined;
let localMirrorSettings = {};

export function configureLocalMirror() {
    localCacheUrl = config.get('discovery.localArchiveMirror');
    localMirrorSettings = {
        staticPrefix: `/${config.get('static.prefix', '__epub__')}`,
        exclude: undefined,
        verify: true,
        https: true,
        timeoutMs: 1000 * 10,
        ...config.get('discovery.localArchiveMirrorCfg', {})
    }
    if (localCacheUrl) {
        console.log(`Using local cache ${localCacheUrl}`);
    }
}

const urlVerifyCache = new Map();

export function isLocalMirrorEnabled() {
    return !!localCacheUrl;
}

export function getLocalMirrorUrl() {
    return localCacheUrl;
}

export function shouldMirrorUrl(url = '') {
    url = `${url || ''}`;
    if (!localCacheUrl || !url) return false;

    const {https, staticPrefix, exclude} = localMirrorSettings;
    if (!url.startsWith('http://') && https) return false;
    if (url.includes(staticPrefix)) return false;
    if (exclude?.some(val => url.includes(val))) return false;
    return true;
}

/**
 * 
 * @param {string} url 
 * @returns 
 */
export function toMirrorUrl(url = '') {
    return `${localCacheUrl}${`${url}`.replace(/https?:\/\//, '')}`;
}

/**
 * 
 * @param {string} mirrorUrl 
 * @returns 
 */
export function fromMirrorUrl(mirrorUrl = '') {
    if (!localCacheUrl) return mirrorUrl;
    return `${mirrorUrl}`.replace(localCacheUrl, mirrorUrl.replace(/:.+/, '://'))
}

export function isProxiedUrl(url) {
    return !!localCacheUrl && `${url}`.includes(localCacheUrl);
}

export async function maybeMirrorUrl(url) {
    if (!shouldMirrorUrl(url)) return url;

    
    let mirrorUrl = toMirrorUrl(url);
    if (!localMirrorSettings.verify) {
        return mirrorUrl;
    }
    const inMirror = await checkMirrorHasUrl(mirrorUrl);

    debug(`KIWIKI ${inMirror ? 'MIRROR' : 'BYPASS'} ${url}`);
    return inMirror ? mirrorUrl : url;
}

export async function checkMirrorHasUrl(mirrorUrl) {
    // NOTE this ignores query parameters...should be okay for proxy purposes I think?
    const [_cacheKey] = `${mirrorUrl}`.split('?');
    let inMirror = urlVerifyCache.get(_cacheKey);
    if (inMirror != undefined) {
        return inMirror;
    }

    const res = await Promise.race([
        setTimeout(localMirrorSettings.timeoutMs, {ok: false, timeout: true}, { ref: false }),
        fetch(mirrorUrl, { method: 'HEAD' })
            .catch(err => { debug(`ignoring error in testing proxy for url ${mirrorUrl} ${err}`); return undefined })
    ]);
    inMirror = !!res?.ok;
    urlVerifyCache.set(_cacheKey, inMirror);
    return inMirror;
}

export async function serveResponseFromMirror(mirrorUrl) {
    const res = await fetch(mirrorUrl).catch(err => {
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

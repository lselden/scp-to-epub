const path = require('path');
const mime = require('mime');
const urlLib = require('url');
const config = require('./book-config');
const StaticServer = require('./lib/serve-file');
const Resource = require('./lib/resource');
const Chapter = require('./lib/chapter');
const Link = require('./lib/link');
const {safeFilename, filenameForUrl, debug} = require('./lib/utils');
const { configureLocalMirror, maybeMirrorUrl, shouldMirrorUrl, serveResponseFromMirror, toMirrorUrl, fromMirrorUrl, isProxiedUrl, checkMirrorHasUrl } = require('./lib/kiwiki-cache');
const { gotoPage } = require('./lib/browser-utils');

const {CacheEnum} = Resource;

/**
 * @import {Browser, Page, HTTPRequest as Request, HTTPResponse as Response} from 'puppeteer'
 * @import {BookMakerConfig} from '..'
 * @import BookMaker from './book-maker'
 */

class Scraper {
	/**
	 *
	 * @param {BookMaker} app
	 * @param {BookMakerConfig} opts
	 */
	constructor(app, opts = {}) {
		const {
			browser, cache, wikiLookup
		} = app;

        /** @type {BookMakerConfig} */
        this.options;

		this.totalRequests = 0;

		this.initialize(opts);

		this.server = new StaticServer(this.options.static);

		/** @type {import("puppeteer").Browser} */
		this.browser = browser;

		/** @type {import("./lib/resource-cache")} */
		this.cache = cache;

		/** @type {import("./info-database")} */
		this.wikiLookup = wikiLookup;

		this._frontPromise = Promise.resolve();
	}
	initialize(opts = {}) {
		this.options = config.util.extendDeep({
			browser: {
				headless: false,
				debug: false,
				timeout: 10 * 60 * 1000,
				ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Googlebot Chrome/76.0.3809.132 Safari/537.36'
			},
			static: {
				prefix: '__epub__',
				// root: path.join(__dirname, '../static'),
				cache: true
			},
			preProcess: {
				concurrency: 1,
				useWikiDotUrls: true,
				backlinks: false,
				tags: true,
				closeTabs: true
			},
			// basically just a placeholder to allow for more advanced overrides in the future?
			hooks: {
				// run on new tab opened
				newDocument() {},
				// run before page is formatted
				beforeFormat() {},
				// run after page is formatted
				afterFormat() {},
				request: req => {
					const requestUrl = req.url();
					this.totalRequests += 1;
					// these are removed just because they hijack DOM prototypes or significantly slow down page loading
					if (
						/(nitropay|onesignal|doubleclick).*\.js.*/.test(requestUrl) &&
						(typeof req.respond === 'function')
					) {
						/** @type {Request} */(req).respond({
							// body: 'console.log("noload");',
							body: 'window.nads={createAd(){}}',
							contentType: 'application/x-javascript',
							status: 200
						});
						return true;
					}
					// loading favicon is surprisingly slow
					if (/favicon.gif/.test(requestUrl) &&
					(typeof req.respond === 'function')) {
						/** @type {Request} */(req)
							.abort('blockedbyclient')
							.catch(err => {
								console.warn('Failed to abort request', err);
							});
						return true;
					}
				},
				response() {

				}
			}
		},
		this.options,
		{
			browser: config.get('browser'),
			preProcess: config.get('preProcess'),
			static: config.get('static'),
			hooks: config.get('hooks'),
            localArchiveMirror: config.get('discovery.localArchiveMirror')
		},
		opts);

		if (this.options.remoteImages === undefined) {
			this.options.remoteImages = config.get('output.images.remote', false);
		}
        this._removeFromPageName = [];
        if (URL.canParse(this.options.localArchiveMirror)) {
            let val = new URL(this.options.localArchiveMirror).pathname;
            if (!val.endsWith('/')) { val += '/'; }
            
            this._removeFromPageName = [
                val.slice(1).replace(/[\/\\() +&:]/g, '_'),
                this.options.defaultOrigin.replace(/https?:\/\//,'').replace(/\//g, '_')
            ];
        }
        configureLocalMirror();
        debug('initialize scraper with options', this.options);
	}
    /**
	 *
	 * @param {Request} request
	 */
	async interceptRequest(request) {
		let url = request.url();
		const urlObj = urlLib.parse(url);

		try {
			const isHandled = this.options.hooks.request(request);
			if (isHandled) {
				// QUESTION should this just return, and let hook do continue?
				// request.continue();
				return;
			}
		} catch (err) {
			console.warn('failure on request hook', err);
		}
		try {
			// HACK FIXME THIS IS BAD idea!!!! what if a content is dynamic? use a static file server or something instead? or maybe just let the browser use its own caching
			const cachedResponse = this.cache.getBookCache(path.posix.normalize(`./${urlObj.pathname}`));
			if (cachedResponse) {
				request.respond({
					body: cachedResponse.content,
					contentType: cachedResponse.mimeType,
					status: 200
				});
				return;
			}

			// get local content if exists
			const payload = await this.server.getFileForUrl(urlObj);
			if (payload) {
				request.respond(payload);
				return;
			}
		} catch (err) {
			console.warn('unable to intercept request', err);
		}

        let rewriteUrl = undefined;
        
        if (isProxiedUrl(url)) {
            // test to make sure it exists - if not allow for fallback
            const isCachedLocally = await checkMirrorHasUrl(url);

            if (!isCachedLocally) {
                 // un-mirror the url to try to get from origin
                rewriteUrl = fromMirrorUrl(url);
                url = rewriteUrl;
            }
            // otherwise just keep going
        } else if (shouldMirrorUrl(url)) {
            // check to see if mirror has content - if not keep going
            const payload = await serveResponseFromMirror(toMirrorUrl(url));
            if (payload) {
                request.respond(payload);
                return;
            }
        }

		if (this.options.preProcess.useWikiDotUrls && url.startsWith('http://www.scp-wiki.net') || url.startsWith('http://www.scpwiki.com')) {
            rewriteUrl = url
                .replace(/www.scp-wiki.net|www.scpwiki.com/, 'scp-wiki.wikidot.com');
        }

        request.continue({ ...rewriteUrl && {url: rewriteUrl}});
	}
	/**
	 * @param {Response} res
	 */
	async interceptResponse(res) {
		// ignore invalid
		if (!res.ok() && !res.fromCache()) {
			return;
		}

        const statusCode = res.status();

		try {
			// create as response
			const resource = Resource.fromResponse(res);

			try {
				// allow reading the response before it gets added
				this.options.hooks.response(resource, res);
			} catch (err) {
				console.warn('failure on response hook', err);
			}

			// already got it, don't care about result
			if (this.cache.get(resource)) {
				return;
			}

            const isRedirect = statusCode >= 300 && statusCode < 400;

			// only downloading images at this time
			if (
				(resource.isImage || resource.isDataUrl) &&
				// don't download if explicitly set to not cache images
				!this.options.remoteImages &&
                !isRedirect
			) {
				try {
					resource.content = await res.buffer();
				} catch (err) {
					// already gone, don't care about it
					if (/No resource with given identifier/.test(err.message)) {
						return;
					}
					console.warn(`Unable to read resource ${res.url()} - ${err}`)
				}
				// COMBAK this could take up A LOT of RAM...maybe store to disk or just wait?
			}
            debug(`RESOURCE cached ${resource.canononicalUrl}`.slice(0, 140));
			this.cache.set(resource);
		} catch (err) {
			console.error(`Unable to load response body for ${res.url()}`, err);
		}
	}
	cleanCacheForPage(url, options) {
		return this.cache.cleanCacheForPage(url, options);
	}
	async loadPage(url, depth = 0) {
        debug(`loading page ${url} - depth ${depth}`);
		const {closeTabs} = this.options.preProcess;
        const pageUrl = await maybeMirrorUrl(url);

		const {
			page,
			response,
			error
		} = await this.createPage(pageUrl);

		// throw error if 404 response
		if (error) {
			await page.close();
			return error;
		}

		// QUESTION does this need to happen?
		await this.bringToFront(page);

		const forwardLinks = new Map();
		await page.exposeFunction('registerLink', async payload => {
            const unProxiedUrl = fromMirrorUrl(payload.url);
			const existing = this.cache.get(unProxiedUrl);
			if (existing) {
				existing.addBacklinks(url);
				forwardLinks.set(Resource.asCanononical(payload.url), payload.title);
				return;
			}
			const mimeType = mime.getType(unProxiedUrl) || mime.getType('xhtml');

			// not a chapter, but content.
			// TODO COMBAK save these as resource? maybe....
			if (/image|video|audio|zip|7z/.test(mimeType)) {
				console.debug(`Ignoring non-html content ${payload.url}`);
				return;
			}

			const linkResource = new Link({
				url: unProxiedUrl,
				from: [url],
				depth: depth + 1,
				// TODO no need for redundancy
				id: filenameForUrl(payload.url),
				filename: filenameForUrl(payload.url, '.xhtml'),
				// hardcode as doc link
				mimeType,
				cache: CacheEnum.none
			});
			this.cache.set(linkResource);
			forwardLinks.set(Resource.asCanononical(payload.url), payload.title);
		});

		// get backlinks before formatting page
		const backlinks = this.options.preProcess.backlinks ? await this.getBacklinks(page) : [];
		const tags = this.options.preProcess.tags ? await this.getTags(page) : [];

		if (await this.shouldSkip(page, depth, tags)) {
			console.log(`Skipping page ${url} because meta (author/artwork etc)`);
			return;
		}

		// console.log('Formatting page');
		// run client-side javascript
		await this.formatPage(page);
		// replace remaining images with local paths
		// if remoteimages is set then will still make sure they're absolute urls
		await this.switchImagesToLocal(page);

		const stats = await this.getStats(page);
		const content = await this.serializePage(page);
		const chapter = new Chapter({
			title: this._formatTitle(stats),
			author: stats.author,
			stats,
			tags,
			id: safeFilename(stats.pageName),
			depth,
			url,
			cache: CacheEnum.local,
			content,
			links: forwardLinks,
			from: backlinks,
			filename: safeFilename(`${stats.pageName}`, 'xhtml'),
			mimeType: mime.getType('xhtml')
		});
		// chapter.addLinks(...forwardLinks.keys());
		// chapter.addBacklinks(backlinks);
		this.cache.set(chapter);

		// close window
		if (closeTabs && !this.options.browser.headless) {
			await page.close();
		}
		return chapter;
	}
	async createPage(url) {
		const page = await this.browser.newPage();
		page.setUserAgent(this.options.browser.ua);
		await page.setRequestInterception(true);
		page.on('request', request => this.interceptRequest(request));
		page.on('response', response => this.interceptResponse(response));
		if (this.options.browser.debug) {
			page.on('console', msg => {
				let type = `${msg.type()}`;
				if (type === 'warning') {
					type = 'warn';
				}
				const isForiegn = msg.location().url && !/__epub__/.test(msg.location().url);
				if (isForiegn && type !== 'error') {
					return;
				}
				let text = msg.text();
				// ignore these errors
				if (text.includes('ERR_BLOCKED_BY_CLIENT')) {
					return;
				}
                const traceLocation = msg.stackTrace()?.[0]?.url || '';
                // kiwiki unnecessary messages
                if (/wombat.js/.test(traceLocation)) return;

                if (text.includes('Manifest: Line: 1')) return;

                // ignore no overrides message
                if (text.includes("404 (Not Found)") && /epub.*overrides/.test(traceLocation)) {
                    return;
                }

                if (text.includes('404 (Not Found)') && /about%3Ablank|pixel|resize-iframe/.test(traceLocation)) {
                    return;
                }

                if (text.startsWith('Failed to load resource') && traceLocation) {
                    text += ' - ' + traceLocation;
                    type = 'warn';
                }


				let fn = console[type];
				if (type === 'timeEnd') {
					fn = console.debug;
				} else if (!fn) {
					console.debug(`invalid console msg type ${type}`);
					fn = console.log;
				}

				fn.call(console, text);
			});
		}

        // UNDOCUMENTED
        const shouldAcceptConfirmDialogs = config.get('shouldAcceptConfirmDialogs', false);
        page.on('dialog', (dialog) => {
            if (shouldAcceptConfirmDialogs) {
                console.log('javascript popup auto accepted', dialog.message());
                dialog.accept();
            } else {
                console.log('javascript popup dismissed', dialog.message());
                dialog.dismiss();
            }
        })

		if (this.options.hooks.newDocument) {
			try {
				await page.evaluateOnNewDocument(this.options.hooks.newDocument);
			} catch (err) {
				console.error('Failed to add newDocument hook', err);
			}
		}

        const out = {
			page
		};


        /** @type {Response} */
        let response; 
        try {
            out.response = response =   await gotoPage(page, url, {
                timeout: this.options.browser.timeout
            });
        } catch (error) {
            out.error = error;
        }

		if (response && !response.ok() && !response.fromCache()  && (response.status() || 500) >= 400 ) {
			out.error = new Error(`${response.status()} ${response.statusText()}`);
			Object.assign(out.error, {
				isError: true,
				url,
				code: response.status(),
				statusCode: response.status(),
				statusText: response.statusText()
			});
		}

		return out;
	}
	async bringToFront(page) {
		// HACK dirty semaphore
		this._frontPromise = Promise.resolve(this._frontPromise)
			.then(async () => {
				try {
					await page.bringToFront();
					// sleep a tiny amount, just for sanity's sake
					await new Promise(done => setTimeout(() => done(), 10));
				} catch (err) {
					console.warn('failed to bring to front', err);
				}
			});
		return this._frontPromise;
	}
    /**
     * 
     * @param {Page & {_pageBindings: any}} page 
     */
	async formatPage(page) {
		await page.exposeFunction('keepResource', async (absUrl) => {
            const resource = this.cache.get(absUrl);
            if (!resource) {
                return false;
            }

            if (this.options.remoteImages) {
                resource.setRemote();
                return;
            }

            resource.setLocal();

            // moved compression to here to make sure filetype conversion gets handled
            // REVIEW keeping compression here so possible to register arbitrary resources
            try {
                // COMBAK TODO allow for different options
                await resource.compress();
            } catch (err) {
                console.warn(`Failed to compress response - ${err}`);
            }

            return resource.bookPath;
        }).catch(err => {
            // ignore!
        });

        await page.exposeFunction('frameEvaluate', async (framePath, fnSource) => {
            try {
                const frame = page.frames().find(frame => (frame.url() || '').includes(framePath));
                if (!frame) {
                    throw new Error(`Frame ${framePath} not found`);
                }
                const result = await frame.evaluate(async fnSource => {
                    console.log('prerun');
                    const result = await eval(`(${fnSource})()`);
                    await new Promise(done => requestAnimationFrame(done));
                    console.log('postrun');
                    return result;
                }, fnSource);
                return result;
            } catch (err) {
                console.log('Error!', err);
                return undefined;
            }
        }).catch(err => {
            // console.log('expose function error', err);
        });

		await page.exposeFunction('inlineFrameContents', async (framePath, selector = 'body') => {
            const frame = page.frames().find(frame => (frame.url() || '').includes(framePath));
            if (!frame) {
                throw new Error(`Frame ${framePath} not found`);
            }
            const contents = await frame.evaluate(selector => {
                const el = document.querySelector(selector || 'body');
                if (!el) {
                    throw new Error(`Element not found ${selector}`);
                }
                return el.innerHTML;
            }, selector);

            await page.evaluate((framePath, contents) => {
                /** @type {HTMLElement} */
                let frame = [...document.getElementsByTagName('iframe')].find(el => {
                    return el.src && el.src.includes(framePath);
                });
                if (!frame) {
                    throw new Error(`Frame ${framePath} not found`);
                }
                // replace wrapper p
                if (frame.parentElement && frame.parentElement.matches('p')) {
                    frame = frame.parentElement;
                }
                frame.insertAdjacentHTML('beforebegin', contents);
                frame.remove();
            }, framePath, contents);
        }).catch(err => {
            // console.log('ignore expose error', err);
        });

        await page.evaluate((canonicalUrl) => {
            console.log(`Canonical URL: ${canonicalUrl}`);
            window.__epubCanonicalUrl = canonicalUrl;
        }, fromMirrorUrl(page.url()))

		// TODO this may timeout becaues the page is waiting for an animation frame
		// @ts-ignore
		const whenFormatted = page.waitForFunction(() => window.__epubFormattingComplete === true, {
			timeout: this.options.browser.timeout || 60 * 1000
		});

		if (this.options.hooks.beforeFormat) {
			try {
				await page.evaluate(this.options.hooks.beforeFormat);
			} catch (err) {
				console.error('beforeFormat hook failed', err);
			}
		}

		// actually run the processing
		await page.addScriptTag({
			url: await this.server.getUrlForFile('/client/epub-formatter.js', urlLib.parse(page.url())),
			type: 'module'
		});

		await whenFormatted;

		if (this.options.hooks.afterFormat) {
			try {
				await page.evaluate(this.options.hooks.afterFormat);
			} catch (err) {
				console.error('afterFormat hook failed', err);
			}
		}
	}
    _getAltUrls(imageUrl) {
        return (
            this.cache.get(imageUrl) ||
            this.cache.get(imageUrl.replace('https', 'http')) ||
            this.cache.get(imageUrl.replace('http', 'https')) ||
            this.cache.get(imageUrl.replace('www.scp-wiki.net', 'scp-wiki.wdfiles.com')) ||
            this.cache.get(imageUrl.replace('www.scpwiki.com', 'scp-wiki.wdfiles.com'))
        );
    }
    /**
     * 
     * @param {Page} page 
     */
	async switchImagesToLocal(page) {
		const imageUrls = await page.$$eval('img', images => {
			return images
				.map(/** @type {HTMLImageElement} */(el) => {
					// ignore invalid images
					if (!el.src) {
						return;
					}
					try {
						// @ts-ignore
						const urlObj = new URL(el.src, window.location.href);
						const absUrl = urlObj.toString();
						el.src = absUrl;
						return absUrl;
					} catch (err) {
						console.error('Error handling image', err);
					}
				})
				.filter(x => x);
		});

		for (let imageUrl of imageUrls) {
			try {
				let response = this._getAltUrls(imageUrl);
				if (!response) {
					// force image to download, response handler should catch it and put in cache
                    // would fetch be better?
					const loadResult = await page.evaluate(async src => {
						return new Promise((resolve, reject) => {
							const img = new Image();
							img.onload = () => {
								if (img.naturalWidth === 0) {
									resolve('ERR_INVALID');
								}
								resolve('OK');
							};
							img.onerror = evt => {
                                resolve('ERR_NETWORK');
                            }
							img.src = src;
						});
					}, imageUrl);

                    // this is not a good guarantee...maybe use Canvas to directly create new resource?
					response = this._getAltUrls(imageUrl);

                    switch (loadResult) {
                        case 'ERR_INVALID':
                            debug(`IMAGE - Invalid Response / no size ${imageUrl}`);
                            break;
                        case 'ERR_NETWORK':
                            debug(`IMAGE - Network Error ${imageUrl}`);
                            break;
                    }
                    
                    if (loadResult !== 'OK') {
                        // known not found
                        continue;
                    }

                    if (!response) {
						// throw new Error(`No asset found for ${url}`);
						console.warn(`No asset found for ${imageUrl}`);
						continue;
					}
				}
				//don't store locally if configured
				if (this.options.remoteImages) {
					// QUESTION: force = true?
					response.setRemote(true);
				} else {
					// setting to Maybe, because post-processing will confirm it should be saved
					response.cache = CacheEnum.maybe;
				}
			} catch (err) {
				console.warn(`Error marking image for caching ${imageUrl} ${err}`);
			}
		}
	}
	async getTags(page) {
		const tags = await page.$$eval('#page-content ~ .page-tags a', anchors => {
			return [...anchors]
				.map(el => `${el.textContent || ''}`.trim())
				.filter(x => x);
		});
		return tags;
	}
	async serializePage(page) {
		return page.evaluate(() => {
			const serializer = new XMLSerializer();
			return serializer.serializeToString(document);
		});
	}
	_formatTitle(stats = {}) {
		return [stats.title || stats.pageName, stats.altTitle]
			.filter(s => s)
			.join(' - ')
			.trim();
	}
    /**
     * 
     * @param {*} page 
     * @returns {Promise<import('./scpper-db').SCPStats>}
     */
	async getStats(page) {
		// COMBAK the checks for adding the site prefix havne't been tested and may not work. Especially changing the default site.
		let defaultSite = 'scp-wiki';
		// @ts-ignore
		const {defaultOrigin} = this.options;
		if (defaultOrigin && !/\/\/(www\.|)scp-wiki(\.net|\.wikidot\.com)$/.test(defaultOrigin)) {
			defaultSite = (urlLib.parse(defaultOrigin).hostname || '').replace(/www\.|\.com|\.wikidot|\.net|\.org/g, '');
		}
        /**
         * @type {import('./scpper-db').SCPStats}
         */
        const stats = {
            // pageName: undefined,
            title: '',
            author: '',
            date: '',
            rating: '',
            score: '',
            comments: '',
            //pageId: undefined,
            siteName: defaultSite,
            tags: '',
            licenseInfo: ''
        }
		const pageStats = await page.evaluate(defaultSite => {
            if (typeof getStoredStats === 'function') {
                // client/get-stats.js
                return {
                    siteName: defaultSite,
                    ...getStoredStats()
                };
            }
			// @ts-ignore
			const info = window.WIKIREQUEST && window.WIKIREQUEST.info;
			let pageName = info && info.pageUnixName;

			const id = info && info.pageId;
			const siteName = (info && info.siteUnixName) || defaultSite;
			return { id, siteName, ...pageName && {pageName} };
		}, defaultSite);

        stats.pageName = new URL(fromMirrorUrl(page.url())).pathname.slice(1).replace(/[\/\\() +&:]/g, '_');
        Object.assign(stats, pageStats);
        
        const {id} = stats;
        if (this._removeFromPageName?.length > 0) {
            stats.pageName = this._removeFromPageName.reduce((agg, str) => agg.replace(str, ''), stats.pageName);
        }
		// handle tags separately
		if (/^system:page-tags/.test(stats.pageName)) {
			const tag = page.url().split('/').slice(-1)[0];
			return {
				id: stats.id,
				title: `All pages tagged "${tag}"`,
				kind: 'System',
				date: new Date('2008-07-19'),
				site: defaultOrigin,
				siteName: defaultSite,
				pageName: `tagged_${tag}`
			};
		} else if (stats.pageName === 'forum:thread') {
			const forumFor = (new URL(page.url())).pathname.replace(/.*\//, '');
			return {
				id: stats.id,
				title: `${forumFor} / Discussion`,
				kind: 'System',
				date: new Date('2008-07-19'),
				site: defaultOrigin,
				siteName: defaultSite,
				pageName: `forum_${forumFor}`
			};
		}
        // overwrite with data from scpper if enabled
        Object.assign(stats, await this.wikiLookup.getStats(stats.pageName, stats.id));

		if (/^(fragment:|system:|forum:)/.test(stats.pageName)) {
			console.warn('Possibly invalid pagename', stats.pageName);
			stats.pageName = stats.pageName.replace(':', '_');
		}
		if (/\/offset\//.test(page.url())) {
			console.warn(`Offset page loaded (${stats.pageName}), this may overwrite parent`, {title: stats.title, pageName: stats.pageName});
		}
		if (stats.siteName !== defaultSite) {
			stats.pageName = `${stats.siteName.replace(/\./g, '_')}${stats.pageName}`;
		}
		return stats;
	}
	/**
	 * @param {Page} page
	 */
	async getBacklinks(page) {
		const backlinks = await page.evaluate(async () => {
			const timeout = 1000 * 15;
			try {
				const response = await new Promise((resolve, reject) => {
					const err = new Error('Timeout');
					err.name = 'TimeoutError';
					// @ts-ignore
					err.isTimeout = true;
					const timer = setTimeout(() => reject(err), timeout);
					// @ts-ignore
					WIKIDOT.page.callbacks.backlinksClick = res => {
						clearTimeout(timer);
						if (res.status !== 'ok') {
							reject(new Error(`Error response: ${res.status} ${res.body.slice(0, 1000)}`));
						}
						resolve(res.body);
					};
					// @ts-ignore
					WIKIDOT.page.listeners.backlinksClick();
				});
				const el = document.createElement('div');
				el.innerHTML = response;
				const backlinks = [...el.querySelectorAll('li a')]
					.map(el => el.getAttribute('href'))
					.filter(x => x && x.startsWith('/'));
				return backlinks;
			} catch (err) {
				if (err.isTimeout) {
					console.debug('No backlinks callback, likely because no session token');
				} else {
					console.warn(`Error in getting backlinks for ${document.location.href} ${err}`);
				}
				return [];
			}
		});
		return backlinks;
	}
	async shouldSkip(page, depth, tags) {
		const {
			skipMetaDepth = 1
		} = this.options.preProcess;

		if (!depth || depth < skipMetaDepth) {
			return false;
		}
		return this.wikiLookup.hasMetaTag(tags);
	}
	getResources() {
		return this.cache.getSaved();
	}
}

module.exports = Scraper;

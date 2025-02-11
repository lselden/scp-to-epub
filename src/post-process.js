const urlLib = require('url');
const path = require('path');
const pMap = require('p-map');
const config = require('./book-config');
const { filenameForUrl, debug } = require('./lib/utils');
const DocPart = require('./lib/doc-part');
const Resource = require('./lib/resource');
const { genChapterFooter, genChapterHeader } = require('./templates/chapter-parts');
const { getAssetPath } = require('./lib/path-utils');
const { isLocalMirrorEnabled, getLocalMirrorUrl } = require('./lib/kiwiki-cache');
const Chapter = require('./lib/chapter');

class PostProcessor {
	/**
	 *
	 * @param {import('./book-maker')} app
	 * @param {import('..').BookMakerConfig} options
	 */
	constructor(app, options = {}) {
		const {
			browser, cache, wikiLookup
		} = app;

		this.setOptions(options);

		/** @type {import("puppeteer").Browser} */
		this.browser = browser;

		/** @type {import("./lib/resource-cache")} */
		this.cache = cache;

		/** @type {import("./info-database")} */
		this.wikiLookup = wikiLookup;
	}
	setOptions(opts) {
		const bookOptions = config.util.extendDeep({},
			config.get('bookOptions'),
			config.get('postProcess'),
			opts
		);

		const remoteImages = config.get('output.images.remote', false);

		const {
			concurrency = 3,
			appendixDepthCutoff = 3,
			stylesheets = ['css/fonts.css', 'css/style.css', 'css/base.css']
		} = bookOptions;

		this.options = {
			remoteImages,
			customCSS: config.get('input.customCSS'),
			concurrency,
			stylesheets,
			appendixDepthCutoff,
			bookOptions
		};
	}
	async initialize() {
		this.page = await this.browser.newPage();
		// TODO handle fragment: urls
		this.page.exposeFunction('getBookPath', href => {
			const resource = this.cache.get(href);
			if (resource && resource.shouldWrite) {
				const hash = urlLib.parse(href).hash || '';
				return `${resource.bookPath}${hash}`;
			}
			return href;
		});
		this.page.exposeFunction('registerRemoteResource', async (resourceUrl, originalUrl, { typeHint = undefined, shouldCompress = undefined } = {}) => {
			let resource = this.cache.get(resourceUrl);
			// if no resource already then just mark as remote
			if (!resource) {
				resource = new Resource({
					url: resourceUrl
				});
				this.cache.set(resource);
			}

			if (!resource.mimeType && typeHint) {
				resource.mimeType = typeHint;
			} else if (!resource.mimeType) {
				// REVIEW - necessary to make sure content type is good?
				// await resource.tryDetectMimeType();
			}

			// check if should be stored locally
			if (resource.isImage && resource.content && !this.options.remoteImages) {
				// COMBAK QUESTION pass configurable options?
				try {
					await resource.compress({
						...(shouldCompress !== undefined) && { compress: shouldCompress }
					});
					resource.setLocal();
				} catch (err) {
					console.debug(`error compressing image for ${originalUrl} ${resourceUrl} - likely invalid ${err}`)
					// clear out content b/c not falid
					resource.content = undefined;
					resource.setInvalid();
				}
			}

			if (!resource.shouldWrite) {
				resource.setRemote();
			}

			try {
				resource.addBacklinks(originalUrl);
			} catch (err) {
				console.debug(`error adding resource backlinks for ${originalUrl} ${resourceUrl} - ${err}`);
			}

			const chapter = /** @type {import("./lib/chapter")} */(this.cache.get(originalUrl));
			if (!chapter) {
				console.warn(`Unable to find chapter resource for ${originalUrl} when registering ${resourceUrl}`);
			} else if (!resource.shouldWrite) {
				chapter.hasRemoteResources = true;
			}

			return resource.shouldWrite ? resource.bookPath : resource.url;
		});
		// QUESTION REVIEW should this just be for debug mode?
		this.page.on('console', msg => {
			console.log('POST PROCESS CONSOLE', msg.type(), msg.text());
		})
		await this.page.addScriptTag({
			path: await getAssetPath('client/post-process.js')
		});
	}
	async processBook(chapters) {
		if (!this.page) {
			await this.initialize();
		}
		const { concurrency } = this.options;
		const allChapters = [...chapters];
		for (let chapter of chapters) {
			// NOTE this doesn't do recursion for multiple depths, but I dont' see why we'd want to do that
			if (chapter instanceof DocPart) {
				allChapters.push(...chapter.chapters);
			}
		}
		await pMap(allChapters, chapter => this.updateChapter(chapter), { concurrency });

	}
	/**
	 * @param {import("./lib/chapter")} chapter
	 */
	async updateChapter(chapter) {
		const page = this.page;

		try {
			const extras = await this.genWrappers(chapter);

			const config = {
				originalUrl: chapter.url,
				haltOnError: false,
				depth: chapter.depth || 0,
				isSupplemental: chapter.depth >= this.options.appendixDepthCutoff,
				pageName: chapter.stats.pageName
			};

			let { content, error } = await page.evaluate((content, extras, config) => {
				// @ts-ignore
				return window.processChapter(content, extras, config);
			}, chapter.content, extras, config);

			if (error) {
				chapter.error = error;
				console.warn(`Failed to parse ${chapter.url} completely - parse error. ${error}`);
			}

			if (isLocalMirrorEnabled()) {
				debug(`removing local mirror address from any links in ${chapter.url}`);
				const localMirror = getLocalMirrorUrl();
				content = content.replaceAll(localMirror.replace(/https?:\/\//, ''), '');

			}

			// not valid doctype
			if (!/^<!DOCTYPE html>/.test(content)) {
				content = `<!DOCTYPE html>${content.replace(/^<!DOCTYPE[^>]*>/i, '')}`;
			}

			chapter.content = content;
		} catch (err) {
			console.warn(`error on updating chapter ${err}`, err);
			// QUESTION should we keep this as string to be consistent?
			chapter.error = err;
		}
	}
	async genWrappers(chapter) {
		// don't need to add extras to docpart
		if (chapter instanceof DocPart) {
			return;
		}

		const bookOptions = {
			...config.get('bookOptions'),
			...this.options.bookOptions
		};

		// make sure hubs are loaded
		await this.wikiLookup.loadHubsList();

		const url = chapter.url;
		const audioAdaptations = await this.wikiLookup.getAdaptations(url);

		const bookLinks = [];
		const externalLinks = [];
		chapter.from.forEach(link => {
			const resource = this.cache.get(link);
			if (resource && resource.shouldWrite) {
				bookLinks.push({
					// @ts-ignore
					title: resource.title || resource.id,
					url: resource.bookPath
				});
				return;
			}

			// ignore hub references
			if (this.wikiLookup.isHub(link)) {
				return;
			}
			externalLinks.push({
				title: filenameForUrl(link),
				url: (new URL(link, chapter.url)).toString()
			});
		});

		let stylesheets = this.options.stylesheets
			.map(src => `<link rel="stylesheet" href="${src}" />`)
			.join('');

		if (this.options.customCSS) {
			// REVIEW does this need escaping? shouldn't....
			stylesheets += `<style>${this.options.customCSS}</style>`;
		}

		return {
			header: genChapterHeader(chapter, audioAdaptations, bookOptions),
			stylesheets,
			footer: genChapterFooter(chapter, bookLinks, externalLinks, bookOptions)
		};
	}
	// async switchImagesToLocal(page = this.page) {
	// 	const {defaultOrigin} = this.options;

	// 	// @ts-ignore
	// 	if (!page._pageBindings || !page._pageBindings.has('keepThisImage')) {
	// 		await page.exposeFunction('keepThisImage', async url => {
	// 			let response = this.cache.get(url);
	// 			if (!response) {
	// 				// force image to download, response handler should catch it and put in cache
	// 				await page.evaluateHandle(async src => {
	// 					return new Promise((resolve, reject) => {
	// 						const img = new Image();
	// 						img.onload = () => {
	// 							if (img.naturalWidth === 0) {
	// 								return reject(new Error('Image unreadable'));
	// 							}
	// 							resolve();
	// 						};
	// 						img.onerror = reject;
	// 						img.src = src;
	// 					});
	// 				}, url);

	// 				// this is not a good guarantee...maybe use Canvas to directly create new resource?
	// 				response = (
	// 					this.cache.get(url) ||
	// 					this.cache.get(url.replace('www.scpwiki.com', 'scp-wiki.wdfiles.com'))
	// 				);

	// 				if (!response) {
	// 					// throw new Error(`No asset found for ${url}`);
	// 					console.warn(`No asset found for ${url}`);
	// 					return url;
	// 				}
	// 			}
	// 			//don't store locally if configured
	// 			if (this.options.remoteImages) {
	// 				response.setRemote();
	// 				// url is already absolute
	// 				return url;
	// 			}

	// 			response.setLocal();

	// 			// moved compression to here to make sure filetype conversion gets handled
	// 			try {
	// 				// COMBAK TODO allow for different options
	// 				await response.compress();
	// 			} catch (err) {
	// 				console.warn(`Failed to compress response - ${err}`);
	// 			}

	// 			return response.bookPath;
	// 		});
	// 	}

	// 	await page.$$eval('img', async images => {
	// 		const out = [];
	// 		await Promise.all(images.map(async el => {
	// 			// ignore invalid images
	// 			// @ts-ignore
	// 			if (!el.src) {
	// 				return;
	// 			}
	// 			try {
	// 				// @ts-ignore
	// 				const urlObj = new URL(el.src, window.location.href);
	// 				const absUrl = urlObj.toString();
	// 				// tell puppeteer to keep
	// 				// @ts-ignore
	// 				const newSrc = await window.keepThisImage(absUrl);
	// 				// NOTE may cause 404, hope that's okay!
	// 				// @ts-ignore
	// 				el.src = newSrc;
	// 			} catch (err) {
	// 				console.error('Error handling image', err);
	// 			}
	// 		}));
	// 	});
	// }
}

module.exports = PostProcessor;

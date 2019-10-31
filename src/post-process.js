const urlLib = require('url');
const path = require('path');
const pMap = require('p-map');
const {filenameForUrl} = require('./lib/utils');
const DocPart = require('./lib/doc-part');
const Resource = require('./lib/resource');
const {genChapterFooter, genChapterHeader} = require('./templates/chapter-parts');

class PostProcessor {
	constructor(app, options = {}) {
		const {
			browser, cache, wikiLookup
		} = app;

		const {
			concurrency = 3,
			appendixDepthCutoff = 3,
			stylesheets = ['css/fonts.css', 'css/style.css', 'css/base.css']
		} = {
			...options,
			...(app.options.postProcess || {}),
			...(options.postProcess || {})
		};

		this.options = {
			concurrency,
			stylesheets,
			appendixDepthCutoff
		};

		/** @type {import("puppeteer").Browser} */
		this.browser = browser;

		/** @type {import("./lib/resource-cache")} */
		this.cache = cache;

		/** @type {import("./info-database")} */
		this.wikiLookup = wikiLookup;
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
		this.page.exposeFunction('registerRemoteResource', (resourceUrl, originalUrl) => {
			const chapter = this.cache.get(originalUrl);
			if (!chapter) {
				console.warn(`Unable to find chapter resource for ${originalUrl} when registering ${resourceUrl}`);
			} else {
				/** @type {import("./lib/chapter")} */(chapter).hasRemoteResources = true;
			}
			let resource = this.cache.get(resourceUrl);
			if (!resource) {
				resource = new Resource({
					url: resourceUrl,
					save: false,
					remote: true
				});
				this.cache.set(resource);
			}
			resource.addBacklinks(originalUrl);
		});
		// QUESTION REVIEW should this just be for debug mode?
		this.page.on('console', msg => {
			console.log('POST PROCESS CONSOLE', msg.type(), msg.text());
		})
		await this.page.addScriptTag({
			path: path.join(__dirname, '../client/post-process.js')
		})
	}
	async processBook(chapters) {
		if (!this.page) {
			await this.initialize();
		}
		const {concurrency} = this.options;
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

		const extras = await this.genWrappers(chapter);

		const config = {
			originalUrl: chapter.url,
			haltOnError: false,
			depth: chapter.depth || 0,
			isSupplemental: chapter.depth >= this.options.appendixDepthCutoff,
			pageName: chapter.stats.pageName
		};

		try {
			let {content, error} = await page.evaluate((content, extras, config) => {
				// @ts-ignore
				return window.processChapter(content, extras, config);
			}, chapter.content, extras, config);

			if (error) {
				chapter.error = error;
				console.warn(`Failed to parse ${chapter.url} completely - parse error. ${error}`);
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

		const stylesheets = this.options.stylesheets
			.map(src => `<link rel="stylesheet" href="${src}" />`)
			.join('');

		return {
			header: genChapterHeader(chapter, audioAdaptations),
			stylesheets,
			footer: genChapterFooter(bookLinks, externalLinks)
		};
	}
}

module.exports = PostProcessor;

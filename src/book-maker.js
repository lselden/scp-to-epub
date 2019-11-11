/// <reference types=".." />

const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');
const urlLib = require('url');
const pMap = require('p-map');
const Book = require('./lib/book');
// for loading page and converting to chapter etc.
const Scraper = require('./scraper');
// for updating content after everything is loaded
const PostProcessor = require('./post-process');
const ResourceCache = require('./lib/resource-cache');
const WikiDataLookup = require('./info-database');
const Resource = require('./lib/resource');
const Chapter = require('./lib/chapter');
const DocPart = require('./lib/doc-part');
const {loadBookConfig, loadBookRemote, extractDocParts} = require('./parse-book-config');
const makeCover = require('./make-cover');

/** @typedef {import("puppeteer").Browser} Browser */
/** @typedef {import("puppeteer").Page} Page */
/** @typedef {import("puppeteer").Request} Request */
/** @typedef {import("puppeteer").Response} Response */

class BookMaker {
	/**
	 *
	 * @param {import('..').Book | import('..').BookOptions} book
	 * @param {import('..').BookMakerConfig} opts
	 */
	constructor(book, opts = {}) {
		/** @type {Browser} */
		this.browser = (opts.browser && typeof opts.browser === 'object') ? opts.browser : undefined ;

		const {
			static: staticOpts = {},
			hooks: hookOpts = {},
			cover: coverOpts = {},
			bookOptions = {},
			...inOpts
		} = opts;

		/** @type {import('..').BookMakerConfig} */
		this.options = {
			bookOptions: {
				...bookOptions,
				...(
					(book instanceof Book || typeof book !== 'object') ?
					{} :
					book
				)
			},
			defaultOrigin: 'http://www.scp-wiki.net',
			/* probably need a smaller limit by default...*/
			maxChapters: 500,
			maxDepth: 1,
			include: [],
			exclude: [],
			preProcess: {
				concurrency: 1,
				closeTabs: inOpts.debug,
				skipMetaDepth: 1
			},
			postProcess: {
				concurrency: 3
			},
			// not currently used?
			useWikiDotUrls: true,
			// whether to make supplemental (appendix) content "non-linear"
			hideSupplemental: true,
			headless: true,
			debug: false,
			// width: 640,
			// height: 960,
			width: 768,
			height: 1024,
			// QUESTION why is this here?
			folder: 'EPUB',
			timeout: 10 * 60 * 1000,
			...inOpts,
			hooks: {
				newDocument() {},
				beforeFormat() {},
				afterFormat() {},
				...hookOpts
			},
			cover: {
				path: '',
				width: 1600,
				height: 2560,
				templateHtml: path.join(__dirname, '../client/cover.html'),
				...coverOpts
			},
			static: {
				prefix: '__epub__',
				root: path.join(__dirname, '..'),
				cache: true,
				...staticOpts
			},
			ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36'
		};

		// TODO FIXME this isn't getting used when loading a book or main list of links it seems.
		this.options.exclude = this.options.exclude
			.filter(x => x)
			.map(link => Resource.asCanononical(link, this.options.defaultOrigin));

		this.wikiLookup = new WikiDataLookup(this, this.options);
		this.cache = new ResourceCache();
		this.scraper = new Scraper(this, opts);
		this.postProcessor = new PostProcessor(this, opts);

		if (book instanceof Book) {
			this.book = book;
		} else if (typeof book === 'string') {
			this.options.bookOptions = {
				shouldLoad: false,
				...(typeof this.options.bookOptions === 'object' ? this.options.bookOptions : {}),
				url: book
			};
		} else if (book && (typeof book === 'object')) {
			this.options.bookOptions = {
				shouldLoad: false,
				...(typeof this.options.bookOptions === 'object' ? this.options.bookOptions : {}),
				...book
			};
		} else {
			throw new TypeError(`Invalid book argument ${book}`);
		}

	}
	async initialize() {
		const {width, height, debug, headless} = this.options;
		if (!this.browser) {
			this.browser = await puppeteer.launch({
				defaultViewport: {
					width,
					height
				},
				headless,
				devtools: !headless && debug
			});
		}
		// TODO fix this
		this.scraper.browser = this.browser;
		this.wikiLookup.browser = this.browser;
		this.postProcessor.browser = this.browser;

		// TODO REVIEW
		if (this.options.bookOptions && this.options.bookOptions.shouldLoad) {
			await this.loadBook(this.options.bookOptions);
		}
		// await this.wikiLookup.initialize();
		// await this.getToken();
	}

	async loadBook(bookOptions = this.options.bookOptions) {
		if (typeof bookOptions === 'string') {
			bookOptions = {
				...(this.options.bookOptions || {}),
				url: bookOptions
			};
		}
		const {
			url: bookUrl,
			path: bookPath,
			wikidot: shouldFormat = true
		} = bookOptions;

		let bookSettings;
		if (bookPath || !/http[s]?:\/\//.test(bookUrl)) {
			bookSettings = await loadBookConfig(bookPath || bookUrl);
		} else {
			const {page, error} = await this.scraper.createPage(bookUrl);
			if (error) {
				throw error;
			}
			// FIXME HACK! use some kind of option to determine if page should get formatted
			if (shouldFormat) {
				await this.scraper.formatPage(page);
			}
			bookSettings = await loadBookRemote(page);
			// force clear cache, don't need anything that was loaded
			await this.cache.cleanCacheForPage(bookUrl, { forceClearSaved: true });
		}

		if (!bookSettings.appendixDepthCutoff) {
			bookSettings.appendixDepthCutoff = (bookSettings.maxDepth || this.options.maxDepth);
		}

		this.book = new Book(bookSettings);
		[
			'maxChapters',
			'maxDepth',
			'include',
			'exclude',
			'appendixDepthCutoff'
		].forEach(key => {
			if (key in bookSettings) {
				this.options[key] = bookSettings[key];
			}
		});

		const parts = await extractDocParts(bookSettings.tocHTML, this);
		bookSettings.docParts = parts;

		// QUESTION should this return the book itself instead?
		return bookSettings;
	}
	async processBook(bookSettings = {}) {
		let {
			docParts = [],
			include = [],
			maxDepth = 2,
			maxChapters = 100,
			cover: coverOpts = {}
		} = {
			...this.options,
			...bookSettings
		};

		await this.makeCover(coverOpts);

		if (!Array.isArray(docParts)) {
			docParts = [docParts];
		}
		if (!Array.isArray(include)) {
			include = [include];
		}

		let remainingChapters = maxChapters;

		// REVIEW should we map in try catch?
		for (let part of docParts) {
			console.log(`Loading section ${part.index} ${part.title}`)
			await this.loadDocPart(part);
			// load docpart has side effect of adding chapters to part
			remainingChapters -= part.chapters.length;
		}

		if (remainingChapters - include.length < 0) {
			const delta = remainingChapters - include.length;
			console.warn(`NOT INCLUDING ALL CHAPTERS, exceeded max limit of ${maxChapters} by ${delta}`);
			include = include.slice(0, remainingChapters);
		}
		await this.include(include);

		for (let depth = 1; depth <= maxDepth; depth++) {
			console.log(`SUPPLEMENTAL ${depth}/${maxDepth} - remaining ${remainingChapters}/${maxChapters}`);
			await this.includePending(depth);
			// have to switch how this is updated
			remainingChapters = maxChapters - this.book.getChapterCount();
		}
		console.log('Processed!');
	}
	/**
	 * @deprecated this was to support using wikidot api to get backlinks, but it's wonky
	 */
	// async getToken(subdomain = 'scp-wiki') {
	// 	const context = await this.browser.createIncognitoBrowserContext();
	// 	const page = await context.newPage();
	// 	page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36');
	// 	page.setCacheEnabled(false);
	// 	const response = await page.goto(`http://${subdomain}.wikidot.com`);
	// 	const headers = response.headers();
	// 	console.log(headers['set-cookie']);
	// }
	async include(targets) {
		if (!Array.isArray(targets)) {
			targets = [targets];
		}
		console.log('Loading first batch of chapters');
		const chapters = await this.loadChapters(targets);
		this.book.chapters.push(...chapters);
		console.log('Finished including');
	}
	getPendingSupplemental(opts = {}) {
		const {
			maxDepth = 1,
			exclude = []
		} = opts;
		return this.cache.getLinks()
			.filter(link => {
				// filter out what shouldn't be incuded
				if (exclude.includes(link.canononicalUrl)) {
					return false;
				}
				if (this.wikiLookup.isSystem(link)) {
					return false;
				}
				if(link.depth > maxDepth) {
					return false;
				}

				if (
					link.depth > 0 &&
					this.wikiLookup.isMeta(link)
				) {
					return false;
				}

				return true;
			});
	}
	/**
	 *
	 * @param {number} depth
	 * @param {{maxChapters?: number, limit?: number, maxDepth?: number, exclude?: string[]}} opts
	 */
	async includePending(depth = 1, opts = {}) {
		const {
			maxChapters,
			limit,
			maxDepth,
			exclude
		} = {
			...this.options,
			...opts
		};

		// get how many already in there.
		// NOTE need to make sure chapters is actually valid - it should be
		const maxPending = limit !== undefined ? limit : (maxChapters - this.book.getChapterCount());

		if (maxPending < 0) {
			console.warn(`Exceeded limit of ${limit || maxChapters} by ${-1 * maxPending}`);
		}
		if (maxPending <= 0) {
			return;
		}

		// make sure this is already active
		await this.wikiLookup.loadMetaPages();

		let pending = this.getPendingSupplemental({maxDepth, exclude});
		// if too many then sort by most referenced
		if (pending.length > maxPending) {
			const toKeep = [...pending]
				.sort((a, b) => {
					// make meta articles less important
					const aMeta = this.wikiLookup.isMeta(a) ? maxDepth : 1;
					const bMeta = this.wikiLookup.isMeta(b) ? maxDepth : 1;
					const aDepth = (maxDepth - a.depth) / (maxDepth + 1);
					const bDepth = (maxDepth - b.depth) / (maxDepth + 1);
					return (aMeta * a.from.length) * aDepth - (bMeta * b.from.length) * bDepth;
				})
				.slice(0, maxPending);
			pending = pending.filter(x => toKeep.includes(x));
		}
		// QUESTION should it still be sorted with meta/first last regardless of length?
		console.log(`Loading ${pending.length} additional chapters`);
		const chapters = await this.loadChapters(pending, depth);
		this.book.chapters.push(...chapters);
	}
	async finalize() {
		// apply settings over to book if not already there
		for (let [key, val] of Object.entries(this.options.bookOptions || {})) {
			if (!(key in this.book.options)) {
				this.book.options[key] = val;
			}
		}

		console.log('post processing');
		await this.postProcessor.processBook(this.book.chapters);
		this.book.resources = this.getResources();
		// HACK make sure no duplicate chapters
		const masterList = new Map();
		let foundDuplicate = false;
		function recurse(chapter) {
			const existing = masterList.get(chapter.bookPath);
			if (existing) {
				foundDuplicate = true;
				console.warn(`Duplicate Chapters found for ${chapter.bookPath}. URL: ${existing.url} / ${chapter.url}, SIZE: ${(existing.content || '').length} and ${(chapter.content || '').length}`);
			}
			masterList.set(chapter.bookPath, chapter);
			// don't recurse, this is just top level check?..is this even necessary?
			// if (chapter instanceof DocPart) {
			// 	chapter.chapters.forEach(child => recurse(child));
			// }
		}
		this.book.chapters.forEach(recurse);
		if (foundDuplicate) {
			this.book.chapters = [...masterList.values()];
		}
		console.log('Book finished');
	}
	async write(destination, tmpDir) {
		// HACK review where this should be set and handled. probably not here
		if (
			this.options.keepTempFiles &&
			(this.book.options.keepTempFiles === undefined)
		) {
			this.book.options.keepTempFiles = true;
		}
		await this.book.writeToDisk(tmpDir);
		await this.book.zip(tmpDir, destination);
	}
	/**
	 *
	 * @param {DocPart} docPart
	 * @returns {Promise<DocPart>}
	 */
	async loadDocPart(docPart) {
		// add to cache
		this.cache.set(docPart);
		this.book.chapters.push(docPart);
		// get chapters to load
		const targets = docPart.links;

		// add to docPart because why not
		const chapters = await this.loadChapters(targets);
		docPart.chapters = chapters;
		return docPart;
	}
	async loadChapters(targets, depth = 0) {
		const {concurrency} = this.options.preProcess;
		let chapters = await pMap(targets, async (url, index) => {
			let chapterDepth = depth;
			if (url instanceof Resource) {
				chapterDepth = url.depth;
				url = url.url;
			}
			if (url instanceof URL) {
				url = url.toString();
			}

			const existing = this.cache.get(url);
			if (existing instanceof Chapter) {
				if (!existing.content) {
					console.warn(`Somehow an empty chapter got in there ${url}`);
				}
				console.warn(`Attempt to load duplicate chapter ${url} ${existing.url}`);
				if (this.book.chapters.includes(existing)) {
					console.warn('and it\'s already in book chapters!');
				}
			}

			// HACK COMBAK just a quick check to make sure we don't include any common non-wiki pages
			const isExternal = /youtube\.com|patreon\.com/.test(url);
			if (isExternal) {
				console.log(`Ignoring non-wiki link ${url}`);
				return;
			}

			console.log(`LOADING ${url} (${index + 1}/${targets.length})`);
			// just a list of pages tagged
			// if (/system:page-tags/.test(url)) {

			// }
			try {
				// TODO add check for 404 on page
				const chapter = await this.scraper.loadPage(url, chapterDepth);
				if (chapter && !(chapter instanceof Chapter) && chapter.isError) {
					console.warn(`${chapter.statusCode} ${(chapter.statusText || 'ERROR').toUpperCase()} ${url}`);
					return;
				}
				// reduce memory usage
				this.cache.cleanCacheForPage(url, { onlyWithContent: true });
				return chapter;
			} catch (err) {
				console.warn(`failed loading ${url}`, err);
			}
		}, { concurrency });

		chapters = chapters.filter(x => x);
		return chapters;
	}
	async makeCover(options = {}) {
		const opts = {
			...this.options.cover,
			title: this.book.title,
			author: [].concat(this.book.author || 'SCP Foundation').join(' & '),
			...options
		};
		const resource = await makeCover(this.browser, opts);
		this.cache.set(resource);
	}
	async destroy() {
		await this.browser.close();
	}
	getResources() {
		return this.cache.getSaved();
	}
}

module.exports = BookMaker;

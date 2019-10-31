const Resource = require('./resource');

class Chapter extends Resource {
	constructor(opts = {}) {
		const {
			title = '',
			author = '',
			links,
			backlinks,
			tags = [],
			stats = {},
			...resourceOpts
		} = opts;

		super(resourceOpts);

		/** @type {string} */
		this.title;

		/** @type {string[]} */
		this._author;

		/** @type {string[]} */
		this.links = [];

		/** @type {import("../scpper-db").SCPStats} */
		// @ts-ignore
		this.stats = {};

		/** @type {string[]} */
		this.tags = [];

		/** @type {boolean} */
		this.hasRemoteResources = !!opts.hasRemoteResources;

		Object.assign(this, {title, author, stats, tags});
		if (links) {
			this.addLinks(links);
		}
		if (backlinks) {
			this.addBacklinks(backlinks);
		}

		/**
		 * @type {boolean}
		 * @deprecated use depth instead?
		 */
		// this.isSupplemental = false;

		/** @type {string} */
		this.error;

	}
	get author() {
		return this._author || '';
	}
	set author(val) {
		if (!val) {
			this._author = [''];
			return;
		}

		if (Array.isArray(val)) {
			this._author = val;
		} else if (typeof val === 'string') {
			this._author = [val];
		} else {
			throw new TypeError(`Invalid author value ${val}`);
		}
	}
	// always something worth saving if a chapter
	get isPlaceholder() {
		return false;
	}
	get isSystemPage() {
		if (this.stats && this.stats.kind) {
			return this.stats.kind === 'System' || this.stats.kind === 'Service';
		}
		return /system:page-tags/.test(this.url);
	}
	// supplemental chapters come from page-tags pages or other pages
	// COMBAK not ideal implementation
	get isSupplemental() {
		return this.from.length > 0 && this.from.every(u => /system:page-tags/.test(u));
	}
	addLinks(...urls) {
		if (Array.isArray(urls[0]) && urls.length === 1) {
			urls = urls[0];
		}
		// inefficient but who cares
		this.links.push(...urls
			.filter(url => url)
			.map(url => Resource.asCanononical(url))
			.filter(url => !this.links.includes(url))
		);
	}
	get properties() {
		return this.hasRemoteResources ? ['remote-resources'] : [];
	}
}

module.exports = Chapter;

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

		/** @type {import("../scpper-db").SCPStats} */
		// @ts-ignore
		this.stats = {};

		/** @type {string[]} */
		this.tags = [];

		/** @type {boolean} */
		this.hasRemoteResources = !!opts.hasRemoteResources;

		Object.assign(this, {title, author, stats, tags});

		/**
		 * @type {Map<string, {title: string, titleHTML?: string}>}
		 */
		this.forwardLinks = links instanceof Map ? links : new Map();

		if (Array.isArray(links)) {
			links.forEach(link => this.addLink(link));
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
	get links() {
		return [...this.forwardLinks.keys()];
	}
	addLink(item) {
		if (!item) {
			return;
		}
		let key;
		let value;

		if (Array.isArray(item)) {
			[key, value] = item;
		} else if (typeof item === 'string') {
			key = item;
			value = {
				title: item.replace(/.*\//, '')
			};
		} else if (typeof item === 'object') {
			const {
				url,
				...data
			} = item;
			key = url;
			value = data;
		} else {
			// this should never happen
			console.debug('Invalid forward link', item);
			return;
		}
		const canononical = Resource.asCanononical(key);
		this.forwardLinks.set(canononical, value);
	}
	get properties() {
		return this.hasRemoteResources ? ['remote-resources'] : [];
	}
}

module.exports = Chapter;

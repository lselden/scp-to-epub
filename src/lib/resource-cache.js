const Resource = require('./resource');
const Link = require('./link');
const Chapter = require('./chapter');

/**
 * @typedef {import("./resource")} Resource
 */

class ResourceCache {
	constructor() {
		/** @type {Map<string, Resource>} */
		this.cache = new Map();
		/** @type {Map<string, Resource>} */
		this.bookFiles = new Map();
	}
	/**
	 *
	 * @param {string | Resource} resource
	 * @returns {Resource}
	 */
	get(resource) {
		if ((typeof resource === 'string') || resource instanceof URL) {
			return this.cache.get(Resource.asCanononical(resource));
		}
		if (typeof resource !== 'object') {
			console.warn('Invalid input type for get cache', resource);
			return;
		}
		const keys = [resource.url, ...(resource.aliases || [])]
			.filter(x => x)
			.map(u => Resource.asCanononical(u));
		if (resource.canononicalUrl) {
			keys.unshift(resource.canononicalUrl);
		}
		for (let key of keys) {
			const val = this.cache.get(key);
			if (val) {
				return val;
			}
		}
	}
	set(resource) {
		const existing = this.cache.get(resource.canononicalUrl) || this.getBookCache(resource.bookPath);
		if (existing) {
			resource = existing.isPlaceholder ? resource.merge(existing) : existing.merge(resource);
		}
		// TODO handle clashes in book paths for different urls because of multiple domains
		this.cache.set(resource.canononicalUrl, resource);
		if (resource.aliases && resource.aliases.length > 0) {
			resource.aliases.forEach(url => this.cache.set(url, resource));
		}
		this.bookFiles.set(resource.bookPath, resource);
	}
	getBookCache(bookPath) {
		return this.bookFiles.get(bookPath);
	}
	/**
	 *
	 * @param {string | URL} url
	 * @param {{ forceClearSaved?: boolean, onlyWithContent?: boolean}} options
	 */
	cleanCacheForPage(url, options = {}) {
		const {
			forceClearSaved = false,
			onlyWithContent = true
		} = options;

		const canononicalUrl = Resource.asCanononical(url);
		const toRemove = [...this.cache.values()]
			.filter(r => {
				if (!r.isDisposable && !forceClearSaved) {
					return false;
				}
				if (onlyWithContent && !r.content) {
					return false;
				}
				if (!r.from.includes(canononicalUrl)) {
					return false;
				}

				return true;
			});
		toRemove.forEach(resource => {
			this.cache.delete(resource.canononicalUrl);
			resource.aliases.forEach(a => this.cache.delete(a));
			this.bookFiles.delete(resource.bookPath);
		});
	}
	getSaved() {
		return [...this.bookFiles.values()].filter(x => x.shouldIncludeInManifest);
	}
	getLinks() {
		return [...this.cache.values()].filter(r => r instanceof Link);
	}
	getChapters() {
		return [...this.cache.values()].filter(r => r instanceof Chapter);
	}
}

module.exports = ResourceCache;

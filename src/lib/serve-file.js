const path = require('path');
const fs = require('fs').promises;
const urlLib = require('url');
const mime = require('mime');

const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/

class StaticServer {
	constructor(options = {}) {
		const {
			prefix = '__epub__',
			root = path.join(__dirname, '../..'),
			cache = false,
			enabled = true
		} = options;

		this.enabled = !!enabled;
		this.prefix = prefix;
		this.root = root;
		this.shouldCache = !!cache;
		this.cache = {};
	}
	/**
	 *
	 * @param {string} filepath
	 * @param {string | URL | import("url").UrlObject} baseUrl
	 */
	async getUrlForFile(filepath, baseUrl = '') {
		filepath = path.posix.normalize(`./${filepath}`);

		if (typeof baseUrl === 'object') {
			// @ts-ignore
			baseUrl = `${baseUrl.protocol}${baseUrl.origin || `//${baseUrl.host}`}`;
		}
		if (baseUrl.endsWith('/')) {
			baseUrl = baseUrl.slice(0, -1);
		}
		return `${baseUrl}/${this.prefix}/${filepath}`;
	}
	async getFileForUrl(url) {
		if (!this.enabled) {
			return;
		}

		if (typeof url === 'string') {
			url = urlLib.parse(url);
		}

		if (
			!url ||
			(typeof url !== 'object') ||
			!url.pathname
		) {
			return;
		}

		// will be size 1 if nomatch
		const pathParts = url.pathname.split(this.prefix);
		if (pathParts.length <= 1) {
			return;
		}
		const pathname = pathParts.pop();

		if (!pathname) {
			return;
		}

		const payload = await this.getFile(pathname);
		if (
			payload &&
			payload.status === 404 &&
			/no404/.test(url.search)
		) {
			payload.status = 200;
			payload.contentType = mime.getType(pathname)
		}

		return payload;
	}
	async getFile(pathname) {
		if (!this.enabled) {
			return;
		}
		if (typeof pathname !== 'string') {
			return;
		}
		pathname = path.normalize(`./${pathname}`);

		// avoid those pesky hackerz - taken from https://npmjs.com/packages/serve-static
		if (UP_PATH_REGEXP.test(pathname)) {
			console.error(`malicious path attempt ${pathname}`);
			return {
				body: `malicious path attempt ${pathname}`,
				status: 400
			};
		}

		const filepath = path.normalize(path.join(this.root, pathname));

		if (filepath in this.cache) {
			return this.cache[filepath];
		}

		const payload = {};

		try {
			// throws if imissing
			const file = await fs.readFile(filepath);
			Object.assign(payload, {
				body: file,
				contentType: mime.getType(filepath),
				status: 200
			});

			// slightly less efficient but I don't care
			if (!payload.contentType) {
				delete payload.contentType;
			}
		} catch (err) {
			// no exist
			if (err.code === 'ENOENT') {
				// always ignore missing files
				payload.status = 404;
			} else {
				console.debug(`Error serving file ${filepath}`, err);
				// no payload to send
				return;
			}
		}

		if (this.shouldCache) {
			this.cache[filepath] = payload;
		}

		return payload;
	}
}

module.exports = StaticServer;

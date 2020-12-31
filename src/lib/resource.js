
const path = require('path');
const crypto = require('crypto');
const urlLib = require('url');
const mime = require('mime');
const sharp = require('sharp');
const config = require('../book-config');

function uuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
		const r = (Math.random()*16)|0;
		return (c === 'x' ? r : (r&0x3)|0x8).toString(16);
	});
}

function md5(text) {
	return 'x' + crypto.createHash('md5').update(text).digest('hex');
}

function safeName(str) {
	return str.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_');
}

const folders = config.get('output.folders');
const defaultOrigin = config.get('discovery.defaultOrigin', 'http://www.scpwiki.com');
const defaultUrlObj = urlLib.parse(defaultOrigin);

/** @typedef {'local' | 'remote' | 'none' | 'maybe'} CacheType */

/** @type {{local: 'local', remote: 'remote', none: 'none', maybe: 'maybe'}} */
const CacheEnum = {
	local: 'local',
	remote: 'remote',
	none: 'none',
	maybe: 'maybe'
};

/**
 *
 */
class Resource {
	/**
	 *
	 * @param {object} opts
	 * @param {string} [opts.url]
	 * @param {any} [opts.content]
	 * @param {string} [opts.id]
	 * @param {string} [opts.filename]
	 * @param {string} [opts.mimeType]
	 * @param {string[]} [opts.from]
	 * @param {CacheType} [opts.cache]
	 * @param {boolean} [opts.save]
	 * @param {boolean} [opts.remote]
	 * @param {boolean} [opts.excludeFromManifest]
	 * @param {string[]} [opts.aliases]
	 * @param {number} [opts.depth]
	 */
	constructor(opts = {}) {
		/** @type {string} */
		this.url;
		/** @type {any} */
		this.content;
		/** @type {string} */
		this.id;
		/** @type {string} */
		this.filename;
		/** @type {string} */
		this.mimeType;
		/** @type {string[]} */
		this.from = [];
		/** @type {string} */
		this.bookPath;
		/** @type {string} */
		this.canononicalUrl;
		/** @type {string[]} */
		this.aliases;
		/** @type {number} */
		this.depth;
		/** @type {CacheType} */
		this.cache;

		let {
			url = '',
			content,
			id,
			filename,
			mimeType,
			from = [],
			cache = CacheEnum.none,
			save = undefined,
			remote = undefined,
			excludeFromManifest = false,
			depth = 0,
			aliases = []
		} = opts;

		this.canononicalUrl = Resource.asCanononical(url);
		this.id = id || md5(this.canononicalUrl);
		this.mimeType = mimeType || mime.getType(url) || '';
		// epub expects xhtml files
		if (this.mimeType === 'text/html') {
			this.mimeType = 'application/xhtml+xml';
		}

		this.mimeType = this.mimeType.replace(/; charset=.*/, '');

		Object.assign(this, {url, content, excludeFromManifest, aliases, depth, cache});
		this.addBacklinks(...from);

		// backwards compatibility just in case
		if (save !== undefined) {
			this.save = !!save;
		}
		if (remote !== undefined) {
			this.remote = !!remote;
		}

		// TODO wrap mime so it doesn't come up with stupid extensions
		this.extension = (mime.getExtension(this.mimeType) || '')
			.replace('jpeg', 'jpg')
			.replace('mpga', 'mp3');

		if (filename) {
			filename = path.basename(filename, `.${this.extension}`);
		}
		this.filename = `${filename || this.id}${this.extension ? `.${this.extension}` : ''}`;
		if (!this.bookPath) {
			this.bookPath = this._getBookPath();
		}
	}
	/**
	 *
	 * @param {Resource} that
	 */
	merge(that) {
		if (
			(this.isPlaceholder && !that.isPlaceholder) ||
			(!this.content && that.content)
		) {
			return that.merge(this);
		}
		// update content if that content is greater size
		if (!that.content) {
			// do nothing
		} else if (
			!this.content ||
			this.content.length < that.content.length
		) {
			this.content = that.content;
		}

		if (that.from.length > 0) {
			this.from.push(...(that.from.filter(x => !this.from.includes(x))));
		}
		if (that.aliases.length > 0) {
			this.aliases.push(...(that.aliases.filter(x => !this.aliases.includes(x))));
		}
		if (!this.mimeType && that.mimeType) {
			const {id, mimeType, filename, extension, bookPath} = that;
			Object.assign(this, {id, mimeType, filename, extension, bookPath});
		}

		this.depth = Math.min(this.depth, that.depth);

		if (this.cache === that.cache) {
			// ignore
		} else if ([this.cache, that.cache].includes(CacheEnum.local)) {
			this.cache = CacheEnum.local;
		} else if ([this.cache, that.cache].includes(CacheEnum.remote)) {
			this.cache = CacheEnum.remote;
		} else {
			this.cache = CacheEnum.none;
		}

		// this.save = this.save || that.save;
		// this.remote = this.remote || that.remote;
		return this;
	}
	/**
	 *
	 * @param  {...any} urls
	 */
	addBacklinks(...urls) {
		if (Array.isArray(urls[0]) && urls.length === 1) {
			urls = urls[0];
		}
		const backlinks = urls
			.filter(url => url && !url.startsWith('about'))
			.map(url => url && Resource.asCanononical(url))
			.filter(url => !this.from.includes(url));

		this.from.push(...backlinks);
	}
	get isDataUrl() {
		return this.url.startsWith('data:');
	}
	get isFont() {
		return this.mimeType.startsWith('font');
	}
	get isCss() {
		return this.extension === 'css';
	}
	get isImage() {
		return this.mimeType.startsWith('image');
	}
	get isDoc() {
		return /html|xml/.test(this.mimeType);
	}
	get shouldWrite() {
		return (this.cache === CacheEnum.local) && !!this.content && !this.isDataUrl;
	}
	get shouldIncludeInManifest() {
		return this.shouldWrite || this.cache === CacheEnum.remote;
	}
	get isDisposable() {
		return this.cache === CacheEnum.none;
	}
	get isPlaceholder() {
		return this.isDoc && !this.content;
	}
	get filename() {
		return this._filename;
	}
	set filename(val) {
		this._filename = val;
		this.bookPath = this._getBookPath();
	}
	get save() {
		console.trace('DEPRECIATED - getting save on resource - use "cache" instead');
		return this.cache !== CacheEnum.local;
	}
	set save(val) {
		console.trace('DEPRECIATED - setting save on resource - use "cache" instead');
		if (val) {
			this.cache = CacheEnum.local;
		} else if (this.cache !== CacheEnum.remote) {
			this.cache = CacheEnum.none;
		}
	}
	get remote() {
		console.trace('DEPRECIATED - setting "remote" on resource - use "cache" instead');
		return this.cache === CacheEnum.remote;
	}
	set remote(val) {
		console.trace('DEPRECIATED - setting "remote" on resource - use "cache" instead');
		if (val) {
			this.cache = CacheEnum.remote;
		} else if (this.cache !== CacheEnum.local) {
			this.cache = CacheEnum.none;
		}
	}
	setLocal() {
		this.cache = CacheEnum.local;
	}
	setRemote(force = false) {
		// don't set remote if already set to local
		if (this.shouldWrite && !force) {
			return;
		}
		this.cache = CacheEnum.remote;
	}
	_getBookPath() {
		const key = (this.isImage && 'images') ||
			(this.isCss && 'css') ||
			(this.isFont && 'fonts') ||
			(this.isDoc && 'docs') ||
			'default';
		return path.posix.join(folders[key], this.filename).replace(/^\//, '');
	}
	async compress(options = {}) {
		const {
			compress = true,
			convertSVG = true,
			width = 768,
			height = 1024,
			quality = 70,
			// 1mb
			maxSize = 1024 * 1024,
			resizeOptions
		} = config.util.extendDeep(
			{
				resizeOptions: {
					fit: 'inside',
					withoutEnlargement: true
				}
			},
			config.get('output.images'),
			options
		);

		// skip compression if specified.
		if (!compress) {
			return;
		}

		// ignore non-images
		if (!this.isImage) {
			return;
		}
		// don't convert svg files
		if (!convertSVG && /svg/.test(this.extension)) {
			return;
		}

		// don't compress the cover image
		if (this.id === 'cover-image') {
			return;
		}

		//const meta = await sharp().metadata();
		// if (/gif/.test(this.extension)) {
		// const meta = await sharp(this.content).metadata();
		// }

		const forcePng = /svg|gif|png|mng|apng/i.test(this.extension);

		await new Promise((resolve, reject) => {
			sharp(this.content)
				.resize(width, height, resizeOptions)
				.jpeg({ quality, force: !forcePng })
				.png({ force: forcePng })
				.toBuffer((err, data, info) => {
					if (err) {
						reject(err);
						return;
					}
					this.content = data;
					const oldExtension = this.extension;
					this.mimeType = mime.getType(info.format);
					this.extension = mime.getExtension(this.mimeType).replace('jpeg', 'jpg');
					this.filename = `${path.basename(this.filename, `.${oldExtension}`)}.${this.extension}`;
					resolve();
				});
		});

	}
	/**
	 *
	 * @param {import("puppeteer").Response} response
	 */
	static fromResponse(response) {
		const opts = {
			url: response.url(),
			from: [(response.frame() || {url(){ return ''; }}).url()],
			mimeType: response.headers()['content-type']
		};
		// make sure original urls are asssociated with redirected versions
		const request = response.request();
		const redirectChain = request.redirectChain();
		if (Array.isArray(redirectChain) && redirectChain.length > 0) {
			opts.aliases = redirectChain.map(req => {
				return Resource.asCanononical(req.url());
			});
		}
		return new Resource(opts);
	}
	static asCanononical(url) {
		if (url instanceof Resource) {
			return url.canononicalUrl;
		}

		if (url instanceof URL) {
			url = urlLib.parse(`${url}`);
		}
		if (typeof url === 'string') {
			url = urlLib.parse(url);
		}

		// assign defaults
		url = {
			...defaultUrlObj,
			...url
		};

		// TODO FIXME HACK
		// this is to normalize the URLs to the standard domain
		if (url.host !== defaultUrlObj.host && /scp-wiki\.wikidot\.com|scpwiki\.com|scp-wiki\.net/.test(url.host)) {
			url.host = defaultUrlObj.host;
		}

		return `${url.protocol || 'http:'}//${url.host || ''}${url.pathname}`;
	}
	get properties() {
		return this.id === 'cover-image' ? ['cover-image'] : [];
	}
	static get CacheEnum() {
		return CacheEnum;
	}
}

module.exports = Resource;

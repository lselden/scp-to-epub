
const path = require('path');
const crypto = require('crypto');
const urlLib = require('url');
const mime = require('mime');
const sharp = require('sharp');

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
	 * @param {boolean} [opts.save]
	 * @param {boolean} [opts.remote]
	 * @param {object} [opts.folders]
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
		/** @type {boolean} */
		this.save;
		/** @type {object} */
		this.folders;
		/** @type {string} */
		this.bookPath;
		/** @type {string} */
		this.canononicalUrl;
		/** @type {string[]} */
		this.aliases;
		/** @type {number} */
		this.depth;

		let {
			url = '',
			content,
			id,
			filename,
			mimeType,
			from = [],
			save = false,
			remote = false,
			folders = Resource.folders,
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

		Object.assign(this, {url, content, folders, excludeFromManifest, aliases, depth});
		this.addBacklinks(...from);

		this.save = !!save;
		this.remote = !!remote;
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
		this.save = this.save || that.save;
		this.remote = this.remote || that.remote;
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
		return this.save && !!this.content && !this.isDataUrl;
	}
	get shouldIncludeInManifest() {
		return this.shouldWrite || this.remote;
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
	_getBookPath() {
		const key = (this.isImage && 'images') ||
			(this.isCss && 'css') ||
			(this.isFont && 'fonts') ||
			(this.isDoc && 'docs') ||
			'default';
		return path.posix.join(this.folders[key], this.filename).replace(/^\//, '');
	}
	async compress(options = {}) {
		const {
			width = 768,
			height = 1024,
			fit = 'inside',
			quality = 70,
			preventUpscale = true,
			// 1mb
			maxSize = 1024 * 1024
		} = options;

		// ignore non-images
		if (!this.isImage) {
			return;
		}
		// don't convert svg files
		if (/svg/.test(this.extension)) {
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

		await new Promise((resolve, reject) => {
			sharp(this.content)
				.resize(width, height, { fit, withoutEnlargement: preventUpscale})
				.jpeg({ quality, force: false })
				.png({ force: false })
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
	static asCanononical(url, defaultOrigin) {
		if (url instanceof URL) {
			url = urlLib.parse(`${url}`);
		}
		if (typeof url === 'string') {
			url = urlLib.parse(url);
		}
		if (url instanceof Resource) {
			return url.canononicalUrl;
		}
		// TODO FIXME HACK
		if (url.host === 'scp-wiki.wikidot.com') {
			url.host = /scp-wiki/.test(defaultOrigin) ? defaultOrigin : 'www.scp-wiki.net';
		}

		// TODO need to normalize around using URL vs urlLib.parse
		if (!url.host && defaultOrigin) {
			const tmp = urlLib.parse(defaultOrigin);
			url.host = tmp.host || tmp.path;
		}
		return `${url.host || ''}${url.pathname}`;
	}
	static get folders() {
		return {
			css: 'css',
			fonts: 'fonts',
			images: 'images',
			docs: '',
			default: ''
		}
	}
}

module.exports = Resource;

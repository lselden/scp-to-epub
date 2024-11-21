const path = require('path');
const fs = require('fs');
const {promisify} = require('util');
const archiver = require('archiver');
const rimraf = require('rimraf');
const pMap = require('p-map');
const junk = require('junk');
const got = require('got');
const getStream = require('get-stream');
const Resource = require('./resource');
const DocPart = require('./doc-part');
const config = require('../book-config');
const genManifest = require('../templates/content.opf');
const {genToc, genAppendix} = require('../templates/toc.xhtml');
const genNcx = require('../templates/epb.ncx');
const genPreface = require('../templates/preface.xhtml');

const rmdir = promisify(rimraf);

const {uuid} = require('./utils');
const { exists, getAssetPath } = require('./path-utils');

class Book {
	/**
	 *
	 * @param {import('../..').BookConfig} opts
	 */
	constructor(opts = {}) {
		/** @type {string} */
		this.title;

		/** @type {string} */
		this.lang = config.get('metadata.lang', 'en');

		/** @type {string} */
		this.publisher = config.get('metadata.publisher');

		/** @type {Date} */
		this.publishDate = new Date();

		/** @type {string[]} */
		this._author = [].concat(config.get('metadata.author', 'SCP Foundation'));

		/** @type {import("./chapter")[]} */
		this.chapters = [];

		/** @type {import("./resource")[]} */
		this.resources = [];

		this.layout = {
			nested: [],
			chapters: [],
			appendix: []
		};

		let {
			title = '',
			lang,
			author,
			publisher,
			publishDate,
			...otherOpts
		} = opts;

		Object.assign(this, config.util.compact({title, author, publisher, publishDate}));

		this.id = config.get('metadata.bookId', `scp.to.epub.${Math.random().toString(16).slice(2)}`);

		this.toc = {
			title: config.get('bookOptions.tocTitle', 'Table Of Contents'),
			path: 'toc.xhtml',
			ncxPath: 'epb.ncx',
			prefacePath: 'preface.xhtml',
			appendixPath: 'appendix.xhtml'
		};

		this.creator = config.get('metadata.creator', 'scp-epub-gen');

		this.options = {
			appendixDepthCutoff: config.get('bookOptions.appendixDepthCutoff', config.get('discovery.maxDepth', 2)),
			keepTempFiles: config.get('output.keepTempFiles', false),
			cleanTempFolder: config.get('output.cleanTempFolder', true),
			additionalResources: config.get('input.additionalResources', []),
			...otherOpts
		};

		this.localAssetsPath = config.get('output.localResources', path.join(__dirname, '../../assets'));

		// TODO just pull this from assetFolders...will need to grab before starting to generate various files...maybe at beginning of process
		this.stylesheets = config.get('bookOptions.stylesheets', ['css/base.css', 'css/style.css', 'css/fonts.css']);

		this._written = new Set();

		this.concurrency = config.get('output.diskConcurrency', 1);
	}
	get author() {
		return this._author.join(', ');
	}
	get authors() {
		return this._author || [''];
	}
	set author(val) {
		this.authors = [].concat(val);
	}
	set authors(val) {
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
	getChapterCount() {
		// NOTE doesn't check for duplicates, which shouldn't happen anyways
		let sum = 0;
		for (let chapter of this.chapters) {
			if (chapter instanceof DocPart) {
				sum += chapter.chapters.length;
			} else {
				sum += 1;
			}
		}
		return sum;
	}
	arrangeChapters() {
		const {
			appendixDepthCutoff = 1
		} = this.options;

		this.layout = {
			nested: [],
			chapters: [],
			appendix: []
		};
		const recurse = (chapters, depth = 0) => {
			for (let chapter of chapters) {
				if (chapter instanceof DocPart) {
					this.layout.chapters.push(chapter);
					this.layout.nested.push(chapter);
					recurse(chapter.chapters, depth + 1);
					continue;
				}
				// avoid duplicates
				if (
					this.layout.chapters.includes(chapter) ||
					this.layout.appendix.includes(chapter)
				) {
					continue;
				}
				if (
					// TODO add check about linear or not?
					chapter.isSupplemental ||
					(chapter.depth && chapter.depth >= appendixDepthCutoff)
				) {
					this.layout.appendix.push(chapter);
				} else {
					if (depth === 0) {
						this.layout.nested.push(chapter);
					}
					this.layout.chapters.push(chapter);
				}
			}
		}
		recurse(this.chapters);

	}
	async writeMetaResources(destination) {
		this.arrangeChapters();

		const concurrency = this.concurrency;

		const ibookOpts = `<?xml version="1.0" encoding="UTF-8"?>
		<display_options><platform name="*"><option name="specified-fonts">true</option></platform></display_options>`;

		const container = `<?xml version="1.0" encoding="UTF-8"?>
		<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
		<rootfiles>
		<rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
		</rootfiles>
		</container>`;

		const files = {
			// mimetype file - must come first
			'mimetype': 'application/epub+zip',
			'META-INF/com.apple.ibooks.display-options.xml': ibookOpts,
			'META-INF/container.xml': container,
			'EPUB/package.opf': genManifest(this, this.options),
			[`EPUB/${this.toc.path}`]: genToc(this, this.options),
			[`EPUB/${this.toc.ncxPath}`]: genNcx(this, this.options),
			[`EPUB/${this.toc.prefacePath}`]: genPreface(this, this.options),
			[`EPUB/${this.toc.appendixPath}`]: genAppendix(this, this.options)
		};

		await pMap(Object.entries(files), ([filepath, content]) => {
			return this.writeFile(path.join(destination, filepath), content);
		}, {concurrency});
	}
	async writeFile(outputPath, content) {
		// QUESTION include check against already written?
		await this.ensureDir(outputPath);
		await fs.promises.writeFile(outputPath, content);
	}
	async ensureDir(outputPath) {
		const outDir = path.dirname(outputPath);
		if (this._written.has(outDir)) {
			return;
		}
		try {
			// console.debug(`Ensuring directory ${outDir}`);
			await fs.promises.mkdir(outDir, {recursive: true});
			this._written.add(outDir);
		} catch (err) {
			console.warn(`unable to create dir ${outDir}`);
		}
	}
	/**
	 *
	 * @param {{url: string, id?: string, remote?: boolean, filename?: string, requestOptions?: any }[]} list
	 */
	async addRemoteResources(list = this.options.additionalResources) {
		const {concurrency} = this;
		await pMap(list, async item => {
			try {
				const {
					url,
					id,
					remote,
					requestOptions = {}
				} = item;

				const {
					filename = path.basename(url || '') || id
				} = item;

				let content;
				if (!remote) {
					// TODO ideally we'd just write straight to disk
					const resp = await got(url, {
						encoding: null,
						...requestOptions
					});
					content = resp.body;
				}
				const r = new Resource({
					url,
					content,
					id,
					filename,
					cache: remote ? Resource.CacheEnum.remote : Resource.CacheEnum.local
				});
				this.resources.push(r);
				console.log(`REMOTE RESOURCE: ADDED ${r.bookPath}`);
			} catch (err) {
				console.warn(`REMOTE RESOURCE: FAILED ${item && item.url}`, err);
			}
		}, {concurrency});
	}
	async addLocalResources(localPath = this.localAssetsPath) {
		const {concurrency} = this;
		// HACK direct file copy would be a better option than reading into memory
		/**
		 * @type {string[]}
		 */
		let localFiles;

        const assetsDir = await getAssetPath(localPath);
        if (!assetsDir) {
            console.error(`Unable to find CSS assets at ${localPath}, ebook may not render properly`);
            return;
        }

		try {
			const dirListing = await fs.promises.readdir(assetsDir, { withFileTypes: true });
			const subFolders = dirListing
				.filter(dir => {
					return dir.isDirectory();
				});
			localFiles = [];
			await pMap(subFolders, async dirent => {
				const dir = path.join(assetsDir, dirent.name);
				// NOTE no try/catch...?...
				const files = await fs.promises.readdir(dir);
				// QUESTION do we need to filter out thumbs / ds_config files?
				localFiles.push(...files.map(f => path.join(dir, f)));
			}, {concurrency});
		} catch (err) {
			console.error(`Failed loading local assets listing at ${localPath}`, err);
			return;
		}
		await pMap(localFiles, async file => {
			try {
				// skip junk files
				if (junk.is(file)) {
					return;
				}
				const content = await fs.promises.readFile(file);
				const basename = path.basename(file);
				const r = new Resource({
					url: `http://localhost/${basename}`,
					content,
					filename: basename
				});
				r.setLocal();
				this.resources.push(r);
			} catch (err) {
				console.error('failed reading local file', file, err);
			}
		}, { concurrency: this.concurrency });
	}
	async writeToDisk(destination) {
		const concurrency = this.concurrency;

		if (this.options.cleanTempFolder) {
			try {
				await rmdir(destination);
			} catch (err) {
				console.error('Failed to clean temp directory', err);
			}
		}

		// console.log('Reading local resources');
		await Promise.all([
			this.addLocalResources(),
			this.addRemoteResources()
		]);

		// console.log('Writing epub skeleton');
		await this.writeMetaResources(destination);

		// console.log('Writing resources');
		await pMap(this.resources, async (resource, index) => {
			if (!resource.shouldWrite) {
				return;
			}

			try {
				// console.log(`saving" ${outputPath}`);
				// NOTE not compressing cover image
				if (resource.isImage && resource.id !== 'cover-image') {
					// console.debug('Compressing image');
					// now doing in scraper
					// await resource.compress();
				}
				const outputPath = path.join(destination, 'EPUB', resource.bookPath);

				await this.writeFile(outputPath, resource.content);
			} catch (err) {
				// COMBAK
				console.warn('Failed saving file', err);
			}
		}, { concurrency });
		// console.log('Finished!');
	}
	async zip(source, destination) {
		await this.ensureDir(destination);

		const archive = archiver('zip', {zlib: {level: 9}});
		const output = fs.createWriteStream(destination);
		console.log(`Zipping temp dir ${source} to ${destination}`);
		// write the all important mimetype in first
		// @ts-ignore
		archive.file(path.join(source, 'mimetype'), {name: 'mimetype', store: true });
		archive.directory(path.join(source, 'META-INF'), 'META-INF');
		archive.directory(path.join(source, 'EPUB'), 'EPUB');
		archive.pipe(output);

		const whenClosed = new Promise((resolve, reject) => {
			let timer;
			const cleanup = () => clearTimeout(timer);
			output
				.on('close', () => { cleanup(); resolve() })
				.on('error', err => { cleanup(); reject(err); })
				.on('finish', () => {
					timer = setTimeout(() => {
						console.warn('No Close Event on write stream');
						resolve();
					}, 1000);
				});
		});
		await Promise.all([
			whenClosed,
			archive.finalize()
		]);
		if (!this.options.keepTempFiles) {
			console.log(`Removing ${source}`);
			await rmdir(source);
		}
		console.log(`Zipped archive to ${destination}`);
	}
}

module.exports = Book;

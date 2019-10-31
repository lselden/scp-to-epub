const path = require('path');
const fs = require('fs');
const mime = require('mime');
const urlLib = require('url');
const {promisify} = require('util');
const stream = require('stream');
const archiver = require('archiver');
const rimraf = require('rimraf');
const pMap = require('p-map');
const Resource = require('./resource');
const Chapter = require('./chapter');
const DocPart = require('./doc-part');
const genManifest = require('../templates/content.opf');
const {genToc, genAppendix} = require('../templates/toc.xhtml');
const genNcx = require('../templates/epb.ncx');
const genPreface = require('../templates/preface.xhtml');

const rmdir = promisify(rimraf);

const {uuid} = require('./utils');

class Book {
	constructor(opts = {}) {
		/** @type {string} */
		this.title;

		/** @type {string} */
		this.lang = 'en';

		/** @type {string} */
		this.publisher = 'SCP Foundation';

		/** @type {Date} */
		this.publishDate = new Date();

		/** @type {string[]} */
		this._author = ['SCP Foundation'];

		/** @type {import("./chapter")[]} */
		this.chapters = [];

		/** @type {import("./resource")[]} */
		this.resources = [];

		let {
			title = '',
			...otherOpts
		} = opts;

		Object.assign(this, {title});

		this.id = `scp.foundation.${Math.random().toString(16).slice(2)}`;

		this.toc = {
			title: 'Table Of Contents',
			path: 'toc.xhtml',
			ncxPath: 'epb.ncx',
			prefacePath: 'preface.xhtml',
			appendixPath: 'appendix.xhtml'
		};

		this.stylesheets = ['css/base.css', 'css/style.css', 'css/fonts.css'];

		this.creator = 'scp-epub-gen';

		// TODO DEPRECATED REMOVE
		this.cover = {
			image: '',
			width: 768,
			height: 1024
			// font: 'monospace',
			// path: 'cover.xhtml'
		};

		this.options = {
			appendixDepthCutoff: otherOpts.maxDepth ? otherOpts.maxDepth : 2,
			keepTempFiles: false,
			cleanTempFolder: true,
			...otherOpts
		};

		this.targets = {
			docParts: [],
			include: []
		};

		this.localAssetsPath = path.join(__dirname, '../../assets');


		this._written = new Set();

		this.concurrency = 1;

	}
	get author() {
		return this._author.join(', ');
	}
	get authors() {
		return this._author || [''];
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
	async addLocalResources(localPath = this.localAssetsPath) {
		// HACK direct file copy would be a better option than reading into memory
		/**
		 * @type {string[]}
		 */
		let localFiles;

		if (Array.isArray(localPath)) {
			localFiles = localPath;
		} else {
			try {
				const dirListing = await fs.promises.readdir(localPath);
				localFiles = dirListing.map(f => path.join(localPath, f));
				// HACK limit to specific files
				localFiles = localFiles.filter(f => /(base|style|fonts)\.css/.test(f));
			} catch (err) {
				console.error(`Failed loading local assets listing at ${localPath}`, err);
				return;
			}
		}
		await pMap(localFiles, async file => {
			try {
				const content = await fs.promises.readFile(file);
				const basename = path.basename(file);
				const r = new Resource({
					url: `http://localhost/${basename}`,
					content,
					filename: basename,
					save: true
				});
				this.resources.push(r);
			} catch (err) {
				console.error('failed reading local file', file);
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
		await this.addLocalResources();

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

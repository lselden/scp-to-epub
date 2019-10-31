const yargs = require('yargs');
const path = require('path');
const Book = require('./src/lib/book');
const BookMaker = require('./src/book-maker');
const viewPage = require('./src/view-page');
const {safeFilename} = require('./src/lib/utils');

async function processSingle (urls, cfg, tmpDir, destination) {
	const {
		defaultOrigin = 'http://www.scp-wiki.net'
	} = cfg;

	if (!Array.isArray(urls)) {
		urls = [urls];
	}
	urls = urls.map(u => (new URL(u, defaultOrigin)).toString());

	const book = new Book(cfg);
	const builder = new BookMaker(book, cfg);
	await builder.initialize();
	console.log('INCLUDE');
	await builder.include(urls);

	// TODO REVIEW - for single start at 0?
	for (let depth = (urls.length === 1 ? 0 : 1); depth <= builder.options.maxDepth; depth++) {
		console.log(`SUPPLEMENTAL ${depth}/${builder.options.maxDepth}`);
		await builder.includePending(depth);
	}
	console.log('WRITING');
	await builder.finalize();
	await builder.write(destination, tmpDir);
	console.log('FINISHED');
	return builder;
}

async function processBook (bookUrl, cfg, tmpDir, destination) {
	const builder = new BookMaker(bookUrl, {
		preProcess: {
			concurrency: 3,
			closeTabs: true
		},
		...cfg
	});
	await builder.initialize();
	const bookSettings = await builder.loadBook();
	await builder.processBook(bookSettings);
	console.log('WRITING');
	await builder.finalize();
	await builder.write(destination, tmpDir);
	console.log('FINISHED');
	return builder;
}


(async () => {
	const cmd = yargs
		.option('title', {
			alias: 't',
			describe: 'Title of book'
		})
		.option('author', {
			describe: 'Author(s) of book',
			default: 'SCP Foundation'
		})
		.option('book', {
			describe: 'Path to book config. Can be relative/absolute path or http url'
		})
		.option('page', {
			describe: 'Create book based on single wiki page'
		})
		.option('view', {
			describe: 'Open a single URL, format, and view in browser',
			type: 'string'
		})
		.option('output', {
			alias: 'o',
			type: 'string',
			describe: 'output file path (if ends in .epub filename, otherwise directory to put file)'
		})
		.implies('book', 'output')
		.implies('page', 'output')
		.option('tempDir', {
			alias: ['d', 'dir'],
			describe: 'Temporary working directory',
			// FIXME
			default: path.join(__dirname, './output')
		})
		.option('keepTempFiles', {
			alias: ['keep'],
			describe: 'Keep temporary folder, instead of deleting. Use --no-keep to delete',
			type: 'boolean',
			default: true
		})
		.option('debug', {
			describe: 'Enable debug mode',
			type: 'boolean'
		})
		.option('showBrowser', {
			describe: 'Whether to show the browser window as tool works',
			type: 'boolean'
		})
		.option('maxChapters', {
			describe: 'Maximum number of articles to include',
			default: 50
		})
		.option('maxDepth', {
			describe: 'Maximum depth of crawler',
			default: 2
		})
		.option('appendixDepthCutoff', {
			describe: 'Maximum depth of crawler',
			default: 2
		})
		.option('onlyZip', {
			type: 'boolean',
			describe: 'Only zip up temp directory contents into epub'
		})
		.option('width', {
			number: true,
			hidden: true,
			default: 1080
		})
		.option('height', {
			number: true,
			hidden: true,
			default: 900
		});

	const {argv} = cmd;

	let pageName;
	if (argv.page) {
		pageName = safeFilename(path.parse(`${argv.page}`).name);
	} else if (argv.book) {
		pageName = safeFilename(path.parse(`${argv.book}`).name);
	} else {
		pageName = safeFilename(`${argv.title}`);
	}

	const {
		page,
		book: bookUrl,
		view: viewUrl,
		title = decodeURIComponent(`${argv.page || argv.book}`
			.replace(/.*\//, '')
			.replace(/.*\/(.*)(\.[^.]*)?$/, '')
		).replace(/[_-]/g, ' '),
		author,
		debug,
		showBrowser,
		maxChapters,
		maxDepth,
		keepTempFiles,
		output
	} = argv;

	const cfg = {
		title,
		author,
		debug,
		headless: !showBrowser,
		keepTempFiles,
		maxChapters,
		maxDepth
	};

	if (viewUrl) {
		const pageUrls = viewUrl.split(',');
		await viewPage(pageUrls, {
			...cfg,
			headless: false
		});
		return;
	}


	const tempDir = path.join(argv.tempDir, pageName);
	const destination = output.endsWith('.epub') ? output : path.join(output, `${pageName}.epub`);

	let builder;

	if (argv.onlyZip) {
		const book = new Book(cfg);
		await book.zip(tempDir, destination);
	} else if (bookUrl) {
		builder = await processBook(bookUrl, cfg, tempDir, destination);
	} else if (page) {
		builder = await processSingle(page, cfg, tempDir, destination);
	} else {
		cmd.help();
		process.exit();
	}

	console.log(`Wrote ${title} to ${destination}, temp files in ${tempDir}`);

	if (debug && builder) {
		console.log('WAITING - CLOSE BROWSER TO CONTINUE');
		await new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				resolve(builder.browser.close());
			}, 1000 * 60 * 10);
			builder.browser.on('disconnected', () => {
				clearTimeout(timer);
				resolve();
			});
		});
		await builder.destroy();
	}
	process.exit();
})()
	.then(() => {
		process.exit();
	})
	.catch(err => {
		console.error('FATAL ERROR', err);
		process.exit(1);
	});

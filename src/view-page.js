const path = require('path');
const Book = require('./lib/book');
const BookMaker = require('./book-maker');
const config = require('./book-config');

module.exports = async function testPage (urls, cfg = {}) {
	const {
		waitTime = 500,
		defaultOrigin = config.get('discovery.defaultOrigin', 'http://www.scpwiki.com')
	} = cfg;

	config.set('input.autoLoad', false);

	if (!Array.isArray(urls)) {
		urls = [urls];
	}
	urls = urls.map(u => (new URL(u, defaultOrigin)).toString());

	const book = new Book({
		title: urls
	});
	const builder = new BookMaker(book, {
		width: 1080,
		height: 960,
		maxChapters: 1,
		maxDepth: 1,
		...cfg,
		include: urls,
		preProcess: {
			closeTabs: false
		},
		headless: false
	});

	console.debug('Initializing');
	await builder.initialize();
	console.debug('Loading page');
	await builder.include(urls);
	console.debug('Finished loading page');

	async function style(page) {
		// TODO get from book.stylesheets
		await Promise.all(
			[
				'assets/css/base.css',
				'assets/css/style.css',
				'assets/css/fonts.css',
				'client/ibooks.css'
			].map(style => page.addStyleTag({
				path: path.join(__dirname, '..', style)
			}))
		);
		await page.evaluate(() => {
			document.querySelector('html').setAttribute('__ibooks_internal_theme', 'Night');
		});
	}

	(await builder.browser.pages())
		.forEach(async page => {
			await page.exposeFunction('render', async () => {
				await builder.scraper.formatPage(page);
				await style(page);
			});
			await page.evaluateOnNewDocument(async waitTime => {
				if (window.parent !== window.self) {
					//console.log('loaded in child, not re-rendering');
					return;
				}
				console.log(`waiting (${Math.round(waitTime / 1000)}) seconds`);
				await new Promise(done => setTimeout(done, waitTime));
				//@ts-ignore
				await render();
			}, waitTime);
			await style(page);
		});

	console.log('WAITING - CLOSE BROWSER TO EXIT');
	await new Promise((resolve, reject) => {
		builder.browser.on('disconnected', () => {
			resolve();
		});
	});
	await builder.destroy();
}

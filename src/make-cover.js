const fs = require('fs').promises;
const got = require('got');
const path = require('path');
const urlLib = require('url');
const mime = require('mime');
const Resource = require('./lib/resource');

/**
 *
 * @param {import("puppeteer").Browser} browser
 * @param {*} opts
 */
async function makeCover(browser, opts = {}) {
	const {
		author = 'SCP Foundation',
		title = 'Export',
		path: imagePath = '',
		url: imageUrl = '',
		width = 1600,
		height = 2560,
		quality = 70,
		templateHtml = path.join(__dirname, '../client/cover.html'),
	} = opts;
	let {
		format = 'jpg'
	} = opts;

	let content;

	try {
		if (imagePath) {
			content = await fs.readFile(imagePath);
			format = mime.getExtension(imagePath);
		} else if (imageUrl) {
			const response = await got(imageUrl, { encoding: null });
			const mimeType = (response.headers['content-type'] || '').replace(/; charset.*$/, '');
			format = mime.getExtension(mimeType) || mime.getExtension(imageUrl) || 'jpg';
			content = response.body;
		}
	} catch (err) {
		console.error('Unable to get image for cover', err);
	}

	if (!format || format === 'jpeg') {
		format = 'jpg';
	}

	const resource = new Resource({
		id: 'cover-image',
		url: `http://localhost/cover-image.${format}`,
		filename: `cover-image.${format}`,
		mimeType: mime.getType(imagePath || imageUrl) || mime.getType(format),
		content,
		save: true
	});

	// nothing else to do
	if ((imagePath || imageUrl) && resource.content) {
		return resource;
	}

	const page = await browser.newPage();
	await page.setViewport({ width, height, deviceScaleFactor: 1});

	if (templateHtml.startsWith('http')) {
		await page.goto(templateHtml, {
			waitUntil: ['networkidle2']
		});
	} else {
		const html = await fs.readFile(templateHtml);
		await page.setContent(html.toString(), { waitUntil: ['load', 'networkidle0']});
	}
	await page.evaluate((author, title) => {
		function escape(unsafe) {
			return unsafe.replace(/[&<"']/g, function(x) {
				switch (x) {
				case '&': return '&amp;';
				case '<': return '&lt;';
				case '"': return '&quot;';
				default: return '&#039;';
				}
			});
		}

		// @ts-ignore
		(document.querySelector('#author') || {}).innerText = escape(author);
		// @ts-ignore
		(document.querySelector('#title') || {}).innerText = escape(title);
		return new Promise(done => {
			requestAnimationFrame(() => done());
		});
	}, author, title);
	content = await page.screenshot({
		// path: path.join(__dirname, '../screenshot.jpg'),
		type: format === 'png' ? 'png' : 'jpeg',
		quality
	});
	resource.content = content;
	await page.close();
	return resource;
}

module.exports = makeCover;

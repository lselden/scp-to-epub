const fs = require('fs');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const markdownItAttrs = require('markdown-it-attrs');
const genDocPart = require('./templates/doc-part.xhtml');
const DocPart = require('./lib/doc-part');

const md = new MarkdownIt({
	html: true,
	xhtmlOut: true
});

md.use(markdownItAttrs, {
	leftDelimiter: '{',
	rightDelimiter: '}',
	allowedAttributes: []
});

function renderMarkdown(raw) {
	return md.render(raw);
}

function parseBookConfig(text) {
	const {content, data: settings} = matter(text);
	if (settings.preface) {
		settings.prefaceHTML = renderMarkdown(settings.preface);
	}
	settings.tocHTML = renderMarkdown(content);

	return settings;
}

async function loadBookConfig(filepath) {
	const raw = await fs.promises.readFile(filepath);
	const config = parseBookConfig(raw.toString());
	return config;
}

/**
 *
 * @param {import("puppeteer").Page} page
 */
async function loadBookRemote(page) {
	const {
		frontmatter,
		tocHTML
	} = await page.evaluate(async () => {
		// try to get block specified by hash, fall back to wikidot's main body, or just page body
		/** @type {HTMLElement} */
		// @ts-ignore
		const context = [document.location.hash, '#page-content', 'body']
			.reduce((out, sel) => out || (sel && document.querySelector(sel)), undefined);

		const codeBlock = context.querySelector('#front-matter, .code, code');

		if (!codeBlock) {
			throw new Error('No front matter - must have <code> or #front-matter block included');
		}

		const frontmatter = codeBlock.textContent.trim();
		codeBlock.remove();
		const tocHTML = context.innerHTML;
		return {
			frontmatter,
			tocHTML
		};
	});

	const {data: settings} = matter(frontmatter);
	if (settings.preface) {
		settings.prefaceHTML = renderMarkdown(settings.preface);
	}
	settings.tocHTML = tocHTML;
	return settings;
}

/**
 *
 * @param {import("./book-maker")} app
 * @param {string} html
 */
async function extractDocParts(html, app) {
	const {options, browser, scraper} = app;
	const headerSelector = 'h2';
	const {
		defaultOrigin = 'http://www.scp-wiki.net'
	} = options;

	// const page = await browser.newPage();
	const {page} = await scraper.createPage('about:blank');

	await page.setContent(html, { waitUntil: ['load', 'networkidle0']});

	await scraper.switchImagesToLocal(page);

	const docParts = await page.evaluate((headerSelector, defaultOrigin) => {
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

		const serialize = (() => {
			const serializer = new XMLSerializer();
			return html => {
				const dummy = document.createElement('epubwrapper');
				dummy.innerHTML = html;
				return serializer
					.serializeToString(dummy)
					.replace(/<epubwrapper[^>]*>/, '')
					.replace('</epubwrapper>', '');
			}
		})();

		function nextUntil(el, sel) {
			const siblings = [];
			let currentElement = el;
			while (currentElement = currentElement.nextSibling) {

				if (
					currentElement.nodeType === Node.ELEMENT_NODE &&
					currentElement.matches(sel)
				) {
					break;
				}
				siblings.push(currentElement);
			}
			return siblings;
		}

		const innerHeaders = new Set();

		const blocks = [];
		let index = 1;

		// function addTagBlock(link) {
		// 	const block = {
		// 		title: escape(link.textContent),
		// 		titleHTML: link.innerHTML,
		// 		index: index++,
		// 	}


		// }

		document.querySelectorAll(headerSelector).forEach(header => {
			try {

				// ignore child headers already included in other section
				if (innerHeaders.has(header)) {
					return;
				}
				const block = {
					// REVIEW - apostrophies get messed up
					title: header.textContent,
					titleHTML: serialize(header.innerHTML),
					index: index++,
					links: [],
					html: ''
				};
				const children = nextUntil(header, headerSelector);
				// verify children
				children.forEach(child => {
					if (!child || !child.nodeType) {
						return;
					}
					if (child.nodeType === Node.TEXT_NODE) {
						// REVIEW this often just may have unnecessary whitespace...
						block.html += escape(child.textContent.trim());
						return;
					}
					// skip comment nodes etc.
					if (child.nodeType !== Node.ELEMENT_NODE) {
						return;
					}

					block.html += serialize(child.outerHTML);

					// sanity check - doesn't support nested headers right now
					const childHeaders = child.querySelectorAll(headerSelector);
					if (childHeaders.length) {
						console.warn(`Sorry! Nested header elements (${headerSelector}) are not currently supported. Found ${childHeaders[0].nodeType} ${childHeaders[0].textContent} as child of ${header.nodeType} ${header.textContent}'s siblings`);
						childHeaders.forEach(el => innerHeaders.add(el));
					}

					// now get any links
					child.querySelectorAll('a:not([rel=nofollow])').forEach(link => {
						const urlObj = new URL(link.getAttribute('href'), defaultOrigin);
						// make links absolute
						link.setAttribute('href', urlObj.toString());

						// handle tags link separately?
						// if (urlObj.pathname.startsWith('/system:page-tags')) {
						// block.links.push({

						// })
						// }

						block.links.push({
							titleHTML: serialize(link.innerHTML),
							title: link.textContent,
							url: urlObj.toString()
						});
					});
				});
				blocks.push(block);
			} catch (err) {
				console.warn(`Failed to parse TOC! ${err}`);
			}
		});
		return blocks;
	}, headerSelector, defaultOrigin);

	await page.close();

	return docParts.map(docPart => {
		docPart.content = genDocPart(docPart, app.book);
		docPart.origin = defaultOrigin;
		return new DocPart(docPart);
	});
}

module.exports = {
	renderMarkdown,
	loadBookConfig,
	loadBookRemote,
	extractDocParts
};

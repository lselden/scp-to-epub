const fs = require('fs').promises;
const got = require('got');
const path = require('path');
const urlLib = require('url');
const mime = require('mime');
const Resource = require('./lib/resource');
const { getAssetPath } = require('./lib/path-utils');
const { debug, normalizeRelativePath, normalizeUrl } = require('./lib/utils');
const { configureLocalMirror, shouldMirrorUrl, maybeMirrorUrl } = require('./lib/kiwiki-cache');
const config = require('./lib/config');


async function fromImage({ imagePath, imageUrl, format = 'jpg'}) {
    let content;
    try {
		if (imagePath) {
			content = await fs.readFile(imagePath);
			format = mime.getExtension(imagePath);
		} else if (imageUrl) {
			const response = await fetch(imageUrl);
			const mimeType = (response.headers['content-type'] || '').replace(/; charset.*$/, '');
			format = mime.getExtension(mimeType) || mime.getExtension(imageUrl) || 'jpg';
			content = Buffer.from(await response.arrayBuffer());
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
		aliases: ['http://localhost/cover-image'],
		cache: 'local'
	});

	// nothing else to do
	if ((imagePath || imageUrl) && resource.content) {
		return resource;
	}
}

async function loadUrl(page, url) {
    configureLocalMirror();
    url = await maybeMirrorUrl(url);
    await page.goto(url, {
        waitUntil: ['networkidle2']
    });
    return page;
}

async function fromTheme(page, {theme, ...opts}) {

    await loadUrl(page, theme);
    
}

/**
 * @import {Browser, Page} from 'puppeteer'
 */

class CoverCreator {
    /**
     * 
     * @param {Browser} browser 
     * @param {Record<string, any>} opts
     */
    constructor(browser, opts) {
        this.opts = opts;
        this.browser = browser;
        /**
         * @type {Page}
         */
        this.page;
    }
    async makeCover() {
        const {
            author = 'SCP Foundation',
            title = 'Export',
            path: imagePath = '',
            url: imageUrl = '',
            width = 1600,
            height = 2560,
            quality = 70,
            templateHtml,
            theme,
            pageZoom = 2
        } = this.opts;
        
        let resource;

        if (imagePath || imageUrl) {
            resource = await this.fromImage();
            if (resource?.content) return resource;
        }
        if (!resource?.content && theme) {
            resource = await this.fromTheme();
        }
        if (!resource?.content && templateHtml) {
            resource = await this.fromTemplate();
        }
        return resource;
    }
    async fromImage() {
        const {path: imagePath, url: imageUrl} = this.opts;
        let {format} = this.opts;
        let content;
        try {
            if (imagePath) {
                content = await fs.readFile(imagePath);
                format = mime.getExtension(imagePath);
            } else if (imageUrl) {
                const response = await fetch(imageUrl);
                const mimeType = (response.headers['content-type'] || '').replace(/; charset.*$/, '');
                format = mime.getExtension(mimeType) || mime.getExtension(imageUrl) || 'jpg';
                content = Buffer.from(await response.arrayBuffer());
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
            aliases: ['http://localhost/cover-image'],
            cache: 'local'
        });

        // nothing else to do
        if ((imagePath || imageUrl) && resource.content) {
            return resource;
        }
    }
    async loadPage({url = undefined, html = undefined}, opts = this.opts) {
        if (!this.page) {
            this.page = await this.browser.newPage();
        }
        const page = this.page;

        const {width, height, deviceScaleFactor = 1} = opts;
        await page.setViewport({width, height, deviceScaleFactor});

        if (url) {
            if (!`${url}`.startsWith('http')) {
                const defaultOrigin = opts.defaultOrigin || config.get('discovery.defaultOrigin', 'http://www.scpwiki.com');
                configureLocalMirror();
                url = normalizeUrl(url, defaultOrigin);
            }
            configureLocalMirror();
            url = await maybeMirrorUrl(url);
            await page.goto(url, {
                waitUntil: ['networkidle2']
            });
        } else if (html) {
            await page.setContent(html, { waitUntil: ['load', 'networkidle0']});
        }

        return page;
    }
    async screenshotAndClose() {
        const page = this.page;
        const {format = 'jpg', quality = 70} = this.opts;
        const content = await page.screenshot({
            type: format === 'png' ? 'png' : 'jpeg',
            ...(format !== 'png') && { quality },
            captureBeyondViewport: true,
            fullPage: false
        });
        await page.close();
        return new Resource({
            id: 'cover-image',
		    url: `http://localhost/cover-image.${format}`,
		    filename: `cover-image.${format}`,
		    mimeType: mime.getType(format),
		    content,
		    aliases: ['http://localhost/cover-image'],
		    cache: 'local'
        });
    }
    async fromTemplate() {
        const {templateHtml, pageZoom, author = '', title = ''} = this.opts;
        const loadOpts = {};
        if (templateHtml.startsWith('http')) {
            loadOpts.url = templateHtml;
        } else {
            const foundPath = await getAssetPath(templateHtml);
            if (!foundPath) {
                throw new Error(`COVER - cannot find specified template cover html ${templateHtml} - try setting absolute path in config.yaml`);
            }
            debug(`Loading cover from ${foundPath}`)
            loadOpts.html = await fs.readFile(foundPath, { encoding: 'utf-8'});
        }
        const page = await this.loadPage(loadOpts);
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
    
            // TODO REVIEW encoding chain and if these need escaping at this point
            // @ts-ignore
            (document.querySelector('#author') || {}).innerText = escape(author);
            // @ts-ignore
            (document.querySelector('#page-title') || {}).innerText = escape(title);
            return new Promise(done => {
                requestAnimationFrame(() => done());
            });
        }, author, title);
        return this.screenshotAndClose();
    }
    async fromTheme() {
        let {
            theme,
            author = '', title = '',
            backgroundImage
        } = this.opts;

        const page = await this.loadPage({url: theme});
        page.on('console', msg => {
			console.log('MAKE COVER CONSOLE', msg.type(), msg.text());
		});
        
        await page.addScriptTag({
			path: await getAssetPath('client/make-cover.js')
		});

        // switch to print to skip screen rules
        await page.emulateMediaType('print');

        // let cssText = '';
        // const cssPath = await getAssetPath(overrideCSS);
        // if (cssPath) {
        //     cssText = await fs.readFile(cssPath, { encoding: 'utf-8'});
        // } else {
        //     console.warn(`Cannot find override CSS for cover - formatting will likely be incorrect - expected ${overrideCSS} to exist`);
        // }
        const createCfg = {
            author,
            title,
            image: config.get('cover.themeImage', 'auto'),
            keepHeaderBackground: config.get('cover.keepHeaderBackground', false),
            overrideCSS: config.get('cover.overrideCSS', ''),
            backgroundImage: config.get('cover.backgroundImage')
        };
        await page.evaluate(async (createCfg) => {
            await makeCover(createCfg);
        }, createCfg);

        return this.screenshotAndClose();

    }
    async _fromThemeOld() {
        let {
            theme,
            pageZoom,
            author = '', title = '',
            authorTag = 'h3',
            authorElementId = 'author',
            overrideCSS = 'static/cover-from-theme.css'
        } = this.opts;
        const page = await this.loadPage({url: theme});
        let cssText = '';
        const cssPath = await getAssetPath(overrideCSS);
        if (cssPath) {
            cssText = await fs.readFile(cssPath, { encoding: 'utf-8'});
        } else {
            console.warn(`Cannot find override CSS for cover - formatting will likely be incorrect - expected ${overrideCSS} to exist`);
        }
        // set meta and change zoom
        await page.evaluate((author, title, pageZoom, authorElementId, authorTag) => {
            if (!isNaN(pageZoom)) {
                document.body.style.zoom = pageZoom;
            }
            const titleEl = document.querySelector('#page-title') || document.querySelector('#title');
            if (titleEl) {
                titleEl.innerText = title ?? '';
                if (title && titleEl.computedStyleMap().get('display').value === 'none') {
                    titleEl.style.display = 'unset';
                }
            }
            let authorEl = document.getElementById(authorElementId);
            if (!authorEl) {
                authorTag = authorTag.replace(/[^a-z0-9]/g, '') || 'p';
                authorEl = document.createElement(authorTag);
                authorEl.id = authorElementId;
                let parent = document.querySelector('#page-content');
                if (parent) {
                    parent.replaceChildren(authorEl);
                } else {
                    parent = document.querySelector(':has(> #page-title)');
                    [...parent.childNodes].filter(x => x.nodeType === x.TEXT_NODE).forEach(el => el.remove());
                    if (titleEl) {
                        titleEl.insertAdjacentElement('afterend', authorEl);
                    } else {
                        parent.prepend(authorEl);
                    }
                }
            }
            authorEl.innerText = author;

            // I don't know if this should be done, but seems to help?
            for (let size of ['mobile','desktop']) {
                const key = `--header-height-on-${size}`;
                let val = getComputedStyle(document.body).getPropertyValue(key);
                if (val.endsWith('em') && parseFloat(val.replace(/[^\d]/g,'')) <= 10) {
                    document.body.style.setProperty(key, '12rem !important');
                } else if (val.endsWith('px') && parseFloat(val.replace(/[^\d]/g,'')) <= 200) {
                    document.body.style.setProperty(key, '230px !important');
                }
            }
        }, author, title, pageZoom, authorElementId, authorTag);

        // switch to print to skip screen rules
        await page.emulateMediaType('print');
        if (cssText) {
            await page.addStyleTag({ content: cssText });
        }
        return this.screenshotAndClose();
    }
}


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
		templateHtml,
        theme,
        pageZoom = 2
	} = opts;
	let {
		format = 'jpg'
	} = opts;

    const creator = new CoverCreator(browser, opts);
	
    const resource = await creator.makeCover();
	return resource;
}

module.exports = makeCover;

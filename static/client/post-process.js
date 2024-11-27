// this is used during post-process to do DOM manipulation and cleanup

function cleanupHead (doc) {
	// remove unnecessary whitespace from header, just because it annoys me
	[...doc.head.childNodes].forEach(el => {
		if (el.nodeType === el.TEXT_NODE) {
			doc.head.removeChild(el);
		}
	});

	// remove bad http-equiv
	doc.head.querySelectorAll('meta[http-equiv]').forEach(el => {
		const val = el.getAttribute('http-equiv');
		if (!['content-security-policy', 'refresh', 'content-type', 'default-style', 'x-ua-compatible'].includes(val.toLowerCase())) {
			el.remove();
		}
	});
    // remove all meta elements, b/c can cause bad parsing in some apps
    [...doc.head.querySelectorAll('meta[name]')].forEach(el => el.remove());
}

function fixDocType (doc) {
	// fix doctype
	const htmlEl = doc.documentElement;
	if (!htmlEl.getAttribute('xmlns')) {
		htmlEl.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
	}

	if (
		!htmlEl.getAttribute('xml:lang') &&
		htmlEl.getAttribute('lang')
	) {
		htmlEl.setAttribute('xml:lang', htmlEl.getAttribute('lang'));
	}
	htmlEl.removeAttribute('lang');
}

async function updateLinks (doc, originalUrl) {
	const links = [...doc.querySelectorAll('a')];
	for (let anchor of links) {
		// magic value to avoid updating

		// use URL constructor to ensure external relative links are preserved
        const attr = anchor.getAttribute('href');
        if (!attr || !URL.canParse(attr, originalUrl)) continue;
		const urlObj = new URL(attr, originalUrl);
		let href = urlObj.toString();

		// TODO this is only needed for header front-matter, so really isn't necessary anymore
		if (anchor.dataset.external || anchor.getAttribute('rel') === 'nofollow') {
			anchor.href = href;
			continue;
		}

		// @ts-ignore
		if (typeof window.getBookPath === 'function') {
			// @ts-ignore
			href = await window.getBookPath(href);
		}

		if (href.startsWith('/') && !href.endsWith('xhtml')) {
			console.log('possible bad link', href);
		}

		anchor.href = href;
	}
}

async function registerRemote(doc, originalUrl) {
	const baseUrl = 'http://__';
	// COMBAK this is not a smart way/place to do this
	const mediaElements = [...doc.querySelectorAll('audio[src], video[src], object[src], img[src], iframe[src]')];
	for (let el of mediaElements) {
		try {
			if (!el.src) {
				continue;
			}

			const urlObj = new URL(el.src, 'http://__');
			let href = urlObj.toString();

			// relative path, so ignore
			// if (urlObj.origin === baseUrl) {
			// 	continue;
			// }

			// REVIEW
			if (el.dataset.external === 'false' || el.rel === 'nofollow') {
				continue;
			}

            let typeHint = {
                audio: 'audio/mpeg',
                video: 'video/mp4',
                img: 'image/jpeg',
                iframe: 'text/html'
            }[el.tagName.toLowerCase()] || undefined;

            let shouldCompress = /true|false/.test(el.dataset.compress)
                ? el.dataset.compress === "true"
                : undefined;


			// @ts-ignore
			if (typeof window.registerRemoteResource === 'function') {
				// @ts-ignore
				const canononicalUrl = await window.registerRemoteResource(href, originalUrl, {typeHint, shouldCompress});
				// make sure redirected content use the same url
				if (canononicalUrl !== href) {
					el.src = canononicalUrl;
				}
			}
		} catch (err) {
			console.warn(`Failed to process media element ${err}`);
		}
	}

}

function addExtras (doc, extras, originalUrl) {
	if (
		!extras ||
		(typeof extras !== 'object') ||
		Object.keys(extras).length === 0
	) {
		return;
	}
	// add composed html stuff
	doc.head.insertAdjacentHTML('beforeend', extras.stylesheets);

	const main = doc.querySelector('[role="doc-chapter"]');
    try {
        const origHead = doc.querySelector('#page-title');
        if (origHead) {
            origHead.insertAdjacentHTML('afterend', extras.header);
            origHead.remove();
        } else {
            main.insertAdjacentHTML('afterbegin', extras.header);
        }       
    } catch (error) {
        console.warn(`Unable to add header - malformed ${error}`, JSON.stringify(extras.header));
        throw error;
    }
    try {
        if (main) {
            main.insertAdjacentHTML('beforeend', extras.footer);
        } else {
            console.error(`FAILED TO ADD HEADER/FOOTER - NOT PROPERLY FORMATTED PAGE ${originalUrl}`);
        }
    } catch (error) {
        console.warn(`Unable to add footer - malformed ${error}`, JSON.stringify(extras.footer));
        throw error;
    }
}

// somehow some spam iframes made it in
function removeIframes (doc) {
	doc.querySelectorAll('iframe:not([src])').forEach(el => {
		el.remove();
	});
}

function escape(unsafe) {
	if (typeof unsafe !== 'string') {
		return unsafe;
	}
	if (!unsafe) {
		return unsafe;
	}
	return unsafe.replace(/[&<"']/g, function(x) {
		switch (x) {
		case '&': return '&amp;';
		case '<': return '&lt;';
		case '"': return '&quot;';
		default: return '&#039;';
		}
	});
}

function addDepthData(doc, config) {
	const el = doc.querySelector('body');
	if (!el) {
		console.warn('body element not found on doc - this should never happen');
		return;
	}
	el.classList.add(`epub-depth${config.depth}`);
	if (config.isSupplemental) {
		el.classList.add('epub-is-supplemental');
	}
	el.dataset.page = config.pageName;
}

function parseDoc (content, config) {
	let error;
	const {originalUrl} = config;

	// remove invalid chars
	content = content.replace(/[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm, '');

	const doc = (new DOMParser()).parseFromString(content, 'application/xhtml+xml');

	// check for parse error
	const parseError = doc.querySelector('parsererror');
	if (parseError) {
		error = parseError.textContent;
		parseError.remove();
		if (doc.body) {
			doc.body.insertAdjacentHTML('beforeend', `<aside><strong>ERROR - DATA CORRUPTED - DOCUMENT INCOMPLETE. Refer to <a href="${originalUrl}">Original Version</a></strong></aside>`);
		}
	}

	return {
		doc,
		error
	};
}

window.parseDoc = parseDoc;
window.processChapter = async function (content, extras, config = {}) {
	const {
		originalUrl,
		haltOnError = false
	} = config;

    Object.assign(globalThis, { _extras: extras, _content: content });

	let {doc, error} = this.parseDoc(content, config);

	if (error && haltOnError) {
		throw new Error(error);
	}

	const steps = [
		{name: 'fix doc type', fn: fixDocType},
		{name: 'cleanup head', fn: cleanupHead},
		{name: 'remove iframes', fn: this.removeIframes},
		{name: 'fix doctype', fn: fixDocType},
		{name: 'update links', fn() { return updateLinks(doc, originalUrl); }},
		{name: 'register remote links', fn() { return registerRemote(doc, originalUrl); }},
		{name: 'add depth data', fn() { return addDepthData(doc, config); }},
		{name: 'add header/footer', fn() { addExtras(doc, extras, originalUrl); }}
	];
	for(let {name, fn} of steps) {
		try {
			await fn(doc);
		} catch (err) {
			console.warn(`Error on ${name} for ${originalUrl}: ${err}`);
            if (haltOnError) {
				throw err;
			}
			error = error ? `${error}\n${err}` : `${err}`;
		}
	}
	return {
		content: (new XMLSerializer()).serializeToString(doc),
		error
	};
}

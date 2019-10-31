import * as config from './config.js';
import helpers from './helpers.js';

function parseUrl(url) {

}

const {ignorePaths, whitelist} = config.links;

function checkWhitelist(url) {
	return whitelist.some(re => re.test(url.origin));
}

export default async function () {
	const {origin, pathname, href: pageUrl} = document.location;
	const links = new Map();

	// get rid of interactive elements - should be gone already, but just in case
	for (let el of helpers.$$('[onclick]')) {
		el.removeAttribute('onclick');
	}

	for (let el of helpers.$$('a')) {
		// no onclicks!
		el.removeAttribute('onclick');
		el.removeAttribute('target');

		const href = el.getAttribute('href');
		if (!href) {
			console.log('Invalid anchor', el);
			if (el.hash) {
				console.log('but does have hash, so update');
				el.href = el.hash;
			}
			continue;
		}

		// invalid javascript link
		if (href.startsWith('javascript')) {
			const newEl = helpers.switchTag(el, 'span', false);
			newEl.style.textDecoration = 'underline';
			newEl.style.textDecorationStyle = 'dashed';
			continue;
		}

		if (href.startsWith('fragment:')) {
			href = `/${href}`;
		}

		const url = new URL(href, pageUrl);
		const isExternal = !checkWhitelist(url);
		// ignore externl links
		if (isExternal) {
			continue;
		}

		const isHash = url.hash && (url.pathname === pathname);

		// ignore hash
		if (isHash) {
			// normalize same page fragment links
			if (!href.startsWith('#')) {
				// REVIEW this might cause bad drama later on
				el.setAttribute('href', url.hash);
			}
			continue;
		}

		// don't include ignore links at all
		const isIgnore = ignorePaths.some(prefix => url.pathname.startsWith(prefix));
		if (isIgnore) {
			const newEl = helpers.switchTag(el, 'span');
			newEl.removeAttribute('href');
			newEl.style.textDecoration = 'underline';
			continue;
		}

		// if absolute url make relative
		if (href.startsWith(url.origin)) {
			el.setAttribute('href', `${url.pathname}${url.hash}`.replace(/^\//, ''));
		}

		links.set(url.toString(), url);

		// TODO this is for puppeteer integration
		if (window.registerLink) {
			try {
				await window.registerLink({
					type: 'link',
					url
				});
				// not doing here anymore
				//el.setAttribute('href', resp);
			} catch (err) {
				console.error(err);
			}
		}

	}
	for (let el of helpers.$$(document, 'iframe')) {
		const {origin, href: pageHref} = document.location;
		const url = new URL(el.src, pageHref);
		const isExternal = !checkWhitelist(url);
		if (isExternal) {
			// just remove external iframes.
			// QUESTION does this need to worry about youtube or other embeds?
			el.remove();
			return;
		}
	}
	console.log('Found these links', [...links.values()].map(u => `${u.pathname}${u.hash}`).join(','));
	return [...links.values()];
}

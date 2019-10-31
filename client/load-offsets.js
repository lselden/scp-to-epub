import {clearProblemScripts, removeUnnecessary} from './cleanup.js';
import {maxOffsets} from './config.js';

async function waitTillExists(selector, root = document.body, timeout = 30 * 1000) {
	const initialEl = root.querySelector(selector);
	if (initialEl) {
		return initialEl;
	}
	return new Promise((resolve, reject) => {
		let timer;
		const observer = new MutationObserver(entries => {
			for (let entry of entries) {
				if (!entry.addedNodes) {
					return;
				}
				for (let node of mutation.addedNodes) {
					if (node.matches(selector)) {
						clearTimeout(timer);
						resolve(node);
						observer.disconnect();
						return;
					}
				}
			}
		}, { root });
		observer.observe(root, {
			childList: true,
			subtree: true,
			attributes: false,
			characterData: false
		});
		timer = setTimeout(() => {
			observer.disconnect();
			reject(new Error(`Timeout waiting for ${selector}`));
		}, timeout);

	});
}

async function getOffsetContent(url) {
	const frame = document.createElement('iframe');
	frame.src = url;
	await new Promise((resolve, reject) => {
		frame.onload = () => resolve();

		frame.onerror = reject;
		document.body.appendChild(frame);
	});
	if (!frame.contentDocument) {
		throw new Error(`Unable to load page document ${url}`);
	}
	try {
		clearProblemScripts(frame.contentDocument);
	} catch (err) {
		console.warn('Failed removing prblem scripts in offset', err);
	}
	try {
		// console.log(`removing unnecessary ${url}`);
		removeUnnecessary(frame.contentDocument);
	} catch (err) {
		console.warn('Failed removing unnecessary content in offset', err);
	}

	const childListBoxes = frame.contentDocument.querySelectorAll('#page-content .list-pages-box');

	// const listBox = document.importNode(childListBox, true);
	const listBox = document.createElement('article');
	listBox.innerHTML = [...childListBoxes]
		.map(el => el.innerHTML)
		.join('\n');
	frame.remove();

	// switch tag type, also uses innerHTML to avoid cross-dom problems
	return listBox;
}

async function appendOffset(linkEl) {
	const {url, i, offsetId, pageName} = parseLink(linkEl, document.location);

	const content = await getOffsetContent(url);

	const skeleton = document.createElement('section');
	skeleton.className = 'offset-item';
	skeleton.innerHTML = `<h2 id="${offsetId}">${pageName} Offset ${i}</h2>`;
	skeleton.appendChild(content);
	const end = document.createElement('hr');
	end.style.clear = 'both';
	skeleton.appendChild(end);
	linkEl.setAttribute('href', `#${offsetId}`);
	return skeleton;
}

function parseLink(linkEl, baseUrl) {
	const url = `${baseUrl.origin}${linkEl.pathname}`;
	const i = url.replace(/.*\/offset\//, '');
	const pageName = baseUrl.pathname.replace(/\//g, '').slice(0, 32);
	const offsetId = `o_${pageName}_${i}`
	return {
		i,
		url,
		offsetId,
		pageName
	};
}

export default async function appendOffsets() {
	const pageName = document.location.pathname;
	const parent = document.querySelector('#page-content .list-pages-box') || document.querySelector('#page-content');
	const links = [];
	const urls = new Set();

	// allow skipping by including the data-ignore-offsets entry in there
	if (!parent || parent.dataset.ignoreOffsets) {
		return;
	}

	function getOffsetLinks(el) {
		return [...el.querySelectorAll(`a[href*=offset]`)]
			.filter(el => el.pathname.startsWith(pageName))
			.filter(el => {
				if (urls.has(el.href)) {
					console.debug('already saw', el.href);
					const {offsetId} = parseLink(el, document.location);
					el.setAttribute('href', `#${offsetId}`);
					return false;
				}
				urls.add(el.href);
				return true;
			});
	}

	// get all on page
	links.push(...getOffsetLinks(document));

	if (links.length === 0) {
		return;
	}

	let i = 0;
	while (i < links.length && i < maxOffsets) {
		console.log(`loading offset ${i} of ${links.length} - ${links[i].href}`);
		try {
			const skeleton = await appendOffset(links[i]);
			parent.appendChild(skeleton);
			const newLinks = getOffsetLinks(skeleton);
			if (newLinks.length > 0) {
				console.debug(`appending ${newLinks.length} new links`);
			}
			links.push(...newLinks);
		} catch (err) {
			console.warn(`Failed to load offset ${i}`, err);
		}
		i += 1;
	}
}

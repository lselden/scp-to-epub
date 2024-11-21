/* eslint-disable max-len */
/* eslint-env browser,chrome */

import * as config from './config.js';

import helpers from './helpers.js';
import clearScripts from './clear-scripts.js';
import clearStyles from './clear-styles.js';
import fixColors from './fix-colors.js';
import findLinks from './find-links.js';
import fixHtml4Anchors from './fix-html4-anchors.js';
import handleFigures from './figures.js';
import fixTabs from './fix-tabs.js';
// import fixRating from './fix-rating.js';
import handleFootnotes from './footnotes.js';
import {
	fixInlineSemanticTags,
	fixTT,
	annotateRedacted,
	annotateBlackbox,
	fixImages,
	revealHiddenText
} from './fix-inline.js';
import removeHidden from './remove-hidden.js';
import {uncollapse, uncollapseColmod} from './uncollapse.js';
import anomBar from './anom-bar.js';
import {clearProblemScripts, removeUnnecessary, cleanupWhitespace} from './cleanup.js';
import appendOffsets from './load-offsets.js';
import cleanTagPage from './clean-tag-page.js';
import inlineIframes from './inline-iframes.js';
import fixMedia from './fix-media.js';
import cleanForumPage from './clean-forum-post.js';
import detectChat from './detect-chat.js';
import fixLicensing from './fix-licensing.js';

function moveMain() {
	const origEl = document.querySelector(`#${config.mainContentId}`);
	const newEl = document.createElement('section');
	newEl.id = config.mainContentId;
	newEl.setAttribute('role', 'doc-chapter');
	newEl.setAttribute('aria-labelledby', 'page-title');
	newEl.append(...origEl.children);
	document.body.insertAdjacentElement('afterbegin', newEl);

	// if (helpers.$('#license-area')) {
	// 	newEl.append(helpers.switchTag(helpers.$('#license-area'), 'aside'));
	// }
	helpers.$$(document.body, `:scope > *:not(#${config.mainContentId})`).forEach(el => el.remove());
	//document.body.insertAdjacentElement('afterbegin', document.querySelector('#main-content'));
	// document.querySelector('#container').remove();
}

function moveBreadcrumbs() {
	const breadCrumbs = document.querySelector('#breadcrumbs');
	const main = document.querySelector('page-content');
	if (breadCrumbs && main) {
		main.appendChild(breadCrumbs);
	}
}

function fixHeader() {
	const el = document.getElementById('page-title');
	const newEl = document.createElement('h1');

	newEl.innerHTML = el.innerHTML;
	newEl.id = el.id;
	el.replaceWith(newEl);
}

function fixVoiceover() {
	helpers.$$('p > strong').forEach(el => {
		if (!/Item\s*#:?\s*$/i.test(el.textContent)) {
			return;
		}
		el.style.speakAs = 'literal-punctuation';
		// el.setAttribute('role', 'text');
		// el.setAttribute('aria-label', 'Item Number');


		// don't do this to a non-text node element
		if (el.nextSibling.nodeType !== el.TEXT_NODE) {
			return;
		}
		const text = el.nextSibling.textContent;
		const newEl = document.createElement('span');
		// @ts-ignore
		newEl.style.speakAs = 'spell-out';
		// newEl.setAttribute('role', 'text');
		// newEl.setAttribute('aria-label', `${text.replace(/(\d)/g, '$1 ')}`);
		newEl.textContent = text;
		el.nextSibling.replaceWith(newEl);
	});
}

// don't allow absolute widths
function fixWidth() {
	helpers.$$('[style*=width]').forEach(el => {
		const width = el.style.width;
		// i'm fine with percentage
		if (/(%|vw|vh)$/.test(width)) {
			return;
		}
		el.style.maxWidth = width;
		el.style.width = '';
	});
}

async function waitFrame() {
	return new Promise(done => {
		window.requestAnimationFrame(done);
	});
}

async function getOverrides() {
	try {
		/* eslint-disable-next-line */
		const out = await import(`../overrides/${WIKIREQUEST.info.requestPageName}.js?no404`);
		return out.default || out || {};
	} catch (err) {
		// no override
		if (err.message.startsWith('Failed to fetch')) {
			//console.debug('No Override');
			return {};
		}
		console.error(`Override Load Error: ${err}`);
		return {};
	}
}

// add epub namespace
function addNamespaces() {
	const el = document.querySelector('html');
	if (!el) { return; }
	el.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
	el.setAttribute('xmlns:epub', 'http://www.idpf.org/2007/ops');
	// TODO get lang from config?
	el.setAttribute('xml:lang', 'en');
	el.removeAttribute('lang');
}

(async function () {
	window.__epubFormattingComplete = false;
	// console.timeStamp('epub-format-start');
	console.time('epub-format');
	const {
		beforeParse = () => {},
		afterParse = () => {}
	} = await getOverrides();
	const steps = [
		{name: 'clear-problem-scripts', fn: clearProblemScripts},
		{name: 'make-xhtml', fn: addNamespaces},
		{name: 'before-parse', fn: beforeParse},
		{name: 'inline-iframes', fn: inlineIframes},
		{name: 'clean-tag-pages', fn: cleanTagPage},
		{name: 'clean-forum', fn: cleanForumPage},
		{name: 'fix-licensing', fn: fixLicensing},
		{name: 'move-main', fn: moveMain},
		{name: 'move-breadcrumbs', fn: moveBreadcrumbs },
		{name: 'remove-cruft', fn: removeUnnecessary},
		{name: 'append-offset-pages', fn: appendOffsets},
		{name: 'fix-anom-bar', fn: anomBar},
		{name: 'uncollapse', fn: uncollapse},
		{name: 'uncollapse-colmod', fn: uncollapseColmod},
		{name: 'detect-chat', fn: detectChat},
		// {name: '', fn: fixRating},
		{name: 'make-header-h1', fn: fixHeader},
		{name: 'fix-tabviews', fn: fixTabs},
		{name: 'footnotes', fn: handleFootnotes},
		{name: 'images', fn: handleFigures},
		{name: 'fix-obsolete-refs', fn: fixHtml4Anchors},
		{name: 'reveal-hidden-text', fn: revealHiddenText},
		{name: 'fix-redacted', fn: annotateRedacted},
		{name: 'fix-blackbox', fn: annotateBlackbox},
		{name: 'fix-inline', fn: fixInlineSemanticTags},
		{name: 'fix-tt', fn: fixTT},
		{name: 'remove-hidden', fn: removeHidden},
		{name: 'cleanup-whitespace', fn: cleanupWhitespace},
		{name: 'fix-width-styles', fn: fixWidth},
		{name: 'fix-image-sizes', fn: fixImages},
		{name: 'safe-colors', fn: fixColors},
		{name: 'fix-voiceover', fn: fixVoiceover},
		{name: 'fix-media', fn: fixMedia},
		{name: 'clear-scripts', fn: clearScripts},
		{name: 'clear-styles', fn: clearStyles},
		{name: 'after-parse', fn: afterParse},
		{name: 'register-links', fn: findLinks}
	];
	for (let {name, fn} of steps) {
		if (typeof fn !== 'function') {
			console.debug(`${name}: skipping invalid step`);
			continue;
		}
		try {
			// console.debug(`${name}: running...`)
			await Promise.resolve(fn());
		} catch (err) {
			console.log(`${name}: failed`, err);
		}
		await waitFrame();
	}
	window.__epubFormattingComplete = true;
	console.timeEnd('epub-format');
	// console.timeStamp('epub-format-end');
	if (window.__onEpubFormatted) {
		window.__onEpubFormatted();
	}
})();

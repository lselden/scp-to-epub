import * as helpers from './helpers.js';


export function clearProblemScripts(scope = document) {
	// this is just to keep nitro from blocking page DOM manipulation
	helpers.$$(scope, 'script[src]').forEach(el => {
		if (/nitro|google|onesignal|/.test(el.src)) {
			// console.log('this is a problem script', el.src);
			el.remove();
		}
	});
	helpers.$$(scope, 'body script').forEach(el => el.remove());
}

export function removeUnnecessary(scope = document.body) {
	[
		// remove forward/back navigation
		'.footer-wikiwalk-nav',
		// remove revision info
		'#page-info',
		'#page-content > .info-container',
		// remove print stuff
		'#print-options',
		'#print-head',
		'#action-area-top',
		'#action-area',
		'#u-credit-view',
		'#u-credit-otherwise',
		// folds table of contents
		'#toc-action-bar',
		'.printuser.avatarhover img',
		// license added elsewhere
		'#license-area',
		// don't need cloud tag
		'.pages-tag-cloud-box',
		// rating stuff
		'.page-rate-widget-box, .creditRate, .heritage-rating-module',
		// bottom stuff
		'.wd-adunit, .page-tags, #page-info-break, #page-options-container'

	].forEach(sel => helpers.remove(sel, scope));
}

export function cleanupWhitespace(scope = document) {
    ['body', '#main-content', '#page-content'].forEach(sel => {
		scope.querySelectorAll(`${sel} > br`)
			.forEach(br => br.remove());
		scope.querySelectorAll(`${sel} p`).forEach(p => {
			if (
				/\S/.test(p.innerText) ||
				p.querySelector('img, hr, figure, svg, audio, video, iframe, picture, source')
			) {
				return;
				// it's good
			}

			// long breaks intended as page break
			if (p.innerText.split(/(\n|\r\n)/).length > 2) {
				p.insertAdjacentHTML('beforebegin', '<hr class="epub-transition epub-whitespace-break" />');
			}

			p.remove();
		});
	});

}

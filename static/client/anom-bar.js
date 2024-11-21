// rewrites the anom-bar format with something less complex and text-reader friendly, and more apt to be viewable on all kinds of e-readers.
// ideally it'd be converted to SVG or something

import { $, $$ } from '../client/helpers.js';

const levels = {
	'clear-6': { txt: 'Cosmic Top-Secret', color: 'black' },
	'clear-5': { txt: 'Top-Secret', color: 'red' },
	'clear-4': { txt: 'Secret', color: 'yellow' },
	'clear-3': { txt: 'Confidential', color: 'yellow' },
	'clear-2': { txt: 'Restricted', color: 'blue' },
	'clear-1': { txt: 'Unrestricted', color: 'green' }
};

export default function () {
	//5 = red, 4 = orange (red?) 3 = yellow, 2 = blue, 1 = green
	const anomBar = document.querySelector('.anom-bar-container');
	if (!anomBar) {
		return;
	}
	const clearClass = (/(clear-\d)/.exec(anomBar.className) || [])[0];
	const clearance = clearClass && levels[clearClass];
	function text (sel) {
		const el = $(anomBar, sel);
		return el ? el.innerHTML : '';
	}
	const lines = [
		['anom-item', text('.item'), text('.number')]
	];
	if (clearance) {
		lines.push(['anom-level', text('.level'), clearance.txt]);
	}
	$$(anomBar, '[class*=-class]').forEach(el => {
		// skip this parent
		if (el.matches('.main-class')) {
			return;
		}
		const key = el.querySelector('.class-category');
		const val = el.querySelector('.class-text');
		lines.push([el.className, key.innerHTML, val.innerHTML]);
	});

	// TODO hahah let's make it a definition list! j/k
	const head = `<div class="anom-bar-replace border-${clearance ? clearance.color : 'gray' }">${
		lines.map(([name, key, val]) => {
			return `\t<p class=${name}><strong>${key}</strong>&nbsp;<span>${val}</span></p>`;
		}).join('\n')
	}</div>`;

	anomBar.insertAdjacentHTML('afterend', head);
	anomBar.remove();
}

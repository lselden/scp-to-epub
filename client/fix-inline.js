import * as helpers from './helpers.js';

export function fixInlineSemanticTags() {

	document.querySelectorAll('[style]').forEach(el => {
		function toInt(cssVal) {
			const [_, val, unit] = /^(\d+)(.*)$/.exec(`${cssVal || ''}`.trim()) || [];
			return {
				val,
				unit
			};
		}
		// @ts-ignore
		const csp = el.computedStyleMap();
		function getComputed(prop) {
			const val = csp.get(prop);
			return val ? val.toString() : '';
		}

		// @ts-ignore
		const inlineStyle = el.style;
		const keys = [...inlineStyle];
		const isStrike = /line-through/.test(inlineStyle.textDecorationLine);
		const isUnderline = /underline/.test(inlineStyle.textDecorationLine);
		const isDel = /^(del|s)$/.test(el.tagName);
		const isInline = getComputed('display') === 'inline';
		// won't handle auto, but whatefver
		const isMargin = (
			(
				/^[1-9]/.test(getComputed('margin-left')) ||
				/^[1-9]/.test(getComputed('margin-right'))
			) &&
			keys.some(k => /margin/.test(k))
		);
		const isPadding = (
			(
				/^[1-9]/.test(getComputed('padding-left')) ||
				/^[1-9]/.test(getComputed('padding-right'))
			) &&
			keys.some(k => /padding/.test(k))
		);

		const hasColor = !!inlineStyle.color;

		if (hasColor && el.tagName === 'SPAN') {
			helpers.switchTag(el, 'mark');
		}
		if (isStrike && !isDel && isInline) {
			helpers.switchTag(el, 'del');
		}

		if (isUnderline && el.tagName === 'SPAN') {
			helpers.switchTag(el, 'u');
		}

		if (isMargin) {
			const isLeft = toInt(getComputed('margin-left')).val;
			const isRight = toInt(getComputed('margin-right')).val;

			// leave top/bottom margins
			const marginTop = getComputed('margin-top');
			const marginBottom = getComputed('margin-bottom');
			Object.assign(/** @type {HTMLElement} */(el).style, {
				margin: '',
				marginTop,
				marginBottom
			});
			if (isLeft) {
				el.classList.add('left-margin');
			}
			if (isRight) {
				el.classList.add('right-margin');
			}
		}

		if (isPadding) {
			const isLeft = toInt(getComputed('padding-left')).val;
			const isRight = toInt(getComputed('padding-right')).val;

			// leave top/bottom margins
			const paddingTop = getComputed('padding-top');
			const paddingBottom = getComputed('padding-bottom');
			Object.assign(/** @type {HTMLElement} */(el).style, {
				padding: '',
				paddingTop,
				paddingBottom
			});
			if (isLeft) {
				el.classList.add('left-padding');
			}
			if (isRight) {
				el.classList.add('right-padding');
			}
		}

		if (el.matches('img')) {
			el.setAttribute('style', '');
			// TODO this will miss some images
			if (!el.getAttribute('alt')) {
				const imgurl = new URL(el.src || '', document.location.href);
				el.setAttribute('alt', imgurl.pathname.replace(/^.*\//, ''));
			}
		}
	});
}

export function fixImages() {
	helpers.$$('img[width], img[height]').forEach(el => {
		const width = el.getAttribute('width') || '';
		const height = el.getAttribute('height') || '';
		if (width.endsWith('px')) {
			el.setAttribute('width', width.slice(0, -2));
		} else if (/\D/.test(width)) {
			el.removeAttribute('width');
		}
		if (height.endsWith('px')) {
			el.setAttribute('height', height.slice(0, -2));
		} else if (/\D/.test(height)) {
			el.removeAttribute('height');
		}
	});
}

export function fixTT() {
	helpers.$$('tt').forEach(el => {
		helpers.switchTag(el, 'samp');
	});
}

export function revealHiddenText() {
	helpers.$$('[style*=font-size]').forEach(el => {
		const [_, raw, unit] = (el.style.fontSize.match(/([\d.]+)(.+)/) || []);
		if (raw === undefined) {
			return;
		}
		let num = parseFloat(raw);
		const isHidden = (
			(unit.includes('%') && num < 66) ||
			(/px|pt/.test(unit) && num < 15) ||
			(/em|ex|rem/.test(unit) && num < 0.66)
		);
		if (isHidden) {
			el.style.fontSize = '';
			el.classList.add('hidden-text');
		}
	});
}

export function annotateRedacted(el = document.body) {
	if (!el) { return; }
	if (el.nodeType === el.TEXT_NODE) {
		if (!/█/.test(el.textContent)) {
			return;
		}

		const html = helpers.escape(el.textContent).replace(/(█+)/g, '<del class="redacted" aria-label="REDACTED">$1</del>');
		if (el.nextElementSibling) {
			el.nextElementSibling.insertAdjacentHTML('beforebegin', html);
		} else {
			el.parentElement.insertAdjacentHTML('beforeend', html);
		}
		el.remove();
	} else if (el.hasChildNodes()) {
		el.childNodes.forEach(child => {
			// skip already processed nodes
			// @ts-ignore
			if (child.tagName === 'DEL') {
				return;
			}
			// @ts-ignore
			annotateRedacted(child);
		});
	}
}

export function annotateBlackbox(el = document.body) {
	helpers.$$(el, '.bblock, .dblock').forEach(block => {
		const newEl = helpers.replaceWith(block, 'mark');
		newEl.className = `${block.className} blackbox`;
	});
}

export function removeSpanHrefs(el = document.body) {
	// epubcheck complains about these
	helpers.$$(el, 'span[href]').forEach(el => {
		el.removeAttribute('href');
	});
}

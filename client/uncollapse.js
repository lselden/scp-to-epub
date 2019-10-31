
import config from './config.js';

import helpers, {$, $$, rand} from './helpers.js';

export function uncollapse() {
	const blocks = document.querySelectorAll('.collapsible-block');
	blocks.forEach(block => {
		const folded = block.querySelector(':scope .collapsible-block-folded .collapsible-block-link');
		const unfolded = block.querySelector(':scope .collapsible-block-unfolded .collapsible-block-unfolded-link');
		const contents = block.querySelectorAll(':scope .collapsible-block-unfolded > *:not(.collapsible-block-unfolded-link)');

		if (!folded || !unfolded) {
			console.debug('Unable to unfold block, invalid markup');
			helpers.$$(block, 'div[class][style]').forEach(el => {
				if (el.style.display === 'none') {
					el.style.display = '';
				}
			});
			return;
		}

		const newEl = makeCollapseSection(
			folded.innerText,
			unfolded.innerText,
			contents
		);

		block.replaceWith(newEl);
	});
}

function makeCollapseSection(foldText = '', unfoldText = '', contents = []) {
	const headerId = `collapse-${rand()}`;
	const newEl = document.createElement('section');
	newEl.classList.add('epub-collapse');
	Object.assign(newEl, {
		className: 'epub-collapse',
		role: 'region',
		'aria-labelledby': headerId
	});

	const beginRe = /^[+\W]\s*/;
	foldText = foldText.replace(beginRe, '');
	unfoldText = unfoldText.replace(beginRe, '');
	// const isBoringFoldText = (
	// 	/^(Hide|Close)/i.test(unfoldText.replace(foldText, ''))
	// );

	// HACK there's a more elegant way to do this
	const foldTokens = foldText.split(/\s+/);
	const unfoldTokens = unfoldText.split(/\s+/);
	const isSame = foldText === unfoldText;
	const isSameSaveFirst = foldTokens.every((token, i) => {
		return i === 0 || unfoldTokens[i] === foldTokens[i];
	});
	const isOnlyFirstVerb = unfoldTokens.length === 1;

	// remove "Show", "Open", "Display" etc.
	if (!isSame && (isSameSaveFirst || isOnlyFirstVerb)) {
		// NOTE this doesn't maintain exact whitespace (if not just spaces)...I think that's fine
		foldText = foldTokens.slice(1).join(' ');
	}

	const hasUnfolded = !isSame && !isSameSaveFirst;
	const foldTag = hasUnfolded ? 's' : 'span';
	newEl.innerHTML = (`
		<h2 id="${headerId}"
			class="epub-collapse-header ${hasUnfolded ? 'epub-has-unfolded' : ''}">
			<${foldTag} class="epub-collapse-folded-text">${foldText}</${foldTag}>
		${ hasUnfolded ?
			`<ins role="doc-subtitle">${unfoldText}</ins>` :
			''
		}
		</h2>
	`);
	if (Array.isArray(contents) || contents instanceof NodeList) {
		contents.forEach(el => newEl.appendChild(el));
	}
	return newEl;
}

export function uncollapseColmod(target) {
	const list = target ? [target] : $$('.colmod-block');
	list.forEach(block => {
		// fix nested blocks first
		$$(block, '.colmod-block').forEach(child => {
			uncollapseColmod(child);
		});
		const titleEl = $(block, '.colmod-link-top ');
		const [
			// HACK way to not care if we don't find the element
			folded = { innerText: '' },
			unfolded = { innerText: ''  }
		] = [...$$(titleEl, 'a')];

		const newEl = makeCollapseSection(folded.innerText, unfolded.innerText, contents);

		block.replaceWith(newEl);
	});
}

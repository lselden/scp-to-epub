/* eslint-disable max-len */
/* eslint-env browser,chrome */

import * as config from './config.js';

import {$$, rand, remove, switchTag} from './helpers.js';

export default function () {
	// just empty out bibliography references
	$$('a.bibcite').forEach(ref => {
		const noteNumber = ref.innerText;
		ref.setAttribute('href', `#bibitem-${noteNumber}`);
		ref.onclick = '';
		// const newEl = switchTag(el, 'span', false);
		// newEl.className = 'bibcite';
	});

	const endnotes = [];
	const footrefs = $$('sup.footnoteref');
	const randId = rand().slice(0,4);
	[...footrefs].reverse().forEach(ref => {
		const refA = ref.querySelector(':scope > a.footnoteref');
		const footnote = document.getElementById(refA.id.replace('footnoteref', 'footnote'));
		const noteNumber = refA.innerText;
		const refId = refA.id.replace('footnoteref', `footnoteref-${randId}`);
		const targetId = refA.id.replace('footnoteref', `footnote-${randId}`);

		// append footnote after paragraph context
		const contextTypes = 'div, section, article, main, body';
		const afterTypes = 'table, ul, dl, ol, pre, blockquote, nav, aside, p';
		const context = ref.closest(`${contextTypes}, ${afterTypes}`);
		const shouldInsertAfter = context.matches(afterTypes);

		// replace ref with epub-style link
		ref.insertAdjacentHTML(
			'beforebegin',
			`<a id="${refId}" href="#${targetId}" role="doc-noteref" epub:type="noteref">[${noteNumber}]</a>`
		);
		ref.remove();

		if (footnote) {
			const backA = footnote.firstElementChild;
			// just want content
			if (backA && /^A$/i.test(backA.tagName)) {
				backA.remove();
			}

			const content = footnote.innerHTML.replace(/^\./, '');

			endnotes.unshift({
				targetId,
				refId,
				noteNumber,
				content
			});

			if (config.footnotes.inline) {
				context.insertAdjacentHTML(shouldInsertAfter ? 'afterend' : 'beforeend', `
				    <aside id="${targetId}" role="doc-footnote" epub:type="footnote" class="inline-footnote">
						<p>
							<a href="#${refId}" role="doc-backlink" title="Go to note reference">${noteNumber}</a>.&nbsp;${content}</p>
				    </aside>
				`);
			}
		}
	});

	const endId = `endnotes-${randId}`;
	const endnotesHTML = endnotes.length === 0 ? '' : `
	<section role="doc-endnotes" epub:type="endnotes" aria-labelledby="${endId}">
		<h2 id="${endId}">Footnotes</h2>
		<ol role="list">${
			endnotes.map(note => {
				const suffix = config.footnotes.inline ? '-end' : ''
				return `<li id="${note.targetId}${suffix}" role="listitem" epub:type="endnote">
					<p>${note.content} <a href="#${note.refId}" role="doc-backlink" title="Go back to note reference" aria-label="Go back to note reference">↖</a></p>
				</li>`;
			}).join('\n')
		}</ol>
	</section>`;

	// remove foot section completely
	const footSections = document.querySelectorAll('.footnotes-footer');

	footSections.forEach(el => remove(el));
	document.querySelector(`#${config.mainContentId}`).insertAdjacentHTML('beforeend', endnotesHTML);
}

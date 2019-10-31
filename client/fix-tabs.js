
import {$$, rand} from './helpers.js';

export default function () {
	const tabviews = $$('.yui-navset');
	tabviews.forEach(tabview => {
		const container = document.createElement('div');
		container.classList.add('epub-tabs');
		tabview.insertAdjacentElement('beforebegin', container);

		const headers = $$(tabview, '.yui-nav li');
		const contents = $$(tabview, '[id*="wiki-tab"]');

		const tabs = [...headers].map((header, i) => {
			const titleEl = header.querySelector(':scope :not(a)') || header;
			const randId = rand();
			const contentEl = contents[i];
			return {
				navId: `nav-${randId}`,
				tabId: `tab-${randId}`,
				title: titleEl.innerHTML,
				content: contentEl.innerHTML
			};
		});

		tabview.remove();

		container.innerHTML = `
		<section class="epub-tabs">
			${tabs.map(tab => {
				const {tabId, navId, title, content} = tab;
				return `<section id="${tabId}" role="tabpanel" aria-labelledby="${tabId}-head">
					<h3 id="${tabId}-head"><span class="epub-tab-head">${title}</span></h3>
					${content}
				</section>`;
			}).join('\n')}
		</section>
		`;
	});
}

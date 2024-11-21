import * as helpers from '../client/helpers.js';

export default {
	async beforeParse() {
		document.querySelectorAll('.wiki-content-table')
			.forEach(el => {
				const rows = el.querySelectorAll('tr');
				const img = (rows.length > 0) && rows[0].querySelector('img');
				// ensure its a figure
				if (rows.length !== 2 || !img) {
					return;
				}
				const newEl = document.createElement('figure');
				newEl.classList.value = 'epub-figure';
				helpers.append(newEl, img);
				newEl.insertAdjacentHTML(
					'beforeend',
					`<figcaption class="scp-image-caption">${rows[1].innerText}</figcaption>`
				);

				el.parentElement.replaceWith(newEl);
			});
	},
	async afterParse() {


	}
}

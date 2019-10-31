import {$, $$, remove} from './helpers.js';

function getImageTables(scope = document.body) {
	const possible = $$(scope, '.wiki-content-table');
	return [...possible]
		.map(container => {
			const rows = $$(container, 'tr');
			if (rows.length !== 2) {
				return;
			}
			const image = $(rows[0], '.image');
			const caption = $(rows[1], 'td, th');
			if (!image || !caption) {
				return;
			}
			container.classList.remove('wiki-content-table');
			return { container, image, caption }
		})
		.filter(x => x);
}

function getImageBlocks(scope = document.body) {
	const figures = $$(scope, '.scp-image-block');
	return [...figures]
		.map(container => {
			const nestParent = container.closest('[class*=pictures4]');
			// remove wrapper parent
			if (nestParent) {
				nestParent.parentNode.insertBefore(container, nestParent);
				remove(nestParent);
			}

			const image = $(container, '.image, .enlarge');
			const caption = $(container, '.scp-image-caption');
			if (!image || !caption) {
				return;
			}
			return { container, image, caption };
		})
		.filter(x => x);
}

export default function () {
	// get rid of double helper images (found in "taboo" page) - remove mobile one
	const redundantNested = $$('[class*=pictures4] + [class*=pictures4]');
	redundantNested.forEach(el => remove(el));

	const figures = [...getImageTables(), ...getImageBlocks()];

	figures.forEach(({container, image, caption}) => {
		const newEl = document.createElement('figure');
		newEl.classList.value = `epub-figure ${container.classList.value.replace(/block-(left|right|center)/, 'epub-figure-$1')}`;
		// container.parentNode.insertBefore(newEl, block);

		image.removeAttribute('style');
		image.removeAttribute('width');
		image.removeAttribute('height');
		newEl.appendChild(image);
		newEl.insertAdjacentHTML(
			'beforeend',
			`<figcaption class="scp-image-caption">${caption.innerHTML}</figcaption>`
		);

		container.replaceWith(newEl);
		// remove(block);
	});
}

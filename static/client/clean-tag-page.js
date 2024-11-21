export default function () {
	// only process tag pages
	if (!document.location.pathname.startsWith('/system:page-tags')) {
		return;
	}
	const contentEl = document.getElementById('page-content');
	const listEl = document.getElementById('tagged-pages-list');
	if (!contentEl || !listEl) {
		return;
	}
	const titleEl = contentEl.querySelector('h2');
	if (titleEl) {
		const newTitleEl = document.createElement('div');
		newTitleEl.id = 'page-title';
		newTitleEl.innerHTML = titleEl.innerHTML;
		contentEl.insertAdjacentElement('beforebegin', newTitleEl);
	}

	const links = [...listEl.querySelectorAll('a')];

	contentEl.innerHTML = `<ul id="tagged-pages-list">${
		links.map(el => `<li>${el.outerHTML}</li>`).join('\n')
	}</ul>`;
}

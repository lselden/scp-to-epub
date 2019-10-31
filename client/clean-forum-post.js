import { switchTag, $$ } from './helpers.js';

export default function() {
	// only forum links
	if (!document.location.pathname.startsWith('/forum/')) {
		return;
	}
	$$('.options, .statistics, .pager:not(:first-child), #thread-container-posts .pager span:not(.pager-no), .new-post').forEach(el => el.parentNode && el.remove());

	// remove extraneous links
	$$('.printuser.avatarhover')
		.forEach(el => el.innerHTML = `<strong>${escape(el.textContent)}</strong>`);

	// give forum posts titles
	$$('.title').forEach(el => switchTag(el, 'h3'));

	// if pointing to a single post then just delete everything else
	if (document.location.hash) {
		const id = document.location.hash;
		const postEl = document.querySelector(id);
		$$(`.post:not(${id})`).forEach(el => el.remove());
		postEl.insertAdjacentHTML('beforebegin', '<hr class="epub-transition epub-whitespace-break" />');
		postEl.insertAdjacentHTML('afterend', '<hr class="epub-transition epub-whitespace-break" />');
	}
}

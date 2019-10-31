import {$$, switchTag} from '../client/helpers.js';

export default {
	beforeParse() {
		$$('div[style]').forEach(el => {
			el.style = '';
			$$(el, 'p > span[style] > strong, p > strong > span[style]').forEach(head => {
				const txt = head.innerHTML;
				const newEl = switchTag(head.closest('p'), 'h2');
				newEl.innerHTML = `<u>${txt}</u>`;
				newEl.style.textAlign = 'center';
			});
		});
		$$('.list-pages-item br').forEach(el => el.remove());
	},
	afterParse() {

	}
}

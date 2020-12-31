import {$$} from '../client/helpers.js';

export default {
	async beforeParse() {
		$$('base').forEach(el => el.remove());
	},
	async afterParse() {
		$$('[align], [position], [p]').forEach(el => {
			const align = el.getAttribute('align');
			if (align) {
				el.style.textAlign = align;
			}
			['align', 'position', 'p'].forEach(attr => el.removeAttribute(attr));
		});
	}
}

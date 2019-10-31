import * as helpers from '../client/helpers.js';

export default {
	async beforeParse() {
	},
	async afterParse() {
		helpers.$$('form input[type=button]').forEach(el => {
			let parent = el.parentElement;
			parent.innerHTML = '<a href="/incident-log-1264-d-2" style="border: 3px outset currentColor; padding: 1ex; text-decoration: none; -webkit-appearance: button" class="bg-lightgray border-gray color-black">ACCESS SECURE SERVER</a>';
			parent = helpers.switchTag(parent, 'div');
			el = parent.querySelector('a');
			parent.style.textAlign = 'center';
		});

	}
}

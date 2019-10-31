import * as helpers from '../client/helpers.js';

export default {
	beforeParse() {
		helpers.$$('.speech').forEach(el => {
			const wrapper = document.createElement('aside');
			const newEl = document.createElement('figure');
			const imgEl = el.querySelector('img');
			if (imgEl) {
				imgEl.classList.add('.image');
				newEl.appendChild(imgEl);
			}
			if (el.matches('.no-body')) {
				helpers.remove('.small', el);
			}
			if (newEl.matches('.no-title')) {
				helpers.remove('.big', el);
			}
			const vars = {
				title: helpers.escape((helpers.$('.big', el) || {}).textContent || ''),
				body: helpers.escape((helpers.$('.small', el) || {}).textContent || '')
			};
			newEl.insertAdjacentHTML('beforeend', `<figcaption style="padding: 0 1em"><div class="black bg-white border-gray" style="text-align: center; margin: 0.25em; padding: 0.25em; border-radius: 3em; border: 0.125em solid gray">${
				vars.title ? `<strong style="font-size: 200%">${vars.title}</strong>` : ''
			}${
				vars.body ? `<p style="font-size: 115%">${vars.body}</p>` : ''
			}</div></figcaption>`);
			wrapper.appendChild(newEl);
			el.replaceWith(wrapper);
		});
	},
	afterParse() {

	}
}

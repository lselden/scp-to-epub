import {appendOffset} from '../client/load-offsets.js';

export default {
	async beforeParse() {
		document.querySelectorAll('.collapsible-block-unfolded')
			.forEach(x => x.style.display = 'initial');
		// document.querySelectorAll('.colmod-block .folded')
		// 	.forEach(el => {
		// 		el.classList.remove('folded');
		// 		el.classList.add('unfolded');
		// 	});

		const badlink = document.querySelector('[href=\\#Access]');
		badlink.replaceWith(`Access ${badlink.textContent}`);

		const pwdForm = document.querySelector('.html-block-iframe');
		const newEl = document.createElement('a');
		newEl.textContent = "Enter Password";
		newEl.href = `${document.location.pathname}/offset/1`;
		pwdForm.replaceWith(newEl);

		const supplement = await appendOffset(newEl);
		newEl.closest('.list-pages-box').appendChild(supplement);


		// http://www.scpwiki.com/5000contestjakdragonx-irondruid/offset/1
	},
	async afterParse() {
		document.querySelectorAll('.hidden-text:empty')
			.forEach(el => el.remove());

		document.querySelectorAll('.agent')
			.forEach(el => {
				el.classList.add('green', 'border-green');
				Object.assign(el.style, {
					border: '1px solid currentColor',
					padding: '1ex'
				});
			});
	}
}

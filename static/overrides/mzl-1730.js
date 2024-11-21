export default {
	async beforeParse() {
		document.querySelector('.warning .bottom').remove();
		document.querySelectorAll('span[style="font-size:120%;"]')
			.forEach(el => {
				if (
					el.nextElementSibling &&
					el.nextElementSibling.tagName === 'BR'
				) {
					el.nextElementSibling.remove();
				}
				el.outerHTML = `<h3>${el.innerHTML}</h3>`;
			});
		document.querySelectorAll('span[style="font-size:80%;"]')
			.forEach(el => { el.outerHTML = `<p role="doc-subtitle">${el.innerHTML}</p>`; });
	},
	async afterParse() {
		// HACK to manually add back some CSS. it's dumb
		const el = document.createElement('style');
		el.type = 'text/css';
		el.innerHTML = `
			.content-log {
				display: inline-block;
				border: dashed 0.0625rem currentColor;
				padding: 1rem;
				margin: auto;
				margin-bottom: 1rem;
				width: auto;
				border-radius: 0.625rem;
			}
			.content-log .bobble-inset {
				background: rgba(127, 127, 127, 0.15);
			}
			.content-log, .content-log .bobble * {
				font-family: "Courier New", monospace;
				font-weight: bold;
			}
			p[role="doc-subtitle"] {
				font-size: 80%;
			}
		`;
		document.head.appendChild(el);

	}
}

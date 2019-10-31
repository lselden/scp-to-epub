import {$$, switchTag} from "../client/helpers.js";

export default {
	async beforeParse() {
		$$('blockquote').forEach(el => {
			el.style.backgroundColor = '#f4f4f4';
		});
		$$('[style*="font-family: Courier"], [style*="scp_trans.png"').forEach(el => {
			el.classList.add('hippo-card');
			el.classList.add('monospace');

			let color = el.style.color;
			let bg = el.style.background;
			let border = el.style.border;
			const hasImg = !!el.style.backgroundImage;

			if (hasImg) {
				el.classList.add('scp-bg');
			}

			if (color === 'black' && bg === 'white') {
				color = '';
				bg = '';
			}

			if (border === 'black') {
				border = '#666';
			}

			el.style = '';
			if (color) {
				el.style.color = color;
			}
			if (bg) {
				el.style.background = bg;
			}
			if (border) {
				el.style.border = border;
			}

		});
	},
	async afterParse() {
		// uses background image - explicitly mark to save the image
		let bgUrl = 'http://scp-wiki.wdfiles.com/local--files/the-great-hippo/scp_trans.png';
		if (typeof window.keepResource === 'function') {
			const bookPath = await window.keepResource(bgUrl);
			if (bookPath) {
				bgUrl = bookPath;
			}
		}

		const el = document.createElement('style');
		el.type = 'text/css';
		el.innerHTML = `
			.hippo-card {
				padding: 5pt;
				margin: 5pt;
				font-family: monospace;
				font-weight: bold;
			}
			.scp-bg {
				background-image: url(${bgUrl});
				background-repeat: no-repeat;
				background-position: center;
				background-size: contain;
			}
		`;
		document.head.appendChild(el);

	}
}

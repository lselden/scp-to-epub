import {$$, switchTag} from '../client/helpers.js';

const snapchatColors = {
	incoming: '#18aaf8',
	outgoing: '#f23b57'
}

function addColors(el) {
	if (el.matches('snapchat-incoming')) {

	}
	if (el.classList.contains('snapchat-incoming')) {
		el.style.borderColor = '#18aaf8';
		el.style.borderLeftColor = '#18aaf8';
	}
	if (el.classList.contains('snapchat-outgoing')) {
		el.style.borderLeftColor = '#f23b57';
	}
}

export default {
	async beforeParse() {
		$$('.snapchat, .snapchat-sender').forEach(el => {
			const isHeader = el.matches('.snapchat-sender');
			const tag = isHeader ? 'strong' : 'blockquote';
			const prop = isHeader ? 'color' : 'border-color';
			const color = el.matches('.snapchat-incoming') ?
				snapchatColors.incoming :
				snapchatColors.outgoing;

			const newEl = switchTag(el, tag);
			newEl.style[prop] = color;
		});
	},
	async afterParse() {
		// HACK to manually add back some CSS. it's dumb
		const el = document.createElement('style');
		el.type = 'text/css';
		el.innerHTML = `
			p {
				line-height: 141%;
			}
			.snapchat-sender {
				text-transform: uppercase;
				margin-bottom: -1rem;
				padding-left: 1.5em;
				display: inline-block;
			}
			.snapchat {
				border-radius: 2pt;
				font-size: larger;
				max-width: 28rem;
				border-width: 0 0 0 5pt;
				border-style: solid;
			}
		`;
		document.head.appendChild(el);

	}
}

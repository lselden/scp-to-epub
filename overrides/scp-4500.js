export default {
	async beforeParse() {
		function uncollapse() {
			document.querySelectorAll('[class^=block]').forEach(el => el.classList.toggle('collapsed'));
			for (let el of [...document.querySelectorAll('a[onclick]:not([href])')]) {
				el.after(...el.childNodes);
				el.remove();
			}
		}
		const frames = /** @type {HTMLIFrameElement[]} */([...document.querySelectorAll('.html-block-iframe')]);
		for (let frame of frames) {
			const framepath = (new URL(frame.src)).pathname.replace(/.*\/html\//, '');
			if (typeof frameEvaluate === 'function') {
				await frameEvaluate(framepath, uncollapse.toString());
			}

			// @ts-ignore
			await window.inlineFrameContents(framepath, 'body');
		}
	},
	async afterParse() {


	}
}

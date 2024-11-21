

export default {
	async beforeParse() {
		function cleanup() {
			function switchTag(el, newTag, copyAttrs = true) {
				const newEl = document.createElement(newTag);
				newEl.innerHTML = el.innerHTML;
				if (copyAttrs) {
					[...el.attributes].forEach(attr => {
						newEl.setAttributeNode(attr.cloneNode());
					});
				}
				el.replaceWith(newEl);
				return newEl;
			}

			document.querySelectorAll('.options a').forEach(el => {
				el.removeAttribute(',');
			});
			document.querySelectorAll('.options, .statistics, .pager:not(:first-child), #thread-container-posts .pager span:not(.pager-no), .new-post').forEach(el => el.parentNode && el.remove());

			// remove extraneous links
			document.querySelectorAll('.printuser.avatarhover')
				.forEach(el => el.innerHTML = `<strong>${escape(el.textContent)}</strong>`);

			// give forum posts titles
			document.querySelectorAll('div.title').forEach(el => switchTag(el, 'h3'));
		}
		const frames = /** @type {HTMLIFrameElement[]} */([...document.querySelectorAll('.html-block-iframe')]);
		for (let frame of frames) {
			const framepath = (new URL(frame.src)).pathname.replace(/.*\/html\//, '');
			if (typeof frameEvaluate === 'function') {
				await frameEvaluate(framepath, cleanup.toString());
			}

			// @ts-ignore
			await window.inlineFrameContents(framepath, 'body');
		}
		cleanup();
	},
	async afterParse() {
		let inel = /** @type {HTMLInputElement} */(document.querySelector('input.text.form-control'));
		let newEl = document.createElement('code');
		newEl.innerHTML = inel.value;
		inel.replaceWith(newEl);

		inel = document.querySelector('#fakepost');
		inel.insertAdjacentHTML('afterend', '<blockquote class="bg-white black"><code>And so the question remains: Are you worth remembering?</code></blockquote>');
		inel.remove();
		document.querySelectorAll('.edit-help-34, .edit-help-34 + .buttons').forEach(el => el.remove());

	}
}

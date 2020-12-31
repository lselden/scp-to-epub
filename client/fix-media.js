export function createAudioFigure(src, caption = "Audio Attachment - External Link") {
	const newEl = document.createElement('figure');
	newEl.style.textAlign = 'center';
	newEl.innerHTML = `<audio src="${src}" controls="controls"><p>[Audio File]</p></audio><figcaption><a href="${src}" data-external="true" rel="nofollow">${caption}</a></figcaption>`;
	return newEl;
}

export default function () {
	document.querySelectorAll('audio').forEach(el => {
		let src = el.currentSrc || el.src;
		if (!src) {
			// log?
			return;
		}

		// make absolute
		src = new URL(src, document.location.href);

		const newEl = createAudioFigure(src);

		el.replaceWith(newEl);
	});
}

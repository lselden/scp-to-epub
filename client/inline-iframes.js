import * as helpers from './helpers.js';

async function inlineIframes () {
	const frameEvaluate = window['frameEvaluate'];
	if (typeof frameEvaluate !== 'function') {
		return;
	}

	const frames = document.querySelectorAll('.html-block-iframe');
	for (let frame of [...frames]) {
		// skip non matching frame types
		if (!/\/html\/[a-f0-9]+/.test(frame.src)) {
			continue;
		}
		const framepath = (new URL(frame.src)).pathname.replace(/.*\/html\//, '');
		await window.inlineFrameContents(framepath, 'body');
		await new Promise(done => requestAnimationFrame(done));
	}

}

export default inlineIframes;

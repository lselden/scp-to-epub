import * as helpers from '../client/helpers.js';

export default {
	async beforeParse() {
		const frameEvaluate = window['frameEvaluate'];
		if (typeof frameEvaluate !== 'function') {
			console.debug('cannot inline actual contents of iframe');
			return;
		}
		async function unlock () {
			console.log('unlocking');
			document.querySelectorAll('.SECTION.HIDDEN').forEach(el => {
				console.log('here el', el.id, el.className, el);
				if (el.id !== 'BUTTONS') {
					el.classList.remove('HIDDEN');
				}
			});

			const toFix = document.querySelectorAll('span[type]');
			if (toFix && toFix.length) {
				toFix.forEach(el => el.removeAttribute('type'));
			}

			// document.getElementById('stopTimer').click();
			await new Promise(done => requestAnimationFrame(done));
		}
		/* get last part of path because origin can vary */
		const frame = document.querySelector('.html-block-iframe');
		// const frameParent = frame.parentElement;

		const framepath = (new URL(frame.src)).pathname.replace(/.*\/html\//, '');
		// await frameEvaluate(framepath, unlock.toString());
		await window.inlineFrameContents(framepath, 'body');
		// console.log('done inlining');
		await unlock();
		await new Promise(done => requestAnimationFrame(done));
		// if (frameParent && frameParent.matches && frameParent.matches('p')) {
		// 	helpers.switchTag(frameParent, 'div');
		// }
		/* uncollapse addendums */
		// document.querySelectorAll('[class^=addend]')
		// 	.forEach(el => el.classList.toggle('collapsed'));

	},
	afterParse() {
		const el = helpers.$('#proceed');
		if (el) {
			const newEl = helpers.switchTag(el, 'h3', false);
			newEl.style.textAlign = 'center';
		}
	}
}

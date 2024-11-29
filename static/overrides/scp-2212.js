export default {
	async beforeParse() {
		async function unlock () {
			// ['containment', 'interview', 'image', 'cross', 'class'].forEach(el => { docCookies.setItem(el, 'solved')});
            docCookies.setItem('numSolved', 5);
			updateText();
			console.log('updated text!');
			
		}
		const frame = [...document.querySelectorAll('#main-content .html-block-iframe')]
        .sort((a, b) => (b.scrollHeight || 0) - (a.scrollHeight || 0))?.at(0);
		const framepath = (new URL(frame.src)).pathname.replace(/.*\/html\//, '');
		await frameEvaluate(framepath, unlock.toString());

		// const frameEvaluate = window['frameEvaluate'];
		// if (typeof frameEvaluate !== 'function') {
		// 	console.debug('cannot inline actual contents of iframe');
		// 	return;
		// }

		// const frame = document.querySelector('.html-block-iframe');
		// const frameParent = frame.parentNode;

		// const framepath = (new URL(frame.src)).pathname.replace(/.*\/html\//, '');

		// await new Promise(done => setTimeout(done, 3500));

		// // await frameEvaluate(framepath, `function hello () { console.log(window.location.href); document.querySelectorAll('script').forEach(el => el.remove())}`);
		// await window.inlineFrameContents(framepath, 'body');
		// console.log('done inlinging');
		// console.log(document.querySelectorAll('script'));
		// console.log('puzzlesolve', window.containPuzzleSolved);
	},
	afterParse() {

	}
}

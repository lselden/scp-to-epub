export default {
    async beforeParse() {
        const frameEvaluate = window['frameEvaluate'];
		if (typeof frameEvaluate !== 'function') {
			console.debug('cannot reveal contents of iframe');
			return;
		}

        const frame = [...document.querySelectorAll('#main-content .html-block-iframe')]
            .sort((a, b) => (b.scrollHeight || 0) - (a.scrollHeight || 0))?.at(0);
		const framepath = (new URL(frame.src)).pathname.replace(/.*\/html\//, '');
        console.log(framepath);
        console.log('revealing content');
        function innerFn() {
            [...document.querySelectorAll('.collapsed')].forEach(x => x.classList.remove('collapsed'))
        }
        await frameEvaluate(framepath, innerFn.toString()).catch(err => console.warn('failed to toggle contents', err));
        await window.inlineFrameContents(framepath, 'body');
    }
}
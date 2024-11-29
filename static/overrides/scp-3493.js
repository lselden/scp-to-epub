import * as helpers from '../client/helpers.js';

export default {
	async beforeParse() {
		const frameEvaluate = window['frameEvaluate'];
		if (typeof frameEvaluate !== 'function') {
			console.debug('cannot inline actual contents of iframe');
			return;
		}
		async function unlock () {
			const mainEl = document.getElementById('main');
			helpers.$$(mainEl, 'div').forEach(section => {
				const newEl = helpers.switchTag(section, 'section');
				newEl.classList.add('current');
			});
			console.log('unlocking');
			helpers.$$('.showButton').forEach(el => el.remove());

			// document.getElementById('stopTimer').click();
			await new Promise(done => requestAnimationFrame(done));
		}
		/* get last part of path because origin can vary */
		const frame = [...document.querySelectorAll('#main-content .html-block-iframe')]
            .sort((a, b) => (b.scrollHeight || 0) - (a.scrollHeight || 0))?.at(0);
		const frameParent = frame.parentNode;

		const framepath = (new URL(frame.src)).pathname.replace(/.*\/html\//, '');

		await new Promise(done => setTimeout(done, 3500));

		// await frameEvaluate(framepath, `function hello () { console.log(window.location.href); document.querySelectorAll('script').forEach(el => el.remove())}`);
		await window.inlineFrameContents(framepath, 'body');
		console.log('done inlinging');
		// frameParent.replaceWith(frameParent.firstElementChild);
		await unlock();
		await new Promise(done => requestAnimationFrame(done));
		// helpers.switchTag(frameParent, 'div');
		/* uncollapse addendums */
		// document.querySelectorAll('[class^=addend]')
		// 	.forEach(el => el.classList.toggle('collapsed'));

	},
	afterParse() {
		class universeData {
			constructor (newId, newTitle, newDiv, newWarning = "", newExclude = false) {
				this.id = newId;
				this.title = newTitle;
				this.div = newDiv;
				this.warning = newWarning;
				this.exclude = newExclude;
			}
		};

		const universeList = [];
		// Story Mode
		universeList.push(new universeData(2346, "UNI-2346 (LOCAL)", "initial", "Local will be inaccessible to users. Please try connecting to another peer universe."));
		universeList.push(new universeData(2347, "UNI-2347 (PARALLEL)", "parallel"));
		universeList.push(new universeData(86243, "UNI-86243 (CLASSIC)", "classic"));
		universeList.push(new universeData(1100, "UNI-1100 (MEDIEVAL)", "medieval"));
		universeList.push(new universeData(3236, "UNI-3236 (SALES)", "dado", "This universe is inaccessible to users. Please try connecting to another peer universe."));
		universeList.push(new universeData(2049, "UNI-2049 (FUTURE)", "future"));
		universeList.push(new universeData(7411, "UNI-7411 (UNKNOWN-04)", "unknownspots", "Source language still subject to translation process. The system will attempt to translate known phrases."));
		universeList.push(new universeData(0, "UNI-ZERO (ORIGIN)", "zero", "ERROR : FAILED TO <MESSAGE>, TRY <SOLUTION>.", true));
		universeList.push(new universeData(4321, "UNI-4321 (M. SUE)", "msue", "Source may contain unreliable and/or redundant information."));

		universeList.forEach(data => {
			const el = document.getElementById(data.div);
			if (!el) {
				console.log('could not find element for', data);
				return;
			}
			el.insertAdjacentHTML('afterbegin', `<header style="text-align: center; padding: 1em 0" class="chapter-header bg-blue">
				<p style="margin-bottom: 0"><strong>Connected To:</strong></p>
				<h2 style="margin: 0">${helpers.escape(data.title)}</h2>
				${data.warning ? `<p class="red"><strong>WARNING:&nbsp;</strong><span>${helpers.escape(data.warning)}</span></p>` : ''}
			</header>`);
		})
		const el = helpers.$('#zero');
		if (el) {
			el.style.margin = '0 2em';
		}
	}
}

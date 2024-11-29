import {switchTag, escape} from '../client/helpers.js';

export default {
	async beforeParse() {
        debugger;
		const frameEvaluate = window['frameEvaluate'];
		if (typeof frameEvaluate !== 'function') {
			console.debug('cannot inline actual contents of iframe');
			return;
		}
		async function unlock () {
			[...'5'.repeat(5).split(''), 'GO'].forEach(press);
			let i = 0;
			while (i < 100) {
				const el = document.querySelector('.classified-info');
				if (el && getComputedStyle(el).display !== 'none') {
					return;
				}
				await new Promise(done => setTimeout(done, 100));
				await new Promise(done => requestAnimationFrame(done));
			}
			console.log('Possible failure declassifying info');
		}
		/* get last part of path because origin can vary */
		/** @type {HTMLFrameElement} */
        // just choose biggest one
		const frame = [...document.querySelectorAll('#main-content .html-block-iframe')]
            .sort((a, b) => (b.scrollHeight || 0) - (a.scrollHeight || 0))?.at(0);
		const framepath = (new URL(frame.src)).pathname.replace(/.*\/html\//, '');

		await frameEvaluate(framepath, unlock.toString());
		// @ts-ignore
		await window.inlineFrameContents(framepath, 'body');

		/* uncollapse addendums */
		document.querySelectorAll('[class^=addend]')
			.forEach(el => {
				el.classList.toggle('collapsed');
			});

	},
	afterParse() {
		document.querySelectorAll('a[onclick]:not([href])').forEach(a => {
			switchTag(a, 'h3', false);
		});
		const el = document.createElement('style');
		el.type = 'text/css';
		el.innerHTML = `
			table {
				border-radius: 0.25em;
				font-family: Consolas, monospace, sans-serif;
				border: 1px solid currentColor;
				margin: 0 auto;
			}
			table td, table th {
				border: 1px solid currentColor;
				min-width: 3em;
				text-align: center;
			}
		`;

		/*
<style type="text/css">
            .keypad {
                background: linear-gradient(to bottom,#d0d0d0 0,#fff 80%,#ccc 100%),#d4d4d4;
                padding: 6.4px;
                border-radius: 19.2px;
                margin: 25.6px;
                margin-left: auto;
                margin-right: auto;
                border: 2px solid #1f0d12;
                box-shadow: 0 3px 5px #000,0 3px 9px rgba(0,0,0,.5);
                border-spacing: 6px;
                line-height: normal
            }

            .keypad-readout {
                background: linear-gradient(to top,#1a211e 1%,#000 100%),#000;
                color: #e22933;
                font-size: 27px;
                font-family: Consolas,monospace,sans-serif;
                font-weight: 700;
                border-radius: 3.84px;
                border-top-left-radius: 6.4px;
                border-top-right-radius: 6.4px;
                border: 2px solid #32443a;
                text-align: center;
                padding: 7px;
                text-shadow: 0 0 6px red
            }

            .regular-button {
                background: #714144;
                color: #fff;
                font-family: monospace,sans-serif;
                font-weight: 700;
                text-align: center;
                width: 47.36px;
                height: 47.36px;
                border-radius: 5.12px;
                font-size: 23px;
                transition: background .1s ease-out;
                box-shadow: 0 3px 7px rgba(0,0,0,.6)
            }

            .regular-button:hover {
                background: #944449
            }

            .regular-button:active {
                background: #b9475b
            }

            .clr-button {
                border-bottom-left-radius: 12.8px;
                background: #9e0e17
            }

            .clr-button:hover {
                background: #b90b15
            }

            .clr-button:active {
                background: #de0814
            }

            .go-button {
                border-bottom-right-radius: 12.8px;
                background: #43862e
            }

            .go-button:hover {
                background: #469a2b
            }

            .go-button:active {
                background: #4ec527
            }

            .keypad-readout,.regular-button {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                cursor: default
			}
		</style>
		*/
	},
	include: [
	]
}

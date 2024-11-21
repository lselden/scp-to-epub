export default {
	async beforeParse() {
		const consoleText = `

FOUNDATION MODIFIED BIOS PLATFORM v8.00


Press F12 to Enter Setup



Please wait  ...  Done

Main Processor : Intel(R) Core(TM) i7-6700K CPU 4.20GHz


Property of the SCP Foundation. Theft, modification or
damage to this device is strictly prohibited. All
information contained therein is classified. Please see
your site director if you are missing proper security
clearance.




PLEASE SUBMIT SECURITY CREDENTIALS (LEVEL 5): ████████



`;

		const terminal = document.querySelector('.html-block-iframe');
		const newEl = document.createElement('pre');
		newEl.classList.add('monospace');
		Object.assign(newEl.style, {
			background: 'black',
			color: 'green',
			padding: '0.5em',
			border: '1px solid currentColor',
			margin: 0
		});
		newEl.innerHTML = consoleText;
		terminal.replaceWith(newEl);

		let c = undefined;
		let i = 0;

		const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
		while((c = tw.nextNode()) && i++ < 200) {
			c.parentNode.removeChild(c);
		}
	},
	async afterParse() {
	}
}

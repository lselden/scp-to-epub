export default {
	async beforeParse() {
		document.querySelectorAll('.terminal-text p + div').forEach(e => e.outerHTML = '<hr/>');

		const disruptHead = document.querySelector('.disruption-header');
		disruptHead.getElementsByClassName.backgroundColor = '';

		disruptHead.closest('p').outerHTML = `<h3 class="white bg-yellow align-center" style="text-transform: uppercase">${disruptHead.innerHTML}</h3>`;

		const terminal = document.querySelector('.terminal');
		terminal.classList.add('monospace');
		Object.assign(terminal.style, {
			background: 'black',
			color: 'white',
			borderRadius: '.976em',
			padding: '0.5em',
			margin: '0.5em',
			border: '1px solid currentColor'
		});

		document.querySelectorAll('div[style*=background-color] > .log')
			.forEach(el => el.parentElement.style.backgroundColor = 'transparent');
	},
	async afterParse() {
	}
}

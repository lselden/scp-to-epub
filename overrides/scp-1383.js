export default {
	async beforeParse() {
		document.querySelectorAll('[style="color:black; background-color: black"]').forEach(el => {
			el.innerHTML = el.innerHTML
				.replace(/(^—|—$)/g, '█')
				.replace(/\s*—\s*/g, '█')
				.replace(/\<span style="font-size:50%;"\>([^<]+)\<\/span\>/g, '<small>$1</small>');
		});
	},
	async afterParse() {

	}
}

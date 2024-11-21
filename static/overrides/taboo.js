export default {
	async beforeParse() {
		document.querySelectorAll('.warning-desktop, .pictures4desk').forEach(el => el.remove());
		document.querySelectorAll('.warning-mobile, .pictures4mobile').forEach(el => el.replaceWith(el.firstElementChild));
	},
	async afterParse() {
		console.log('after');
	}
}

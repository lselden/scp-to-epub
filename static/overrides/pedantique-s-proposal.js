export default {
	async beforeParse() {
        // interactive story, not compatible
        document.querySelector('a[href*="FishhookAggregateExcessive"]')?.setAttribute('rel', 'nofollow');
	},
	async afterParse() {


	}
}
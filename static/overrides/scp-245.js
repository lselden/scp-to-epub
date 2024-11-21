export default {
	beforeParse() {
		const target = document.querySelector('#page-content .html-block-iframe');
		target.insertAdjacentHTML('beforebegin', '<p><a href="http://www.scpwiki.com/scp-245-1-a">Access SCP-245-1-A?</a></p>');
		target.remove();
	},
	afterParse() {

	}
}

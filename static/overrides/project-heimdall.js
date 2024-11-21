export default {
	beforeParse() {
		// remove taglist because it can mess up criteria for loading supplemental content
		const tagList = document.querySelector('#toc9 ~ .list-pages-box');
		if (tagList) {
			tagList.remove();
		}
	}
}

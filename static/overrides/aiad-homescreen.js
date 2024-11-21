import {$$, switchTag} from '../client/helpers.js';

export default {
	beforeParse() {
		$$('.hl-main').forEach(el => el.remove());

		$$('.audio_iframe.aiadance').forEach(el => {
			if (el.nextElementSibling && /Zabriskie/.test(el.nextElementSibling.textContent)) {
				el.nextElementSibling.remove();
			}
			el.innerHTML = `<audio src="http://scp-wiki.wdfiles.com/local--files/aiad-homescreen/song.mp3" controls></audio>`;
		});

		$$('div[style]').forEach(el => {
			el.style = '';
			$$(el, 'p > span[style] > strong, p > strong > span[style]').forEach(head => {
				const txt = head.innerHTML;
				const newEl = switchTag(head.closest('p'), 'h2');
				newEl.innerHTML = `<u>${txt}</u>`;
				newEl.style.textAlign = 'center';
			});
		});
		$$('.list-pages-item br').forEach(el => el.remove());
	},
	afterParse() {
		$$('.aiadance figcaption').forEach(el => {
			el.innerHTML = `Audio: <a href="https://chriszabriskie.bandcamp.com/track/what-does-anybody-know-about-anything" data-external="true" rel="nofollow" target="_blank">"What Does Anybody Know About Anything"</a> by <a rel="nofollow" href="http://chriszabriskie.com/" target="_blank">Chris Zabriskie</a>`
		});
	}
}

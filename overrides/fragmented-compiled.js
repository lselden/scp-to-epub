import {$$, switchTag} from '../client/helpers.js';
import {createAudioFigure} from '../client/fix-media.js';

export default {
	beforeParse() {
	},
	afterParse() {
		$$('.audio_iframe.spookycore').forEach(el => {
			const newEl = createAudioFigure('http://scp-wiki.wdfiles.com/local--files/fragment%3Afragmented-compiled-2/spookycore2.mp3');
			el.replaceWith(newEl);
		});
	}
}


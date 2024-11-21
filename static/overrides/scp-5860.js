import {$$, switchTag} from '../client/helpers.js';

export default {
	beforeParse() {
		// remove extraneous quote in there
		$$('[style*=\\"]').forEach(el => el.style.margin = 'unset');
	},
	afterParse() {
	}
}


import Resource from './resource.js';

export default class Link extends Resource {
	constructor(opts = {}) {
		super(opts);
	}
	get isPlaceholder() {
		return true;
	}
}

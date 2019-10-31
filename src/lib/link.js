const Resource = require('./resource');

class Link extends Resource {
	constructor(opts = {}) {
		super(opts);
	}
	get isPlaceholder() {
		return true;
	}
}

module.exports = Link;

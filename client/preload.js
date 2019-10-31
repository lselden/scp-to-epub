// this script is run on new document, before page even loads

(() => {
	// avoid mutating prototype
	[
		Document.prototype,
		Element.prototype,
		DocumentFragment.prototype
	].forEach(obj => Object.freeze(obj));
});

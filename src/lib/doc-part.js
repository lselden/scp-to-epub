const Chapter = require('./chapter');
const {safeFilename} = require('./utils');
const config = require('../book-config');
const {CacheEnum} = require('./resource');

class DocPart extends Chapter {
	constructor(opts = {}) {
		const {
			title,
			titleHTML,
			index,
			html,
			// HACK!!! this is to make relative paths go the rigth place, but isn't the best way to deal with it
			origin = config.get('discovery.defaultOrigin'),
			// content will go into resourceOpts
			...resourceOpts
		} = opts;

		//@ts-ignore
		resourceOpts.title = `Part ${index}: ${title}`;

		// TODO type checking or validation?
		const basename = safeFilename(`p${index}_${title.slice(0, 60)}`);
		const filename = `${basename}.xhtml`;

		Object.assign(resourceOpts, {
			url: `${origin}/__${filename}`,
			id: basename,
			mimeType: 'application/xhtml+xml',
			cache: CacheEnum.local,
			depth: 0
		});
		super(resourceOpts);

		// HACK TODO COMBAK this won't match behavior of Chapter links, which use cananonical URL.
		// this.links = (opts.links || [])
		// 	.map(link => {
		// 		// make links absolute
		// 		return (new URL(link.url, origin)).toString();
		// 	});

		this.titleHTML = titleHTML;
		this.index = index;
		this.html = html;
		this.chapters = [];
	}
}

module.exports = DocPart;

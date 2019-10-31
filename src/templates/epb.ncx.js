const {escape} = require('../lib/utils');
const DocPart = require('../lib/doc-part');

function genNcx(data, options = {}) {
	const {
		id,
		title,
		toc: {
			title: tocTitle = 'Table Of Contents',
			path: tocPath = 'toc.xhtml',
		},
		author,
		creator = 'scp-epub-gen',
		layout: {
			chapters = [],
			appendix = []
		}
	} = data;

	let allChapters = [...chapters, ...appendix];
	// remove duplicates
	const tmpMap = allChapters.reduce((tmpMap, chapter) => {
		if (!tmpMap.has(chapter.id)) {
			tmpMap.set(chapter.id, chapter);
		}
		return tmpMap;
	}, new Map());
	allChapters = [...tmpMap.values()];


	let index = 0;
	function formatChapter(chapter) {
		const {
			id,
			title = `Chapter ${index + 1}`,
			bookPath = ''
		} = chapter;

		const navText = (chapter instanceof DocPart) ?
			chapter.title :
			`${ (index + 1) }. ${escape(title)}`

		let out = `<navPoint id="navpoint-${index}" playOrder="${index}">
			<navLabel><text>${navText}</text></navLabel>
			<content src="${ bookPath }" />
		</navPoint>`;

		index += 1;

		// if (chapter instanceof DocPart) {
		// 	out += chapter.chapters.map(formatChapter).join('');
		// }
		return out;

	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
	<head>
		<meta name="dtb:uid" content="${ id }" />
		<meta name="epub-creator" content="${ escape(creator) }" />
		<meta name="dtb:depth" content="1" />
		<meta name="dtb:totalPageCount" content="0" />
		<meta name="dtb:maxPageNumber" content="0" />
	</head>
	<docTitle><text>${ escape(title) }</text></docTitle>
	<docAuthor><text>${ escape(author) }</text></docAuthor>
	<navMap>${
			allChapters
				.map(formatChapter)
				.join('\n')
		}<navPoint id="navpoint-${ index }" playOrder="${ index }">
			<navLabel><text>${ tocTitle }</text></navLabel>
			<content src="${tocPath}" />
		</navPoint>
	</navMap>
</ncx>

	`
}

module.exports = genNcx;

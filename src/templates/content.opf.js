const {EOL} = require('os');
const config = require('../book-config');
const {escape} = require('../lib/utils');
const DocPart = require('../lib/doc-part');

/**
 *
 * @param {import("../lib/book")} data
 * @returns {string}
 */
function genContent(data, options = {}) {
	const {
		id: uniqueId = config.get('metadata.id', `scp.foundation.${Math.random().toString(16).slice(2)}`),
		title,
		lang = 'en',
		publisher,
		toc: {
			title: tocTitle,
			path: tocPath = 'toc.xhtml',
			ncxPath = 'epb.ncx',
			prefacePath = 'preface.xhtml',
			appendixPath = 'appendix.xhtml'
		},
		resources = [],
		layout: {
			// nested: chapters = [],
			chapters = [],
			appendix = []
		},
		author = 'SCP Foundation',
		publishDate,
		creator,
		appendixDepthCutoff = 1,
		// cover: {
		// 	path: coverPath = 'cover.xhtml'
		// },
		hideSupplemental = true
	} = {...options, ...data};

	let allChapters = [...chapters, ...appendix]
		.filter(c => !c.excludeFromToc);

	// remove duplicates
	const tmpMap = allChapters.reduce((tmpMap, chapter) => {
		if (!tmpMap.has(chapter.id)) {
			tmpMap.set(chapter.id, chapter);
		}
		return tmpMap;
	}, new Map());
	allChapters = [...tmpMap.values()];

	const now = publishDate.toISOString().replace(/\.\d+/,'');
	const nowDate = now.replace(/T.*/, '');

	// const hasCoverImage = !!resources.find(r => r.id === 'cover-image');

	return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
		version="3.0"
		unique-identifier="uid"
		xml:lang="${ lang }"
		xmlns:dcterms="http://purl.org/dc/terms/"
		xmlns:ibooks="http://vocabulary.itunes.apple.com/rdf/ibooks/vocabulary-extensions-1.0/"
		xmlns:media="http://www.idpf.org/epub/vocab/overlays/#"
		prefix="cc: http://creativecommons.org/ns# ibooks: http://vocabulary.itunes.apple.com/rdf/ibooks/vocabulary-extensions-1.0/">

	<metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/">
		<dc:title>${ escape(title) }</dc:title>
		<dc:creator id="creator">${ escape(author) }</dc:creator>
		<meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
		<meta name="generator" content="${ escape(creator) }" />
		<dc:contributor id="contributor">${ escape(creator) }</dc:contributor>
		<meta refines="#contributor" property="role" scheme="marc:relators">bkp</meta>
		<dc:date>${ nowDate }</dc:date>
		<dc:identifier id="uid">${ uniqueId }</dc:identifier>
		<dc:language>${ lang }</dc:language>
		<meta property="dcterms:modified">${ now }</meta>
		<dc:publisher>${ escape(publisher)  }</dc:publisher>
		<dc:rights>This work is licensed under a Creative Commons Attribution-Share Alike (CC BY-SA) license.</dc:rights>
		<link rel="cc:license" href="http://creativecommons.org/licenses/by-nc-sa/3.0/"/>
		<meta property="cc:attributionURL">http://creativecommons.org/videos/a-shared-culture</meta>
		<meta property="ibooks:specified-fonts">true</meta>
		<meta property="ibooks:version">1</meta>
		<meta name="cover" content="cover-image" />
	</metadata>

	<manifest>
		<item id="toc" href="${ tocPath }" media-type="application/xhtml+xml" properties="nav" />
		<item id="ncx" href="${ ncxPath }" media-type="application/x-dtbncx+xml" />
		<item id="preface" href="${ prefacePath }" media-type="application/xhtml+xml" />
${
			resources
				.map(asset => {
					const {
						id,
						bookPath,
						mimeType = "text/html",
						properties
					} = asset;
					// skip ignored assets
					if (!asset.shouldIncludeInManifest) {
						return;
					}
					const href = asset.remote ? asset.url : bookPath;
					// remote-resources, cover-image, scripted, nav
					const props = (Array.isArray(properties) && properties.length && properties[0]) ? `properties="${properties.join(' ')}"` : '';
					return `\t\t<item id="${id}" href="${href}" media-type="${mimeType}" ${props} />`;
				})
				.filter(x => x)
				.join(EOL)
		}
		<item id="appendix" href="${ appendixPath }" media-type="application/xhtml+xml" />
	</manifest>

	<spine toc="ncx">
		<itemref idref="toc" />
		<itemref idref="preface" />
${
			allChapters
				.map(chapter => {
					const {id} = chapter;
					// return `\t\t<itemref idref="${id}" />`;
					// TODO make linear an option
					const isSupplemental = hideSupplemental && (
						chapter.isSupplemental ||
						(chapter.depth && chapter.depth >= appendixDepthCutoff)
					);
					const linear = isSupplemental ? 'linear="no"' : 'linear="yes"';
					return `\t\t<itemref idref="${id}" ${linear} />`;
				})
				.join(EOL)
		}
		<itemref idref="appendix" />
	</spine>
</package>`
}

module.exports = genContent;

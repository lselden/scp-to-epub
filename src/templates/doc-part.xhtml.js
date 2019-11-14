const {escape} = require('../lib/utils');
const config = require('../book-config');

function genPartIntro(data, options = {}) {
	const {
		lang = 'en',
		// TODO should this be stylesheets?
		stylesheets = config.get('bookOptions.stylesheets'),
	} = options;

	const {
		title,
		titleHTML,
		index,
		html
	} = data;

	let stylesheetHTML = stylesheets
		.map(path => `<link rel="stylesheet" type="text/css" href="${path}" />`)
		.join('');

	if (config.has('input.customCSS')) {
		stylesheetHTML += `<style>${config.get('input.customCSS')}</style>`;
	}

	return `<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${ lang }" lang="${ lang }">
	<head>
		<title>Part ${ index }</title>
		<meta charset="UTF-8" />${
			stylesheetHTML
		}
	</head>
	<body id="html-body">
		<section id="main-content" role="doc-part" aria-labelledby="page-title">
			<header class="chapter-header chapter-meta">
				<p role="doc-subtitle">Part ${index}</p>
				<h1 id="page-title">${titleHTML}</h1>
			</header>
			<div id="page-content">${html}</div>
		</section>
	</body>
	</html>`;
}

module.exports = genPartIntro;

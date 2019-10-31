const {escape} = require('../lib/utils');

function genPartIntro(data, options = {}) {
	const {
		lang = 'en',
		// TODO should this be stylesheets?
		stylesheets = ['css/base.css', 'css/style.css', 'css/fonts.css'],
	} = options;

	const {
		title,
		titleHTML,
		index,
		html
	} = data;

	return `<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${ lang }" lang="${ lang }">
	<head>
		<title>Part ${ index }</title>
		<meta charset="UTF-8" />${
			stylesheets.map(path => {
			return `<link rel="stylesheet" type="text/css" href="${path}" />`
		}).join('')
		}
	</head>
	<body id="html-body">
		<section id="main-content" role="doc-part" aria-labelledby="page-title">
			<header class="chapter-header chapter-meta">
				<h1 id="page-title">Part ${index}</h1>
				<p role="doc-subtitle">${titleHTML}</p>
			</header>
			<div id="page-content">${html}</div>
		</section>
	</body>
	</html>`;
}

module.exports = genPartIntro;

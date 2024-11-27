const config = require('../book-config');


const REPOSITORY_URL = 'https://github.com/lselden/scp-to-epub';

function genPreface(data, options = {}) {
	const {
		id = '',
		lang = 'en',
		stylesheets = ['css/base.css', 'css/style.css', 'css/fonts.css'],
		fonts = [],
		prefaceTitle = config.get('bookOptions.prefaceTitle', 'Preface'),
		prefaceHTML = '',
		resources = [],
	} = {...data, ...options};

	const coverImage = resources.find(r => r.id === 'cover-image');
	const coverImagePath = coverImage && coverImage.bookPath;

    // TODO just generate this somewhere for everyone
	let stylesheetHTML = stylesheets
		.map(path => `<link rel="stylesheet" type="text/css" href="${path}" />`)
		.join('');

	if (config.has('input.customCSS')) {
		stylesheetHTML += `<style>${config.get('input.customCSS')}</style>`;
	}

    const scpperNote = config.get('enableStats')
        ? `<p>Statistics and some other information were gleaned from <a href="https://www.scpper.com">ScpperDB</a>.</p>`
        : '';

	return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${ lang }" lang="${ lang }">
	<head>
		<title>${escape(prefaceTitle)}</title>
		<meta charset="UTF-8" />${
			stylesheetHTML
		}${
			id ? `<meta name="EPB-UUID" content="${ id }" />` : ''
		}
	</head>
	<body>${coverImagePath ?
			`<figure class="cover-image">
				<img src="${coverImagePath}" alt="Cover Image" />
			</figure>` : ''
		}<h1>${escape(prefaceTitle)}</h1>
		${prefaceHTML || ''}
		<p>This ebook was auto-generated from content on the <a href="${config.get('discovery.defaultOrigin', 'http://www.scpwiki.com')}">SCP Foundation</a> Wiki. Each chapter includes author information and link to the original.</p>
		${scpperNote}
		<p>Unless otherwise stated, all content is licensed under <a href="http://creativecommons.org/licenses/by-sa/3.0/">Creative Commons Attribution-ShareAlike 3.0 License</a></p>
		${(fonts && fonts.length) ? `<p>This ebook is typeset using the fonts ${
			fonts.map(f => `<a href="${f.homepage}">${escape(f.name)}</a>`).join(', ')
		}.</p>` : ''}
		<p><strong>Generated:</strong> using <a href="${REPOSITORY_URL}">scp-to-epub</a> on ${(new Date()).toDateString()}</p>
	</body>
</html>`;
}

module.exports = genPreface;

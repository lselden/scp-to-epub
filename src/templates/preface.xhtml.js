function genPreface(data, options = {}) {
	const {
		id = '',
		lang = 'en',
		stylesheets = ['css/base.css', 'css/style.css', 'css/fonts.css'],
		fonts = [],
		prefaceHTML = ''
	} = {...data, ...options};

	return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${ lang }" lang="${ lang }">
	<head>
		<title>Preface</title>
		<meta charset="UTF-8" />${
			stylesheets.map(path => {
				return `<link rel="stylesheet" type="text/css" href="${path}" />`
			}).join('')
		}${
			id ? `<meta name="EPB-UUID" content="${ id }" />` : ''
		}
	</head>
	<body>
		<h1>Preface</h1>
		${prefaceHTML || ''}
		<p>This ebook was auto-generated from content on the <a href="http://scp-wiki.net">SCP Foundation</a> Wiki. Each chapter includes author information and link to the original.</p>
		<p>Statistics and some other information were gleaned from <a href="https://www.scpper.com">ScpperDB</a>.</p>
		<p>Unless otherwise stated, all content is licensed under <a href="http://creativecommons.org/licenses/by-sa/3.0/">Creative Commons Attribution-ShareAlike 3.0 License</a></p>
		${(fonts && fonts.length) ? `<p>This ebook is typeset using the fonts ${
			fonts.map(f => `<a href="${f.homepage}">${escape(f.name)}</a>`).join(', ')
		}.</p>` : ''}
		<p><strong>Generated:</strong> ${(new Date()).toDateString()}</p>
	</body>
</html>`;
}

module.exports = genPreface;

const {filenameForUrl, escape} = require('../lib/utils');

function genSystemChapterHeader(chapter, config = {}) {
	const {
		stats
	} = chapter;

	return `<header class="chapter-header chapter-meta system-page">
		<h1 id="page-title">${escape(stats.title || stats.pageName)}</h1>
	</header>`;
}

function genChapterHeader(chapter, audioAdaptations = [], config = {}) {
	const {
		stats,
		url,
		links = []
	} = chapter;

	if (chapter.isSystemPage) {
		return genSystemChapterHeader(chapter, config);
	}

	let date = stats.date;

	if (stats.date instanceof Date) {
		try {
			date = stats.date.toDateString();
		} catch (err) {
			console.warn(`Failed processing posted date for ${chapter.title} - value is ${JSON.stringify(stats.date)}`);
			date = undefined;
		}
	}

	const {
		showRating = true,
		includeAudioAdaptations = true,
		includeReferences = false
	} = config;

	const rows = [];

	if (stats.author) {
		rows.push(['By', escape(stats.author)]);
	}
	if (date) {
		rows.push(['Posted', escape(date)]);
	}

	if (stats.rating && showRating) {
		rows.push(['Rating', escape(stats.rating)]);
	}
	if (stats.score && showRating) {
		rows.push(['Wilson Score', escape(stats.score)]);
	}

	if (stats.isHeritage) {
		rows.push(['', '(Heritage Collection)']);
	}

	if (links && (links.length > 0) && includeReferences) {
		rows.push(['Referenced By', `<ul id="internal-references" style="list-style-type: none;">${links.map(link => `<li><a href="${link.url}">Back to ${escape(link.title)}</a></li>`).join('')}</ul>`]);
	}

	const {altTitle = ''} = stats;

	return `<header class="chapter-header chapter-meta">
		<h1 id="page-title">${escape(stats.title || stats.pageName)}</h1>
		<p role="doc-subtitle">${escape(stats.altTitle || '')}</p>
		<aside>
			<ul>${
				rows
					.map(([key, value]) => `<li>${key ? `<b>${escape(key)}:</b>` : ''} ${value}&#160;</li>`)
					.join('')
			}</ul>
			<p><cite><a href="${url}" data-external="true">Original Version</a></cite></p>${
				(
					audioAdaptations &&
					(audioAdaptations.length > 0) &&
					includeAudioAdaptations
				) ? `<h3>Audio Adaptations</h3><ul>${
					audioAdaptations.map(x => {
						return `<li><a href="${x.url}">${escape(x.title)}</a>&#160;</li>`;
					}).join('')
				}</ul>` : ''
			}
		</aside>
	</header>`;
}

function genChapterFooter(bookLinks = [], externalLinks = [], config = {}) {
	return `<footer class="chapter-footer chapter-meta">${
		bookLinks.length ?
		`<nav>
			<h3>Referenced By:</h3>
			<ol>${
				bookLinks
					.map(({title, url}) => `<li><a href="${url}">${escape(title)}</a></li>`)
					.join('')
			}</ol>
		</nav>` : ''
		}${externalLinks.length ?
		`<aside>
			<h3>External Links:</h3>
			<ul>${
				externalLinks
					.map(({title, url}) => `<li><a href="${url}">${escape(title)}</a></li>`)
					.join('')
			}</ul>
		</aside>` : ''
	}</footer>`;
}

module.exports = {
	genChapterHeader,
	genChapterFooter
};

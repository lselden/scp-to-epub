const config = require('../book-config');
const {filenameForUrl, escape} = require('../lib/utils');

function genSystemChapterHeader(chapter, config = {}) {
	const {
		stats
	} = chapter;

	return `<header class="chapter-header chapter-meta system-page">
		<h1 id="page-title">${escape(stats.title || stats.pageName)}</h1>
	</header>`;
}

/**
 *
 * @param {import('../lib/chapter')} chapter
 * @param {{url: string, title: string}[]} audioAdaptations
 * @param {import('../..').BookOptions} options
 */
function genChapterHeader(chapter, audioAdaptations = [], options = {}) {
	const {
		stats,
		url,
		forwardLinks: links = []
	} = chapter;

	if (chapter.isSystemPage) {
		return genSystemChapterHeader(chapter, options);
	}

	/** @type {Date | undefined} */
	let date = new Date(stats.date);

	if (isNaN(date.getTime())) {
		console.warn(`Failed processing posted date for ${chapter.title} - value is ${JSON.stringify(stats.date)}`);
		date = undefined;
	}

	const {
		showRating = true,
		includeAudioAdaptations = true,
		includeReferences = false
	} = options;

	const rows = [];

	if (stats.author) {
		rows.push(['By', escape(stats.author)]);
	}
	if (date) {
		rows.push(['Posted', `<time datetime="${date.toISOString()}">${date.toDateString()}</time>`]);
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

	// TODO fix References ....
	// if (links && (links.length > 0) && includeReferences) {
	// 	rows.push(['Referenced By', `<ul id="internal-references" style="list-style-type: none;">${
	// 		links.map(link => {
	// 			if (typeof link === 'string') {
	// 				const u = new URL(link, defaultOrigin);
	// 				link = {
	// 					url: u.pathname,
	// 					title: u.pathname.slice(1)
	// 				};
	// 			}
	// 			return `<li><a href="${link.url}">Back to ${link.titleHTML}</a></li>`
	// 		})
	// 		.join('')
	// 	}</ul>`]);
	// }

	const {altTitle = ''} = stats;
	const title = stats.title || stats.pageName || '';

	return `<header class="chapter-header chapter-meta">
		<p><br /></p>
		<h1 id="page-title">${escape(title)}</h1>
		<p role="doc-subtitle">${escape(altTitle)}</p>
		<aside>
			<ul>${
				rows
					.map(([key, value]) => `<li>${key ? `<b>${escape(key)}:</b>` : ''} ${value}</li>`)
					.join('')
			}<li><cite><a href="${url}" data-external="true">Original Version</a></cite></li>
			</ul>${
				(
					audioAdaptations &&
					(audioAdaptations.length > 0) &&
					includeAudioAdaptations
				) ? `<h3 class="align-center">Audio Adaptations</h3><ul>${
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

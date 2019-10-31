const got = require('got');
const urlLib = require('url');

const baseUri = 'http://scpper.com';
const defaultSite = 'en';

// SCP Foundation (scp-wiki.net): "en"
// Russian branch (scpfoundation.ru): "ru"
// Korean branch (ko.scp-wiki.net): "ko"
// Japanese branch (ja.scp-wiki.net): "ja"
// French branch (fondationscp.wikidot.com): "fr"
// Spanish branch (lafundacionscp.wikidot.com): "es"
// Thai branch (scp-th.wikidot.com): "th"
// Polish branch (scp-wiki.net.pl): "pl"
// German branch (scp-wiki-de.wikidot.com): "de"
// Chinese branch (scp-wiki-cn.wikidot.com): "cn"
// Italian branch (fondazionescp.wikidot.com): "it"
// SCP International (scp-int.wikidot.com): "int"

/**
 * @typedef {object} SCPStats
 * @property {string} id
 * @property {string} site
 * @property {string} title
 * @property {string} altTitle
 * @property {string} kind
 * @property {number} rating
 * @property {number} score
 * @property {number} rank
 * @property {string} author
 * @property {Date} date
 * @property {string} [pageName]
 * @property {string} [siteName]
 * @property {boolean} [isHeritage]
 * @property {Date} [lastCached]
 */

/**
 *
 * @param {*} data
 * @returns {SCPStats}
 */
function parseResponse(data) {
	const {
		id,
		site,
		title,
		altTitle = '',
		kind,
		cleanRating,
		wilsonScore,
		rank,
		creationDate = {},
		authors = []
	} = data;
	return {
		id,
		site: (urlLib.parse(site || '').hostname || '').split('.')[0] || 'scp-wiki',
		title,
		altTitle: (altTitle || '').replace(/^&$/, ''),
		kind,
		score: Math.round(wilsonScore * 100) / 100,
		date: new Date(creationDate.date),
		rating: cleanRating,
		// rank starts at 0
		rank: rank + 1,
		author: authors
			.sort((a, b) => a.role > b.role ? 1 : -1)
			.map(a => a.role === 'Author' ? a.user : `${a.user} [${a.role}]`)
			.join(', ')
	};
}

/**
 *
 * @param {string | number} pageId
 * @returns {Promise<SCPStats>}
 */
async function getByPageId(pageId) {
	const response = await got(`${baseUri}/api/page`, {
		query: {
			id: pageId
		},
		json: true
	});
	return parseResponse(response.body);
}

/**
 *
 * @param {string} title
 * @param {*} [options]
 * @returns {Promise<SCPStats>}
 */
async function getByTitle(title, options = {}) {
	const query = {
		site: defaultSite,
		title,
		limit: 1,
		...options
	};
	const returnAll = !!options.returnAll;

	const response = await got(`${baseUri}/api/find-pages`, {
		query,
		json: true
	});
	const {pages, error} = response.body;
	if (error) {
		throw new Error(error);
	}
	if (returnAll) {
		return pages.map(page => parseResponse(page));
	}
	return pages.length ? parseResponse(pages[0]) : undefined;
}

module.exports = {
	getByPageId,
	getByTitle
};

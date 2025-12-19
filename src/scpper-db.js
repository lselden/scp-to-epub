const urlLib = require('url');
const { getUrlObj } = require('./lib/utils');

let baseUri = 'http://scpper.com';
let defaultSite = 'en';

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
		site: getUrlObj(site).hostname?.split('.')?.[0] || 'scp-wiki',
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
    const url = new URL('/api/page', baseUri);
    url.searchParams.set('id', pageId);
	const response = await fetch(url);
	return parseResponse(await response.json());
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

    const url = new URL('/api/find-pages', baseUri);
    url.search = new URLSearchParams(query).toString();
	const response = await (await fetch(url)).json();
	const {pages, error} = response;
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

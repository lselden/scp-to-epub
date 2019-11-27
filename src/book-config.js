//@ts-check

const path = require('path');
const config = require('./lib/config');

const defaultOrigin = config.get('discovery.defaultOrigin', 'http://www.scp-wiki.net');

config.util.defaults({
	metadata: {
		title: '',
		lang: 'en',
		publisher: 'SCP Foundation',
		publishDate: new Date(),
		author: 'SCP Foundation',
		creator: 'scp-epub-gen',
		bookId: `scp.to.epub.${Math.random().toString(16).slice(2)}`
	},
	input: {
		url: '',
		path: '',
		page: '',
		customCSS: '',
		preface: '',
		prefaceHTML: '',
		tocHTML: '',
		additionalResources: [],
		wikidot: true,
		autoLoad: undefined
	},
	output: {
		path: path.join(__dirname, '../output'),
		tempDir: path.join(__dirname, '../output'),
		localResources: path.join(__dirname, '../assets'),
		cleanTempFolder: true,
		keepTempFiles: true,
		folders: {
			css: 'css',
			fonts: 'fonts',
			images: 'images',
			docs: '',
			default: ''
		},
		images: {
			/**
			 * set to true to not store images
			 */
			remote: false,
			/**
			 * skip compression. NOTE: this won't convert webp/other non-compatible types
			 */
			compress: true,
			width: 768,
			height: 1024,
			quality: 70,
			convertSVG: true,
			resizeOptions: {
				fit: 'inside',
				withoutEnlargement: true
			}
		},
		diskConcurrency: 1
	},
	bookOptions: {
		appendixDepthCutoff: 2,
		showRating: true,
		includeAudioAdaptations: true,
		includeReferences: true,
		hideSupplemental: true,
		tocTitle: 'Table Of Contents',
		prefaceTitle: 'Preface',
		// TODO make subfolder be determined from output.folders
		stylesheets: ['css/base.css', 'css/style.css', 'css/fonts.css']
	},
	discovery: {
		maxChapters: 50,
		maxDepth: 2,
		include: [],
		exclude: [],
		defaultOrigin,
		audioAdaptationsUrl: `${new URL('printer--friendly/audio-adaptations', defaultOrigin)}`,
		hubsUrl: `${new URL('printer--friendly/system:page-tags/tag/hub', defaultOrigin)}`,
		authorsUrl: `${new URL('printer--friendly/system:page-tags/tag/author', defaultOrigin)}`,
		artworkUrl: `${new URL('printer--friendly/system:page-tags/tag/artwork', defaultOrigin)}`
	},
	browser: {
		headless: false,
		debug: false,
		width: 768,
		height: 1024,
		timeout: 10 * 60 * 1000,
		ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36'
	},
	cover: {
		path: '',
		url: '',
		width: 1600,
		height: 2560,
		templateHTML: ''
	},
	preProcess: {
		concurrency: 1,
		closeTabs: true,
		skipMetaDepth: 1
	},
	postProcess: {
		concurrency: 3
	},
	static: {
		enabled: true,
		prefix: '__epub__',
		root: path.join(__dirname, '..'),
		cache: true
	},
	cache: {
		stats: true,
		path: path.join(__dirname, '../cache'),
		maxAge: 30 * 24 * 60 * 60 * 1000
	},
	hooks: {
		newDocument: undefined,
		beforeFormat: undefined,
		afterFormat: undefined,
		// request: 'function',
		// response: 'function'
	}
});

// add quick keys for common config values
Object.entries({
	title: 'metadata.title',
	author: 'metadata.author',
	maxChapters: 'discovery.maxChapters',
	maxDepth: 'discovery.maxDepth',
	appendixDepthCutoff: 'bookOptions.appendixDepthCutoff',
	showRating: 'bookOptions.showRating',
	includeAudioAdaptations: 'bookOptions.includeAudioAdaptations',
	includeReferences: 'bookOptions.includeReferences',
	hideSupplemental: 'bookOptions.hideSupplemental',
	customCSS: 'input.customCSS',
	prefaceHTML: 'input.prefaceHTML',
	tocHTML: 'input.tocHTML',
	additionalResources: 'input.additionalResources'
}).forEach(([alias, fullKey]) => config.util.alias(alias, fullKey));

module.exports = config;

export const mainContentId = 'main-content';

export const footnotes = {
	inline: true
};

export const minColorContrast = 4.5;

/** sanity check of how many child pages allowed to be loaded */
export const maxOffsets = 250;

export const themeColors = {
	white: {
		default: true,
		iBooksName: 'White',
		color: '#000000',
		background: '#fbfbfb',
		border: '#000000'
	},
	sepia: {
		iBooksName: 'Sepia',
		color: '#000000',
		background: '#f8f1e3',
		border: '#000000'
	},
	gray: {
		iBooksName: 'Gray',
		color: '#c9caca',
		background: '#5a5a5c',
		border: '#c9caca'
	},
	night: {
		iBooksName: 'Night',
		color: '#b0b0b0',
		background: '#121212',
		border: '#5a5a5c'
	}
};

export const palette = {
	"white": "#fbfbfb",
	"silver": "#c9caca",
	"gray": "#5a5a5c",
	"red": "#800000",
	"yellow": "#805500",
	"green": "#008000",
	"blue": "#002a80",
	"black": "#121212",
	"darkwhite": "#5f5f5f",
	"lightwhite": "#fbfbfb",
	"darksilver": "#4e4f4f",
	"lightsilver": "#ebebeb",
	"darkgray": "#2a2a2a",
	"lightgray": "#c6c6c7",
	"darkred": "#360c0c",
	"lightred": "#d2a8a8",
	"darkyellow": "#36280c",
	"lightyellow": "#d2c4a8",
	"darkgreen": "#0c360c",
	"lightgreen": "#a8d2a8",
	"darkblue": "#0c1a36",
	"lightblue": "#a8b6d2",
	"darkblack": "#121212",
	"lightblack": "#aeaeae"
};

export const links = {
	ignorePaths: [
		'/system:',
		'/forum',
		'/canon-hub',
		'/user:'
	],
	whitelist: [
		/scp-wiki\.net$/,
		/scpwiki\.com$/,
		/scp.*wikidot\.com$/,
		/scp-wiki-cn\.org$/
	]
};

export default {
	'clear-scripts': true,
	'clear-styles': true
}

window.require = undefined;
window.define = undefined;

// this is pretty messy. beware!

import {
	minColorContrast,
	themeColors,
	palette
} from './config.js';

import nearestColor from './nearestColor.js';
import tinycolor from './tinycolor.js';

import {
	append
} from './helpers.js';

export async function loadTinycolor() {
	if (window.tinycolor) {
		return window.tinycolor;
	}
	window.tinycolor = tinycolor;
	return window.tinycolor;
}

// export let tinycolor = window.tinycolor;

function asColor(c) {
	return tinycolor(c);
}

class ColorManager {
	constructor() {
		this.palette = new Map();
		this.themes = {};

		this.lookup = nearestColor.from(palette);
	}
	asSwatchName(color) {
		return color.toHex8String().slice(1);
	}
	asClassName(propType, swatchName) {
		// slice to remove beginning #
		return `${propType}-${swatchName}`;
	}
	asCssVarName(propType) {
		return `--local-${propType}`;
	}
	asCssVar(propType, color) {
		const prop = {
			color: 'color',
			background: 'background-color',
			border: 'border-color'
		}[propType];
		return `${prop}: ${color.toRgbString()};`;
	}
	asRule(propType, swatchName, color) {
		return `.${this.asClassName(propType, swatchName)} { ${this.asCssVar(propType, color) } }`;
	}
	asPairedRule(colorSwatch, backgroundSwatch, color, background) {
		return `.${this.asClassName('color', colorSwatch)}.${this.asClassName('background', backgroundSwatch)} {
			${this.asCssVar('color', color) }
			${this.asCssVar('background', background)}
		}`;
	}
	toThemeCssStyle(theme) {
		const rules = [];
		this.palette.forEach((swatch, name) => {
			const {value, color, background, border, pairedWith} = swatch;

			if (!theme) {
				if (color) {
					rules.push(this.asRule('color', name, value));
				}
				if (background) {
					rules.push(this.asRule('background', name, value));
				}
				if (border) {
					rules.push(this.asRule('border', name, value));
				}
				return;
			}
			// add rules for whenever it gets used for foreground/background
			if (color) {
				// REVIEW any special cases?
				const safeColor = this.getSafeColor(value, theme.background);
				if (tinycolor.equals(safeColor, value)) {
					return;
				}
				rules.push(this.asRule('color', name, safeColor));
			}
			if (background) {
				const safeColor = this.getSafeColor(value, theme.color);
				if (tinycolor.equals(safeColor, value)) {
					return;
				}
				rules.push(this.asRule('background', name, safeColor));
			}
			if (border) {
				// REVIEW any special cases?
				const safeColor = this.getSafeColor(value, theme.background);
				if (tinycolor.equals(safeColor, value)) {
					return;
				}
				rules.push(this.asRule('border', name, safeColor));
			}
			if (pairedWith && pairedWith.length) {
				for(let pairing of pairedWith) {
					const bgName = this.asSwatchName(pairing);
					let bg = pairing.clone();
					const shouldFixBg = theme.background.isDark() && !pairing.isDark();
					if (shouldFixBg) {
						while (tinycolor.readability(bg, theme.background) > minColorContrast * 0.5) {
						// HACK fix to make bright backgrounds less obnoxious
							bg.darken(1);
						}
					}
					const safeColor = this.getSafeColor(value, bg);
					// no changes necessary
					if (
						tinycolor.equals(pairing, bg) &&
						tinycolor.equals(safeColor, value)
					) {
						return;
					}
					rules.push(this.asPairedRule(name, bgName, safeColor, bg));
				}
			}
		});
		const sel = theme ? `:root[__ibooks_internal_theme*="${theme.iBooksName}"]` : '';
		return rules
			.map(line => `${sel} ${line}`)
			.join('\n');
	}
	generateStylesheet() {
		const text = this.toThemeCssStyle() + '\n' +
			Object.entries(this.themes)
				.map(([themeName, theme]) => {
					return this.toThemeCssStyle(theme);
				})
				.join('\n');
		const el = document.createElement('style');
		el.textContent = text;
		el.dataset.epub = 'colors';
		document.head.appendChild(el);
	}
	addSwatch(color, type = 'color') {
		color = tinycolor(color);
		const swatchName = this.asSwatchName(color);
		const swatch = this.palette.get(swatchName) || {
			value: color
		};
		swatch[type] = true;
		this.palette.set(swatchName, swatch);
		return swatchName;
	}
	addDoubleSwatch(color, background) {
		const swatchName = this.addSwatch(color, 'color');
		const swatch = this.palette.get(swatchName);
		if (!swatch.pairedWith) {
			swatch.pairedWith = [];
		}
		swatch.pairedWith.push(background);
	}
	getSafeColor(inColor, bgColor) {
		if (!(inColor instanceof tinycolor)) {
			inColor = new tinycolor(inColor);
		}
		if (!(bgColor instanceof tinycolor)) {
			bgColor = new tinycolor(bgColor);
		}
		let color = inColor.clone();

		let delta = tinycolor.readability(color, bgColor);

		// just quick shortcut
		if (delta >= minColorContrast) {
			return inColor;
		}

		const direction = bgColor.isDark() ? 1 : -1;
		const increment = 1;

		// NOTE: very naive implementation. Should use search or something
		// if sufficient then it's fine
		// i is for sanity check. not efficient. should check if white or black
		let i = 0;
		while (delta < minColorContrast && i++ < 100) {
			// keep modifying same color
			color.brighten(direction * increment);
			delta = tinycolor.readability(color, bgColor);
		}
		return color;
	}
	getNearestColor(color, type) {
		const match = this.lookup(tinycolor(color).toHexString());
		switch (type) {
		case 'color':
		case 'border':
			return match.name.replace(/light|dark/, '');
		case 'background':
		default:
			return match.name;
		}
	}
	/**
	 *
	 * @param {HTMLElement} el
	 */
	processNode(el) {
		// TODO handle case of color and background both being set
		const computed = getComputedStyle(el);
		const inlineStyle = el.style;
		const keys = [...inlineStyle];
		const isInline = computed['display'] === 'inline';

		const backgroundColor = tinycolor(computed['background-color']);
		const color = tinycolor(computed['color']);
		const borderColor = tinycolor(computed['border-color']);

		const bgKeys = keys.filter(k => k.startsWith('background'));
		const hasBg = bgKeys.length > 0;
		const hasColor = !!inlineStyle.color;
		const hasBorder = keys.some(k => k.startsWith('border')) && borderColor.getAlpha() > 0;

		if (hasColor) {
			const swatchName = this.getNearestColor(color, 'color').replace(/light|dark/, '');
			el.classList.add(swatchName);
			// const swatchName = this.addSwatch(color, 'color');
			// el.classList.add(this.asClassName('color', swatchName));
			el.style.color = '';
		}

		if (hasBg) {
			if (backgroundColor.getAlpha() > 0) {
				const swatchName = this.getNearestColor(backgroundColor, 'background').replace(/light|dark/, '');
				el.classList.add(`bg-${swatchName}`);
				// const swatchName = this.addSwatch(backgroundColor, 'background');
				// el.classList.add(this.asClassName('background', swatchName));
			}
			bgKeys.forEach(k => el.style[k] = '');
		}

		if (hasColor && hasBg) {
			// this.addDoubleSwatch(color, backgroundColor);
		}

		if (hasBorder) {
			const swatchName = this.getNearestColor(borderColor, 'border').replace(/light|dark/, '');
			el.classList.add(`border-${swatchName}`);

			// const swatchName = this.addSwatch(borderColor, 'border');
			// el.classList.add(this.asClassName('border', swatchName));
			el.style.borderColor = '';
		}

		// clear any unnecessary border styles
		if (el.style.borderImage) {
			el.style.borderImage = '';
		}

		// if borderstyle is initial then unset everything
		if (el.style.borderStyle === 'initial') {
			keys.filter(k => k.startsWith('border')).forEach(k => el.style[k] = '');
		}
	}
	async process(parent = document.body) {
		for (let [key, theme] of Object.entries(themeColors)) {
			this.themes[key] = {
				default: !!theme.default,
				iBooksName: theme.iBooksName,
				color: tinycolor(theme.color),
				background: tinycolor(theme.background),
				border: tinycolor(theme.border)
			};
		}

		parent.querySelectorAll('[style]')
			.forEach(el => this.processNode(el));
		try {
			if (typeof window.registerPalette === 'function') {
				const palette = Object.entries(this.palette)
					.reduce((out, [key, value]) => {
						out[key] = value;
					}, {});
				await window.registerPalette(palette);
			}
		} catch (err) {
			console.error('Not able to register palette', err);
		}
		// this.generateStylesheet();
	}
}


// function getThemeColors(el = document.body) {
// 	const out = {
// 		background: {},
// 		color: {},
// 		border: {}
// 	};
// 	for (let [key, theme] of Object.entries(themeColors)) {
// 		out.color[key] = tinycolor(theme.color);
// 		out.background[key] = tinycolor(theme.color);
// 		out.border[key] = tinycolor(theme.color);
// 	}
// 	return out;
// 	// const bodyStyle = getComputedStyle(el);
// 	// const result = ['white', 'sepia', 'gray', 'night']
// 	// 	.reduce((out, s) => {
// 	// 		const colorVar = `--theme-${s}-color`;
// 	// 		const bgVar = `--theme-${s}-background`;
// 	// 		const borderVar = `--theme-${s}-border`;
// 	// 		out[s] = {
// 	// 			color: tinycolor(bodyStyle.getPropertyValue(colorVar)),
// 	// 			background: tinycolor(bodyStyle.getPropertyValue(bgVar)),
// 	// 			border: tinycolor(bodyStyle.getPropertyValue(borderVar))
// 	// 		};
// 	// 		return out;
// 	// 	}, {});
// 	// return result;
// }

// function getColorsForThemes(input, themes) {
// 	const result = {};
// 	Object.entries(themes).map(([key, theme]) => {
// 		const {
// 			color: themeColor,
// 			background: themeBackground
// 		} = theme;

// 		const out = {};

// 		// TODO DRY this up
// 		if (input.color) {
// 			const newColor = getSafeColor(input.color, themeBackground);
// 			// not same, add to element
// 			if (!tinycolor.equals(input.color, newColor)) {
// 				out.color = newColor;
// 			}
// 		}

// 		if (input.background) {
// 			const newBackground = getSafeColor(input.background, themeColor);
// 			if (!tinycolor.equals(input.background, newBackground)) {
// 				result.background = newBackground;
// 			}
// 		}

// 		if (input.border) {
// 			const newBorder = getSafeColor(input.border, themeBackground);
// 			if (!tinycolor.equals(input.border, newBorder)) {
// 				result.border = newBorder;
// 			}
// 		}

// 		if (Object.keys(out).length > 0) {
// 			result[key] = out;
// 		}
// 	});
// 	return result;
// }

// function calcInlineStyle(el, themes) {
// 	const computed = getComputedStyle(el);
// 	const inlineStyle = el.style;
// 	const keys = [...inlineStyle];
// 	const isInline = computed['display'] === 'inline';

// 	const backgroundColor = tinycolor(computed['background-color']);
// 	const color = tinycolor(computed['color']);
// 	const borderColor = tinycolor(computed['border']);

// 	const hasBg = keys.some(k => k.startsWith('background')) && backgroundColor.getAlpha() > 0;
// 	const hasColor = !!inlineStyle.color;
// 	const hasBorder = keys.some(k => k.startsWith('border')) && borderColor.getAlpha() > 0;

// 	const local = {};
// 	if (hasColor) {
// 		local.color = color;
// 	}
// 	if (hasBg) { local.background = backgroundColor; }
// 	if (hasBorder) { local.border = borderColor; }

// 	// nothing to do
// 	if (Object.keys(local).length === 0) {
// 		return '';
// 	}

// 	const localOverrides = getColorsForThemes(local, themes);

// 	return Object.entries(localOverrides)
// 		.map(([themeName, overrides]) => {
// 			//return `--theme-${themeName}-${prop}: ${overrides[prop].toRgbString()};`;
// 			return ['color', 'background', 'border']
// 				.map(prop => {
// 					if (!overrides[prop]) {
// 						return;
// 					}
// 					if (prop === 'color') {
// 						el.style.color = 'var(--foreground)';
// 					} else if (prop === 'background') {
// 						el.style.background = 'var(--background)';
// 					} else if (prop === 'border') {
// 						el.style.borderColor = 'var(--border)';
// 					}

// 					return `--theme-${themeName}-${prop}: ${overrides[prop].toRgbString()};`;
// 				})
// 				.filter(p => p)
// 				.join(' ');
// 		})
// 		.join(' ');
// }

export default async function (parent = document.body) {
	const instance = new ColorManager();
	await instance.process(parent);
	// await loadTinycolor();
	// const themes = getThemeColors(parent);
	// parent.querySelectorAll('[style]').forEach(el => {
	// 	const origStyle = el.getAttribute('style');
	// 	const newStyle = calcInlineStyle(el, themes);
	// 	el.setAttribute('style', `${newStyle}; ${origStyle}`);
	// });
}

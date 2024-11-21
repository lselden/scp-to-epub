export default {
	async beforeParse() {
	},
	async afterParse() {
		// HACK to manually add back some CSS.
		// this is so that the images overlay properly in night/sepia mode in ibooks
		const el = document.createElement('style');
		el.type = 'text/css';
		el.innerHTML = `
			/*
			:root[__ibooks_internal_theme*="Night"] .epub-figure > img.image {
				filter: none;
			}
			:root[__ibooks_internal_theme*="Gray"] .epub-figure > img.image {
				filter: none;
			}
			*/

			:root[__ibooks_internal_theme*="Night"] .epub-figure {
				background: var(--foreground);
			}

			.image-container.aligncenter {
				text-align: center;
			}
			.image-container {
				background: var(--background);
			}
			:root[__ibooks_internal_theme*="Sepia"] .image {
				mix-blend-mode: multiply;
			}
			:root[__ibooks_internal_theme*="Gray"] .image {
				filter: invert(1) hue-rotate(180deg);
				mix-blend-mode: color-dodge;
			}
			:root[__ibooks_internal_theme*="Night"] .image {
				filter: invert(1) hue-rotate(180deg);
				mix-blend-mode: exclusion;
			}
		`;
		document.head.appendChild(el);

	}
}

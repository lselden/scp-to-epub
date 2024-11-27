export default {
	async beforeParse() {
        // make sure images don't get compressed
        [...document.querySelectorAll('.image-container img')].forEach(el => el.dataset.compress = 'false');

        const explicitSizes = [...document.querySelectorAll('img[alt*=".png"]')].map(el => {
            if (!el.alt?.endsWith('.png')) return;
            const pxSize = parseInt((el.style?.width || 'px').replace('px',''));
            if (!pxSize || !(pxSize <= 110)) {
                return;
            }
            const emSize = pxSize / 15;
            return `img[alt="${el.alt}"] { width: ${emSize}rem; }`;
        }).filter(Boolean);
        globalThis._explicitSizes = explicitSizes;
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

            img[alt="scp.png"] { display: inline-block; vertical-align: middle; }
            .image-container.alignleft > img {
                margin-left: 0;
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

            ${(globalThis._explicitSizes || []).join('\n')}
		`;
		document.head.appendChild(el);

	}
}

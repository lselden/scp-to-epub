import {$, remove} from "../client/helpers.js";

export default {
    async beforeParse() {
        let el = $('#wiki-tab-0-1');
        if (el) {
            el.style.display = 'block';
            el.closest('.yui-navset-top').replaceWith(el);
        }

        // should already be gone, but just in case
        const randEl = $('#wiki-tab-0-0');
        if (randEl) {
            randEl.style.display = 'none';
            remove('#wiki-tab-0-0 iframe');
        }
    },
    async afterParse() {
        console.log('hello!');
        // add a bunch of extra space
        const mimeticEl = document.querySelector('.image-container.aligncenter');
        mimeticEl?.insertAdjacentHTML('beforebegin', `
    <p style="display: block;height: 500vh;page-break-after: always;page-break-before: always;page-break-inside: auto;"></p>
    <hr class="epub-transition epub-whitespace-break"></hr>`);
        
    }
}
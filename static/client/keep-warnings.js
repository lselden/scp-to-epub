import {switchTag} from './helpers.js';

export default function () {
    const warning = document.getElementById('u-adult-warning');
    if (!warning) return;

    warning.classList.add('warning-box');
    warning.style.height = 'initial';
    warning.closest('.modal-wrapper').replaceWith(warning);
    const header = warning.querySelector('#u-adult-header');
    if (header) {
        header.classList.add('red');
        switchTag(header, 'h3');
    }
    
    const id = `_${Math.random().toString(16).slice(2)}`;
    const nextPage = document.createElement('div');
    nextPage.innerHTML = `<hr class="epub-transition epub-whitespace-break" style="height: 50vh; page-break-after: always; background: transparent"><hr id="${id}" style="margin-top: 50vh">`;
    
    warning.appendChild(nextPage);

    warning.querySelector('.foldable-list-container.choice a')?.setAttribute('href', `#${id}`);
    const returnLink = warning.querySelector('.foldable-list-container.choice + .choice a');
    // redirect back to beginning of book
    returnLink?.setAttribute('href', 'toc.xhtml');
    returnLink?.setAttribute('rel', 'nofollow');

    warning.querySelector('.footer-wikiwalk-nav')?.remove();

}
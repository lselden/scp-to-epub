export default {
    async beforeParse() {
        [...document.querySelectorAll('span[style]')]
            .filter(el => /[01]{8,}/.test(el.textContent))
            .forEach(el => el.remove());
    }
}
export default function () {
	document.querySelectorAll('style:not([data-epub])').forEach(el => el.remove());
	document.querySelectorAll('link:not([data-epub])').forEach(el => el.remove());
}

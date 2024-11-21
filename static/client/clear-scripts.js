
export default function () {
	document.querySelectorAll('script:not([data-epub])').forEach(el => el.remove());
	define = undefined;
	require = undefined;
}

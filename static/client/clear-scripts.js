
export default function () {
	document.querySelectorAll('script:not([data-epub])').forEach(el => el.remove());
    document.querySelectorAll('[action*="javascript:"]').forEach(el => el.setAttribute('action', '#'));
	define = undefined;
	require = undefined;
}

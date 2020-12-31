export default function fixLicensing() {
	const licensebox = document.querySelector('.licensebox');
	if (!licensebox) {
		return;
	}
	licensebox.innerHTML = `<strong>‡ Licensing / Citation:</strong> see <a href="${location.origin}${location.pathname}#:~:text=%E2%80%A1%20Licensing%20/%20Citation" rel="nofollow">This article's original page</a> for licensing/citation information.`
}


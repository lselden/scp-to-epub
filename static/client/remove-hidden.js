
function isIntersectingViewport(node) {
	const root = document.body;
	if (node === root) {
		return true;
	}
	return new Promise(resolve => {
		const observer = new IntersectionObserver(entries => {
			resolve(entries[0].isIntersecting);
			observer.disconnect();
		}, {
			root
		});
		observer.observe(node);
	});
}

async function removeHidden() {
	const removeMap = new Set();
	async function recurseRemove(el) {
		const isVisible = await isIntersectingViewport(el);
		if (!isVisible) {
			if (el.matches('section')) {
				// debugger;
			}
			removeMap.add(el);
			return;
		}

		if (el.children && el.children.length) {
			// NOTE this could crash if too many nodes...not throttled
			const promises = [...el.children]
				.map(child => recurseRemove(child));
			await Promise.all(promises);
		}
	}
	await recurseRemove(document.body);
	// remove all found nodes to remove
	[...removeMap].forEach(el => el.remove());
}

export default removeHidden;

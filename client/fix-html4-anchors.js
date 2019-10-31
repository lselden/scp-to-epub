export default async function () {
	document.querySelectorAll('a[name]:not([href])').forEach(el => {
		const id = el.getAttribute('name');
		// already exists anchor
		if (document.getElementById(id)) {
			return;
		}

		let targetNode = el.nextElementSibling;
		if (targetNode && !targetNode.id && targetNode.textContent) {
			targetNode.id = id;
			if (!el.textContent) {
				el.remove();
			}
			return;
		}

		if (el.innerHTML) {
			targetNode = document.createElement('div');
			targetNode.innerHTML = el.innerHTML;
		} else {
			targetNode = document.createElement('span');
		}
		targetNode.id = id;
		targetNode.className = 'anchor';

		// p doesn't want hr as child, and sometimes wikidot will create a <p><a /></p> situation. so just replace the <p> instead of child </a>
		if (
			el.parentElement &&
			el.parentElement.matches('p') &&
			el.parentElement.children.length === 1
		) {
			el = el.parentElement;
		}
		el.replaceWith(targetNode);
	});
}

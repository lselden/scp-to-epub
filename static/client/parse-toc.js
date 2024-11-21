function escape(unsafe) {
	return unsafe.replace(/[&<"']/g, function(x) {
		switch (x) {
		case '&': return '&amp;';
		case '<': return '&lt;';
		case '"': return '&quot;';
		default: return '&#039;';
		}
	});
}

function nextUntil(el, sel) {
	const siblings = [];
	let currentElement = el;
	while (currentElement = currentElement.nextSibling) {

		if (
			currentElement.nodeType === Node.ELEMENT_NODE &&
			currentElement.matches(sel)
		) {
			break;
		}
		siblings.push(currentElement);
	}
	return siblings;
}

const headerSelector = 'h2';
const blocks = [];
document.querySelectorAll(headerSelector)
	.forEach((header, index) => {
		const block = {
			title: escape(header.textContent),
			titleHTML: header.innerHTML,
			index,
			chapters: [],
			html: header.innerHTML
		};
		const children = nextUntil(header, headerSelector);
		// verify children
		children.forEach(child => {
			if (!child || !child.nodeType) {
				return;
			}
			if (child.nodeType === Node.TEXT_NODE) {
				// REVIEW this often just may have unnecessary whitespace...
				block.html += escape(child.textContent);
				return;
			}
			// skip comment nodes etc.
			if (child.nodeType !== Node.ELEMENT_NODE) {
				return;
			}
			// sanity check - doesn't support nested headers right now
			const innerHeader = child.querySelector(headerSelector);
			if (innerHeader) {
				throw new Error(`Sorry! Nested header elements (${headerSelector}) are not currently supported. Found ${innerHeader.nodeType} ${innerHeader.textContent} as child of ${header.nodeType} ${header.textContent}'s siblings`);
			}

			// now get any links
			child.querySelectorAll('a').forEach(link => {
				block.chapters.push({
					title: link.innerHTML,
					url: link.getAttribute('href')
				});
			});

		});
	});

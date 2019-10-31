export function $(el, sel) {
	if (typeof el === 'string') {
		[el, sel] = [document.body, el];
	}
	!el && (el = document.body);
	return el.querySelector(sel);
}
export function $$(el, sel) {
	if (typeof el === 'string') {
		[el, sel] = [document.body, el];
	}
	!el && (el = document.body);
	return el.querySelectorAll(sel);
}
export function rand() {
	return Math.random().toString(16).slice(2);
}
export function switchTag(el, newTag, copyAttrs = true) {
	const newEl = document.createElement(newTag);
	newEl.innerHTML = el.innerHTML;
	if (copyAttrs) {
		[...el.attributes].forEach(attr => {
			newEl.setAttributeNode(attr.cloneNode());
		});
	}
	el.replaceWith(newEl);
	return newEl;
}
export function remove(el, scope = document.body) {
	try {
		if (typeof el === 'string') {
			el = helpers.$$(scope, el);
		}

		if (Array.isArray(el) || (el instanceof NodeList) || el.forEach) {
			el.forEach(el => el.remove());
		} else if (el) {
			el.remove();
		}
	} catch (err) {
		//
		console.debug(`failed to remove element ${err}`);
	}
}

export function escape(unsafe) {
	return unsafe.replace(/[&<"']/g, function(x) {
		switch (x) {
		case '&': return '&amp;';
		case '<': return '&lt;';
		case '"': return '&quot;';
		default: return '&#039;';
		}
	});
}

export function append(target, children) {
	const methods = [
		(target, children) => target.append(...children),
		(target, children) => {
			let i = 0;
			const n = children.length;
			while (children.length > 0 && i++ <= n) {
				const c = children.shift();
				target.insertAdjacentElement('beforeend', c);
			}
		},
		(target, children) => {
			let i = 0;
			const n = children.length;
			while (children.length > 0 && i++ <= n) {
				const c = children.shift();
				const el = c.cloneNode(true);
				target.append(el);
				c.parentNode && c.remove();
			}
		},
		(target, children) => {
			const html = children.map(el => el.outerHTML || el.textContent).join('\n');
			target.insertAdjacentHTML('beforeend', html);
			children.forEach(el => el.parentNode && el.remove());
		}
	];
	if (children instanceof NodeList) {
		children = [...children];
	}
	if (!Array.isArray(children)) {
		children = [children];
	}
	const n = children.length;
	const preTargetLength = target.children.length;
	for (let method of methods) {
		try {
			console.debug('attempting', method);
			method(target, children);
			if (preTargetLength + n !== target.children.length) {
				console.warn('Length mismatch in appending', target, children, preTargetLength, n);
			}
			return target;
		} catch (err) {
			console.debug('Unable to append, trying alternate method', err);
			// something on page blocked it
		}
	}
	return target;
}


const helpers = {
	$,
	$$,
	rand,
	switchTag,
	remove
};

export default helpers;

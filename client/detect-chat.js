
// add data markers for speech bubble type dialogs
function detectChat() {
	const minDialogEntries = 3;
	const dataKey = 'chatBubbleType';
	const seen = new Set();
	const actors = new Map();
	document.querySelectorAll('[style*=float][style*=width] ~ [style*=float][style*=width]').forEach(match => {
		const parent = match.parentElement;
		if (seen.has(parent)) {
			return;
		}
		seen.add(parent);
		const possibleDialog = parent.querySelectorAll(':scope > [style*=float]');
		if (possibleDialog.length < minDialogEntries) {
			return;
		}

		possibleDialog.forEach(el => {
			// check for no text content
			if (!/[^\t\n\r ]/.test(el.textContent)) {
				return;
			}
			const style = getComputedStyle(el);
			const float = style.float;
			if (!['left', 'right'].includes(float)) {
				return;
			}
			const bgColor = [el].concat(...el.querySelectorAll(':scope > [style*=background], :scope > * > [style*=background]')).reduce((out, current) => {
				if (out) {
					return out;
				}
				const style = getComputedStyle(current);
				if (
					style.backgroundColor &&
					!/transparent|rgba\([\d,\s]+,\s*0(\.0\d*)?\)/.test(style.backgroundColor)
				) {
					return style.backgroundColor;
				}

				if (
					style.backgroundImage &&
					style.backgroundImage !== 'none'
				) {
					return style.backgroundImage;
				}
			}, undefined);

			const key = `${float}_${bgColor}`;
			if (!actors.has(key)) {
				actors.set(key, `${actors.size + 1}`);
			}
			el.dataset[dataKey] = actors.get(key);
		});
	});
}

export default detectChat;

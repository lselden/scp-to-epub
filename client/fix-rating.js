import helpers from './helpers.js';

function fixRating() {
	const ratebox = document.querySelector('.page-rate-widget-box');
	if (!ratebox) {
		return;
	}
	const rating = ratebox.querySelector(':scope > .rate-points').innerText;
	const isHeritage = !!document.querySelector('.heritage-rating-module');
	window.__epubIsHeritage = isHeritage;

	document.getElementById('page-title')
		.insertAdjacentHTML('afterend', `<aside class="epub-rating">${rating}</aside>`);

	if (isHeritage) {
		document.body.classList.add('heritage');
	}

	helpers.remove(ratebox);
	// get rid of any extra boxes
	helpers.remove('.page-rate-widget-box, .creditRate, .heritage-rating-module');
}

export default fixRating;

// from https://www.npmjs.com/package/fitty
var fitty = (() => { var e = function (e) { if (e) { var t = function (e) { return [].slice.call(e) }, n = 0, i = 1, r = 2, o = 3, a = [], l = null, u = "requestAnimationFrame" in e ? function () { var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : { sync: !1 }; e.cancelAnimationFrame(l); var n = function () { return s(a.filter((function (e) { return e.dirty && e.active }))) }; if (t.sync) return n(); l = e.requestAnimationFrame(n) } : function () { }, c = function (e) { return function (t) { a.forEach((function (t) { return t.dirty = e })), u(t) } }, s = function (e) { e.filter((function (e) { return !e.styleComputed })).forEach((function (e) { e.styleComputed = m(e) })), e.filter(y).forEach(v); var t = e.filter(p); t.forEach(d), t.forEach((function (e) { v(e), f(e) })), t.forEach(S) }, f = function (e) { return e.dirty = n }, d = function (e) { e.availableWidth = e.element.parentNode.clientWidth, e.currentWidth = e.element.scrollWidth, e.previousFontSize = e.currentFontSize, e.currentFontSize = Math.min(Math.max(e.minSize, e.availableWidth / e.currentWidth * e.previousFontSize), e.maxSize), e.whiteSpace = e.multiLine && e.currentFontSize === e.minSize ? "normal" : "nowrap" }, p = function (e) { return e.dirty !== r || e.dirty === r && e.element.parentNode.clientWidth !== e.availableWidth }, m = function (t) { var n = e.getComputedStyle(t.element, null); return t.currentFontSize = parseFloat(n.getPropertyValue("font-size")), t.display = n.getPropertyValue("display"), t.whiteSpace = n.getPropertyValue("white-space"), !0 }, y = function (e) { var t = !1; return !e.preStyleTestCompleted && (/inline-/.test(e.display) || (t = !0, e.display = "inline-block"), "nowrap" !== e.whiteSpace && (t = !0, e.whiteSpace = "nowrap"), e.preStyleTestCompleted = !0, t) }, v = function (e) { e.element.style.whiteSpace = e.whiteSpace, e.element.style.display = e.display, e.element.style.fontSize = e.currentFontSize + "px" }, S = function (e) { e.element.dispatchEvent(new CustomEvent("fit", { detail: { oldValue: e.previousFontSize, newValue: e.currentFontSize, scaleFactor: e.currentFontSize / e.previousFontSize } })) }, h = function (e, t) { return function (n) { e.dirty = t, e.active && u(n) } }, w = function (e) { return function () { a = a.filter((function (t) { return t.element !== e.element })), e.observeMutations && e.observer.disconnect(), e.element.style.whiteSpace = e.originalStyle.whiteSpace, e.element.style.display = e.originalStyle.display, e.element.style.fontSize = e.originalStyle.fontSize } }, b = function (e) { return function () { e.active || (e.active = !0, u()) } }, z = function (e) { return function () { return e.active = !1 } }, F = function (e) { e.observeMutations && (e.observer = new MutationObserver(h(e, i)), e.observer.observe(e.element, e.observeMutations)) }, g = { minSize: 16, maxSize: 512, multiLine: !0, observeMutations: "MutationObserver" in e && { subtree: !0, childList: !0, characterData: !0 } }, W = null, E = function () { e.clearTimeout(W), W = e.setTimeout(c(r), x.observeWindowDelay) }, M = ["resize", "orientationchange"]; return Object.defineProperty(x, "observeWindow", { set: function (t) { var n = "".concat(t ? "add" : "remove", "EventListener"); M.forEach((function (t) { e[n](t, E) })) } }), x.observeWindow = !0, x.observeWindowDelay = 100, x.fitAll = c(o), x } function C(e, t) { var n = Object.assign({}, g, t), i = e.map((function (e) { var t = Object.assign({}, n, { element: e, active: !0 }); return function (e) { e.originalStyle = { whiteSpace: e.element.style.whiteSpace, display: e.element.style.display, fontSize: e.element.style.fontSize }, F(e), e.newbie = !0, e.dirty = !0, a.push(e) }(t), { element: e, fit: h(t, o), unfreeze: b(t), freeze: z(t), unsubscribe: w(t) } })); return u(), i } function x(e) { var n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}; return "string" == typeof e ? C(t(document.querySelectorAll(e)), n) : C([e], n)[0] } }("undefined" == typeof window ? null : window); return e; })()

var defaultImage = `<svg class="cover-image" version="1.0" xmlns="http://www.w3.org/2000/svg"
                width="2400.000000pt" height="2400.000000pt" viewBox="0 0 2400.000000 2400.000000"
                preserveAspectRatio="xMidYMid meet">
                <metadata>
                Created by potrace 1.11, written by Peter Selinger 2001-2013
                </metadata>
                <g transform="translate(0.000000,2400.000000) scale(0.100000,-0.100000)"
                fill="currentColor" stroke="none">
                <path d="M8816 22953 c-3 -16 -73 -417 -156 -893 -82 -476 -153 -871 -157
                -878 -5 -7 -73 -39 -153 -71 -1549 -625 -2944 -1665 -3986 -2971 -1080 -1354
                -1787 -2968 -2039 -4650 -14 -96 -31 -186 -36 -199 -20 -49 -60 -433 -79 -765
                -13 -230 -13 -808 0 -1051 12 -218 31 -422 62 -683 l22 -184 -40 -37 c-83 -78
                -194 -180 -304 -281 -63 -58 -146 -134 -185 -170 -84 -79 -99 -92 -522 -484
                -183 -168 -334 -310 -337 -315 -3 -4 122 -228 277 -497 155 -269 881 -1525
                1612 -2791 731 -1267 1334 -2303 1340 -2303 6 0 85 27 176 61 90 33 286 105
                434 159 880 322 1096 400 1104 400 6 0 36 -22 69 -49 183 -153 632 -469 927
                -653 500 -312 1151 -630 1760 -858 1454 -545 3063 -737 4605 -550 823 100
                1654 308 2395 600 99 39 189 72 200 74 54 9 374 155 690 314 513 260 962 538
                1433 889 l193 143 52 -16 c29 -9 66 -20 82 -26 47 -15 503 -157 570 -177 116
                -35 650 -202 675 -211 14 -5 72 -23 130 -40 58 -18 147 -45 198 -62 51 -16 97
                -28 102 -26 12 4 3232 5579 3228 5588 -3 7 -195 169 -998 838 -201 168 -373
                313 -384 322 -18 18 -18 21 2 167 111 782 124 1556 41 2373 -192 1889 -916
                3661 -2105 5152 -762 956 -1725 1780 -2794 2391 -335 191 -801 420 -1137 557
                -46 18 -85 41 -87 49 -3 9 -96 419 -206 911 -111 492 -204 903 -206 913 -5 16
                -168 17 -3234 17 l-3228 0 -6 -27z m5928 -510 c8 -27 235 -999 316 -1353 39
                -173 75 -328 79 -345 7 -28 18 -34 197 -103 394 -152 864 -370 1189 -552 1060
                -592 1973 -1362 2720 -2290 1164 -1447 1863 -3202 2014 -5055 33 -401 39
                -1112 11 -1445 -26 -320 -75 -695 -132 -1013 l-12 -67 44 -43 c25 -23 86 -76
                135 -117 50 -41 95 -80 102 -86 6 -6 57 -49 114 -95 56 -46 145 -120 198 -164
                53 -45 224 -188 381 -319 382 -320 355 -295 343 -315 -5 -9 -612 -1059 -1347
                -2333 -804 -1393 -1344 -2318 -1352 -2318 -8 0 -88 22 -177 49 -89 27 -178 54
                -197 59 -42 11 -449 134 -535 161 -33 11 -100 31 -150 46 -49 15 -99 31 -110
                35 -11 5 -40 14 -65 20 -25 6 -54 15 -65 20 -11 5 -51 18 -90 28 -38 11 -125
                37 -192 57 -121 37 -122 37 -147 19 -13 -11 -89 -71 -168 -135 -242 -196 -689
                -519 -717 -519 -5 0 -50 -26 -98 -57 -467 -301 -1049 -599 -1582 -810 -902
                -357 -1797 -559 -2816 -635 -223 -16 -967 -16 -1190 0 -1303 97 -2449 410
                -3565 973 -578 291 -1182 679 -1635 1049 -38 32 -75 59 -82 61 -6 2 -55 42
                -108 88 l-97 83 -47 -10 c-45 -10 -110 -32 -431 -152 -91 -34 -311 -115 -490
                -180 -179 -65 -399 -146 -490 -179 -90 -34 -169 -61 -175 -61 -6 0 -617 1051
                -1359 2336 l-1349 2336 34 30 c19 17 108 101 199 187 91 85 194 183 230 216
                36 34 108 102 160 152 52 50 119 112 149 139 30 27 71 65 92 84 68 64 261 245
                288 269 14 13 56 52 92 87 l67 64 -14 72 c-50 260 -105 734 -109 928 -1 80 -6
                296 -10 480 -12 533 20 1039 100 1565 390 2571 1841 4857 4000 6300 631 423
                1339 780 2020 1020 115 41 120 44 128 76 10 40 75 405 198 1114 50 286 93 530
                96 543 l5 22 2698 0 c2562 0 2699 -1 2704 -17z"/>
                <path d="M11640 19006 l0 -515 -42 -5 c-24 -2 -137 -14 -252 -26 -1014 -101
                -2043 -474 -2917 -1056 -699 -465 -1328 -1094 -1793 -1793 -314 -471 -591
                -1038 -765 -1567 -484 -1466 -435 -3040 139 -4470 40 -99 110 -257 156 -353
                46 -96 84 -177 84 -181 0 -4 -220 -134 -490 -290 -269 -155 -496 -287 -505
                -294 -13 -9 12 -58 182 -353 109 -189 201 -343 204 -343 4 0 233 130 509 290
                276 160 505 290 510 290 4 0 49 -58 99 -129 440 -618 1030 -1189 1670 -1615
                471 -314 1038 -591 1567 -765 1335 -441 2753 -441 4088 0 529 174 1096 451
                1567 765 648 431 1226 992 1683 1634 59 83 109 150 112 150 2 0 226 -128 497
                -284 270 -157 499 -288 508 -291 12 -5 59 69 213 336 178 307 196 344 181 355
                -9 7 -237 139 -506 294 -269 156 -489 286 -489 290 0 4 33 76 74 161 554 1156
                745 2548 525 3839 -153 901 -498 1771 -1005 2531 -401 603 -917 1147 -1504
                1588 -326 244 -618 424 -1000 615 -707 353 -1451 571 -2206 646 -115 12 -228
                24 -251 26 l-43 5 0 515 0 514 -400 0 -400 0 0 -514z m0 -2876 l0 -1160 -456
                0 c-265 0 -454 -4 -452 -9 10 -29 1324 -2571 1328 -2571 4 0 1317 2542 1328
                2571 2 5 -197 9 -472 9 l-476 0 0 1160 0 1160 45 0 c141 0 562 -70 846 -141
                382 -95 684 -207 1054 -389 404 -199 729 -410 1080 -701 153 -126 546 -526
                678 -688 195 -241 376 -505 525 -767 80 -141 244 -483 306 -641 460 -1162 498
                -2453 106 -3631 -89 -268 -249 -652 -272 -652 -12 0 -1848 1058 -1867 1076
                -12 10 21 74 207 396 122 211 222 387 222 393 0 10 7 10 -230 20 -96 4 -182 8
                -190 10 -8 1 -98 6 -200 9 -102 4 -207 9 -235 11 -27 2 -117 7 -200 10 -82 3
                -170 8 -195 10 -25 2 -124 7 -220 11 -96 3 -190 7 -208 9 -18 1 -110 6 -205
                10 -94 4 -188 8 -207 10 -19 2 -120 6 -225 10 -104 4 -197 8 -205 10 -38 7
                -370 17 -370 11 0 -4 284 -449 632 -989 347 -540 699 -1087 782 -1215 135
                -210 151 -232 163 -216 7 10 115 195 240 411 l227 393 30 -18 c17 -10 439
                -254 939 -542 499 -288 907 -528 907 -533 0 -15 -148 -214 -269 -362 -123
                -151 -521 -554 -666 -674 -220 -183 -463 -355 -705 -501 -169 -103 -570 -300
                -757 -374 -1266 -500 -2660 -500 -3926 0 -187 74 -588 271 -757 374 -242 146
                -487 319 -705 501 -142 118 -523 501 -645 649 -114 137 -274 349 -269 355 2 2
                411 238 909 525 498 287 919 531 937 541 l31 19 218 -377 c120 -208 223 -386
                230 -396 10 -16 19 -6 73 80 34 54 123 193 198 308 74 116 186 289 248 385
                106 166 450 701 540 840 23 36 124 193 225 350 101 157 207 322 236 367 30 46
                54 88 54 94 0 7 -24 9 -77 5 -43 -3 -139 -8 -213 -11 -74 -3 -169 -7 -210 -10
                -81 -5 -221 -12 -420 -20 -69 -3 -159 -7 -200 -10 -41 -3 -131 -7 -200 -10
                -127 -5 -242 -11 -417 -20 -54 -3 -197 -10 -318 -15 -121 -5 -264 -12 -317
                -15 -54 -3 -142 -7 -195 -10 -243 -12 -323 -18 -323 -24 0 -3 105 -189 234
                -411 l234 -405 -27 -16 c-87 -55 -1851 -1069 -1859 -1069 -12 0 -105 198 -177
                376 -291 718 -424 1539 -375 2309 57 888 328 1732 798 2490 103 166 260 384
                399 556 132 162 525 562 678 688 351 291 676 502 1080 701 370 182 672 294
                1054 389 288 72 679 138 834 140 l57 1 0 -1160z"/>
                </g>
                </svg>`;

function isVisible(el) { return el && el.offsetWidth * el.offsetHeight > 0; }
function isLoaded(img) { return img && img.naturalHeight * img.naturalWidth > 0; }

async function getLogoImage(minWidth = 480, minHeight = 480) {
    const logoImage = await getCssLogoImage();
    const candidates = [logoImage, ...document.querySelectorAll('.scp-image-block img')]
        .filter(el => el && !el.src.endsWith('black-highlighter-logo.svg') && !el.src.includes('avatar.php'))
        .filter(el => el.naturalWidth >= minWidth && el.naturalHeight >= minHeight)
        .sort((a, b) => {
            const aDim = (a.offsetWidth * a.offsetHeight);
            const bDim = (b.offsetWidth * b.offsetHeight);
            // invisible goes at end of list
            const aIsVisible = isVisible(a) ? 1 : 0.001;
            const bIsVisible = isVisible(b) ? 1 : 0.001;
            // sort biggest to smallest
            return bDim * bIsVisible - aDim * aIsVisible;
        });
    return candidates[0];
}

async function getCssLogoImage() {
    // const raw = getComputedStyle(document.body).getPropertyValue('--logo-image');
    const headerEl = document.querySelector('#header');
    const raw = headerEl && getComputedStyle(headerEl)?.backgroundImage;
    const imageUrl = /url\(['"]?([^\'")]+)['"]?\)/i.exec(raw)?.[1];
    if (!imageUrl) return undefined;
    const img = new Image();
    img.src = imageUrl;
    await img.decode().catch(err => { });
    return isLoaded(img) ? img : undefined;
}

async function createImage(src) {
    const img = new Image();
    img.src = src;
    await img.decode().catch(err => { });
    return isLoaded(img) ? img : undefined;
}

function getDefaultImage() {
    const el = document.createElement('div');
    el.innerHTML = defaultImage;
    return el.firstElementChild;
}

async function getThemeElements(epubPrefix = 'epub-cover') {
    let logo = document.querySelector(`.${epubPrefix}-image`);
    if (!isLoaded(logo)) logo = (await getLogoImage()) || (await getDefaultImage());
    let title = document.querySelector(`.${epubPrefix}-title`);
    if (!title) {
        title = document.querySelector('#page-title, .meta-title');
        if (!isVisible(title)) title = document.querySelector('#page-content h1');
        title ||= document.createElement('h1');
    }
    let author = document.querySelector(`.${epubPrefix}-author`);
    author ||= document.createElement('h2');
    return {
        logo, title, author
    };
}

function makeFittyWrap(text) {
    el = document.createElement('span');
    el.innerText = text;
    el.classList.add('fit');
    return el;
}

function testIsCentered(el) {
    const p = el.parentElement;
    const offset = el.offsetLeft - p.offsetLeft;
    const margin = (p.offsetWidth - el.offsetWidth) / 2;
    // ends up being the diff between left/right offset
    const diff = Math.abs(margin - offset);
    // closer to center than left
    return diff < offset;
}

function checkIsCentered(titleEl) {
    const span = titleEl.firstElementChild;
    const content = span.innerHTML;
    span.innerText = 'X';
    const isCentered = testIsCentered(span);
    span.innerHTML = content;
    return isCentered;
}

async function makeCover({
        title = 'page title',
        author = 'page author',
        image = 'theme',
        keepHeaderBackground = false,
        backgroundImage = undefined,
        overrideCSS = ''
    } = {}) {
    elements = await getThemeElements();
    
    if (image === 'auto' || image === 'theme') {
        // already dealt with
    } else if (image === 'none') {
        elements.logo = null;
    } else if (image === 'default') {
        elements.logo = getDefaultImage();
    } else if (image) {
        const passedImage = await createImage(image);
        if (passedImage) {
            elements.logo = passedImage;
        } else {
            console.warn(`Could not load image ${image}`);
        }
    }

    if (elements.logo) {
        elements.logo.id = 'image';
    }

    document.body.innerHTML = `<div class="cover">
        <div class="cover-text">
            <div class="text-item">
                <h1 id="title" class="top-text fit"><span>${title}</span></h1>
            </div>
            <div class="text-item">
                <h2 id="author" class="bottom-text fit"><span>${author}</span></h2>
            </div>
        </div>
        <div id="image-container" class="cover-image-container"></div>
    </div><div id="extra-div-1"><span></span></div>
    <div id="extra-div-2"><span></span></div>`;
    
    const imgContainer = document.querySelector('#image-container');
    const titleEl = document.querySelector('#title');
    const authorEl = document.querySelector('#author');
    if (elements.logo) imgContainer.appendChild(elements.logo);
    
    document.body.style.setProperty('--body-width-on-desktop', '100%');

    var s = document.createElement('style');
    s.innerText = `
    :root {
            --header-background-image-size: 100% 100%;
            --header-height-on-mobile: 100%;
            --header-height-on-desktop: 100%;
        }
        body {
            margin: 0;
            box-sizing: border-box;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            ${backgroundImage
                ? `background-image: url('${backgroundImage}');
            background-position: center;
            background-size: cover;`
                : ''}
        }
        .cover-content {
            text-align: center;
            width: 100%;
            height: 100%;
            width: 100vw;
            height: 100vh;
            max-width: 100%;
            max-height: 100%;
            margin: 0 auto;
            padding: 5%;
            box-sizing: border-box;
            display: flex;
            flex-flow: nowrap;
            flex-direction: column;
            justify-content: space-evenly;
            align-content: space-evenly;
        }
        .cover-image {
            width: 90%;
            height: 50%;
            object-fit: contain;
            margin: 0 auto;

        }
        #title, #author, .cover .cover-title, .cover .cover-subtitle {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1;
            text-transform: uppercase;
        }
        .cover-text {
            grid-row: 1 / 1;
            grid-column: 1 / 1;
            z-index: 1;
            /* position: fixed; */
            /* top: 0;
            left: 0; */
            width: 100%;
            height: 100%;
            padding: 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 5% 5%;
            color: rgb(var(--swatch-text-light));
        }
        .text-item {
            width: 100%;
            display: flex;
            justify-content: center;
        }
        .cover {
            display: grid;
            grid-template-columns: 1fr;
            grid-template-rows: 1fr;
        }
        .cover-image {
            color: rgb(var(--bright-accent, 255 255 255));
        }
        .cover-image-container {
            grid-row: 1 / 1;
            grid-column: 1 / 1;
            position: relative;
            z-index: 0;
            display: grid;
            align-items: center;
            height: 100vh;
        }
        @media (max-aspect-ratio: 4/5) {
            .cover-image {
                height: 66%;
            }
        }
        @media (max-aspect-ratio: 6/5) {
            .text-item {
                min-height: 20%;
                align-items: center;
            }
        }
`;
    document.head.appendChild(s);
    await new Promise(done => setTimeout(done, 100));
    
    fitty('.top-text.fit', { minSize: 24, maxSize: 120, observeMutations: false });
    await new Promise(done => setTimeout(done, 100));
    var titleSize = getComputedStyle(titleEl).fontSize;
    fitty('.bottom-text.fit', { minSize: 24, maxSize: titleSize.endsWith('px') ? parseInt(titleSize) : 96, observeMutations: false });

    await new Promise(done => setTimeout(done, 100));

    let titleEnd = titleEl.offsetTop + titleEl.offsetHeight;
    var root = document.body.parentElement;

    for (let size of ['desktop', 'mobile']) {
        root.style.setProperty(`--topbar-height-on-${size}`, '0rem');
        root.style.setProperty(`--header-height-on-${size}`, `calc(${titleEnd}px + 2rem)`);
        root.style.setProperty(
            `--final-header-height-on-${size}`,
            `calc(var(--topbar-height-on-${size}) + var(--header-height-on-${size})))`);
    }
    root.style.setProperty('--header-background-image-size', `100% ${titleEnd}px`);

    if (overrideCSS) {
        s = document.createElement('style');
        s.innerText = overrideCSS;
        document.head.appendChild(s);
    }

    // match author centering to title centering
    const isCentered = checkIsCentered(titleEl);
    if (isCentered) {
        authorEl.style.justifyContent = 'center';
    }
}

globalThis.makeCover = makeCover;
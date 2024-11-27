function parseStats() {
    var rating = document.querySelector('#pagerate-button')?.innerText?.replace(/[^0-9+]/g, '')
    var comments = document.querySelector('#discuss-button')?.innerText?.replace(/[^0-9+]/g, '')
    var revised = document.querySelector('#page-info .odate').innerText?.replace(/\(.+/,'');
    if (revised) revised = new Date(revised).toDateString();
    var tags = [...(document.querySelectorAll('.page-tags a') || [])].map(el => el.innerText).join(' ');

    var licenseBlocks = [...(document.querySelectorAll('.licensebox blockquote') || [])];

    // first link is page title
    var pageLink = licenseBlocks[0]?.querySelector('a');
    var authorRawText = pageLink?.nextSibling?.textContent || '';
    var title = pageLink?.innerText || document.querySelector('#page-title')?.innerText || '';
    var author = /\s*by\s+(?<author>.+),\s+from the\s*/.exec(authorRawText)?.groups?.author || ''

    // clean out unwanted content
    var licenseInfo = licenseBlocks.map(el => {
        [...el.querySelectorAll('br')].forEach(x => x.replaceWith("__BR__"));
        // [...el.querySelectorAll('*:not(p,strong,br)')].forEach(x => x.replaceWith(x.innerText));
        return el.innerText.replace(/__BR__/g, "\n");
    }).join('\n');

    return {
        date: revised,
        rating,
        licenseInfo,
        comments,
        tags,
        ...title && {title},
        ...author && {author}
    };
}

function getWikiStats() {
    const info = window.WIKIREQUEST?.info;
    let {
        pageName = new URL(window.__epubCanonicalUrl || location.href).pathname.slice(1).replace(/[\/\\() +&:]/g, '_'),
        pageId,
        siteUnixName
    } = info || {};
    
    return {
        pageName,
        ...pageId && {id: pageId},
        ...siteUnixName && { siteName: siteUnixName }
    };
}

export function getStoredStats() {
    return globalThis.__SCP_EPUB_STATS
}

export function storeStats() {
    globalThis.getStoredStats = getStoredStats;
    globalThis.__SCP_EPUB_STATS = {
        ...parseStats(),
        ...getWikiStats()
    }
    console.log('Page Stats:', JSON.stringify(getStoredStats()));
}